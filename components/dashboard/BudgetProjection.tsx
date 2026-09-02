'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import { AlertCircle, CheckCircle2, Calculator, Calendar, X, Wallet, Info } from 'lucide-react';
import { Transaction, isFixedExpenseCategory } from '@/lib/firestore';
import { CategoryIcon } from '@/components/CategoryIcon';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';

interface Props {
  filterType: string;
  filterValue: string;
  transactions: Transaction[];
  onRefresh?: () => void;
}

export function BudgetProjection({ filterType, filterValue, transactions, onRefresh }: Props) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const [activeModal, setActiveModal] = useState<'fijos' | 'disponible' | 'diario' | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeModal]);

  if (filterType !== 'month') return null;

  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = filterValue === currentMonthValue;

  // Filtrar gastos e ingresos del período
  const gastosTx = transactions.filter(t => t.type === 'gasto');
  const ingresosTx = transactions.filter(t => t.type === 'ingreso');

  const totalIngresos = ingresosTx.reduce((sum, t) => sum + t.amount, 0);
  const baseLimit = totalIngresos > 0 ? totalIngresos : (profile?.budget || 0);

  // Clasificación de Gastos Fijos vs Variables
  const isFixedTx = (t: Transaction) => t.isFixed !== undefined ? t.isFixed : isFixedExpenseCategory(t.category);

  const fixedTransactionsList = gastosTx.filter(t => isFixedTx(t));
  const variableTransactionsList = gastosTx.filter(t => !isFixedTx(t));

  const gastosFijos = fixedTransactionsList.reduce((sum, t) => sum + t.amount, 0);
  const gastosVariables = variableTransactionsList.reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = gastosFijos + gastosVariables;

  // Dinero Libre disponible
  const disponibleParaGastar = baseLimit - totalGastos;

  // Días y cuota
  const [yearStr, monthStr] = (filterValue || currentMonthValue).split('-');
  const year = parseInt(yearStr, 10) || now.getFullYear();
  const month = parseInt(monthStr, 10) || (now.getMonth() + 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  const daysPassed = isCurrentMonth ? Math.max(1, now.getDate()) : daysInMonth;
  const diasRestantes = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : 0;

  const cuotaDiaria = (isCurrentMonth && disponibleParaGastar > 0 && diasRestantes > 0)
    ? disponibleParaGastar / diasRestantes
    : 0;

  const promedioGastoDiarioActual = daysPassed > 0 ? (gastosVariables / daysPassed) : 0;
  const isWarning = baseLimit > 0 && disponibleParaGastar < 0;

  const formatDateLabel = (tDate: any) => {
    const d = tDate instanceof Date ? tDate : (tDate && typeof tDate.toDate === 'function') ? tDate.toDate() : new Date(tDate);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <>
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

        {/* Grid de 3 Tarjetas Interactivas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
          {/* Tarjeta 1: Gastos Fijos */}
          <button
            type="button"
            onClick={() => setActiveModal('fijos')}
            className={`p-3 rounded-2xl text-left transition-all active:scale-[0.97] hover:border-orange-500/50 group ${
              isTechTheme 
                ? 'bg-accent/5 border border-accent/20 hover:bg-accent/10' 
                : 'bg-white/5 border border-white/10 hover:bg-white/10 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isTechTheme ? 'text-accent/70' : 'text-text-muted'
              }`}>
                Gastos Fijos
              </span>
              <Info className="w-3 h-3 text-orange-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className={`text-xs sm:text-sm font-bold truncate ${
              isTechTheme ? 'text-orange-400 font-mono' : 'text-orange-400 font-syne'
            }`}>
              {formatCurrency(gastosFijos, profile?.currency)}
            </p>
            <span className={`block text-[9px] mt-0.5 truncate ${
              isTechTheme ? 'text-accent/50' : 'text-text-muted'
            }`}>
              {fixedTransactionsList.length} ítems • Ver detalle
            </span>
          </button>

          {/* Tarjeta 2: Disponible Libre */}
          <button
            type="button"
            onClick={() => setActiveModal('disponible')}
            className={`p-3 rounded-2xl text-left transition-all active:scale-[0.97] hover:border-emerald-500/50 group ${
              isTechTheme 
                ? 'bg-accent/5 border border-accent/20 hover:bg-accent/10' 
                : 'bg-white/5 border border-white/10 hover:bg-white/10 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${
                isTechTheme ? 'text-accent/70' : 'text-text-muted'
              }`}>
                Disponible Libre
              </span>
              <Info className="w-3 h-3 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
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
              Fórmula y desglose
            </span>
          </button>

          {/* Tarjeta 3: Límite Diario */}
          <button
            type="button"
            onClick={() => setActiveModal('diario')}
            className={`p-3 rounded-2xl text-left transition-all active:scale-[0.97] hover:border-accent group ${
              isTechTheme 
                ? 'bg-accent/10 border border-accent/40 hover:bg-accent/20' 
                : 'bg-accent/10 border border-accent/20 hover:bg-accent/20 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-accent">
                Límite Diario
              </span>
              <Info className="w-3 h-3 text-accent opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className={`text-xs sm:text-sm font-bold truncate ${
              isTechTheme ? 'text-accent font-mono' : 'text-accent font-syne'
            }`}>
              {isCurrentMonth 
                ? formatCurrency(cuotaDiaria, profile?.currency) 
                : formatCurrency(baseLimit > 0 ? baseLimit / daysInMonth : 0, profile?.currency)
              }
            </p>
            <span className="block text-[9px] mt-0.5 truncate text-accent/80">
              {isCurrentMonth ? '/ día restante' : '/ día prom.'}
            </span>
          </button>
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

      {/* Modal Interactivo de Detalle RENDERIZADO VÍA PORTAL DIRECTO EN DOCUMENT.BODY */}
      {activeModal && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono text-sm' : ''}`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20 backdrop-blur-xs' : 'bg-black/60 backdrop-blur-sm'}`} 
            onClick={() => setActiveModal(null)} 
          />

          <div 
            className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[90vh] overflow-y-auto p-5 sm:p-6 glass-dropdown flex flex-col ${
              isTechTheme ? 'rounded-none border border-accent/50 bg-deep uppercase' : 'rounded-3xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-glass-border mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activeModal === 'fijos' 
                    ? 'bg-orange-500/15 text-orange-400' 
                    : activeModal === 'disponible' 
                      ? 'bg-emerald-500/15 text-emerald-400' 
                      : 'bg-accent/15 text-accent'
                }`}>
                  {activeModal === 'fijos' && <Wallet className="w-5 h-5" />}
                  {activeModal === 'disponible' && <Calculator className="w-5 h-5" />}
                  {activeModal === 'diario' && <Calendar className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`font-bold ${isTechTheme ? 'font-mono text-accent text-base' : 'font-syne text-lg text-text-primary'}`}>
                    {activeModal === 'fijos' && 'Detalle de Gastos Fijos'}
                    {activeModal === 'disponible' && 'Desglose de Disponible Libre'}
                    {activeModal === 'diario' && 'Cálculo de Límite Diario'}
                  </h3>
                  <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                    {activeModal === 'fijos' && 'Obligaciones y suscripciones del mes'}
                    {activeModal === 'disponible' && 'Balance de presupuesto libre'}
                    {activeModal === 'diario' && 'Proyección para no superar ingresos'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className={`p-2 rounded-xl transition-colors ${
                  isTechTheme ? 'hover:bg-accent/10 text-accent' : 'hover:bg-white/10 text-text-muted hover:text-text-primary'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CONTENIDO 1: GASTOS FIJOS */}
            {activeModal === 'fijos' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl ${isTechTheme ? 'bg-accent/10 border border-accent/30' : 'bg-orange-500/10 border border-orange-500/20'}`}>
                  <span className={`text-xs block font-semibold ${isTechTheme ? 'text-accent' : 'text-orange-400'}`}>Total Gastos Fijos</span>
                  <p className={`text-2xl font-bold mt-1 ${isTechTheme ? 'text-accent font-mono' : 'text-orange-400 font-syne'}`}>
                    {formatCurrency(gastosFijos, profile?.currency)}
                  </p>
                  <p className={`text-xs mt-1 ${isTechTheme ? 'text-accent/70' : 'text-text-secondary'}`}>
                    Corresponde a {fixedTransactionsList.length} pagos recurrentes en este período.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${isTechTheme ? 'text-accent/80' : 'text-text-muted'}`}>
                    Listado de Pagos Fijos
                  </h4>
                  {fixedTransactionsList.length === 0 ? (
                    <p className={`text-xs text-center py-6 ${isTechTheme ? 'text-accent/50' : 'text-text-muted'}`}>
                      No hay gastos fijos registrados en este mes.
                    </p>
                  ) : (
                    fixedTransactionsList.map((tx) => (
                      <div
                        key={tx.id || `${tx.category}-${tx.amount}`}
                        onClick={() => setEditingTx(tx)}
                        className={`p-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                          isTechTheme ? 'bg-accent/5 border border-accent/20 hover:bg-accent/10' : 'glass-card hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CategoryIcon icon={tx.category} label={tx.category} className="w-8 h-8 text-xl flex items-center justify-center flex-shrink-0" />
                          <div>
                            <p className={`text-xs font-bold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>{tx.category}</p>
                            <p className={`text-[10px] ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                              {tx.description || 'Gasto Fijo'} • {formatDateLabel(tx.date)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${isTechTheme ? 'text-orange-400 font-mono' : 'text-orange-400 font-syne'}`}>
                          {formatCurrency(tx.amount, profile?.currency)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* CONTENIDO 2: DISPONIBLE LIBRE (Fórmula Visual) */}
            {activeModal === 'disponible' && (
              <div className="space-y-4">
                {/* Caja de Fórmula Visual */}
                <div className={`p-4 rounded-2xl space-y-2.5 ${
                  isTechTheme ? 'bg-black/50 border border-accent/30 font-mono' : 'bg-white/5 border border-white/10'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-400 font-semibold">(+) Ingresos del Mes</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(totalIngresos, profile?.currency)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-orange-400 font-semibold">(-) Gastos Fijos</span>
                    <span className="font-bold text-orange-400">-{formatCurrency(gastosFijos, profile?.currency)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-red-400 font-semibold">(-) Gastos Variables Acumulados</span>
                    <span className="font-bold text-red-400">-{formatCurrency(gastosVariables, profile?.currency)}</span>
                  </div>

                  <div className="pt-2.5 border-t border-white/10 flex justify-between items-center">
                    <span className={`text-xs font-bold uppercase ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                      (=) Disponible Libre Restante
                    </span>
                    <span className={`text-base font-bold ${disponibleParaGastar < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(disponibleParaGastar, profile?.currency)}
                    </span>
                  </div>
                </div>

                {/* Lista de Gastos Variables */}
                <div className="space-y-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${isTechTheme ? 'text-accent/80' : 'text-text-muted'}`}>
                    Gastos Variables de Consumo Diario ({variableTransactionsList.length})
                  </h4>
                  {variableTransactionsList.length === 0 ? (
                    <p className={`text-xs text-center py-6 ${isTechTheme ? 'text-accent/50' : 'text-text-muted'}`}>
                      No has realizado gastos variables en este período.
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {variableTransactionsList.map((tx) => (
                        <div
                          key={tx.id || `${tx.category}-${tx.amount}`}
                          onClick={() => setEditingTx(tx)}
                          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] ${
                            isTechTheme ? 'bg-accent/5 border border-accent/10 hover:bg-accent/10' : 'glass-card hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon icon={tx.category} label={tx.category} className="w-6 h-6 text-base flex items-center justify-center flex-shrink-0" />
                            <div>
                              <p className={`text-xs font-semibold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>{tx.category}</p>
                              <p className={`text-[10px] ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                                {tx.description || 'Gasto variable'} • {formatDateLabel(tx.date)}
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${isTechTheme ? 'text-accent font-mono' : 'text-text-primary font-syne'}`}>
                            {formatCurrency(tx.amount, profile?.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CONTENIDO 3: LÍMITE DIARIO */}
            {activeModal === 'diario' && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl ${isTechTheme ? 'bg-accent/10 border border-accent/30' : 'bg-accent/10 border border-accent/20'}`}>
                  <span className="text-xs block font-bold text-accent uppercase tracking-wider">Cuota Diaria Recomendada</span>
                  <p className={`text-3xl font-bold mt-1 text-accent ${isTechTheme ? 'font-mono' : 'font-syne'}`}>
                    {formatCurrency(cuotaDiaria, profile?.currency)} <span className="text-sm font-normal">/ día</span>
                  </p>
                  <p className={`text-xs mt-1 ${isTechTheme ? 'text-accent/80' : 'text-text-secondary'}`}>
                    Basado en tus {diasRestantes} días restantes del mes.
                  </p>
                </div>

                {/* Métricas secundarias */}
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-3 rounded-xl ${isTechTheme ? 'bg-accent/5 border border-accent/20' : 'bg-white/5 border border-white/5'}`}>
                    <span className={`text-[10px] block font-semibold ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
                      Gasto Diario Promedio Real
                    </span>
                    <p className={`text-sm font-bold mt-0.5 ${isTechTheme ? 'text-accent font-mono' : 'text-text-primary font-syne'}`}>
                      {formatCurrency(promedioGastoDiarioActual, profile?.currency)} / día
                    </p>
                    <span className={`text-[9px] ${isTechTheme ? 'text-accent/50' : 'text-text-muted'}`}>
                      En los últimos {daysPassed} días
                    </span>
                  </div>

                  <div className={`p-3 rounded-xl ${isTechTheme ? 'bg-accent/5 border border-accent/20' : 'bg-white/5 border border-white/5'}`}>
                    <span className={`text-[10px] block font-semibold ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`}>
                      Disponible Total
                    </span>
                    <p className={`text-sm font-bold mt-0.5 ${disponibleParaGastar < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatCurrency(disponibleParaGastar, profile?.currency)}
                    </p>
                    <span className={`text-[9px] ${isTechTheme ? 'text-accent/50' : 'text-text-muted'}`}>
                      Para repartir en {diasRestantes} días
                    </span>
                  </div>
                </div>

                {/* Recomendación inteligente */}
                <div className={`p-3.5 rounded-2xl flex items-start gap-2.5 ${
                  disponibleParaGastar < 0 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                    : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                }`}>
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed">
                    {disponibleParaGastar < 0 
                      ? '⚠️ Has superado tu disponible mensual. Si haces nuevos gastos variables, aumentará tu déficit del mes.'
                      : `💡 Si mantienes tus gastos variables diarios por debajo de ${formatCurrency(cuotaDiaria, profile?.currency)} cada día, cerrarás el mes sin sobrepasar tus ingresos.`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal para editar transacción desde el detalle */}
      {editingTx && (
        <AddExpenseModal
          transactionToEdit={editingTx}
          onClose={() => setEditingTx(null)}
          onSuccess={() => {
            setEditingTx(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
