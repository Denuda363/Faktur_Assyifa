import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard,
  ArrowUpRight,
  TrendingDown,
  Calendar,
  Search,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { invoiceService, settingsService } from '../services/dataService';
import { Invoice, AppConfig } from '../types';
import { format, isAfter, isBefore, addDays, parseISO } from 'date-fns';

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState({
    totalUnpaid: 0,
    totalOverdue: 0,
    totalPaid: 0,
    upcomingCount: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [invList, appConfig] = await Promise.all([
      invoiceService.getAll(),
      settingsService.getConfig()
    ]);
    setInvoices(invList);
    setConfig(appConfig);

    const now = new Date();
    const stats = invList.reduce((acc, inv) => {
      const dueDate = parseISO(inv.dueDate);
      if (inv.status !== 'paid') {
        acc.totalUnpaid += (inv.totalAmount - inv.paidAmount);
        if (isBefore(dueDate, now)) {
          acc.totalOverdue += (inv.totalAmount - inv.paidAmount);
        }
        if (isAfter(dueDate, now) && isBefore(dueDate, addDays(now, 7))) {
          acc.upcomingCount++;
        }
      } else {
        acc.totalPaid += inv.totalAmount;
      }
      return acc;
    }, { totalUnpaid: 0, totalOverdue: 0, totalPaid: 0, upcomingCount: 0 });

    setStats(stats);
  };

  const chartData = [
    { name: 'Mon', value: 400 },
    { name: 'Tue', value: 300 },
    { name: 'Wed', value: 600 },
    { name: 'Thu', value: 800 },
    { name: 'Fri', value: 500 },
    { name: 'Sat', value: 900 },
    { name: 'Sun', value: 1100 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Keuangan</h1>
          <p className="text-slate-500 mt-1">{config?.welcomeMessage || 'Monitoring your financial operations.'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-slate-700">{format(new Date(), 'EE, MMM dd yyyy')}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Belum Lunas" 
          value={`Rp ${stats.totalUnpaid.toLocaleString()}`} 
          icon={AlertCircle} 
          color="slate"
          trend="↑ 12% dari bulan lalu"
          isUp={true}
        />
        <StatCard 
          title="Akan Jatuh Tempo" 
          value={`${stats.upcomingCount} Faktur`} 
          icon={Clock} 
          color="orange"
          trend={`Estimasi: Rp ${(stats.totalUnpaid / 2).toLocaleString()}`}
          isUp={true}
        />
        <StatCard 
          title="Lewat Jatuh Tempo" 
          value={`Rp ${stats.totalOverdue.toLocaleString()}`} 
          icon={CheckCircle2} 
          color="red"
          trend="Tindak Lanjut Segera"
          isUp={false}
        />
        <StatCard 
          title="Lunas Hari Ini" 
          value={`Rp ${stats.totalPaid.toLocaleString()}`} 
          icon={CreditCard} 
          color="blue"
          trend="Transaksi Berhasil"
          isUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart View */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-white pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">Payment Trends</CardTitle>
              <CardDescription>Visualizing your cash flow performance monthly.</CardDescription>
            </div>
            <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </CardHeader>
          <CardContent className="h-[350px] p-6 bg-white">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748B', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#64748B', fontSize: 12}} 
                  tickFormatter={(val) => `Rp ${val}`}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity / Quick List */}
        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Recent Invoices</CardTitle>
            <CardDescription>Your latest transactions across all suppliers.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="space-y-1">
              {invoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center px-6 py-4 hover:bg-slate-50 transition-all cursor-pointer group border-b border-slate-50 last:border-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                    inv.status === 'paid' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 leading-none">{inv.supplierName}</p>
                    <p className="text-xs text-slate-500 mt-1">{inv.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">Rp {inv.totalAmount.toLocaleString()}</p>
                    <Badge variant={inv.status === 'paid' ? 'default' : 'secondary'} className={`text-[10px] h-4 mt-1 uppercase ${
                      inv.status === 'paid' ? 'bg-blue-100 text-blue-700 border-none' : 'bg-orange-100 text-orange-700 border-none'
                    }`}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="px-6 py-10 text-center text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No recent invoices found.</p>
                </div>
              )}
            </div>
            <div className="p-6 pt-2">
              <Button variant="ghost" className="w-full text-emerald-600 hover:bg-emerald-50 text-sm">
                View All Invoices <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, isUp }: any) {
  const colorMap: any = {
    slate: 'bg-white text-slate-800 border-slate-100',
    orange: 'bg-white text-orange-600 border-slate-100',
    red: 'bg-white text-red-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100'
  };

  const trendColorMap: any = {
    slate: 'text-red-500',
    orange: 'text-orange-500',
    red: 'text-red-600 font-bold underline cursor-pointer',
    blue: 'text-blue-600'
  };

  return (
    <Card className={`shadow-sm rounded-xl hover:shadow-md transition-all border ${colorMap[color]}`}>
      <CardContent className="p-5">
        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold mt-1 tracking-tight truncate">{value}</h3>
        <div className={`text-[10px] mt-2 font-medium ${trendColorMap[color]}`}>
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

function FileText(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
