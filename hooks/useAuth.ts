'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  name: string;
  email: string;
  photoURL: string;
  role: string;
  hiddenCategories?: string[];
  budget?: number;
  currency?: string;
  commitmentSkips?: string[]; // compromisos omitidos por mes ("YYYY-MM|clave")
  closedMonths?: string[];    // meses ya revisados con "Cerrar el mes" (YYYY-MM)
  categoryBudgets?: Record<string, number>; // presupuesto mensual por subcategoría
  servicesOrder?: string[] | null; // orden de las tarjetas de Servicios elegido por la persona
  servicesTipSeen?: boolean;       // ya leyó cómo reordenarlas
  activeDays?: number;             // días en que abrió FLOWI (ver components/layout/UsageTracker.tsx)
  firstActiveDay?: string;         // YYYY-MM-DD
  lastActiveDay?: string;          // YYYY-MM-DD
  txCount?: number;                // cuántos movimientos tiene (para el admin, sin montos)
  lastTxDay?: string;              // fecha del último movimiento (YYYY-MM-DD)
}

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error al obtener el perfil de usuario:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return { user, profile, loading };
}
