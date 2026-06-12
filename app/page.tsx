'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { Transaction } from '@/lib/firestore';
import { BalanceCard }     from '@/components/dashboard/BalanceCard';
import { ExpenseChart }    from '@/components/dashboard/ExpenseChart';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { getISOWeekString } from '@/lib/dateUtils';
import { DateFilter } from '@/components/dashboard/DateFilter';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loading, totalGastos, totalIngresos, balance, refresh } = useExpenses();
  const { totalDeudas } = useDebts();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [splashDuration, setSplashDuration] = useState(1500);
  const router = useRouter();
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const hasLoaded = sessionStorage.getItem('appHasLoaded');
    
    if (params.get('login') === 'true') {
      setSplashDuration(2500);
      setShowSplash(true);
    } else if (hasLoaded) {
      setShowSplash(false);
    }
    
    sessionStorage.setItem('appHasLoaded', 'true');
  }, []);
 
  useEffect(() => {
    if (!authLoading && !user) {
      const justLoggedOut = sessionStorage.getItem('justLoggedOut');
      if (justLoggedOut === 'true') {
        sessionStorage.removeItem('justLoggedOut');
        router.push('/login?logout=true');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  if (!mounted) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen duration={splashDuration} onComplete={() => setShowSplash(false)} />;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-deep text-text-primary">
        <p className="text-text-muted text-sm mb-2">Redirigiendo al login...</p>
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') {
      return true;
    }
    const d = t.date instanceof Date 
      ? t.date 
      : (t.date && typeof (t.date as any).toDate === 'function')
        ? (t.date as any).toDate()
        : new Date(t.date as any);
    const dateStr = d.toISOString().split('T')[0];
    if (filterType === 'month') {
      return dateStr.startsWith(filterValue);
    } else if (filterType === 'week') {
      return getISOWeekString(d) === filterValue;
    } else {
      return dateStr === filterValue;
    }
  });

  const filteredGastos = filteredTransactions
    .filter(t => t.type === 'gasto')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const filteredIngresos = filteredTransactions
    .filter(t => t.type === 'ingreso')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const filteredBalance = filteredIngresos - filteredGastos;

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up stagger p-4 pb-24">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">{greeting} 👋</p>
            <h1 className="font-syne font-bold text-2xl text-accent">
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

        {/* Filter */}
        <DateFilter 
          transactions={transactions}
          filterType={filterType} 
          filterValue={filterValue} 
          onChangeType={setFilterType} 
          onChangeValue={setFilterValue} 
        />

        {/* Balance */}
        {loading ? (
          <div className="glass-card rounded-3xl p-8 animate-pulse">
            <div className="h-4 bg-glass rounded w-1/3 mb-4" />
            <div className="h-12 bg-glass rounded w-2/3 mb-2" />
            <div className="h-3 bg-glass rounded w-1/4" />
          </div>
        ) : (
          <BalanceCard balance={filteredBalance - totalDeudas} totalGastos={filteredGastos} totalIngresos={filteredIngresos} totalDeudas={totalDeudas} />
        )}

        {/* Chart */}
        <ExpenseChart transactions={filteredTransactions} filterType={filterType} filterValue={filterValue} />

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-syne font-semibold text-base text-text-primary">
              {filterType === 'all' ? 'Últimas transacciones' : 'Transacciones'}
            </h2>
            <a href="/gastos" className="text-xs text-accent hover:underline">Ver todo</a>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card h-16 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
             <TransactionList 
                transactions={filteredTransactions} 
                limit={filterType === 'all' ? 5 : undefined} 
                onEdit={(tx) => setEditingTransaction(tx)} 
             />
          )}
        </div>
      </main>

      <BottomNav onSuccess={refresh} />

      {showAdd && (
        <AddExpenseModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}

      {editingTransaction && (
        <AddExpenseModal
          onClose={() => setEditingTransaction(null)}
          onSuccess={refresh}
          transactionToEdit={editingTransaction}
        />
      )}
    </div>
  );
}
