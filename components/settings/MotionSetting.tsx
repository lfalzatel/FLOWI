'use client';
import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { MOTION_EVENT, MotionLevel, currentMotion, setMotion } from '@/lib/motion';
import { PageTourButton } from '@/components/tour/PageTourButton';

// Fila "Animaciones" de Configuración › Apariencia: completas, suaves o apagadas (en este celular)
export function MotionSetting({ isTech }: { isTech: boolean }) {
  const [level, setLevel] = useState<MotionLevel>('full');
  useEffect(() => {
    const sync = () => setLevel(currentMotion());
    sync();
    window.addEventListener(MOTION_EVENT, sync);
    return () => window.removeEventListener(MOTION_EVENT, sync);
  }, []);
  const options: [MotionLevel, string][] = [['full', tr('Completas')], ['soft', tr('Suaves')], ['off', tr('Apagadas')]];
  const hint = level === 'full'
    ? tr('Las ventanas nacen del botón que tocas, con un pequeño rebote.')
    : level === 'soft'
      ? tr('Más livianas: ideal si tu celular se siente lento.')
      : tr('Todo aparece al instante, sin movimiento.');
  return (
    <div id="animaciones" data-tour="motion-row" className={`w-full p-4 border-b scroll-mt-24 ${isTech ? 'border-accent/15' : 'border-glass-border'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 shrink-0 flex items-center justify-center ${isTech ? 'border border-violet-500/30 rounded-none bg-violet-500/5' : 'rounded-xl bg-violet-500/10'}`}>
            <Wand2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-left min-w-0">
            <p className={`text-sm font-medium ${isTech ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>{tr('Animaciones')}</p>
            <p className={`text-[10px] normal-case ${isTech ? 'font-mono text-accent/60' : 'text-text-muted'}`}>{tr('Se guarda en este celular')}</p>
          </div>
        </div>
        <PageTourButton id="animaciones" />
      </div>
      <div className="flex gap-1.5 mt-3" data-tour="motion-options" role="radiogroup" aria-label={tr('Animaciones')}>
        {options.map(([id, name]) => (
          <button key={id} type="button" role="radio" aria-checked={level === id} onClick={() => setMotion(id)}
                  className={`flex-1 py-2 text-xs font-semibold border normal-case ${isTech ? 'rounded-none' : 'rounded-lg'} ${level === id ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`}>
            {name}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-text-muted mt-2 normal-case">{hint}</p>
    </div>
  );
}
