import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export async function signInWithGoogle() {
  const result  = await signInWithPopup(auth, googleProvider);
  const user    = result.user;
  const userRef = doc(db, 'users', user.uid);
  const snap    = await getDoc(userRef);

  if (!snap.exists()) {
    await setDoc(userRef, {
      name:      user.displayName,
      email:     user.email,
      photoURL:  user.photoURL,
      role:      'Personal',
      createdAt: serverTimestamp(),
    });
  }
  return user;
}

export async function signOut() {
  await firebaseSignOut(auth);
  window.location.href = '/login';
}
