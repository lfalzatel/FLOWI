'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, LabelList, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Transaction, isFixedExpenseCategory } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { getDateFromISOWeek } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { formatCompactCOP, formatFullCOP, niceCeil } from '@/lib/chartFormat';

interface Props {
  transactions: Transaction[];
  filterType?: 'all' | 'month' | 'week' | 'day';
  filterValue?: string;
  type?: 'all' | 'gasto' | 'ingreso';
}

type View = 'acumulado' | 'detalle';

const GASTO_COLOR = '#FF5B5B';
const INGRESO_COLOR = '#00E5A0';
const VIEW_KEY = 'flowi_chart_view';

interface Bucket {
  key: string;
  label: string;
  start: Date;
  gastosVar: number;
  gastosFijos: number;
  ingresos: number;
}

function toDate(value: Transaction['date']): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const dateStr = value as string;
    if (dateStr.includes('T')) return new Date(dateStr);
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }
  return new Date(value as any);
}

const weekLabel = (d: Date) => `${d.toLocaleDateString('es-ES', { weekday: 'short' })} ${d.getDate()}`;
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

function bucketKeyOf(d: Date, filterType: string): string {
  if (filterType === 'month') return d.getDate().toString();
  if (filterType === 'week') return weekLabel(d);
  if (filterType === 'day') return d.getHours().toString();
  return monthKey(d);
}

// Agrupa por día (mes/semana), por hora (día) o por mes (historial), separando gastos fijos y variables
function buildBuckets(transactions: Transaction[], filterType: string, filterValue: string): Bucket[] {
  const buckets = new Map<string, Bucket>();
  const seed = (key: string, label: string, start: Date) =>
    buckets.set(key, { key, label, start, gastosVar: 0, gastosFijos: 0, ingresos: 0 });

  if (filterType === 'month' && filterValue) {
    const [y, m] = filterValue.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) seed(i.toString(), i.toString(), new Date(y, m - 1, i));
  } else if (filterType === 'week' && filterValue) {
    const startOfWeek = getDateFromISOWeek(filterValue);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      seed(weekLabel(d), weekLabel(d), d);
    }
  } else if (filterType === 'day' && filterValue) {
    const [y, m, day] = filterValue.split('-').map(Number);
    for (let h = 0; h < 24; h++) seed(h.toString(), `${h.toString().padStart(2, '0')}:00`, new Date(y, m - 1, day, h));
  } else {
    // Historial: todos los meses entre la primera y la última transacción, sin huecos
    const dates = transactions.map(t => toDate(t.date)).sort((a, b) => a.getTime() - b.getTime());
    if (dates.length) {
      const cursor = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1);
      const last = dates[dates.length - 1];
      while (cursor <= last) {
        seed(monthKey(cursor), cursor.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
  }

  transactions.forEach(t => {
    const bucket = buckets.get(bucketKeyOf(toDate(t.date), filterType));
    if (!bucket) return;
    if (t.type === 'ingreso') {
      bucket.ingresos += t.amount;
    } else if (t.type === 'gasto') {
      const fixed = t.isFixed ?? isFixedExpenseCategory(t.category);
      if (fixed) bucket.gastosFijos += t.amount;
      else bucket.gastosVar += t.amount;
    }
  });

  return Array.from(buckets.values());
}

// Tope del eje para que un día atípico (sueldo, arriendo) no aplaste a los demás
function computeCap(values: number[]): number | undefined {
  const nonZero = values.filter(v => v > 0).sort((a, b) => a - b);
  if (nonZero.length < 4) return undefined;
  const p85 = nonZero[Math.floor(0.85 * (nonZero.length - 1))];
  const max = nonZero[nonZero.length - 1];
  return max > p85 * 2.5 ? niceCeil(p85 * 1.6) : undefined;
}

const DetailTooltip = ({ active, payload, label, valueName }: any) => {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-card border border-glass-border rounded-xl px-3 py-2 shadow-xl normal-case">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      <p className="text-xs font-semibold text-text-primary">{valueName}: {formatFullCOP(row.raw)}</p>
      {row.fijos > 0 && <p className="text-[11px] text-text-secondary">Gastos fijos: {formatFullCOP(row.fijos)}</p>}
    </div>
  );
};

const CumulativeTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-glass-border rounded-xl px-3 py-2 shadow-xl normal-case">
      <p className="text-xs text-text-secondary mb-1">Hasta {label}</p>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <p key={p.dataKey} className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.dataKey === 'gastos' ? 'Gastos' : 'Ingresos'}: {formatFullCOP(p.value)}
        </p>
      ))}
    </div>
  );
};

const HistoryTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-glass-border rounded-xl px-3 py-2 shadow-xl normal-case">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.dataKey === 'gastos' ? 'Gastos' : 'Ingresos'}: {formatFullCOP(p.value)}
        </p>
      ))}
    </div>
  );
};

// Marca encima de las barras recortadas con su valor real
const ClippedLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">
      ↑{formatCompactCOP(value)}
    </text>
  );
};

export function ExpenseChart({ transactions, filterType = 'all', filterValue = '', type = 'all' }: Props) {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [view, setView] = useState<View>('acumulado');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'acumulado' || saved === 'detalle') setView(saved);
    } catch {
      // Sin almacenamiento: queda la vista por defecto
    }
  }, []);
  const changeView = (next: View) => {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch {}
  };

  const buckets = useMemo(() => buildBuckets(transactions, filterType, filterValue), [transactions, filterType, filterValue]);

  const showGastos = type === 'all' || type === 'gasto';
  const showIngresos = type === 'all' || type === 'ingreso';
  const isHistory = filterType === 'all';

  const totals = useMemo(() => buckets.reduce(
    (acc, b) => ({
      gastos: acc.gastos + b.gastosVar + b.gastosFijos,
      fijos: acc.fijos + b.gastosFijos,
      ingresos: acc.ingresos + b.ingresos,
    }),
    { gastos: 0, fijos: 0, ingresos: 0 }
  ), [buckets]);

  // Acumulado: la línea se detiene en el momento actual para no "aplanarse" en días futuros
  const cumulativeData = useMemo(() => {
    const now = new Date();
    let gastos = 0;
    let ingresos = 0;
    return buckets.map(b => {
      gastos += b.gastosVar + b.gastosFijos;
      ingresos += b.ingresos;
      const future = b.start > now;
      return { label: b.label, gastos: future ? null : gastos, ingresos: future ? null : ingresos };
    });
  }, [buckets]);

  // Detalle: gastos variables (o ingresos en la página de ingresos), con tope para días atípicos
  const detail = useMemo(() => {
    const values = buckets.map(b => (type === 'ingreso' ? b.ingresos : b.gastosVar));
    const cap = computeCap(values);
    const rows = buckets.map((b, i) => {
      const raw = values[i];
      const clipped = cap !== undefined && raw > cap;
      return {
        label: b.label,
        value: clipped ? cap : raw,
        raw,
        clippedValue: clipped ? raw : null,
        fijos: type === 'ingreso' ? 0 : b.gastosFijos,
      };
    });
    return { rows, cap };
  }, [buckets, type]);

  const historyData = useMemo(
    () => buckets.map(b => ({ label: b.label, gastos: b.gastosVar + b.gastosFijos, ingresos: b.ingresos })),
    [buckets]
  );

  const budget = filterType === 'month' && showGastos && profile?.budget ? profile.budget : 0;

  const titleMap = {
    'all': 'Historial',
    'month': 'Este mes',
    'week': 'Esta semana',
    'day': 'Hoy'
  };
  const detailLabel = filterType === 'day' ? 'Por hora' : 'Por día';
  const detailName = type === 'ingreso' ? 'Ingresos' : 'Gastos variables';

  const xAxisConfig = {
    'day': { angle: -90, height: 40, interval: 1 },
    'week': { angle: -25, height: 35, interval: 0 },
    'month': { angle: 0, height: 20, interval: 'preserveStartEnd' as const },
    'all': { angle: -25, height: 35, interval: 0 }
  }[filterType] || { angle: -25, height: 35, interval: 0 };

  const axisProps = {
    tick: { fill: 'var(--text-muted)', fontSize: 9 },
    axisLine: false,
    tickLine: false,
  };
  const xAxis = (
    <XAxis dataKey="label" {...axisProps}
           angle={xAxisConfig.angle}
           textAnchor={xAxisConfig.angle ? 'end' : 'middle'}
           height={xAxisConfig.height}
           interval={xAxisConfig.interval}
           minTickGap={4} />
  );
  const grid = <CartesianGrid vertical={false} stroke="var(--glass-border)" />;

  const legendItem = (color: string, label: string, value?: number) => (
    <span className="flex items-center gap-1 text-[10px] text-text-secondary normal-case">
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
      {label}{value !== undefined && <strong className="text-text-primary font-semibold">{formatCompactCOP(value)}</strong>}
    </span>
  );

  const toggleButton = (option: View, label: string) => (
    <button
      type="button"
      onClick={() => changeView(option)}
      aria-pressed={view === option}
      className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${isTechTheme ? 'rounded-none' : 'rounded-md'} ${
        view === option ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-syne font-bold text-sm text-text-primary">{titleMap[filterType] || 'Resumen'}</h3>
        {!isHistory && (
          <div className={`flex p-0.5 border border-glass-border ${isTechTheme ? 'rounded-none' : 'rounded-lg'}`}>
            {toggleButton('acumulado', 'Acumulado')}
            {toggleButton('detalle', detailLabel)}
          </div>
        )}
      </div>

      {/* Leyenda con totales del periodo (o nota de qué se excluye en el detalle) */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 min-h-[16px]">
        {(isHistory || view === 'acumulado') ? (
          <>
            {showGastos && legendItem(GASTO_COLOR, 'Gastos', totals.gastos)}
            {showIngresos && legendItem(INGRESO_COLOR, 'Ingresos', totals.ingresos)}
            {!isHistory && budget > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-text-secondary normal-case">
                <span className="w-3 border-t border-dashed border-text-secondary inline-block" />
                Presupuesto <strong className="text-text-primary font-semibold">{formatCompactCOP(budget)}</strong>
              </span>
            )}
          </>
        ) : (
          <>
            {legendItem(type === 'ingreso' ? INGRESO_COLOR : GASTO_COLOR, detailName)}
            {type !== 'ingreso' && totals.fijos > 0 && (
              <span className="text-[10px] text-text-muted normal-case">Fijos aparte: {formatCompactCOP(totals.fijos)}</span>
            )}
            {detail.cap !== undefined && (
              <span className="text-[10px] text-text-muted normal-case">↑ = día recortado, toca para ver</span>
            )}
          </>
        )}
      </div>

      <ResponsiveContainer width="100%" height={170}>
        {isHistory ? (
          <BarChart data={historyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} barGap={2}>
            {grid}
            {xAxis}
            <YAxis {...axisProps} width={44} tickFormatter={formatCompactCOP} />
            <Tooltip cursor={{ fill: 'var(--glass)' }} content={<HistoryTooltip />} />
            {showGastos && <Bar dataKey="gastos" fill={GASTO_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} />}
            {showIngresos && <Bar dataKey="ingresos" fill={INGRESO_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14} />}
          </BarChart>
        ) : view === 'acumulado' ? (
          <AreaChart data={cumulativeData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gastosAcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={GASTO_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={GASTO_COLOR} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ingresosAcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={INGRESO_COLOR} stopOpacity={0.2} />
                <stop offset="95%" stopColor={INGRESO_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            {grid}
            {xAxis}
            <YAxis {...axisProps} width={44} tickFormatter={formatCompactCOP} />
            <Tooltip content={<CumulativeTooltip />} />
            {budget > 0 && (
              <ReferenceLine y={budget} stroke="var(--text-secondary)" strokeDasharray="4 4" ifOverflow="extendDomain" />
            )}
            {showIngresos && (
              <Area type="stepAfter" dataKey="ingresos" stroke={INGRESO_COLOR} strokeWidth={2}
                    fill="url(#ingresosAcum)" dot={false} connectNulls={false} />
            )}
            {showGastos && (
              <Area type="monotone" dataKey="gastos" stroke={GASTO_COLOR} strokeWidth={2}
                    fill="url(#gastosAcum)" dot={false} connectNulls={false} />
            )}
          </AreaChart>
        ) : (
          <BarChart data={detail.rows} margin={{ top: 14, right: 0, left: 0, bottom: 0 }}>
            {grid}
            {xAxis}
            <YAxis {...axisProps} width={44} tickFormatter={formatCompactCOP}
                   domain={detail.cap !== undefined ? [0, detail.cap] : [0, 'auto']}
                   ticks={detail.cap !== undefined ? [0, detail.cap / 2, detail.cap] : undefined}
                   allowDataOverflow={detail.cap !== undefined} />
            <Tooltip cursor={{ fill: 'var(--glass)' }} content={<DetailTooltip valueName={detailName} />} />
            <Bar dataKey="value" fill={type === 'ingreso' ? INGRESO_COLOR : GASTO_COLOR} radius={[4, 4, 0, 0]} maxBarSize={14}>
              <LabelList dataKey="clippedValue" content={<ClippedLabel />} />
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
