'use client';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function GastosPage() {
  const { user, loading: authLoading } = useAuth();
  const { expenses, loading: expensesLoading, refresh } = useExpenses(user?.uid || '');
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || expensesLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col items-center justify-center">
        <div className="animate-pulse font-syne font-bold text-xl text-accent">Cargando gastos...</div>
      </div>
    );
  }

  const onlyExpenses = expenses.filter((e) => e.type === 'gasto');

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col">
      <Header />
      
      <main className="flex-1 p-4 pb-24">
        <div className="mb-6">
          <h1 className="text-3xl font-syne font-bold text-white">Mis Gastos</h1>
          <p className="text-white/40 text-sm mt-1">Historial completo de tus salidas</p>
        </div>

        {/* Card de Total */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Total Gastado</p>
          <h2 className="text-4xl font-syne font-bold text-white mt-1">
            ${onlyExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        {/* Lista filtrada */}
        <TransactionList transactions={onlyExpenses} />
      </main>

      <BottomNav onSuccess={refresh} />
    </div>
  );
}
