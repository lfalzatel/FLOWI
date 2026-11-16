'use client';
// Estadísticas del Resumen del mes: mapa semanal, racha, distribución por categoría e histórico.
// Todo sigue al mes elegido arriba y usa el mismo estilo de tarjeta que el resto del resumen.
import { useEffect, useMemo, useState } from 'react';
import { BarChart2, Calendar, ChevronLeft, ChevronRight, Flame, PieChart } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis,
} from 'recharts';
import type { Transaction } from '@/lib/firestore';
import { formatCompactCOP } from '@/lib/chartFormat';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';

type Resolver = (raw: string, type?: 'gasto' | 'ingreso') => { label: string; group: string };
const toDate = (d: Transaction['date']) => ((d as any)?.toDate ? (d as any).toDate() : new Date(d as any));
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function useStatsLook(isTech: boolean) {
  return {
    card: isTech ? 'glass-card' : 'glass-card rounded-3xl',
    title: `flex items-center gap-2 text-sm font-bold ${isTech ? 'text-accent uppercase' : 'text-text-primary'}`,
    select: `text-[10px] font-bold px-1.5 py-1 outline-none ${isTech ? 'bg-[#051114] text-accent font-mono border border-accent/30 uppercase' : 'bg-card border border-glass-border rounded-lg text-text-secondary'}`,
  };
}

/** Mapa semanal: lo gastado cada día de una semana del mes elegido (con flechas para cambiar de semana). */
export function WeeklyMap({ transactions, month, isTech, fmt }: { transactions: Transaction[]; month: string; isTech: boolean; fmt: (n: number) => string }) {
  const look = useStatsLook(isTech);
  const [weeksAgo, setWeeksAgo] = useState(0);
  useEffect(() => { setWeeksAgo(0); }, [month]);

  const w = useMemo(() => {
    // Semana de referencia: la de hoy si es el mes en curso; si no, la última semana de ese mes
    const now = new Date();
    const anchor = monthKey(now) === month ? now : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0);
    const dow = anchor.getDay();
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - (dow === 0 ? 6 : dow - 1) - weeksAgo * 7);
    const end = new Date(start); end.setDate(end.getDate() + 6); end.setHours(23, 59, 59, 999);
    const days = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map((day, i) => {
      const d = new Date(start); d.setDate(start.getDate() + i);
      return { day, date: d, total: 0 };
    });
    transactions.forEach(t => {
      if (t.type !== 'gasto') return;
      const d = toDate(t.date);
      if (d < start || d > end) return;
      days[(d.getDay() + 6) % 7].total += t.amount;
    });
    const max = Math.max(0, ...days.map(d => d.total));
    const short = (d: Date) => `${d.getDate()} ${d.toLocaleString('es-CO', { month: 'short' }).replace('.', '')}`;
    return { days, max, total: days.reduce((s, d) => s + d.total, 0), label: `${short(start)} – ${short(end)}`, isNow: monthKey(now) === month && weeksAgo === 0 };
  }, [transactions, month, weeksAgo]);

  const color = (total: number) => {
    if (!w.max || !total) return isTech ? 'bg-accent/5 border border-accent/20 text-accent/30' : 'bg-black/5 dark:bg-white/5 text-text-muted';
    const r = total / w.max;
    if (isTech) return r > 0.7 ? 'bg-orange-500/80 border border-orange-500 text-white' : r > 0.4 ? 'bg-yellow-500/80 border border-yellow-500 text-white' : 'bg-accent/40 border border-accent/50 text-white';
    return r > 0.7 ? 'bg-orange-500 text-white' : r > 0.4 ? 'bg-orange-400/80 text-white' : 'bg-emerald-500/80 text-white';
  };

  return (
    <section className={`${look.card} p-5`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className={look.title}><Calendar className="w-4 h-4 text-accent" /> Mapa semanal</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWeeksAgo(n => n + 1)} aria-label="Semana anterior" className="p-1 text-text-secondary hover:text-accent"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-[11px] font-semibold text-text-primary min-w-[6.5rem] text-center">{w.isNow ? 'Esta semana' : w.label}</span>
          <button type="button" onClick={() => setWeeksAgo(n => Math.max(0, n - 1))} disabled={weeksAgo === 0} aria-label="Semana siguiente" className="p-1 text-text-secondary hover:text-accent disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {w.days.map(d => (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase text-text-muted">{d.day}</span>
            <div className={`w-full aspect-square flex items-center justify-center transition-all duration-300 ${isTech ? 'rounded-none' : 'rounded-lg'} ${color(d.total)}`}
                 title={`${d.date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}: ${fmt(d.total)}`}>
              {d.total > 0 && <span className="text-[9px] font-bold">{d.total >= 1000 ? `${Math.round(d.total / 1000)}k` : d.total}</span>}
            </div>
            <span className="text-[9px] text-text-muted">{d.date.getDate()}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-text-muted">Gastaste <b className="text-text-primary">{fmt(w.total)}</b> en esta semana. Más oscuro = día de más gasto.</p>
    </section>
  );
}

