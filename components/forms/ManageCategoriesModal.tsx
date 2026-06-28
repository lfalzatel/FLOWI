'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, CategoryOption } from '@/hooks/useCategories';
import { addCustomCategory, updateCustomCategory, deleteCustomCategory, CustomCategory, hideBaseCategory } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeProvider';
import { CategoryIcon } from '@/components/CategoryIcon';

const CATEGORIZED_ICONS = {
  'Comida y Ocio': [
    '🍔', '🍿', '🍺', '🚬', '🍷', '🍹', '☕', '🥖', '🍕', '🍰', '🍉', '🍦', '🥩', '🍳', '🍽️'
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
    'parqueadero', 'cine', '🚗', '⛽', '🚌', '✈️', '🏍️', '🎮', '🐱', '🐶', '🏥', '💊', '🎓', '👗', '🎁', '💈'
  ]
};

const COLORS = ['#FF5B5B', '#F5A623', '#A855F7', '#00E5A0', '#3B82F6', '#EC4899', '#E11D48', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#1D4ED8', '#FBBF24', '#D946EF', '#6B7280'];

interface Props {
  onClose: () => void;
  onCreated?: (label: string) => void;
  initialView?: 'list' | 'form';
}

export function ManageCategoriesModal({ onClose, onCreated, initialView = 'list' }: Props) {
  const { user, profile } = useAuth();
  const { allCategories, refreshCategories } = useCategories();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  
  const [view, setView] = useState<'list' | 'form'>(initialView);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [baseCategoryToHide, setBaseCategoryToHide] = useState<string | null>(null);
  
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof CATEGORIZED_ICONS>('Comida y Ocio');

  // Bloquear scroll del body mientras el modal esté abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const resetForm = () => {
    setLabel('');
    setIcon('📦');
    setColor('#6B7280');
    setEditingId(null);
    setBaseCategoryToHide(null);
    setActiveTab('Comida y Ocio');
  };

  const handleCreateNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (cat: CategoryOption) => {
    setLabel(cat.label);
    setIcon(cat.icon);
    setColor(cat.color);
    setEditingId(cat.id || null);
    if (!cat.isCustom) {
      setBaseCategoryToHide(cat.label);
    } else {
      setBaseCategoryToHide(null);
    }
    
    // Auto-detectar la pestaña correcta del icono actual
    let foundTab: keyof typeof CATEGORIZED_ICONS = 'Comida y Ocio';
    for (const [tab, icons] of Object.entries(CATEGORIZED_ICONS)) {
      if (icons.includes(cat.icon)) {
        foundTab = tab as keyof typeof CATEGORIZED_ICONS;
        break;
      }
    }
    setActiveTab(foundTab);
    setView('form');
  };

  const handleDelete = async (cat: CategoryOption) => {
    // Si no es personalizado y no es admin, no permitir
    const isSystemAdmin = profile?.role === 'admin';
    if (!cat.isCustom && !isSystemAdmin) return;

    if (!window.confirm(`¿Eliminar la categoría "${cat.label}"? No borrará las transacciones antiguas.`)) return;
    setLoading(true);
    try {
      if (cat.isCustom && cat.id) {
        await deleteCustomCategory(cat.id);
      } else if (user) {
        await hideBaseCategory(user.uid, cat.label);
      }
      await refreshCategories();
      // Pequeña espera para que la suscripción en tiempo real de Firebase se actualice
      setTimeout(() => setLoading(false), 500);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !label.trim()) return;

    setLoading(true);
    try {
      if (editingId) {
        await updateCustomCategory(editingId, { label, icon, color });
      } else {
        await addCustomCategory({
          userId: user.uid,
          label,
          icon,
          color
        });
        // Si hay una categoría por defecto con el mismo nombre, la ocultamos incondicionalmente
        const baseMatch = allCategories.find(c => !c.isCustom && c.label.toLowerCase() === label.trim().toLowerCase());
        if (baseMatch) {
          await hideBaseCategory(user.uid, baseMatch.label);
        } else if (baseCategoryToHide) {
          await hideBaseCategory(user.uid, baseCategoryToHide);
        }
      }
      await refreshCategories();
      // Pequeña espera para asegurar que Firebase actualice el estado global
      setTimeout(() => {
        setLoading(false);
        if (!editingId && onCreated) {
          onCreated(label);
          onClose();
        } else {
          setView('list');
        }
      }, 500);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  // Helper para filtrar las categorías del listado general según la pestaña activa
  const getFilteredCategoriesForTab = () => {
    const iconsInTab = CATEGORIZED_ICONS[activeTab];
    return allCategories.filter(cat => {
      // Si el icono de la categoría está en la pestaña activa
      if (iconsInTab.includes(cat.icon)) return true;
      // Si es la pestaña 'Otros' y el icono no está en ninguna otra pestaña
      if (activeTab === 'Otros') {
        const isInAnyOtherTab = Object.entries(CATEGORIZED_ICONS).some(([tab, icons]) => {
          return tab !== 'Otros' && icons.includes(cat.icon);
        });
        return !isInAnyOtherTab;
      }
      return false;
    });
  };

  const filteredCategoriesForList = getFilteredCategoriesForTab();

  const isSystemAdmin = profile?.role === 'admin';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`} onClick={onClose}>
      <div className={`w-full max-w-md relative animate-fade-in-up max-h-[90vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'}`} onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => {
            if (view === 'form' && initialView === 'form') {
              onClose();
            } else if (view === 'form') {
              setView('list');
            } else {
              onClose();
            }
          }} 
          className={`absolute top-4 right-4 hover:text-white transition-colors ${isTechTheme ? 'text-accent' : 'text-white/50'}`}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className={`font-bold text-xl mb-6 ${isTechTheme ? 'text-accent uppercase tracking-widest' : 'font-syne text-white'}`}>
          {view === 'list' ? 'Mis Categorías' : (editingId ? 'Editar Categoría' : 'Nueva Categoría')}
        </h2>

        {view === 'list' && (
          <div className="space-y-4">
            <button 
              onClick={handleCreateNew}
              className={`w-full flex items-center justify-center gap-2 py-3 font-semibold transition ${
                isTechTheme 
                  ? 'bg-accent/10 border border-accent text-accent hover:bg-accent hover:text-black uppercase tracking-wider' 
                  : 'bg-[#FFD6EB]/10 text-[#D10074] rounded-xl hover:bg-[#FFD6EB]/20'
              }`}
            >
              <Plus className="w-5 h-5" />
              Crear Categoría
            </button>

            {/* Selector agrupado vertical (2 Columnas) */}
            <div className="flex gap-3 h-64">
              {/* Columna Izquierda: Pestañas de grupos */}
              <div className="w-2/5 flex flex-col gap-1 overflow-y-auto pr-1 border-r border-white/10 select-none scrollbar-none">
                {Object.keys(CATEGORIZED_ICONS).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-2 py-2 text-left text-[10px] font-bold transition-all truncate ${
                      activeTab === tab
                        ? 'text-accent bg-accent/10 rounded-lg'
                        : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Columna Derecha: Categorías de la pestaña seleccionada */}
              <div className="w-3/5 flex flex-col gap-2 overflow-y-auto pr-1">
                {filteredCategoriesForList.length === 0 ? (
                  <p className={`text-center text-xs py-10 ${isTechTheme ? 'text-accent/50' : 'text-white/40'}`}>
                    Sin categorías.
                  </p>
                ) : (
                  filteredCategoriesForList.map((cat, i) => (
                    <div key={cat.id || `base-${i}`} className={`flex items-center justify-between p-2.5 border ${isTechTheme ? 'bg-black/40 border-accent/20 hover:border-accent/50' : 'rounded-xl bg-white/5 border-white/5'}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-lg ${!isTechTheme && 'rounded-full'}`} style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <CategoryIcon icon={cat.icon} label={cat.label} className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold truncate text-xs ${isTechTheme ? 'text-accent' : 'text-white'}`}>{cat.label}</p>
                          <span className={`text-[8px] px-1 py-0.1 font-mono ${isTechTheme ? 'text-accent/50 border border-accent/20' : 'text-white/30 border border-white/10 rounded'}`}>
                            {cat.isCustom ? 'PERS.' : 'DEF.'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        {(cat.isCustom || isSystemAdmin) && (
                          <>
                            <button onClick={() => handleEdit(cat)} className={`p-1.5 transition ${isTechTheme ? 'text-accent/60 hover:text-accent' : 'text-white/50 hover:text-white'}`}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(cat)} className="p-1.5 text-red-400/60 hover:text-red-400 transition" disabled={loading}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/50'}`}>Nombre de la Categoría</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={`w-full px-4 py-3 text-white placeholder:text-white/20 focus:outline-none transition-colors ${
                  isTechTheme 
                    ? 'bg-black border border-accent/30 focus:border-accent font-mono' 
                    : 'bg-white/5 border border-white/10 rounded-xl focus:border-[#D10074]'
                }`}
                placeholder="Ej. Comida para el perro"
                required
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/50'}`}>Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 transition-transform ${
                      !isTechTheme && 'rounded-full'
                    } ${
                      color === c 
                        ? (isTechTheme ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-deep border-2 border-black' : 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0F]') 
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/50'}`}>Icono</label>
              
              {/* Contenedor de Dos Columnas (Vertical Tabs a la Izquierda, Grid de Iconos a la Derecha) */}
              <div className="flex gap-3 h-48">
                
                {/* Columna Izquierda: Pestañas Verticales */}
                <div className="w-1/3 flex flex-col gap-1 overflow-y-auto pr-1 border-r border-white/10 select-none">
                  {Object.keys(CATEGORIZED_ICONS).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-2 py-2.5 text-left text-[11px] font-bold transition-all ${
                        activeTab === tab
                          ? (isTechTheme ? 'text-black bg-accent' : 'text-accent bg-accent/10 rounded-lg')
                          : (isTechTheme ? 'text-accent/60 hover:text-accent hover:bg-accent/5' : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg')
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Columna Derecha: Grid de Iconos */}
                <div className="w-2/3 grid grid-cols-4 gap-2 overflow-y-auto p-1 bg-black/20 border border-white/5 rounded-xl">
                  {CATEGORIZED_ICONS[activeTab].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`aspect-square flex items-center justify-center text-2xl transition-all ${!isTechTheme && 'rounded-xl'} ${
                        icon === i 
                          ? (isTechTheme ? 'bg-accent/20 border border-accent scale-110' : 'bg-white/20 scale-110') 
                          : (isTechTheme ? 'bg-white/5 hover:bg-accent/10 hover:border hover:border-accent/50' : 'bg-white/5 hover:bg-white/10')
                      }`}
                    >
                      <CategoryIcon icon={i} label={i} className="w-6 h-6" />
                    </button>
                  ))}
                </div>

              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setView('list')}
                className={`flex-1 py-3 font-bold transition-all ${
                  isTechTheme
                    ? 'border border-white/30 text-white hover:bg-white/10 uppercase tracking-wide'
                    : 'bg-white/10 text-white rounded-xl hover:bg-white/20'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !label.trim()}
                className={`flex-1 py-3 font-bold transition-all disabled:opacity-50 ${
                  isTechTheme
                    ? 'bg-accent text-black hover:bg-accent-hover uppercase tracking-wide'
                    : 'bg-[#D10074] text-white rounded-xl hover:bg-[#D10074]/90'
                }`}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
