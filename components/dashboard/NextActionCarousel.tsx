'use client';
import { useEffect, useRef, useState } from 'react';
import { NextAction } from '@/lib/nextAction';
import { DailyBudget } from '@/lib/dailyBudget';
import { NextActionCard } from './NextActionCard';

// "Tu siguiente acción" como carrusel: pasa sola cada 6 s, se desliza con el dedo y tiene puntos.
// Al tocarla o deslizarla se detiene un rato para que se pueda leer. Todas las tarjetas quedan
// montadas (solo se desplaza la fila), así un modal abierto desde una no se cierra al avanzar.
const AUTO_MS = 6000;
const PAUSE_MS = 15000;

export function NextActionCarousel({ actions, today, currency, onSkip, onRefresh, onUsed }: {
  actions: NextAction[];
  today: DailyBudget | null;
  currency?: string;
  onSkip: (id: string) => void;
  onRefresh?: () => void;
  onUsed?: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const pausedUntil = useRef(0);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const width = useRef(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const n = actions.length;

  // Si cambia la lista (se saltó o resolvió una), no quedar fuera de rango
  useEffect(() => { if (index > n - 1) setIndex(Math.max(0, n - 1)); }, [n, index]);

  // Paso automático (no con "reducir movimiento" ni con una sola tarjeta)
  useEffect(() => {
    if (n < 2) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current || document.visibilityState !== 'visible') return;
      if (document.querySelector('.fixed.inset-0.z-\\[100\\]')) return; // hay un modal abierto
      setIndex(i => (i + 1) % n);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [n]);

  const pause = () => { pausedUntil.current = Date.now() + PAUSE_MS; };

  const onTouchStart = (e: React.TouchEvent) => {
    pause();
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null };
    width.current = trackRef.current?.parentElement?.clientWidth || 1;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.touches[0].clientX - s.x, dy = e.touches[0].clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) s.horizontal = Math.abs(dx) > Math.abs(dy);
    if (s.horizontal) setDrag(dx);
  };
  const onTouchEnd = () => {
    const s = start.current;
    if (s?.horizontal) {
      const threshold = width.current * 0.2;
      if (drag < -threshold && index < n - 1) setIndex(index + 1);
      else if (drag > threshold && index > 0) setIndex(index - 1);
    }
    start.current = null;
    setDrag(0);
  };

  if (!n) return null;
  if (n === 1) {
    const a = actions[0];
    return <NextActionCard key={a.id} action={a} today={today} currency={currency} onSkip={() => onSkip(a.id)} onRefresh={onRefresh} onUsed={() => onUsed?.(a.id)} />;
  }

  return (
    <div onClickCapture={pause}>
      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div ref={trackRef} className="flex" style={{
          transform: `translateX(calc(${-index * 100}% + ${drag}px))`,
          transition: drag ? 'none' : 'transform 450ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}>
          {actions.map((a, i) => (
            <div key={a.id} className="w-full shrink-0 px-0.5" aria-hidden={i !== index}>
              <NextActionCard action={a} today={today} currency={currency}
                              onSkip={() => onSkip(a.id)} onRefresh={onRefresh} onUsed={() => onUsed?.(a.id)} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-center gap-1.5" role="tablist" aria-label="Acciones sugeridas">
        {actions.map((a, i) => (
          <button key={a.id} type="button" role="tab" aria-selected={i === index} aria-label={`Ver ${i + 1} de ${n}`}
                  onClick={() => { pause(); setIndex(i); }}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-accent' : 'w-1.5 bg-text-muted/40'}`} />
        ))}
      </div>
    </div>
  );
}
