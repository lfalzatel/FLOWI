'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getUserDebts, Debt } from '@/lib/firestore';

export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserDebts(user.uid);
      setDebts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Calcular el total pendiente de deudas
  const totalDeudas = debts
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  return { debts, loading, error, refresh, totalDeudas };
}
