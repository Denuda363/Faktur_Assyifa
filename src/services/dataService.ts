import { 
  collection, 
  doc, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Supplier, Invoice, Payment, AppConfig, AppNotification, UserProfile } from '../types';

// Supplier Service
export const supplierService = {
  async getAll() {
    const q = query(collection(db, 'suppliers'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
  },
  async add(data: Omit<Supplier, 'id' | 'createdAt'>) {
    return await addDoc(collection(db, 'suppliers'), {
      ...data,
      createdAt: new Date().toISOString()
    });
  },
  async update(id: string, data: Partial<Supplier>) {
    await updateDoc(doc(db, 'suppliers', id), data);
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'suppliers', id));
  }
};

// Notification Service
export const notificationService = {
  async getAll() {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
  },
  async add(message: string, type: 'invoice_added' | 'payment_added' | 'return_added' | 'overdue_alert' | 'generic') {
    return await addDoc(collection(db, 'notifications'), {
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  },
  async markAllAsRead(notifications: AppNotification[]) {
    const batchPromises = notifications.map(n => {
      if (!n.read) {
        return updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
      return Promise.resolve();
    });
    await Promise.all(batchPromises);
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'notifications', id));
  }
};

// Invoice Service
export const invoiceService = {
  async getAll() {
    const q = query(collection(db, 'invoices'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
  },
  async add(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'paidAmount' | 'status'>) {
    const docRef = await addDoc(collection(db, 'invoices'), {
      ...data,
      paidAmount: 0,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Add real-time notification
    await notificationService.add(
      `Faktur Baru ditambahkan: No ${data.invoiceNumber} untuk ${data.supplierName} senilai Rp ${data.totalAmount.toLocaleString()}`,
      'invoice_added'
    );
    
    return docRef;
  },
  async update(id: string, data: Partial<Invoice>) {
    await updateDoc(doc(db, 'invoices', id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  },
  async addPayment(invoiceId: string, payment: Omit<Payment, 'id'>, currentInvoice: Invoice) {
    const returnAmt = currentInvoice.returnAmount || 0;
    const returnTax = currentInvoice.returnPpn || 0;
    const totalEffective = currentInvoice.totalAmount - (returnAmt + returnTax);
    
    const newPaidAmount = currentInvoice.paidAmount + payment.amount;
    const newStatus = newPaidAmount >= totalEffective ? 'paid' : 'partial';
    
    // Add payment sub-document
    await addDoc(collection(db, 'invoices', invoiceId, 'payments'), payment);
    
    // Update invoice total
    await updateDoc(doc(db, 'invoices', invoiceId), {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Record notification
    await notificationService.add(
      `Pembayaran Tercatat: Rp ${payment.amount.toLocaleString()} untuk Faktur ${currentInvoice.invoiceNumber}`,
      'payment_added'
    );
  },
  async cancelPayment(invoiceId: string, paymentId: string, paymentAmount: number, currentInvoice: Invoice) {
    // 1. Delete payment document
    await deleteDoc(doc(db, 'invoices', invoiceId, 'payments', paymentId));

    // 2. Recalculate invoice status and paidAmount
    const returnAmt = currentInvoice.returnAmount || 0;
    const returnTax = currentInvoice.returnPpn || 0;
    const totalEffective = currentInvoice.totalAmount - (returnAmt + returnTax);

    const newPaidAmount = Math.max(0, currentInvoice.paidAmount - paymentAmount);
    
    let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (newPaidAmount >= totalEffective) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'unpaid';
    }

    await updateDoc(doc(db, 'invoices', invoiceId), {
      paidAmount: newPaidAmount,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Add notification
    await notificationService.add(
      `Pembayaran Dibatalkan: Rp ${paymentAmount.toLocaleString()} untuk Faktur ${currentInvoice.invoiceNumber}`,
      'generic'
    );
  },
  async getPayments(invoiceId: string): Promise<Payment[]> {
    const q = query(collection(db, 'invoices', invoiceId, 'payments'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment));
  },
  async addReturn(invoiceId: string, returnAmount: number, returnPpn: number, remarks: string, currentInvoice: Invoice) {
    const totalEffective = currentInvoice.totalAmount - (returnAmount + returnPpn);
    const newStatus = currentInvoice.paidAmount >= totalEffective ? 'paid' : (currentInvoice.paidAmount > 0 ? 'partial' : 'unpaid');
    
    await updateDoc(doc(db, 'invoices', invoiceId), {
      returnAmount,
      returnPpn,
      returnRemarks: remarks,
      returnDate: new Date().toISOString(),
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Record notification
    await notificationService.add(
      `Retur Pembelian: Rp ${returnAmount.toLocaleString()} (+ PPN Rp ${returnPpn.toLocaleString()}) untuk Faktur ${currentInvoice.invoiceNumber}`,
      'return_added'
    );
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'invoices', id));
  }
};

// Settings Service
export const settingsService = {
  async getConfig(): Promise<AppConfig> {
    const d = await getDoc(doc(db, 'settings', 'config'));
    const fallback: AppConfig = {
      companyName: 'FinTrac Pro',
      companyAddress: '',
      welcomeMessage: 'Welcome to your professional invoice dashboard.',
      logoUrl: ''
    };
    if (d.exists()) {
      const data = d.data();
      return {
        companyName: data.companyName ?? fallback.companyName,
        companyAddress: data.companyAddress ?? fallback.companyAddress,
        welcomeMessage: data.welcomeMessage ?? fallback.welcomeMessage,
        logoUrl: data.logoUrl ?? fallback.logoUrl
      } as AppConfig;
    }
    return fallback;
  },
  async updateConfig(data: Partial<AppConfig>) {
    const sanitized: Record<string, any> = {};
    if (data.companyName !== undefined) sanitized.companyName = data.companyName;
    if (data.companyAddress !== undefined) sanitized.companyAddress = data.companyAddress;
    if (data.welcomeMessage !== undefined) sanitized.welcomeMessage = data.welcomeMessage;
    if (data.logoUrl !== undefined) sanitized.logoUrl = data.logoUrl;
    await setDoc(doc(db, 'settings', 'config'), sanitized, { merge: true });
  }
};

// User Service
export const userService = {
  async getAll(): Promise<UserProfile[]> {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        role: data.role || 'staff',
        email: data.email || '',
        name: data.name || '',
        status: data.status || 'active',
        password: data.password || '',
      } as any;
    });
  },
  async add(data: Omit<UserProfile, 'uid'> & { password?: string, username?: string, status?: string }) {
    const username = data.username || data.email.split('@')[0];
    const docId = username.toLowerCase().trim();
    
    const payload = {
      uid: docId,
      username: username,
      name: data.name,
      email: data.email,
      role: data.role,
      password: data.password || '123456',
      status: data.status || 'pending',
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', docId), payload);
    return docId;
  },
  async update(id: string, data: Partial<UserProfile & { password?: string, username?: string, status?: string }>) {
    await updateDoc(doc(db, 'users', id), data);
  },
  async delete(id: string) {
    await deleteDoc(doc(db, 'users', id));
  }
};
