import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  MoreHorizontal,
  CreditCard,
  History,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar as CalendarIcon,
  SearchIcon,
  ArrowUpDown,
  Download,
  Upload,
  Trash2,
  Edit3
} from 'lucide-react';
import { format, addDays, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { 
  invoiceService, 
  supplierService 
} from '../services/dataService';
import { Invoice, Supplier, InvoiceStatus } from '../types';
import { toast } from 'sonner';
import { Label } from '../components/ui/label';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { cn } from "../lib/utils";

type ViewType = 'all' | 'due' | 'overdue' | 'paid';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewType>('all');
  const [search, setSearch] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  
  // Custom states for Search, Excel, Returns
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [isReturnModalOpen, setReturnModalOpen] = useState(false);
  const [returnAmount, setReturnAmount] = useState<number>(0);
  const [returnRemarks, setReturnRemarks] = useState('');
  const [autoPpn, setAutoPpn] = useState(true);
  const [customPpn, setCustomPpn] = useState<number>(0);
  const [ppnMode, setPpnMode] = useState<'auto' | 'free' | 'percent' | 'nominal'>('auto');
  const [returnPpnPercent, setReturnPpnPercent] = useState<number>(11);

  const calculatedReturnPpn = useMemo(() => {
    if (ppnMode === 'auto') {
      return Math.round(returnAmount * 0.11);
    }
    if (ppnMode === 'free') {
      return 0;
    }
    if (ppnMode === 'percent') {
      return Math.round(returnAmount * (returnPpnPercent / 100));
    }
    return Number(customPpn);
  }, [ppnMode, returnAmount, returnPpnPercent, customPpn]);

  // Modals
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  // States for Payment History & Void/Cancel feature
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [editForm, setEditForm] = useState({
    supplierId: '',
    supplierName: '',
    invoiceNumber: '',
    date: new Date().toISOString(),
    dueOption: 'date' as 'date' | 'days',
    dueDate: new Date().toISOString(),
    dueDays: 30,
    totalAmount: 0,
    remarks: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    invoiceNumber: '',
    date: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    totalAmount: 0,
    remarks: '',
    dueOption: 'date' as 'date' | 'days',
    dueDays: 30
  });

  const [invoicesList, setInvoicesList] = useState<any[]>([
    {
      id: '1',
      invoiceNumber: '',
      totalAmount: 0,
      date: new Date().toISOString(),
      dueOption: 'date',
      dueDate: new Date().toISOString(),
      dueDays: 30,
      remarks: ''
    }
  ]);

  const updateInvoiceRow = (id: string, field: string, value: any) => {
    setInvoicesList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const addInvoiceRow = () => {
    setInvoicesList(prev => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        invoiceNumber: '',
        totalAmount: 0,
        date: new Date().toISOString(),
        dueOption: 'date',
        dueDate: new Date().toISOString(),
        dueDays: 30,
        remarks: ''
      }
    ]);
  };

  const removeInvoiceRow = (id: string) => {
    if (invoicesList.length === 1) {
      toast.error('Minimal harus ada 1 faktur yang diinput');
      return;
    }
    setInvoicesList(prev => prev.filter(item => item.id !== id));
  };

  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  // CSV Parsing and Template Utilities
  const parseCSV = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    return lines.slice(1).map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      
      const obj: any = {};
      headers.forEach((h, idx) => {
        obj[h] = result[idx] || '';
      });
      return obj;
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "supplierName,invoiceNumber,totalAmount,date,dueDate,remarks\n"
      + "CV Maju Bersama,INV/2026/001,1500000,2026-05-19,2026-06-19,Pembelian bahan baku\n"
      + "PT Makmur Jaya,INV/2026/012,2400000,2026-05-20,2026-06-20,Biaya operasional";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "invoice_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Template download started");
  };

  const handleImportCSV = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return toast.error("File is empty");
      
      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          return toast.error("Data template tidak valid atau kosong");
        }
        
        const loaderId = toast.loading("Mengimport data...");
        let successCount = 0;
        let createdSuppliers = 0;
        
        for (const row of rows) {
          const supplierName = row.supplierName?.trim();
          const invoiceNumber = row.invoiceNumber?.trim();
          const totalAmount = Number(row.totalAmount || 0);
          const dateStr = row.date?.trim() ? new Date(row.date).toISOString() : new Date().toISOString();
          const dueDateStr = row.dueDate?.trim() ? new Date(row.dueDate).toISOString() : addDays(new Date(dateStr), 30).toISOString();
          const remarks = row.remarks?.trim() || '';
          
          if (!supplierName || !invoiceNumber || isNaN(totalAmount) || totalAmount <= 0) {
            continue;
          }
          
          let currentSup = suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
          let supplierId = '';
          
          if (!currentSup) {
            const supRef = await supplierService.add({
              name: supplierName,
              email: '',
              phone: '',
              address: ''
            });
            supplierId = supRef.id;
            createdSuppliers++;
            
            // Reload suppliers list
            const updatedSups = await supplierService.getAll();
            setSuppliers(updatedSups);
          } else {
            supplierId = currentSup.id;
          }
          
          await invoiceService.add({
            supplierId,
            supplierName,
            invoiceNumber,
            date: dateStr,
            dueDate: dueDateStr,
            totalAmount,
            remarks
          });
          
          successCount++;
        }
        
        toast.dismiss(loaderId);
        toast.success(`Berhasil mengimpor ${successCount} faktur! Membuat ${createdSuppliers} supplier baru.`);
        setImportModalOpen(false);
        loadData();
      } catch (err) {
        toast.error("Gagal mengimpor file template");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenReturn = (inv: Invoice) => {
    setCurrentInvoice(inv);
    setReturnAmount(0);
    setReturnRemarks("");
    setAutoPpn(true);
    setCustomPpn(0);
    setPpnMode('auto');
    setReturnPpnPercent(11);
    setReturnModalOpen(true);
  };

  const handleRecordReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice) return;
    if (returnAmount <= 0) return toast.error("Nilai retur harus lebih besar dari 0");
    
    const calculatedPpn = calculatedReturnPpn;
    const totalReturnDeduction = returnAmount + calculatedPpn;
    
    if (totalReturnDeduction > currentInvoice.totalAmount) {
      return toast.error("Total retur + PPN tidak boleh melebihi nilai awal faktur");
    }
    
    try {
      await invoiceService.addReturn(
        currentInvoice.id,
        Number(returnAmount),
        calculatedPpn,
        returnRemarks,
        currentInvoice
      );
      toast.success("Data retur berhasil dicatat!");
      setReturnModalOpen(false);
      loadData();
    } catch (e) {
      toast.error("Gagal menyimpan data retur");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invList, supList] = await Promise.all([
        invoiceService.getAll(),
        supplierService.getAll()
      ]);
      setInvoices(invList);
      setSuppliers(supList);
    } catch (e) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const now = startOfDay(new Date());
    return invoices.filter(inv => {
      const dueDate = parseISO(inv.dueDate);
      const matchesSearch = inv.supplierName.toLowerCase().includes(search.toLowerCase()) || 
                           inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;

      switch(view) {
        case 'due': 
          return inv.status !== 'paid' && isBefore(dueDate, addDays(now, 7)) && isAfter(dueDate, now);
        case 'overdue': 
          return inv.status !== 'paid' && isBefore(dueDate, now);
        case 'paid': 
          return inv.status === 'paid';
        default: 
          return true;
      }
    });
  }, [invoices, view, search]);

  const groupedInvoices = useMemo(() => {
    return filteredInvoices.reduce((groups, inv) => {
      if (!groups[inv.supplierId]) {
        groups[inv.supplierId] = {
          supplierName: inv.supplierName,
          items: [],
          totalOutstanding: 0
        };
      }
      groups[inv.supplierId].items.push(inv);
      if (inv.status !== 'paid') {
        const returnAmt = inv.returnAmount || 0;
        const returnTax = inv.returnPpn || 0;
        const outstanding = inv.totalAmount - (returnAmt + returnTax) - inv.paidAmount;
        groups[inv.supplierId].totalOutstanding += outstanding;
      }
      return groups;
    }, {} as Record<string, { supplierName: string, items: Invoice[], totalOutstanding: number }>);
  }, [filteredInvoices]);

  const selectedInvoicesTotalAmount = useMemo(() => {
    return selectedInvoices.reduce((total, id) => {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
        const returnAmt = inv.returnAmount || 0;
        const returnTax = inv.returnPpn || 0;
        const outstanding = inv.totalAmount - (returnAmt + returnTax) - inv.paidAmount;
        return total + Math.max(0, outstanding);
      }
      return total;
    }, 0);
  }, [selectedInvoices, invoices]);

  const invoiceStats = useMemo(() => {
    const now = startOfDay(new Date());
    let totalOutstanding = 0;
    let totalOutstandingCount = 0;
    let totalOverdue = 0;
    let totalOverdueCount = 0;
    let totalDueSoon = 0;
    let totalDueSoonCount = 0;
    let totalPaid = 0;
    let totalPaidCount = 0;

    invoices.forEach(inv => {
      const returnAmt = inv.returnAmount || 0;
      const returnTax = inv.returnPpn || 0;
      const effectiveTotal = inv.totalAmount - (returnAmt + returnTax);
      const remaining = Math.max(0, effectiveTotal - inv.paidAmount);
      const dueDate = parseISO(inv.dueDate);

      if (inv.status === 'paid') {
        totalPaid += inv.paidAmount;
        totalPaidCount++;
      } else {
        totalOutstanding += remaining;
        totalOutstandingCount++;

        if (isBefore(dueDate, now)) {
          totalOverdue += remaining;
          totalOverdueCount++;
        } else if (isBefore(dueDate, addDays(now, 7)) && isAfter(dueDate, now)) {
          totalDueSoon += remaining;
          totalDueSoonCount++;
        }
      }
    });

    return {
      totalOutstanding,
      totalOutstandingCount,
      totalOverdue,
      totalOverdueCount,
      totalDueSoon,
      totalDueSoonCount,
      totalPaid,
      totalPaidCount
    };
  }, [invoices]);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (invoicesList.length === 0) {
      return toast.error('Belum ada faktur yang dimasukkan');
    }

    // Validation
    for (const item of invoicesList) {
      if (!item.supplierId) {
        return toast.error('Semua baris faktur harus memilih supplier');
      }
      if (item.supplierId === 'new' && !item.newSupplierName?.trim()) {
        return toast.error('Semua baris faktur baru harus mengisi nama supplier baru');
      }
      if (!item.invoiceNumber.trim()) {
        return toast.error('Semua nomor faktur harus diisi');
      }
      if (item.totalAmount <= 0) {
        return toast.error(`Total nilai faktur ${item.invoiceNumber || ''} harus lebih dari 0`);
      }
    }

    const loaderId = toast.loading('Sedang menyimpan faktur...');
    try {
      const createdSuppliersMap: Record<string, string> = {};

      for (const item of invoicesList) {
        let finalSupplierId = item.supplierId;
        let finalSupplierName = item.supplierName;

        if (finalSupplierId === 'new') {
          const cleanNewName = item.newSupplierName.trim();
          const cleanLower = cleanNewName.toLowerCase();

          if (createdSuppliersMap[cleanLower]) {
            finalSupplierId = createdSuppliersMap[cleanLower];
          } else {
            const existing = suppliers.find(s => s.name.toLowerCase() === cleanLower);
            if (existing) {
              finalSupplierId = existing.id;
              finalSupplierName = existing.name;
              createdSuppliersMap[cleanLower] = existing.id;
            } else {
              const supRef = await supplierService.add({
                name: cleanNewName,
                email: '',
                phone: '',
                address: ''
              });
              finalSupplierId = supRef.id;
              finalSupplierName = cleanNewName;
              createdSuppliersMap[cleanLower] = supRef.id;
            }
          }
        }

        let finalDueDate = item.dueDate;
        if (item.dueOption === 'days') {
          finalDueDate = addDays(parseISO(item.date), item.dueDays).toISOString();
        }

        await invoiceService.add({
          supplierId: finalSupplierId,
          supplierName: finalSupplierName,
          invoiceNumber: item.invoiceNumber,
          date: item.date,
          dueDate: finalDueDate,
          totalAmount: Number(item.totalAmount),
          remarks: item.remarks
        });
      }
      
      toast.dismiss(loaderId);
      toast.success(`${invoicesList.length} faktur berhasil dicatat`);
      setAddModalOpen(false);
      loadData();
    } catch (err) {
      toast.dismiss(loaderId);
      toast.error('Gagal mencatat faktur');
      console.error(err);
    }
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setEditForm({
      supplierId: inv.supplierId,
      supplierName: inv.supplierName,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      dueOption: 'date',
      dueDate: inv.dueDate,
      dueDays: 30,
      totalAmount: inv.totalAmount,
      remarks: inv.remarks || ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (!editForm.supplierId) return toast.error('Pilih supplier terlebih dahulu');
    if (!editForm.invoiceNumber.trim()) return toast.error('Nomor faktur harus diisi');
    if (editForm.totalAmount <= 0) return toast.error('Total nominal harus lebih dari 0');

    const loaderId = toast.loading('Memperbarui faktur...');
    try {
      let finalDueDate = editForm.dueDate;
      if (editForm.dueOption === 'days') {
        finalDueDate = addDays(parseISO(editForm.date), editForm.dueDays).toISOString();
      }

      await invoiceService.update(editingInvoice.id, {
        supplierId: editForm.supplierId,
        supplierName: suppliers.find(s => s.id === editForm.supplierId)?.name || editForm.supplierName,
        invoiceNumber: editForm.invoiceNumber,
        date: editForm.date,
        dueDate: finalDueDate,
        totalAmount: Number(editForm.totalAmount),
        remarks: editForm.remarks
      });

      toast.dismiss(loaderId);
      toast.success('Faktur berhasil diperbarui');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.dismiss(loaderId);
      toast.error('Gagal memperbarui faktur');
      console.error(err);
    }
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus faktur ${inv.invoiceNumber} secara permanen?`)) {
      try {
        await invoiceService.delete(inv.id);
        toast.success('Faktur berhasil dihapus');
        loadData();
      } catch (err) {
        toast.error('Gagal menghapus faktur');
      }
    }
  };

  const handleToggleGroupSelect = (itemIds: string[]) => {
    const allSelected = itemIds.every(id => selectedInvoices.includes(id));
    if (allSelected) {
      setSelectedInvoices(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedInvoices(prev => {
        const filtered = prev.filter(id => !itemIds.includes(id));
        return [...filtered, ...itemIds];
      });
    }
  };

  const handleOpenPayment = (inv: Invoice) => {
    setCurrentInvoice(inv);
    setPaymentAmount(inv.totalAmount - inv.paidAmount);
    setPaymentModalOpen(true);
  };

  const handlePayment = async () => {
    if (!currentInvoice || paymentAmount <= 0) return;
    try {
      await invoiceService.addPayment(currentInvoice.id, {
        invoiceId: currentInvoice.id,
        amount: Number(paymentAmount),
        date: new Date().toISOString(),
        method: 'Manual Payment'
      }, currentInvoice);
      
      toast.success('Payment recorded');
      setPaymentModalOpen(false);
      loadData();
    } catch (e) {
      toast.error('Error recording payment');
    }
  };

  const handleOpenHistory = async (inv: Invoice) => {
    setHistoryInvoice(inv);
    setHistoryModalOpen(true);
    setLoadingPayments(true);
    try {
      const list = await invoiceService.getPayments(inv.id);
      setPaymentsList(list);
    } catch (e) {
      toast.error('Gagal mengambil riwayat pembayaran');
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCancelPayment = async (p: any) => {
    if (!historyInvoice) return;
    if (window.confirm(`Apakah Anda yakin ingin membatalkan/menghapus pembayaran senilai Rp ${p.amount.toLocaleString()}?`)) {
      const loaderId = toast.loading('Sedang membatalkan pembayaran...');
      try {
        await invoiceService.cancelPayment(historyInvoice.id, p.id, p.amount, historyInvoice);
        toast.dismiss(loaderId);
        toast.success('Pembayaran berhasil dibatalkan & saldo faktur diperbarui');
        
        // Refresh payments inside modal
        const list = await invoiceService.getPayments(historyInvoice.id);
        setPaymentsList(list);
        
        // Update historyInvoice state locally
        const updatedInvoice = {
          ...historyInvoice,
          paidAmount: Math.max(0, historyInvoice.paidAmount - p.amount)
        } as Invoice;
        
        const returnAmt = updatedInvoice.returnAmount || 0;
        const returnTax = updatedInvoice.returnPpn || 0;
        const totalEffective = updatedInvoice.totalAmount - (returnAmt + returnTax);
        if (updatedInvoice.paidAmount >= totalEffective) {
          updatedInvoice.status = 'paid';
        } else if (updatedInvoice.paidAmount > 0) {
          updatedInvoice.status = 'partial';
        } else {
          updatedInvoice.status = 'unpaid';
        }
        setHistoryInvoice(updatedInvoice);

        // Refresh main view lists
        loadData();
      } catch (e) {
        toast.dismiss(loaderId);
        toast.error('Gagal membatalkan pembayaran');
        console.error(e);
      }
    }
  };

  const handleBulkPayment = async () => {
    if (selectedInvoices.length === 0) return;
    
    try {
      const promises = selectedInvoices.map(async (id) => {
        const inv = invoices.find(i => i.id === id);
        if (inv && inv.status !== 'paid') {
           const returnAmt = inv.returnAmount || 0;
           const returnTax = inv.returnPpn || 0;
           const remaining = inv.totalAmount - (returnAmt + returnTax) - inv.paidAmount;
           if (remaining > 0) {
             return invoiceService.addPayment(inv.id, {
               invoiceId: inv.id,
               amount: remaining,
               date: new Date().toISOString(),
               method: 'Bulk Payment'
             }, inv);
           }
        }
      });
      
      await Promise.all(promises);
      toast.success(`Bulk payment processed for ${selectedInvoices.length} invoices`);
      setSelectedInvoices([]);
      loadData();
    } catch (e) {
      toast.error('Partial failure in bulk payment');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedInvoices(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoice Management</h1>
          <p className="text-slate-500 mt-1">Track bills, due dates, and record payments effortlessly.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedInvoices.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-blue-50/70 border border-blue-200 px-4 py-2 sm:py-1.5 rounded-xl text-xs font-semibold shadow-sm animate-in fade-in">
              <span className="text-slate-600">
                Terpilih: <strong className="text-blue-800">{selectedInvoices.length} Faktur</strong>
              </span>
              <div className="hidden sm:block w-px h-4 bg-blue-200" />
              <span className="text-slate-600">
                Total Pembayaran: <strong className="text-blue-900 text-sm">Rp {selectedInvoicesTotalAmount.toLocaleString()}</strong>
              </span>
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 px-3 font-bold pointer-events-auto cursor-pointer"
                onClick={handleBulkPayment}
              >
                Bayar Faktur
              </Button>
            </div>
          )}
          <Button 
            variant="outline"
            className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl px-5 h-11 pointer-events-auto cursor-pointer"
            onClick={() => setImportModalOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2 text-slate-500" /> Import Faktur
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md px-6 h-11"
            onClick={() => {
              setFormData({
                supplierId: '',
                supplierName: '',
                invoiceNumber: '',
                date: new Date().toISOString(),
                dueDate: new Date().toISOString(),
                totalAmount: 0,
                remarks: '',
                dueOption: 'date',
                dueDays: 30
              });
              setInvoicesList([
                {
                  id: String(Date.now() + Math.random()),
                  invoiceNumber: '',
                  totalAmount: 0,
                  date: new Date().toISOString(),
                  dueOption: 'date',
                  dueDate: new Date().toISOString(),
                  dueDays: 30,
                  remarks: ''
                }
              ]);
              setSupplierSearchQuery('');
              setAddModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2 bg-slate-50/50 p-1.5 rounded-xl border border-slate-200/40">
         <div className="bg-white rounded-lg p-2 px-3 border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-colors">
            <div className="space-y-0 text-left">
               <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400">Tagihan Aktif</p>
               <p className="text-[13px] font-black text-slate-900 leading-tight">Rp {invoiceStats.totalOutstanding.toLocaleString()}</p>
            </div>
            <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-1">
               {invoiceStats.totalOutstandingCount} Faktur
            </span>
         </div>
         
         <div className="bg-white rounded-lg p-2 px-3 border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-colors">
            <div className="space-y-0 text-left">
               <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-red-500">Lewat Jatuh Tempo</p>
               <p className="text-[13px] font-black text-red-700 leading-tight">Rp {invoiceStats.totalOverdue.toLocaleString()}</p>
            </div>
            <span className="text-[9px] bg-red-50/70 text-red-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-1 animate-pulse">
               {invoiceStats.totalOverdueCount} Faktur
            </span>
         </div>

         <div className="bg-white rounded-lg p-2 px-3 border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-colors">
            <div className="space-y-0 text-left">
               <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-orange-600">Akan Jatuh Tempo</p>
               <p className="text-[13px] font-black text-orange-800 leading-tight">Rp {invoiceStats.totalDueSoon.toLocaleString()}</p>
            </div>
            <span className="text-[9px] bg-orange-50 text-orange-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-1">
               {invoiceStats.totalDueSoonCount} Faktur
            </span>
         </div>

         <div className="bg-white rounded-lg p-2 px-3 border border-slate-100 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-slate-200 transition-colors">
            <div className="space-y-0 text-left">
               <p className="text-[8.5px] font-extrabold uppercase tracking-widest text-emerald-600">Total Terbayar</p>
               <p className="text-[13px] font-black text-emerald-800 leading-tight">Rp {invoiceStats.totalPaid.toLocaleString()}</p>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ml-1">
               {invoiceStats.totalPaidCount} Faktur
            </span>
         </div>
      </div>

      <div className="space-y-4">
         {/* Horizontal Tabs Menu */}
         <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/40 w-full sm:w-fit">
            <button
              onClick={() => setView('all')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all pointer-events-auto cursor-pointer ${
                view === 'all'
                  ? 'bg-white text-blue-900 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Semua Faktur</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${view === 'all' ? 'bg-blue-50 text-blue-900' : 'bg-slate-200 text-slate-500'}`}>
                {invoices.length}
              </span>
            </button>

            <button
              onClick={() => setView('due')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all pointer-events-auto cursor-pointer ${
                view === 'due'
                  ? 'bg-white text-orange-950 shadow-xs border border-orange-205/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Akan Jatuh Tempo</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${view === 'due' ? 'bg-orange-50 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>
                {invoiceStats.totalDueSoonCount}
              </span>
            </button>

            <button
              onClick={() => setView('overdue')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all pointer-events-auto cursor-pointer ${
                view === 'overdue'
                  ? 'bg-white text-red-950 shadow-xs border border-red-205/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span>Lewat Jatuh Tempo</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${view === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-slate-200 text-slate-500'}`}>
                {invoiceStats.totalOverdueCount}
              </span>
            </button>

            <button
              onClick={() => setView('paid')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all pointer-events-auto cursor-pointer ${
                view === 'paid'
                  ? 'bg-white text-blue-905 shadow-xs border border-blue-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Riwayat Lunas</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${view === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                {invoiceStats.totalPaidCount}
              </span>
            </button>
         </div>

         {/* Content Area */}
         <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari supplier atau no faktur..." 
              className="pl-10 rounded-xl bg-white border-slate-200 outline-none h-11 shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
         </div>

         {Object.keys(groupedInvoices).map(supplierId => (
           <SupplierGroup 
             key={supplierId}
             group={groupedInvoices[supplierId]}
             selectedInvoices={selectedInvoices}
             toggleSelect={toggleSelect}
             onPay={handleOpenPayment}
             onReturn={handleOpenReturn}
             onEdit={handleOpenEdit}
             onDelete={handleDeleteInvoice}
             onViewHistory={handleOpenHistory}
           />
         ))}

         {Object.keys(groupedInvoices).length === 0 && !loading && (
           <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
              <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900">No invoices found</h3>
              <p className="text-slate-500">Adjust your search or filters to see results.</p>
           </div>
         )}
      </div>

      {/* Add Invoice Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-y-auto rounded-3xl p-8 border-slate-200">
           <form onSubmit={handleAddInvoice} className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Plus className="w-5 h-5"/></div>
                  Input Transaksi Faktur Baru
                </DialogTitle>
                <DialogDescription>Input rincian faktur secara presisi. Anda dapat menginput berbeda supplier sekaligus untuk masing-masing baris faktur.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-bold text-slate-800 text-sm">Daftar Rincian Faktur ({invoicesList.length})</h4>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addInvoiceRow}
                    className="rounded-xl border-dashed border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold pointer-events-auto cursor-pointer"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Tambah Baris Faktur
                  </Button>
                </div>

                <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
                  {invoicesList.map((row, index) => (
                    <div key={row.id} className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 relative space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-555 bg-white px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-emerald-500"/> Faktur #{index + 1}
                        </span>
                        {invoicesList.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeInvoiceRow(row.id)}
                            className="h-8 text-red-500 hover:bg-red-50 hover:text-red-750 px-2 rounded-xl pointer-events-auto cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 mr-1"/> Hapus Baris
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-1 md:col-span-2 bg-white/60 p-3 rounded-xl border border-slate-200/50">
                          <Label className="text-xs font-semibold text-slate-700">Pilih Partner Supplier <span className="text-red-555">*</span></Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                            <select 
                               className="rounded-xl border border-slate-200 bg-white text-xs h-10 px-3 w-full outline-none focus:ring-1 focus:ring-slate-300 font-medium"
                               value={row.supplierId || ''}
                               onChange={e => {
                                 const val = e.target.value;
                                 const name = val === 'new' ? '' : suppliers.find(s => s.id === val)?.name || '';
                                 updateInvoiceRow(row.id, 'supplierId', val);
                                 updateInvoiceRow(row.id, 'supplierName', name);
                               }}
                               required
                            >
                               <option value="">-- Pilih Supplier --</option>
                               {suppliers.map(s => (
                                 <option key={s.id} value={s.id}>{s.name}</option>
                               ))}
                               <option value="new">-- Tulis Supplier Baru --</option>
                            </select>

                            {row.supplierId === 'new' && (
                              <Input 
                                placeholder="Tulis nama supplier baru..."
                                value={row.newSupplierName || ''}
                                onChange={e => {
                                  updateInvoiceRow(row.id, 'newSupplierName', e.target.value);
                                  updateInvoiceRow(row.id, 'supplierName', e.target.value);
                                }}
                                className="rounded-xl bg-white h-10 border-slate-200 font-bold text-xs"
                                required
                              />
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Nomor Faktur (Invoice Number) <span className="text-red-500">*</span></Label>
                          <Input 
                            placeholder="Contoh: INV/2026/015" 
                            value={row.invoiceNumber}
                            onChange={e => updateInvoiceRow(row.id, 'invoiceNumber', e.target.value)}
                            className="rounded-xl bg-white h-10 border-slate-200"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Total Nilai (Rp) <span className="text-red-500">*</span></Label>
                          <Input 
                            type="number"
                            placeholder="0" 
                            value={row.totalAmount || ''}
                            onChange={e => updateInvoiceRow(row.id, 'totalAmount', Number(e.target.value))}
                            className="rounded-xl bg-white h-10 font-bold border-slate-200"
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Tanggal Faktur</Label>
                          <DatePicker 
                             date={parseISO(row.date)} 
                             setDate={(d) => d && updateInvoiceRow(row.id, 'date', d.toISOString())} 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5 col-span-1">
                            <Label className="text-xs">Jatuh Tempo</Label>
                            <select 
                               className="rounded-xl border border-slate-200 bg-white text-xs h-10 px-2 w-full outline-none focus:ring-1 focus:ring-slate-300"
                               value={row.dueOption}
                               onChange={e => updateInvoiceRow(row.id, 'dueOption', e.target.value)}
                            >
                               <option value="date">Tanggal Spesifik</option>
                               <option value="days">Net Hari (Tenor)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 col-span-1 flex flex-col justify-end">
                             {row.dueOption === 'date' ? (
                                <DatePicker 
                                  date={parseISO(row.dueDate)} 
                                  setDate={(d) => d && updateInvoiceRow(row.id, 'dueDate', d.toISOString())} 
                                />
                             ) : (
                                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl h-10 px-1.5">
                                   <Button 
                                     type="button" 
                                     variant={row.dueDays === 7 ? 'default' : 'outline'} 
                                     onClick={() => updateInvoiceRow(row.id, 'dueDays', 7)}
                                     className="h-7 text-[10px] px-1 rounded-lg flex-1 font-bold pointer-events-auto cursor-pointer"
                                   >7D</Button>
                                   <Button 
                                     type="button" 
                                     variant={row.dueDays === 30 ? 'default' : 'outline'} 
                                     onClick={() => updateInvoiceRow(row.id, 'dueDays', 30)}
                                     className="h-7 text-[10px] px-1 rounded-lg flex-1 font-bold pointer-events-auto cursor-pointer"
                                   >30D</Button>
                                   <Input 
                                      type="number" 
                                      className="w-10 h-7 rounded-lg text-[10px] font-bold text-center p-0 border-slate-200" 
                                      placeholder="Net" 
                                      value={row.dueDays}
                                      onChange={e => updateInvoiceRow(row.id, 'dueDays', Number(e.target.value))}
                                   />
                                </div>
                             )}
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-1.5">
                           <Label className="text-xs">Keterangan / Memo (Opsional)</Label>
                           <Input 
                             placeholder="Shipping fees, urgent, dll." 
                             value={row.remarks}
                             onChange={e => updateInvoiceRow(row.id, 'remarks', e.target.value)}
                             className="rounded-xl bg-white h-10 border-slate-200"
                           />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)} className="rounded-xl">Batal</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-10 font-bold pointer-events-auto cursor-pointer text-white">
                  Simpan {invoicesList.length} Faktur Sekaligus
                </Button>
              </DialogFooter>
           </form>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-slate-200">
          <form onSubmit={handleSaveEditInvoice} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 className="w-5 h-5 text-blue-600" /></div>
                Edit Rincian Faktur
              </DialogTitle>
              <DialogDescription>
                Ubah rincian data faktur #{editingInvoice?.invoiceNumber}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Supplier <span className="text-red-500">*</span></Label>
                <select 
                  className="rounded-xl border border-slate-200 bg-white text-xs h-10 px-3 w-full outline-none focus:ring-1 focus:ring-slate-300 font-medium"
                  value={editForm?.supplierId || ''}
                  onChange={e => {
                    const val = e.target.value;
                    const name = suppliers.find(s => s.id === val)?.name || '';
                    setEditForm(prev => ({ ...prev, supplierId: val, supplierName: name }));
                  }}
                  required
                >
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nomor Faktur <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="INV/..." 
                    value={editForm?.invoiceNumber || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    className="rounded-xl bg-white h-10 border-slate-200"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Total Nominal (Rp) <span className="text-red-500">*</span></Label>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    value={editForm?.totalAmount || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                    className="rounded-xl bg-white h-10 font-bold border-slate-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Faktur</Label>
                  {editForm?.date && (
                    <DatePicker 
                      date={parseISO(editForm.date)} 
                      setDate={d => d && setEditForm(prev => ({ ...prev, date: d.toISOString() }))}
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Tanggal Jatuh Tempo</Label>
                  {editForm?.dueDate && (
                    <DatePicker 
                      date={parseISO(editForm.dueDate)} 
                      setDate={d => d && setEditForm(prev => ({ ...prev, dueDate: d.toISOString() }))}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Keterangan / Memo (Opsional)</Label>
                <Input 
                  placeholder="Memo..." 
                  value={editForm?.remarks || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="rounded-xl bg-white h-10 border-slate-200"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)} className="rounded-xl">Batal</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 font-bold pointer-events-auto cursor-pointer">
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 border-slate-200">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold">Record Payment</DialogTitle>
             <DialogDescription>Apply manual payment for {currentInvoice?.invoiceNumber}.</DialogDescription>
           </DialogHeader>

           <div className="space-y-6 py-4">
              <div className="p-4 bg-emerald-50 rounded-2xl">
                 <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Outstanding Balance</p>
                 <p className="text-2xl font-bold text-emerald-700">Rp {(currentInvoice ? (currentInvoice.totalAmount - (currentInvoice.returnAmount || 0) - (currentInvoice.returnPpn || 0)) - currentInvoice.paidAmount : 0).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                 <Label>Payment Amount (Rp)</Label>
                 <Input 
                   type="number" 
                   value={paymentAmount}
                   onChange={e => setPaymentAmount(Number(e.target.value))}
                   className="rounded-xl h-11 text-lg font-bold"
                 />
              </div>
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={() => setPaymentModalOpen(false)} className="rounded-xl">Cancel</Button>
             <Button 
                className="bg-emerald-600 hover:bg-emerald-700 rounded-xl px-6 pointer-events-auto cursor-pointer" 
                onClick={handlePayment}
                disabled={paymentAmount <= 0}
             >
                Apply Payment
             </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Riwayat Pembayaran & Cancel Payment Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-slate-200">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold flex items-center gap-2">
               <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><History className="w-5 h-5 text-amber-600" /></div>
               Riwayat Pembayaran Faktur
             </DialogTitle>
             <DialogDescription>
               Tinjau daftar rincian pembayaran untuk faktur <strong>#{historyInvoice?.invoiceNumber}</strong>. Anda dapat membatalkan pembayaran di sini.
             </DialogDescription>
           </DialogHeader>

           <div className="py-4 space-y-4">
              {loadingPayments ? (
                <div className="text-center py-6 text-slate-500 text-sm font-semibold">
                  Sedang mengambil data pembayaran...
                </div>
              ) : paymentsList.length === 0 ? (
                <div className="text-center py-8 text-slate-505 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm font-bold text-slate-700">Tidak ada riwayat pembayaran</p>
                  <p className="text-xs text-slate-400 mt-1">Belum ada pembayaran yang tercatat untuk faktur ini.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                   {paymentsList.map((p) => (
                      <div key={p.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                         <div>
                            <p className="text-[10px] text-slate-400 font-bold">{format(parseISO(p.date), 'dd MMMM yyyy HH:mm')}</p>
                            <p className="text-sm font-bold text-slate-800 mt-0.5">Rp {p.amount.toLocaleString()}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{p.method || 'Manual Payment'}</p>
                         </div>
                         <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelPayment(p)}
                            className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-3 rounded-xl gap-1.5 pointer-events-auto cursor-pointer"
                         >
                            <Trash2 className="w-3.5 h-3.5" /> Batal
                         </Button>
                      </div>
                   ))}
                </div>
              )}
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={() => setHistoryModalOpen(false)} className="rounded-xl w-full sm:w-auto">Tutup</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Invoices Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-8 border-slate-200">
           <DialogHeader>
             <DialogTitle className="text-xl font-bold flex items-center gap-2">
               <div className="p-2 bg-slate-100 rounded-lg"><Upload className="w-5 h-5 text-slate-700" /></div>
               Import Faktur via Excel / CSV
             </DialogTitle>
             <DialogDescription>
               Impor data faktur secara massal. Jika nama supplier belum ada di aplikasi, supplier baru akan dibuat otomatis!
             </DialogDescription>
           </DialogHeader>

           <div className="space-y-6 py-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                 <p className="text-xs text-slate-500 font-medium mb-3">Unduh template terlebih dahulu untuk format Excel / CSV yang benar</p>
                 <Button 
                   variant="outline" 
                   size="sm"
                   className="rounded-xl border-dashed border-slate-300 font-semibold gap-1.5 pointer-events-auto cursor-pointer"
                   type="button"
                   onClick={downloadTemplate}
                 >
                   <Download className="w-4 h-4 text-slate-500" /> Unduh Template CSV
                 </Button>
              </div>

              <div className="space-y-2">
                 <Label>File Excel / CSV</Label>
                 <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50/50 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept=".csv, .xls, .xlsx"
                      className="absolute inset-0 opacity-0 cursor-pointer pointer-events-auto" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImportCSV(file);
                      }}
                    />
                    <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-600 font-bold mb-0.5">Pilih atau Seret File</p>
                    <p className="text-[10px] text-slate-400 font-mono">Format: .csv, .xls, .xlsx</p>
                 </div>
              </div>
           </div>

           <DialogFooter>
             <Button variant="outline" onClick={() => setImportModalOpen(false)} className="rounded-xl">Tutup</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-8 border-slate-200">
          <form onSubmit={handleRecordReturn} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <div className="p-2 bg-red-50 text-red-650 rounded-lg"><History className="w-5 h-5 text-red-600" /></div>
                Catat Retur Pembelian
              </DialogTitle>
              <DialogDescription>
                Catat retur barang untuk faktur #{currentInvoice?.invoiceNumber}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto pr-1">
               <div className="p-4 bg-slate-50 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nilai Awal Faktur:</span>
                    <span className="font-bold text-slate-800">Rp {currentInvoice?.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sudah Dibayar:</span>
                    <span className="font-bold text-slate-800">Rp {currentInvoice?.paidAmount.toLocaleString()}</span>
                  </div>
               </div>

               <div className="space-y-2">
                  <Label className="text-xs font-semibold">Nilai Retur DPP (Rp)</Label>
                  <Input 
                    type="number" 
                    placeholder="Masukkan nilai retur sebelum PPN..."
                    required
                    value={returnAmount || ''}
                    onChange={e => setReturnAmount(Number(e.target.value))}
                    className="rounded-xl h-11 text-base font-bold"
                  />
               </div>

               <div className="space-y-2.5">
                  <Label className="text-xs font-semibold text-slate-700">Metode PPN Retur</Label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setPpnMode('auto')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer text-[11px]",
                        ppnMode === 'auto' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Otomatis (11%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPpnMode('free')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer text-[11px]",
                        ppnMode === 'free' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Tanpa PPN (0%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPpnMode('percent')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer text-[11px]",
                        ppnMode === 'percent' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      % Kustom
                    </button>
                    <button
                      type="button"
                      onClick={() => setPpnMode('nominal')}
                      className={cn(
                        "py-1.5 px-2 rounded-lg font-bold transition-all text-center cursor-pointer text-[11px]",
                        ppnMode === 'nominal' ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      )}
                    >
                      Rp Kustom
                    </button>
                  </div>
               </div>

               {ppnMode === 'percent' && (
                 <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Persentase PPN (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        min="0"
                        max="100"
                        placeholder="Contoh: 12"
                        value={returnPpnPercent}
                        onChange={e => setReturnPpnPercent(Number(e.target.value))}
                        className="rounded-xl h-10 font-bold pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-450">%</span>
                    </div>
                 </div>
               )}

               {ppnMode === 'nominal' && (
                 <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nominal PPN (Rp)</Label>
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="PPN Manual..."
                      value={customPpn || ''}
                      onChange={e => setCustomPpn(Number(e.target.value))}
                      className="rounded-xl h-10 font-bold"
                    />
                 </div>
               )}

               <div className="p-4 bg-red-50 rounded-2xl text-xs space-y-1.5 border border-red-100">
                  <div className="flex justify-between font-medium text-red-700">
                    <span>Estimasi Pengurangan PPN:</span>
                    <span>Rp {calculatedReturnPpn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-900 border-t border-red-200/50 pt-1.5 text-sm">
                    <span>Total Return + PPN (Deduction):</span>
                    <span>Rp {(returnAmount + calculatedReturnPpn).toLocaleString()}</span>
                  </div>
               </div>

               <div className="space-y-2">
                 <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-150 text-xs space-y-2.5 my-3">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase tracking-widest text-[9.5px] text-emerald-800">Sisa Nilai Faktur Baru</span>
                      <span className="text-[10px] text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-lg font-bold">Format: Awal - (Return + PPN)</span>
                    </div>
                    <p className="text-slate-600 leading-normal">
                      Faktur awal senilai <strong>Rp {currentInvoice?.totalAmount.toLocaleString()}</strong> dikurangi total retur + PPN senilai <strong>Rp {(returnAmount + calculatedReturnPpn).toLocaleString()}</strong>.
                    </p>
                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200/60 font-black text-emerald-950 text-xs">
                      <span>Hasil Hitungan Return Sisa Nominal:</span>
                      <span className="text-sm font-black">
                        Rp {Math.max(0, (currentInvoice?.totalAmount || 0) - (returnAmount + calculatedReturnPpn)).toLocaleString()}
                      </span>
                    </div>
                 </div>

                 <Label className="text-xs font-semibold">Keterangan Retur</Label>
                 <Input 
                    placeholder="Contoh: Barang rusak / tidak sesuai spesifikasi..." 
                    className="rounded-xl h-11"
                    required
                    value={returnRemarks}
                    onChange={e => setReturnRemarks(e.target.value)}
                 />
               </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnModalOpen(false)} className="rounded-xl">Batal</Button>
              <Button 
                type="submit" 
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 pointer-events-auto cursor-pointer"
                disabled={returnAmount <= 0}
              >
                Simpan Retur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavButton({ active, icon: Icon, label, onClick, color = '', bg = '', badge }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all pointer-events-auto cursor-pointer ${
        active 
          ? `${bg || 'bg-white shadow-sm'} ${color || 'text-blue-800'} border border-slate-100` 
          : 'text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
         <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
           active ? 'bg-indigo-50 text-blue-900 border border-blue-100' : 'bg-slate-100 text-slate-500'
         }`}>
           {badge}
         </span>
      )}
    </button>
  );
}

