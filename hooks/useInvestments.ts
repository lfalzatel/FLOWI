'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Investment } from '@/lib/firestore';
import { sortInvestments } from '@/lib/investments';

export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setInvestments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Sin orderBy para no requerir índices compuestos; se ordena en el cliente
    const q = query(collection(db, 'fl_investments'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : docData.createdAt,
        } as Investment;
      });
      setInvestments(sortInvestments(data));
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to investments:', err);
      setError(err.code === 'permission-denied' ? 'permission-denied' : 'unknown');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return { investments, loading, error };
}
