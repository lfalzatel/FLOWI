'use client';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Edit2, Search, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCategories, CategoryOption } from '@/hooks/useCategories';
import { addCustomCategory, updateCustomCategory, deleteCustomCategory, CustomCategory, hideBaseCategory } from '@/lib/firestore';
import { useTheme } from '@/components/ThemeProvider';
import { CategoryIcon } from '@/components/CategoryIcon';

const CATEGORIZED_ICONS = {
  'Comida y Ocio': [
    '🍽️', '🍔', '🛒', '☕', '🍺', '🍿', '🍕', 'cine', '🍷', '🍹', '🚬', '🥖', '🍰', '🍉', '🍦', '🥩', '🍳', '🥦', '🥐'
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
    'parqueadero', '🚗', '⛽', '🚌', '✈️', '🏍️', '🎮', '🐱', '🐶', '🏥', '💊', '🎓', '👗', '🎁', '💈', '🐾', '📚', 'snicker', '👟'
  ]
};

const MAIN_CATEGORY_ICONS: Record<string, string> = {
  'Comida y Ocio': '🍽️',
  'Bancos y Finanzas': '🏦',
  'Hogar y Servicios': '🏠',
  'Marcas y Apps': '📱',
  'Deportes': '⚽',
  'Otros': '📦'
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

  // Estados de formulario
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('📦');
  const [color, setColor] = useState('#6B7280');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof CATEGORIZED_ICONS>('Comida y Ocio');

  // Buscador y acordeones
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'custom' | 'default'>('all');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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
        const baseMatch = allCategories.find(c => !c.isCustom && c.label.toLowerCase() === label.trim().toLowerCase());
        if (baseMatch) {
          await hideBaseCategory(user.uid, baseMatch.label);
        } else if (baseCategoryToHide) {
          await hideBaseCategory(user.uid, baseCategoryToHide);
        }
      }
      await refreshCategories();
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

  const getTabByKeywords = (label: string): keyof typeof CATEGORIZED_ICONS | null => {
    const text = label.toLowerCase();
    if (/comida|restaurante|almuerzo|cena|desayuno|mercado|supermercado|cafe|café|panaderia|panadería|antojo|snack|licor|bar|cerveza|trago|bebida|cigarro|popsy|frisby|helado|verdura|fruta|vegetal|carne|carniceria|carnicería|pan/.test(text)) {
      return 'Comida y Ocio';
    }
    if (/banco|tarjeta|credito|crédito|ahorro|inversion|inversión|prestamo|préstamo|nequi|bancolombia|bbva|daviplata|davivienda|plata|efectivo|nomina|nómina|sueldo/.test(text)) {
      return 'Bancos y Finanzas';
    }
    if (/claro|movistar|tigo|wom|epm|efigas|alcanos|agua|luz|energia|energía|gas|internet|television|televisión|telefono|teléfono|hogar|arriendo|alquiler|administracion|administración|apartamento|apto|aseo|limpieza/.test(text)) {
      return 'Hogar y Servicios';
    }
    if (/netflix|spotify|google|youtube|yt music|drive|gmail|photos|play store|playstore|app|susbcripcion|suscripción/.test(text)) {
      return 'Marcas y Apps';
    }
    if (/deporte|gym|gimnasio|fitness|piscina|natacion|natación|futbol|fútbol|ciclo|ciclismo|bici|bicicleta|run|running|atletismo|nike|adidas|decathlon/.test(text)) {
      return 'Deportes';
    }
    if (/mascota|mascotas|perro|gato|medico|médico|salud|droga|farmacia|drogueria|droguería|doctor|educacion|educación|estudio|colegio|universidad|libro|libros|ropa|calzado|zapatos|vestir/.test(text)) {
      return 'Otros';
    }
    return null;
  };

  const getCategoryGroup = (cat: CategoryOption): keyof typeof CATEGORIZED_ICONS => {
    const keywordTab = getTabByKeywords(cat.label);
    if (keywordTab) return keywordTab;

    for (const [tab, icons] of Object.entries(CATEGORIZED_ICONS)) {
      if (icons.includes(cat.icon)) return tab as keyof typeof CATEGORIZED_ICONS;
    }
    return 'Otros';
  };

  // Agrupación inteligente de subcategorías por Categoría Principal
  const groupedCategories = useMemo(() => {
    const groups: Record<keyof typeof CATEGORIZED_ICONS, CategoryOption[]> = {
      'Comida y Ocio': [],
      'Bancos y Finanzas': [],
      'Hogar y Servicios': [],
      'Marcas y Apps': [],
      'Deportes': [],
      'Otros': []
    };

    allCategories.forEach(cat => {
      if (filterType === 'custom' && !cat.isCustom) return;
      if (filterType === 'default' && cat.isCustom) return;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = cat.label.toLowerCase().includes(q);
        const matchesIcon = cat.icon.toLowerCase().includes(q);
        if (!matchesName && !matchesIcon) return;
      }

      const group = getCategoryGroup(cat);
      groups[group].push(cat);
    });

    return groups;
  }, [allCategories, searchQuery, filterType]);

  const totalFilteredCount = useMemo(() => {
    return Object.values(groupedCategories).reduce((acc, list) => acc + list.length, 0);
  }, [groupedCategories]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const toggleExpandAll = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    Object.keys(CATEGORIZED_ICONS).forEach(key => {
      nextState[key] = expand;
    });
    setExpandedGroups(nextState);
  };

  const isSystemAdmin = profile?.role === 'admin';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div 
        className={`absolute inset-0 transition-opacity ${theme === 'light' ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-md'}`} 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Modal Container con ancho del 90% (w-[92vw] max-w-5xl) y altura del 85% (h-[85vh]) */}
      <div 
        className={`w-[92vw] max-w-5xl h-[85vh] max-h-[85vh] relative z-10 animate-fade-in-up flex flex-col glass-dropdown overflow-hidden ${
          isTechTheme ? 'rounded-none border border-accent/50 bg-black/90' : 'rounded-3xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isTechTheme ? 'border-accent/30 bg-accent/5' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-center gap-3">
            <h2 className={`font-bold text-xl sm:text-2xl ${isTechTheme ? 'text-accent uppercase tracking-widest' : 'font-syne text-text-primary'}`}>
              {view === 'list' ? 'Mis Categorías' : (editingId ? 'Editar Categoría' : 'Nueva Categoría')}
            </h2>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
              isTechTheme ? 'border-accent/40 text-accent bg-accent/10' : 'border-glass-border text-text-secondary bg-glass'
            }`}>
              {view === 'list' ? `${totalFilteredCount} categorías` : (editingId ? 'Edición' : 'Creación')}
            </span>
          </div>

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
            className={`p-2 rounded-xl transition-all ${
              isTechTheme ? 'text-accent hover:bg-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VISTA DE LISTA CON BUSCADOR Y GRIDS RESPONSIVOS */}
        {view === 'list' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Barra de Control Superior organizada en 2 Líneas compactas sin desbordamiento */}
            <div className={`px-3 sm:px-6 py-2.5 border-b flex flex-col gap-2.5 ${
              isTechTheme ? 'border-accent/20 bg-black/40' : 'border-white/5 bg-white/[0.02]'
            }`}>
              {/* LÍNEA 1: Buscador (flexible) + Botón Crear Categoría (Misma línea, ajustado a pantalla) */}
              <div className="flex items-center justify-between gap-2 sm:gap-3 w-full min-w-0">
                {/* Buscador */}
                <div className="flex-1 min-w-0 md:w-[35%] md:flex-none relative flex items-center">
                  <Search className={`w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 pointer-events-none ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar..."
                    className={`w-full pl-8 pr-7 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors focus:outline-none ${
                      isTechTheme 
                        ? 'bg-black border border-accent/40 text-accent placeholder:text-accent/40 focus:border-accent' 
                        : 'bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted focus:border-accent'
                    }`}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 p-1 hover:opacity-80 text-text-muted hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Botón Crear Categoría */}
                <button 
                  onClick={handleCreateNew}
                  className={`flex items-center justify-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs md:text-sm font-bold transition shadow-lg shrink-0 whitespace-nowrap ${
                    isTechTheme 
                      ? 'bg-accent text-black hover:bg-accent/80 border border-accent tracking-normal sm:tracking-wider' 
                      : 'bg-[#D10074] text-white rounded-xl hover:bg-[#D10074]/90 shadow-[#D10074]/20'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>CREAR CATEGORÍA</span>
                </button>
              </div>

              {/* LÍNEA 2: Filtros (Todas / PERS. / DEF.) + Expandir / Colapsar */}
              <div className="flex items-center justify-between gap-2 w-full min-w-0">
                {/* Filtros por Origen */}
                <div className={`flex p-0.5 rounded-xl border ${isTechTheme ? 'border-accent/30 bg-black' : 'border-white/10 bg-white/5'}`}>
                  {(['all', 'custom', 'default'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold transition-all ${
                        filterType === type
                          ? isTechTheme
                            ? 'bg-accent text-black font-mono'
                            : 'bg-accent/20 text-accent rounded-lg'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {type === 'all' ? 'Todas' : type === 'custom' ? 'PERS.' : 'DEF.'}
                    </button>
                  ))}
                </div>

                {/* Alternar Expandir/Colapsar */}
                <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium shrink-0">
                  <button 
                    onClick={() => toggleExpandAll(true)}
                    className={`px-1.5 py-0.5 transition ${isTechTheme ? 'text-accent/70 hover:text-accent' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    Expandir
                  </button>
                  <span className="text-white/20">|</span>
                  <button 
                    onClick={() => toggleExpandAll(false)}
                    className={`px-1.5 py-0.5 transition ${isTechTheme ? 'text-accent/70 hover:text-accent' : 'text-text-muted hover:text-text-primary'}`}
                  >
                    Colapsar
                  </button>
                </div>
              </div>
            </div>

            {/* Rejilla de Categorías Principales (2 a 3 Columnas) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
              {totalFilteredCount === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <p className={`text-sm font-medium ${isTechTheme ? 'text-accent/60 font-mono' : 'text-text-muted'}`}>
                    No se encontraron categorías que coincidan con la búsqueda.
                  </p>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')} 
                      className="mt-3 text-xs text-accent underline font-semibold"
                    >
                      Limpiar búsqueda
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {Object.entries(groupedCategories).map(([groupName, subcats]) => {
                    const mainIcon = MAIN_CATEGORY_ICONS[groupName] || '📁';
                    const isSearching = searchQuery.trim().length > 0;
                    // Por defecto colapsadas excepto cuando hay búsqueda activa o el usuario la desplegó manualmente
                    const isExpanded = isSearching || !!expandedGroups[groupName];

                    return (
                      <div 
                        key={groupName}
                        className={`border transition-all duration-200 overflow-hidden ${
                          isTechTheme 
                            ? 'border-accent/30 bg-black/60 rounded-none' 
                            : 'border-white/10 bg-glass/60 rounded-2xl backdrop-blur-md hover:border-white/20'
                        }`}
                      >
                        {/* Cabecera del Acordeón (Categoría Principal) */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupName)}
                          className={`w-full flex items-center justify-between p-3.5 text-left transition-colors select-none ${
                            isExpanded
                              ? isTechTheme
                                ? 'bg-accent/15 border-b border-accent/30'
                                : 'bg-white/10 border-b border-white/10'
                              : isTechTheme
                                ? 'hover:bg-accent/10'
                                : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl flex-shrink-0">{mainIcon}</span>
                            <div className="min-w-0">
                              <h3 className={`font-bold text-sm truncate ${
                                isTechTheme ? 'text-accent font-mono' : 'text-text-primary font-syne'
                              }`}>
                                {groupName}
                              </h3>
                              <span className={`text-[10px] ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                                {subcats.length} {subcats.length === 1 ? 'subcategoría' : 'subcategorías'}
                              </span>
                            </div>
                          </div>

                          <div className={`p-1 rounded-lg transition-transform ${
                            isTechTheme ? 'text-accent' : 'text-text-secondary'
                          }`}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Listado de Subcategorías Desplegado (Texto Completo, Sin Truncar) */}
                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-black/20 max-h-[380px] overflow-y-auto scrollbar-thin">
                            {subcats.length === 0 ? (
                              <p className={`text-center text-xs py-4 ${isTechTheme ? 'text-accent/40' : 'text-text-muted'}`}>
                                Sin subcategorías en esta sección.
                              </p>
                            ) : (
                              subcats.map((cat, i) => (
                                <div 
                                  key={cat.id || `base-${i}`}
                                  className={`flex items-center justify-between p-2.5 border transition-all ${
                                    isTechTheme 
                                      ? 'bg-black border-accent/20 hover:border-accent/50' 
                                      : 'bg-glass/80 border-glass-border hover:border-accent/40 rounded-xl'
                                  }`}
                                >
                                  {/* Info Subcategoría */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                                    <div 
                                      className={`w-8 h-8 flex-shrink-0 flex items-center justify-center text-base ${
                                        isTechTheme ? 'border border-accent/30 bg-accent/10' : 'rounded-xl'
                                      }`}
                                      style={{ 
                                        backgroundColor: !isTechTheme ? `${cat.color}20` : undefined, 
                                        color: cat.color,
                                        borderColor: isTechTheme ? `${cat.color}40` : undefined
                                      }}
                                    >
                                      <CategoryIcon icon={cat.icon} label={cat.label} className="w-4.5 h-4.5" />
                                    </div>
                                    
                                    <div className="min-w-0 flex-1">
                                      <p className={`font-semibold text-xs leading-tight break-words ${
                                        isTechTheme ? 'font-mono text-accent uppercase' : 'text-text-primary'
                                      }`}>
                                        {cat.label}
                                      </p>
                                      <span className={`inline-block mt-0.5 text-[8px] px-1.5 py-0.2 font-mono ${
                                        isTechTheme 
                                          ? 'text-accent/60 border border-accent/30' 
                                          : 'text-text-muted border border-glass-border rounded'
                                      }`}>
                                        {cat.isCustom ? 'PERSONALIZADA' : 'POR DEFECTO'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Acciones Editar / Eliminar */}
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {(cat.isCustom || isSystemAdmin) && (
                                      <>
                                        <button 
                                          onClick={() => handleEdit(cat)} 
                                          title="Editar"
                                          className={`p-1.5 rounded-lg transition ${
                                            isTechTheme ? 'text-accent/70 hover:text-accent hover:bg-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                          }`}
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(cat)} 
                                          title="Eliminar"
                                          disabled={loading}
                                          className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA DE FORMULARIO DE CREACIÓN Y EDICIÓN */}
        {view === 'form' && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/70'}`}>
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className={`w-full px-4 py-3 text-sm focus:outline-none transition-colors ${
                    isTechTheme 
                      ? 'bg-black border border-accent/40 text-accent focus:border-accent font-mono' 
                      : 'bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-[#D10074]'
                  }`}
                  placeholder="Ej. Comida para la mascota, Streaming, Gimnasio"
                  required
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/70'}`}>
                  Color Representativo
                </label>
                <div className="flex flex-wrap gap-2.5 p-3 border border-white/10 rounded-2xl bg-black/20">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 transition-transform flex items-center justify-center ${
                        !isTechTheme && 'rounded-full'
                      } ${
                        color === c 
                          ? (isTechTheme ? 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-black' : 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0F]') 
                          : 'hover:scale-110 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-4 h-4 text-black drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-2 uppercase tracking-wider ${isTechTheme ? 'text-accent' : 'text-white/70'}`}>
                  Seleccionar Icono
                </label>
                
                <div className="flex flex-col sm:flex-row gap-3 h-64 border border-white/10 rounded-2xl overflow-hidden bg-black/30">
                  {/* Pestañas de Iconos */}
                  <div className="w-full sm:w-2/5 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto p-2 border-b sm:border-b-0 sm:border-r border-white/10 select-none scrollbar-none">
                    {Object.keys(CATEGORIZED_ICONS).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-3 py-2 text-left text-xs font-bold transition-all truncate whitespace-nowrap ${
                          activeTab === tab
                            ? (isTechTheme ? 'text-black bg-accent' : 'text-accent bg-accent/10 rounded-lg')
                            : (isTechTheme ? 'text-accent/60 hover:text-accent hover:bg-accent/5' : 'text-white/50 hover:text-white hover:bg-white/5 rounded-lg')
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Grid de Iconos */}
                  <div className="w-full sm:w-3/5 grid grid-cols-5 sm:grid-cols-4 gap-2 overflow-y-auto p-3 scrollbar-thin">
                    {CATEGORIZED_ICONS[activeTab].map(i => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={`aspect-square flex items-center justify-center text-xl transition-all ${!isTechTheme && 'rounded-xl'} ${
                          icon === i 
                            ? (isTechTheme ? 'bg-accent/30 border-2 border-accent scale-105' : 'bg-white/20 border-2 border-white scale-105') 
                            : (isTechTheme ? 'bg-white/5 hover:bg-accent/10 hover:border hover:border-accent/40' : 'bg-white/5 hover:bg-white/10')
                        }`}
                      >
                        <CategoryIcon icon={i} label={i} className="w-6 h-6" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botones del Formulario */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`flex-1 py-3.5 font-bold transition-all ${
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
                  className={`flex-1 py-3.5 font-bold transition-all disabled:opacity-50 shadow-lg ${
                    isTechTheme
                      ? 'bg-accent text-black hover:bg-accent/80 uppercase tracking-wide'
                      : 'bg-[#D10074] text-white rounded-xl hover:bg-[#D10074]/90 shadow-[#D10074]/30'
                  }`}
                >
                  {loading ? 'Guardando...' : (editingId ? 'Actualizar Categoría' : 'Guardar Categoría')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
