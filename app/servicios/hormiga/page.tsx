'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug, ChevronLeft, ChevronRight, Lightbulb, Repeat } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useCategories } from '@/hooks/useCategories';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { DateFilter, FilterType } from '@/components/dashboard/DateFilter';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SpendingHistoryModal } from '@/components/insights/SpendingHistoryModal';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { createCategoryResolver } from '@/lib/categoryGroups';
import { findCatalogEntry } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { getISOWeekString, getLocalDateString, getLocalMonthString } from '@/lib/dateUtils';
import type { Transaction } from '@/lib/firestore';
import {
  ANT_MAX_AMOUNT, HistoryTarget, detectAntExpenses, detectSubscriptions, insightsInPeriod, subscriptionsMonthly,
} from '@/lib/spendingInsights';

const shortDate = (d: Date) => d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });

export default function HormigaPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { allCategories } = useCategories();
  const resolve = useMemo(() => createCategoryResolver(allCategories), [allCategories]);
  const currency = profile?.currency || 'COP';
  const fmt = (n: number) => formatCurrency(Math.round(n), currency);
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  // "Todo" muestra el promedio al mes; Mes / Semana / Día, lo que de verdad se gastó en ese periodo
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterValue, setFilterValue] = useState(getLocalMonthString());
  const [target, setTarget] = useState<HistoryTarget | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const subs = useMemo(() => detectSubscriptions(transactions, resolve), [transactions, resolve]);
  const ant = useMemo(() => detectAntExpenses(transactions, resolve), [transactions, resolve]);
  const period = useMemo(() => {
    if (filterType === 'all') return null;
    const inPeriod = (d: Date) => {
      const s = getLocalDateString(d);
      if (filterType === 'month') return s.startsWith(filterValue);
      if (filterType === 'week') return getISOWeekString(d) === filterValue;
      return s === filterValue;
    };
    return insightsInPeriod(transactions, resolve, inPeriod);
  }, [transactions, resolve, filterType, filterValue]);

  const subsMonthly = subscriptionsMonthly(subs);
  const activeSubs = subs.filter(s => s.active);
  const oldSubs = subs.filter(s => !s.active);
  const top = ant.groups[0];
  const maxAnt = (period ? period.ants[0]?.total : top?.monthly) || 1;
  const periodName = filterType === 'month' ? 'este mes' : filterType === 'week' ? 'esta semana' : 'este día';

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const icon = (label: string) => findCatalogEntry(label) || { label, icon: '💡', color: '#6B7280' };
  const row = `w-full flex items-center gap-3 text-left rounded-2xl -mx-2 px-2 py-1.5 hover:bg-glass transition-colors`;

  const subRow = (key: string, name: string, category: string, sub: string, amount: number) => {
    const c = icon(category);
    return (
      <li key={key}>
        <button type="button" onClick={() => setTarget({ kind: 'sub', key, label: name, category })} className={row}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
            <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
            <p className="text-[11px] text-text-muted truncate">{sub}</p>
          </div>
          <p className="text-sm font-bold text-text-primary">{fmt(amount)}</p>
          <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
        </button>
      </li>
    );
  };

  const antRow = (key: string, label: string, sub: string, amount: number, unit: string | null) => {
    const c = icon(label);
    return (
      <li key={key}>
        <button type="button" onClick={() => setTarget({ kind: 'ant', key, label, category: label })} className={`${row} flex-col !items-stretch !gap-1.5`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
              <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{label}</p>
              <p className="text-[11px] text-text-muted truncate">{sub}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-text-primary">{fmt(amount)}</p>
              {unit && <p className="text-[10px] text-text-muted">{unit}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
          </div>
          <div className="h-1.5 rounded-full bg-glass overflow-hidden ml-12 mr-6">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, (amount / maxAnt) * 100)}%` }} />
          </div>
        </button>
      </li>
    );
  };

  const head = (Icon: typeof Repeat, tint: string, title: string) => (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tint}`}><Icon className="w-4 h-4" /></div>
      <h2 className={`font-bold text-text-primary ${isTech ? 'uppercase text-sm' : 'font-syne'}`}>{title}</h2>
    </div>
  );
  const tip = (text: string) => (
    <div className="flex gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
      <p className="text-xs text-text-secondary">{text}</p>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl lg:max-w-6xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label="Volver a Servicios" className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>Suscripciones y gastos hormiga</h1>
            <p className="text-xs text-text-muted">Lo pequeño que se repite y, sumado, pesa. Toca uno para ver su historial.</p>
          </div>
        </div>

        <DateFilter transactions={transactions} filterType={filterType} filterValue={filterValue}
                    onChangeType={setFilterType} onChangeValue={setFilterValue} />

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Suscripciones */}
            <section className={`${card} p-5 space-y-4 min-w-0`}>
              {head(Repeat, 'bg-rose-500/10 text-rose-500', 'Tus suscripciones')}
              {period ? (
                period.subs.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hubo cobros de suscripciones {periodName}.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-[11px] text-text-muted">Cobros de suscripciones {periodName}</p>
                      <p className={`text-2xl font-bold text-rose-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={period.subTotal} format={fmt} /></p>
                    </div>
                    <ul className="space-y-1">
                      {period.subs.map(s => subRow(s.key, s.name, s.category,
                        `${s.count === 1 ? 'Un cobro' : `${s.count} cobros`} · el último el ${shortDate(s.lastDate)}`, s.total))}
                    </ul>
                  </>
                )
              ) : activeSubs.length === 0 ? (
                <p className="text-sm text-text-secondary">No encontré suscripciones en tus gastos recientes. Cuando registres Netflix, Spotify, apps o juegos, aparecerán aquí.</p>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] text-text-muted">Las que se cobran cada mes te cuestan</p>
                    <p className={`text-2xl font-bold text-rose-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={subsMonthly} format={fmt} /> <span className="text-sm font-medium text-text-muted">al mes</span></p>
                    <p className="text-xs text-text-secondary">Son {fmt(subsMonthly * 12)} al año.</p>
                  </div>
                  <ul className="space-y-1">
                    {activeSubs.map(s => subRow(s.key, s.name, s.category,
                      s.monthly ? `Cada mes${s.nextDate ? ` · próximo cobro ~${shortDate(s.nextDate)}` : ''}` : `Un cobro el ${shortDate(s.lastDate)} · ¿es mensual?`,
                      s.lastAmount))}
                  </ul>
                  {oldSubs.length > 0 && (
                    <p className="text-[11px] text-text-muted">Sin cobros en más de 40 días: {oldSubs.map(s => s.name).join(', ')}.</p>
                  )}
                  {tip(`¿Todavía usas todas? Cancelar una de ${fmt(activeSubs[0].lastAmount)} te ahorra ${fmt(activeSubs[0].lastAmount * 12)} al año.`)}
                </>
              )}
            </section>

            {/* Gastos hormiga */}
            <section className={`${card} p-5 space-y-4 min-w-0`}>
              {head(Bug, 'bg-amber-500/10 text-amber-500', 'Gastos hormiga')}
              {period ? (
                period.ants.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hubo compras pequeñas de antojos, salidas o tienda {periodName}.</p>
                ) : (
                  <>
                    <div>
                      <p className="text-[11px] text-text-muted">Compras de menos de {fmt(ANT_MAX_AMOUNT)} {periodName}</p>
                      <p className={`text-2xl font-bold text-amber-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={period.antTotal} format={fmt} /></p>
                    </div>
                    <ul className="space-y-2">
                      {period.ants.map(g => antRow(g.key, g.label,
                        `${g.count} ${g.count === 1 ? 'vez' : 'veces'} · ${fmt(g.average)} cada una${g.examples.length ? ` · ${g.examples.join(', ')}` : ''}`,
                        g.total, null))}
                    </ul>
                  </>
                )
              ) : ant.groups.length === 0 ? (
                <p className="text-sm text-text-secondary">No veo compras pequeñas que se repitan. ¡Bien! Aquí aparecerán el tinto, el mecato, los domicilios o el parqueadero si se vuelven costumbre.</p>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] text-text-muted">Compras de menos de {fmt(ANT_MAX_AMOUNT)} que se repiten</p>
                    <p className={`text-2xl font-bold text-amber-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={ant.monthly} format={fmt} /> <span className="text-sm font-medium text-text-muted">al mes</span></p>
                    <p className="text-xs text-text-secondary">A este ritmo son {fmt(ant.yearly)} al año. Promedio de los últimos {ant.days} días.</p>
                  </div>
                  <ul className="space-y-2">
                    {ant.groups.map(g => antRow(g.key, g.label,
                      `${g.count} veces · ${fmt(g.average)} cada una${g.examples.length ? ` · ${g.examples.join(', ')}` : ''}`,
                      g.monthly, 'al mes'))}
                  </ul>
                  {top && tip(`Si gastas la mitad en ${top.label.toLowerCase()}, te quedan ${fmt(top.monthly / 2)} más cada mes: ${fmt(top.yearly / 2)} al año para tus metas.`)}
                </>
              )}
            </section>
          </div>
        )}

        <p className="text-[11px] text-text-muted text-center">
          Se calcula con lo que registras: las suscripciones salen de sus categorías (Netflix, Spotify, apps…) y los gastos hormiga de compras pequeñas de antojos, salidas, tienda o parqueadero.
        </p>
      </main>
      <BottomNav />

      {/* Al editar una compra se oculta el historial (la ventana de edición queda debajo) y vuelve al cerrar */}
      {target && !editing && (
        <SpendingHistoryModal target={target} transactions={transactions} resolve={resolve} fmt={fmt} isTech={isTech}
                              onClose={() => setTarget(null)} onEdit={(t) => setEditing(t)} />
      )}
      {editing && <AddExpenseModal transactionToEdit={editing} onClose={() => setEditing(null)} onSuccess={() => setEditing(null)} />}
    </div>
  );
}
