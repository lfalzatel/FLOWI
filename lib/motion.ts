'use client';
// Nivel de animaciones de FLOWI, guardado en este celular:
//  full = completas (modales que nacen del botón, resortes, destellos)
//  soft = suaves (fundidos simples y vidrio más liviano: para celulares sencillos)
//  off  = apagadas
// Se refleja en <html data-motion="..."> para que el CSS y los componentes lo respeten.

export type MotionLevel = 'full' | 'soft' | 'off';
const KEY = 'flowi-motion';
const NOTICE_KEY = 'flowi-motion-notice'; // aviso de "celular lento" ya mostrado
export const MOTION_EVENT = 'flowi:motion';

export function getSavedMotion(): MotionLevel | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'full' || v === 'soft' || v === 'off' ? v : null;
  } catch { return null; }
}

export function currentMotion(): MotionLevel {
  if (typeof document === 'undefined') return 'full';
  const v = document.documentElement.dataset.motion;
  return v === 'soft' || v === 'off' ? v : 'full';
}

export function applyMotion(level: MotionLevel) {
  if (typeof document !== 'undefined') document.documentElement.dataset.motion = level;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MOTION_EVENT));
}

export function setMotion(level: MotionLevel) {
  try { localStorage.setItem(KEY, level); } catch { /* sin almacenamiento */ }
  applyMotion(level);
}

/** Celular sencillo: pocos núcleos o poca memoria (donde el desenfoque y los resortes se sienten lentos). */
export function isSlowDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const cores = navigator.hardwareConcurrency || 8;
  const mem = (navigator as any).deviceMemory as number | undefined;
  return cores <= 4 || (mem !== undefined && mem <= 3);
}

export function motionNoticeSeen(): boolean {
  try { return localStorage.getItem(NOTICE_KEY) === '1'; } catch { return true; }
}
export function markMotionNoticeSeen() {
  try { localStorage.setItem(NOTICE_KEY, '1'); } catch { /* sin almacenamiento */ }
}
