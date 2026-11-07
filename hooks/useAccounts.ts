'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Account, Transfer } from '@/lib/firestore';

// Cuentas y transferencias de la persona, en vivo
export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setTransfers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let pending = 2;
    const done = () => { pending = Math.max(0, pending - 1); if (!pending) setLoading(false); };
    const onErr = (err: any) => {
      console.error('Error listening to accounts:', err);
      setError(err.code === 'permission-denied' ? 'permission-denied' : 'unknown');
      setLoading(false);
    };
    const u1 = onSnapshot(query(collection(db, 'fl_accounts'), where('userId', '==', user.uid)), snap => {
      setAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
      setError(null);
      done();
    }, onErr);
    const u2 = onSnapshot(query(collection(db, 'fl_transfers'), where('userId', '==', user.uid)), snap => {
      setTransfers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transfer)));
      done();
    }, onErr);
    return () => { u1(); u2(); };
  }, [user]);

  return { accounts, transfers, loading, error };
}
