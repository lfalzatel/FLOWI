'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Plus, Settings2, Check } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryOption } from '@/hooks/useCategories';
import {
  CUSTOM_GROUP, EXPENSE_GROUPS, INCOME_GROUPS, MERCHANTS, MerchantDef, TransactionKind, normalizeText, softHyphenate,
} from '@/lib/categories';

interface Props {
  type: TransactionKind;
  categories: CategoryOption[];
  selected: string;
  recent: string[];
  onSelect: (category: string, merchant?: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onManage: () => void;
}

const RECENT_GROUP = 'Recientes';

export function CategoryPickerSheet({ type, categories, selected, recent, onSelect, onClose, onCreate, onManage }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  // kiloCode usa una tarjeta translúcida; la hoja y sus títulos fijos necesitan un fondo opaco
  const surface = isTechTheme ? 'bg-deep' : 'bg-card';

  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState(RECENT_GROUP);
  const [dragOffset, setDragOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const dragStartY = useRef<number | null>(null);

  // Teclado abierto solo en equipos con mouse; en el celular taparía la mitad de la hoja
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = useMemo(() => {
    const order = [...(type === 'gasto' ? EXPENSE_GROUPS : INCOME_GROUPS), CUSTOM_GROUP];
    const byGroup: Record<string, CategoryOption[]> = {};
    categories.forEach(cat => {
      const group = cat.group && order.includes(cat.group) ? cat.group : CUSTOM_GROUP;
      (byGroup[group] ||= []).push(cat);
    });
    const result = order
      .filter(group => byGroup[group]?.length)
      .map(group => ({ group, items: byGroup[group] }));

    const recentItems = recent
      .map(label => categories.find(c => c.label === label))
      .filter((c): c is CategoryOption => !!c)
      .slice(0, 8);
    if (recentItems.length) result.unshift({ group: RECENT_GROUP, items: recentItems });
    return result;
  }, [categories, recent, type]);

  useEffect(() => {
    if (sections.length) setActiveGroup(sections[0].group);
  }, [sections]);

  const searchResults = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return null;
    const cats = categories.filter(c => normalizeText(c.label).includes(q));
    // Al buscar un comercio ("jumbo") se ofrece su categoría con el comercio ya elegido
    const merchants = type === 'gasto'
      ? MERCHANTS.filter(mer => normalizeText(mer.label).includes(q))
          .map(mer => ({ merchant: mer, category: mer.categories.find(cat => categories.some(c => c.label === cat)) }))
          .filter((r): r is { merchant: MerchantDef; category: string } => !!r.category)
      : [];
    return { cats, merchants };
  }, [query, categories, type]);

