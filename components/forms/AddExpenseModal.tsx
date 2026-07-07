'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { X, ChevronDown, FolderPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { getLocalDateString } from '@/lib/dateUtils';
import { addExpense, updateExpense, deleteExpense, addDebt, Transaction } from '@/lib/firestore';
import { ManageCategoriesModal } from '@/components/forms/ManageCategoriesModal';
import { CategoryIcon } from '@/components/CategoryIcon';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { triggerPowerAnimation } from '@/components/dashboard/PowerAnimation';

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
  const [date, setDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ConfirmDialog states
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmConvert, setShowConfirmConvert] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [categoriesInitialView, setCategoriesInitialView] = useState<'list' | 'form'>('list');

  const [activeDropdownTab, setActiveDropdownTab] = useState<'Comida y Ocio' | 'Bancos y Finanzas' | 'Hogar y Servicios' | 'Marcas y Apps' | 'Deportes' | 'Otros'>('Comida y Ocio');

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
      '🍽️', '🍔', '🛒', '☕', '🍺', '🍿', '🍕', 'cine', '🍷', '🍹', '🚬', '🥖', '🍰', '🍉', '🍦', '🥩', '🍳'
    ],
    'Bancos y Finanzas': [
      'bancolombia', 'nequi', 'bbva', 'daviplata', 'davivienda', '💰', '💵', '💳', '📈', '🏦', '🪙', '💎', '💼', '🐖', '🧾'
    ],
    'Hogar y Servicios': [
      'claro_hogar', 'claro_movil', 'epm', 'efigas', 'alcanos', '🏢', '🏠', '🔌', '💧', '💡', '📶', '📡', '🧼', '🔨', '🔑', '🚪', '🛋️', '🪴', '🧹'
    ],
    'Marcas y Apps': [
      'netflix', 'spotify', 'google', 'play_store', 'youtube', 'yt music', 'exito', 'd1', 'olimpica', 'jumbo', 'carulla', 'homecenter', 'ktronix', 'panamericana', 'frisby', 'popsy', 'drive', 'gmail', 'photos'
    ],
    'Deportes': [
      'deportes', 'decathlon', 'nike', 'adidas', '⚽', '🏋️‍♂️', '🚲', '🏃‍♂️'
    ],
    'Otros': [
      'parqueadero', '🚗', '⛽', '🚌', '✈️', '🏍️', '🎮', '🐱', '🐶', '🏥', '💊', '🎓', '👗', '🎁', '💈'
    ]
  };

  // Clasificación inteligente de pestañas por palabras clave en el nombre
  const getTabByKeywords = (label: string): keyof typeof CATEGORIZED_ICONS | null => {
    const text = label.toLowerCase();
    if (/comida|restaurante|almuerzo|cena|desayuno|mercado|supermercado|cafe|café|panaderia|panadería|antojo|snack|licor|bar|cerveza|trago|bebida|cigarro|popsy|frisby|helado/.test(text)) {
      return 'Comida y Ocio';
    }
    if (/banco|tarjeta|credito|crédito|ahorro|inversion|inversión|prestamo|préstamo|nequi|bancolombia|bbva|daviplata|davivienda|plata|efectivo|nomina|nómina|sueldo/.test(text)) {
      return 'Bancos y Finanzas';
    }
    if (/claro|movistar|tigo|wom|epm|efigas|alcanos|agua|luz|energia|energía|gas|internet|television|televisión|telefono|teléfono|hogar|arriendo|alquiler|administracion|administración|apartamento|apto/.test(text)) {
      return 'Hogar y Servicios';
    }
    if (/netflix|spotify|google|youtube|yt music|drive|gmail|photos|play store|playstore|app|susbcripcion|suscripción/.test(text)) {
      return 'Marcas y Apps';
    }
    if (/deporte|gym|gimnasio|fitness|piscina|natacion|natación|futbol|fútbol|ciclo|ciclismo|bici|bicicleta|run|running|atletismo|nike|adidas|decathlon/.test(text)) {
      return 'Deportes';
    }
    return null;
  };

  // Helper para agrupar las categorías cargadas de Firestore en su respectiva pestaña
  const getCategoriesForTab = (tab: keyof typeof CATEGORIZED_ICONS) => {
    const iconsInTab = CATEGORIZED_ICONS[tab];
    return allCategories.filter(cat => {
      // 1. Intentar clasificar por palabras clave en el nombre primero
      const keywordTab = getTabByKeywords(cat.label);
      if (keywordTab) return keywordTab === tab;

      // 2. Si no hay palabras clave, clasificar por el icono asignado
      if (iconsInTab.includes(cat.icon)) return true;

      // 3. Caer en 'Otros' si no pertenece a ninguna pestaña
      if (tab === 'Otros') {
        const isInAnyOtherTab = Object.entries(CATEGORIZED_ICONS).some(([t, icons]) => {
          return t !== 'Otros' && icons.includes(cat.icon);
        });
        return !isInAnyOtherTab;
      }
      return false;
    });
  };

  // Si hay búsqueda escrita, buscar de manera global en todas las categorías sin importar la pestaña
  const categoriesInActiveTab = searchQuery.trim() !== ''
    ? allCategories.filter(cat => cat.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : getCategoriesForTab(activeDropdownTab);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description || '');
      setCategory(transactionToEdit.category);
      
      if (transactionToEdit.date) {
        const d = transactionToEdit.date instanceof Date ? transactionToEdit.date : new Date();
        setDate(getLocalDateString(d));
      }
    }
  }, [transactionToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount) return;

    setLoading(true);
    try {
      const finalCategory = category.trim() || 'Otros';
      
      // Obtener fecha y hora exacta
      const todayStr = getLocalDateString(); // Formato YYYY-MM-DD
      let finalDate: Date;
      if (date === todayStr) {
        // Si es hoy, adjuntar la hora real actual
        const now = new Date();
        const [year, month, day] = date.split('-').map(Number);
        finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
      } else {
        // Si es otro día, usar las 12:00:00 locales
        const [year, month, day] = date.split('-').map(Number);
        finalDate = new Date(year, month - 1, day, 12, 0, 0);
      }

      const data = {
        userId: user.uid,
        type,
        amount: parseFloat(amount),
        description,
        category: finalCategory,
        date: finalDate,
      };

      const numericAmount = parseFloat(amount);

      if (transactionToEdit?.id) {
        await updateExpense(transactionToEdit.id, data);
        triggerPowerAnimation(numericAmount, 'edicion');
      } else {
        await addExpense(data);
        triggerPowerAnimation(numericAmount, type);
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
    setLoading(true);
    try {
      const deletedAmount = parseFloat(amount) || 0;
      await deleteExpense(transactionToEdit.id);
      triggerPowerAnimation(deletedAmount, 'eliminacion');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setLoading(false);
      setShowConfirmDelete(false);
    }
  };

  const handleConvertToDebt = async () => {
    if (!transactionToEdit?.id || !user) return;
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
      setShowConfirmConvert(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`} onClick={onClose}>
          <div 
            className={`w-full max-w-md relative animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'bg-card backdrop-blur-2xl border border-glass-border rounded-3xl'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
              <X className="w-5 h-5" />
            </button>
        
        <h2 className={`${isTechTheme ? 'font-bold text-xl text-accent mb-6 tracking-wide border-b border-accent/20 pb-2' : 'font-syne font-bold text-xl text-text-primary mb-6'}`}>
          {transactionToEdit ? 'Editar Transacción' : 'Nueva Transacción'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Toggle */}
          <div className={`flex p-1 ${isTechTheme ? 'bg-glass backdrop-blur-3xl border border-glass-border shadow-2xl shadow-black/10 rounded-none' : 'bg-glass border border-glass-border rounded-xl'}`}>
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('gasto'); setCategory(''); } }}
              className={`flex-1 py-2 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === 'gasto' ? `bg-accent text-white shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-text-secondary')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Gasto
            </button>
            <button
              type="button"
              onClick={() => { if (!transactionToEdit) { setType('ingreso'); setCategory(''); } }}
              className={`flex-1 py-2 text-sm font-bold tracking-wide transition-all ${isTechTheme ? 'rounded-none border border-transparent uppercase' : 'rounded-lg'} ${type === 'ingreso' ? `bg-accent text-white shadow-md ${isTechTheme ? 'border border-accent' : ''}` : (isTechTheme ? 'text-accent hover:opacity-80' : 'text-text-secondary')} ${transactionToEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!!transactionToEdit}
            >
              Ingreso
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Monto</label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-medium ${isTechTheme ? 'text-accent/70' : 'text-text-secondary'}`}>$</span>
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
                className={`w-full bg-glass border py-3 pl-8 pr-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
                required
              />
            </div>
          </div>

          {/* Category */}
          <div className="relative">
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Categoría</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex-1 bg-glass border py-3 px-4 focus:outline-none text-left flex justify-between items-center ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent text-accent' : 'border-glass-border rounded-xl focus:border-accent text-text-primary'}`}
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
                    <span className={isTechTheme ? 'text-accent/50' : 'text-text-muted'}>Selecciona una categoría</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent/70' : 'text-text-muted'}`} />
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
                    : 'border-glass-border bg-glass text-[#D10074] hover:bg-[#FFD6EB]/10 rounded-xl'
                }`}
              >
                <FolderPlus className="w-5 h-5" />
              </button>
            </div>

            {isDropdownOpen && (
              <div className={`absolute z-20 top-full mt-2 w-full border shadow-2xl p-3 flex flex-col gap-2 ${isTechTheme ? 'bg-deep border-accent/50 rounded-none' : 'bg-card border-glass-border rounded-2xl'}`}>
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full bg-glass border py-2 px-3 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
                />
                
                {/* Selector agrupado vertical (2 Columnas) */}
                <div className="flex gap-2 h-40">
                  {/* Columna Izquierda: Pestañas de grupos */}
                  <div className="w-2/5 flex flex-col gap-1 overflow-y-auto pr-1 border-r border-glass-border select-none scrollbar-none">
                    {Object.keys(CATEGORIZED_ICONS).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveDropdownTab(tab as any)}
                        className={`px-2 py-2 text-left text-[9px] font-bold transition-all truncate ${
                          activeDropdownTab === tab
                            ? 'text-accent bg-accent/10 rounded-lg'
                            : 'text-text-secondary hover:text-text-primary hover:bg-glass rounded-lg'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Columna Derecha: Categorías del grupo seleccionado */}
                  <div className="w-3/5 flex flex-col gap-1 overflow-y-auto pr-1">
                    {categoriesInActiveTab.length === 0 ? (
                      <p className="text-[10px] text-text-muted text-center py-8">Vacío</p>
                    ) : (
                      categoriesInActiveTab.map((cat) => (
                        <button
                          key={cat.label}
                          type="button"
                          onClick={() => { setCategory(cat.label); setIsDropdownOpen(false); setSearchQuery(''); }}
                          className={`w-full text-left py-2 px-2 hover:bg-glass text-xs flex items-center gap-2 rounded-lg text-text-primary`}
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
                  className={`w-full text-left py-2 px-3 hover:bg-glass text-xs font-semibold flex items-center gap-2 border-t border-glass-border text-accent`}
                >
                  <span>+</span>
                  <span>Gestionar categorías...</span>
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full bg-glass border py-3 px-4 text-text-primary focus:outline-none ${theme === 'dark' || isTechTheme ? '[color-scheme:dark]' : '[color-scheme:light]'} ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono text-accent' : 'border-glass-border rounded-xl focus:border-accent'}`}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={`${isTechTheme ? 'text-accent/70' : 'text-text-muted'} text-xs font-medium mb-1.5 block`}>Descripción (Opcional)</label>
            <input
              type="text"
              placeholder="Ej. Cena con amigos"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full bg-glass border py-3 px-4 text-text-primary placeholder-text-muted focus:outline-none ${isTechTheme ? 'border-accent/30 rounded-none focus:border-accent font-mono' : 'border-glass-border rounded-xl focus:border-accent'}`}
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !amount}
              className={`w-full py-4 font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent hover:bg-accent/30 uppercase tracking-widest' : `rounded-xl bg-accent text-white hover:bg-accent/90`}`}
            >
              {loading ? 'Guardando...' : transactionToEdit ? 'Guardar Cambios' : 'Añadir Transacción'}
            </button>
          </div>
          
          {transactionToEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={loading}
                className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-red-500/10 border border-red-500/50 text-red-400 hover:bg-red-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs'}`}
              >
                Eliminar
              </button>
              
              {type === 'gasto' && (
                <button
                  type="button"
                  onClick={() => setShowConfirmConvert(true)}
                  disabled={loading}
                  className={`flex-1 py-3 font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${isTechTheme ? 'rounded-none bg-blue-500/10 border border-blue-500/50 text-blue-400 hover:bg-blue-500/20 uppercase tracking-wider text-xs' : 'rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs'}`}
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

      {/* Dialogs de confirmación style consola */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onCancel={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar Transacción"
        message="¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer y afectará tu balance."
        confirmText="Eliminar"
      />

      <ConfirmDialog
        isOpen={showConfirmConvert}
        onCancel={() => setShowConfirmConvert(false)}
        onConfirm={handleConvertToDebt}
        title="Pasar a Deuda"
        message="¿Estás seguro de que quieres convertir este gasto en una deuda activa? Se creará una deuda pendiente y se eliminará este gasto."
        confirmText="Convertir"
      />
      
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
