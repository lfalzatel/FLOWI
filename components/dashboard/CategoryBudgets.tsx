'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { useTheme } from '@/components/ThemeProvider';
import { CategoryIcon } from '@/components/CategoryIcon';
import { Target, Plus, Edit3, Check, AlertTriangle, Sparkles } from 'lucide-react';

interface CategoryBudgetsProps {
  transactions: Transaction[];
  currency?: string;
}

export function CategoryBudgets({ transactions, currency = 'COP' }: CategoryBudgetsProps) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempBudgetVal, setTempBudgetVal] = useState<string>('');

  // Cargar presupuestos desde localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('flowi_category_budgets');
      if (saved) {
        setBudgets(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Error cargando presupuestos:', e);
    }
  }, []);

  const saveBudgets = (updated: Record<string, number>) => {
    setBudgets(updated);
    try {
      localStorage.setItem('flowi_category_budgets', JSON.stringify(updated));
    } catch (e) {}
  };

  // Calcular total gastado por categoría en el período filtrado
  const categoryExpenses: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.type === 'gasto' && t.category) {
      categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + (t.amount || 0);
    }
  });

  // Obtener todas las categorías únicas que tienen gastos o presupuesto definido
  const allCategoryNames = Array.from(
    new Set([...Object.keys(categoryExpenses), ...Object.keys(budgets)])
  );

  const handleStartEdit = (catName: string) => {
    setEditingCategory(catName);
    setTempBudgetVal(budgets[catName] ? budgets[catName].toString() : '');
  };

  const handleSaveBudget = (catName: string) => {
    const val = parseFloat(tempBudgetVal);
    const updated = { ...budgets };
    if (!isNaN(val) && val > 0) {
      updated[catName] = val;
    } else {
      delete updated[catName];
    }
    saveBudgets(updated);
    setEditingCategory(null);
  };

  return (
    <div className={`p-5 glass-dropdown mb-6 ${isTechTheme ? 'rounded-none border border-accent/40 font-mono' : 'rounded-3xl'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent animate-pulse" />
          <h3 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary font-syne'}`}>
            Presupuestos por Categoría
          </h3>
        </div>
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
          isTechTheme ? 'bg-accent/20 text-accent font-mono border border-accent/40' : 'bg-white/10 text-text-muted'
        }`}>
          Metas del Mes
        </span>
      </div>

      {allCategoryNames.length === 0 ? (
        <div className="text-center py-6">
          <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
            No hay gastos registrados en este período. Dicta tu primer gasto con el micrófono 🎙️.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {allCategoryNames.map(catName => {
            const spent = categoryExpenses[catName] || 0;
            const target = budgets[catName] || 0;
            const percentage = target > 0 ? Math.min(Math.round((spent / target) * 100), 100) : 0;
            const isOverBudget = target > 0 && spent > target;

            // Semáforo de colores
            let progressColor = 'bg-emerald-500';
            if (isOverBudget) {
              progressColor = 'bg-red-500';
            } else if (percentage >= 80) {
              progressColor = 'bg-yellow-500';
            }

            return (
              <div 
                key={catName}
                className={`p-3 rounded-2xl transition-all ${
                  isTechTheme ? 'bg-black/30 border border-accent/20' : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <CategoryIcon icon={catName} label={catName} className="w-6 h-6 text-base flex items-center justify-center" />
                    <span className={`text-xs font-bold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                      {catName}
                    </span>
                  </div>

                  {editingCategory === catName ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="number"
                        placeholder="Límite $"
                        value={tempBudgetVal}
                        onChange={(e) => setTempBudgetVal(e.target.value)}
                        className="w-24 bg-black/50 border border-accent p-1 text-xs font-bold text-accent rounded focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveBudget(catName)}
                        className="p-1.5 bg-accent text-black rounded font-bold hover:opacity-90"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(catName)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors"
                    >
                      {target > 0 ? (
                        <span className="font-bold text-text-secondary">
                          Meta: <strong className="text-text-primary">{formatCurrency(target, currency)}</strong>
                        </span>
                      ) : (
                        <span className="text-[11px] italic underline flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Fichar Meta
                        </span>
                      )}
                      <Edit3 className="w-3 h-3 opacity-60" />
                    </button>
                  )}
                </div>

                {/* Barra de progreso */}
                {target > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <span className={isOverBudget ? 'text-red-400 font-bold flex items-center gap-1' : 'text-text-muted'}>
                        {isOverBudget && <AlertTriangle className="w-3 h-3" />}
                        Gastado: <strong>{formatCurrency(spent, currency)}</strong> ({percentage}%)
                      </span>
                      <span className="text-text-muted">
                        {isOverBudget 
                          ? `Excedido en ${formatCurrency(spent - target, currency)}` 
                          : `Resta: ${formatCurrency(target - spent, currency)}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
