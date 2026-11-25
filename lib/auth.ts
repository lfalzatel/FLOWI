import { signInWithPopup, signOut as firebaseSignOut, signInAnonymously, linkWithPopup, signInWithCredential, GoogleAuthProvider, type AuthCredential } from 'firebase/auth';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { setDoc } from './db';
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
  // Siempre el selector de cuentas de Google: con login_hint solo, Google salta directo a pedir la
  // contraseña si esa cuenta no tiene la sesión abierta en el navegador; con el selector se elige
  // una cuenta que ya esté abierta en el celular sin escribir nada.
  const customParams: any = { prompt: 'select_account' };
  if (loginHint) customParams.login_hint = loginHint;
  void promptSelectAccount;
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
      // Invitado (modo sin cuenta): sin nombre ni correo hasta que vincule su cuenta de Google
      name:      user.isAnonymous ? 'Invitado' : user.displayName,
      email:     user.email || '',
      photoURL:  user.photoURL || '',
      // El rol de administrador se asigna desde "Gestionar usuarios" y queda guardado en el perfil
      role:      'Usuario',
      currency:  'COP',
      createdAt: serverTimestamp(),
    });
  } else {
    const data = snap.data();
    const updates: any = {
      name: user.displayName || data.name || '',
      email: user.email || data.email || '',
      photoURL: user.photoURL || data.photoURL || '',
    };
    await setDoc(userRef, updates, { merge: true });
  }

  if (!user.isAnonymous) saveKnownAccount(user);

  return { user, isNewUser };
}

// ── Modo invitado ─────────────────────────────────────────────────────
// Usar FLOWI sin cuenta: Firebase crea un usuario anónimo. Sus datos quedan atados a este celular
// hasta que vincule su cuenta de Google (entonces se conservan y se sincronizan).
export async function signInAsGuest() {
  const result = await signInAnonymously(auth);
  return processGoogleUser(result.user);
}

export type LinkResult =
  | { ok: true }
  | { ok: false; conflict: AuthCredential; email?: string } // ese Google ya tiene cuenta en FLOWI
  | { ok: false; error: string };

/** Convierte al invitado en su cuenta de Google conservando todo lo que registró. */
export async function linkGuestWithGoogle(): Promise<LinkResult> {
  const current = auth.currentUser;
  if (!current) return { ok: false, error: 'No hay sesión.' };
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await linkWithPopup(current, googleProvider);
    const g = result.user.providerData.find(p => p.providerId === 'google.com');
    const userRef = doc(db, 'users', result.user.uid);
    await setDoc(userRef, {
      name: g?.displayName || result.user.displayName || 'Usuario',
      email: g?.email || result.user.email || '',
      photoURL: g?.photoURL || result.user.photoURL || '',
    }, { merge: true });
    saveKnownAccount({ uid: result.user.uid, email: g?.email, displayName: g?.displayName, photoURL: g?.photoURL });
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'auth/credential-already-in-use' || e?.code === 'auth/email-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(e);
      if (cred) return { ok: false, conflict: cred, email: e?.customData?.email };
    }
    if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') return { ok: false, error: '' };
    return { ok: false, error: 'No se pudo vincular. Revisa tu conexión e inténtalo de nuevo.' };
  }
}

/** Ese Google ya tenía cuenta en FLOWI: entra a ella (lo registrado como invitado queda en este celular sin uso). */
export async function enterExistingAccount(cred: AuthCredential) {
  const result = await signInWithCredential(auth, cred);
  return processGoogleUser(result.user);
}

export async function signOut() {
  sessionStorage.setItem('justLoggedOut', 'true');
  await firebaseSignOut(auth);
}
