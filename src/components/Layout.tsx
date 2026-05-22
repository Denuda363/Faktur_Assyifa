import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  Search,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { notificationService } from '../services/dataService';
import { AppNotification } from '../types';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  userProfile?: any;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Layout({ children, activeTab, setActiveTab, user, userProfile }: LayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [simulatorMode, setSimulatorMode] = useState<'responsive' | 'pc' | 'tablet' | 'mobile'>('responsive');

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      setNotifications(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notifications');
    });
    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead(notifications);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAsRead = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await notificationService.markAllAsRead([n]);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    ...(userProfile?.role === 'admin' ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
  ];

  const handleLogout = () => signOut(auth);

  const isSimulated = simulatorMode !== 'responsive';
  const isDesktopSidebarHidden = simulatorMode === 'tablet' || simulatorMode === 'mobile';

  const simulatorConfig = {
    responsive: { container: "w-full h-screen", mainClass: "h-screen" },
    pc: { 
      container: "max-w-[1280px] h-[85vh] rounded-2xl border-[6px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] bg-[#F8FAFC] overflow-hidden relative", 
      mainClass: "h-full" 
    },
    tablet: { 
      container: "max-w-[768px] h-[85vh] rounded-[36px] border-[12px] border-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] bg-[#F8FAFC] overflow-hidden relative", 
      mainClass: "h-full" 
    },
    mobile: { 
      container: "max-w-[375px] h-[80vh] rounded-[48px] border-[12px] border-slate-900 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] bg-[#F8FAFC] overflow-hidden relative", 
      mainClass: "h-full" 
    }
  };

  const currentSim = simulatorConfig[simulatorMode];

  return (
    <div className={`min-h-screen w-full flex flex-col transition-all duration-300 ${isSimulated ? 'bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-5' : 'bg-[#F8FAFC]'}`}>
      
      {/* Viewport Simulator Control Bar */}
      <div className="w-full max-w-6xl mx-auto mb-4 px-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-2xl backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-2xl flex-shrink-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono">FinTrac Viewport Simulator</span>
        </div>
        
        {/* Switchers */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setSimulatorMode('responsive')}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all tracking-wider cursor-pointer ${
              simulatorMode === 'responsive'
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Responsive Fluid
          </button>
          
          <button
            type="button"
            onClick={() => setSimulatorMode('pc')}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 ${
              simulatorMode === 'pc'
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>🖥️ PC Desktop</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSimulatorMode('tablet')}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 ${
              simulatorMode === 'tablet'
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>📟 Tablet</span>
          </button>
          
          <button
            type="button"
            onClick={() => setSimulatorMode('mobile')}
            className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase transition-all tracking-wider cursor-pointer flex items-center gap-1 ${
              simulatorMode === 'mobile'
                ? "bg-blue-600 text-white shadow-md font-extrabold"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>📱 Mobile</span>
          </button>
        </div>
        
        {/* Viewport Info */}
        <div className="text-[10px] font-bold text-slate-400 font-mono hidden md:block bg-black/40 px-3 py-1.5 rounded-xl border border-white/5">
          {simulatorMode === 'responsive' && "Mode: Full fluid responsive layout (Default)"}
          {simulatorMode === 'pc' && "Simulator: 1280px x desktop layout boundary"}
          {simulatorMode === 'tablet' && "Simulator: 768px iPad style vertical boundary"}
          {simulatorMode === 'mobile' && "Simulator: 375px iPhone style vertical boundary"}
        </div>
      </div>

      <div className={`flex-1 flex items-center justify-center w-full min-h-0 ${isSimulated ? 'py-2 pb-6' : ''}`}>
        <div 
          className={`flex flex-col relative transition-all duration-300 w-full ${isSimulated ? currentSim.container : 'h-screen'}`}
        >
          {/* Simulated Mobile/Tablet Status Bar Accessory */}
          {(simulatorMode === 'mobile' || simulatorMode === 'tablet') && (
            <div className="h-6 w-full bg-slate-900 text-white flex items-center justify-between px-6 text-[9.5px] font-extrabold tracking-tight z-50 pointer-events-none select-none font-sans flex-shrink-0">
              <span className="font-semibold select-none">09:41 AM</span>
              {/* iPhone Notch Speaker details */}
              {simulatorMode === 'mobile' && (
                <div className="w-18 h-3.5 bg-black rounded-b-xl absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center" />
              )}
              <div className="flex items-center gap-1.5 select-none">
                <span>FinTrac LTE</span>
                <span>📶</span>
                <span>🔋 100%</span>
              </div>
            </div>
          )}

          {/* Actual Application Layout Structure */}
          <div className="flex flex-1 w-full bg-[#F8FAFC] text-slate-900 overflow-hidden relative">
            
            {/* Sidebar - Desktop */}
            <motion.aside 
              initial={false}
              animate={{ width: isSidebarOpen && !isDesktopSidebarHidden ? 260 : 0 }}
              className={`hidden ${isDesktopSidebarHidden ? '!hidden' : 'md:flex'} flex-col bg-slate-900 z-30 flex-shrink-0 h-full overflow-hidden`}
              style={{ display: isDesktopSidebarHidden ? 'none' : 'flex' }}
            >
              <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white">
                  F
                </div>
                {isSidebarOpen && !isDesktopSidebarHidden && (
                  <span className="font-bold text-lg tracking-tight text-white">FinTrac Pro</span>
                )}
              </div>

              <nav className="flex-1 px-3 space-y-1">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                      activeTab === item.id 
                        ? 'bg-blue-600/20 text-white border-l-4 border-blue-500 rounded-l-none' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-blue-400' : 'group-hover:text-white'}`} />
                    {isSidebarOpen && !isDesktopSidebarHidden && <span>{item.label}</span>}
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group cursor-pointer`}
                >
                  <LogOut className="w-5 h-5 flex-shrink-0 group-hover:text-red-400" />
                  {isSidebarOpen && !isDesktopSidebarHidden && <span>Logout</span>}
                </button>
              </div>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative h-full">
              <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-20">
                <div className="flex items-center gap-3">
                  {/* Hamburger menu for real mobile OR simulated mobile/tablet */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setMobileMenuOpen(true)}
                    className={`${isDesktopSidebarHidden ? 'flex' : 'md:hidden flex'} text-slate-500 pointer-events-auto cursor-pointer`}
                  >
                    <Menu className="w-5 h-5" />
                  </Button>

                  {/* Desktop Toggle Button */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className={`hidden ${isDesktopSidebarHidden ? '!hidden' : 'md:flex'} text-slate-500 pointer-events-auto cursor-pointer`}
                    title={isSidebarOpen ? "Sembunyikan Navigasi" : "Tampilkan Navigasi"}
                  >
                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </Button>
                  
                  <h2 className="text-base sm:text-lg font-bold text-slate-800 capitalize tracking-tight">
                    {menuItems.find(i => i.id === activeTab)?.label}
                  </h2>
                </div>

                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="hidden lg:flex items-center bg-slate-100 rounded-full px-4 py-1.5 border border-transparent focus-within:border-emerald-500 transition-all">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                      placeholder="Search..." 
                      className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-48 text-slate-600 outline-none"
                    />
                  </div>
                  
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative text-slate-500 pointer-events-auto cursor-pointer"
                      onClick={() => setShowNotifications(!showNotifications)}
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </Button>
                    
                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 text-left overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                          <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">Notifikasi ({unreadCount})</span>
                          {unreadCount > 0 && (
                            <button 
                              onClick={handleMarkAllAsRead} 
                              className="text-[11px] text-blue-600 hover:underline font-bold pointer-events-auto cursor-pointer"
                            >
                              Tandai dibaca
                            </button>
                          )}
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">
                              Tidak ada notifikasi baru
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div 
                                key={n.id} 
                                onClick={() => handleMarkAsRead(n)}
                                className={`p-4 hover:bg-slate-50 transition-colors relative group/noti cursor-pointer border-l-2 ${!n.read ? 'bg-blue-50/20 border-l-blue-500' : 'border-l-transparent'}`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-xs text-slate-700 leading-normal pr-5">{n.message}</p>
                                  <button
                                    onClick={(e) => handleDismissNotification(n.id, e)}
                                    className="text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors absolute right-2 top-2 pointer-events-auto cursor-pointer"
                                    title="Tolak / Hapus Notifikasi"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-400 mt-1.5 block font-mono font-medium">
                                  {new Date(n.createdAt).toLocaleString('id-ID')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator orientation="vertical" className="h-6" />

                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs sm:text-sm font-bold text-slate-800 leading-none">
                        {user.displayName || user.email?.split('@')[0] || 'Admin User'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {userProfile?.role || 'staff'}
                      </p>
                    </div>
                    <Avatar className="w-8 h-8 sm:w-9 h-9 border-2 border-slate-100 shadow-sm">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback className="bg-blue-600 text-white text-xs font-bold leading-none uppercase">
                        {user.displayName?.split(' ').map((n: string) => n[0]).join('') || user.email?.[0].toUpperCase() || 'AD'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </header>

              <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-[#F8FAFC]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="max-w-[1400px] mx-auto"
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </section>
            </main>

            {/* Mobile Sidebar Slide-out Drawer (Adaptive to simulation as absolute) */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  {/* Backdrop Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="absolute inset-0 bg-slate-950/65 z-40"
                  />
                  {/* Drawer Body container */}
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className="absolute inset-y-0 left-0 w-72 bg-slate-900 text-white z-50 flex flex-col p-6 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-base">
                          F
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">FinTrac Pro</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-white pointer-events-auto cursor-pointer"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <nav className="flex-1 space-y-1.5">
                      {menuItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl transition-all duration-200 text-left cursor-pointer ${
                            activeTab === item.id
                              ? 'bg-blue-600 text-white font-extrabold shadow-lg'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </nav>

                    <div className="pt-4 border-t border-slate-800 mt-auto">
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-left cursor-pointer font-bold"
                      >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
}
