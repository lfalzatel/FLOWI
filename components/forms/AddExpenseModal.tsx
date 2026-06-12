'use client';
import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction } from '@/lib/firestore';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction;
}

export function AddExpenseModal({ onClose, onSuccess, transactionToEdit }: AddExpenseModalProps) {
  const { user } = useAuth();
  const { allCategories } = useCategories();
  
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

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
    if (!user || !amount || !category) return;

    setLoading(true);
    try {
      const data = {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        description,
        category,
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

  return (
    <>
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="font-syne font-bold text-xl text-white mb-6">
          {transactionToEdit ? 'Editar Transacción' : 'Nueva Transacción'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className="flex bg-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('gasto'); setCategory(''); } }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${type === 'gasto' ? 'bg-accent text-black' : 'text-white/60'} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('ingreso'); setCategory(''); } }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${type === 'ingreso' ? 'bg-accent text-black' : 'text-white/60'} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Ingreso
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">$</span>
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
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Categoría</label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent text-left flex justify-between items-center"
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
                  <span>Selecciona una categoría</span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>

            {isDropdownOpen && (
              <div className="absolute z-20 top-full mt-2 w-full bg-[#0A0A0F] border border-white/10 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto">
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder-white/20 focus:outline-none focus:border-accent mb-2"
                />
                <div className="space-y-1">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.label}
                      type="button"
                      onClick={() => { setCategory(cat.label); setIsDropdownOpen(false); setSearchQuery(''); }}
                      className="w-full text-left py-2 px-3 hover:bg-white/5 rounded-lg text-white text-sm flex items-center gap-2"
                    >
                      <span>{cat.icon}</span>
                      <span className="flex-1">{cat.label}</span>
                      {cat.isCustom && <span className="text-[10px] text-accent/50 border border-accent/20 px-1.5 py-0.5 rounded uppercase">Pers.</span>}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => { 
                      setIsDropdownOpen(false); 
                      setSearchQuery('');
                      setIsManageCategoriesOpen(true);
                    }}
                    className="w-full text-left py-3 px-3 hover:bg-white/5 rounded-lg text-sm text-accent font-semibold flex items-center gap-2 mt-2 border-t border-white/5"
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
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent [color-scheme:dark]"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Descripción (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Cena con amigos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amount || !category}
              className="w-full py-4 rounded-xl font-bold bg-accent text-black hover:bg-accent/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
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
                className="flex-1 py-3 rounded-xl font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                Eliminar
              </button>
              
              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={handleConvertToDebt}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Pasar a Deuda
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
    
    {isManageCategoriesOpen && (
      <ManageCategoriesModal onClose={() => setIsManageCategoriesOpen(false)} />
    )}
    </>
  );
}
