'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useDebts } from '@/hooks/useDebts';
import { calculateDebtInterest, deleteDebt, monthlyInsuranceOf, nextDebtPaymentDate, updateDebt, type Debt } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, Plus, Check, Clock, Download, Calendar } from 'lucide-react';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { useTheme } from '@/components/ThemeProvider';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';
import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import { useData } from '@/components/DataProvider';
import { sharedBalances } from '@/lib/shared';
import { SharedPaymentModal } from '@/components/shared/SharedPaymentModal';
import type { Transaction } from '@/lib/firestore';
import { useAccounts } from '@/hooks/useAccounts';
import { useInvestments } from '@/hooks/useInvestments';
import { accountStates, type AccountState } from '@/lib/accounts';
import { TransferModal } from '@/components/accounts/AccountModals';

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Fecha en que se terminó de pagar: el último abono, o la creación si se registró ya pagada
function settledDate(debt: Debt): Date | null {
  const paymentDates = (debt.payments || []).map(p => toDate(p.date)).filter((d): d is Date => !!d);
  if (paymentDates.length) return new Date(Math.max(...paymentDates.map(d => d.getTime())));
  return toDate(debt.createdAt);
}

export default function DeudasPage() {
  const { theme } = useTheme();
  const isCyberpunk = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile, loading: authLoading } = useAuth();
  const { debts, loading: debtsLoading, refresh } = useDebts();
  const router = useRouter();
  // Gastos compartidos pendientes (viven en los gastos; aquí solo se resumen y se enlazan)
  const { transactions } = useData();
  const sharedList = sharedBalances(transactions);
  const sharedPending = sharedList.reduce(
    (acc, b) => ({ toMe: acc.toMe + b.owesMe, fromMe: acc.fromMe + b.iOwe, people: acc.people + (b.owesMe || b.iOwe ? 1 : 0) }),
    { toMe: 0, fromMe: 0, people: 0 });
  // Cada gasto compartido pendiente, para abonarlo desde aquí (vive en el gasto: no se duplica como deuda)
  const sharedOpen = sharedList.flatMap(b => b.entries.filter(e => !e.settled).map(e => ({ ...e, name: b.name })))
    .sort((a, c) => c.date.getTime() - a.date.getTime());
  const [sharedPay, setSharedPay] = useState<{ tx: Transaction; index: number } | null>(null);
  // Tarjetas de crédito: también son deudas. Lo que debes en cada una (con los préstamos vinculados adentro)
  const { accounts, transfers } = useAccounts();
  const { investments } = useInvestments();
  const cardStates = accountStates(accounts, transactions, transfers, investments, debts)
    .filter(s => s.account.kind === 'credito' && s.balance < 0);
  const inCard = new Set(cardStates.flatMap(s => s.movements.filter(m => m.kind === 'debt').map(m => (m as { debt: Debt }).debt.id)));
  const cardsOwed = cardStates.reduce((sum, s) => sum - s.balance, 0);
  const [payingCard, setPayingCard] = useState<AccountState | null>(null);
  
  const [showAdd, setShowAdd] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('month');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());

  // Calcular el total de deudas acumulando dinámicamente los intereses generados
  // (solo lo que yo debo; lo que me deben no es plata por pagar)
  // Los préstamos vinculados a una tarjeta ya están dentro de lo que debes en esa tarjeta: no se suman dos veces
  const totalDeudasConInteres = debts
    .filter(d => d.status !== 'paid' && (d.direction || 'debo') === 'debo' && !inCard.has(d.id))
    .reduce((sum, d) => {
      const basePending = d.totalAmount - d.paidAmount;
      const interestData = calculateDebtInterest(d);
      return sum + basePending + interestData.accumulatedInterest;
    }, 0) + cardsOwed;

  const isInPeriod = (d: Date | null) => {
    if (filterType === 'all') return true;
    if (!d) return false;
    const dateStr = getLocalDateString(d);
    if (filterType === 'month') return dateStr.startsWith(filterValue);
    if (filterType === 'week') return getISOWeekString(d) === filterValue;
    return dateStr === filterValue;
  };

  // Las pendientes se ven siempre (siguen vigentes); las liquidadas, solo en el periodo en que se pagaron
  const activeDebts = debts.filter(d => d.status !== 'paid' && !inCard.has(d.id)); // las de tarjeta se ven dentro de la tarjeta
  const paidDebts = debts.filter(d => d.status === 'paid' && isInPeriod(settledDate(d)));
  const hiddenPaidCount = debts.filter(d => d.status === 'paid').length - paidDebts.length;
  const pendingOf = (d: Debt) => d.totalAmount - d.paidAmount + calculateDebtInterest(d).accumulatedInterest;
  const owedToMe = activeDebts.filter(d => d.direction === 'me_deben').reduce((s, d) => s + pendingOf(d), 0);
  const iOweCount = activeDebts.filter(d => (d.direction || 'debo') === 'debo').length + cardStates.length;
  const monthlyInstallments = debts.filter(d => d.status !== 'paid')
    .filter(d => (d.direction || 'debo') === 'debo' && d.installment)
    .reduce((s, d) => s + (d.installment || 0) + monthlyInsuranceOf(d), 0);

  useEffect(() => {
    if (!authLoading && !user) {
      if (sessionStorage.getItem('justLoggedOut') === 'true') {
        sessionStorage.removeItem('justLoggedOut');
        router.push('/login?logout=true');
      } else {
        router.push('/login');
      }
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-deep flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const fmt = (n: number) => formatCurrency(n, profile?.currency);

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      
      <main className="relative flex-1 max-w-2xl lg:max-w-6xl mx-auto w-full space-y-6 animate-fade-in-up stagger p-4 pb-24">
        {/* Header section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`${isCyberpunk ? 'font-mono font-bold text-3xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-3xl text-text-primary'}`}>{tr('Deudas')}</h1>
            <p className={`mt-1 ${isCyberpunk ? 'font-mono text-accent/70 tracking-wide text-xs uppercase' : 'text-text-secondary text-sm'}`}>{tr('Historial y control de préstamos')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download Report Button */}
            <button
              onClick={() => setShowExport(true)}
              className={`w-9 h-9 flex items-center justify-center border transition-all ${isCyberpunk ? 'rounded-none border-accent/30 hover:border-accent text-accent' : 'rounded-xl border-white/5 bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary'}`}
              title={tr('Descargar Reporte')}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className={`flex items-center justify-center w-10 h-10 transition-all
                          bg-gradient-to-br from-accent to-accent-dim
                          ${(theme === 'light' || theme === 'nova') ? 'text-white' : 'text-black'}
                          font-semibold text-sm shadow-lg shadow-accent/20
                          hover:opacity-90 active:scale-[0.97]
                          ${isCyberpunk ? 'rounded-none' : 'rounded-2xl'}`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <DateFilter
          filterType={filterType}
          filterValue={filterValue}
          onChangeType={setFilterType}
          onChangeValue={setFilterValue}
        />

        {/* En PC: el total queda fijo a la izquierda y la lista ocupa la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 items-start">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-24">
        {/* Premium Card for Total Debts */}
        <div className={`relative overflow-hidden p-6 md:p-8 bg-card border border-orange-500/40 shadow-sm animate-card-mix ${isCyberpunk ? '' : 'rounded-3xl'}`}
             style={{...(isCyberpunk ? { borderRadius: 0, clipPath: 'polygon(0 20px, 20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)' } : {})}}>
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-money-debt" />
              </div>
              <span className={`text-xs font-medium ${isCyberpunk ? 'font-mono text-orange-400/70 tracking-wide uppercase' : 'text-text-secondary'}`}>{tr('Total Pendiente')}</span>
            </div>

            <p className={`mb-1 leading-none ${isCyberpunk ? 'font-mono font-bold text-[clamp(24px,8vw,36px)] text-money-debt tracking-wider' : 'font-syne font-bold text-[clamp(24px,8vw,36px)] text-money-debt'}`}>
              <AnimatedNumber value={totalDeudasConInteres} prefix="$" />
            </p>
            <p className={`text-xs ${isCyberpunk ? 'font-mono text-orange-400/50 uppercase tracking-widest' : 'text-text-muted'}`}>{tr('Suma de todas tus deudas activas')}</p>
          </div>
        </div>

        {/* Resumen rápido */}
        {!debtsLoading && debts.length > 0 && (
          <div className={`grid grid-cols-3 gap-2 ${isCyberpunk ? 'font-mono' : ''}`}>
            {[
              { label: tr('Deudas activas'), value: String(iOweCount), tone: 'text-text-primary' },
              { label: tr('Cuotas al mes'), value: monthlyInstallments ? fmt(monthlyInstallments) : '—', tone: 'text-money-debt' },
              { label: tr('Me deben'), value: owedToMe + sharedPending.toMe ? fmt(owedToMe + sharedPending.toMe) : '—', tone: 'text-money-pos' },
            ].map(c => (
              <div key={c.label} className={`glass-card p-3 ${isCyberpunk ? 'rounded-none' : 'rounded-2xl'}`}>
                <p className="text-[10px] text-text-muted leading-tight">{c.label}</p>
                <p className={`text-sm font-bold mt-1 truncate ${c.tone}`}>{c.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Gastos compartidos: lo que te deben (o debes) de cuentas divididas */}
        {sharedPending.people > 0 && (
          <Link href="/servicios/compartidos"
                className={`glass-card flex items-center gap-3 p-3 ${isCyberpunk ? 'rounded-none font-mono' : 'rounded-2xl'}`}>
            <div className={`w-9 h-9 flex items-center justify-center shrink-0 ${isCyberpunk ? 'rounded-none border border-orange-500/30' : 'rounded-xl bg-orange-500/15'}`}>
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{tr('Gastos compartidos')}</p>
              <p className="text-[11px] text-text-muted truncate">
                {[sharedPending.toMe ? tr('Te deben {m}', { m: fmt(sharedPending.toMe) }) : '', sharedPending.fromMe ? tr('Debes {m}', { m: fmt(sharedPending.fromMe) }) : ''].filter(Boolean).join(' · ')}
                {' · '}{sharedPending.people === 1 ? tr('1 persona') : tr('{n} personas', { n: sharedPending.people })}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          </Link>
        )}
        {sharedOpen.length > 0 && (
          <ul className={`glass-card divide-y divide-glass-border px-3 ${isCyberpunk ? 'rounded-none font-mono' : 'rounded-2xl'}`}>
            {sharedOpen.slice(0, 6).map(e => (
              <li key={`${e.tx.id}-${e.index}`} className="flex items-center gap-2 py-2">
                <div role="button" tabIndex={0} onClick={() => setSharedPay({ tx: e.tx, index: e.index })}
                     onKeyDown={ev => { if (ev.key === 'Enter') setSharedPay({ tx: e.tx, index: e.index }); }}
                     className="flex-1 min-w-0 cursor-pointer">
                  <p className="text-xs text-text-primary truncate">{e.toMe ? tr('{p} te debe', { p: e.name.split(/\s+/)[0] }) : tr('Le debes a {p}', { p: e.name.split(/\s+/)[0] })} · {e.tx.description?.trim() || tr(e.tx.category)}</p>
                  <p className="text-[10px] text-text-muted">
                    {e.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })}
                    {e.paid > 0 ? ` · ${tr('abonado {m} de {t}', { m: fmt(e.paid), t: fmt(e.amount) })}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold tabular-nums shrink-0 ${e.toMe ? 'text-money-pos' : 'text-money-debt'}`}>{fmt(e.pending)}</span>
                <button type="button" onClick={() => setSharedPay({ tx: e.tx, index: e.index })}
                        className={`h-7 px-2.5 text-[11px] font-semibold border border-accent/40 text-accent shrink-0 ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}>
                  {tr('Abonar')}
                </button>
              </li>
            ))}
          </ul>
        )}
        {payingCard && <TransferModal accounts={accounts} payCard={payingCard.account.id} owed={Math.max(0, -payingCard.balance - payingCard.movements.filter(m => m.kind === 'debt').reduce((s, m) => s - m.amount, 0))} currency={profile?.currency || 'COP'} onClose={() => setPayingCard(null)} />}
        {sharedPay && <SharedPaymentModal tx={sharedPay.tx} index={sharedPay.index} onClose={() => setSharedPay(null)} />}
        </div>

        <div className="min-w-0">
        {/* Debts List */}
        <div className="space-y-3">
          <h2 className={`${isCyberpunk ? 'font-mono font-bold text-base text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-base text-text-primary'}`}>{tr('Todas las deudas')}</h2>
          
          {debtsLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="glass-card h-20 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : debts.length === 0 && !cardStates.length ? (
            <div className="glass-card rounded-2xl p-6 text-center text-text-muted text-sm">
              {tr('No tienes deudas registradas. ¡Buen trabajo!')}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tarjetas de crédito: cada una es una deuda; los préstamos vinculados van adentro */}
              {cardStates.length > 0 && (
                <div className="space-y-2">
                  <h3 className={`text-xs font-semibold mb-2 uppercase tracking-widest ${isCyberpunk ? 'text-orange-400' : 'text-text-secondary'}`}>{tr('Tarjetas de crédito')} ({cardStates.length})</h3>
                  {cardStates.map(st => {
                    const a = st.account;
                    const owed = -st.balance;
                    const linkedDebts = st.movements.filter(m => m.kind === 'debt').map(m => m as { debt: Debt; amount: number });
                    const purchases = st.movements.filter(m => m.kind === 'tx' && m.amount < 0).slice(0, 3);
                    const pct = a.creditLimit ? Math.min(100, (owed / a.creditLimit) * 100) : 0;
                    return (
                      <div key={a.id} className={`glass-card p-4 space-y-2 ${isCyberpunk ? 'rounded-none font-mono' : 'rounded-2xl'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <CreditCard className="w-4 h-4 text-money-debt shrink-0" />
                            <p className="text-sm font-semibold text-text-primary truncate">{a.name}</p>
                          </div>
                          <p className="text-sm font-bold text-money-debt shrink-0">{tr('Debes {m}', { m: fmt(owed) })}</p>
                        </div>
                        {a.creditLimit ? (
                          <div>
                            <p className="text-[11px] text-text-muted">{tr('Disponible {m} de {t}', { m: fmt(Math.max(0, a.creditLimit - owed)), t: fmt(a.creditLimit) })}</p>
                            <div className={`mt-1 h-1.5 bg-white/10 overflow-hidden ${isCyberpunk ? 'rounded-none' : 'rounded-full'}`}>
                              <div className={`h-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : null}
                        {linkedDebts.length > 0 && (
                          <ul className="space-y-1">
                            {linkedDebts.map(m => (
                              <li key={m.debt.id}>
                                <button type="button" onClick={() => setSelectedDebt(m.debt)}
                                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs border border-orange-500/30 bg-orange-500/5 ${isCyberpunk ? 'rounded-none' : 'rounded-xl'}`}>
                                  <span className="truncate text-text-secondary">{tr('Incluye')} <b className="text-text-primary">{m.debt.title}</b></span>
                                  <span className="flex items-center gap-1 shrink-0 text-text-primary font-semibold">{fmt(-m.amount)} <ChevronRight className="w-3.5 h-3.5 text-text-muted" /></span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {purchases.length > 0 && (
                          <div className="text-[11px] text-text-muted space-y-0.5">
                            <p className="font-semibold">{tr('Últimas compras')}</p>
                            {purchases.map((m, i) => (
                              <p key={i} className="flex justify-between gap-2">
                                <span className="truncate">{m.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })} · {m.label}</span>
                                <span className="shrink-0 text-text-secondary">{fmt(-m.amount)}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          {(linkedDebts.length ? linkedDebts.length === 1 ? [linkedDebts[0]] : [] : []).map(m => (
                            <button key={m.debt.id} type="button" onClick={() => setSelectedDebt(m.debt)}
                                    className={`flex-1 py-2 text-xs font-semibold border border-accent/40 text-accent ${isCyberpunk ? 'rounded-none' : 'rounded-xl'}`}>
                              {tr('Abonar a {p}', { p: m.debt.title })}
                            </button>
                          ))}
                          {owed + linkedDebts.reduce((s, m) => s + m.amount, 0) > 0 && (
                            <button type="button" onClick={() => setPayingCard(st)}
                                    className={`flex-1 py-2 text-xs font-semibold border border-accent/40 text-accent ${isCyberpunk ? 'rounded-none' : 'rounded-xl'}`}>
                              {tr('Abonar a la tarjeta')}
                            </button>
                          )}
                          <Link href="/servicios/cuentas" className={`px-3 py-2 text-xs font-semibold border border-glass-border text-text-secondary ${isCyberpunk ? 'rounded-none' : 'rounded-xl'}`}>
                            {tr('Ver')}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Deudas Activas */}
              {activeDebts.length > 0 && (
                <div className="space-y-2">
                  <h3 className={`text-xs font-semibold mb-2 uppercase tracking-widest ${isCyberpunk ? 'text-orange-400' : 'text-text-secondary'}`}>{tr('Activas')} ({activeDebts.length})</h3>
                  <div className="space-y-2">
                  {activeDebts.map((debt, i) => {
                    const interestData = calculateDebtInterest(debt);
                    const basePending = debt.totalAmount - debt.paidAmount;
                    const pending = basePending + interestData.accumulatedInterest;
                    const progress = (debt.paidAmount / debt.totalAmount) * 100;
                    const displayLabel = isCyberpunk ? debt.title.toUpperCase().replace(/\s+/g, '_') : debt.title;
                    const createdDate = debt.createdAt instanceof Date 
                      ? debt.createdAt 
                      : (debt.createdAt && 'toDate' in (debt.createdAt as any) 
                          ? (debt.createdAt as any).toDate() 
                          : new Date());
                    const dateStr = createdDate.toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div
                        key={debt.id}
                        onClick={() => setSelectedDebt(debt)}
                        className="glass-card p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer animate-card-mix"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className={`text-text-primary font-medium text-sm [overflow-wrap:anywhere] ${isCyberpunk ? 'font-mono' : ''}`}>{displayLabel}</p>
                            {debt.description && (
                              <p className={`text-xs text-text-muted mt-0.5 max-w-[200px] sm:max-w-md line-clamp-1 italic ${isCyberpunk ? 'font-mono' : ''}`}>
                                {debt.description}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="flex items-center gap-0.5 text-[10px] text-text-secondary font-medium bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                <Calendar className="w-3 h-3" /> {dateStr}
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-orange-400 font-medium bg-orange-400/10 px-1.5 py-0.5 rounded">
                                <Clock className="w-3 h-3" /> {tr('Pendiente')}
                              </span>
                              {debt.direction === 'me_deben' && (
                                <span className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-1.5 py-0.5 rounded">
                                  {tr('Me deben')}
                                </span>
                              )}
                              {debt.interestRate ? (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1 rounded text-[9px] uppercase tracking-wider">
                                  {debt.interestRate}% EA
                                </span>
                              ) : null}
                              {debt.installment && nextDebtPaymentDate(debt) ? (
                                <span className="text-[10px] text-text-secondary font-medium bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                  {tr('Cuota')} {fmt(debt.installment)} · {nextDebtPaymentDate(debt)!.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-text-primary font-bold text-sm ${isCyberpunk ? 'font-mono' : ''}`}>
                              <AnimatedNumber value={pending} prefix="$" delay={i * 0.1} />
                            </p>
                            {interestData.accumulatedInterest > 0 ? (
                              <p className="text-[10px] text-red-400 font-mono font-medium">
                                +${interestData.accumulatedInterest.toLocaleString(currentLocale(), { maximumFractionDigits: 0 })} Int.
                              </p>
                            ) : (
                              <p className="text-[10px] text-text-muted">{tr('Total')}: {fmt(debt.totalAmount)}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-text-muted">{tr('Pagado')}: {fmt(debt.paidAmount)}</span>
                          <span className="text-[9px] text-text-muted">{Math.round(progress)}%</span>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {/* Historial de Deudas Liquidadas */}
              {paidDebts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className={`text-xs font-semibold mb-2 uppercase tracking-widest ${isCyberpunk ? 'text-accent' : 'text-text-muted'}`}>{tr('Liquidadas en este periodo')} ({paidDebts.length})</h3>
                  <div className="space-y-2">
                  {paidDebts.map((debt, i) => {
                    const displayLabel = isCyberpunk ? debt.title.toUpperCase().replace(/\s+/g, '_') : debt.title;
                    const createdDate = debt.createdAt instanceof Date 
                      ? debt.createdAt 
                      : (debt.createdAt && 'toDate' in (debt.createdAt as any) 
                          ? (debt.createdAt as any).toDate() 
                          : new Date());
                    const dateStr = createdDate.toLocaleDateString(currentLocale(), { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div
                        key={debt.id}
                        onClick={() => setSelectedDebt(debt)}
                        className="glass-card p-4 rounded-2xl hover:bg-white/[0.04] transition-colors cursor-pointer opacity-60 hover:opacity-100 transition-opacity animate-card-mix"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className={`text-text-primary font-medium text-sm line-through [overflow-wrap:anywhere] ${isCyberpunk ? 'font-mono' : ''}`}>{displayLabel}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="flex items-center gap-0.5 text-[10px] text-text-secondary font-medium bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                <Calendar className="w-3 h-3" /> {dateStr}
                              </span>
                              <span className="flex items-center gap-0.5 text-[10px] text-accent font-medium bg-accent/10 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3" /> {tr('Liquidada')}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-accent font-bold text-sm ${isCyberpunk ? 'font-mono' : ''}`}>
                              ${debt.totalAmount.toLocaleString(currentLocale(), { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-text-muted">{tr('Saldado completo')}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {hiddenPaidCount > 0 && (
                <p className={`text-[11px] text-center text-text-muted ${isCyberpunk ? 'font-mono' : ''}`}>
                  {hiddenPaidCount === 1 ? tr('1 deuda liquidada en otros periodos. Cambia el filtro para verla.') : tr('{n} deudas liquidadas en otros periodos. Cambia el filtro para verlas.', { n: hiddenPaidCount })}
                </p>
              )}
            </div>
          )}
        </div>
        </div>
        </div>
      </main>

      <BottomNav onSuccess={refresh} />

      {showAdd && (
        <AddDebtModal onClose={() => setShowAdd(false)} onSuccess={refresh} />
      )}
      
      {selectedDebt && (
        <AddDebtModal
          onClose={() => setSelectedDebt(null)}
          onSuccess={refresh}
          debtToEdit={selectedDebt}
        />
      )}

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title={tr('Deudas')}
          debts={debts}
          filterType="all"
          filterValue="all"
        />
      )}
    </div>
  );
}



