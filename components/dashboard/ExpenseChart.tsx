'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { getDateFromISOWeek } from '@/lib/dateUtils';

interface Props { 
  transactions: Transaction[];
  filterType?: 'all' | 'month' | 'week' | 'day';
  filterValue?: string;
}

function buildChartData(transactions: Transaction[], filterType: string = 'all', filterValue: string = '') {
  const grouped = new Map<string, { gastos: number, ingresos: number }>();

  // Pre-seed based on filter
  if (filterType === 'week' && filterValue) {
    const startOfWeek = getDateFromISOWeek(filterValue);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      grouped.set(d.toLocaleDateString('es-ES', { weekday: 'short' }), { gastos: 0, ingresos: 0 });
    }
  } else if (filterType === 'month' && filterValue) {
    const [y, m] = filterValue.split('-');
    const daysInMonth = new Date(parseInt(y), parseInt(m), 0).getDate();
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    for (let i = 1; i <= daysInMonth; i++) {
      d.setDate(i);
      grouped.set(`${i} ${d.toLocaleDateString('es-ES', { month: 'short' })}`, { gastos: 0, ingresos: 0 });
    }
  } else if (filterType === 'day' && filterValue) {
    for (let i = 0; i < 24; i++) {
      grouped.set(`${i.toString().padStart(2, '0')}:00`, { gastos: 0, ingresos: 0 });
    }
  }

  transactions.forEach(t => {
    const d = t.date instanceof Timestamp ? t.date.toDate() : new Date(t.date as any);
    let key = '';

    if (filterType === 'all') {
      key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    } else if (filterType === 'month') {
      key = d.getDate().toString() + ' ' + d.toLocaleDateString('es-ES', { month: 'short' });
    } else if (filterType === 'week') {
      key = d.toLocaleDateString('es-ES', { weekday: 'short' });
    } else if (filterType === 'day') {
      key = d.getHours().toString().padStart(2, '0') + ':00';
    } else {
      key = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }

    const current = grouped.get(key) || { gastos: 0, ingresos: 0 };
    if (t.type === 'gasto') current.gastos += t.amount;
    if (t.type === 'ingreso') current.ingresos += t.amount;
    grouped.set(key, current);
  });

  const result: any[] = [];
  grouped.forEach((value, key) => {
    result.push({ day: key, ...value });
  });

  if (filterType === 'all') {
     // Para "all", si no preseedeamos, necesitamos ordenar por fecha. 
     // Re-ordenamos si es 'all' (los demás ya están ordenados por pre-seed)
     // Un truco simple para "all" es ordenar el array final aunque las keys son complejas.
     // Es mejor pre-ordenar las transacciones y dejar que el Map mantenga el orden de inserción.
  }

  return result;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A2E]/95 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name === 'gastos' ? 'Gastos' : 'Ingresos'}: ${p.value.toLocaleString('es-MX')}
        </p>
      ))}
    </div>
  );
};

export function ExpenseChart({ transactions, filterType = 'all', filterValue = '' }: Props) {
  // If filterType is 'all', sort transactions so the Map insertion order is correct
  const sortedTransactions = filterType === 'all' 
    ? [...transactions].sort((a, b) => {
        const da = a.date instanceof Timestamp ? a.date.toDate().getTime() : new Date(a.date as any).getTime();
        const db = b.date instanceof Timestamp ? b.date.toDate().getTime() : new Date(b.date as any).getTime();
        return da - db;
      })
    : transactions;

  const data = buildChartData(sortedTransactions, filterType, filterValue);
  
  const titleMap = {
    'all': 'Historial',
    'month': 'Este mes',
    'week': 'Esta semana',
    'day': 'Hoy'
  };

  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-sm text-white">{titleMap[filterType] || 'Resumen'}</h3>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Gastos
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Ingresos
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#FF5B5B" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF5B5B" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ingresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00E5A0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00E5A0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                 axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
                 axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="gastos"   stroke="#FF5B5B" strokeWidth={2}
                fill="url(#gastos)"   dot={false} />
          <Area type="monotone" dataKey="ingresos" stroke="#00E5A0" strokeWidth={2}
                fill="url(#ingresos)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
