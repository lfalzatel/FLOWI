'use client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import { getDateFromISOWeek } from '@/lib/dateUtils';

interface Props { 
  transactions: Transaction[];
  filterType?: 'all' | 'month' | 'week' | 'day';
  filterValue?: string;
  type?: 'all' | 'gasto' | 'ingreso';
}

function buildChartData(transactions: Transaction[], filterType: string = 'all', filterValue: string = '') {
  const grouped = new Map<string, { gastos: number, ingresos: number }>();

  // Helper para generar una llave consistente de semana (ej: "lun 22")
  const getWeekKey = (date: Date) => {
    const weekday = date.toLocaleDateString('es-ES', { weekday: 'short' });
    const dayNum = date.getDate();
    return `${weekday} ${dayNum}`;
  };

  // Pre-seed based on filter
  if (filterType === 'week' && filterValue) {
    const startOfWeek = getDateFromISOWeek(filterValue);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      const key = getWeekKey(d);
      grouped.set(key, { gastos: 0, ingresos: 0 });
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
    // Obtener la fecha en el huso horario local de manera robusta
    const d = t.date instanceof Timestamp 
      ? t.date.toDate() 
      : (t.date instanceof Date ? t.date : new Date(t.date as any));
      
    let key = '';

    if (filterType === 'all') {
      key = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    } else if (filterType === 'month') {
      key = d.getDate().toString() + ' ' + d.toLocaleDateString('es-ES', { month: 'short' });
    } else if (filterType === 'week') {
      key = getWeekKey(d);
    } else if (filterType === 'day') {
      key = d.getHours().toString().padStart(2, '0') + ':00';
    } else {
      key = d.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }

    const current = grouped.get(key);
    if (current) {
      if (t.type === 'gasto') current.gastos += t.amount;
      if (t.type === 'ingreso') current.ingresos += t.amount;
      grouped.set(key, current);
    } else if (filterType === 'all' || filterType === 'month') {
      // Si no estaba pre-seed pero corresponde al filtro
      const newValue = { gastos: 0, ingresos: 0 };
      if (t.type === 'gasto') newValue.gastos += t.amount;
      if (t.type === 'ingreso') newValue.ingresos += t.amount;
      grouped.set(key, newValue);
    }
  });

  const result: any[] = [];
  grouped.forEach((value, key) => {
    result.push({ day: key, ...value });
  });

  return result;
}

const CustomTooltip = ({ active, payload, label, chartType = 'all' }: any) => {
  if (!active || !payload?.length) return null;
  
  // Filtrar payload según el tipo de gráfico
  const filteredPayload = payload.filter((p: any) => {
    if (chartType === 'gasto') return p.name === 'gastos';
    if (chartType === 'ingreso') return p.name === 'ingresos';
    return true;
  });

  if (filteredPayload.length === 0) return null;

  return (
    <div className="bg-card border border-glass-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-xs text-text-secondary mb-1">{label}</p>
      {filteredPayload.map((p: any) => (
        <p key={p.name} className="text-xs font-semibold" style={{ color: p.color }}>
          {p.name === 'gastos' ? 'Gastos' : 'Ingresos'}: ${p.value.toLocaleString('es-MX')}
        </p>
      ))}
    </div>
  );
};

export function ExpenseChart({ transactions, filterType = 'all', filterValue = '', type = 'all' }: Props) {
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

  const showGastos = type === 'all' || type === 'gasto';
  const showIngresos = type === 'all' || type === 'ingreso';

  return (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-syne font-bold text-sm text-text-primary">{titleMap[filterType] || 'Resumen'}</h3>
        <div className="flex items-center gap-3">
          {showGastos && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Gastos
            </span>
          )}
          {showIngresos && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Ingresos
            </span>
          )}
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
          <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                 axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={35} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
                 axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip chartType={type} />} />
          {showGastos && (
            <Area type="linear" dataKey="gastos"   stroke="#FF5B5B" strokeWidth={2}
                  fill="url(#gastos)"   dot={false} />
          )}
          {showIngresos && (
            <Area type="linear" dataKey="ingresos" stroke="#00E5A0" strokeWidth={2}
                  fill="url(#ingresos)" dot={false} />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

