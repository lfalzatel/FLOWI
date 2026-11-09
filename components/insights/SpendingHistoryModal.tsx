'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import type { Transaction } from '@/lib/firestore';
import { CategoryIcon } from '@/components/CategoryIcon';
import { findCatalogEntry } from '@/lib/categories';
import { formatCompactCOP } from '@/lib/chartFormat';
import { HistoryTarget, spendingHistory } from '@/lib/spendingInsights';

type Resolver = (raw: string, type?: 'gasto' | 'ingreso') => { label: string; group: string };
const RANGES = [{ n: 3, label: '3 meses' }, { n: 6, label: '6 meses' }, { n: 12, label: '12 meses' }, { n: 0, label: 'Todo' }];

const monthName = (k: string, long = false) => {
  const d = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1);
  const s = d.toLocaleDateString('es-CO', long ? { month: 'long', year: 'numeric' } : { month: 'short' }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Historial de una subcategoría de gasto hormiga o de una suscripción: gráfica por mes y lista
export function SpendingHistoryModal({ target, transactions, resolve, fmt, isTech, onClose, onEdit }: {
  target: HistoryTarget;
  transactions: Transaction[];
  resolve: Resolver;
  fmt: (n: number) => string;
  isTech: boolean;
  onClose: () => void;
  onEdit?: (t: Transaction) => void;
}) {
  const all = useMemo(() => spendingHistory(transactions, resolve, target), [transactions, resolve, target]);
  const [range, setRange] = useState(6);
  const [selected, setSelected] = useState<string | null>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const months = range ? all.slice(-range) : all;
  const current = all[all.length - 1];
  const previous = all[all.length - 2];
  const closed = months.filter(m => m !== current); // meses ya terminados del rango
  const average = closed.length ? closed.reduce((a, m) => a + m.total, 0) / closed.length : 0;
  const trend = previous && previous.total > 0 ? (current.total - previous.total) / previous.total : null;
  const rangeTotal = months.reduce((a, m) => a + m.total, 0);
  const c = findCatalogEntry(target.category) || findCatalogEntry(target.label) || { label: target.label, icon: '💡', color: '#F59E0B' };
  const accent = target.kind === 'sub' ? '#F43F5E' : '#F59E0B';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const pick = (k: string) => {
    setSelected(s => (s === k ? null : k));
    setTimeout(() => monthRefs.current[k]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const listMonths = (selected ? months.filter(m => m.month === selected) : months).filter(m => m.items.length).slice().reverse();
  const box = isTech ? 'rounded-none' : 'rounded-2xl';

  return createPortal(
    <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
           className={`relative w-full sm:max-w-lg bg-deep border border-glass-border max-h-[92vh] flex flex-col ${isTech ? 'rounded-none font-mono' : 'rounded-t-3xl sm:rounded-3xl'}`}>
        {/* Encabezado */}
        <div className="flex items-center gap-3 p-5 pb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}18` }}>
            <CategoryIcon icon={c.icon} label={c.label} className="w-5 h-5 text-lg" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold font-syne text-text-primary truncate">{target.label}</h3>
            <p className="text-[11px] text-text-muted">{target.kind === 'sub' ? 'Historial de cobros' : 'Todo lo que has gastado en esto, mes a mes'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="w-8 h-8 rounded-full hover:bg-glass flex items-center justify-center">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 space-y-4" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          {!all.length ? (
            <p className="text-sm text-text-secondary py-6 text-center">Todavía no hay gastos registrados aquí.</p>
          ) : (
            <>
              {/* Datos rápidos */}
              <div className="grid grid-cols-3 gap-2">
                <div className={`glass-card p-3 ${box}`}>
                  <p className="text-[10px] text-text-muted">Este mes</p>
                  <p className="text-sm font-bold text-text-primary truncate">{fmt(current.total)}</p>
                  {trend !== null && Math.round(trend * 100) === 0 && (
                    <p className="text-[10px] text-text-muted">Igual que el anterior</p>
                  )}
                  {trend !== null && Math.round(trend * 100) !== 0 && (
                    <p className={`text-[10px] flex items-center gap-0.5 ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(Math.round(trend * 100))}% vs. el anterior
                    </p>
                  )}
                </div>
                <div className={`glass-card p-3 ${box}`}>
                  <p className="text-[10px] text-text-muted">Mes pasado</p>
                  <p className="text-sm font-bold text-text-primary truncate">{previous ? fmt(previous.total) : '—'}</p>
                </div>
                <div className={`glass-card p-3 ${box}`}>
                  <p className="text-[10px] text-text-muted">Promedio al mes</p>
                  <p className="text-sm font-bold text-text-primary truncate">{closed.length ? fmt(average) : '—'}</p>
                </div>
              </div>

              {/* Rango */}
              <div className="flex gap-1.5">
                {RANGES.map(r => (
                  <button key={r.n} type="button" onClick={() => { setRange(r.n); setSelected(null); }}
                          className={`flex-1 py-1.5 text-[11px] font-semibold border transition-colors ${box} ${range === r.n ? 'border-accent bg-accent/10 text-accent' : 'border-glass-border text-text-secondary hover:bg-glass'}`}>
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Gráfica por mes */}
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={months.map(m => ({ month: m.month, label: monthName(m.month), total: m.total }))} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis tickFormatter={(v) => formatCompactCOP(v)} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={48} />
                    <Tooltip cursor={{ fill: 'var(--glass)' }}
                             content={({ active, payload }) => active && payload?.length ? (
                               <div className="glass-card rounded-xl px-3 py-2 text-xs">
                                 <p className="text-text-muted">{monthName(String(payload[0].payload.month), true)}</p>
                                 <p className="font-bold text-text-primary">{fmt(Number(payload[0].value))}</p>
                               </div>
                             ) : null} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={28} onClick={(d: any) => pick(d.month)} style={{ cursor: 'pointer' }}>
                      {months.map(m => (
                        <Cell key={m.month} fill={accent}
                              fillOpacity={selected ? (selected === m.month ? 1 : 0.3) : m === current ? 1 : 0.6} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-text-muted text-center">
                  {range ? `Últimos ${months.length} meses` : 'Desde tu primer registro'}: {fmt(rangeTotal)} · Toca una barra para ver ese mes
                </p>
              </div>

              {/* Lista por mes */}
              <div className="space-y-4">
                {selected && (
                  <button type="button" onClick={() => setSelected(null)} className="text-[11px] text-accent underline">Ver todos los meses</button>
                )}
                {listMonths.length === 0 && <p className="text-xs text-text-muted text-center">Sin gastos en este mes.</p>}
                {listMonths.map(m => (
                  <div key={m.month} ref={el => { monthRefs.current[m.month] = el; }} className="space-y-1.5 scroll-mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">{monthName(m.month, true)}</p>
                      <p className="text-xs font-bold text-text-primary">{fmt(m.total)} · {m.items.length} {m.items.length === 1 ? 'compra' : 'compras'}</p>
                    </div>
                    {m.items.map((it, i) => {
                      const tx = it.id ? transactions.find(t => t.id === it.id) : undefined;
                      return (
                        <button key={it.id || i} type="button" disabled={!tx || !onEdit} onClick={() => tx && onEdit?.(tx)}
                                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left glass-card ${box} ${tx && onEdit ? 'hover:bg-glass-hover' : ''}`}>
                          <div className="min-w-0">
                            <p className="text-[13px] text-text-primary truncate">{it.description || target.label}</p>
                            <p className="text-[10px] text-text-muted">
                              {it.date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                              {target.kind === 'ant' && !it.small ? ' · compra grande' : ''}
                            </p>
                          </div>
                          <p className="text-[13px] font-bold text-[var(--red)] shrink-0">-{fmt(it.amount)}</p>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
