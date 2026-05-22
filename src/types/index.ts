export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';

export interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  returnAmount?: number;
  returnPpn?: number;
  returnRemarks?: string;
  returnDate?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  date: string;
  method?: string;
  remarks?: string;
}

export interface AppConfig {
  companyName: string;
  companyAddress: string;
  welcomeMessage: string;
  logoUrl?: string;
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'invoice_added' | 'payment_added' | 'return_added' | 'overdue_alert' | 'generic';
  createdAt: string;
  read: boolean;
}

export interface UserProfile {
  uid: string;
  role: 'admin' | 'staff';
  email: string;
  name: string;
}
