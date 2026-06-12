'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { addDebt, updateDebt, deleteDebt, addExpense, Debt } from '@/lib/firestore';

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
  const [abono, setAbono] = useState('');
  const [abonoDate, setAbonoDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

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
    }
  }, [debtToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const total = parseFloat(totalAmount);
      let paid = parseFloat(paidAmount) || 0;

      if (debtToEdit && abono) {
        const abonoAmount = parseFloat(abono);
        paid += abonoAmount;
        
        // Registrar el abono como un gasto
        await addExpense({
          userId: user.uid,
          type: 'gasto',
          category: 'Deudas',
          amount: abonoAmount,
          description: `Abono a: ${title}`,
          date: new Date(abonoDate),
        });
      }

      const status = paid >= total ? 'paid' : 'pending';

      if (debtToEdit && debtToEdit.id) {
        await updateDebt(debtToEdit.id, {
          title,
          totalAmount: total,
          paidAmount: paid,
          status,
        });
      } else {
        await addDebt({
          userId: user.uid,
          title,
          totalAmount: total,
          paidAmount: paid,
          status,
        });
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
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta deuda?')) return;

    setLoading(true);
    try {
      await deleteDebt(debtToEdit.id);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error deleting debt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`} onClick={onClose}>
      <div 
        className={`w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'bg-[#0A0A0F] border border-white/10 rounded-t-3xl sm:rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-white/50 hover:text-white'}`}>
          <X className="w-5 h-5" />
        </button>

        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-white mb-6'}`}>
          {debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Nombre de la Deuda</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-white/5 border py-3 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent' : 'border-white/10 rounded-xl focus:border-accent'}`}
              placeholder="Ej. Préstamo de Nico"
              required
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto Total</label>
            <input
              type="text"
              inputMode="decimal"
              value={totalAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                if (val.split('.').length > 2) return;
                setTotalAmount(val);
              }}
              className={`w-full bg-white/5 border py-3 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent font-syne font-bold'}`}
              placeholder="0.00"
              required
            />
          </div>

          {/* Paid Amount (only on creation or view) */}
          {!debtToEdit && (
            <div>
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto ya pagado (Opcional)</label>
              <input
                type="text"
                inputMode="decimal"
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setPaidAmount(val);
                }}
                className={`w-full bg-white/5 border py-3 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent font-syne'}`}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Abono (only on edit) */}
          {debtToEdit && (
            <div className={`p-4 space-y-3 ${isTechTheme ? 'bg-black/40 border border-accent/20 rounded-none' : 'bg-white/5 rounded-xl'}`}>
              <div className="flex justify-between text-xs">
                <span className={`${isTechTheme ? 'text-accent/50' : 'text-white/40'}`}>Ya pagado:</span>
                <span className={`font-medium ${isTechTheme ? 'text-text-primary' : 'text-white'}`}>${parseFloat(paidAmount || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className={`${isTechTheme ? 'text-accent/50' : 'text-white/40'}`}>Pendiente:</span>
                <span className="text-orange-400 font-medium">${(parseFloat(totalAmount || '0') - parseFloat(paidAmount || '0')).toFixed(2)}</span>
              </div>
              
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto a Abonar</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={abono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    if (val.split('.').length > 2) return;
                    setAbono(val);
                  }}
                  className={`w-full bg-white/10 border py-3 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent font-syne font-bold'}`}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Fecha del Abono</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className={`w-full bg-white/10 border py-3 px-4 text-white focus:outline-none [color-scheme:dark] ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-white/10 rounded-xl focus:border-accent'}`}
                  required
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : `rounded-xl bg-gradient-to-r from-accent to-accent-dim ${theme === 'light' ? 'text-white' : 'text-black'}`}`}
            >
              {loading ? 'Guardando...' : debtToEdit ? 'Guardar Cambios' : 'Crear Deuda'}
            </button>

            {debtToEdit && (
               <button
                 type="button"
                 onClick={handleDelete}
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
