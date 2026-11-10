'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useReminders } from '@/hooks/useReminders';
import { useDebts } from '@/hooks/useDebts';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { CommitmentsCard } from '@/components/dashboard/CommitmentsCard';
import { DateFilter, FilterType } from '@/components/dashboard/DateFilter';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { CommitmentsSummary, PaidCommitment, getCommitmentsForMonth, monthKey } from '@/lib/commitments';
import { getDateFromISOWeek, getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';

const monthTitle = (k: string) => {
  const s = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const shiftMonth = (k: string, n: number) => monthKey(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1 + n, 1));

// Próximos compromisos desde Servicios: por mes, semana o día, con los que ya se pagaron
export default function CompromisosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { reminders, loading: remLoading } = useReminders();
  const { debts } = useDebts();
  const skips = profile?.commitmentSkips;
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);

  const [filterType, setFilterType] = useState<FilterType>('month');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  // Qué meses calcular y qué fechas mostrar según el filtro
  const sections = useMemo(() => {
    const calc = (m: string) => getCommitmentsForMonth(m, transactions, reminders, skips || [], debts);
    const current = getLocalMonthString();
    const keep = (s: CommitmentsSummary, inPeriod: (d: Date) => boolean): CommitmentsSummary => {
      const pending = s.pending.filter(c => inPeriod(c.dueDate));
      const paid = s.paid.filter(p => inPeriod(p.paidAt || p.dueDate) || inPeriod(p.dueDate));
      return { ...s, pending, paid, paidCount: paid.length, pendingTotal: pending.reduce((a, c) => a + (c.amount || 0), 0) };
    };
    if (filterType === 'all') {
      // Este mes y los dos anteriores
      return [0, -1, -2].map(n => { const m = shiftMonth(current, n); return { title: monthTitle(m), summary: calc(m) }; });
    }
    if (filterType === 'month') return [{ title: monthTitle(filterValue), summary: calc(filterValue) }];
    if (filterType === 'week') {
      const start = getDateFromISOWeek(filterValue);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const months = Array.from(new Set([monthKey(start), monthKey(end)]));
      const inWeek = (d: Date) => getISOWeekString(d) === filterValue;
      return months.map(m => ({ title: `${monthTitle(m)} · esta semana`, summary: keep(calc(m), inWeek) }));
    }
    const m = filterValue.slice(0, 7);
    const inDay = (d: Date) => getLocalDateString(d) === filterValue;
    return [{ title: new Date(`${filterValue}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }), summary: keep(calc(m), inDay) }];
  }, [transactions, reminders, skips, debts, filterType, filterValue]);

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const loading = loadingTransactions || remLoading;

  const paidRow = (p: PaidCommitment) => {
    const c = findCatalogEntry(p.category) || { label: p.category, icon: '🧾', color: '#10B981' };
    const when = p.paidAt
      ? `Pagado el ${p.paidAt.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
      : 'Marcado con "Ya lo pagué"';
    return (
      <li key={p.key} className="flex items-center gap-3 py-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
          <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{p.title}</p>
          <p className="text-[11px] text-text-muted truncate">{when}{p.how === 'abono' ? ' · abono a la deuda' : ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-emerald-500">{p.amount ? fmt(p.amount) : '—'}</p>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto" />
        </div>
      </li>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl lg:max-w-6xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Próximos compromisos</h1>
            <p className="text-xs text-text-muted">Tus pagos fijos: los que faltan y los que ya pagaste</p>
          </div>
        </div>

        <DateFilter transactions={transactions} filterType={filterType} filterValue={filterValue}
                    onChangeType={setFilterType} onChangeValue={setFilterValue} />

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          sections.map(({ title, summary }) => (
            <section key={title} className="space-y-3">
              {sections.length > 1 && <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">{title}</h2>}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <div className="min-w-0">
                  {summary.pending.length ? (
                    <CommitmentsCard summary={{ ...summary, paidCount: summary.paid.length }} currency={currency} onRefresh={() => {}} />
                  ) : (
                    <div className={`${card} p-5 text-sm text-text-secondary`}>
                      {summary.paid.length ? '¡Todo pagado en este periodo! 🎉' : 'No hay compromisos en este periodo.'}
                    </div>
                  )}
                </div>
                {summary.paid.length > 0 && (
                  <div className={`${card} p-4 min-w-0`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-bold ${isTech ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>Ya pagados</h3>
                      <p className="text-xs text-emerald-500 font-semibold">
                        {fmt(summary.paid.reduce((a, p) => a + (p.amount || 0), 0))}
                      </p>
                    </div>
                    <ul className="divide-y divide-glass-border">{summary.paid.map(paidRow)}</ul>
                  </div>
                )}
              </div>
            </section>
          ))
        )}

        <p className="text-[11px] text-text-muted text-center leading-relaxed">
          Salen de tus recordatorios de pago, de los gastos fijos del mes pasado y de las cuotas de tus deudas.
          Para agregar uno nuevo, crea un recordatorio en <Link href="/servicios/recordatorios" className="text-accent underline">Recordatorios</Link>.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
