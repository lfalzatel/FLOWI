'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Calendar, PieChart, Activity, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { getUserTransactions, Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, AreaChart, Area
} from 'recharts';
import { check } from '@/components/CategoryIcon'; // Para obtener colores si es posible, aunque usaremos un color base del tema

export default function EstadisticasPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!profile) return;
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Traemos gastos. (Podríamos traer todo y filtrar, pero nos importan los gastos)
        const txs = await getUserTransactions(profile.uid, 'gasto');
        setTransactions(txs);
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [profile]);

  // --- PROCESAMIENTO DE DATOS ---
  const data = useMemo(() => {
    if (!transactions.length) return null;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // 1. TOP 5 CATEGORÍAS DEL AÑO
    const catMap = new Map<string, number>();
    // 2. MAPA DE CALOR SEMANAL (Todos los tiempos o del año)
    // 0 = Domingo, 1 = Lunes ... 6 = Sábado
    const daysMap = [
      { day: 'Dom', total: 0, count: 0 },
      { day: 'Lun', total: 0, count: 0 },
      { day: 'Mar', total: 0, count: 0 },
      { day: 'Mié', total: 0, count: 0 },
      { day: 'Jue', total: 0, count: 0 },
      { day: 'Vie', total: 0, count: 0 },
      { day: 'Sáb', total: 0, count: 0 },
    ];

    // 3. COMPARATIVA MES VS MES ANTERIOR (Acumulado)
    const currentMonthDays = new Array(31).fill(0);
    const prevMonthDays = new Array(31).fill(0);

    transactions.forEach(t => {
      const d = (t.date as any).toDate ? (t.date as any).toDate() : new Date(t.date as any);
      const txYear = d.getFullYear();
      const txMonth = d.getMonth();
      const txDate = d.getDate(); // 1-31
      const txDayOfWeek = d.getDay(); // 0-6

      // Para Top 5 (Solo año actual)
      if (txYear === currentYear) {
        catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
      }

      // Para Heatmap (Todo el histórico)
      daysMap[txDayOfWeek].total += t.amount;
      daysMap[txDayOfWeek].count += 1;

      // Para Mes actual vs anterior
      if (txYear === currentYear && txMonth === currentMonth) {
        currentMonthDays[txDate - 1] += t.amount;
      } else if (txYear === prevMonthYear && txMonth === prevMonth) {
        prevMonthDays[txDate - 1] += t.amount;
      }
    });

    // Construir Top 5
    const topCategories = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Construir Comparativa acumulada
    let currentAcc = 0;
    let prevAcc = 0;
    const currentMonthData = [];
    const todayDate = now.getDate();

    for (let i = 0; i < 31; i++) {
      prevAcc += prevMonthDays[i];
      // Para el mes actual, solo acumulamos hasta el día de hoy para que la gráfica no caiga a cero en el futuro
      if (i < todayDate) {
        currentAcc += currentMonthDays[i];
      }
      
      currentMonthData.push({
        day: i + 1,
        actual: i < todayDate ? currentAcc : null,
        anterior: prevAcc
      });
    }

    // Construir Heatmap (ordenar Lunes a Domingo)
    // Extraemos Domingo y lo ponemos al final
    const orderedDays = [
      daysMap[1], daysMap[2], daysMap[3], daysMap[4], daysMap[5], daysMap[6], daysMap[0]
    ];
    
    let maxAvg = 0;
    const heatmap = orderedDays.map(d => {
      const avg = d.count > 0 ? d.total / d.count : 0;
      if (avg > maxAvg) maxAvg = avg;
      return { day: d.day, avg };
    });

    return { topCategories, currentMonthData, heatmap, maxAvg };
  }, [transactions]);


  const getHeatmapColor = (avg: number, maxAvg: number) => {
    if (maxAvg === 0 || avg === 0) return isTechTheme ? 'bg-accent/5 border border-accent/20' : 'bg-black/5 dark:bg-white/5';
    const ratio = avg / maxAvg;
    
    if (isTechTheme) {
      if (ratio > 0.7) return 'bg-orange-500/80 border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
      if (ratio > 0.4) return 'bg-yellow-500/80 border border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
      return 'bg-accent/40 border border-accent/50';
    } else {
      if (ratio > 0.7) return 'bg-orange-500 text-white';
      if (ratio > 0.4) return 'bg-orange-400/80 text-white';
      return 'bg-emerald-500/80 text-white';
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-deep">
      {/* HEADER */}
      <header className={`sticky top-0 z-40 px-4 py-4 backdrop-blur-xl border-b ${isTechTheme ? 'bg-deep/90 border-accent/20' : 'bg-white/70 dark:bg-[#111111]/70 border-white/10 dark:border-white/5'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className={`w-10 h-10 flex items-center justify-center transition-all ${isTechTheme ? 'text-accent border border-accent/30 hover:bg-accent/10 rounded-none' : 'text-text-primary bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className={`text-lg font-bold ${isTechTheme ? 'font-mono text-accent uppercase tracking-widest' : 'font-syne text-text-primary'}`}>
                Estadísticas
              </h1>
              <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-secondary'}`}>
                Análisis profundo de tus gastos
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 pb-24 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-50">
            <Loader2 className={`w-8 h-8 animate-spin mb-4 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
            <p className={`text-sm ${isTechTheme ? 'font-mono text-accent' : 'text-text-secondary'}`}>Procesando miles de datos...</p>
          </div>
        ) : !data || data.topCategories.length === 0 ? (
          <div className="text-center py-20 opacity-50">
            <PieChart className="w-12 h-12 mx-auto mb-4" />
            <p>No hay suficientes datos para analizar.</p>
          </div>
        ) : (
          <div className="animate-fade-in-up stagger">
            
            {/* WIDGET 1: TOP 5 CATEGORÍAS */}
            <section className={`p-5 mb-6 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center gap-2 mb-6">
                <PieChart className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Top 5 Gastos (Este Año)</h2>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topCategories} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isTechTheme ? '#00FF9D' : '#888', fontSize: 12, fontFamily: isTechTheme ? 'monospace' : 'inherit' }}
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
                      formatter={(val: number) => [formatCurrency(val, profile?.currency), 'Gasto']}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={isTechTheme ? '#00FF9D' : '#10B981'} 
                      radius={isTechTheme ? 0 : [0, 8, 8, 0]} 
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>


            {/* WIDGET 2: MES ACTUAL VS ANTERIOR */}
            <section className={`p-5 mb-6 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Mes Actual vs Mes Anterior</h2>
              </div>
              <p className={`text-xs mb-4 ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-secondary'}`}>
                Acumulado día a día. Compara tu velocidad de gasto.
              </p>
              
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.currentMonthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isTechTheme ? '#00FF9D' : '#10B981'} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={isTechTheme ? '#00FF9D' : '#10B981'} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAnterior" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isTechTheme ? '#f97316' : '#9ca3af'} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={isTechTheme ? '#f97316' : '#9ca3af'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isTechTheme ? 'rgba(0, 255, 157, 0.1)' : 'rgba(150,150,150,0.1)'} />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isTechTheme ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }}
                      minTickGap={20}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: isTechTheme ? 'rgba(0,255,157,0.5)' : '#999', fontSize: 10 }}
                      tickFormatter={(val) => `$${(val / 1000)}k`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: isTechTheme ? '#051114' : '#fff', 
                        borderColor: isTechTheme ? '#00FF9D' : '#eee',
                        borderRadius: isTechTheme ? '0' : '12px',
                        color: isTechTheme ? '#00FF9D' : '#000',
                        fontFamily: isTechTheme ? 'monospace' : 'inherit'
                      }}
                      formatter={(val: number) => [formatCurrency(val, profile?.currency), '']}
                      labelFormatter={(label) => `Día ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="anterior" 
                      name="Mes Pasado" 
                      stroke={isTechTheme ? 'rgba(249,115,22,0.5)' : '#9ca3af'} 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1} 
                      fill="url(#colorAnterior)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="actual" 
                      name="Este Mes" 
                      stroke={isTechTheme ? '#00FF9D' : '#10B981'} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorActual)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* WIDGET 3: MAPA DE CALOR SEMANAL */}
            <section className={`p-5 ${isTechTheme ? 'border border-accent/20 bg-accent/5 rounded-none' : 'glass-card rounded-3xl'}`}>
              <div className="flex items-center gap-2 mb-6">
                <Calendar className={`w-5 h-5 ${isTechTheme ? 'text-accent' : 'text-emerald-500'}`} />
                <h2 className={`font-bold ${isTechTheme ? 'font-mono uppercase text-accent text-sm' : 'font-syne'}`}>Mapa de Calor Semanal</h2>
              </div>
              <p className={`text-xs mb-6 ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-secondary'}`}>
                Promedio de gasto por día de la semana. Colores intensos = Mayor gasto.
              </p>
              
              <div className="grid grid-cols-7 gap-2">
                {data.heatmap.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-2">
                    <span className={`text-[10px] font-semibold uppercase ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{d.day}</span>
                    <div 
                      className={`w-full aspect-square rounded flex items-center justify-center transition-all duration-500 hover:scale-110 ${getHeatmapColor(d.avg, data.maxAvg)}`}
                      title={`Promedio: ${formatCurrency(d.avg, profile?.currency)}`}
                    >
                      {d.avg > 0 && (
                        <span className="text-[9px] font-bold opacity-0 hover:opacity-100 transition-opacity">
                          ${(d.avg / 1000).toFixed(0)}k
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
    </div>
  );
}
