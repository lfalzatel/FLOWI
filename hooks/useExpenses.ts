'use client';
import { useData } from '@/components/DataProvider';

export function useExpenses(type?: 'gasto' | 'ingreso') {
  const { transactions: allTransactions, loadingTransactions: loading, error } = useData();

  const transactions = type 
    ? allTransactions.filter(t => t.type === type)
    : allTransactions;

  const totalGastos  = allTransactions.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const totalIngresos= allTransactions.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIngresos - totalGastos;

  const refresh = async () => {}; // No-op para mantener compatibilidad

  return { transactions, loading, error, refresh, totalGastos, totalIngresos, balance };
}
