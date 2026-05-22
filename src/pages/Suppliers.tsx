import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, MoreVertical, Edit, Trash2, Mail, Phone, MapPin, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from '../components/ui/label';
import { supplierService } from '../services/dataService';
import { Supplier } from '../types';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [isImportModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const handleDownloadTemplate = () => {
    try {
      const data = [
        {
          "Nama Supplier (Wajib)": "PT. Sumber Makmur",
          "Email (Opsional)": "kontak@sumbermakmur.com",
          "Telepon (Opsional)": "081234567890",
          "Alamat (Opsional)": "Jl. Industri Raya No. 12, Jakarta"
        },
        {
          "Nama Supplier (Wajib)": "CV. Abadi Jaya",
          "Email (Opsional)": "finance@abadijaya.id",
          "Telepon (Opsional)": "0217654321",
          "Alamat (Opsional)": "Kawasan Industri Delta Silicon, Bekasi"
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Auto size column widths
      worksheet["!cols"] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 18 },
        { wch: 45 }
      ];

      XLSX.writeFile(workbook, "template_import_supplier_fintrac.xlsx");
      toast.success("Template Excel berhasil diunduh!");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mendownload template Excel.");
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (json.length === 0) {
          toast.error('File Excel kosong atau kolom tidak valid');
          setImporting(false);
          return;
        }

        let importedCount = 0;
        let skippedCount = 0;

        for (const row of json) {
          const rawName = row["Nama Supplier (Wajib)"] || row["Nama Supplier"] || row["name"] || row["Nama"] || row["Name"];
          const email = row["Email (Opsional)"] || row["Email"] || row["email"] || "";
          const phone = row["Telepon (Opsional)"] || row["Telepon"] || row["phone"] || row["Phone"] || row["No Telp"] || "";
          const address = row["Alamat (Opsional)"] || row["Alamat"] || row["address"] || row["Address"] || "";

          if (!rawName || String(rawName).trim() === "") {
            skippedCount++;
            continue;
          }

          await supplierService.add({
            name: String(rawName).trim(),
            email: String(email).trim(),
            phone: String(phone).trim(),
            address: String(address).trim()
          });
          importedCount++;
        }

        toast.success(`Berhasil mengimpor ${importedCount} supplier. (${skippedCount} baris kosong dilewati)`);
        setImportModalOpen(false);
        loadSuppliers();
      } catch (err) {
        console.error(err);
        toast.error('Gagal memproses file Excel, cek formatting format kolom.');
      } finally {
        setImporting(false);
        e.target.value = ''; // reset element to allow reselection
      }
    };
    reader.readAsBinaryString(file);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const list = await supplierService.getAll();
      setSuppliers(list);
    } catch (e) {
      toast.error('Failed to load suppliers');
    }
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', email: '', phone: '', address: '' });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.add(formData);
        toast.success('Supplier added successfully');
      }
      setModalOpen(false);
      loadSuppliers();
    } catch (e) {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      await supplierService.delete(id);
      toast.success('Supplier deleted');
      loadSuppliers();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Suppliers</h1>
          <p className="text-slate-500 mt-1">Manage your business partnerships and contact details.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={() => setImportModalOpen(true)}
            variant="outline"
            className="rounded-xl border-slate-200 hover:bg-slate-50 h-11 px-5 shadow-xs font-semibold flex items-center gap-2 pointer-events-auto cursor-pointer text-slate-700"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Import Excel</span>
          </Button>

          <Button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md h-11 px-6 font-semibold flex items-center gap-2 pointer-events-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Supplier
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-slate-700">Partner Directory</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search suppliers..." 
                className="pl-10 rounded-xl bg-white border-slate-200 focus:bg-white transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/50">
                <TableRow className="hover:bg-transparent border-slate-100 uppercase tracking-wider text-[11px] font-bold text-slate-500">
                  <TableHead className="w-[30%] px-6 h-12">Name</TableHead>
                  <TableHead className="px-6 h-12">Contact Info</TableHead>
                  <TableHead className="px-6 h-12">Address</TableHead>
                  <TableHead className="text-right px-6 h-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((supplier) => (
                  <TableRow key={supplier.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50 text-sm">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase">
                          {supplier.name[0]}
                        </div>
                        <span className="font-bold text-slate-800">{supplier.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="space-y-1.5 flex flex-col">
                        {supplier.email && (
                          <div className="flex items-center text-xs text-slate-500">
                            <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" /> {supplier.email}
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center text-xs text-slate-500">
                            <Phone className="w-3.5 h-3.5 mr-2 text-slate-400" /> {supplier.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {supplier.address ? (
                         <div className="flex items-start text-xs text-slate-500 max-w-[200px]">
                           <MapPin className="w-3.5 h-3.5 mr-2 mt-0.5 text-slate-400 flex-shrink-0" /> 
                           <span className="truncate">{supplier.address}</span>
                         </div>
                      ) : (
                        <span className="text-slate-300 text-xs">No address provided</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:bg-white rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                          <DropdownMenuItem onClick={() => handleOpenModal(supplier)} className="gap-2">
                            <Edit className="w-4 h-4" /> Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(supplier.id)} className="gap-2 text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4" /> Remove Supplier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={4} className="h-40 text-center text-slate-400">
                        No suppliers found matching your search.
                     </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View Supplier Card List */}
          <div className="block md:hidden divide-y divide-slate-100 bg-slate-50/10 rounded-b-3xl">
            {filtered.map((supplier) => (
              <div key={supplier.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-xs select-none">
                      {supplier.name[0]}
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">{supplier.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg cursor-pointer"
                      onClick={() => handleOpenModal(supplier)}
                      title="Edit Supplier"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg cursor-pointer"
                      onClick={() => handleDelete(supplier.id)}
                      title="Hapus Supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 pl-1">
                  {supplier.email && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Mail className="w-3.5 h-3.5 mr-2.5 text-slate-400 shrink-0" /> 
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center text-xs text-slate-500 font-medium">
                      <Phone className="w-3.5 h-3.5 mr-2.5 text-slate-400 shrink-0" /> 
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.address ? (
                    <div className="flex items-start text-xs text-slate-500 font-medium mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-2.5 mt-0.5 text-slate-400 shrink-0" /> 
                      <span className="leading-relaxed">{supplier.address}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-300 italic pl-6">Tidak ada alamat tercatat</div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-400 text-xs font-semibold">
                Tidak ada supplier yang cocok dengan pencarian Anda.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-slate-200">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{editingSupplier ? 'Edit Supplier' : 'New Supplier'}</DialogTitle>
              <DialogDescription>
                Enter the details of your business partner here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Company Name</Label>
                <Input 
                  id="name" 
                  className="rounded-xl" 
                  placeholder="e.g. Acme Corp" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  className="rounded-xl" 
                  placeholder="contact@acme.com" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input 
                  id="phone" 
                  className="rounded-xl" 
                  placeholder="+62 812..." 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Office Address</Label>
                <Input 
                  id="address" 
                  className="rounded-xl" 
                  placeholder="City, Street, Building" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8">Save Partner</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Suppliers Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-3xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              <span>Import Data Supplier</span>
            </DialogTitle>
            <DialogDescription>
              Unggah file spreadsheet (Excel atau CSV) untuk memasukkan daftar mitra supplier FinTrac Anda sekaligus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Step instruction card */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">Langkah Import</span>
                <Button
                  type="button"
                  onClick={handleDownloadTemplate}
                  variant="link"
                  className="h-auto p-0 text-blue-600 hover:text-blue-700 font-extrabold text-[11px] flex items-center gap-1 pointer-events-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Template Excel
                </Button>
              </div>
              <p className="leading-relaxed">
                1. Unduh template Excel di atas.<br />
                2. Isi nama supplier pada kolom <strong className="text-slate-800 font-bold">Nama Supplier (Wajib)</strong>.<br />
                3. Masukkan informasi lainnya (Email, Telepon, Alamat) secara opsional.<br />
                4. Simpan, lalu upload file final Anda di bawah ini.
              </p>
            </div>

            {/* Interactive Upload Area */}
            <div className="relative border-2 border-dashed border-slate-200 hover:border-blue-500/85 transition-colors duration-200 rounded-2xl p-7 text-center bg-slate-50/25 group">
              <input
                id="excel-file-import-input"
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={handleImportExcel}
                disabled={importing}
              />
              <label htmlFor="excel-file-import-input" className="cursor-pointer block space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto transition-transform group-hover:scale-105 duration-200">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    {importing ? "Membaca spreadsheet..." : "Klik di sini untuk memilih file"}
                  </p>
                  <p className="text-[10px] text-slate-400">Mendukung format .xlsx, .xls, atau .csv</p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportModalOpen(false)}
              className="rounded-xl w-full sm:w-auto"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
