import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export { app };
export const auth           = getAuth(app);
// Base de datos con memoria en el celular: sin internet se siguen viendo los datos y lo que se registra
// queda en cola y se sube solo al volver la conexión (escrituras en lib/db.ts). Varias pestañas a la vez
// comparten la misma memoria. Si el navegador no lo permite (o ya estaba creada), se usa la normal.
function makeDb(): Firestore {
  if (typeof window === 'undefined') return getFirestore(app);
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
  } catch {
    return getFirestore(app);
  }
}
export const db             = makeDb();
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
