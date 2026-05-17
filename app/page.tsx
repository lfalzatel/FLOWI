'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { BalanceCard }     from '@/components/dashboard/BalanceCard';
import { ExpenseChart }    from '@/components/dashboard/ExpenseChart';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loading, totalGastos, totalIngresos, balance, refresh } = useExpenses();
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
 
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0F] text-white">
        <p className="text-white/40 text-sm mb-2">Redirigiendo al login...</p>
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0F]">
      <Header />
      
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up stagger p-4 pb-24">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/40">{greeting} 👋</p>
            <h1 className="font-syne font-bold text-2xl text-white">
              {profile?.name?.split(' ')[0] || 'Usuario'}
            </h1>
          </div>
          {/* Desktop FAB */}
          <button
            onClick={() => setShowAdd(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-2xl
                       bg-gradient-to-r from-accent to-accent-dim text-black
                       font-semibold text-sm shadow-lg shadow-accent/20
                       hover:opacity-90 active:scale-[0.97] transition-all">
            <Plus className="w-4 h-4" />
            Nueva transacción
          </button>
        </div>

        {/* Balance */}
        {loading ? (
          <div className="glass-card rounded-3xl p-8 animate-pulse">
            <div className="h-4 bg-white/5 rounded w-1/3 mb-4" />
            <div className="h-12 bg-white/5 rounded w-2/3 mb-2" />
            <div className="h-3 bg-white/5 rounded w-1/4" />
          </div>
        ) : (
          <BalanceCard balance={balance} totalGastos={totalGastos} totalIngresos={totalIngresos} />
        )}

        {/* Chart */}
        <ExpenseChart transactions={transactions} />

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-syne font-semibold text-base text-white">Últimas transacciones</h2>
            <a href="/gastos" className="text-xs text-accent hover:underline">Ver todo</a>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card h-16 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <TransactionList transactions={transactions} limit={5} />
          )}
        </div>
      </main>

      <BottomNav />

      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
    </div>
  );
}
