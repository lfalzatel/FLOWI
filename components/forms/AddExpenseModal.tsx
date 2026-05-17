'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useExpenses } from '@/hooks/useExpenses';
import { addExpense, updateExpense, EXPENSE_CATEGORIES, INCOME_CATEGORIES, Transaction } from '@/lib/firestore';

interface AddExpenseModalProps {
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction;
}

export function AddExpenseModal({ onClose, onSuccess, transactionToEdit }: AddExpenseModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<'gasto' | 'ingreso'>('gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const categories = type === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const { transactions } = useExpenses(type);
  
  const customCategories = Array.from(new Set(transactions.map(t => t.category)))
    .filter(cat => cat && !categories.some(c => c.label === cat));

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description || '');
      
      const isPredefined = categories.some(cat => cat.label === transactionToEdit.category);
      if (isPredefined) {
        setCategory(transactionToEdit.category);
      } else {
        setCategory('custom');
        setCustomCategory(transactionToEdit.category);
      }
      
      if (transactionToEdit.date) {
        const d = transactionToEdit.date instanceof Date ? transactionToEdit.date : new Date();
        setDate(d.toISOString().split('T')[0]);
      }
    }
  }, [transactionToEdit, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === 'custom' ? customCategory : category;
    if (!user || !amount || !finalCategory) return;

    setLoading(true);
    try {
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

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-md relative animate-fade-in-up">
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
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent appearance-none"
              required
            >
              <option value="" disabled className="bg-[#0A0A0F]">Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat.label} value={cat.label} className="bg-[#0A0A0F]">
                  {cat.icon} {cat.label}
                </option>
              ))}
              {customCategories.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0A0A0F]">
                  🏷️ {cat}
                </option>
              ))}
              <option value="custom" className="bg-[#0A0A0F]">➕ Nueva categoría...</option>
            </select>
          </div>

          {/* Custom Category Input */}
          {category === 'custom' && (
            <div>
              <label className="text-white/40 text-xs font-medium mb-1.5 block">Nombre de la Categoría</label>
              <input
                type="text"
                placeholder="Ej. Gimnasio"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
                required
              />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-accent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-white/40 text-xs font-medium mb-1.5 block">Descripción (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Almuerzo con amigos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-accent text-black font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Guardando...' : (transactionToEdit ? 'Guardar Cambios' : 'Guardar Transacción')}
          </button>
        </form>
      </div>
    </div>
  );
}
