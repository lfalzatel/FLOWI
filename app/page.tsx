'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { useDebts } from '@/hooks/useDebts';
import { Transaction } from '@/lib/firestore';
import { BalanceCard }     from '@/components/dashboard/BalanceCard';
import { ExpenseChart }    from '@/components/dashboard/ExpenseChart';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { BudgetProjection } from '@/components/dashboard/BudgetProjection';
import { CategoryBudgets } from '@/components/dashboard/CategoryBudgets';
import { GoalsSummaryCard } from '@/components/dashboard/GoalsSummaryCard';
import { CommitmentsCard } from '@/components/dashboard/CommitmentsCard';
import { useCommitments } from '@/hooks/useCommitments';
import { getDailyBudget } from '@/lib/dailyBudget';
import { MonthCloseCard } from '@/components/dashboard/MonthCloseCard';
import { monthToClose } from '@/lib/monthClose';
import { NextActionCard, useSkippedActions } from '@/components/dashboard/NextActionCard';
import { getNextActions } from '@/lib/nextAction';
import { useGoals } from '@/hooks/useGoals';
import { useInvestments } from '@/hooks/useInvestments';
import { useRealMoney } from '@/hooks/useRealMoney';
import { investmentStatus, monthSavings } from '@/lib/investments';
import { InvestmentsSummaryCard } from '@/components/dashboard/InvestmentsSummaryCard';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { isGoalDone } from '@/lib/goals';
import { buildDemoData } from '@/lib/demoData';
import { askForNotifications, CHANGED_EVENT, notificationsState } from '@/lib/notifPrompt';
import { getCommitments } from '@/lib/commitments';
import { formatCurrency } from '@/lib/format';
import { AppTour, TourOffer, TOUR_DONE_KEY, readTourVoicePref } from '@/components/tour/AppTour';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { useTheme } from '@/components/ThemeProvider';

