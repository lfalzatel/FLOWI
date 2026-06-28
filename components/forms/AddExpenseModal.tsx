'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, ChevronDown, FolderPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction } from '@/lib/firestore';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { CategoryIcon } from '@/components/CategoryIcon';

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
  const [categoriesInitialView, setCategoriesInitialView] = useState<'list' | 'form'>('list');

  const [activeDropdownTab, setActiveDropdownTab] = useState<'Comida y Ocio' | 'Bancos y Finanzas' | 'Hogar y Servicios' | 'Marcas y Apps' | 'Otros'>('Comida y Ocio');

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const CATEGORIZED_ICONS = {
    'Comida y Ocio': [
      '🍔', '🍿', '🍺', '🚬', '🍷', '🍹', '☕', '🥖', '🍕', '🍰', '🍉', '🍦', '🥩', '🍳', '🍽️'
    ],
    'Bancos y Finanzas': [
      'bancolombia', 'nequi', 'bbva', '💰', '💵', '💳', '📈', '🏦', '🪙', '💎', '💼', '🐖', '🧾'
    ],
    'Hogar y Servicios': [
      'claro_hogar', 'claro_movil', '🏠', '🔌', '💧', '💡', '📶', '📡', '🧼', '🔨', '🔑', '🚪', '🛋️', '🪴', '🧹'
    ],
    'Marcas y Apps': [
      'netflix', 'spotify', 'google', 'youtube', 'yt music', 'exito', 'd1', 'drive', 'gmail', 'photos'
    ],
    'Otros': [
      '🚗', '⛽', '🚌', '✈️', '🏍️', '🚲', '🎮', '⚽', '🐶', '🐱', '🏥', '💊', '🎓', '👗', '🎁', '💈', '🏋️‍♂️'
    ]
  };

  // Helper para agrupar las categorías cargadas de Firestore en su respectiva pestaña
  const getCategoriesForTab = (tab: keyof typeof CATEGORIZED_ICONS) => {
    const iconsInTab = CATEGORIZED_ICONS[tab];
    return allCategories.filter(cat => {
      if (iconsInTab.includes(cat.icon)) return true;
      if (tab === 'Otros') {
        const isInAnyOtherTab = Object.entries(CATEGORIZED_ICONS).some(([t, icons]) => {
          return t !== 'Otros' && icons.includes(cat.icon);
        });
        return !isInAnyOtherTab;
      }
      return false;
    });
  };

  const categoriesInActiveTab = getCategoriesForTab(activeDropdownTab).filter(cat => 
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex-1 bg-white/5 border py-3 px-4 focus:outline-none text-left flex justify-between items-center ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent text-accent' : 'border-white/10 rounded-xl focus:border-accent text-white'}`}
              >
                <div className="flex items-center gap-2">
                  {category ? (
                    <>
                      {(() => {
                        const matchingCat = allCategories.find(c => c.label === category);
                        return (
                          <CategoryIcon 
                            icon={matchingCat?.icon || '📝'} 
                            label={category} 
                            className="w-5 h-5 text-xl flex items-center justify-center" 
                          />
                        );
                      })()}
                      <span>{category}</span>
                    </>
                  ) : (
                    <span className={isTechTheme ? 'text-accent/50' : 'text-white/50'}>Selecciona una categoría</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent/70' : 'text-white/40'}`} />
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCategoriesInitialView('form');
                  setIsManageCategoriesOpen(true);
                }}
                title="Nueva Categoría"
                className={`px-3.5 flex items-center justify-center border transition-all active:scale-95 ${
                  isTechTheme 
                    ? 'border-accent/30 bg-accent/10 text-accent hover:bg-accent hover:text-black rounded-none' 
                    : 'border-white/10 bg-white/5 text-[#D10074] hover:bg-[#FFD6EB]/10 rounded-xl'
                }`}
              >
                <FolderPlus className="w-5 h-5" />
              </button>
            </div>

            {isDropdownOpen && (
              <div className={`absolute z-20 top-full mt-2 w-full border shadow-2xl p-3 flex flex-col gap-2 ${isTechTheme ? 'bg-deep border-accent/50 rounded-none' : 'bg-[#0A0A0F] border-white/10 rounded-2xl'}`}>
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-white/5 border py-2 px-3 text-white placeholder-white/20 focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-white/10 rounded-xl focus:border-accent'}`}
                />
                
                {/* Selector agrupado vertical (2 Columnas) */}
                <div className="flex gap-2 h-40">
                  {/* Columna Izquierda: Pestañas de grupos */}
                  <div className="w-2/5 flex flex-col gap-1 overflow-y-auto pr-1 border-r border-white/10 select-none scrollbar-none">
                    {Object.keys(CATEGORIZED_ICONS).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveDropdownTab(tab as any)}
                        className={`px-2 py-2 text-left text-[9px] font-bold transition-all truncate ${
                          activeDropdownTab === tab
                            ? 'text-accent bg-accent/10 rounded-lg'
                            : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Columna Derecha: Categorías del grupo seleccionado */}
                  <div className="w-3/5 flex flex-col gap-1 overflow-y-auto pr-1">
                    {categoriesInActiveTab.length === 0 ? (
                      <p className="text-[10px] text-white/30 text-center py-8">Vacío</p>
                    ) : (
                      categoriesInActiveTab.map((cat) => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => { setCategory(cat.label); setIsDropdownOpen(false); setSearchQuery(''); }}
                          className={`w-full text-left py-2 px-2 hover:bg-white/5 text-xs flex items-center gap-2 rounded-lg text-white`}
                        >
                          <CategoryIcon icon={cat.icon} label={cat.label} className="w-4 h-4" />
                          <span className="flex-1 truncate">{cat.label}</span>
                          {cat.isCustom && <span className="text-[8px] px-1 py-0.2 bg-accent/10 text-accent rounded uppercase font-semibold">P.</span>}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { 
                    setIsDropdownOpen(false); 
                    setSearchQuery('');
                    setCategoriesInitialView('list');
                    setIsManageCategoriesOpen(true);
                  }}
                  className={`w-full text-left py-2 px-3 hover:bg-white/5 text-xs font-semibold flex items-center gap-2 border-t border-white/5 text-accent`}
                >
                  <span>+</span>
                  <span>Gestionar categorías...</span>
                </button>
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
        <ManageCategoriesModal 
          onClose={() => setIsManageCategoriesOpen(false)} 
          onCreated={(newLabel) => setCategory(newLabel)}
          initialView={categoriesInitialView}
        />
      )}
    </>
  );
}
