import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  memoryLocalCache, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Using the explicit databaseId from config is CRITICAL when it's not "(default)"
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true 
}, databaseId);

export const auth = getAuth(app);

// Connectivity check (can be called by components if needed)
export async function checkFirebase() {
  try {
    const docRef = doc(db, 'settings', 'config');
    const snapshot = await getDocFromServer(docRef);
    return snapshot.exists();
  } catch (error) {
    console.error('Firebase Check Failed:', error);
    return false;
  }
}
