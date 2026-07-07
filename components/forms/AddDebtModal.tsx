'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addDebt, updateDebt, deleteDebt, addExpense, calculateDebtInterest, Debt } from '@/lib/firestore';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';
import { getLocalDateString } from '@/lib/dateUtils';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  debtToEdit?: Debt | null;
}

export function AddDebtModal({ onClose, onSuccess, debtToEdit }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [description, setDescription] = useState('');
  const [abono, setAbono] = useState('');
  const [abonoDate, setAbonoDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  const isReadOnly = debtToEdit?.status === 'paid';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (debtToEdit) {
      setTitle(debtToEdit.title);
      setTotalAmount(debtToEdit.totalAmount.toString());
      setPaidAmount(debtToEdit.paidAmount.toString());
      setInterestRate(debtToEdit.interestRate ? debtToEdit.interestRate.toString() : '');
      setDescription(debtToEdit.description || '');
    }
  }, [debtToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onClose();
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const total = parseFloat(totalAmount);
      let paid = parseFloat(paidAmount) || 0;
      const rate = interestRate ? parseFloat(interestRate) : 0;

      if (debtToEdit && abono) {
        const abonoAmount = parseFloat(abono);
        paid += abonoAmount;
        
        // Obtener fecha y hora exacta localmente para evitar desfases UTC
        const todayStr = new Date().toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD
        let finalDate: Date;
        if (abonoDate === todayStr) {
          const now = new Date();
          const [year, month, day] = abonoDate.split('-').map(Number);
          finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        } else {
          const [year, month, day] = abonoDate.split('-').map(Number);
          finalDate = new Date(year, month - 1, day, 12, 0, 0);
        }

        const newPayment = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
          amount: abonoAmount,
          date: finalDate,
          description: `Abono a: ${title}`,
        };

        await addExpense({
          userId: user.uid,
          type: 'gasto',
          category: 'Deudas',
          amount: abonoAmount,
          description: `Abono a: ${title}`,
          date: finalDate,
        });

        // Guardar la deuda con el array de abonos actualizado
        const status = paid >= total ? 'paid' : 'pending';
        await updateDebt(debtToEdit.id!, {
          title,
          totalAmount: total,
          paidAmount: paid,
          status,
          interestRate: rate,
          description,
          payments: [...(debtToEdit.payments || []), newPayment],
        });
        triggerPowerAnimation(abonoAmount, 'abono');
      } else {
        const status = paid >= total ? 'paid' : 'pending';
        if (debtToEdit && debtToEdit.id) {
          await updateDebt(debtToEdit.id, {
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            interestRate: rate,
            description,
          });
          triggerPowerAnimation(total, 'edicion');
        } else {
          await addDebt({
            userId: user.uid,
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            interestRate: rate,
            description,
            payments: [],
          });
          triggerPowerAnimation(total, 'edicion');
        }
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving debt:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!debtToEdit?.id) return;
    setLoading(true);
    try {
      const deletedAmount = parseFloat(totalAmount) || 0;
      await deleteDebt(debtToEdit.id);
      triggerPowerAnimation(deletedAmount, 'eliminacion');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting debt:', error);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const formatPaymentDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`} onClick={onClose}>
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar deuda"
        message="¿Estás seguro de que quieres eliminar esta deuda? Esta acción no se puede deshacer."
      />
      <div 
        className={`w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'glass-dropdown rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-text-primary mb-4'}`}>
          {isReadOnly ? 'Detalles de Deuda' : debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
        </h2>

        {isReadOnly && (
          <div className="mb-4 bg-[#00E5A0]/10 border border-[#00E5A0]/20 text-[#00E5A0] text-xs font-semibold py-2 px-3 flex items-center gap-1.5 justify-center tracking-wider">
            ✓ CRÉDITO TOTALMENTE LIQUIDADO (HISTORIAL)
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Título de la Deuda</label>
            <input
              type="text"
              required
              disabled={isReadOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-glass border py-2.5 px-4 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
              placeholder="Ej. Préstamo de Juan..."
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`}>Monto Total</label>
              <input
                type="text"
                required
                disabled={isReadOnly}
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setTotalAmount(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`}>Monto Pagado</label>
              <input
                type="text"
                disabled={isReadOnly || !!debtToEdit}
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setPaidAmount(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="0.00"
              />
            </div>

            <div className="col-span-1">
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-[10px] font-medium mb-1 block truncate`} title="Tasa Efectiva Anual">Tasa E.A. (%)</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={interestRate}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setInterestRate(val);
                }}
                className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-xs'}`}
                placeholder="Opcional %"
              />
            </div>
          </div>

          {debtToEdit && debtToEdit.interestRate && debtToEdit.interestRate > 0 && (() => {
            const interestData = calculateDebtInterest(debtToEdit);
            const pendingAmount = Math.max(0, debtToEdit.totalAmount - debtToEdit.paidAmount);
            const totalWithInterest = pendingAmount + interestData.accumulatedInterest;
            return (
              <div className={`p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none font-mono text-[11px]' : 'bg-glass border-glass-border rounded-2xl text-xs space-y-1 text-text-secondary'}`}>
                <div className="flex justify-between items-center text-text-muted mb-2">
                  <span>RESUMEN FINANCIERO (E.A. {debtToEdit.interestRate}%)</span>
                  {debtToEdit.status !== 'paid' && (
                    <span className="text-[10px] text-accent font-bold uppercase tracking-wider animate-pulse">Capitalización Diaria</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Saldo base {isReadOnly ? 'liquidado' : 'pendiente'}:</span>
                  <span className="text-text-primary">${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                </div>
                {interestData.accumulatedInterest > 0 && (
                  <div className="flex justify-between">
                    <span className="text-red-400 font-semibold">Interés acumulado final:</span>
                    <span className="text-red-400 font-bold font-mono">+${interestData.accumulatedInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <hr className="border-glass-border my-1.5" />
                <div className="flex justify-between text-sm font-bold">
                  <span className={isTechTheme ? 'text-accent' : 'text-text-primary font-syne'}>{isReadOnly ? 'Total pagado:' : 'Total a pagar hoy:'}</span>
                  <span className={isTechTheme ? 'text-accent font-mono' : 'text-[#00E5A0] font-mono'}>
                    ${totalWithInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })()}

          {debtToEdit && !isReadOnly && (
            <div className={`p-4 border grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Registrar Abono</label>
                <input
                  type="text"
                  value={abono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    if (val.split('.').length > 2) return;
                    setAbono(val);
                  }}
                  className={`w-full bg-glass border py-2 px-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Fecha</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className={`w-full bg-glass border py-2 px-4 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Descripción (Opcional)</label>
            <textarea
              disabled={isReadOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-glass border py-2.5 px-4 text-text-primary placeholder-text-muted focus:outline-none resize-none h-20 disabled:opacity-75 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-glass-border rounded-xl focus:border-accent text-sm'}`}
              placeholder="Ej. Dinero prestado para la compra de materiales..."
            />
          </div>

          {debtToEdit && debtToEdit.payments && debtToEdit.payments.length > 0 && (
            <div className={`p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-glass border-glass-border rounded-2xl'}`}>
              <h4 className={`text-xs font-semibold mb-2.5 tracking-wider ${isTechTheme ? 'text-accent' : 'text-text-secondary font-syne'}`}>
                Historial de Abonos ({debtToEdit.payments.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {debtToEdit.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 border-b border-glass-border last:border-0">
                    <span className={`${isTechTheme ? 'text-white/80' : 'text-text-secondary'}`}>
                      {formatPaymentDate(p.date)}
                    </span>
                    <span className={`font-mono font-bold ${isTechTheme ? 'text-accent' : 'text-[#00E5A0]'}`}>
                      +${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 space-y-2">
            {isReadOnly ? (
              <button
                type="button"
                onClick={onClose}
                className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}
              >
                Volver / Aceptar
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}
              >
                {loading ? 'Guardando...' : debtToEdit ? 'Guardar Cambios' : 'Crear Deuda'}
              </button>
            )}

            {debtToEdit && (
               <button
                 type="button"
                 onClick={() => setShowConfirmDelete(true)}
                 disabled={loading}
                 className={`w-full font-bold py-3.5 transition-all active:scale-[0.98] disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider' : 'rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20'}`}
               >
                 Eliminar Deuda
               </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