function SupplierGroup({ group, selectedInvoices, toggleSelect, onPay, onReturn, onEdit, onDelete, onViewHistory }: any) {
  const [isOpen, setIsOpen] = useState(true);

  return (
     <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div 
          className="px-6 py-5 flex items-center justify-between cursor-pointer bg-slate-50/70 border-b border-slate-150/70 hover:bg-slate-50 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center gap-4">
             <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm flex items-center justify-center text-white font-extrabold text-lg">
               {group.supplierName[0].toUpperCase()}
             </div>
             <div>
                <h3 className="font-extrabold text-slate-800 tracking-tight text-base">{group.supplierName}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{group.items.length} Faktur Tercatat</p>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Tagihan Aktif</p>
                <p className="font-black text-xl text-blue-900 tracking-tight mt-0.5">
                  Rp {group.totalOutstanding.toLocaleString()}
                </p>
             </div>
             <div className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-400">
               {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
             </div>
          </div>
        </div>

        {isOpen && (
          <>
            <div className="hidden md:block overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100/50 sticky top-0 border-b border-slate-200">
                  <tr className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">
                     <th className="p-4 w-12 text-center"><Checkbox className="rounded" /></th>
                     <th className="p-4">Tanggal No Faktur</th>
                     <th className="p-4">Nomor Faktur</th>
                     <th className="p-4">Tenggat Waktu</th>
                     <th className="p-4 text-right">Rincian Nominal</th>
                     <th className="p-4 text-center">Status</th>
                     <th className="p-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                   {group.items.map((inv: Invoice) => {
                     const isOverdue = inv.status !== 'paid' && isBefore(parseISO(inv.dueDate), startOfDay(new Date()));
                     return (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-center">
                          {inv.status !== 'paid' && (
                            <Checkbox 
                              checked={selectedInvoices.includes(inv.id)} 
                              onCheckedChange={() => toggleSelect(inv.id)}
                              className="rounded border-slate-300"
                            />
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                           <div className="text-sm font-bold text-slate-800">{format(parseISO(inv.date), 'dd MMM yyyy')}</div>
                        </td>
                        <td className="p-4">
                           <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 rounded-lg text-slate-705 border border-slate-200 font-semibold shadow-sm">
                             {inv.invoiceNumber}
                           </span>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                            <div className="flex flex-col">
                               <span className={cn(
                                 "text-xs font-bold",
                                 isOverdue ? "text-red-600" : "text-amber-600"
                               )}>
                                 {isOverdue 
                                   ? `Terlambat ${Math.abs(Math.floor((new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24)))} Hari` 
                                   : `Tenggat ${Math.floor((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} Hari Lagi`
                                 }
                               </span>
                               <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                 {format(parseISO(inv.dueDate), 'dd MMM yyyy')}
                               </span>
                            </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex flex-col items-end text-right">
                             {inv.returnAmount && inv.returnAmount > 0 ? (
                               <div className="text-[10px] text-red-655 bg-rose-50/20 p-3 rounded-2xl text-right space-y-1 border border-red-100 max-w-[200px] leading-tight shadow-sm">
                                 <div className="flex justify-between gap-4 font-medium text-slate-450 text-slate-500">
                                   <span>Tagihan Awal:</span>
                                   <span>Rp {inv.totalAmount.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between gap-4 text-red-600 font-semibold">
                                   <span>Retur DPP:</span>
                                   <span>-Rp {inv.returnAmount.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between gap-4 text-red-600 font-semibold">
                                   <span>PPN Retur:</span>
                                   <span>-Rp {(inv.returnPpn || 0).toLocaleString()}</span>
                                 </div>
                                 <div className="border-t border-red-250/20 pt-1 flex justify-between gap-4 font-extrabold text-red-800 text-[11px]">
                                   <span>Jumlah Net (Awal - (Return + PPN)):</span>
                                   <span>Rp {(inv.totalAmount - (inv.returnAmount + (inv.returnPpn || 0))).toLocaleString()}</span>
                                 </div>
                                 {inv.returnRemarks && (
                                   <div className="text-[8px] italic text-slate-400 mt-1 border-t border-red-100/50 pt-1 text-left w-full truncate" title={inv.returnRemarks}>
                                     Keterangan: "{inv.returnRemarks}"
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <span className="font-extrabold text-slate-900 text-sm">Rp {inv.totalAmount.toLocaleString()}</span>
                             )}
                           </div>
                        </td>
                        <td className="p-4 text-center">
                           <span className={cn(
                             "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border shadow-sm",
                             inv.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                             inv.status === 'partial' ? "bg-blue-50 text-blue-700 border-blue-100" :
                             isOverdue ? "bg-red-50 text-red-750 border-red-100" : "bg-orange-50 text-orange-700 border-orange-100"
                           )}>
                               <span className={cn(
                                 "w-1.5 h-1.5 rounded-full shrink-0",
                                 inv.status === 'paid' ? "bg-emerald-500" : 
                                 inv.status === 'partial' ? "bg-blue-500" :
                                 isOverdue ? "bg-red-500 animate-pulse" : "bg-orange-500"
                               )} />
                               {isOverdue ? 'TERLAMBAT' : inv.status === 'paid' ? 'LUNAS' : inv.status === 'partial' ? 'DICICIL' : 'BELUM BAYAR'}
                           </span>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex justify-center items-center gap-1.5 flex-wrap">
                             {inv.status !== 'paid' && (
                                <Button 
                                  size="sm" 
                                  className="h-7 bg-blue-600 hover:bg-blue-700 text-white px-3 text-[11px] font-extrabold rounded-lg shadow-sm"
                                  onClick={() => onPay(inv)}
                                >
                                  Bayar
                                </Button>
                             )}
                             {inv.status !== 'paid' && (!inv.returnAmount || inv.returnAmount === 0) && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-red-500 border-red-200 hover:bg-neutral-50 px-2.5 text-[11px] font-bold rounded-lg"
                                  onClick={() => onReturn(inv)}
                                >
                                  Retur
                                </Button>
                             )}
                             {inv.paidAmount > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 bg-amber-50/50 text-amber-700 border-amber-300 hover:bg-amber-100/50 px-2.5 text-[11px] font-bold rounded-lg"
                                  onClick={() => onViewHistory(inv)}
                                  title="Lihat Riwayat & Batal Pembayaran"
                                >
                                  Riwayat
                                </Button>
                             )}
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg pointer-events-auto cursor-pointer"
                               onClick={() => onEdit(inv)}
                               title="Edit Faktur"
                             >
                               <Edit3 className="w-3.5 h-3.5" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg pointer-events-auto cursor-pointer"
                               onClick={() => onDelete(inv)}
                               title="Hapus Faktur"
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                           </div>
                        </td>
                      </tr>
                     );
                   })}
                </tbody>
             </table>
          </div>

          {/* Mobile View Card Layout */}
          <div className="block md:hidden divide-y divide-slate-100 p-4 space-y-4 bg-slate-50/35">
            {group.items.map((inv: Invoice) => {
              const isOverdue = inv.status !== 'paid' && isBefore(parseISO(inv.dueDate), startOfDay(new Date()));
              return (
                <div key={inv.id} className="pt-4 first:pt-0 pb-1 flex flex-col gap-3">
                  {/* Header Row: Selection and Identifier */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {inv.status !== 'paid' && (
                        <Checkbox 
                          checked={selectedInvoices.includes(inv.id)} 
                          onCheckedChange={() => toggleSelect(inv.id)}
                          className="rounded border-slate-300 w-4 h-4"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{format(parseISO(inv.date), 'dd MMM yyyy')}</span>
                        <span className="font-mono text-[10px] text-slate-500 mt-0.5 font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">#{inv.invoiceNumber}</span>
                      </div>
                    </div>
                    
                    {/* Badge status */}
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border shadow-2xs",
                      inv.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                      inv.status === 'partial' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      isOverdue ? "bg-red-50 text-red-700 border-red-100" : "bg-orange-50 text-orange-700 border-orange-100"
                    )}>
                      <span className={cn(
                        "w-1 h-1 rounded-full shrink-0",
                        inv.status === 'paid' ? "bg-emerald-500" : 
                        inv.status === 'partial' ? "bg-blue-500" :
                        isOverdue ? "bg-red-500 animate-pulse" : "bg-orange-500"
                      )} />
                      {isOverdue ? 'TERLAMBAT' : inv.status === 'paid' ? 'LUNAS' : inv.status === 'partial' ? 'DICICIL' : 'BELUM BAYAR'}
                    </span>
                  </div>

                  {/* Due details banner */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150/60 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-500">Tempo: {format(parseISO(inv.dueDate), 'dd MMM yyyy')}</span>
                    </div>
                    <span className={cn(
                      "text-[10px] font-extrabold",
                      isOverdue ? "text-red-600" : "text-amber-600"
                    )}>
                      {isOverdue 
                        ? `Terlambat ${Math.abs(Math.floor((new Date().getTime() - new Date(inv.dueDate).getTime()) / (1000 * 3600 * 24)))} Hari` 
                        : `Sisa ${Math.floor((new Date(inv.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))} Hari`
                      }
                    </span>
                  </div>

                  {/* Breakdown tagihan */}
                  <div className="text-[11px] font-medium space-y-1 bg-white p-3 rounded-2xl border border-slate-100/80 shadow-2xs">
                    {inv.returnAmount && inv.returnAmount > 0 ? (
                      <div className="space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-400 font-medium">Tagihan Awal:</span>
                          <span className="font-semibold text-slate-700">Rp {inv.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-600">
                          <span>Retur DPP:</span>
                          <span>-Rp {inv.returnAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-red-600">
                          <span>PPN Retur:</span>
                          <span>-Rp {(inv.returnPpn || 0).toLocaleString()}</span>
                        </div>
                        <div className="border-t border-slate-100 pt-1.5 mt-1 flex justify-between font-black text-rose-800 text-xs text-slate-900">
                          <span>Jumlah Net:</span>
                          <span className="text-rose-700 font-extrabold">Rp {(inv.totalAmount - (inv.returnAmount + (inv.returnPpn || 0))).toLocaleString()}</span>
                        </div>
                        {inv.returnRemarks && (
                          <div className="text-[9px] text-slate-400 italic mt-1.5 border-t border-slate-100/50 pt-1">
                            Ket: "{inv.returnRemarks}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-500 font-semibold">Total Tagihan:</span>
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">Rp {inv.totalAmount.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Panel */}
                  <div className="flex items-center justify-between gap-1.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {inv.status !== 'paid' && (
                        <Button 
                          size="sm" 
                          className="h-7 bg-blue-600 hover:bg-blue-700 text-white px-3 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-xs cursor-pointer pointer-events-auto"
                          onClick={() => onPay(inv)}
                        >
                          Bayar
                        </Button>
                      )}
                      {inv.status !== 'paid' && (!inv.returnAmount || inv.returnAmount === 0) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-red-500 border-red-200 hover:bg-white bg-white/80 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-lg cursor-pointer pointer-events-auto"
                          onClick={() => onReturn(inv)}
                        >
                          Retur
                        </Button>
                      )}
                      {inv.paidAmount > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 bg-amber-50/50 text-amber-700 border-amber-250 hover:bg-white px-2 text-[9.5px] font-bold rounded-lg cursor-pointer pointer-events-auto"
                          onClick={() => onViewHistory(inv)}
                        >
                          Riwayat
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-slate-105 rounded-lg pointer-events-auto cursor-pointer"
                        onClick={() => onEdit(inv)}
                        title="Edit Faktur"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-slate-105 rounded-lg pointer-events-auto cursor-pointer"
                        onClick={() => onDelete(inv)}
                        title="Hapus Faktur"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
     </div>
  );
}

function DatePicker({ date, setDate }: { date?: Date, setDate: (d?: Date) => void }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal rounded-xl h-10 border-slate-200",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
            {date ? format(date, "PPP") : <span>Pick a date</span>}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-slate-200">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className="rounded-2xl"
        />
      </PopoverContent>
    </Popover>
  );
}
