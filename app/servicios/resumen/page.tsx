'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useCategories } from '@/hooks/useCategories';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { CategoryIcon } from '@/components/CategoryIcon';
import { createCategoryResolver } from '@/lib/categoryGroups';
import { findCatalogEntry } from '@/lib/categories';
import { buildMonthSummary, shiftMonth } from '@/lib/monthSummary';
import { getLocalMonthString } from '@/lib/dateUtils';
import { formatCurrency } from '@/lib/format';

export default function ResumenPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { allCategories } = useCategories();
  const resolve = useMemo(() => createCategoryResolver(allCategories), [allCategories]);
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);

  // Por defecto el mes pasado (el resumen "cerrado"); se puede ir a cualquier mes
  const thisMonth = getLocalMonthString();
  const [month, setMonth] = useState(shiftMonth(thisMonth, -1));
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('mes');
    if (q && /^\d{4}-\d{2}$/.test(q)) setMonth(q);
  }, []);
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const s = useMemo(() => buildMonthSummary(transactions, month, resolve, fmt), [transactions, month, resolve, currency]); // eslint-disable-line react-hooks/exhaustive-deps
  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const isCurrent = month === thisMonth;
  const maxCat = s.categories[0]?.amount || 1;
  const pillarTotal = s.pillars.necesidades + s.pillars.deseos + s.pillars.ahorro || 1;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Resumen del mes</h1>
        </div>

        {/* Selector de mes */}
        <div className={`${card} flex items-center justify-between p-2`}>
          <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mes anterior" className="p-2 text-text-secondary hover:text-accent"><ChevronLeft className="w-5 h-5" /></button>
          <div className="text-center">
            <p className={`font-bold capitalize ${isTech ? 'text-accent uppercase' : 'text-text-primary font-syne'}`}>{s.monthName} {month.slice(0, 4)}</p>
            {isCurrent && <p className="text-[10px] text-text-muted">Mes en curso: aún no termina</p>}
          </div>
          <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Mes siguiente" className="p-2 text-text-secondary hover:text-accent disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : !s.hasData ? (
          <section className={`${card} p-6 text-center text-sm text-text-secondary`}>No hay movimientos registrados en {s.monthName}.</section>
        ) : (
          <>
            {/* Totales */}
            <section className={`${card} p-5`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-text-muted">Te ingresó</p>
                  <p className={`text-lg font-bold text-emerald-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={s.ingresos} format={fmt} /></p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">Gastaste</p>
                  <p className={`text-lg font-bold text-red-400 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={s.gastos} format={fmt} /></p>
                  {s.gastosChange !== null && (
                    <p className={`text-[11px] flex items-center gap-1 ${s.gastosChange > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                      {s.gastosChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(Math.round(s.gastosChange))} % vs {s.prevName}
                    </p>
                  )}
                </div>
              </div>
              <div className={`mt-4 pt-4 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'} flex items-end justify-between`}>
                <div>
                  <p className="text-[11px] text-text-muted">{s.balance >= 0 ? 'Te sobró' : 'Te faltó'}</p>
                  <p className={`text-[clamp(24px,8vw,32px)] font-bold leading-none ${s.balance >= 0 ? 'text-accent' : 'text-[var(--red)]'} ${isTech ? '' : 'font-syne'}`}>
                    {s.balance < 0 ? '−' : ''}<AnimatedNumber value={Math.abs(s.balance)} format={fmt} />
                  </p>
                </div>
                {s.savingsRate !== null && s.balance > 0 && (
                  <p className="text-xs text-text-secondary text-right">Ahorraste el<br /><b className="text-text-primary text-base"><AnimatedNumber value={s.savingsRate} format={(n: number) => `${Math.round(n)} %`} /></b></p>
                )}
              </div>
            </section>

            {/* Hallazgos */}
            {s.insights.length > 0 && (
              <section className={`${card} p-5`}>
                <h2 className={`flex items-center gap-2 text-sm font-bold mb-3 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}><Sparkles className="w-4 h-4 text-accent" /> Lo que pasó en {s.monthName}</h2>
                <ul className="space-y-2.5">
                  {s.insights.map((ins, i) => (
                    <li key={i} className={`flex items-start gap-2.5 text-sm leading-snug ${ins.tone === 'bad' ? 'text-red-300' : ins.tone === 'good' ? 'text-emerald-300' : 'text-text-secondary'}`}>
                      <span className="text-base leading-none mt-0.5">{ins.emoji}</span><span>{ins.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Categorías */}
            <section className={`${card} p-5`}>
              <h2 className={`text-sm font-bold mb-3 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}>En qué se fue</h2>
              <div className="space-y-3">
                {s.categories.slice(0, 8).map(c => (
                  <div key={c.label}>
                    <div className="flex items-center gap-2 text-sm">
                      <CategoryIcon icon={findCatalogEntry(c.label)?.icon || c.label} label={c.label} className="w-5 h-5 text-base flex items-center justify-center shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-text-secondary">{c.label}</span>
                      {c.change !== null && Math.abs(c.change) >= 10 && (
                        <span className={`text-[10px] ${c.change > 0 ? 'text-red-400' : 'text-emerald-500'}`}>{c.change > 0 ? '▲' : '▼'} {Math.abs(Math.round(c.change))} %</span>
                      )}
                      {c.prev === 0 && <span className="text-[10px] text-sky-400">nuevo</span>}
                      <span className="font-semibold text-text-primary tabular-nums"><AnimatedNumber value={c.amount} format={fmt} /></span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-accent/70" style={{ width: `${(c.amount / maxCat) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            {/* 50/30/20 y hábitos */}
            <section className={`${card} p-5 space-y-4`}>
              <div>
                <h2 className={`text-sm font-bold mb-2 ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`}>Regla 50/30/20</h2>
                <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                  <div className="bg-blue-400" style={{ width: `${(s.pillars.necesidades / pillarTotal) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(s.pillars.deseos / pillarTotal) * 100}%` }} />
                  <div className="bg-emerald-400" style={{ width: `${(s.pillars.ahorro / pillarTotal) * 100}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <p className="text-blue-400">Necesidades<br /><b className="text-text-primary"><AnimatedNumber value={s.pillars.necesidades} format={fmt} /></b></p>
                  <p className="text-amber-400">Estilo de vida<br /><b className="text-text-primary"><AnimatedNumber value={s.pillars.deseos} format={fmt} /></b></p>
                  <p className="text-emerald-400">Ahorro<br /><b className="text-text-primary"><AnimatedNumber value={s.pillars.ahorro} format={fmt} /></b></p>
                </div>
              </div>
              <div className={`pt-4 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'} grid grid-cols-3 gap-2 text-center`}>
                <div><p className="text-[10px] text-text-muted">Gastos fijos</p><p className="text-sm font-bold text-text-primary"><AnimatedNumber value={s.fixed} format={fmt} /></p></div>
                <div><p className="text-[10px] text-text-muted">Día a día</p><p className="text-sm font-bold text-text-primary"><AnimatedNumber value={s.variable} format={fmt} /></p></div>
                <div><p className="text-[10px] text-text-muted">Promedio diario</p><p className="text-sm font-bold text-text-primary"><AnimatedNumber value={s.avgDaily} format={fmt} /></p></div>
              </div>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
