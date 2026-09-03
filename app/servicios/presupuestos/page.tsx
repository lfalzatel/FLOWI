'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Target, Wallet, AlertTriangle, TrendingUp, Sparkles, 
  Plus, Edit3, Check, PieChart, ShieldAlert, CheckCircle2, ChevronRight 
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
