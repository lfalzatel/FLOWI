'use client';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Goal } from '@/lib/firestore';
import { sortGoals } from '@/lib/goals';
import { useInvestments } from '@/hooks/useInvestments';
import { investmentValue, kindOf } from '@/lib/investments';
import { useMemo } from 'react';

export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Sin orderBy para no requerir índices compuestos; se ordena en el cliente
    const q = query(collection(db, 'fl_goals'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => {
        const docData = d.data();
        return {
          id: d.id,
          ...docData,
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : docData.createdAt,
        } as Goal;
      });
      setGoals(sortGoals(data));
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error('Error listening to goals:', err);
      setError(err.code === 'permission-denied' ? 'permission-denied' : 'unknown');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Metas enlazadas a una inversión: lo ahorrado es lo que vale hoy esa inversión
  const { investments } = useInvestments();
  const linked = useMemo(() => sortGoals(goals.map(g => {
    if (!g.linkedInvestmentId) return g;
    const inv = investments.find(i => i.id === g.linkedInvestmentId && i.status === 'activo');
    if (!inv) return g;
    const name = kindOf(inv) === 'cdt' ? `CDT ${inv.bank}` : inv.note || inv.bank;
    return { ...g, savedAmount: Math.round(investmentValue(inv).value), linkedName: name };
  })), [goals, investments]);

  return { goals: linked, loading, error };
}
