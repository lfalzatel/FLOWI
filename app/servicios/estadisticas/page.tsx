'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Calendar, PieChart, Loader2, BarChart2, Flame, ArrowLeft, Download } from 'lucide-react';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { getUserTransactions, Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, Legend
} from 'recharts';
import { Header } from '@/components/layout/Header';

export default function EstadisticasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);

  // Filtros
  const [periodFilter, setPeriodFilter] = useState<'this_month' | 'last_month' | 'last_3m' | 'last_6m' | 'this_year' | 'all'>('last_6m');
  const [showExport, setShowExport] = useState(false);
  const [weeksAgo, setWeeksAgo] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'gasto' | 'ingreso'>('all');
  const [topOrder, setTopOrder] = useState<'amount' | 'frequency'>('amount');

  useEffect(() => {
    if (!profile || !user) return;
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Traemos TODAS las transacciones
        const txs = await getUserTransactions(user.uid);
        setAllTransactions(txs);
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profile, user]);

  // --- PROCESAMIENTO DE DATOS ---
  const data = useMemo(() => {
    if (!allTransactions.length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // 1. FILTRADO BASE
    const filteredTxs = allTransactions.filter(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();

      // Periodo
      let matchPeriod = true;
      if (periodFilter === 'this_month') matchPeriod = diffMonths === 0;
      else if (periodFilter === 'last_month') matchPeriod = diffMonths === 1;
      else if (periodFilter === 'last_3m') matchPeriod = diffMonths <= 3;
      else if (periodFilter === 'last_6m') matchPeriod = diffMonths <= 6;
      else if (periodFilter === 'this_year') matchPeriod = d.getFullYear() === currentYear;
      
      // Categoría
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      
      // Tipo
      const matchType = typeFilter === 'all' || t.type === typeFilter;

      return matchPeriod && matchCategory && matchType;
    });

    // 2. CÁLCULO DE MÉTRICAS RÁPIDAS
    let totalIncome = 0;
    let totalExpense = 0;
    filteredTxs.forEach(t => {
      if (t.type === 'ingreso') totalIncome += t.amount;
      else if (t.type === 'gasto') totalExpense += t.amount;
    });
    const netBalance = totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // 3. TOP CATEGORÍAS (Solo aplica si hay gastos o ingresos)
    const catMap = new Map<string, { amount: number, count: number }>();
    filteredTxs.forEach(t => {
      if (typeFilter !== 'ingreso' && t.type !== 'gasto') return; // Si filtramos por ingresos, no contamos gastos para el pie. Para simplificar, agrupamos lo que haya pasado el filtro.
      // Mejor: agrupar lo que haya pasado el filtro `typeFilter`.
      const current = catMap.get(t.category) || { amount: 0, count: 0 };
      catMap.set(t.category, { amount: current.amount + t.amount, count: current.count + 1 });
    });

    const topCategories = Array.from(catMap.entries())
      .map(([name, stats]) => ({ name, value: topOrder === 'amount' ? stats.amount : stats.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // 4. HISTÓRICO MENSUAL (Últimos X meses según filtro o por defecto)
    // Agrupar por mes (ej: "2024-05")
    const monthMap = new Map<string, { monthStr: string, ingreso: number, gasto: number, order: number }>();
    
    // Crear base para los meses relevantes si el periodo lo permite
    if (periodFilter === 'last_6m' || periodFilter === 'last_3m') {
      const numMonths = periodFilter === 'last_6m' ? 6 : 3;
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthStr = d.toLocaleString('es-ES', { month: 'short' });
        monthMap.set(key, { monthStr, ingreso: 0, gasto: 0, order: d.getTime() });
      }
    }

    filteredTxs.forEach(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStr = d.toLocaleString('es-ES', { month: 'short' });
      
      if (!monthMap.has(key)) {
        monthMap.set(key, { monthStr, ingreso: 0, gasto: 0, order: d.getTime() });
      }
      
      const current = monthMap.get(key)!;
      if (t.type === 'ingreso') current.ingreso += t.amount;
      else if (t.type === 'gasto') current.gasto += t.amount;
    });

    const monthlyHistory = Array.from(monthMap.values()).sort((a, b) => a.order - b.order);

    // 6. CÁLCULO DE RACHA (Streak)
    const uniqueDates = new Set<string>();
    allTransactions.forEach(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      uniqueDates.add(d.toDateString());
    });
    
    let streak = 0;
    let checkDate = new Date();
    if (!uniqueDates.has(checkDate.toDateString())) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    while (uniqueDates.has(checkDate.toDateString())) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    const allCategories = Array.from(new Set(allTransactions.map(t => t.category)));

    return { 
      totalIncome, totalExpense, netBalance, savingsRatio, 
      topCategories, monthlyHistory,
      streak, allCategories 
    };
  }, [allTransactions, periodFilter, categoryFilter, typeFilter, topOrder]);

  // --- HEATMAP WEEKLY LOGIC ---
  const weeklyHeatmapData = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); 
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);
    const startOfTargetWeek = new Date(startOfCurrentWeek);
    startOfTargetWeek.setDate(startOfTargetWeek.getDate() - (weeksAgo * 7));
    
    const endOfTargetWeek = new Date(startOfTargetWeek);
    endOfTargetWeek.setDate(endOfTargetWeek.getDate() + 6);
    endOfTargetWeek.setHours(23, 59, 59, 999);

    let filtered = allTransactions.filter(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      return d >= startOfTargetWeek && d <= endOfTargetWeek;
    });

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }

    const daysMap: Record<number, { day: string; total: number }> = {
      1: { day: 'Lu', total: 0 },
      2: { day: 'Ma', total: 0 },
      3: { day: 'Mi', total: 0 },
      4: { day: 'Ju', total: 0 },
      5: { day: 'Vi', total: 0 },
      6: { day: 'Sá', total: 0 },
      0: { day: 'Do', total: 0 },
    };

    filtered.forEach(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      const txDayOfWeek = d.getDay();
      daysMap[txDayOfWeek].total += t.amount;
    });

    const orderedDays = [
      daysMap[1], daysMap[2], daysMap[3], daysMap[4], daysMap[5], daysMap[6], daysMap[0]
    ];
    
    let maxTotal = 0;
    orderedDays.forEach(d => {
      if (d.total > maxTotal) maxTotal = d.total;
    });

    const formatDayMonth = (d: Date) => `${d.getDate()} ${d.toLocaleString('es-ES', {month:'short'})}`;
    const weekLabel = weeksAgo === 0 
      ? 'Esta Semana' 
      : weeksAgo === 1 
        ? 'Semana Pasada' 
        : `${formatDayMonth(startOfTargetWeek)} - ${formatDayMonth(endOfTargetWeek)}`;

    return { days: orderedDays, maxTotal, weekLabel };
  }, [allTransactions, weeksAgo, typeFilter, categoryFilter]);

  const COLORS = isTechTheme 
    ? ['#00FF9D', '#F97316', '#EAB308', '#3B82F6', '#EC4899', '#8B5CF6']
    : ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#14B8A6'];

  const getHeatmapColor = (total: number, maxTotal: number) => {
    if (maxTotal === 0 || total === 0) return isTechTheme ? 'bg-accent/5 border border-accent/20 text-accent/30' : 'bg-black/5 dark:bg-white/5 text-text-muted';
    const ratio = total / maxTotal;
    if (isTechTheme) {
      if (ratio > 0.7) return 'bg-orange-500/80 border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-white';
      if (ratio > 0.4) return 'bg-yellow-500/80 border border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)] text-white';
      return 'bg-accent/40 border border-accent/50 text-white';
    } else {
      if (ratio > 0.7) return 'bg-orange-500 text-white';
      if (ratio > 0.4) return 'bg-orange-400/80 text-white';
      return 'bg-emerald-500/80 text-white';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-deep w-full max-w-[100vw] overflow-x-hidden">
      <Header />
      
      {/* Botón de retroceso opcional para esta vista */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className={`w-10 h-10 flex items-center justify-center transition-all ${isTechTheme ? 'text-accent border border-accent/30 hover:bg-accent/10 rounded-none' : 'text-text-primary bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full'}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-lg font-bold ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'font-syne text-text-primary'}`}>
              Analítica
            </h1>
          </div>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold transition-all ${isTechTheme ? 'bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 font-mono uppercase' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-full'}`}
        >
          <Download className="w-4 h-4" />
          <span>Exportar</span>
        </button>
      </div>

      {/* BARRA DE FILTROS STICKY */}
      <div className={`sticky top-[72px] z-30 backdrop-blur-xl border-b ${isTechTheme ? 'bg-deep/90 border-accent/20' : 'glass-card border-none'}`}>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-wrap gap-2 px-4 py-3 justify-center">
          <select 
            value={periodFilter} 
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className={`px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${isTechTheme ? 'bg-[#051114] border border-accent text-accent font-mono uppercase' : 'bg-card border border-glass-border rounded-full text-text-primary'}`}
          >
            <option value="this_month" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Este mes</option>
            <option value="last_month" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Mes pasado</option>
            <option value="last_3m" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Últimos 3m</option>
            <option value="last_6m" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Últimos 6m</option>
            <option value="this_year" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Este año</option>
            <option value="all" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Todo</option>
          </select>
          
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className={`px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${isTechTheme ? 'bg-[#051114] border border-accent text-accent font-mono uppercase' : 'bg-card border border-glass-border rounded-full text-text-primary'}`}
          >
            <option value="all" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Todos (Ing. y Gst.)</option>
            <option value="gasto" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Solo Gastos</option>
            <option value="ingreso" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Solo Ingresos</option>
          </select>

          {data && (
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer ${isTechTheme ? 'bg-[#051114] border border-accent text-accent font-mono uppercase' : 'bg-card border border-glass-border rounded-full text-text-primary'}`}
            >
              <option value="all" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Todas las Categorías</option>
              {data.allCategories.map(c => (
                <option key={c} value={c} className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>{c}</option>
              ))}
            </select>
          )}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pb-24 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
            <p className={`text-sm ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>Calculando algoritmos...</p>
          </div>
        ) : !data ? (
           <div className="text-center py-20 opacity-50">
            <PieChart className="w-12 h-12 mx-auto mb-4" />
            <p>No hay suficientes datos para analizar.</p>
          </div>
        ) : (
          <div className="animate-fade-in-up stagger">
            
            {/* WIDGET 0: STREAK */}
            <div className={`p-4 mb-6 flex items-center justify-between ${isTechTheme ? 'border border-accent/30 bg-accent/10' : 'bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl text-white'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-full ${isTechTheme ? 'bg-accent/20' : 'bg-white/20'}`}>
                  <Flame className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-white'}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isTechTheme ? 'font-mono uppercase tracking-widest text-accent' : ''}`}>Racha Actual</h3>
                  <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/80' : 'text-white/80'}`}>Días seguidos registrando</p>
                </div>
              </div>
              <div className={`text-2xl font-black ${isTechTheme ? 'font-mono text-accent' : ''}`}>
                {data.streak} 🔥
              </div>
            </div>

            {/* WIDGET 1: 4 MÉTRICAS (CHIPS) */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'glass-card rounded-2xl'}`}>
                <p className={`text-xs mb-1 ${isTechTheme ? 'font-mono uppercase text-emerald-400' : 'text-emerald-500 font-semibold'}`}>Ingresos</p>
                <p className={`text-base font-bold ${isTechTheme ? 'font-mono text-emerald-400' : 'text-text-primary'}`}>{formatCurrency(data.totalIncome, profile?.currency)}</p>
              </div>
              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'glass-card rounded-2xl'}`}>
                <p className={`text-xs mb-1 ${isTechTheme ? 'font-mono uppercase text-orange-400' : 'text-orange-500 font-semibold'}`}>Gastos</p>
                <p className={`text-base font-bold ${isTechTheme ? 'font-mono text-orange-400' : 'text-text-primary'}`}>{formatCurrency(data.totalExpense, profile?.currency)}</p>
              </div>
              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'glass-card rounded-2xl'}`}>
                <p className={`text-xs mb-1 ${isTechTheme ? 'font-mono uppercase text-accent' : 'text-text-secondary font-semibold'}`}>Balance Neto</p>
                <p className={`text-base font-bold ${isTechTheme ? 'font-mono text-accent' : 'text-text-primary'}`}>{formatCurrency(data.netBalance, profile?.currency)}</p>
              </div>
              <div className={`p-4 ${isTechTheme ? 'border border-accent/20 bg-accent/5' : 'glass-card rounded-2xl'}`}>
                <p className={`text-xs mb-1 ${isTechTheme ? 'font-mono uppercase text-blue-400' : 'text-blue-500 font-semibold'}`}>Ahorro</p>
                <p className={`text-base font-bold ${isTechTheme ? 'font-mono text-blue-400' : 'text-text-primary'}`}>{data.savingsRatio.toFixed(1)}%</p>
              </div>
            </div>
            
            {/* WIDGET 2: DISTRIBUCIÓN POR CATEGORÍA (DONUT) */}
            <section className={`p-5 mb-6 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PieChart className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                  <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Distribución</h2>
                </div>
                <select 
                  value={topOrder} 
                  onChange={(e) => setTopOrder(e.target.value as any)}
                  className={`text-[10px] uppercase font-bold p-1 outline-none ${isTechTheme ? 'bg-[#051114] text-accent font-mono border border-accent/30' : 'bg-card border border-glass-border rounded text-text-secondary'}`}
                >
                  <option value="amount" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Por Monto</option>
                  <option value="frequency" className={isTechTheme ? "bg-[#051114]" : "bg-card text-text-primary"}>Por Frecuencia</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={data.topCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(val: number) => topOrder === 'amount' ? formatCurrency(val, profile?.currency) : `${val} txs`}
                      contentStyle={{ 
                        backgroundColor: isTechTheme ? '#051114' : '#fff', 
                        borderColor: isTechTheme ? '#00FF9D' : '#eee',
                        borderRadius: isTechTheme ? '0' : '12px',
                        color: isTechTheme ? '#00FF9D' : '#000',
                        fontFamily: isTechTheme ? 'monospace' : 'inherit'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value, entry, index) => (
                        <span className={`text-xs ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>{value}</span>
                      )}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* WIDGET 3: INGRESOS VS GASTOS (HISTÓRICO) */}
            <section className={`p-5 mb-6 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center gap-2 mb-6">
                <BarChart2 className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Histórico Mensual</h2>
              </div>
              
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isTechTheme ? 'rgba(0, 255, 157, 0.1)' : 'rgba(150,150,150,0.1)'} />
                    <XAxis 
                      dataKey="monthStr" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isTechTheme ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isTechTheme ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }}
                      tickFormatter={(val) => `$${(val / 1000)}k`}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: isTechTheme ? 'rgba(0, 255, 157, 0.1)' : 'rgba(0,0,0,0.05)' }}
                      contentStyle={{ 
                        backgroundColor: isTechTheme ? '#051114' : '#fff', 
                        borderColor: isTechTheme ? '#00FF9D' : '#eee',
                        borderRadius: isTechTheme ? '0' : '12px',
                        color: isTechTheme ? '#00FF9D' : '#000',
                        fontFamily: isTechTheme ? 'monospace' : 'inherit'
                      }}
                      formatter={(val: number) => formatCurrency(val, profile?.currency)}
                    />
                    {(typeFilter === 'all' || typeFilter === 'ingreso') && (
                      <Bar 
                        dataKey="ingreso" 
                        name="Ingresos"
                        fill={isTechTheme ? '#00FF9D' : '#10B981'} 
                        radius={isTechTheme ? 0 : [4, 4, 0, 0]} 
                      />
                    )}
                    {(typeFilter === 'all' || typeFilter === 'gasto') && (
                      <Bar 
                        dataKey="gasto" 
                        name="Gastos"
                        fill={isTechTheme ? '#f97316' : '#EF4444'} 
                        radius={isTechTheme ? 0 : [4, 4, 0, 0]} 
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* WIDGET 4: MAPA DE CALOR SEMANAL */}
            <section className={`p-5 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                  <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Mapa Semanal</h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setWeeksAgo(prev => prev + 1)}
                    className={`p-1 rounded transition-colors ${isTechTheme ? 'hover:bg-accent/20 text-accent' : 'hover:bg-black/10 text-text-primary'}`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className={`text-xs font-bold w-24 text-center ${isTechTheme ? 'font-mono text-accent' : 'text-text-primary'}`}>
                    {weeklyHeatmapData.weekLabel}
                  </span>
                  <button 
                    onClick={() => setWeeksAgo(prev => Math.max(0, prev - 1))}
                    disabled={weeksAgo === 0}
                    className={`p-1 rounded transition-colors ${weeksAgo === 0 ? 'opacity-30 cursor-not-allowed' : ''} ${isTechTheme ? 'hover:bg-accent/20 text-accent' : 'hover:bg-black/10 text-text-primary'}`}
                  >
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {weeklyHeatmapData.days.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{d.day}</span>
                    <div 
                      className={`w-full aspect-square rounded flex items-center justify-center transition-all duration-300 ${getHeatmapColor(d.total, weeklyHeatmapData.maxTotal)}`}
                      title={`Total: ${formatCurrency(d.total, profile?.currency)}`}
                    >
                      {d.total > 0 && (
                        <span className={`text-[9px] font-bold ${isTechTheme ? 'font-mono' : ''}`}>
                          ${d.total >= 1000 ? (d.total / 1000).toFixed(0) + 'k' : d.total}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </main>

      {showExport && (
        <ExportReportModal
          onClose={() => setShowExport(false)}
          title={`Reporte de Analítica`}
          transactions={allTransactions}
          filterType="all"
          filterValue=""
        />
      )}
      
      {/* NAVEGACIÓN INFERIOR */}
      <BottomNav />
    </div>
  );
}
