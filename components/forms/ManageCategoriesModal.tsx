'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, CategoryOption } from '@/hooks/useCategories';
import { addCustomCategory, updateCustomCategory, deleteCustomCategory, CustomCategory, hideBaseCategory } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeProvider';

const ICONS = ['📱', '🌐', '🍿', '💧', '💡', '🏢', '🔑', '⛽', '🔥', '🏦', '💳', '📦', '🍔', '🚌', '🎮', '🏠', '💰', '📈', '🎁', '🐶', '✈️', '👗', '💊', '🚗', '🎓', '🛒', '⚽'];
const COLORS = ['#FF5B5B', '#F5A623', '#A855F7', '#00E5A0', '#3B82F6', '#EC4899', '#E11D48', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#1D4ED8', '#FBBF24', '#D946EF', '#6B7280'];

interface Props {
  onClose: () => void;
}

export function ManageCategoriesModal({ onClose }: Props) {
  const { user } = useAuth();
  const { allCategories, refreshCategories } = useCategories();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [baseCategoryToHide, setBaseCategoryToHide] = useState<string | null>(null);
  
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setLabel('');
    setIcon('📦');
    setColor('#6B7280');
    setEditingId(null);
    setBaseCategoryToHide(null);
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
    setView('form');
  };

  const handleDelete = async (cat: CategoryOption) => {
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
        if (baseCategoryToHide) {
          await hideBaseCategory(user.uid, baseCategoryToHide);
        }
      }
      await refreshCategories();
      // Pequeña espera para asegurar que Firebase actualice el estado global
      setTimeout(() => {
        setLoading(false);
        setView('list');
      }, 500);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`w-full max-w-md relative animate-fade-in-up max-h-[90vh] overflow-y-auto p-6 ${isTechTheme ? 'bg-deep border border-accent/30 rounded-none' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 hover:text-white transition-colors ${isTechTheme ? 'text-accent' : 'text-white/50'}`}>
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

            {allCategories.length === 0 ? (
              <p className={`text-center text-sm py-8 ${isTechTheme ? 'text-accent/50' : 'text-white/40'}`}>Aún no hay categorías disponibles.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {allCategories.map((cat, i) => (
                  <div key={cat.id || `base-${i}`} className={`flex items-center justify-between p-3 border ${isTechTheme ? 'bg-black/40 border-accent/20 hover:border-accent/50' : 'rounded-xl bg-white/5 border-white/5'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 flex items-center justify-center text-xl ${!isTechTheme && 'rounded-full'}`} style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <span className={`font-medium ${isTechTheme ? 'text-text-primary tracking-wide' : 'text-white'}`}>{cat.label}</span>
                      {!cat.isCustom && <span className={`text-[9px] px-1.5 py-0.5 ml-2 uppercase ${isTechTheme ? 'text-accent/70 border border-accent/30' : 'bg-white/10 text-white/50 rounded'}`}>Defecto</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(cat)} className={`p-2 transition ${isTechTheme ? 'text-accent/60 hover:text-accent' : 'text-white/50 hover:text-white'}`}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat)} className="p-2 text-red-400/60 hover:text-red-400 transition" disabled={loading}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                {ICONS.map(i => (
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
                    {i}
                  </button>
                ))}
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
    </div>
  );
}
