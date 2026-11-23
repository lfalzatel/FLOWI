'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Varios componentes usan useAuth a la vez: el perfil faltante se crea una sola vez
let creatingProfile = false;

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
  servicesUsage?: Record<string, number>; // cuántas veces abrió cada tarjeta de Servicios
  servicesSuggestOff?: boolean;    // no quiere que FLOWI le sugiera ordenarlas por uso
  activeDays?: number;             // días en que abrió FLOWI (ver components/layout/UsageTracker.tsx)
  firstActiveDay?: string;         // YYYY-MM-DD
  lastActiveDay?: string;          // YYYY-MM-DD
  txCount?: number;                // cuántos movimientos tiene (para el admin, sin montos)
  lastTxDay?: string;              // fecha del último movimiento (YYYY-MM-DD)
}

// Última sesión conocida: al cambiar de pantalla la nueva arranca con ella (sin ruedita ni parpadeo)
let lastAuth: { user: User | null; profile: UserProfile | null } | null = null;

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(() => lastAuth?.user ?? null);
  const [profile, setProfile] = useState<UserProfile | null>(() => lastAuth?.profile ?? null);
  const [loading, setLoading] = useState(() => !lastAuth);

  useEffect(() => {
    let unsubscribeProfile: () => void;
    
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
            lastAuth = { user: firebaseUser, profile: snap.data() as UserProfile };
            setLoading(false);
          } else {
            setProfile(null);
            // Cuenta de Google sin perfil: pasa cuando la ventana de Google recarga la página (en el
            // celular o con la app instalada) antes de crear el perfil. Se crea aquí; el listener lo
            // recibe enseguida. Mientras tanto se sigue "cargando" para no devolver a la landing.
            if (!creatingProfile) {
              creatingProfile = true;
              import('@/lib/auth')
                .then(({ processGoogleUser }) => processGoogleUser(firebaseUser))
                .catch((e) => { console.error('No se pudo crear el perfil:', e); setLoading(false); })
                .finally(() => { creatingProfile = false; });
            }
          }
        }, (error) => {
          console.error('Error al obtener el perfil de usuario:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        lastAuth = { user: null, profile: null };
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
