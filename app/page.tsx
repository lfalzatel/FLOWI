'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
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
import { useTheme } from '@/components/ThemeProvider';

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loading, totalGastos, totalIngresos, balance, refresh } = useExpenses();
  const { totalDeudas } = useDebts();
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === 'true' || params.get('newuser') === 'true') return true;
      return !sessionStorage.getItem('appHasLoaded');
    }
    return true;
  });
  const [splashMode, setSplashMode] = useState<'login' | 'reload'>('reload');
  const [splashDuration, setSplashDuration] = useState(1000);
  const [showNewUserMsg, setShowNewUserMsg] = useState(false);
  const router = useRouter();
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('all');
  const [filterValue, setFilterValue] = useState(new Date().toISOString().split('T')[0].substring(0, 7));
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const processedUrl = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (processedUrl.current) return;

    const params = new URLSearchParams(window.location.search);
    const isLogin = params.get('login') === 'true' || params.get('newuser') === 'true';

    if (isLogin) {
      processedUrl.current = true;
      setSplashDuration(2500);
      setSplashMode('login');
      if (params.get('newuser') === 'true') {
        setShowNewUserMsg(true);
      }
      window.history.replaceState({}, '', '/');
    } else {
      setSplashDuration(1000);
      setSplashMode('reload');
    }
    sessionStorage.setItem('appHasLoaded', 'true');
  }, []);
 
  useEffect(() => {
    if (!authLoading && !user) {
      if (sessionStorage.getItem('justLoggedOut') === 'true') {
        sessionStorage.removeItem('justLoggedOut');
        window.location.replace('/login?logout=true');
      } else {
        window.location.replace('/login');
      }
    }
  }, [user, authLoading]);

  if (!mounted) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen duration={splashDuration} mode={splashMode} onComplete={() => setShowSplash(false)} />;
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
        {/* Welcome Message for New Users */}
        {showNewUserMsg && (
          <div className={`p-4 mb-2 animate-slide-down flex justify-between items-start ${isTechTheme ? 'bg-accent/10 border border-accent rounded-none' : 'glass-card'}`}>
            <div>
               <h3 className={`font-bold mb-1 ${isTechTheme ? 'text-accent font-mono uppercase tracking-widest text-sm' : 'text-text-primary'}`}>¡Bienvenido a Flowi!</h3>
               <p className={`text-sm ${isTechTheme ? 'text-accent/80 font-mono' : 'text-text-secondary'}`}>
                 El modo por defecto es <b>Cyberpunk</b>. Puedes cambiar el diseño y los colores de la aplicación en cualquier momento tocando tu foto de perfil (arriba a la derecha).
               </p>
            </div>
            <button onClick={() => setShowNewUserMsg(false)} className={`ml-4 mt-0.5 ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-muted hover:text-text-primary'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm ${isTechTheme ? 'font-mono text-accent/70 tracking-wider' : 'text-text-secondary'}`}>{greeting} 👋</p>
            <h1 className={`${isTechTheme ? 'font-mono font-bold text-2xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-2xl text-accent'}`}>
              {profile?.name?.split(' ')[0] || 'Usuario'}
            </h1>
          </div>
          {/* Desktop FAB */}
          <button
            onClick={() => setShowAdd(true)}
            className={`hidden sm:flex items-center gap-2 px-4 py-2.5 transition-all
                       ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-widest text-xs font-bold' : `rounded-2xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} font-semibold text-sm shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.97]`}`}
          >
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
          <BalanceCard key={`${filterType}-${filterValue}`} balance={filteredBalance - totalDeudas} totalGastos={filteredGastos} totalIngresos={filteredIngresos} totalDeudas={totalDeudas} />
        )}

        {/* Chart */}
        <ExpenseChart transactions={filteredTransactions} filterType={filterType} filterValue={filterValue} />

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-base text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-base text-text-primary'}`}>
              {filterType === 'all' ? 'Últimas transacciones' : 'Transacciones'}
            </h2>
            <a href="/gastos" className={`text-xs ${isTechTheme ? 'font-mono text-accent uppercase hover:text-accent/80 transition-colors' : 'text-accent hover:underline'}`}>Ver todo</a>
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
                animationKey={`${filterType}-${filterValue}`}
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
