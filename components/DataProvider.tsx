'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Transaction, Debt } from '@/lib/firestore';

import { PowerAnimation, playUISound } from '@/components/dashboard/PowerAnimation';
import { DualTrajectoryBurstGlobal } from '@/components/dashboard/DualTrajectoryBurst';

interface DataContextType {
  transactions: Transaction[];
  debts: Debt[];
  loadingTransactions: boolean;
  loadingDebts: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType>({
  transactions: [],
  debts: [],
  loadingTransactions: true,
  loadingDebts: true,
  error: null,
});

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingDebts, setLoadingDebts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).deferredPWAInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-install-available'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setDebts([]);
      setLoadingTransactions(false);
      setLoadingDebts(false);
      return;
    }

    setLoadingTransactions(true);
    setLoadingDebts(true);

    // Listen to Expenses/Transactions
    const expensesRef = collection(db, 'fl_expenses');
    const expensesQuery = query(expensesRef, where('userId', '==', user.uid));
    
    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const transData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
          };
        }) as Transaction[];

        transData.sort((a, b) => {
          const dateA = a.date instanceof Date ? a.date : new Date();
          const dateB = b.date instanceof Date ? b.date : new Date();
          return dateB.getTime() - dateA.getTime();
        });

        setTransactions(transData);
        setLoadingTransactions(false);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoadingTransactions(false);
      }
    );

    // Listen to Debts
    const debtsRef = collection(db, 'fl_debts');
    const debtsQuery = query(debtsRef, where('userId', '==', user.uid));
    
    const unsubscribeDebts = onSnapshot(
      debtsQuery,
      (snapshot) => {
        const debtsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          const rawPayments = data.payments || [];
          
          const payments = rawPayments.map((p: any) => {
            let finalDate: Date;
            if (p.date instanceof Timestamp) {
              finalDate = p.date.toDate();
            } else if (p.date && typeof p.date === 'object' && 'seconds' in p.date) {
              finalDate = new Timestamp(p.date.seconds, p.date.nanoseconds).toDate();
            } else if (p.date) {
              finalDate = new Date(p.date);
            } else {
              finalDate = new Date();
            }
            return {
              ...p,
              date: finalDate,
            };
          });

          return {
            id: doc.id,
            ...data,
            payments,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          };
        }) as Debt[];

        debtsData.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
          return dateB.getTime() - dateA.getTime();
        });

        setDebts(debtsData);
        setLoadingDebts(false);
      },
      (err) => {
        console.error('Error fetching debts:', err);
        setError(err.message);
        setLoadingDebts(false);
      }
    );

    return () => {
      unsubscribeExpenses();
      unsubscribeDebts();
    };
  }, [user]);

  useEffect(() => {
    import('@/lib/notifications').then((m) => {
      m.registerReminderSW();
    });
  }, []);

  // 🔊 Escuchador global de interfaz para reproducir el micro-feedback (Burbuja / Pop u opción elegida) en cualquier botón de la app
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastSoundTime = 0;

    const handleGlobalClick = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastSoundTime < 60) return; // 60ms throttle para evitar dobles clics

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Detectar botón, enlace interactivo, rol button o input clickeable
      const clickable = target.closest(
        'button, [role="button"], a[href], input[type="submit"], input[type="button"], input[type="reset"]'
      );

      if (!clickable) return;

      // Ignorar si está deshabilitado
      if (
        (clickable as any).disabled ||
        clickable.getAttribute('aria-disabled') === 'true' ||
        clickable.classList.contains('disabled') ||
        clickable.classList.contains('pointer-events-none')
      ) {
        return;
      }

      // Ignorar elementos marcados para no reproducir sonido (ej. probador de sonido en configuración)
      if (clickable.closest('[data-no-ui-sound="true"]')) {
        return;
      }

      lastSoundTime = now;
      playUISound();
    };

    document.addEventListener('click', handleGlobalClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  return (
    <DataContext.Provider
      value={{
        transactions,
        debts,
        loadingTransactions,
        loadingDebts,
        error,
      }}
    >
      {children}
      <PowerAnimation />
      <DualTrajectoryBurstGlobal />
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
