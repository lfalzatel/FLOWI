'use client';
import { useState } from 'react';
import { Compass } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { useTheme } from '@/components/ThemeProvider';
import { AppTour, readTourVoicePref } from './AppTour';
import { PAGE_TOURS, PageTourId } from './tours';

// Botón "Tutorial" de cada página: abre el recorrido de esa página (sin datos de ejemplo)
// compact: en celular solo se ve la brújula (para que quepa el título de la página junto a otros botones)
export function PageTourButton({ id, className = '', compact = false }: { id: PageTourId; className?: string; compact?: boolean }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [voice, setVoice] = useState<boolean | null>(null);
  return (
    <>
      <button type="button" onClick={() => setVoice(readTourVoicePref())}
              aria-label={tr('Ver el tutorial de esta página')} title={tr('Tutorial')}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border transition-all active:scale-[0.97] ${isTech ? 'rounded-none border-accent/30 hover:border-accent text-accent font-mono uppercase' : 'rounded-xl border-glass-border bg-glass hover:bg-white/10 text-text-primary'} ${className}`}>
        <Compass className="w-3.5 h-3.5 text-accent" />
        <span className={compact ? 'hidden sm:inline' : ''}>{tr('Tutorial')}</span>
      </button>
      {voice !== null && <AppTour voice={voice} steps={PAGE_TOURS[id]} markDone={false} onClose={() => setVoice(null)} />}
    </>
  );
}