/** Racha, distribución por categoría e histórico de los 6 meses que terminan en el mes elegido. */
export function MonthStats({ transactions, month, resolve, isTech, fmt, activeDays, firstActiveDay }: {
  transactions: Transaction[]; month: string; resolve: Resolver; isTech: boolean; fmt: (n: number) => string;
  activeDays?: number; firstActiveDay?: string;
}) {
  const look = useStatsLook(isTech);
  const [grouping, setGrouping] = useState<'categories' | 'subcategories'>('categories');
  const [order, setOrder] = useState<'amount' | 'frequency'>('amount');
  const COLORS = isTech ? ['#00FF9D', '#F97316', '#EAB308', '#3B82F6', '#EC4899', '#8B5CF6'] : ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];
  const tooltipStyle = {
    backgroundColor: isTech ? '#051114' : '#fff', borderColor: isTech ? '#00FF9D' : '#eee', borderRadius: isTech ? '0' : '12px',
    color: isTech ? '#00FF9D' : '#000', fontFamily: isTech ? 'monospace' : 'inherit',
  };

  const streak = useMemo(() => {
    const days = new Set(transactions.map(t => toDate(t.date).toDateString()));
    let n = 0;
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }, [transactions]);

  const distribution = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    transactions.forEach(t => {
      if (t.type !== 'gasto' || monthKey(toDate(t.date)) !== month) return;
      const r = resolve(t.category || '', 'gasto');
      const key = grouping === 'categories' ? r.group : r.label;
      const c = map.get(key) || { amount: 0, count: 0 };
      map.set(key, { amount: c.amount + t.amount, count: c.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, value: order === 'amount' ? s.amount : s.count }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [transactions, month, resolve, grouping, order]);

  const history = useMemo(() => {
    const y = Number(month.slice(0, 4)), m = Number(month.slice(5, 7)) - 1;
    const rows = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(y, m - 5 + i, 1);
      return { key: monthKey(d), monthStr: d.toLocaleString('es-CO', { month: 'short' }).replace('.', ''), ingreso: 0, gasto: 0 };
    });
    const byKey = new Map(rows.map(r => [r.key, r]));
    transactions.forEach(t => {
      const r = byKey.get(monthKey(toDate(t.date)));
      if (!r) return;
      if (t.type === 'ingreso') r.ingreso += t.amount; else if (t.type === 'gasto') r.gasto += t.amount;
    });
    return rows;
  }, [transactions, month]);

  return (
    <>
      {/* Racha y días usando FLOWI */}
      <section className={`${look.card} p-5 grid grid-cols-2 gap-4`}>
        <div>
          <h2 className={look.title}><Flame className="w-4 h-4 text-orange-500" /> Racha</h2>
          <p className={`mt-1 text-2xl font-black text-text-primary ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={streak} format={(n: number) => String(Math.round(n))} /> 🔥</p>
          <p className="text-[10px] text-text-muted leading-snug">Días seguidos con algo registrado</p>
        </div>
        {(activeDays ?? 0) > 0 && (
          <div>
            <h2 className={look.title}>📅 Días con FLOWI</h2>
            <p className={`mt-1 text-2xl font-black text-text-primary ${isTech ? '' : 'font-syne'}`}><AnimatedNumber value={activeDays || 0} format={(n: number) => String(Math.round(n))} /></p>
            <p className="text-[10px] text-text-muted leading-snug">
              {firstActiveDay ? `Desde el ${new Date(firstActiveDay + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Cada día que abres la app'}
            </p>
          </div>
        )}
      </section>

      {/* Distribución */}
      <section className={`${look.card} p-5`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className={look.title}><PieChart className="w-4 h-4 text-accent" /> Distribución</h2>
          <div className="flex items-center gap-1.5">
            <select value={grouping} onChange={e => setGrouping(e.target.value as any)} className={look.select} aria-label="Agrupar por">
              <option value="categories">Grupos</option>
              <option value="subcategories">Categorías</option>
            </select>
            <select value={order} onChange={e => setOrder(e.target.value as any)} className={look.select} aria-label="Ordenar por">
              <option value="amount">Por monto</option>
              <option value="frequency">Por veces</option>
            </select>
          </div>
        </div>
        {distribution.length ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie data={distribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(v: number) => (order === 'amount' ? fmt(v) : `${v} veces`)} contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={36} iconType="circle"
                        formatter={(value) => <span className={`text-xs ${isTech ? 'font-mono text-accent' : 'text-text-secondary'}`}>{value}</span>} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-sm text-text-secondary py-6 text-center">No hay gastos en este mes.</p>}
      </section>

      {/* Histórico */}
      <section className={`${look.card} p-5`}>
        <h2 className={`${look.title} mb-4`}><BarChart2 className="w-4 h-4 text-accent" /> Últimos 6 meses</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={history} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isTech ? 'rgba(0, 255, 157, 0.1)' : 'rgba(150,150,150,0.1)'} />
              <XAxis dataKey="monthStr" axisLine={false} tickLine={false} tick={{ fill: isTech ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: isTech ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }} width={44} tickFormatter={formatCompactCOP} />
              <RechartsTooltip cursor={{ fill: isTech ? 'rgba(0, 255, 157, 0.1)' : 'rgba(0,0,0,0.05)' }} contentStyle={tooltipStyle} formatter={(v: number) => fmt(v)} />
              <Bar dataKey="ingreso" maxBarSize={28} name="Ingresos" fill={isTech ? '#00FF9D' : '#10B981'} radius={isTech ? 0 : [4, 4, 0, 0]} />
              <Bar dataKey="gasto" maxBarSize={28} name="Gastos" fill={isTech ? '#f97316' : '#EF4444'} radius={isTech ? 0 : [4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
