'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { applyMotion, currentMotion, getSavedMotion, isSlowDevice, markMotionNoticeSeen, motionNoticeSeen } from '@/lib/motion';
import { usePopupBusy, usePopupHold } from '@/lib/tourGate';

// Animaciones de toda la app:
// 1. Aplica el nivel guardado (o "suaves" en un celular sencillo, avisándolo una vez).
// 2. Los modales nacen del punto que se tocó: cuando aparece una ventana (.animate-fade-in-up o
//    .animate-scale-in dentro de una capa fija), se reemplaza su entrada por un "resorte" que crece
//    desde ese punto. No hay que tocar cada modal: todos lo heredan.

const TAP_WINDOW_MS = 900; // el modal tiene que aparecer poco después del toque

export function MotionManager() {
  const [notice, setNotice] = useState(false);

  // Nivel inicial
  useEffect(() => {
    const saved = getSavedMotion();
    if (saved) { applyMotion(saved); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { applyMotion('off'); return; }
    if (isSlowDevice()) {
      applyMotion('soft');
      if (!motionNoticeSeen()) setTimeout(() => setNotice(true), 4000);
    } else {
      applyMotion('full');
    }
  }, []);

  // Modales que nacen del toque
  useEffect(() => {
    let tap = { x: 0, y: 0, t: 0 };
    const onDown = (e: PointerEvent) => { tap = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    window.addEventListener('pointerdown', onDown, true);

    const animate = (el: HTMLElement) => {
      if (el.dataset.popped) return;
      el.dataset.popped = '1';
      if (currentMotion() !== 'full' || Date.now() - tap.t > TAP_WINDOW_MS) return;
      if (!el.closest('.fixed.inset-0')) return; // solo ventanas encima de la pantalla, no páginas
      if (/(^|\s)-?translate-/.test(el.className)) return; // ya se posiciona con transform: no tocarlo
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Punto de origen relativo a la ventana (limitado a su caja para que no salga volando)
      const ox = Math.min(Math.max(tap.x - r.left, 0), r.width);
      const oy = Math.min(Math.max(tap.y - r.top, 0), r.height);
      el.style.animation = 'none';
      el.style.transformOrigin = `${ox}px ${oy}px`;
      el.animate(
        [
          { transform: 'scale(0.55)', opacity: 0, filter: 'blur(6px)' },
          { transform: 'scale(1.025)', opacity: 1, filter: 'blur(0)', offset: 0.65 },
          { transform: 'scale(0.995)', offset: 0.85 },
          { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' },
        ],
        { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    };

    const scan = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches('.animate-fade-in-up, .animate-scale-in')) animate(node);
      node.querySelectorAll<HTMLElement>('.animate-fade-in-up, .animate-scale-in').forEach(animate);
    };
    const obs = new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(scan)));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { window.removeEventListener('pointerdown', onDown, true); obs.disconnect(); };
  }, []);

  // Menús de abajo (marcados con data-drag-close): se cierran arrastrándolos hacia abajo con el dedo.
  // Al soltar lejos, se deslizan fuera y se "toca" su fondo, que es lo que ya los cierra.
  useEffect(() => {
    let drag: { sheet: HTMLElement; y0: number; t0: number; dy: number } | null = null;
    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const sheet = target?.closest<HTMLElement>('[data-drag-close]');
      if (!sheet || e.touches.length !== 1) return;
      // Si se toca algo que tiene su propio scroll y no está arriba del todo, se respeta ese scroll
      for (let n: HTMLElement | null = target; n && n !== sheet.parentElement; n = n.parentElement) {
        if (n.scrollTop > 0) return;
      }
      drag = { sheet, y0: e.touches[0].clientY, t0: Date.now(), dy: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.y0;
      drag.dy = dy;
      if (dy <= 0) { drag.sheet.style.transform = ''; return; }
      drag.sheet.style.transition = 'none';
      drag.sheet.style.transform = `translateY(${dy}px)`;
    };
    const end = () => {
      if (!drag) return;
      const { sheet, dy, t0 } = drag;
      drag = null;
      const speed = dy / Math.max(1, Date.now() - t0);
      if (dy > 110 || (dy > 40 && speed > 0.6)) {
        sheet.style.transition = 'transform 200ms ease-in';
        sheet.style.transform = 'translateY(110%)';
        const backdrop = sheet.parentElement?.querySelector<HTMLElement>(':scope > .absolute.inset-0');
        setTimeout(() => backdrop?.click(), 180);
      } else if (dy > 0) {
        sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        sheet.style.transform = '';
      }
    };
    window.addEventListener('touchstart', start, { capture: true, passive: true });
    window.addEventListener('touchmove', move, { capture: true, passive: true });
    window.addEventListener('touchend', end, true);
    window.addEventListener('touchcancel', end, true);
    return () => {
      window.removeEventListener('touchstart', start, true);
      window.removeEventListener('touchmove', move, true);
      window.removeEventListener('touchend', end, true);
      window.removeEventListener('touchcancel', end, true);
    };
  }, []);

  return notice ? <SlowNotice onClose={() => { markMotionNoticeSeen(); setNotice(false); }} /> : null;
}

// Aviso de una sola vez en celulares sencillos
function SlowNotice({ onClose }: { onClose: () => void }) {
  // Espera su turno (tutorial u otras ventanas) y luego lo ocupa mientras se ve
  const busy = usePopupBusy();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!visible && !busy) setVisible(true); }, [busy, visible]);
  usePopupHold(visible);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-28 z-[95] flex justify-center px-4 pointer-events-none" role="status">
      <div className="pointer-events-auto w-full max-w-sm glass-dropdown tour-card rounded-2xl p-4 shadow-2xl animate-fade-in-up">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center"><Sparkles className="w-5 h-5 text-accent" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">{tr('Animaciones suaves activadas')}</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{tr('Para que FLOWI vaya rápido en tu celular, usamos animaciones más livianas. Puedes cambiarlo cuando quieras en Configuración.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="p-1 -mr-1 -mt-1 text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href="/configuracion#animaciones" onClick={onClose} className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-accent/15 text-accent border border-accent/40">{tr('Ver cómo cambiarlo')}</Link>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-glass-border text-text-primary">{tr('Entendido')}</button>
        </div>
      </div>
    </div>
  );
}
