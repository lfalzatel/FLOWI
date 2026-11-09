'use client';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bug, ChevronLeft, Lightbulb, Repeat } from 'lucide-react';
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
import { formatCurrency } from '@/lib/format';
import { ANT_MAX_AMOUNT, detectAntExpenses, detectSubscriptions, subscriptionsMonthly } from '@/lib/spendingInsights';

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

  const subs = useMemo(() => detectSubscriptions(transactions, resolve), [transactions, resolve]);
  const ant = useMemo(() => detectAntExpenses(transactions, resolve), [transactions, resolve]);
  const subsMonthly = subscriptionsMonthly(subs);
  const activeSubs = subs.filter(s => s.active);
  const oldSubs = subs.filter(s => !s.active);
  const top = ant.groups[0];
  const maxAnt = top?.monthly || 1;

  const card = isTech ? 'bg-glass border border-accent/25 rounded-none' : 'glass-card rounded-3xl';
  const icon = (label: string) => findCatalogEntry(label) || { label, icon: '💡', color: '#6B7280' };

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
            <p className="text-xs text-text-muted">Lo pequeño que se repite y, sumado, pesa</p>
          </div>
        </div>

        {loadingTransactions ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* Suscripciones */}
            <section className={`${card} p-5 space-y-4 min-w-0`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Repeat className="w-4 h-4 text-rose-500" /></div>
                <h2 className={`font-bold text-text-primary ${isTech ? 'uppercase text-sm' : 'font-syne'}`}>Tus suscripciones</h2>
              </div>
              {activeSubs.length === 0 ? (
                <p className="text-sm text-text-secondary">No encontré suscripciones en tus gastos recientes. Cuando registres Netflix, Spotify, apps o juegos, aparecerán aquí.</p>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] text-text-muted">Las que se cobran cada mes te cuestan</p>
                    <p className={`text-2xl font-bold text-rose-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={subsMonthly} format={fmt} /> <span className="text-sm font-medium text-text-muted">al mes</span></p>
                    <p className="text-xs text-text-secondary">Son {fmt(subsMonthly * 12)} al año.</p>
                  </div>
                  <ul className="space-y-2">
                    {activeSubs.map(s => {
                      const c = icon(s.category);
                      return (
                        <li key={s.key} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
                            <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">{s.name}</p>
                            <p className="text-[11px] text-text-muted truncate">
                              {s.monthly ? `Cada mes${s.nextDate ? ` · próximo cobro ~${shortDate(s.nextDate)}` : ''}` : `Un cobro el ${shortDate(s.lastDate)} · ¿es mensual?`}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-text-primary">{fmt(s.lastAmount)}</p>
                        </li>
                      );
                    })}
                  </ul>
                  {oldSubs.length > 0 && (
                    <p className="text-[11px] text-text-muted">Sin cobros en más de 40 días: {oldSubs.map(s => s.name).join(', ')}.</p>
                  )}
                  <div className="flex gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary">
                      ¿Todavía usas todas? Cancelar una de {fmt(activeSubs[0].lastAmount)} te ahorra {fmt(activeSubs[0].lastAmount * 12)} al año.
                    </p>
                  </div>
                </>
              )}
            </section>

            {/* Gastos hormiga */}
            <section className={`${card} p-5 space-y-4 min-w-0`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Bug className="w-4 h-4 text-amber-500" /></div>
                <h2 className={`font-bold text-text-primary ${isTech ? 'uppercase text-sm' : 'font-syne'}`}>Gastos hormiga</h2>
              </div>
              {ant.groups.length === 0 ? (
                <p className="text-sm text-text-secondary">No veo compras pequeñas que se repitan. ¡Bien! Aquí aparecerán el tinto, el mecato, los domicilios o el parqueadero si se vuelven costumbre.</p>
              ) : (
                <>
                  <div>
                    <p className="text-[11px] text-text-muted">Compras de menos de {fmt(ANT_MAX_AMOUNT)} que se repiten</p>
                    <p className={`text-2xl font-bold text-amber-500 ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={ant.monthly} format={fmt} /> <span className="text-sm font-medium text-text-muted">al mes</span></p>
                    <p className="text-xs text-text-secondary">A este ritmo son {fmt(ant.yearly)} al año. Promedio de los últimos {ant.days} días.</p>
                  </div>
                  <ul className="space-y-3">
                    {ant.groups.map(g => {
                      const c = icon(g.label);
                      return (
                        <li key={g.key} className="space-y-1.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
                              <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-text-primary truncate">{g.label}</p>
                              <p className="text-[11px] text-text-muted truncate">
                                {g.count} veces · {fmt(g.average)} cada una{g.examples.length ? ` · ${g.examples.join(', ')}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-text-primary">{fmt(g.monthly)}</p>
                              <p className="text-[10px] text-text-muted">al mes</p>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-glass overflow-hidden ml-12">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(4, (g.monthly / maxAnt) * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {top && (
                    <div className="flex gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-text-secondary">
                        Si gastas la mitad en {top.label.toLowerCase()}, te quedan {fmt(top.monthly / 2)} más cada mes: {fmt(top.yearly / 2)} al año para tus metas.
                      </p>
                    </div>
                  )}
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
    </div>
  );
}
