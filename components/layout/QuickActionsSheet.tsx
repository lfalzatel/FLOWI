'use client';
import { tr } from '@/lib/i18n';
import { receiptsUsed, showLimit, usePlan } from '@/lib/plans';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X, TrendingDown, TrendingUp, Camera, FileSpreadsheet, CreditCard, Bell, StickyNote, Landmark, Wallet, Share2, Compass } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { getAiKey } from '@/lib/aiAssist';

export type QuickAction = 'voz' | 'gasto' | 'ingreso' | 'deuda' | 'recordatorio' | 'nota' | 'inversion' | 'extracto' | 'cuenta';
// Página donde está la persona: el menú destaca lo de esa página
export type QuickContext = 'gasto' | 'ingreso' | 'deuda' | 'inversion' | 'cuenta' | 'recordatorio' | 'nota';

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
  inversion: { id: 'inversion' as const, label: 'Nueva inversión o ahorro', sub: 'CDT, Nu, fondos, acciones o pensión', icon: Landmark, cls: 'bg-teal-500/15 border-teal-500/40 text-teal-400', say: '' },
  cuenta:  { id: 'cuenta' as const,  label: 'Nueva cuenta',         sub: 'Banco, Nequi, efectivo o tarjeta de crédito', icon: Wallet, cls: 'bg-lime-500/15 border-lime-500/40 text-lime-500', say: '' },
  recordatorio: { id: 'recordatorio' as const, label: 'Nuevo recordatorio', sub: 'Un pago, una cita o una tarea', icon: Bell, cls: 'bg-pink-500/15 border-pink-500/40 text-pink-400', say: '' },
  nota:    { id: 'nota' as const,    label: 'Nueva nota',           sub: 'Un dato que no quieres olvidar', icon: StickyNote, cls: 'bg-blue-500/15 border-blue-500/40 text-blue-400', say: '' },
};

interface Props {
  context?: QuickContext | null;
  onClose: () => void;
  onAction: (action: QuickAction) => void;
  onReceipt: (file: File | File[] | 'no-key') => void;
}

// Menú del botón flotante: hablar arriba (lo más rápido) y debajo todo lo que se puede registrar
export function QuickActionsSheet({ context = null, onClose, onAction, onReceipt }: Props) {
  const featured = context ? FEATURED[context] : null;
  const { profile } = useAuth();
  const { canAdd } = usePlan();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = (theme === 'light' || theme === 'nova');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[90] flex items-end md:items-center justify-center md:p-4 ${isTechTheme ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={tr('¿Qué quieres registrar?')}>
      <div className={`absolute inset-0 ${isLight ? 'bg-black/20' : 'bg-black/50'}`} onClick={onClose} aria-hidden="true" />
      <div data-drag-close className={`relative w-full max-w-md glass-dropdown p-5 pb-8 animate-fade-in-up ${isTechTheme ? 'rounded-none border-t md:border border-accent/50' : 'rounded-t-[32px] md:rounded-[32px]'}`}>
        <div className={`mx-auto mb-4 h-1 w-10 bg-white/20 ${isTechTheme ? 'hidden' : 'rounded-full'}`} />
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase tracking-wide' : 'font-syne text-text-primary'}`}>{tr('¿Qué quieres registrar?')}</h2>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="p-1 -mr-1 text-text-secondary hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {featured && (
          <button type="button" data-tour="quick-featured" onClick={() => onAction(featured.id)}
                  className={`w-full flex items-center gap-3 p-4 mb-2 text-left border transition-all active:scale-[0.98] ${featured.cls} ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
            <span className={`w-11 h-11 flex items-center justify-center bg-current/10 ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}><featured.icon className="w-6 h-6 stroke-[2.5]" /></span>
            <span className="flex-1 min-w-0">
              <span className={`block font-bold ${isTechTheme ? 'uppercase' : 'font-syne'}`}>{tr(featured.label)}</span>
              <span className="block text-xs text-text-secondary">{tr(featured.sub)}</span>
            </span>
          </button>
        )}

        <button type="button" onClick={() => onAction('voz')} data-tour="quick-voice"
                className={`w-full flex items-center gap-3 text-left transition-all active:scale-[0.98] ${featured
                  ? `p-3 mb-4 border border-accent/40 text-text-primary hover:bg-accent/10 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`
                  : `p-4 mb-4 bg-gradient-to-br from-accent to-accent-dim shadow-lg shadow-accent/25 ${isLight ? 'text-white' : 'text-black'} ${isTechTheme ? 'rounded-none border-2 border-black' : 'rounded-2xl'}`}`}>
          <span className={`flex items-center justify-center ${featured ? 'w-9 h-9 bg-accent/15 text-accent' : 'w-11 h-11 bg-black/10'} ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}><Mic className={`${featured ? 'w-5 h-5' : 'w-6 h-6'} stroke-[2.5]`} /></span>
          <span className="flex-1 min-w-0">
            <span className={`block font-bold ${isTechTheme ? 'uppercase' : 'font-syne'}`}>{featured?.say ? tr('Dictarlo') : tr('Hablar')}</span>
            <span className={`block text-xs ${featured ? 'text-text-secondary' : 'opacity-80'}`}>{featured?.say ? tr(featured.say) : tr('"Gasté 20 mil en almuerzo"')} · {tr('varias cosas a la vez')}</span>
          </span>
        </button>

        {/* Se pueden escoger varias fotos: un recibo largo puede venir en 2 o más partes */}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
               onChange={(e) => { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) onReceipt(fs.length > 1 ? fs : fs[0]); }} />

        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.filter(a => a.id !== featured?.id).map(a => (
            <button key={a.id} type="button" data-tour={`quick-${a.id}`}
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
              <span className={`text-[11px] leading-tight text-center ${isTechTheme ? 'text-accent uppercase text-[9px]' : 'text-text-secondary font-medium'}`}>{tr(a.label)}</span>
            </button>
          ))}
        </div>
        {/* Tutorial corto: compartir el comprobante desde la app del banco */}
        <button type="button" data-tour="quick-share-help"
                onClick={() => { onClose(); setTimeout(() => window.dispatchEvent(new CustomEvent('flowi-page-tour', { detail: 'compartir' })), 150); }}
                className={`mt-3 w-full flex items-center gap-2.5 p-3 text-left border border-dashed border-accent/40 hover:bg-accent/5 transition-colors ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
          <Share2 className="w-5 h-5 text-accent shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-text-primary">{tr('¿Pagaste desde el banco? Compártelo a FLOWI')}</span>
            <span className="block text-[11px] text-text-secondary">{tr('Desde el comprobante de tu banco o Nequi, sin escribir nada.')}</span>
          </span>
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-accent"><Compass className="w-3.5 h-3.5" /> {tr('Ver cómo')}</span>
        </button>
        <p className="mt-3 text-center text-[10px] text-text-muted">{tr('Consejo: mantén presionado el botón para hablar directo.')}</p>
      </div>
    </div>,
    document.body,
  );
}
