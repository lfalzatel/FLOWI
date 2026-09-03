'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Target, Wallet, AlertTriangle, TrendingUp, Sparkles, 
  Plus, Edit3, Check, PieChart, ShieldAlert, CheckCircle2, ChevronRight,
  Download, BookOpen, ShieldCheck
} from 'lucide-react';
import { 
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';

import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { ExportReportModal } from '@/components/forms/ExportReportModal';
import { ManageBudgetModal } from '@/components/forms/ManageBudgetModal';
import { CategoryBudgets } from '@/components/dashboard/CategoryBudgets';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { getUserTransactions, Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { getLocalDateString, getLocalMonthString, getISOWeekString } from '@/lib/dateUtils';

export default function PresupuestosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Estados de filtro de fecha (idéntico al Dashboard)
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day'>('month');
  const [filterValue, setFilterValue] = useState(() => getLocalMonthString(new Date()));

  // Cargar transacciones del usuario
  useEffect(() => {
    if (!profile || !user) return;
    const fetchTxs = async () => {
      try {
        setLoading(true);
        const txs = await getUserTransactions(user.uid);
        setAllTransactions(txs);
      } catch (error) {
        console.error("Error cargando transacciones para presupuestos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTxs();
  }, [profile, user]);

  // Filtrado de transacciones según el período seleccionado
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (filterType === 'all') return true;
      const d = t.date ? (typeof (t.date as any).toDate === 'function' ? (t.date as any).toDate() : new Date(t.date as any)) : new Date();
      const dateStr = getLocalDateString(d);
      if (filterType === 'month') {
        return dateStr.startsWith(filterValue);
      } else if (filterType === 'week') {
        return getISOWeekString(d) === filterValue;
      } else {
        return dateStr === filterValue;
      }
    });
  }, [allTransactions, filterType, filterValue]);

  // Cálculo del total gastado en el periodo filtrado
  const totalSpentFiltered = useMemo(() => {
    return filteredTransactions
      .filter(t => t.type === 'gasto')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [filteredTransactions]);

  const globalBudget = profile?.budget || 0;
  const currency = profile?.currency || 'COP';
  const percentageSpent = globalBudget > 0 ? Math.min(Math.round((totalSpentFiltered / globalBudget) * 100), 100) : 0;
  const isOverGlobalBudget = globalBudget > 0 && totalSpentFiltered > globalBudget;
  const globalRemaining = globalBudget - totalSpentFiltered;

  // Datos para la Gráfica Circular de Distribución del Gasto
  const pieChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'gasto' && t.category) {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (t.amount || 0);
      }
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    if (total === 0) return [];

    const colors = [
      '#F5A623', '#3B82F6', '#10B981', '#EC4899', 
      '#8B5CF6', '#F59E0B', '#06B6D4', '#EF4444',
      '#14B8A6', '#6366F1', '#D97706', '#E11D48'
    ];

    return Object.entries(categoryTotals)
      .map(([name, value], idx) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Cálculo de días restantes en el mes para el presupuesto diario sugerido
  const daysInMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, []);

  const remainingDays = useMemo(() => {
    const now = new Date();
    return daysInMonth - now.getDate() + 1;
  }, [daysInMonth]);

  const dailyRecommendedBudget = useMemo(() => {
    if (globalRemaining <= 0 || remainingDays <= 0) return 0;
    return globalRemaining / remainingDays;
  }, [globalRemaining, remainingDays]);

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />

      <main className={`flex-1 max-w-3xl mx-auto w-full space-y-6 animate-fade-in-up p-4 pb-32 ${isTechTheme ? 'font-mono' : ''}`}>
        {/* Encabezado Responsivo */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => router.back()} 
              className={`p-2 -ml-1 rounded-xl transition-colors shrink-0 ${
                isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-secondary hover:bg-glass'
              }`}
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="min-w-0">
              <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider block ${
                isTechTheme ? 'text-accent/70' : 'text-text-muted'
              }`}>
                Servicios Financieros
              </span>
              <h1 className={`truncate ${
                isTechTheme ? 'font-bold text-base sm:text-lg text-accent uppercase tracking-wider' : 'font-syne font-bold text-base sm:text-xl text-text-primary'
              }`}>
                Centro de Presupuestos
              </h1>
            </div>
          </div>

          {/* Botón de Exportar (Reemplazando al botón superior de editar) */}
          <button
            onClick={() => setShowExportModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all shrink-0 ${
              isTechTheme
                ? 'bg-accent/10 border border-accent text-accent hover:bg-accent/20 font-mono uppercase'
                : 'glass-button text-accent rounded-xl hover:bg-accent/10'
            }`}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Reporte</span>
          </button>
        </div>

        {/* BARRA DE FILTROS TEMPORALES (Todas / Mes / Semana / Día + Selector de Día por Calendario) */}
        <DateFilter 
          filterType={filterType} 
          filterValue={filterValue} 
          onChangeType={setFilterType} 
          onChangeValue={setFilterValue}
          transactions={allTransactions}
        />

        {/* 1. TARJETA DE SALUD FINANCIERA GLOBAL */}
        <div className={`p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/40 bg-black/80' : 'rounded-3xl'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 flex items-center justify-center ${isTechTheme ? 'border border-accent/30 bg-accent/10' : 'rounded-xl bg-accent/20'}`}>
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>
                    Presupuesto Global
                  </h2>
                  {/* Botón sutil de lápiz para Editar Presupuesto */}
                  <button
                    onClick={() => setIsBudgetModalOpen(true)}
                    title="Editar Presupuesto Mensual"
                    className={`p-1.5 rounded-lg transition-all ${
                      isTechTheme 
                        ? 'text-accent hover:bg-accent/20 border border-accent/40' 
                        : 'text-text-muted hover:text-accent hover:bg-white/10'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                  Límite total proyectado para tus gastos
                </p>
              </div>
            </div>

            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
              isOverGlobalBudget
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : percentageSpent >= 80
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isOverGlobalBudget ? 'EXCEDIDO' : `${percentageSpent}% CONSUMIDO`}
            </span>
          </div>

          {/* Cifras Principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-accent/20' : 'bg-white/5 border-white/10'}`}>
              <span className={`text-[10px] uppercase font-semibold ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                {filterType === 'all' ? 'Gastado Histórico' : filterType === 'month' ? 'Gastado este mes' : filterType === 'week' ? 'Gastado esta semana' : 'Gastado este día'}
              </span>
              <p className={`text-lg font-bold mt-0.5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                {formatCurrency(totalSpentFiltered, currency)}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-accent/20' : 'bg-white/5 border-white/10'}`}>
              <span className={`text-[10px] uppercase font-semibold ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>Presupuesto Mensual</span>
              <p className={`text-lg font-bold mt-0.5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                {globalBudget > 0 ? formatCurrency(globalBudget, currency) : 'Sin asignar'}
              </p>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-accent/20' : 'bg-white/5 border-white/10'}`}>
              <span className={`text-[10px] uppercase font-semibold ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                {globalRemaining < 0 ? 'Exceso' : 'Restante Libre'}
              </span>
              <p className={`text-lg font-bold mt-0.5 ${
                globalRemaining < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {globalBudget > 0 ? formatCurrency(Math.abs(globalRemaining), currency) : '$0'}
              </p>
            </div>
          </div>

          {/* Barra de Progreso Global */}
          {globalBudget > 0 && (
            <div className="space-y-2 pt-2">
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    isOverGlobalBudget 
                      ? 'bg-red-500' 
                      : percentageSpent >= 80 
                        ? 'bg-yellow-500' 
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  Días restantes del mes: <strong>{remainingDays} días</strong>
                </span>
                {dailyRecommendedBudget > 0 && !isOverGlobalBudget && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Sugerido diario: {formatCurrency(dailyRecommendedBudget, currency)}/día
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 1.8 GRÁFICA CIRCULAR DE DISTRIBUCIÓN DEL GASTO */}
        {pieChartData.length > 0 && (
          <div className={`p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/40 bg-black/80' : 'rounded-3xl'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-400" />
                <h3 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>
                  Distribución del Gasto por Categoría
                </h3>
              </div>
              <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
                isTechTheme ? 'bg-purple-500/20 text-purple-400 font-mono border border-purple-500/40' : 'bg-purple-500/10 text-purple-400'
              }`}>
                {filterType === 'all' ? 'Histórico' : filterType === 'month' ? 'Del Mes' : filterType === 'week' ? 'De la Semana' : 'Del Día'}
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-1/2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke={isTechTheme ? '#000' : 'rgba(255,255,255,0.1)'} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: number) => formatCurrency(val, currency)}
                      contentStyle={{
                        backgroundColor: isTechTheme ? '#000' : '#1e1e24',
                        borderColor: isTechTheme ? '#f5a623' : 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#fff'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Leyenda de Categorías */}
              <div className="w-full md:w-1/2 space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
                {pieChartData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`font-semibold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">{item.percentage}%</span>
                      <strong className={isTechTheme ? 'text-accent font-mono' : 'text-text-primary'}>
                        {formatCurrency(item.value, currency)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. TARJETA DE DISTRIBUCIÓN DEL SALARIO & REGLAS ECONÓMICAS */}
        <div className={`p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/40 bg-black/80' : 'rounded-3xl'}`}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 flex items-center justify-center ${isTechTheme ? 'border border-cyan-500/30 bg-cyan-500/10' : 'rounded-xl bg-cyan-500/20'}`}>
              <BookOpen className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>
                ¿Cómo Repartir tu Salario? (Regla 50 / 30 / 20)
              </h2>
              <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                Fórmula dorada recomendada por economistas e instituciones financieras
              </p>
            </div>
          </div>

          <p className="text-xs text-text-muted leading-relaxed mb-4">
            Según los principales marcos de finanzas personales, la distribución idónea del ingreso mensual se divide en 3 pilares clave para garantizar estabilidad y crecimiento económico:
          </p>

          {/* Barra de Distribución 50 / 30 / 20 */}
          <div className="space-y-1.5 mb-5">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-white/10 p-0.5">
              <div className="h-full bg-blue-500 rounded-l-full w-[50%]" title="50% Necesidades" />
              <div className="h-full bg-amber-400 w-[30%]" title="30% Deseos" />
              <div className="h-full bg-emerald-400 rounded-r-full w-[20%]" title="20% Ahorro" />
            </div>
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-blue-400">50% Necesidades</span>
              <span className="text-amber-400">30% Deseos</span>
              <span className="text-emerald-400">20% Ahorro / Inversión</span>
            </div>
          </div>

          {/* Desglose de los 3 Pilares con Simulación de Montos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {/* Pilar 1: 50% Necesidades */}
            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-blue-500/30' : 'bg-blue-500/5 border-blue-500/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-blue-400 uppercase">50% Necesidades</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">Esenciales</span>
              </div>
              <p className="text-[11px] text-text-muted mb-2">
                Vivienda, mercado, servicios públicos, transporte, salud y deudas básicas.
              </p>
              {globalBudget > 0 && (
                <div className="pt-2 border-t border-blue-500/20">
                  <span className="text-[10px] text-text-muted block">Monto sugerido:</span>
                  <span className="text-sm font-bold text-blue-400">{formatCurrency(globalBudget * 0.50, currency)}</span>
                </div>
              )}
            </div>

            {/* Pilar 2: 30% Deseos */}
            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-amber-500/30' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-400 uppercase">30% Deseos</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">Estilo de Vida</span>
              </div>
              <p className="text-[11px] text-text-muted mb-2">
                Restaurantes, entretenimiento, hobbies, viajes, compras y gustos personales.
              </p>
              {globalBudget > 0 && (
                <div className="pt-2 border-t border-amber-500/20">
                  <span className="text-[10px] text-text-muted block">Monto sugerido:</span>
                  <span className="text-sm font-bold text-amber-400">{formatCurrency(globalBudget * 0.30, currency)}</span>
                </div>
              )}
            </div>

            {/* Pilar 3: 20% Ahorro e Inversión */}
            <div className={`p-3.5 rounded-2xl border ${isTechTheme ? 'bg-black/50 border-emerald-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-400 uppercase">20% Ahorro</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">Futuro</span>
              </div>
              <p className="text-[11px] text-text-muted mb-2">
                Fondo de emergencia (3-6 meses), inversiones, retiro y pago de capital.
              </p>
              {globalBudget > 0 && (
                <div className="pt-2 border-t border-emerald-500/20">
                  <span className="text-[10px] text-text-muted block">Monto sugerido:</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(globalBudget * 0.20, currency)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sección de Fuentes Económicas de Prestigio */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text-secondary uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Fuentes & Referencias Económicas Prestigiadas</span>
            </div>
            <ul className="text-[11px] text-text-muted space-y-1.5 pl-1">
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <strong className="text-text-primary">Harvard Law School / Elizabeth Warren:</strong>
                  <span className="block text-[10px] text-text-muted">Creadora de la norma 50/30/20 en el libro <em>"All Your Worth: The Ultimate Lifetime Money Plan"</em>.</span>
                </div>
              </li>
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <strong className="text-text-primary">Banco Interamericano de Desarrollo (BID):</strong>
                  <span className="block text-[10px] text-text-muted">Guías oficiales de Educación y Salud Financiera para hogares de Latinoamérica.</span>
                </div>
              </li>
              <li className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <div>
                  <strong className="text-text-primary">Investopedia & CFP Board:</strong>
                  <span className="block text-[10px] text-text-muted">Estándares internacionales de planificación de presupuestos personales.</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. PRESUPUESTOS POR CATEGORÍA COMPONENTE REUTILIZABLE CON SEMÁFORO */}
        <CategoryBudgets transactions={filteredTransactions} currency={currency} />

        {/* 4. ALERTAS E INSIGHTS INTELIGENTES DE AHORRO */}
        <div className={`p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/40 bg-black/80' : 'rounded-3xl'}`}>
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>
              Diagnóstico de Gastos e Inteligencia IA
            </h3>
          </div>

          <div className="space-y-3">
            {isOverGlobalBudget ? (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-400 uppercase">Alerta de Presupuesto Global Excedido</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Has superado tu límite mensual proyectado por {formatCurrency(Math.abs(globalRemaining), currency)}. Intenta moderar los gastos variables en los {remainingDays} días restantes.
                  </p>
                </div>
              </div>
            ) : percentageSpent >= 80 ? (
              <div className="p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-yellow-400 uppercase">Presupuesto al 80% de Capacidad</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Estás cerca de alcanzar tu límite mensual. Te recomendamos mantener tu gasto diario por debajo de {formatCurrency(dailyRecommendedBudget, currency)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase">Salud Financiera Estable</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Tus gastos se mantienen dentro del rango planificado para este período. Sigue así para cumplir tus metas de ahorro.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomNav />

      {/* Modal de edición de presupuesto global */}
      {isBudgetModalOpen && (
        <ManageBudgetModal onClose={() => setIsBudgetModalOpen(false)} />
      )}

      {/* Modal de exportación de reportes */}
      {showExportModal && (
        <ExportReportModal
          onClose={() => setShowExportModal(false)}
          title="Reporte de Presupuestos y Gastos"
          transactions={filteredTransactions}
          filterType={filterType}
          filterValue={filterValue}
        />
      )}
    </div>
  );
}