let hasShownSplashInThisJSContext = false;

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions: realTransactions, loading: realLoading, refresh } = useExpenses();
  const { totalDeudas: realTotalDeudas } = useDebts();
  const realCommitments = useCommitments(realTransactions);
  const { goals: realGoals, loading: realGoalsLoading } = useGoals();
  const { investments } = useInvestments();
  const realMoney = useRealMoney();
  const { skipped: skippedActions, skip: skipAction } = useSkippedActions();
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTourOffer, setShowTourOffer] = useState(false);
  const [tourVoice, setTourVoice] = useState<boolean | null>(null); // null = recorrido cerrado
  const [notificationsOff, setNotificationsOff] = useState(false);
  useEffect(() => {
    const refresh = () => setNotificationsOff(['off', 'blocked', 'ios-needs-install'].includes(notificationsState()));
    refresh();
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHANGED_EVENT, refresh);
  }, []);

  // Durante el recorrido, Inicio muestra datos de ejemplo (solo en memoria) en lugar de los reales
  const touring = tourVoice !== null;
  const demo = useMemo(() => {
    if (!touring) return null;
    const data = buildDemoData();
    return { ...data, commitments: { ...getCommitments(data.transactions, data.reminders), loading: false } };
  }, [touring]);
  const transactions = demo ? demo.transactions : realTransactions;
  const loading = demo ? false : realLoading;
  const commitments = demo ? demo.commitments : realCommitments;
  const goals = demo ? demo.goals : realGoals;
  const goalsLoading = demo ? false : realGoalsLoading;
  const totalDeudas = demo
    ? demo.debts.filter(d => d.direction !== 'me_deben').reduce((s, d) => s + d.totalAmount - d.paidAmount, 0)
    : realTotalDeudas;
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !hasShownSplashInThisJSContext);
  const [splashMode, setSplashMode] = useState<'login' | 'reload'>('reload');
  const [splashDuration, setSplashDuration] = useState(1000);
  const [showNewUserMsg, setShowNewUserMsg] = useState(false);
  const router = useRouter();
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('month');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const processedUrl = useRef(false);

  // El recorrido explica el mes actual, así que fija el filtro en él
  function startTour(voice: boolean) {
    setFilterType('month');
    setFilterValue(getLocalMonthString());
    setShowTourOffer(false);
    setTourVoice(voice);
  }

  // "Ver tutorial" desde el menú de perfil estando ya en Inicio
  useEffect(() => {
    const onStart = () => startTour(readTourVoicePref());
    window.addEventListener('flowi-start-tour', onStart);
    return () => window.removeEventListener('flowi-start-tour', onStart);
  }, []);

  useEffect(() => {
    setMounted(true);
    hasShownSplashInThisJSContext = true;

    // Recorrido guiado: se ofrece una vez, o se abre directo desde Configuración (?tour=1)
    const params = new URLSearchParams(window.location.search);
    if (params.get('tour') === '1') {
      startTour(readTourVoicePref());
      window.history.replaceState({}, '', '/');
    } else {
      try {
        if (!localStorage.getItem(TOUR_DONE_KEY)) setShowTourOffer(true);
      } catch (e) {}
    }

    if (processedUrl.current) return;

    const isLogin = params.get('login') === 'true' || params.get('newuser') === 'true';

    if (isLogin) {
      processedUrl.current = true;
      if (params.get('newuser') === 'true') {
        setShowNewUserMsg(true);
      }
      if (sessionStorage.getItem('login_splash_done') === 'true') {
        setShowSplash(false);
        sessionStorage.removeItem('login_splash_done');
      } else {
        setSplashDuration(2500);
        setSplashMode('login');
        setShowSplash(true);
      }
      window.history.replaceState({}, '', '/');
    } else {
      setSplashDuration(1200);
      setSplashMode('reload');
    }
  }, []);
 
  useEffect(() => {
    if (!authLoading && !user) {
      const isAlreadyAtLogin = window.location.pathname.startsWith('/login');
      if (!isAlreadyAtLogin) {
        if (sessionStorage.getItem('justLoggedOut') === 'true') {
          sessionStorage.removeItem('justLoggedOut');
          window.location.replace('/login?logout=true');
        } else {
          window.location.replace('/login');
        }
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
    const dateStr = getLocalDateString(d);
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
  const isCurrentMonthView = filterType === 'month' && filterValue === getLocalMonthString();
  const pendingCommitments = commitments.loading ? 0 : commitments.pendingTotal;
  // La cuota de hoy siempre es del mes actual, aunque se esté mirando otro mes
  const todayBudget = getDailyBudget(transactions, profile?.budget, pendingCommitments, new Date(), demo ? 0 : monthSavings(investments), demo ? null : realMoney);
  const monthToCloseNow = demo ? null : monthToClose(transactions, profile?.closedMonths);
  const nextAction = getNextActions({
    transactions, pending: commitments.pending, today: todayBudget,
    hasGoals: goals.some(g => !isGoalDone(g)),
    notificationsOff: !demo && notificationsOff,
    maturing: demo ? [] : investments.filter(i => i.status === 'activo' && i.id)
      .map(i => ({ id: i.id!, bank: i.bank, amount: i.amount, daysLeft: investmentStatus(i).daysLeft })),
    formatMoney: (n) => formatCurrency(n, profile?.currency), skipped: skippedActions,
  })[0];

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />

      <main className="relative z-[1] flex-1 max-w-2xl lg:max-w-none mx-auto w-full space-y-6 animate-fade-in-up stagger p-4 pb-24">
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
          
          <div className="flex items-center gap-2">
            {/* Download Report Button */}
            <button
              onClick={() => setShowExport(true)}
              className={`px-3 py-1.5 flex items-center gap-1.5 border transition-all text-xs font-semibold ${
                isTechTheme 
                  ? 'rounded-none border-accent/30 hover:border-accent text-accent font-mono uppercase' 
                  : 'rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-text-primary'
              }`}
              title="Descargar Reportes en PDF o Excel"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Reportes</span>
            </button>

            {/* Desktop FAB */}
            <button
              onClick={() => setShowAdd(true)}
              data-tour="add"
              className={`hidden sm:flex items-center gap-2 px-4 py-2.5 transition-all
                         ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-widest text-xs font-bold' : `rounded-2xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'} font-semibold text-sm shadow-lg shadow-accent/20 hover:opacity-90 active:scale-[0.97]`}`}
            >
              <Plus className="w-4 h-4" />
              Nueva transacción
            </button>
          </div>
        </div>

        {/* Tu siguiente acción: cerrar el mes anterior (primeros días) o lo más útil para hacer ahora */}
        {!loading && !commitments.loading && !goalsLoading && (monthToCloseNow ? (
          <MonthCloseCard month={monthToCloseNow} transactions={transactions} currency={profile?.currency}
                          pendingCommitments={commitments.pendingTotal} pendingCount={commitments.pending.length} />
        ) : nextAction && (
          <NextActionCard key={nextAction.id} action={nextAction} today={todayBudget} currency={profile?.currency}
                          onSkip={() => skipAction(nextAction.id)} onRefresh={refresh} />
        ))}

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
          <>
            <BalanceCard key={`${filterType}-${filterValue}`} balance={filteredBalance} totalGastos={filteredGastos} totalIngresos={filteredIngresos} totalDeudas={totalDeudas}
                         currency={profile?.currency}
                         real={isCurrentMonthView && !demo ? realMoney : null}
                         pendingCommitments={pendingCommitments}
                         today={isCurrentMonthView ? todayBudget : null} />
            <div data-tour="projection"><BudgetProjection filterType={filterType} filterValue={filterValue} transactions={filteredTransactions} onRefresh={refresh}
                              pendingCommitments={commitments.loading ? 0 : commitments.pendingTotal} /></div>
            {/* Lo que falta por pagar este mes (solo mirando el mes actual) */}
            {isCurrentMonthView && !commitments.loading && (
              <div data-tour="commitments"><CommitmentsCard summary={commitments} currency={profile?.currency} onRefresh={refresh} /></div>
            )}
          </>
        )}

        {/* Meta de ahorro principal */}
        <div data-tour="goals"><GoalsSummaryCard currency={profile?.currency} demoGoals={demo?.goals} /></div>
        {!demo && <NetWorthCard transactions={transactions} currency={profile?.currency} />}
        {!demo && <InvestmentsSummaryCard currency={profile?.currency} />}

        {/* Chart */}
        <div data-tour="chart"><ExpenseChart transactions={filteredTransactions} filterType={filterType} filterValue={filterValue} /></div>

        {/* Category Budgets (2 Acordeones Inteligentes: Categorías Principales 50/30/20 y Subcategorías) */}
        <div data-tour="budgets"><CategoryBudgets transactions={filteredTransactions} currency={profile?.currency} filterType={filterType} /></div>

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

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title="General (Inicio)"
          transactions={filteredTransactions}
          filterType={filterType}
          filterValue={filterValue}
        />
      )}

      {editingTransaction && (
        <AddExpenseModal
          onClose={() => setEditingTransaction(null)}
          onSuccess={refresh}
          transactionToEdit={editingTransaction}
        />
      )}

      {/* El recorrido espera a que los datos estén en pantalla */}
      {!loading && showTourOffer && tourVoice === null && (
        <TourOffer
          onStart={startTour}
          onSkip={() => { setShowTourOffer(false); try { localStorage.setItem(TOUR_DONE_KEY, 'true'); } catch (e) {} }}
        />
      )}
      {!loading && tourVoice !== null && (
        <AppTour voice={tourVoice} demo onClose={() => { setTourVoice(null); setTimeout(() => askForNotifications(), 600); }} />
      )}
    </div>
  );
}
