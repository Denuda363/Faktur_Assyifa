import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Bell, 
  Shield, 
  Moon, 
  Clock, 
  Save, 
  Trash2, 
  UserPlus, 
  Fingerprint, 
  Edit3, 
  User, 
  ShieldAlert, 
  ChevronRight,
  Info
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { settingsService, userService } from '../services/dataService';
import { AppConfig, UserProfile } from '../types';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

interface SettingsProps {
  userProfile?: any;
}

export default function Settings({ userProfile }: SettingsProps) {
  const [config, setConfig] = useState<AppConfig>({
    companyName: 'FinTrac Pro',
    companyAddress: '',
    welcomeMessage: 'Welcome to your professional invoice dashboard.',
    logoUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Profile Edit states
  const [profileName, setProfileName] = useState(userProfile?.name || '');
  const [profilePassword, setProfilePassword] = useState(userProfile?.password || '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.name || '');
      setProfilePassword(userProfile.password || '');
    }
  }, [userProfile]);

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toast.error('Nama lengkap harus diisi');
      return;
    }
    setSavingProfile(true);
    try {
      await userService.update(userProfile.uid, {
        name: profileName,
        password: profilePassword
      });
      toast.success('Profil pengguna berhasil disimpan');
    } catch (e) {
      console.error(e);
      toast.error('Gagal menyimpan profil pengguna');
    } finally {
      setSavingProfile(false);
    }
  };

  // User Management modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userForm, setUserForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff',
    status: 'pending' as 'pending' | 'active'
  });

  useEffect(() => {
    loadConfig();
    if (userProfile?.role === 'admin') {
      loadUsers();
    }
  }, [userProfile]);

  const loadConfig = async () => {
    const data = await settingsService.getConfig();
    setConfig(data);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await userService.getAll();
      setUsers(data);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat daftar user');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await settingsService.updateConfig(config);
      toast.success('Konfigurasi perusahaan berhasil disimpan');
    } catch (e) {
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddUser = () => {
    setUserForm({
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'staff',
      status: 'pending'
    });
    setIsEditMode(false);
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setUserForm({
      username: user.uid,
      name: user.name,
      email: user.email,
      password: user.password || '',
      role: user.role,
      status: user.status || 'active'
    });
    setSelectedUserId(user.uid);
    setIsEditMode(true);
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (id === 'admin') {
      toast.error('Default system admin tidak dapat dihapus');
      return;
    }
    
    if (confirm('Apakah Anda yakin ingin menghapus user ini secara permanen dari FinTrac Pro?')) {
      try {
        await userService.delete(id);
        toast.success('User berhasil dihapus');
        loadUsers();
      } catch (e) {
        toast.error('Gagal menghapus user');
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim()) return toast.error('Nama lengkap harus diisi');
    if (!userForm.username.trim()) return toast.error('Username harus diisi');
    
    // Convert username to path-safe alpha-numerical format
    const cleanUsername = userForm.username.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (!cleanUsername) return toast.error('Username hanya boleh berisi huruf dan angka');

    const emailValue = userForm.email.trim() || `${cleanUsername}@fintrac.local`;
    const passwordValue = userForm.password.trim() || 'admin123';

    try {
      if (isEditMode) {
        await userService.update(selectedUserId, {
          name: userForm.name,
          role: userForm.role,
          password: passwordValue,
          status: userForm.status
        });
        toast.success(`User '${userForm.name}' berhasil diperbarui`);
      } else {
        // Check duplicate
        const isDuplicate = users.some(u => u.uid === cleanUsername);
        if (isDuplicate) {
          toast.error(`Username '${cleanUsername}' sudah terdaftar`);
          return;
        }

        await userService.add({
          username: cleanUsername,
          name: userForm.name,
          email: emailValue,
          role: userForm.role,
          password: passwordValue,
          status: 'pending'
        });
        toast.success(`User '${userForm.name}' ditambahkan. Password: ${passwordValue}`);
      }
      setUserModalOpen(false);
      loadUsers();
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan user');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-505 mt-1">Configure your personal profile details and system workspace preferences.</p>
      </div>

      {/* Profil Pengguna Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500" /> Profil Pengguna
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Perbarui rincian akun Anda seperti nama lengkap dan kata sandi login di FinTrac Pro.
          </p>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
            <CardContent className="p-8 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="profile-email" className="text-slate-700 font-bold">Alamat Email (Akun)</Label>
                <Input 
                  id="profile-email" 
                  className="rounded-xl h-11 bg-slate-50 border-slate-200 cursor-not-allowed text-slate-500" 
                  value={userProfile?.email || ''} 
                  disabled 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-name" className="text-slate-705 font-bold">Nama Lengkap</Label>
                <Input 
                  id="profile-name" 
                  className="rounded-xl h-11" 
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Masukkan nama lengkap..."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="profile-password" className="text-slate-705 font-bold">Kata Sandi (Password)</Label>
                <Input 
                  id="profile-password" 
                  type="text" 
                  className="rounded-xl h-11 font-mono" 
                  value={profilePassword}
                  onChange={e => setProfilePassword(e.target.value)}
                  placeholder="Masukkan password login baru..."
                />
                <p className="text-[11px] text-slate-400">Kata sandi ini digunakan untuk masuk ke dashboard FinTrac Pro.</p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={savingProfile}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-10 h-11 shadow-md font-bold pointer-events-auto cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2" /> {savingProfile ? 'Menyimpan...' : 'Simpan Profil Saya'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {userProfile?.role === 'admin' && (
        <>
          <Separator className="bg-slate-100" />

          {/* Company & Branding Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" /> Company & Branding
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Informasi ini akan muncul pada laporan cetak laporan keuangan, faktur, dan salam pembuka di dashboard.
              </p>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white">
                <CardContent className="p-8 space-y-6">
                  <div className="grid gap-2">
                    <Label htmlFor="company-name" className="text-slate-700 font-bold">Nama Perusahaan</Label>
                    <Input 
                      id="company-name" 
                      className="rounded-xl h-11" 
                      value={config.companyName}
                      onChange={e => setConfig({...config, companyName: e.target.value})}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="welcome-msg" className="text-slate-700 font-bold">Pesan Sambutan Dashboard</Label>
                    <Input 
                      id="welcome-msg" 
                      className="rounded-xl h-11" 
                      value={config.welcomeMessage}
                      onChange={e => setConfig({...config, welcomeMessage: e.target.value})}
                    />
                    <p className="text-[11px] text-slate-400">Pesan custom yang ditampilkan ke staff ketika mereka login.</p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address" className="text-slate-700 font-bold">Alamat Resmi Operasional</Label>
                    <textarea 
                      id="address" 
                      className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={config.companyAddress}
                      onChange={e => setConfig({...config, companyAddress: e.target.value})}
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button 
                      onClick={handleSaveConfig} 
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl px-10 h-11 shadow-md font-bold pointer-events-auto cursor-pointer"
                    >
                      <Save className="w-4 h-4 mr-2" /> {loading ? 'Menyimpan...' : 'Simpan Pengaturan Perusahaan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* User Management Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-500" /> User Management
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Kelola hak akses system untuk staff keuangan, pendaftaran akun keuangan baru, dan kontrol kredensial user.
              </p>

              <Card className="rounded-2xl border-dashed border-slate-200 bg-slate-50/50 mt-6 p-5">
                <h5 className="font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500" /> Deskripsi Hak Akses
                </h5>
                <ul className="text-xs text-slate-500 mt-3 space-y-2">
                  <li>• <strong className="text-slate-850 text-slate-800">Administrator</strong>: Memiliki hak penuh untuk mengelola invoice, pembayaran, retur, merubah konfigurasi sistem, dan manajemen user.</li>
                  <li>• <strong className="text-slate-850 text-slate-800">Staff Keuangan</strong>: Dapat menginput transaksi faktur dan melihat dashboard, namun dibatasi dari tindakan merubah pengaturan corporate, daftar user, dan data sensitif.</li>
                </ul>
              </Card>
            </div>
            
            <div className="lg:col-span-2">
              <Card className="rounded-3xl border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 pb-4 border-b border-slate-50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-emerald-500" /> Sistem Multi Users {usersLoading && <span className="text-[10px] text-slate-400 font-normal animate-pulse">Memuat...</span>}
                      </CardTitle>
                      <CardDescription className="text-slate-500 mt-0.5">Daftar akun staff keuangan resmi dalam database FinTrac Anda.</CardDescription>
                    </div>
                    <Button 
                      onClick={handleOpenAddUser}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 h-11 px-5 shadow-sm font-bold pointer-events-auto cursor-pointer self-start sm:self-auto"
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Add User Account
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {users.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="font-bold text-slate-600">No Custom Users Yet</p>
                      <p className="text-xs mt-1">Gunakan tombol 'Add User Account' untuk mendaftarkan akun baru.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                            <th className="py-3.5 px-8">Nama Lengkap</th>
                            <th className="py-3.5 px-4">Username / Email</th>
                            <th className="py-3.5 px-4">Hak Akses</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-8 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {users.map((item) => (
                            <tr key={item.uid} className="hover:bg-slate-50/30 transition-colors">
                              <td className="py-4 px-8 font-bold text-slate-800">{item.name}</td>
                              <td className="py-4 px-4">
                                <div className="font-mono text-xs font-semibold text-slate-600">{item.uid}</div>
                                <div className="text-[10px] text-slate-400 select-all">{item.email}</div>
                              </td>
                              <td className="py-4 px-4">
                                {item.role === 'admin' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                    <Shield className="w-3 h-3" /> Administrator
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full">
                                    <User className="w-3 h-3" /> Staff Keuangan
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  item.status === 'active' 
                                    ? 'bg-green-50 text-green-700 border border-green-100' 
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'active' ? 'bg-green-500' : 'bg-amber-400 animate-pulse'}`} />
                                  {item.status === 'active' ? 'Aktif' : 'Pending Login'}
                                </span>
                              </td>
                              <td className="py-4 px-8 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleOpenEditUser(item)}
                                    className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 rounded-lg pointer-events-auto cursor-pointer"
                                    title="Edit User Info"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    disabled={item.uid === 'admin'}
                                    onClick={() => handleDeleteUser(item.uid)}
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-red-700 hover:bg-red-50 disabled:opacity-20 rounded-lg pointer-events-auto cursor-pointer"
                                    title="Hapus User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* User Form Modal (Add / Edit) */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-8 border-slate-200">
          <form onSubmit={handleSaveUser} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                   <UserPlus className="w-5 h-5"/>
                 </div>
                 {isEditMode ? 'Edit User Profile' : 'Mendaftarkan User Baru'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode 
                  ? 'Ubah preferensi hak akses dan password untuk user terpilih.' 
                  : 'Undang / daftarkan akun personil keuangan baru dengan hak akses spesifik.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Nama Lengkap</Label>
                <Input 
                  placeholder="Misal: Budi Santoso"
                  value={userForm.name}
                  onChange={e => setUserForm({...userForm, name: e.target.value})}
                  className="rounded-xl h-11 bg-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Username</Label>
                <Input 
                  placeholder="Misal: budisantoso"
                  value={userForm.username}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
                  className="rounded-xl h-11 bg-white font-mono"
                  required
                  disabled={isEditMode}
                />
                 {!isEditMode && (
                   <p className="text-[10px] text-slate-400">Username akan diredirect ke alamat internal otomatis.</p>
                 )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Alamat Email (Opsional)</Label>
                <Input 
                  type="email"
                  placeholder="budi@perusahaan.com (Opsional)"
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="rounded-xl h-11 bg-white"
                  disabled={isEditMode}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Password Login</Label>
                <Input 
                  placeholder="admin123"
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  className="rounded-xl h-11 bg-white font-mono"
                  required
                />
                 <p className="text-[10px] text-slate-400">Pastikan untuk memberi tahu personil password login ini.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-bold">Hak Akses (Role)</Label>
                <select 
                  className="w-full rounded-xl border border-slate-200 text-sm h-11 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={userForm.role}
                  onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                >
                   <option value="staff">Staff Keuangan (Input/View Only)</option>
                   <option value="admin">Administrator (Akses Penuh)</option>
                </select>
              </div>

              {isEditMode && (
                <div className="space-y-1.5">
                  <Label className="text-slate-700 font-bold">Status Akun</Label>
                  <select 
                    className="w-full rounded-xl border border-slate-200 text-sm h-11 px-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={userForm.status}
                    onChange={e => setUserForm({...userForm, status: e.target.value as any})}
                  >
                     <option value="active">Aktif</option>
                     <option value="pending">Pending</option>
                  </select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8">
                {isEditMode ? 'Simpan Perubahan' : 'Buat Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserCheck(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}
