'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Target, Wallet, AlertTriangle, TrendingUp, Sparkles, 
  Plus, Edit3, Check, PieChart, ShieldAlert, CheckCircle2, ChevronRight,
  BookOpen, ShieldCheck
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { getUserTransactions, Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { CategoryBudgets } from '@/components/dashboard/CategoryBudgets';
import { ManageBudgetModal } from '@/components/forms/ManageBudgetModal';

export default function PresupuestosPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { profile, user } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

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

  // Transacciones del mes actual
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return allTransactions.filter(t => {
      const date = t.date ? (typeof (t.date as any).toDate === 'function' ? (t.date as any).toDate() : new Date(t.date as any)) : new Date();
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });
  }, [allTransactions]);

  // Cálculo de totales del mes
  const totalSpentThisMonth = useMemo(() => {
    return currentMonthTransactions
      .filter(t => t.type === 'gasto')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [currentMonthTransactions]);

  const globalBudget = profile?.budget || 0;
  const currency = profile?.currency || 'COP';
  const percentageSpent = globalBudget > 0 ? Math.min(Math.round((totalSpentThisMonth / globalBudget) * 100), 100) : 0;
  const isOverGlobalBudget = globalBudget > 0 && totalSpentThisMonth > globalBudget;
  const globalRemaining = globalBudget - totalSpentThisMonth;

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
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()} 
              className={`p-2 -ml-2 rounded-xl transition-colors ${
                isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-secondary hover:bg-glass'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <span className={`text-xs font-medium uppercase tracking-wider ${
                isTechTheme ? 'text-accent/70' : 'text-text-muted'
              }`}>
                Servicios Financieros
              </span>
              <h1 className={`${
                isTechTheme ? 'font-bold text-2xl text-accent uppercase tracking-widest' : 'font-syne font-bold text-2xl text-text-primary'
              }`}>
                Centro de Presupuestos
              </h1>
            </div>
          </div>

          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-all shadow-md ${
              isTechTheme
                ? 'bg-accent text-black hover:bg-accent/80 uppercase'
                : 'bg-accent text-white rounded-xl hover:bg-accent/90 shadow-accent/20'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{globalBudget > 0 ? 'Editar Presupuesto' : 'Fichar Presupuesto'}</span>
          </button>
        </div>

        {/* 1. TARJETA DE SALUD FINANCIERA GLOBAL */}
        <div className={`p-5 sm:p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/40 bg-black/80' : 'rounded-3xl'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 flex items-center justify-center ${isTechTheme ? 'border border-accent/30 bg-accent/10' : 'rounded-xl bg-accent/20'}`}>
                <Target className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>
                  Presupuesto Global del Mes
                </h2>
                <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                  Límite total proyectado para todos tus gastos
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
              <span className={`text-[10px] uppercase font-semibold ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>Gastado este mes</span>
              <p className={`text-lg font-bold mt-0.5 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                {formatCurrency(totalSpentThisMonth, currency)}
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

        {/* 1.5 TARJETA DE DISTRIBUCIÓN DEL SALARIO & REGLAS ECONÓMICAS */}
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

        {/* 2. PRESUPUESTOS POR CATEGORÍA COMPONENTE REUTILIZABLE CON SEMÁFORO */}
        <CategoryBudgets transactions={currentMonthTransactions} currency={currency} />

        {/* 3. ALERTAS E INSIGHTS INTELIGENTES DE AHORRO */}
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
                    Tus gastos se mantienen dentro del rango planificado para este mes. Sigue así para cumplir tus metas de ahorro.
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
    </div>
  );
}
