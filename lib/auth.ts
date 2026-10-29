import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export interface KnownAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export function saveKnownAccount(user: any) {
  if (typeof window === 'undefined') return;
  const accountsStr = localStorage.getItem('knownAccounts');
  let accounts: KnownAccount[] = accountsStr ? JSON.parse(accountsStr) : [];
  
  const existingIndex = accounts.findIndex(a => a.uid === user.uid);
  const accountData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
  
  if (existingIndex > -1) {
    accounts[existingIndex] = accountData;
  } else {
    accounts.push(accountData);
  }
  localStorage.setItem('knownAccounts', JSON.stringify(accounts));
}

export async function signInWithGoogle(promptSelectAccount?: boolean, loginHint?: string) {
  const customParams: any = {};
  if (promptSelectAccount) customParams.prompt = 'select_account';
  if (loginHint) customParams.login_hint = loginHint;
  googleProvider.setCustomParameters(customParams);

  const result  = await signInWithPopup(auth, googleProvider);
  return processGoogleUser(result.user);
}

export async function processGoogleUser(user: any) {
  const userRef = doc(db, 'users', user.uid);
  const snap    = await getDoc(userRef);

  let isNewUser = false;

  if (!snap.exists()) {
    isNewUser = true;
    await setDoc(userRef, {
      name:      user.displayName,
      email:     user.email,
      photoURL:  user.photoURL,
      // El rol de administrador se asigna desde "Gestionar usuarios" y queda guardado en el perfil
      role:      'Usuario',
      currency:  'COP',
      createdAt: serverTimestamp(),
    });
  } else {
    const data = snap.data();
    const updates: any = {
      name: user.displayName || data.name || '',
      email: user.email,
      photoURL: user.photoURL || data.photoURL || '',
    };
    await setDoc(userRef, updates, { merge: true });
  }

  saveKnownAccount(user);

  return { user, isNewUser };
}

export async function signOut() {
  sessionStorage.setItem('justLoggedOut', 'true');
  await firebaseSignOut(auth);
}
