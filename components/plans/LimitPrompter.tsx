'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Crown, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { LIMIT_EVENT, LIMIT_TEXT, LimitKind } from '@/lib/plans';

// Aviso amable cuando se llega a un límite del plan gratis, con el camino a los planes.
export function LimitPrompter() {
  const [kind, setKind] = useState<LimitKind | null>(null);
  const router = useRouter();
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    const on = (e: Event) => setKind((e as CustomEvent).detail?.kind ?? null);
    window.addEventListener(LIMIT_EVENT, on);
    return () => window.removeEventListener(LIMIT_EVENT, on);
  }, []);

  if (!kind || typeof document === 'undefined') return null;
  const copy = LIMIT_TEXT[kind];
  return createPortal(
    <div className={`fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setKind(null)} aria-hidden="true" />
      <div className={`relative w-full max-w-sm p-5 animate-fade-in-up glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <button onClick={() => setKind(null)} aria-label="Cerrar" className="absolute top-4 right-4 text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        <div className={`w-11 h-11 mb-3 flex items-center justify-center bg-amber-400/15 ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
          <Crown className="w-5 h-5 text-amber-400" />
        </div>
        <h3 className={`text-base font-bold text-text-primary mb-1 ${isTech ? 'uppercase tracking-wide' : 'font-syne'}`}>{copy.title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed mb-4">{copy.text}</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setKind(null)} className={`py-3 text-sm font-semibold border border-glass-border text-text-secondary ${isTech ? 'rounded-none uppercase text-xs' : 'rounded-xl'}`}>Ahora no</button>
          <button onClick={() => { setKind(null); router.push('/planes'); }}
                  className={`py-3 text-sm font-bold ${isTech ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
            Ver planes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
