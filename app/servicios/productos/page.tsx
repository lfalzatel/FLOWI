'use client';
import { currentLocale } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, TrendingDown, TrendingUp, ReceiptText, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { formatCurrency } from '@/lib/format';
import type { Transaction } from '@/lib/firestore';
import { frequentProducts, productSpend } from '@/lib/productSpend';
import { DateFilter, FilterType } from '@/components/dashboard/DateFilter';
import { getDateFromISOWeek, getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';

const monthShort = (k: string) => {
  const s = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1).toLocaleDateString(currentLocale(), { month: 'short' }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const dayShort = (d: Date) => d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }).replace('.', '');

export default function ProductosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const fmt = (n: number) => formatCurrency(n, profile?.currency || 'COP');
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const suggestions = useMemo(() => frequentProducts(transactions), [transactions]);
  const q = query.trim();
  const data = useMemo(() => (q.length >= 2 ? productSpend(transactions, q) : null), [transactions, q]);
  // Filtro de fechas, igual que en Gastos y Gastos hormiga: la gráfica y la lista se ajustan al periodo
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());
  const view = useMemo(() => {
    if (!data) return null;
    const inPeriod = (d: Date) => {
      if (filterType === 'all') return true;
      const s = getLocalDateString(d);
      if (filterType === 'month') return s.startsWith(filterValue);
      if (filterType === 'week') return getISOWeekString(d) === filterValue;
      return s === filterValue;
    };
    const purchases = data.purchases.filter(p => inPeriod(p.date));
    const total = purchases.reduce((a, p) => a + p.total, 0);
    // Barras: meses (todo), semanas del mes, días de la semana; en un solo día no hay gráfica
    let bars: { key: string; label: string; total: number }[] = [];
    if (filterType === 'all') bars = data.months.slice(-6).map(m => ({ key: m.month, label: monthShort(m.month), total: m.total }));
    else if (filterType === 'month') {
      const [y, m] = filterValue.split('-').map(Number);
      const weeks = Math.ceil(new Date(y, m, 0).getDate() / 7);
      bars = Array.from({ length: weeks }, (_, i) => ({ key: `s${i}`, label: `Sem ${i + 1}`, total: 0 }));
      purchases.forEach(p => { bars[Math.min(weeks - 1, Math.floor((p.date.getDate() - 1) / 7))].total += p.total; });
    } else if (filterType === 'week') {
      const start = getDateFromISOWeek(filterValue);
      bars = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((l, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { key: l, label: `${l} ${d.getDate()}`, total: 0 }; });
      purchases.forEach(p => { bars[(p.date.getDay() + 6) % 7].total += p.total; });
    }
    return { purchases, total, bars, max: Math.max(1, ...bars.map(b => b.total)) };
  }, [data, filterType, filterValue]);
  const chartTitle = filterType === 'all' ? 'Por mes' : filterType === 'month' ? 'Por semana del mes' : 'Por día';
  const withItems = transactions.some(t => t.items?.length);

  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const card = `glass-card p-3 ${box}`;
  const chip = `px-3 py-1.5 text-xs font-semibold border border-glass-border text-text-secondary hover:border-accent hover:text-accent transition-colors ${isTech ? 'rounded-none' : 'rounded-full'}`;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>¿Cuánto gasto en…?</h1>
            <p className="text-xs text-text-muted">Busca un producto y mira cuánto se te va al mes y cómo cambia su precio.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ej. huevos, cerveza, gasolina…" autoComplete="off"
                 aria-label="Producto a buscar"
                 className={`w-full bg-glass border border-glass-border py-3 pl-10 pr-10 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent ${isTech ? 'rounded-none' : 'rounded-xl'}`} />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Borrar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!data && (
          <div className="space-y-3">
            {suggestions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Lo que más compras</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map(s => <button key={s} type="button" onClick={() => setQuery(s)} className={chip}>{s}</button>)}
                </div>
              </div>
            )}
            <div className={`flex gap-2.5 p-3 border border-accent/20 bg-accent/5 ${box}`}>
              <ReceiptText className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary leading-relaxed">
                {withItems
                  ? 'Busca en los productos de tus recibos escaneados y en la descripción de tus otros gastos.'
                  : 'Escanea tus recibos (o agrega los productos al registrar un gasto) y aquí verás cuánto gastas en cada cosa. Mientras tanto busco en la descripción de tus gastos.'}
              </p>
            </div>
          </div>
        )}

        {loadingTransactions && <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>}

        {data && !data.purchases.length && (
          <p className="text-sm text-text-secondary text-center py-8">No encontré compras de «{q}». Prueba con otra palabra, por ejemplo solo «huevo» o la marca.</p>
        )}

        {data && data.purchases.length > 0 && view && (
          <div className="space-y-4">
            <DateFilter transactions={transactions} filterType={filterType} filterValue={filterValue}
                        onChangeType={setFilterType} onChangeValue={setFilterValue} />
            <div className="grid grid-cols-3 gap-2">
              {filterType === 'all' ? (
                <>
                  <div className={card}>
                    <p className="text-[10px] text-text-muted">Este mes</p>
                    <p className="text-sm font-bold text-text-primary truncate">{fmt(data.thisMonth)}</p>
                  </div>
                  <div className={card}>
                    <p className="text-[10px] text-text-muted">Promedio al mes</p>
                    <p className="text-sm font-bold text-text-primary truncate">{fmt(data.monthlyAverage)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className={card}>
                    <p className="text-[10px] text-text-muted">En este periodo</p>
                    <p className="text-sm font-bold text-text-primary truncate">{fmt(view.total)}</p>
                  </div>
                  <div className={card}>
                    <p className="text-[10px] text-text-muted">Por compra</p>
                    <p className="text-sm font-bold text-text-primary truncate">{view.purchases.length ? fmt(view.total / view.purchases.length) : '—'}</p>
                  </div>
                </>
              )}
              <div className={card}>
                <p className="text-[10px] text-text-muted">Compras</p>
                <p className="text-sm font-bold text-text-primary truncate">{view.purchases.length}</p>
                <p className="text-[10px] text-text-muted truncate">{fmt(view.total)} en total</p>
              </div>
            </div>

            {data.lastPrice && (
              <div className={`${card} flex items-center gap-3`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-muted">Último precio{data.lastPrice.unit ? ` por ${data.lastPrice.unit}` : ' por unidad'}</p>
                  <p className="text-base font-bold text-text-primary">{fmt(data.lastPrice.price)} <span className="text-[11px] font-normal text-text-muted">el {dayShort(data.lastPrice.date)}</span></p>
                </div>
                {data.priceChange !== undefined && data.firstPrice && (
                  <div className={`text-right text-xs font-semibold ${Math.abs(data.priceChange) < 0.005 ? 'text-text-muted' : data.priceChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {Math.abs(data.priceChange) < 0.005 ? 'Igual' : (
                      <span className="inline-flex items-center gap-1">
                        {data.priceChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {data.priceChange > 0 ? 'Subió' : 'Bajó'} {Math.abs(Math.round(data.priceChange * 100))} %
                      </span>
                    )}
                    <p className="text-[10px] font-normal text-text-muted">vs. {fmt(data.firstPrice.price)} el {dayShort(data.firstPrice.date)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Gráfica según el periodo */}
            {view.bars.length > 0 && (
              <div className={card}>
                <p className="text-[10px] text-text-muted mb-2">{chartTitle}</p>
                <div className="flex items-end gap-1.5 h-28">
                  {view.bars.map(m => (
                    <div key={m.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1 h-full">
                      <span className="text-[9px] text-text-muted tabular-nums truncate max-w-full">{m.total ? fmt(m.total).replace(/\s/g, '') : ''}</span>
                      <div className={`w-full bg-accent/70 ${isTech ? '' : 'rounded-t-md'}`} style={{ height: `${Math.max(m.total ? 4 : 1, (m.total / view.max) * 80)}%`, opacity: m.total ? 1 : 0.25 }} />
                      <span className="text-[10px] text-text-muted truncate max-w-full">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!view.purchases.length && (
              <p className="text-sm text-text-secondary text-center py-4">No compraste «{q}» en este periodo.</p>
            )}

            {/* Compras */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">Cada compra</p>
              <ul className={`glass-card divide-y divide-glass-border ${box}`}>
                {view.purchases.slice(0, 60).map((p, i) => {
                  const tx = p.txId ? transactions.find(t => t.id === p.txId) : undefined;
                  return (
                    <li key={i}>
                      <button type="button" disabled={!tx} onClick={() => tx && setEditing(tx)} className="w-full flex items-start gap-3 p-3 text-left hover:bg-glass">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">{p.name}</p>
                          <p className="text-[11px] text-text-muted truncate">
                            {dayShort(p.date)}{p.merchant ? ` · ${p.merchant}` : ''}
                            {p.qty && p.qty !== 1 ? ` · ${p.qty.toLocaleString(currentLocale(), { maximumFractionDigits: 3 })}${p.unit ? ` ${p.unit}` : ''}` : ''}
                            {p.unitPrice && p.qty && p.qty !== 1 ? ` × ${fmt(p.unitPrice)}` : ''}
                            {!p.fromItems ? ' · gasto completo' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-text-primary tabular-nums shrink-0">{fmt(p.total)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {view.purchases.some(p => !p.fromItems) && (
                <p className="mt-2 text-[10px] text-text-muted">«Gasto completo» es un gasto sin productos cuya descripción dice «{q}»: se cuenta todo su valor.</p>
              )}
            </div>
          </div>
        )}
      </main>
      {editing && <AddExpenseModal transactionToEdit={editing} onClose={() => setEditing(null)} onSuccess={() => setEditing(null)} />}
      <BottomNav />
    </div>
  );
}
