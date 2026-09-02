'use client';

import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, CheckCircle2, Calculator, Calendar } from 'lucide-react';
import { Transaction, isFixedExpenseCategory } from '@/lib/firestore';

interface Props {
  filterType: string;
  filterValue: string;
  transactions: Transaction[];
}

export function BudgetProjection({ filterType, filterValue, transactions }: Props) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  if (filterType !== 'month') return null;

  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = filterValue === currentMonthValue;

  // Filtrar gastos e ingresos de las transacciones del período
  const gastosTx = transactions.filter(t => t.type === 'gasto');
  const ingresosTx = transactions.filter(t => t.type === 'ingreso');

  const totalIngresos = ingresosTx.reduce((sum, t) => sum + t.amount, 0);
  const baseLimit = totalIngresos > 0 ? totalIngresos : (profile?.budget || 0);

  // Clasificación de Gastos Fijos vs Variables
  const isFixedTx = (t: Transaction) => t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category);

  const gastosFijos = gastosTx.filter(t => isFixedTx(t)).reduce((sum, t) => sum + t.amount, 0);
  const gastosVariables = gastosTx.filter(t => !isFixedTx(t)).reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = gastosFijos + gastosVariables;

  // Dinero Libre disponible para gastos variables
  const disponibleParaGastar = baseLimit - totalGastos;

  // Cálculo de días restantes
  const [yearStr, monthStr] = (filterValue || currentMonthValue).split('-');
  const year = parseInt(yearStr, 10) || now.getFullYear();
  const month = parseInt(monthStr, 10) || (now.getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  const diasRestantes = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : 0;

  // Cuota Diaria Recomendada
  const cuotaDiaria = (isCurrentMonth && disponibleParaGastar > 0 && diasRestantes > 0)
    ? disponibleParaGastar / diasRestantes
    : 0;

  const isWarning = baseLimit > 0 && disponibleParaGastar < 0;

  return (
    <div className={`mt-4 p-5 animate-fade-in-up transition-all ${
      isTechTheme 
        ? 'border border-accent/30 rounded-none bg-black/40 font-mono' 
        : 'glass-card rounded-3xl shadow-sm border border-glass-border'
    }`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isWarning ? 'bg-orange-500/15 text-orange-400' : 'bg-accent/15 text-accent'
          }`}>
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs font-bold uppercase tracking-wider ${
              isTechTheme ? 'font-mono text-accent' : 'font-syne text-text-primary'
            }`}>
              {isCurrentMonth ? 'Control y Proyección Mensual' : 'Resumen del Mes'}
            </h4>
            <p className={`text-[11px] ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
              {totalIngresos > 0 
                ? `Base: Ingresos del mes (${formatCurrency(totalIngresos, profile?.currency)})` 
                : profile?.budget 
                  ? `Base: Presupuesto (${formatCurrency(profile.budget, profile?.currency)})` 
                  : 'Sin ingresos ni presupuesto configurado'
              }
            </p>
          </div>
        </div>

        {isCurrentMonth && (
          <div className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg ${
            isTechTheme ? 'bg-accent/10 border border-accent/20 text-accent' : 'bg-accent/10 text-accent'
          }`}>
            <Calendar className="w-3 h-3" />
            <span>Quedan {diasRestantes} días</span>
          </div>
        )}
      </div>

      {/* Grid de Métricas Principales */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        {/* Gastos Fijos */}
        <div className={`p-3 rounded-2xl ${
          isTechTheme ? 'bg-accent/5 border border-accent/20' : 'bg-white/5 border border-white/5'
        }`}>
          <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${
            isTechTheme ? 'text-accent/70' : 'text-text-muted'
          }`}>
            Gastos Fijos
          </span>
          <p className={`text-xs sm:text-sm font-bold truncate ${
            isTechTheme ? 'text-orange-400 font-mono' : 'text-orange-400 font-syne'
          }`}>
            {formatCurrency(gastosFijos, profile?.currency)}
          </p>
          <span className={`block text-[9px] mt-0.5 truncate ${
            isTechTheme ? 'text-accent/50' : 'text-text-muted'
          }`}>
            Obligaciones
          </span>
        </div>

        {/* Dinero Libre Disponible */}
        <div className={`p-3 rounded-2xl ${
          isTechTheme ? 'bg-accent/5 border border-accent/20' : 'bg-white/5 border border-white/5'
        }`}>
          <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${
            isTechTheme ? 'text-accent/70' : 'text-text-muted'
          }`}>
            Disponible Libre
          </span>
          <p className={`text-xs sm:text-sm font-bold truncate ${
            disponibleParaGastar < 0 
              ? 'text-red-400 font-syne' 
              : isTechTheme ? 'text-accent font-mono' : 'text-emerald-400 font-syne'
          }`}>
            {formatCurrency(disponibleParaGastar, profile?.currency)}
          </p>
          <span className={`block text-[9px] mt-0.5 truncate ${
            isTechTheme ? 'text-accent/50' : 'text-text-muted'
          }`}>
            {disponibleParaGastar >= 0 ? 'Para variables' : 'Sobrepasado'}
          </span>
        </div>

        {/* Límite Diario Recomendado */}
        <div className={`p-3 rounded-2xl ${
          isTechTheme ? 'bg-accent/10 border border-accent/40' : 'bg-accent/10 border border-accent/20'
        }`}>
          <span className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${
            isTechTheme ? 'text-accent' : 'text-accent'
          }`}>
            Límite Diario
          </span>
          <p className={`text-xs sm:text-sm font-bold truncate ${
            isTechTheme ? 'text-accent font-mono' : 'text-accent font-syne'
          }`}>
            {isCurrentMonth 
              ? formatCurrency(cuotaDiaria, profile?.currency) 
              : formatCurrency(baseLimit > 0 ? baseLimit / daysInMonth : 0, profile?.currency)
            }
          </p>
          <span className={`block text-[9px] mt-0.5 truncate ${
            isTechTheme ? 'text-accent/70' : 'text-accent/80'
          }`}>
            {isCurrentMonth ? '/ día restante' : '/ día prom.'}
          </span>
        </div>
      </div>

      {/* Banner Explicativo / Alerta */}
      <div className={`p-3.5 rounded-2xl flex items-start gap-2.5 ${
        isWarning 
          ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
          : baseLimit === 0 
            ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
      }`}>
        <div className="mt-0.5 flex-shrink-0">
          {isWarning ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <p className={`text-[12px] leading-relaxed ${isTechTheme ? 'font-mono' : ''}`}>
          {baseLimit === 0 ? (
            'Ingresa tus pagos del mes para habilitar el dinero libre disponible y tu presupuesto diario recomendado.'
          ) : isWarning ? (
            `Has superado tus ingresos/presupuesto del mes por ${formatCurrency(Math.abs(disponibleParaGastar), profile?.currency)}. Procura restringir tus nuevos gastos variables.`
          ) : isCurrentMonth ? (
            <>
              Te quedan <strong>{formatCurrency(disponibleParaGastar, profile?.currency)}</strong> libres. Para no superar tus ingresos, tu gasto máximo sugerido es de <strong>{formatCurrency(cuotaDiaria, profile?.currency)}/día</strong> durante los <strong>{diasRestantes} días restantes</strong> del mes.
            </>
          ) : (
            disponibleParaGastar >= 0 
              ? `Cerraste este mes con un remanente positivo de ${formatCurrency(disponibleParaGastar, profile?.currency)}.`
              : `Cerraste este mes superando tu límite por ${formatCurrency(Math.abs(disponibleParaGastar), profile?.currency)}.`
          )}
        </p>
      </div>
    </div>
  );
}
