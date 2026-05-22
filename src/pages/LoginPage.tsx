import React, { useState } from 'react';
import { ShieldCheck, User, Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Convert username to internal email format for Firebase
    // If user enters an email, use it as is. Otherwise treat as username.
    const emailValue = username.includes('@') ? username : `${username.toLowerCase().trim()}@fintrac.local`;

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, emailValue, password);
        const docId = username.toLowerCase().trim();
        await setDoc(doc(db, 'users', docId), {
          uid: credential.user.uid,
          username: username,
          name: username.charAt(0).toUpperCase() + username.slice(1),
          email: emailValue,
          role: 'admin',
          status: 'active',
          password: password,
          createdAt: new Date().toISOString()
        });
        toast.success('Account created! Logging you in...');
      } else {
        const docId = username.toLowerCase().trim();
        const userRef = doc(db, 'users', docId);
        const userSnap = await getDoc(userRef).catch(() => null);

        if (userSnap && userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.password === password) {
            try {
              await signInWithEmailAndPassword(auth, emailValue, password);
              toast.success('Welcome back!');
            } catch (signInError: any) {
              if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/user-not-found' || signInError.code === 'auth/user-disabled') {
                toast.loading('Mendaftarkan akun Anda di sistem...', { id: 'auto-auth' });
                const credential = await createUserWithEmailAndPassword(auth, emailValue, password);
                await updateDoc(userRef, {
                  uid: credential.user.uid,
                  status: 'active'
                });
                toast.success('Pendaftaran selesai, selamat datang!', { id: 'auto-auth' });
              } else {
                throw signInError;
              }
            }
            setLoading(false);
            return;
          }
        }

        try {
          await signInWithEmailAndPassword(auth, emailValue, password);
          toast.success('Welcome back!');
        } catch (signInError: any) {
          if (
            signInError.code === 'auth/invalid-credential' &&
            username.toLowerCase().trim() === 'admin' &&
            password === 'admin123'
          ) {
            toast.loading('Creating initial demo admin account...', { id: 'demo-auth' });
            try {
              const credential = await createUserWithEmailAndPassword(auth, emailValue, password);
              await setDoc(doc(db, 'users', 'admin'), {
                uid: credential.user.uid,
                username: 'admin',
                name: 'System Admin',
                email: emailValue,
                role: 'admin',
                status: 'active',
                password: 'admin123',
                createdAt: new Date().toISOString()
              });
              toast.success('Demo admin account auto-created and logged in!', { id: 'demo-auth' });
            } catch (createError: any) {
              toast.dismiss('demo-auth');
              throw signInError;
            }
          } else {
            throw signInError;
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      let message = 'Authentication failed.';
      if (error.code === 'auth/email-already-in-use') message = 'Username already taken.';
      if (error.code === 'auth/weak-password') message = 'Password is too weak.';
      if (error.code === 'auth/invalid-credential') message = 'Invalid username or password.';
      if (error.code === 'auth/operation-not-allowed') {
        toast.error(
          <div>
            <p className="font-bold">Authentication Disabled</p>
            <p className="text-xs mt-1">
              You must enable <strong>Email/Password</strong> sign-in in your Firebase Console:
            </p>
            <ol className="text-[10px] mt-2 list-decimal list-inside">
              <li>Open Firebase Console</li>
              <li>Go to <strong>Authentication</strong> &gt; <strong>Sign-in method</strong></li>
              <li>Add <strong>Email/Password</strong> and enable it</li>
            </ol>
          </div>,
          { duration: 8000 }
        );
        setLoading(false);
        return;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Left Pane - Visual Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-12 flex-col justify-between text-white relative overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">F</div>
          <span className="text-2xl font-bold tracking-tighter">FinTrac Pro</span>
        </div>

        <div className="z-10 max-w-lg">
          <h1 className="text-6xl font-bold leading-tight tracking-tight">
            Professional <br /> Invoice <span className="opacity-60 italic text-blue-500">Intelligence.</span>
          </h1>
          <p className="text-slate-400 mt-6 text-xl leading-relaxed">
            Manage suppliers, track upcoming payments, and visualize your financial performance with our high-end dashboard.
          </p>
        </div>

        <div className="z-10 flex items-center gap-12 font-medium">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-blue-500">100%</span>
            <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">Accuracy</span>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-blue-500">99.9%</span>
            <span className="text-xs text-slate-500 uppercase tracking-widest mt-1">Uptime</span>
          </div>
        </div>

        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      </div>

      {/* Right Pane - Interaction */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{isRegister ? 'Create Account' : 'Enterprise Login'}</h2>
            <p className="text-slate-500">{isRegister ? 'Buat akun admin baru untuk mengakses dashboard.' : 'Masuk menggunakan username dan password admin Anda.'}</p>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-slate-300/50 border border-white">
             <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                   <Label htmlFor="username">{isRegister ? 'Choose Username' : 'Username'}</Label>
                   <div className="relative">
                      <User className="absolute left-3 top-[14px] w-4 h-4 text-slate-400" />
                      <Input 
                        id="username"
                        type="text" 
                        placeholder={isRegister ? "New Username" : "admin"} 
                        className="pl-10 h-12 rounded-xl"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                   </div>
                   {!isRegister && username === '' && (
                     <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mt-2">
                        <p className="text-[10px] text-blue-700 leading-tight">
                          <strong>Tips:</strong> Silakan daftar akun baru terlebih dahulu. Kami merekomendasikan menggunakan <strong>admin</strong> sebagai username.
                        </p>
                     </div>
                   )}
                </div>

                <div className="space-y-2">
                   <Label htmlFor="password">Password</Label>
                   <div className="relative">
                      <Lock className="absolute left-3 top-[14px] w-4 h-4 text-slate-400" />
                      <Input 
                        id="password"
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 h-12 rounded-xl"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                   </div>
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:shadow-lg hover:shadow-blue-200"
                >
                   {loading ? 'Authenticating...' : (
                     <>
                       <LogIn className="w-5 h-5" />
                       <span className="font-semibold">{isRegister ? 'Sign Up & Create Admin' : 'Sign In to Dashboard'}</span>
                     </>
                   )}
                </Button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 tracking-widest">Demo Credentials</span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-blue-600">Initial Demo Admin</p>
                      <p className="text-xs text-slate-600">Username: <span className="font-mono font-bold">admin</span></p>
                      <p className="text-xs text-slate-600">Password: <span className="font-mono font-bold">admin123</span></p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl h-8 px-3 text-[10px] font-bold"
                      onClick={() => {
                        setUsername('admin');
                        setPassword('admin123');
                        toast.info('Credentials filled! Please register if you haven\'t yet.');
                      }}
                    >
                      Fill Demo
                    </Button>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight italic">
                    Note: Silakan gunakan tombol "Register Admin Account" di bawah jika ini pertama kalinya Anda masuk.
                  </p>
                </div>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-100" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 tracking-widest">Security Protocol</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Secure Session</p>
                      <p className="text-[10px] text-slate-500 leading-tight">Protected by bank-grade encryption protocols.</p>
                    </div>
                </div>
             </form>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-slate-400">
              {isRegister ? 'Already have an account?' : 'New to FinTrac?'}{' '}
              <span 
                onClick={() => setIsRegister(!isRegister)}
                className="text-blue-600 font-medium cursor-pointer hover:underline"
              >
                {isRegister ? 'Sign In Instead' : 'Register Admin Account'}
              </span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
