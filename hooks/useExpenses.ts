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

  // Calcular % gastado del mes actual vs presupuesto
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const gastosEsteMes = allTransactions
    .filter(t => t.type === 'gasto')
    .filter(t => {
      const d = t.date instanceof Date 
        ? t.date 
        : (t.date && typeof (t.date as any).toDate === 'function')
          ? (t.date as any).toDate()
          : new Date(t.date as any);
      const yyyymm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return yyyymm === currentMonth;
    })
    .reduce((s, t) => s + t.amount, 0);

  return { transactions, loading, error, refresh, totalGastos, totalIngresos, balance, gastosEsteMes };
}
