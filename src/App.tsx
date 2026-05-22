import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from './lib/firebase';
import { collection, doc, query, where, onSnapshot, setDoc } from 'firebase/firestore';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    // Listen for current user db profile
    const q = query(collection(db, 'users'), where('email', '==', user.email));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setUserProfile({
          uid: snapshot.docs[0].id,
          role: docData.role || 'staff',
          email: docData.email,
          name: docData.name,
          password: docData.password || '',
          status: docData.status || 'active'
        });
        setProfileLoading(false);
      } else {
        const username = user.email?.split('@')[0] || 'user';
        const fallbackRole = (user.email === 'admin@fintrac.local' || user.email?.startsWith('admin')) ? 'admin' : 'staff';
        const docId = username.toLowerCase().trim();

        const defaultProfile = {
          uid: docId,
          username: username,
          name: user.displayName || username.charAt(0).toUpperCase() + username.slice(1),
          email: user.email || '',
          role: fallbackRole,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        setDoc(doc(db, 'users', docId), defaultProfile)
          .then(() => {
            setUserProfile({
              uid: docId,
              role: fallbackRole,
              email: user.email || '',
              name: defaultProfile.name,
              status: 'active'
            });
            setProfileLoading(false);
          })
          .catch((err) => {
            console.error("Error creating profile:", err);
            setUserProfile({
              uid: docId,
              role: fallbackRole,
              email: user.email || '',
              name: defaultProfile.name,
              status: 'active'
            });
            setProfileLoading(false);
          });
      }
    }, (error) => {
      console.error("Profile onSnapshot error:", error);
      setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || (user && profileLoading)) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Initializing FinTrac Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} userProfile={userProfile}>
        {activeTab === 'dashboard' && <Dashboard userProfile={userProfile} />}
        {activeTab === 'invoices' && <Invoices userProfile={userProfile} />}
        {activeTab === 'suppliers' && <Suppliers userProfile={userProfile} />}
        {activeTab === 'settings' && <Settings userProfile={userProfile} />}
      </Layout>
      <Toaster position="top-right" richColors />
    </>
  );
}
