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
import { defaultCurrency, formatCurrency } from '@/lib/format';
import { formatCompactCOP } from '@/lib/chartFormat';
import { getDateFromISOWeek, getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';
import { DateFilter, FilterType } from '@/components/dashboard/DateFilter';
import { DayInfo, buildCalendarRange, buildCashCalendar, dayKey } from '@/lib/cashCalendar';

// Calendario de tu plata (lib/cashCalendar.ts), con vistas Mes / Semana / Día:
//  - días pasados: lo que realmente entró y salió
//  - hoy y adelante (hasta 3 meses): cuánto tendrías, con los pagos e ingresos esperados
type View = 'mes' | 'semana' | 'dia';
const DAY_MS = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mondayOf = (d: Date) => { const s = startOfDay(d); return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY_MS); };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export default function CalendarioPage() {
  const router = useRouter();
  const { isTech } = useThemeKind();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const commitments = useCommitments(transactions);
  const real = useRealMoney();
  const currency = profile?.currency || defaultCurrency();
  const fmt = (n: number) => formatCurrency(n, currency);
  const compact = (n: number) => (currency === 'COP' ? formatCompactCOP(n) : fmt(n));
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const [view, setView] = useState<View>('mes');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());
  const ready = !loadingTransactions && !commitments.loading;

  // El mismo filtro de las demás páginas (MES / SEMANA / DÍA): su valor sale de la vista y el día elegido
  const filterType: FilterType = view === 'semana' ? 'week' : view === 'dia' ? 'day' : 'month';
  const filterValue = view === 'semana' ? getISOWeekString(cursor) : view === 'dia' ? getLocalDateString(cursor) : getLocalMonthString(cursor);
  const pickValue = (v: string) => {
    const t = startOfDay(new Date());
    let d: Date;
    if (/^\d{4}-W\d+$/.test(v)) d = getDateFromISOWeek(v);
    else if (/^\d{4}-\d{2}$/.test(v)) { const [y, m] = v.split('-').map(Number); d = new Date(y, m - 1, 1); }
    else { const [y, m, dd] = v.split('-').map(Number); d = new Date(y, m - 1, dd); }
    // Si el periodo elegido incluye hoy, queda marcado hoy
    const sameMonth = d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
    if ((/^\d{4}-\d{2}$/.test(v) && sameMonth) || (/W/.test(v) && getISOWeekString(d) === getISOWeekString(t))) d = t;
    setCursor(startOfDay(d));
  };

  // Plata de hoy: cuentas (si las hay) o lo que entró menos lo que salió este mes
  const start = useMemo(() => {
    const month = getLocalMonthString(new Date());
    const toD = (v: any) => (v?.toDate ? v.toDate() : new Date(v));
    const monthMoney = transactions.filter(t => getLocalMonthString(toD(t.date)) === month)
      .reduce((s, t) => s + (t.type === 'ingreso' ? t.amount : -t.amount), 0);
    return real ? real.cash - real.cardDebt : monthMoney;
  }, [transactions, real]);

  // Resumen del mes actual (¿alcanza?)
  const summary = useMemo(() => (ready ? buildCashCalendar({ start, now: new Date(), transactions, commitments: commitments.pending }) : null),
    [ready, start, transactions, commitments.pending]);

  // Días visibles según la vista
  const range = useMemo(() => {
    if (view === 'mes') {
      const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const from = mondayOf(first);
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const to = addDays(mondayOf(last), 6);
      return { from, to };
    }
    if (view === 'semana') { const from = mondayOf(cursor); return { from, to: addDays(from, 6) }; }
    return { from: cursor, to: cursor };
  }, [view, cursor]);

  const days = useMemo(() => (ready
    ? buildCalendarRange({ start, now: new Date(), from: range.from, to: range.to, transactions, commitments: commitments.pending })
    : null), [ready, start, range, transactions, commitments.pending]);


  const loc = currentLocale();
  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(mondayOf(today), i).toLocaleDateString(loc, { weekday: 'narrow' }));
  const longDay = (d: Date) => d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' });
  const goesNegative = summary ? summary.lowest.balance < 0 : false;
  const selected = days?.get(dayKey(cursor));

  // Lo que se muestra en un cuadro: pasado = lo que se movió; futuro = la plata que tendrías
  const cellValue = (d: DayInfo) => d.past
    ? (d.net ? { text: `${d.net > 0 ? '+' : '−'}${compact(Math.abs(d.net))}`, cls: d.net > 0 ? 'text-money-pos' : 'text-money-neg' } : null)
    : d.balance !== null ? { text: compact(d.balance), cls: d.balance < 0 ? 'text-money-neg' : 'text-text-primary' } : null;


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
            <p className="text-xs text-text-muted">{tr('Lo que pasó y cuánto tendrías cada día')}</p>
          </div>
          <PageTourButton id="calendario" className="ml-auto" />
        </div>

        <DateFilter hideAll transactions={transactions} filterType={filterType} filterValue={filterValue}
                    onChangeType={t => setView(t === 'week' ? 'semana' : t === 'day' ? 'dia' : 'mes')} onChangeValue={pickValue} />

        {!ready || !summary || !days ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {/* Resumen del mes actual: ¿alcanza? */}
            <Card className={`p-4 ${goesNegative ? 'border-red-500/40' : ''}`} data-tour="cal-summary">
              <div className="flex items-start gap-3">
                <span className={`ui-icon-box ${goesNegative ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {goesNegative ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary">
                    {goesNegative ? tr('El {a} te quedarías en {b}', { a: longDay(summary.lowest.date), b: fmt(summary.lowest.balance) }) : tr('Te alcanza hasta fin de mes')}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {tr('Terminarías el mes con {a}. Cuento {b} al día de gastos normales.', { a: fmt(summary.end), b: fmt(summary.dailySpend) })}
                  </p>
                </div>
              </div>
            </Card>

            {/* MES: cuadrícula */}
            {view === 'mes' && (
              <div data-tour="cal-days">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {weekdays.map((w, i) => <span key={i} className="text-center text-[10px] font-bold text-text-muted uppercase">{w}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from(days.values()).map(d => {
                    const inMonth = d.date.getMonth() === cursor.getMonth();
                    const v = cellValue(d);
                    const isToday = dayKey(d.date) === dayKey(today);
                    const isSel = dayKey(d.date) === dayKey(cursor);
                    return (
                      <button key={dayKey(d.date)} type="button" onClick={() => setCursor(d.date)}
                              className={`min-h-[3.4rem] p-1 flex flex-col items-center border transition-all ${isTech ? 'rounded-none' : 'rounded-lg'} ${isSel ? 'border-accent bg-accent/10' : 'border-glass-border bg-glass'} ${inMonth ? '' : 'opacity-35'}`}>
                        <span className={`text-[11px] font-bold ${isToday ? 'text-accent' : 'text-text-secondary'}`}>{d.date.getDate()}</span>
                        {v && <span className={`text-[9px] font-semibold tabular-nums leading-tight ${v.cls}`}>{v.text}</span>}
                        <span className="flex gap-0.5 mt-auto">
                          {d.events.some(e => e.amount < 0 && !d.past) && <span className="w-1 h-1 rounded-full bg-red-400" />}
                          {d.events.some(e => e.amount > 0 && !d.past) && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEMANA: lista de 7 días */}
            {view === 'semana' && (
              <div className="space-y-1.5" data-tour="cal-days">
                {Array.from(days.values()).map(d => {
                  const v = cellValue(d);
                  const isSel = dayKey(d.date) === dayKey(cursor);
                  return (
                    <button key={dayKey(d.date)} type="button" onClick={() => { setCursor(d.date); setView('dia'); }}
                            className={`w-full flex items-center gap-3 p-3 text-left border ${isTech ? 'rounded-none' : 'rounded-xl'} ${isSel ? 'border-accent bg-accent/10' : 'border-glass-border bg-glass'}`}>
                      <span className="w-12 shrink-0 text-center">
                        <span className="block text-[10px] text-text-muted uppercase">{d.date.toLocaleDateString(loc, { weekday: 'short' }).replace('.', '')}</span>
                        <span className={`block text-lg font-bold ${dayKey(d.date) === dayKey(today) ? 'text-accent' : 'text-text-primary'}`}>{d.date.getDate()}</span>
                      </span>
                      <span className="flex-1 min-w-0 text-xs text-text-secondary truncate">
                        {d.events.length ? d.events.map(e => e.title).join(' · ') : d.past ? tr('Sin movimientos') : tr('Solo tus gastos normales')}
                      </span>
                      {v && <span className={`text-sm font-bold tabular-nums ${v.cls}`}>{v.text}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Detalle del día elegido (y vista DÍA) */}
            {selected && (
              <Card className="p-4 space-y-2" data-tour="cal-detail">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary first-letter:uppercase">{longDay(selected.date)}</p>
                  {selected.past
                    ? <p className={`text-sm font-bold tabular-nums ${selected.net < 0 ? 'text-money-neg' : 'text-money-pos'}`}>{selected.net ? `${selected.net > 0 ? '+' : '−'}${fmt(Math.abs(selected.net))}` : ''}</p>
                    : selected.balance !== null && <p className={`text-sm font-bold tabular-nums ${selected.balance < 0 ? 'text-money-neg' : 'text-text-primary'}`}>{fmt(selected.balance)}</p>}
                </div>
                <p className="text-[11px] text-text-muted">
                  {selected.past ? tr('Lo que entró y salió ese día') : selected.balance !== null ? tr('Plata que tendrías al final del día') : tr('Muy lejos: solo proyecto hasta 3 meses adelante.')}
                </p>
                {selected.events.length ? selected.events.map((e, k) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0 text-text-secondary">
                      {e.amount < 0 ? <TrendingDown className="w-4 h-4 text-money-neg shrink-0" /> : <TrendingUp className="w-4 h-4 text-money-pos shrink-0" />}
                      <span className="truncate">{e.title}</span>
                    </span>
                    <span className={`font-semibold tabular-nums ${e.amount < 0 ? 'text-money-neg' : 'text-money-pos'}`}>{e.amount < 0 ? '−' : '+'}{fmt(Math.abs(e.amount))}</span>
                  </div>
                )) : (
                  <p className="text-xs text-text-muted">{selected.past ? tr('Sin movimientos ese día.') : tr('Sin pagos ni ingresos este día; solo tus gastos normales.')}</p>
                )}
              </Card>
            )}

            <p className="text-[11px] text-text-muted leading-relaxed flex gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" />
              {tr('Los días que pasaron muestran lo que de verdad entró y salió. Hacia adelante es una estimación con tus pagos, tus ingresos habituales y tu gasto diario de los últimos 2 meses.')}
            </p>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
