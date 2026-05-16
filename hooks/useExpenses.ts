'use client';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { getUserTransactions, Transaction } from '@/lib/firestore';

export function useExpenses(type?: 'gasto' | 'ingreso') {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserTransactions(user.uid, type);
      setTransactions(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, type]);

  useEffect(() => { refresh(); }, [refresh]);

  const totalGastos  = transactions.filter(t => t.type === 'gasto') .reduce((s, t) => s + t.amount, 0);
  const totalIngresos= transactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIngresos - totalGastos;

  return { transactions, loading, error, refresh, totalGastos, totalIngresos, balance };
}
