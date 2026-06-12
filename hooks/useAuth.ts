'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  role: string;
  hiddenCategories?: string[];
}

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      try {
        if (firebaseUser) {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error al obtener el perfil de usuario:', error);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return { user, profile, loading };
}
