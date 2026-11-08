'use client';
import { useEffect, useRef } from 'react';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { getLocalDateString } from '@/lib/dateUtils';

// Cuenta los días en que la persona abre FLOWI (users/{uid}.activeDays, firstActiveDay, lastActiveDay).
// La primera vez parte de los días que ya tiene con movimientos registrados, para no empezar en 1
// a quien lleva meses usando la app. Una escritura por día como máximo.
export function UsageTracker() {
  const { user, profile } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !profile || loadingTransactions) return;
    const today = getLocalDateString();
    if (done.current === today || profile.lastActiveDay === today) return;
    done.current = today;
    const ref = doc(db, 'users', user.uid);
    let lastTx = '';
    for (const t of transactions) {
      const d = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any);
      if (!isNaN(d.getTime())) { const k = getLocalDateString(d); if (k <= today && k > lastTx) lastTx = k; }
    }
    const activity = { txCount: transactions.length, ...(lastTx ? { lastTxDay: lastTx } : {}) };

    if (profile.activeDays === undefined) {
      const days = new Set<string>();
      let first = today;
      for (const t of transactions) {
        const d = (t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any);
        if (isNaN(d.getTime())) continue;
        const key = getLocalDateString(d);
        if (key > today) continue;
        days.add(key);
        if (key < first) first = key;
      }
      days.add(today);
      updateDoc(ref, { activeDays: days.size, firstActiveDay: first, lastActiveDay: today, ...activity }).catch(() => {});
    } else {
      updateDoc(ref, { activeDays: increment(1), lastActiveDay: today, ...activity }).catch(() => {});
    }
  }, [user, profile, transactions, loadingTransactions]);

  return null;
}
