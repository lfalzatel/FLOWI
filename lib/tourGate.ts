'use client';
import { useEffect, useState } from 'react';

// Turno de las ventanas que se abren solas (tutorial, "Personaliza FLOWI", permiso de
// notificaciones, aviso de actualización). Mientras alguna tiene el turno, las demás esperan
// y aparecen cuando se cierra, una a la vez.
let holds = 0;
const EVENT = 'flowi:popup-gate';

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function isPopupBusy() {
  return holds > 0;
}

/** Ocupa el turno mientras `active` sea verdadero (y el componente esté montado). */
export function usePopupHold(active = true) {
  useEffect(() => {
    if (!active) return;
    holds++;
    emit();
    return () => { holds = Math.max(0, holds - 1); emit(); };
  }, [active]);
}

/** Verdadero mientras otra ventana tiene el turno. */
export function usePopupBusy() {
  const [busy, setBusy] = useState(isPopupBusy);
  useEffect(() => {
    const update = () => setBusy(isPopupBusy());
    update();
    window.addEventListener(EVENT, update);
    return () => window.removeEventListener(EVENT, update);
  }, []);
  return busy;
}
