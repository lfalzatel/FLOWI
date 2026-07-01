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
  const [description, setDescription] = useState('');
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
      setDescription(debtToEdit.description || '');
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

        const status = paid >= total ? 'paid' : 'pending';
        await updateDebt(debtToEdit.id!, {
          title,
          totalAmount: total,
          paidAmount: paid,
          status,
          description,
          payments: [...(debtToEdit.payments || []), newPayment],
        });
      } else {
        const status = paid >= total ? 'paid' : 'pending';
        if (debtToEdit && debtToEdit.id) {
          await updateDebt(debtToEdit.id, {
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            description,
          });
        } else {
          await addDebt({
            userId: user.uid,
            title,
            totalAmount: total,
            paidAmount: paid,
            status,
            description,
            payments: [],
          });
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

  const formatPaymentDate = (date: any) => {
    const d = date instanceof Date ? date : new Date(date);
    const dateStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
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
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Título de la Deuda</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-white/5 border py-2.5 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
              placeholder="Ej. Préstamo de Juan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto Total</label>
              <input
                type="text"
                required
                value={totalAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setTotalAmount(val);
                }}
                className={`w-full bg-white/5 border py-2.5 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto Pagado</label>
              <input
                type="text"
                value={paidAmount}
                disabled={!!debtToEdit}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setPaidAmount(val);
                }}
                className={`w-full bg-white/5 border py-2.5 px-4 text-white placeholder-white/20 focus:outline-none disabled:opacity-50 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
                placeholder="0.00"
              />
            </div>
          </div>

          {debtToEdit && (
            <div className={`p-4 border grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-white/5 border-white/5 rounded-2xl'}`}>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Registrar Abono</label>
                <input
                  type="text"
                  value={abono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    if (val.split('.').length > 2) return;
                    setAbono(val);
                  }}
                  className={`w-full bg-white/10 border py-2 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Fecha</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className={`w-full bg-white/10 border py-2 px-4 text-white focus:outline-none [color-scheme:dark] ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Descripción (Opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-white/5 border py-2.5 px-4 text-white placeholder-white/20 focus:outline-none resize-none h-20 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-xs' : 'border-white/10 rounded-xl focus:border-accent text-sm'}`}
              placeholder="Ej. Dinero prestado para la compra de materiales..."
            />
          </div>

          {debtToEdit && debtToEdit.payments && debtToEdit.payments.length > 0 && (
            <div className={`p-4 border ${isTechTheme ? 'bg-deep border-accent/20 rounded-none' : 'bg-white/[0.02] border-white/5 rounded-2xl'}`}>
              <h4 className={`text-xs font-semibold mb-2.5 tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/60 font-syne'}`}>
                Historial de Abonos ({debtToEdit.payments.length})
              </h4>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {debtToEdit.payments.map((p, idx) => (
                  <div key={p.id || idx} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-0">
                    <span className={`${isTechTheme ? 'text-white/80' : 'text-white/70'}`}>
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
