'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction } from '@/lib/firestore';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction;
  initialType?: 'gasto' | 'ingreso';
}

export function AddExpenseModal({ onClose, onSuccess, transactionToEdit, initialType = 'gasto' }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { allCategories } = useCategories();
  
  const [type, setType] = useState<'gasto' | 'ingreso'>(initialType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const filteredCategories = allCategories.filter(cat => 
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description || '');
      setCategory(transactionToEdit.category);
      
      if (transactionToEdit.date) {
        const d = transactionToEdit.date instanceof Date ? transactionToEdit.date : new Date();
        setDate(d.toISOString().split('T')[0]);
      }
    }
  }, [transactionToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setLoading(true);
    try {
      const finalCategory = category.trim() || 'Otros';
      const data = {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        description,
        category: finalCategory,
        date: new Date(date + 'T12:00:00'), // Evitar problemas de zona horaria
      };

      if (transactionToEdit?.id) {
        await updateExpense(transactionToEdit.id, data);
      } else {
        await addExpense(data);
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit?.id) return;
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta transacción?')) return;

    setLoading(true);
    try {
      await deleteExpense(transactionToEdit.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToDebt = async () => {
    if (!transactionToEdit?.id || !user) return;
    if (!window.confirm('¿Estás seguro de que quieres convertir este gasto en una deuda?')) return;

    setLoading(true);
    try {
      await addDebt({
        userId: user.uid,
        title: `${category} - ${description || 'Deuda'}`,
        totalAmount: parseFloat(amount),
        paidAmount: 0,
        status: 'pending',
      });
      await deleteExpense(transactionToEdit.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error converting to debt:', error);
    } finally {
      setLoading(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`} onClick={onClose}>
          <div 
            className={`w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'bg-[#0A0A0F] border border-white/10 rounded-t-3xl sm:rounded-3xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-white/50 hover:text-white'}`}>
              <X className="w-5 h-5" />
            </button>
        
        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-white mb-6'}`}>
          {transactionToEdit ? 'Editar Transacción' : 'Nueva Transacción'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className={`flex p-1 ${isTechTheme ? 'bg-glass backdrop-blur-3xl border border-glass-border shadow-2xl shadow-black/10 rounded-none' : 'bg-white/5 rounded-xl'}`}>
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('gasto'); setCategory(''); } }}
              className={`flex-1 py-2 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === 'gasto' ? `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-white/60')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('ingreso'); setCategory(''); } }}
              className={`flex-1 py-2 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === 'ingreso' ? `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-white/60')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Ingreso
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Monto</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${isTechTheme ? 'text-accent/70' : 'text-white/40'}`}>$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  if (val.split('.').length > 2) return;
                  setAmount(val);
                }}
                className={`w-full bg-white/5 border py-3 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent'}`}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Categoría</label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full bg-white/5 border py-3 px-4 focus:outline-none text-left flex justify-between items-center ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent text-accent' : 'border-white/10 rounded-xl focus:border-accent text-white'}`}
            >
              <div className="flex items-center gap-2">
                {category ? (
                  <>
                    <span className="text-xl">
                      {allCategories.find(c => c.label === category)?.icon || '📝'}
                    </span>
                    <span>{category}</span>
                  </>
                ) : (
                  <span className={isTechTheme ? 'text-accent/50' : 'text-white/50'}>Selecciona una categoría</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent/70' : 'text-white/40'}`} />
            </button>

            {isDropdownOpen && (
              <div className={`absolute z-20 top-full mt-2 w-full border shadow-2xl p-2 max-h-60 overflow-y-auto ${isTechTheme ? 'bg-deep border-accent/50 rounded-none' : 'bg-[#0A0A0F] border-white/10 rounded-xl'}`}>
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-white/5 border py-2 px-3 text-white placeholder-white/20 focus:outline-none mb-2 ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-lg focus:border-accent'}`}
                />
                <div className="space-y-1">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => { setCategory(cat.label); setIsDropdownOpen(false); setSearchQuery(''); }}
                      className={`w-full text-left py-2 px-3 hover:bg-white/5 text-sm flex items-center gap-2 ${isTechTheme ? 'rounded-none text-accent' : 'rounded-lg text-white'}`}
                    >
                      <span>{cat.icon}</span>
                      <span className="flex-1 truncate">{cat.label}</span>
                      {cat.isCustom && <span className={`text-[10px] px-1.5 py-0.5 uppercase ${isTechTheme ? 'text-accent/50 border border-accent/30' : 'text-accent/50 border border-accent/20 rounded'}`}>Pers.</span>}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => { 
                      setIsDropdownOpen(false); 
                      setSearchQuery('');
                      setIsManageCategoriesOpen(true);
                    }}
                    className={`w-full text-left py-3 px-3 hover:bg-white/5 text-sm font-semibold flex items-center gap-2 mt-2 border-t ${isTechTheme ? 'rounded-none text-accent border-accent/20' : 'rounded-lg text-accent border-white/5'}`}
                  >
                    <span>+</span>
                    <span>Nueva categoría...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full bg-white/5 border py-3 px-4 text-white focus:outline-none [color-scheme:dark] ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-white/10 rounded-xl focus:border-accent'}`}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-white/40'} text-xs font-medium mb-1.5 block`}>Descripción (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Cena con amigos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-white/5 border py-3 px-4 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent'}`}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amount}
              className={`w-full py-4 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 uppercase tracking-widest' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'} hover:bg-accent/90`}`}
            >
              {loading ? 'Guardando...' : transactionToEdit ? 'Guardar Cambios' : 'Añadir Transacción'}
            </button>
          </div>
          
          {transactionToEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
              >
                Eliminar
              </button>
              
              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={handleConvertToDebt}
                  disabled={loading}
                  className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-blue-500/10 border border-blue-500/50 text-blue-400 hover:bg-blue-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
                >
                  Pasar a Deuda
                </button>
              )}
            </div>
          )}
            </form>
          </div>
        </div>,
        document.body
      )}
      
      {isManageCategoriesOpen && (
        <ManageCategoriesModal onClose={() => setIsManageCategoriesOpen(false)} />
      )}
    </>
  );
}