  const scrollToGroup = (group: string) => {
    setActiveGroup(group);
    const el = sectionRefs.current[group];
    const container = scrollRef.current;
    if (el && container) container.scrollTo({ top: el.offsetTop - 4, behavior: 'smooth' });
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container || searchResults) return;
    let current = sections[0]?.group;
    for (const { group } of sections) {
      const el = sectionRefs.current[group];
      if (el && el.offsetTop - container.scrollTop <= 40) current = group;
    }
    if (current && current !== activeGroup) setActiveGroup(current);
  };

  // Deslizar hacia abajo desde la manija o el título cierra la hoja
  const onDragStart = (e: React.TouchEvent) => { dragStartY.current = e.touches[0].clientY; };
  const onDragMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    setDragOffset(Math.max(0, e.touches[0].clientY - dragStartY.current));
  };
  const onDragEnd = () => {
    if (dragOffset > 110) onClose();
    dragStartY.current = null;
    setDragOffset(0);
  };

  const tile = (cat: CategoryOption, merchant?: string, key?: string) => {
    const isSelected = !merchant && cat.label === selected;
    return (
      <button
        key={key || cat.label}
        type="button"
        onClick={() => onSelect(cat.label, merchant)}
        className={`relative flex flex-col items-center gap-1.5 px-1 py-2.5 transition-all active:scale-95 ${
          isTechTheme ? 'rounded-none border' : 'rounded-2xl border'
        } ${
          isSelected
            ? (isTechTheme ? 'border-accent bg-accent/15' : 'border-accent bg-accent/10')
            : 'border-transparent hover:bg-glass'
        }`}
      >
        <span
          className={`w-11 h-11 flex items-center justify-center text-xl ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
          style={{ backgroundColor: `${cat.color}22` }}
        >
          <CategoryIcon icon={cat.icon} label={merchant || cat.label} className="w-6 h-6 flex items-center justify-center" />
        </span>
        <span className="text-[11px] leading-tight text-center text-text-primary line-clamp-2 break-words w-full">
          {softHyphenate(merchant || cat.label)}
        </span>
        {merchant && <span className="text-[10px] leading-none text-text-muted truncate w-full text-center">{cat.label}</span>}
        {isSelected && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span>
        )}
      </button>
    );
  };

  if (typeof document === 'undefined') return null;

  const totalResults = searchResults ? searchResults.cats.length + searchResults.merchants.length : 0;

  return createPortal(
    <div className={`fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/50'}`} onClick={onClose} aria-hidden="true" />

      {/* La animación de entrada va en el contenedor para no pisar el transform del arrastre */}
      <div className="relative z-10 w-full sm:max-w-lg animate-fade-in-up">
      <div
        role="dialog"
        aria-label="Elegir categoría"
        className={`w-full h-[88vh] sm:h-[80vh] flex flex-col overflow-hidden ${surface} border border-glass-border shadow-2xl ${
          isTechTheme ? 'rounded-none border-accent/50' : 'rounded-t-3xl sm:rounded-3xl'
        }`}
        style={{ transform: dragOffset ? `translateY(${dragOffset}px)` : undefined, transition: dragOffset ? 'none' : 'transform 0.2s' }}
      >
        {/* Manija + título */}
        <div onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd} className="px-4 pt-2 pb-3 select-none">
          <div className="w-10 h-1.5 rounded-full bg-text-muted mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase tracking-wide' : 'font-syne text-text-primary'}`}>
              {type === 'gasto' ? 'Categoría del gasto' : 'Categoría del ingreso'}
            </h3>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="p-2 -mr-2 text-text-secondary hover:text-text-primary">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              enterKeyHint="search"
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={type === 'gasto' ? 'Busca "mercado", "jumbo", "luz"…' : 'Busca "sueldo", "prima"…'}
              className={`w-full bg-glass border py-2.5 pl-9 pr-9 text-sm text-text-primary placeholder-text-muted focus:outline-none ${
                isTechTheme ? 'border-accent/30 rounded-none focus:border-accent' : 'border-glass-border rounded-xl focus:border-accent'
              }`}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chips de grupos */}
        {!searchResults && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
            {sections.map(({ group }) => (
              <button
                key={group}
                type="button"
                onClick={() => scrollToGroup(group)}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors border ${
                  isTechTheme ? 'rounded-none' : 'rounded-full'
                } ${
                  activeGroup === group
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'border-glass-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        )}

        {/* Contenido */}
        <div ref={scrollRef} onScroll={handleScroll} className={`relative flex-1 overflow-y-auto px-3 pb-4 ${searchResults ? 'pt-3' : ''}`}>
          {searchResults ? (
            totalResults === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-sm text-text-secondary mb-4">No hay categorías con “{query}”.</p>
                <button type="button" onClick={onCreate} className="text-sm font-semibold text-accent">
                  + Crear categoría “{query}”
                </button>
              </div>
            ) : (
              <>
                {searchResults.cats.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                    {searchResults.cats.map(cat => tile(cat))}
                  </div>
                )}
                {searchResults.merchants.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted px-1 mt-4 mb-1">Comercios</p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                      {searchResults.merchants.map(({ merchant, category }) => {
                        const cat = categories.find(c => c.label === category)!;
                        return tile({ ...cat, icon: merchant.icon, color: merchant.color }, merchant.label, `m-${merchant.label}`);
                      })}
                    </div>
                  </>
                )}
              </>
            )
          ) : (
            sections.map(({ group, items }) => (
              <section key={group} ref={el => { sectionRefs.current[group] = el; }} className="mb-2">
                <p className={`sticky top-0 z-10 ${surface} text-[11px] font-semibold uppercase tracking-wider text-text-muted px-1 py-2`}>
                  {group}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1">
                  {items.map(cat => tile(cat, undefined, `${group}-${cat.label}`))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Pie */}
        <div className="flex border-t border-glass-border">
          <button type="button" onClick={onCreate} className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-accent hover:bg-glass">
            <Plus className="w-4 h-4" /> Crear categoría
          </button>
          <button type="button" onClick={onManage} className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-text-secondary hover:bg-glass border-l border-glass-border">
            <Settings2 className="w-4 h-4" /> Gestionar
          </button>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
