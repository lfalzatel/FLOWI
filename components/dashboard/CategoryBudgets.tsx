'use client';

import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '@/lib/firestore';
import { formatCurrency } from '@/lib/format';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { CategoryIcon } from '@/components/CategoryIcon';
import { 
  Target, Plus, Edit3, Check, AlertTriangle, Sparkles, 
  ChevronDown, ChevronUp, Layers, ListFilter 
} from 'lucide-react';

interface CategoryBudgetsProps {
  transactions: Transaction[];
  currency?: string;
  filterType?: string;
}

const MAIN_CATEGORIES_CONFIG: Record<string, { icon: string; rule: string; weight: number; color: string; bg: string }> = {
  'Hogar y Servicios': { icon: '🏠', rule: '50% Necesidades', weight: 0.50, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  'Comida y Ocio': { icon: '🍽️', rule: '30% Estilo de Vida', weight: 0.15, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  'Bancos y Finanzas': { icon: '🏦', rule: '20% Ahorro', weight: 0.20, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  'Marcas y Apps': { icon: '📱', rule: '30% Estilo de Vida', weight: 0.05, color: 'text-amber-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  'Deportes': { icon: '⚽', rule: '30% Estilo de Vida', weight: 0.05, color: 'text-amber-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  'Otros': { icon: '📦', rule: '30% Estilo de Vida', weight: 0.05, color: 'text-amber-400', bg: 'bg-rose-500/10 border-rose-500/20' }
};

function getMainCategoryName(label: string): string {
  const text = label.toLowerCase();
  if (/comida|restaurante|almuerzo|cena|desayuno|mercado|supermercado|cafe|café|panaderia|panadería|antojo|snack|licor|bar|cerveza|trago|bebida|cigarro|popsy|frisby|helado|verdura|fruta|vegetal|carne|carniceria|carnicería|pan/.test(text)) {
    return 'Comida y Ocio';
  }
  if (/banco|tarjeta|credito|crédito|ahorro|inversion|inversión|prestamo|préstamo|nequi|bancolombia|bbva|daviplata|davivienda|plata|efectivo|nomina|nómina|sueldo/.test(text)) {
    return 'Bancos y Finanzas';
  }
  if (/claro|movistar|tigo|wom|epm|efigas|alcanos|agua|luz|energia|energía|gas|internet|television|televisión|telefono|teléfono|hogar|arriendo|alquiler|administracion|administración|apartamento|apto|aseo|limpieza/.test(text)) {
    return 'Hogar y Servicios';
  }
  if (/netflix|spotify|google|youtube|yt music|drive|gmail|photos|play store|playstore|app|susbcripcion|suscripción/.test(text)) {
    return 'Marcas y Apps';
  }
  if (/deporte|gym|gimnasio|fitness|piscina|natacion|natación|futbol|fútbol|ciclo|ciclismo|bici|bicicleta|run|running|atletismo|nike|adidas|decathlon/.test(text)) {
    return 'Deportes';
  }
  return 'Otros';
}

export function CategoryBudgets({ transactions, currency = 'COP', filterType = 'month' }: CategoryBudgetsProps) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const globalBudget = profile?.budget || 0;

  // Estados de acordeones
  const [openMainAccordion, setOpenMainAccordion] = useState(true); // DESPLEGADO POR DEFECTO
  const [openSubAccordion, setOpenSubAccordion] = useState(false);  // COLAPSADO POR DEFECTO

  // Presupuestos personalizados guardados en localStorage
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [tempBudgetVal, setTempBudgetVal] = useState<string>('');

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

  // 1. Gastos reales por subcategoría en el periodo filtrado
  const subcategoryExpenses = useMemo(() => {
    const expenses: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'gasto' && t.category) {
        expenses[t.category] = (expenses[t.category] || 0) + (t.amount || 0);
      }
    });
    return expenses;
  }, [transactions]);

  // 2. Gastos acumulados por Categoría Principal
  const mainCategoryExpenses = useMemo(() => {
    const expenses: Record<string, number> = {
      'Hogar y Servicios': 0,
      'Comida y Ocio': 0,
      'Bancos y Finanzas': 0,
      'Marcas y Apps': 0,
      'Deportes': 0,
      'Otros': 0
    };

    Object.entries(subcategoryExpenses).forEach(([subcat, amount]) => {
      const mainGroup = getMainCategoryName(subcat);
      expenses[mainGroup] = (expenses[mainGroup] || 0) + amount;
    });

    return expenses;
  }, [subcategoryExpenses]);

  // Subcategorías históricas usadas
  const allSubcategoryNames = useMemo(() => {
    return Array.from(new Set([...Object.keys(subcategoryExpenses), ...Object.keys(budgets)]));
  }, [subcategoryExpenses, budgets]);

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
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-accent animate-pulse" />
          <h3 className={`font-bold text-base ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary font-syne'}`}>
            Presupuestos Inteligentes por Categoría
          </h3>
        </div>
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${
          isTechTheme ? 'bg-accent/20 text-accent font-mono border border-accent/40' : 'bg-white/10 text-text-muted'
        }`}>
          Regla 50/30/20
        </span>
      </div>

      <div className="space-y-4">
        {/* ========================================================= */}
        {/* ACORDEÓN 1: CATEGORÍAS PRINCIPALES (DESPLEGADO POR DEFECTO) */}
        {/* ========================================================= */}
        <div className={`border overflow-hidden transition-all ${
          isTechTheme ? 'border-accent/30 bg-black/60' : 'glass-card rounded-2xl'
        }`}>
          <button
            type="button"
            onClick={() => setOpenMainAccordion(!openMainAccordion)}
            className={`w-full flex items-center justify-between p-4 text-left select-none transition-colors ${
              openMainAccordion ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center ${
                isTechTheme ? 'border border-emerald-500/30 bg-emerald-500/10' : 'rounded-xl bg-emerald-500/20'
              }`}>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>
                  Categorías Principales
                </p>
                <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>
                  Presupuesto estimado según la regla 50 / 30 / 20
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Abierto
              </span>
              {openMainAccordion ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </div>
          </button>

          {openMainAccordion && (
            <div className="p-4 space-y-3.5 bg-black/20">
              {Object.entries(MAIN_CATEGORIES_CONFIG).map(([mainCatName, config]) => {
                const spent = mainCategoryExpenses[mainCatName] || 0;
                let rawTarget = globalBudget > 0 ? Math.round(globalBudget * config.weight) : 0;

                // Escalar target según filtro temporal
                let target = rawTarget;
                if (filterType === 'day' && rawTarget > 0) {
                  target = Math.round(rawTarget / 30);
                } else if (filterType === 'week' && rawTarget > 0) {
                  target = Math.round(rawTarget / 4.33);
                }

                const percentage = target > 0 ? Math.min(Math.round((spent / target) * 100), 100) : 0;
                const isOverBudget = target > 0 && spent > target;

                let progressColor = 'bg-emerald-500';
                if (isOverBudget) {
                  progressColor = 'bg-red-500';
                } else if (percentage >= 80) {
                  progressColor = 'bg-yellow-500';
                }

                return (
                  <div key={mainCatName} className={`p-3.5 rounded-2xl border transition-all ${config.bg}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{config.icon}</span>
                        <div>
                          <p className={`text-xs font-bold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                            {mainCatName}
                          </p>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${config.color}`}>
                            {config.rule}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-text-primary">
                          {formatCurrency(spent, currency)}
                        </span>
                        {target > 0 && (
                          <span className="text-[10px] text-text-muted block">
                            Meta: {formatCurrency(target, currency)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso animada */}
                    {target > 0 ? (
                      <div className="space-y-1">
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          <span className={isOverBudget ? 'text-red-400 font-bold flex items-center gap-1' : 'text-text-muted'}>
                            {isOverBudget && <AlertTriangle className="w-3 h-3" />}
                            Gastado: <strong>{percentage}%</strong>
                          </span>
                          <span className="text-text-muted">
                            {isOverBudget 
                              ? `Excedido por ${formatCurrency(spent - target, currency)}` 
                              : `Disponible: ${formatCurrency(target - spent, currency)}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-muted italic pt-1">
                        Configura tu Presupuesto Global Mensual para activar los estimados de la regla 50/30/20.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* ACORDEÓN 2: TODAS LAS SUBCATEGORÍAS (COLAPSADO POR DEFECTO) */}
        {/* ========================================================= */}
        <div className={`border overflow-hidden transition-all ${
          isTechTheme ? 'border-accent/30 bg-black/60' : 'glass-card rounded-2xl'
        }`}>
          <button
            type="button"
            onClick={() => setOpenSubAccordion(!openSubAccordion)}
            className={`w-full flex items-center justify-between p-4 text-left select-none transition-colors ${
              openSubAccordion ? 'bg-white/5 border-b border-white/10' : 'hover:bg-white/[0.02]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 flex items-center justify-center ${
                isTechTheme ? 'border border-purple-500/30 bg-purple-500/10' : 'rounded-xl bg-purple-500/20'
              }`}>
                <ListFilter className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className={`text-sm font-bold ${isTechTheme ? 'font-mono text-accent uppercase' : 'font-syne text-text-primary'}`}>
                  Todas las Subcategorías Detalladas
                </p>
                <p className={`text-[10px] ${isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'}`}>
                  {allSubcategoryNames.length} subcategorías usadas en tu historial (Con metas editables)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                openSubAccordion ? 'bg-purple-500/20 text-purple-400' : 'bg-white/10 text-text-muted'
              }`}>
                {openSubAccordion ? 'Desplegado' : 'Ver Todas'}
              </span>
              {openSubAccordion ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </div>
          </button>

          {openSubAccordion && (
            <div className="p-4 space-y-3 bg-black/20">
              {allSubcategoryNames.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-4">
                  No hay subcategorías registradas en este período.
                </p>
              ) : (
                allSubcategoryNames.map(subcatName => {
                  const spent = subcategoryExpenses[subcatName] || 0;
                  const mainCatName = getMainCategoryName(subcatName);
                  const mainConfig = MAIN_CATEGORIES_CONFIG[mainCatName];
                  
                  // Meta calculada estimada o manual personalizada
                  const manualTarget = budgets[subcatName] || 0;
                  const isManual = manualTarget > 0;

                  let rawTarget = isManual 
                    ? manualTarget 
                    : globalBudget > 0 
                      ? Math.round(globalBudget * (mainConfig?.weight || 0.05) * 0.25)
                      : 0;

                  let target = rawTarget;
                  if (filterType === 'day' && rawTarget > 0) {
                    target = Math.round(rawTarget / 30);
                  } else if (filterType === 'week' && rawTarget > 0) {
                    target = Math.round(rawTarget / 4.33);
                  }

                  const percentage = target > 0 ? Math.min(Math.round((spent / target) * 100), 100) : 0;
                  const isOverBudget = target > 0 && spent > target;

                  let progressColor = 'bg-emerald-500';
                  if (isOverBudget) {
                    progressColor = 'bg-red-500';
                  } else if (percentage >= 80) {
                    progressColor = 'bg-yellow-500';
                  }

                  return (
                    <div 
                      key={subcatName}
                      className={`p-3 rounded-2xl transition-all ${
                        isTechTheme ? 'bg-black/40 border border-accent/20' : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={subcatName} label={subcatName} className="w-6 h-6 text-base flex items-center justify-center" />
                          <div>
                            <span className={`text-xs font-bold block ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                              {subcatName}
                            </span>
                            <span className="text-[9px] text-text-muted">
                              {isManual ? '🎯 Meta Manual' : `Est. ${mainCatName}`}
                            </span>
                          </div>
                        </div>

                        {editingCategory === subcatName ? (
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              placeholder="Meta $"
                              value={tempBudgetVal}
                              onChange={(e) => setTempBudgetVal(e.target.value)}
                              className="w-24 bg-black/50 border border-accent p-1 text-xs font-bold text-accent rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveBudget(subcatName)}
                              className="p-1.5 bg-accent text-black rounded font-bold hover:opacity-90"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(subcatName)}
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
                            <Edit3 className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
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
                                ? `Excedido por ${formatCurrency(spent - target, currency)}` 
                                : `Resta: ${formatCurrency(target - spent, currency)}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
