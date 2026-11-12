'use client';
import { receiptsUsed, showLimit, usePlan } from '@/lib/plans';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X, TrendingDown, TrendingUp, Camera, FileSpreadsheet, CreditCard, Bell, StickyNote, Landmark } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getAiKey } from '@/lib/aiAssist';

export type QuickAction = 'voz' | 'gasto' | 'ingreso' | 'deuda' | 'recordatorio' | 'nota' | 'inversion' | 'extracto';

const ACTIONS: { id: Exclude<QuickAction, 'voz'> | 'foto'; label: string; icon: any; color: string }[] = [
  { id: 'gasto',        label: 'Gasto',            icon: TrendingDown,    color: 'text-rose-400 bg-rose-500/10' },
  { id: 'ingreso',      label: 'Ingreso',          icon: TrendingUp,      color: 'text-emerald-400 bg-emerald-500/10' },
  { id: 'foto',         label: 'Foto del recibo',  icon: Camera,          color: 'text-amber-400 bg-amber-500/10' },
  { id: 'extracto',     label: 'Importar extracto', icon: FileSpreadsheet, color: 'text-sky-400 bg-sky-500/10' },
  { id: 'deuda',        label: 'Deuda o abono',    icon: CreditCard,      color: 'text-orange-400 bg-orange-500/10' },
  { id: 'recordatorio', label: 'Recordatorio',     icon: Bell,            color: 'text-pink-400 bg-pink-500/10' },
  { id: 'nota',         label: 'Nota',             icon: StickyNote,      color: 'text-blue-400 bg-blue-500/10' },
  { id: 'inversion',    label: 'Inversión',        icon: Landmark,        color: 'text-teal-400 bg-teal-500/10' },
];

// Lo que se destaca arriba según la página donde está la persona
const FEATURED = {
  gasto:   { id: 'gasto' as const,   label: 'Nuevo gasto',          sub: 'Valor, categoría y listo', icon: TrendingDown, cls: 'bg-rose-500/15 border-rose-500/40 text-rose-400', say: '"Almuerzo 20 mil y tinto 3 mil"' },
  ingreso: { id: 'ingreso' as const, label: 'Nuevo ingreso',        sub: 'Sueldo, venta, pago que te hicieron', icon: TrendingUp, cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', say: '"Me pagaron 500 mil"' },
  deuda:   { id: 'deuda' as const,   label: 'Nueva deuda o abono',  sub: 'Lo que debes o lo que te deben', icon: CreditCard, cls: 'bg-orange-500/15 border-orange-500/40 text-orange-400', say: '"Le presté 100 mil a Juan"' },
};

interface Props {
  context?: 'gasto' | 'ingreso' | 'deuda' | null;
  onClose: () => void;
  onAction: (action: QuickAction) => void;
  onReceipt: (file: File | 'no-key') => void;
}

// Menú del botón flotante: hablar arriba (lo más rápido) y debajo todo lo que se puede registrar
export function QuickActionsSheet({ context = null, onClose, onAction, onReceipt }: Props) {
  const featured = context ? FEATURED[context] : null;
  const { profile } = useAuth();
  const { canAdd } = usePlan();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-4 ${isTechTheme ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label="¿Qué quieres registrar?">
      <div className={`absolute inset-0 ${isLight ? 'bg-black/20' : 'bg-black/50'}`} onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-md glass-dropdown p-5 pb-8 animate-fade-in-up ${isTechTheme ? 'rounded-none border-t md:border border-accent/50' : 'rounded-t-[32px] md:rounded-[32px]'}`}>
        <div className={`mx-auto mb-4 h-1 w-10 bg-white/20 ${isTechTheme ? 'hidden' : 'rounded-full'}`} />
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase tracking-wide' : 'font-syne text-text-primary'}`}>¿Qué quieres registrar?</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1 -mr-1 text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {featured && (
          <button type="button" onClick={() => onAction(featured.id)}
                  className={`w-full flex items-center gap-3 p-4 mb-2 text-left border transition-all active:scale-[0.98] ${featured.cls} ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
            <span className={`w-11 h-11 flex items-center justify-center bg-current/10 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}><featured.icon className="w-6 h-6 stroke-[2.5]" /></span>
            <span className="flex-1 min-w-0">
              <span className={`block font-bold ${isTechTheme ? 'uppercase' : 'font-syne'}`}>{featured.label}</span>
              <span className="block text-xs text-text-secondary">{featured.sub}</span>
            </span>
          </button>
        )}

        <button type="button" onClick={() => onAction('voz')} data-tour="quick-voice"
                className={`w-full flex items-center gap-3 text-left transition-all active:scale-[0.98] ${featured
                  ? `p-3 mb-4 border border-accent/40 text-text-primary hover:bg-accent/10 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`
                  : `p-4 mb-4 bg-gradient-to-br from-accent to-accent-dim shadow-lg shadow-accent/25 ${isLight ? 'text-white' : 'text-black'} ${isTechTheme ? 'rounded-none border-2 border-black' : 'rounded-2xl'}`}`}>
          <span className={`flex items-center justify-center ${featured ? 'w-9 h-9 bg-accent/15 text-accent' : 'w-11 h-11 bg-black/10'} ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}><Mic className={`${featured ? 'w-5 h-5' : 'w-6 h-6'} stroke-[2.5]`} /></span>
          <span className="flex-1 min-w-0">
            <span className={`block font-bold ${isTechTheme ? 'uppercase' : 'font-syne'}`}>{featured ? 'Dictarlo' : 'Hablar'}</span>
            <span className={`block text-xs ${featured ? 'text-text-secondary' : 'opacity-80'}`}>{featured ? featured.say : '"Gasté 20 mil en almuerzo"'} · varias cosas a la vez</span>
          </span>
        </button>

        <input ref={fileRef} type="file" accept="image/*" className="hidden"
               onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onReceipt(f); }} />

        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.filter(a => a.id !== featured?.id).map(a => (
            <button key={a.id} type="button"
                    onClick={() => {
                      if (a.id === 'foto') {
                        if (!canAdd('receipts', receiptsUsed(profile))) { onClose(); showLimit('receipts'); return; }
                        // El selector se abre aquí mismo, dentro del toque, para que el celular lo permita
                        if (getAiKey()) fileRef.current?.click(); else onReceipt('no-key');
                        return;
                      }
                      onAction(a.id);
                    }}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 transition-all active:scale-95 hover:bg-white/5 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
              <span className={`w-11 h-11 flex items-center justify-center ${a.color} ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
                <a.icon className="w-5 h-5" />
              </span>
              <span className={`text-[11px] leading-tight text-center ${isTechTheme ? 'text-accent uppercase text-[9px]' : 'text-text-secondary font-medium'}`}>{a.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-text-muted">Consejo: mantén presionado el botón para hablar directo.</p>
      </div>
    </div>,
    document.body,
  );
}
