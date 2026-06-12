'use client';
import { useState } from 'react';
import { X, Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { addCustomCategory, updateCustomCategory, deleteCustomCategory, CustomCategory } from '@/lib/firestore';

const ICONS = ['📱', '🌐', '🍿', '💧', '💡', '🏢', '🔑', '⛽', '🔥', '🏦', '💳', '📦', '🍔', '🚌', '🎮', '🏠', '💰', '📈', '🎁', '🐶', '✈️', '👗', '💊', '🚗', '🎓', '🛒', '⚽'];
const COLORS = ['#FF5B5B', '#F5A623', '#A855F7', '#00E5A0', '#3B82F6', '#EC4899', '#E11D48', '#10B981', '#8B5CF6', '#F97316', '#EF4444', '#1D4ED8', '#FBBF24', '#D946EF', '#6B7280'];

interface Props {
  onClose: () => void;
}

export function ManageCategoriesModal({ onClose }: Props) {
  const { user } = useAuth();
  const { customCategories, refreshCategories } = useCategories();
  
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setLabel('');
    setIcon('📦');
    setColor('#6B7280');
    setEditingId(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (cat: CustomCategory) => {
    setLabel(cat.label);
    setIcon(cat.icon);
    setColor(cat.color);
    setEditingId(cat.id || null);
    setView('form');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta categoría? No borrará las transacciones antiguas.')) return;
    setLoading(true);
    try {
      await deleteCustomCategory(id);
      await refreshCategories();
    } catch (e) {
      console.error(e);
    } finally {
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
      }
      await refreshCategories();
      setView('list');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-[#0A0A0F] border border-white/10 p-6 rounded-t-3xl sm:rounded-3xl w-full max-w-md relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-syne font-bold text-xl text-white mb-6">
          {view === 'list' ? 'Mis Categorías' : (editingId ? 'Editar Categoría' : 'Nueva Categoría')}
        </h2>

        {view === 'list' && (
          <div className="space-y-4">
            <button 
              onClick={handleCreateNew}
              className="w-full flex items-center justify-center gap-2 bg-[#FFD6EB]/10 text-[#D10074] py-3 rounded-xl font-semibold hover:bg-[#FFD6EB]/20 transition"
            >
              <Plus className="w-5 h-5" />
              Crear Categoría
            </button>

            {customCategories.length === 0 ? (
              <p className="text-white/40 text-center text-sm py-8">Aún no has creado categorías personalizadas.</p>
            ) : (
              <div className="space-y-2 mt-4">
                {customCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <span className="text-white font-medium">{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(cat)} className="p-2 text-white/50 hover:text-white transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id!)} className="p-2 text-white/50 hover:text-red-400 transition" disabled={loading}>
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
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Nombre de la Categoría</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D10074] transition-colors"
                placeholder="Ej. Comida para el perro"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0F]' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">Icono</label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                {ICONS.map(i => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${icon === i ? 'bg-white/20 scale-110' : 'bg-white/5 hover:bg-white/10'}`}
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
                className="flex-1 py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !label.trim()}
                className="flex-1 py-3 rounded-xl font-bold bg-[#D10074] text-white hover:bg-[#D10074]/90 transition-all disabled:opacity-50"
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
