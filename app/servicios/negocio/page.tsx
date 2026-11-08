'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Crown, Lock, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { TransactionList } from '@/components/dashboard/TransactionList';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { businessMonth, isBusinessTx } from '@/lib/business';
import { monthNameOf, shiftMonth } from '@/lib/monthSummary';
import { getLocalMonthString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';
import { usePlan } from '@/lib/plans';
import type { Transaction } from '@/lib/firestore';

// Mi negocio: ventas − costos = ganancia del mes, aparte de la plata personal.
// Gratis: el mes en curso. Premium: otros meses, comparación, desglose y movimientos.
export default function NegocioPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { premium } = usePlan();
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);

  const thisMonth = getLocalMonthString();
  const [month, setMonth] = useState(thisMonth);
  const [adding, setAdding] = useState<'ingreso' | 'gasto' | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const m = useMemo(() => businessMonth(transactions, month), [transactions, month]);
  const prev = useMemo(() => businessMonth(transactions, shiftMonth(month, -1)), [transactions, month]);
  const hasAny = useMemo(() => transactions.some(isBusinessTx), [transactions]);

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const isCurrent = month === thisMonth;
  const diff = m.profit - prev.profit;
  const maxCat = m.byCategory[0]?.amount || 1;
  const btn = `flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-bold border transition-all active:scale-[0.98] ${isTech ? 'rounded-none uppercase text-xs' : 'rounded-2xl'}`;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Mi negocio</h1>
            <p className="text-xs text-text-muted">Tus ventas aparte de tu plata personal</p>
          </div>
        </div>

        {/* Selector de mes (otros meses: Premium) */}
        <div className={`${card} flex items-center justify-between p-2`}>
          <button onClick={() => premium && setMonth(shiftMonth(month, -1))} disabled={!premium} aria-label="Mes anterior"
                  className="p-2 text-text-secondary hover:text-accent disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
          <p className={`font-bold capitalize ${isTech ? 'text-accent uppercase' : 'text-text-primary font-syne'}`}>{monthNameOf(month)} {month.slice(0, 4)}</p>
          <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Mes siguiente"
                  className="p-2 text-text-secondary hover:text-accent disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <>
            {/* Ventas − costos = ganancia */}
            <section className={`${card} p-5 space-y-4`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-text-muted flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Vendiste</p>
                  <p className={`text-lg font-bold text-emerald-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={m.sales} format={fmt} /></p>
                  <p className="text-[10px] text-text-muted">{m.salesCount} {m.salesCount === 1 ? 'venta' : 'ventas'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted flex items-center gap-1"><TrendingDown className="w-3.5 h-3.5 text-red-400" /> Costos</p>
                  <p className={`text-lg font-bold text-red-400 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={m.costs} format={fmt} /></p>
                  <p className="text-[10px] text-text-muted">Mercancía, insumos, envíos…</p>
                </div>
              </div>
              <div className={`pt-3 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
                <p className="text-[11px] text-text-muted">Ganancia del mes</p>
                <p className={`text-2xl font-bold ${m.profit >= 0 ? 'text-accent' : 'text-red-400'} ${isTech ? '' : 'font-syne'}`}>
                  {m.profit < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(m.profit)} format={fmt} />
                </p>
                {premium && (prev.sales > 0 || prev.costs > 0) && (
                  <p className={`text-xs mt-1 ${diff >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {diff >= 0 ? '▲' : '▼'} {fmt(Math.abs(diff))} {diff >= 0 ? 'más' : 'menos'} que en {monthNameOf(shiftMonth(month, -1))}
                  </p>
                )}
              </div>
            </section>

            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding('ingreso')} className={`${btn} border-emerald-500/40 text-emerald-500 bg-emerald-500/5`}>
                <Plus className="w-4 h-4" /> Registrar venta
              </button>
              <button type="button" onClick={() => setAdding('gasto')} className={`${btn} border-red-400/40 text-red-400 bg-red-500/5`}>
                <Plus className="w-4 h-4" /> Registrar costo
              </button>
            </div>

            {!hasAny && (
              <section className={`${card} p-5 text-sm text-text-secondary leading-relaxed space-y-2`}>
                <p className="font-semibold text-text-primary">¿Cómo funciona?</p>
                <p>Registra tus ventas con la categoría <b>Venta</b> o <b>Venta por catálogo</b>, y lo que compras para vender con <b>Inventario</b> o <b>Insumos</b>. Quedan aquí solos.</p>
                <p>Para cualquier otro movimiento, al registrarlo toca <b>🏪 Negocio: Sí</b>. Así tu sueldo y tus gastos personales no se mezclan con el negocio.</p>
              </section>
            )}

            {premium ? (
              <>
                {m.byCategory.length > 0 && (
                  <section className={`${card} p-5`}>
                    <h2 className={`text-sm font-bold mb-3 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}>En qué se movió</h2>
                    <div className="space-y-2.5">
                      {m.byCategory.map(c => (
                        <div key={`${c.type}${c.label}`}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-primary">{c.label} <span className="text-text-muted">· {c.count}</span></span>
                            <span className={c.type === 'ingreso' ? 'text-emerald-500' : 'text-red-400'}>{c.type === 'ingreso' ? '+' : '−'}{fmt(c.amount)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className={`h-full ${c.type === 'ingreso' ? 'bg-emerald-500' : 'bg-red-400'}`} style={{ width: `${Math.max(4, (c.amount / maxCat) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {m.items.length > 0 && (
                  <section>
                    <h2 className={`text-sm font-bold mb-3 ${isTech ? 'text-accent uppercase' : 'text-text-primary font-syne'}`}>Movimientos del negocio</h2>
                    <TransactionList transactions={m.items} onEdit={(tx) => setEditing(tx)} animationKey={month} />
                  </section>
                )}
              </>
            ) : (
              <section className={`${card} p-5 text-center space-y-3`}>
                <div className="flex justify-center"><span className="w-11 h-11 flex items-center justify-center rounded-2xl bg-amber-400/15"><Lock className="w-5 h-5 text-amber-400" /></span></div>
                <p className="text-sm font-bold text-text-primary">Más de tu negocio con Premium</p>
                <p className="text-xs text-text-secondary leading-relaxed">Meses anteriores, comparación con el mes pasado, en qué vendes y gastas más, y la lista de movimientos del negocio.</p>
                <Link href="/planes" className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
                  <Crown className="w-4 h-4" /> Ver planes
                </Link>
              </section>
            )}
          </>
        )}
      </main>
      <BottomNav />

      {adding && (
        <AddExpenseModal onClose={() => setAdding(null)} onSuccess={() => setAdding(null)} initialType={adding} initialBusiness />
      )}
      {editing && (
        <AddExpenseModal onClose={() => setEditing(null)} onSuccess={() => setEditing(null)} transactionToEdit={editing} />
      )}
    </div>
  );
}
