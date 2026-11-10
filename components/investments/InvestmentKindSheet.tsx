'use client';
import { createPortal } from 'react-dom';
import { Landmark, LineChart, PiggyBank, Umbrella } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import type { InvestmentKind } from '@/lib/firestore';
import { KIND_INFO } from '@/lib/investments';

export const KIND_ICON: Record<InvestmentKind, any> = { cdt: Landmark, ahorro: PiggyBank, fondo: LineChart, pension: Umbrella };

// "¿Qué vas a registrar?": CDT, ahorro con intereses, acciones y fondos o pensión voluntaria
export function InvestmentKindSheet({ onPick, onClose }: { onPick: (k: InvestmentKind) => void; onClose: () => void }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/60'}`} onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-md p-5 pb-7 border animate-fade-in-up ${isTechTheme ? 'bg-deep rounded-none border-accent/50' : 'bg-card rounded-t-[28px] sm:rounded-3xl border-glass-border'}`}>
        <h2 className={`mb-3 ${isTechTheme ? 'font-bold text-accent uppercase' : 'font-syne font-bold text-lg text-text-primary'}`}>¿Qué vas a registrar?</h2>
        <div className="space-y-2">
          {(Object.keys(KIND_INFO) as InvestmentKind[]).map(k => {
            const KIcon = KIND_ICON[k];
            return (
              <button key={k} type="button" onClick={() => onPick(k)}
                      className={`w-full flex items-center gap-3 p-3.5 border text-left transition-all active:scale-[0.99] ${isTechTheme ? 'rounded-none border-accent/30 hover:bg-accent/10' : 'rounded-2xl border-glass-border hover:bg-white/5'}`}>
                <span className={`w-10 h-10 flex items-center justify-center bg-accent/15 ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}><KIcon className="w-5 h-5 text-accent" /></span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-semibold ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>{KIND_INFO[k].label}</span>
                  <span className="block text-[11px] text-text-muted">{KIND_INFO[k].examples}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
