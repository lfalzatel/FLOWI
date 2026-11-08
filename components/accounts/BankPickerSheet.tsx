'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { CategoryIcon } from '@/components/CategoryIcon';
import { PAYMENT_METHODS, normalizeText } from '@/lib/categories';

// Selector de bancos, billeteras y medios de pago con su logo: un campo que abre una hoja con
// buscador y cuadrícula, en vez de decenas de botones ocupando el formulario.

const WALLETS = ['Nequi', 'Daviplata', 'RappiPay'];
const OTHERS = ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Addi', 'Sistecrédito'];

export function bankMeta(label: string): { icon: string; label: string } | null {
  const k = normalizeText(label);
  const hit = PAYMENT_METHODS.find(p => normalizeText(p.label) === k);
  return hit ? { icon: hit.icon, label: hit.label } : null;
}

export function BankLogo({ label, className = 'w-5 h-5 text-base flex items-center justify-center' }: { label: string; className?: string }) {
  const meta = bankMeta(label);
  return meta ? <CategoryIcon icon={meta.icon} label={meta.label} className={className} /> : <span className={className}>🏦</span>;
}

interface SheetProps {
  title?: string;
  selected: string[];
  multiple?: boolean;
  onlyBanks?: boolean;               // CDT: sin efectivo, tarjetas ni billeteras
  extra?: string[];                  // opciones que no están en el catálogo (p. ej. Banco Popular)
  favorites?: string[];              // los que ya usa la persona: salen primero
  disabled?: Record<string, string>; // opción → motivo (ej. "Ya está en Bancolombia")
  allowCustom?: boolean;             // permitir usar lo que se escribió en el buscador
  onChange: (values: string[]) => void;
  onClose: () => void;
}

export function BankPickerSheet({ title = 'Elige el banco', selected, multiple, onlyBanks, extra = [], favorites = [], disabled = {}, allowCustom, onChange, onClose }: SheetProps) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const surface = isTech ? 'bg-deep' : 'bg-card';
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>(selected);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = useMemo(() => {
    const all = Array.from(new Set([...PAYMENT_METHODS.map(p => p.label), ...extra]));
    const base = onlyBanks ? all.filter(l => !WALLETS.includes(l) && !OTHERS.includes(l)) : all;
    const q = normalizeText(query);
    const match = (l: string) => !q || normalizeText(l).includes(q);
    const fav = favorites.filter(f => base.includes(f) && match(f));
    const rest = base.filter(l => !fav.includes(l) && match(l));
    const out: { name: string; items: string[] }[] = [];
    if (fav.length) out.push({ name: 'Tus cuentas', items: fav });
    const banks = rest.filter(l => !WALLETS.includes(l) && !OTHERS.includes(l));
    if (banks.length) out.push({ name: 'Bancos', items: banks });
    const wallets = rest.filter(l => WALLETS.includes(l));
    if (wallets.length) out.push({ name: 'Billeteras', items: wallets });
    const others = rest.filter(l => OTHERS.includes(l));
    if (others.length) out.push({ name: 'Efectivo, tarjetas y otros', items: others });
    return out;
  }, [query, extra, favorites, onlyBanks]);

  const anyMatch = sections.some(s => s.items.length);
  const toggle = (label: string) => {
    if (disabled[label]) return;
    if (!multiple) { onChange([label]); onClose(); return; }
    setPicked(p => (p.includes(label) ? p.filter(x => x !== label) : [...p, label]));
  };

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[110] flex items-end sm:items-center justify-center ${isTech ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/60'}`} onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-md max-h-[85dvh] flex flex-col overflow-hidden ${surface} border animate-fade-in-up ${isTech ? 'rounded-none border-accent/50' : 'rounded-t-[28px] sm:rounded-3xl border-glass-border'}`}>
        <div className={`shrink-0 px-5 pt-4 pb-3 border-b ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={isTech ? 'font-bold text-accent uppercase tracking-wide' : 'font-syne font-bold text-lg text-text-primary'}>{title}</h2>
            <button type="button" onClick={onClose} aria-label="Cerrar" className={isTech ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}><X className="w-5 h-5" /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar banco o medio de pago…"
                   className={`w-full pl-9 pr-3 py-2.5 text-sm bg-glass border text-text-primary placeholder-text-muted focus:outline-none ${isTech ? 'rounded-none border-accent/30 focus:border-accent' : 'rounded-xl border-glass-border focus:border-accent'}`} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">
          {sections.map(sec => (
            <section key={sec.name}>
              <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-2 px-1 ${isTech ? 'text-accent/70' : 'text-text-muted'}`}>{sec.name}</h3>
              <div className="grid grid-cols-3 gap-2">
                {sec.items.map(label => {
                  const on = picked.includes(label);
                  const off = !!disabled[label];
                  return (
                    <button key={label} type="button" onClick={() => toggle(label)} disabled={off} title={disabled[label]}
                            className={`relative flex flex-col items-center gap-1.5 px-1 py-3 border transition-all active:scale-95 disabled:opacity-35 ${isTech ? 'rounded-none' : 'rounded-2xl'} ${
                              on ? 'border-accent bg-accent/15' : 'border-glass-border hover:bg-white/5'}`}>
                      <BankLogo label={label} className="w-8 h-8 text-2xl flex items-center justify-center" />
                      <span className={`text-[11px] leading-tight text-center ${on ? 'text-accent font-semibold' : 'text-text-secondary'}`}>{label}</span>
                      {on && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-accent" />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!anyMatch && <p className="text-sm text-text-muted text-center py-6">No encontré "{query}".</p>}
          {allowCustom && query.trim() && !sections.some(s => s.items.some(i => normalizeText(i) === normalizeText(query))) && (
            <button type="button" onClick={() => { onChange([query.trim()]); onClose(); }}
                    className={`w-full py-2.5 text-sm font-semibold border border-dashed ${isTech ? 'rounded-none border-accent/50 text-accent' : 'rounded-xl border-accent/50 text-accent'}`}>
              Usar "{query.trim()}"
            </button>
          )}
        </div>

        {multiple && (
          <div className={`shrink-0 p-4 border-t ${isTech ? 'border-accent/20' : 'border-glass-border'}`}>
            <button type="button" onClick={() => { onChange(picked); onClose(); }}
                    className={`w-full py-3 font-bold ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase tracking-widest' : 'rounded-xl bg-accent text-white'}`}>
              Listo{picked.length ? ` (${picked.length})` : ''}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Campo que muestra lo elegido y abre la hoja
export function BankField({ value, placeholder = 'Elige el banco', onClick }: { value: string; placeholder?: string; onClick: () => void }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  return (
    <button type="button" onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 bg-glass border text-left transition-colors ${isTech ? 'rounded-none border-accent/30 hover:border-accent' : 'rounded-xl border-glass-border hover:border-accent/60'}`}>
      {value ? <BankLogo label={value} /> : <span className="w-5 h-5" />}
      <span className={`flex-1 truncate ${value ? 'text-text-primary' : 'text-text-muted'}`}>{value || placeholder}</span>
      <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
    </button>
  );
}
