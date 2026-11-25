'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useCommitments } from '@/hooks/useCommitments';
import { useRealMoney } from '@/hooks/useRealMoney';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { PageTourButton } from '@/components/tour/PageTourButton';
import { Card, useThemeKind } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import { formatCompactCOP } from '@/lib/chartFormat';
import { getLocalMonthString } from '@/lib/dateUtils';
import { buildCashCalendar } from '@/lib/cashCalendar';

// Calendario de tu plata: cuánto tendrías cada día de hoy a fin de mes (lib/cashCalendar.ts).
// La plata de hoy sale de tus cuentas (si las tienes) o de lo que entró menos lo que salió este mes.
export default function CalendarioPage() {
  const router = useRouter();
  const { isTech } = useThemeKind();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const commitments = useCommitments(transactions);
  const real = useRealMoney();
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => (currency === 'COP' ? formatCompactCOP(n) : fmt(n));
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const cal = useMemo(() => {
    if (loadingTransactions || commitments.loading) return null;
    const now = new Date();
    const month = getLocalMonthString(now);
    const inMonth = transactions.filter(t => getLocalMonthString((t.date as any)?.toDate ? (t.date as any).toDate() : new Date(t.date as any)) === month);
    const monthMoney = inMonth.reduce((s, t) => s + (t.type === 'ingreso' ? t.amount : -t.amount), 0);
    const start = real ? real.cash - real.cardDebt : monthMoney;
    return buildCashCalendar({ start, now, transactions, commitments: commitments.pending });
  }, [transactions, loadingTransactions, commitments.loading, commitments.pending, real]);

  const [selected, setSelected] = useState(0);
  const sel = cal?.days[selected];
  const weekday = (d: Date) => d.toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', '');
  const longDay = (d: Date) => d.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
  const goesNegative = cal ? cal.lowest.balance < 0 : false;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-4 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label={tr('Volver a Servicios')} className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="ui-title text-2xl leading-tight">{tr('Calendario de tu plata')}</h1>
            <p className="text-xs text-text-muted">{tr('Cuánto tendrías cada día hasta fin de mes')}</p>
          </div>
          <PageTourButton id="calendario" className="ml-auto" />
        </div>

        {!cal ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {/* Resumen: ¿alcanza? */}
            <Card className={`p-4 ${goesNegative ? 'border-red-500/40' : ''}`} data-tour="cal-summary">
              <div className="flex items-start gap-3">
                <span className={`ui-icon-box ${goesNegative ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {goesNegative ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">
                    {goesNegative
                      ? tr('El {a} te quedarías en {b}', { a: longDay(cal.lowest.date), b: fmt(cal.lowest.balance) })
                      : tr('Te alcanza hasta fin de mes')}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {tr('Terminarías el mes con {a}. Cuento {b} al día de gastos normales.', { a: fmt(cal.end), b: fmt(cal.dailySpend) })}
                  </p>
                </div>
              </div>
            </Card>

            {/* Días */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5" data-tour="cal-days">
              {cal.days.map((d, i) => {
                const neg = d.balance < 0;
                const hasPay = d.events.some(e => e.kind === 'pago');
                const hasIn = d.events.some(e => e.kind === 'ingreso');
                return (
                  <button key={i} type="button" onClick={() => setSelected(i)} aria-pressed={selected === i}
                          className={`p-2 text-left border transition-all ${isTech ? 'rounded-none' : 'rounded-xl'} ${selected === i ? 'border-accent bg-accent/10' : 'border-glass-border bg-glass'}`}>
                    <span className="block text-[10px] text-text-muted capitalize">{i === 0 ? tr('Hoy') : weekday(d.date)} {d.date.getDate()}</span>
                    <span className={`block text-xs font-bold tabular-nums ${neg ? 'text-money-neg' : 'text-text-primary'}`}>{compact(d.balance)}</span>
                    <span className="flex gap-1 mt-1 h-1.5">
                      {hasPay && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
                      {hasIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Detalle del día elegido */}
            {sel && (
              <Card className="p-4 space-y-2" data-tour="cal-detail">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary first-letter:uppercase">{longDay(sel.date)}</p>
                  <p className={`text-sm font-bold tabular-nums ${sel.balance < 0 ? 'text-money-neg' : 'text-text-primary'}`}>{fmt(sel.balance)}</p>
                </div>
                {sel.events.length ? sel.events.map((e, k) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0 text-text-secondary">
                      {e.kind === 'pago' ? <TrendingDown className="w-4 h-4 text-money-neg shrink-0" /> : <TrendingUp className="w-4 h-4 text-money-pos shrink-0" />}
                      <span className="truncate">{e.title}</span>
                    </span>
                    <span className={`font-semibold tabular-nums ${e.amount < 0 ? 'text-money-neg' : 'text-money-pos'}`}>{e.amount < 0 ? '−' : '+'}{fmt(Math.abs(e.amount))}</span>
                  </div>
                )) : (
                  <p className="text-xs text-text-muted">{tr('Sin pagos ni ingresos este día; solo tus gastos normales.')}</p>
                )}
              </Card>
            )}

            <p className="text-[11px] text-text-muted leading-relaxed flex gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" />
              {tr('Es una estimación: usa tus pagos del mes (recordatorios, gastos fijos y cuotas), los ingresos que te llegaron el mes pasado y aún no llegan, y tu gasto diario de los últimos 2 meses.')}
            </p>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
