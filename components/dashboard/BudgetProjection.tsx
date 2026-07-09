'use client';

import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { FIXED_CATEGORIES, Transaction } from '@/lib/firestore';

interface Props {
  filterType: string;
  filterValue: string;
  transactions: Transaction[];
}

export function BudgetProjection({ filterType, filterValue, transactions }: Props) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  if (!profile?.budget || profile.budget <= 0) return null;
  if (filterType !== 'month') return null;

  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = filterValue === currentMonthValue;

  const totalGastos = transactions.reduce((sum, t) => sum + t.amount, 0);
  let projection = totalGastos;
  let text = '';
  let isWarning = false;

  if (isCurrentMonth) {
    const fixedGastos = transactions.filter(t => FIXED_CATEGORIES.includes(t.category)).reduce((sum, t) => sum + t.amount, 0);
    const variableGastos = totalGastos - fixedGastos;

    const daysPassed = Math.max(1, now.getDate());
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    // Solo proyectamos los gastos variables diarios
    const averageDailyVariable = variableGastos / daysPassed;
    const projectedVariable = averageDailyVariable * daysInMonth;
    projection = projectedVariable + fixedGastos;
    
    const baseText = `Tu promedio diario variable es de ${formatCurrency(averageDailyVariable, profile.currency)}. A este ritmo, cerrarás el mes en ${formatCurrency(projection, profile.currency)}.`;
    
    if (projection > profile.budget) {
      isWarning = true;
      text = `${baseText} ¡Superarás tu presupuesto de ${formatCurrency(profile.budget, profile.currency)}!`;
    } else {
      text = `${baseText} Bien dentro de tu presupuesto de ${formatCurrency(profile.budget, profile.currency)}.`;
    }
  } else {
    // Mes pasado
    if (totalGastos > profile.budget) {
      isWarning = true;
      text = `Superaste tu presupuesto de ${formatCurrency(profile.budget, profile.currency)}.`;
    } else {
      text = `Te mantuviste dentro de tu presupuesto de ${formatCurrency(profile.budget, profile.currency)}.`;
    }
  }

  return (
    <div className={`mt-4 p-4 flex items-start gap-3 animate-fade-in-up ${isTechTheme ? 'border border-accent/20 rounded-none bg-accent/5' : 'glass-card rounded-2xl'}`}>
      <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isWarning ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
        {isWarning ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
      </div>
      <div>
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isTechTheme ? 'font-mono' : 'font-syne'} ${isWarning ? 'text-orange-500' : 'text-emerald-500'}`}>
          {isCurrentMonth ? 'Proyección de Cierre' : 'Balance del Mes'}
        </h4>
        <p className={`text-[13px] leading-relaxed ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
          {text}
        </p>
      </div>
    </div>
  );
}
