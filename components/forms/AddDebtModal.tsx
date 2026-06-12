'use client';
import { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-syne font-bold text-xl text-white mb-6">
          {debtToEdit ? 'Editar Deuda' : 'Nueva Deuda'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Nombre de la Deuda</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
              placeholder="Ej. Préstamo de Nico"
              required
            />
          </div>

          {/* Total Amount */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Monto Total</label>
            <input
              type="text"
              inputMode="decimal"
              value={totalAmount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                if (val.split('.').length > 2) return;
                setTotalAmount(val);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent font-syne font-bold"
              placeholder="0.00"
              required
            />
          </div>

          {/* Paid Amount (only on creation or view) */}
          {!debtToEdit && (
            <div>
              <label className="text-white/40 text-xs font-medium mb-1.5 block">Monto ya pagado (Opcional)</label>
              <input
                type="text"
                inputMode="decimal"
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setPaidAmount(val);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent font-syne"
                placeholder="0.00"
              />
            </div>
          )}

          {/* Abono (only on edit) */}
          {debtToEdit && (
            <div className="bg-white/5 p-4 rounded-xl space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Ya pagado:</span>
                <span className="text-white font-medium">${parseFloat(paidAmount || '0').toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Pendiente:</span>
                <span className="text-orange-400 font-medium">${(parseFloat(totalAmount || '0') - parseFloat(paidAmount || '0')).toFixed(2)}</span>
              </div>
              
              <div>
                <label className="text-white/40 text-xs font-medium mb-1.5 block">Monto a Abonar</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={abono}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                    if (val.split('.').length > 2) return;
                    setAbono(val);
                  }}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent font-syne font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-white/40 text-xs font-medium mb-1.5 block">Fecha del Abono</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent"
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
              className="w-full bg-gradient-to-r from-accent to-accent-dim text-black font-bold py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
            >
              {loading ? 'Guardando...' : debtToEdit ? 'Guardar Cambios' : 'Crear Deuda'}
            </button>

            {debtToEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="w-full bg-red-500/10 border border-red-500/20 text-red-500 font-bold py-3.5 rounded-xl hover:bg-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
              >
                Eliminar Deuda
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
