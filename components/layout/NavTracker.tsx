'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Recuerda en esta pestaña la página anterior dentro de FLOWI (el navegador no lo dice al moverse
// dentro de la app). Lo usan "Atrás" de Amigos y Servicios para volver a donde estaba la persona.
//  - flowi-last-path: la página actual (mientras otra página se monta, todavía es la anterior)
//  - flowi-prev-path: la página de antes
export function NavTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      const last = sessionStorage.getItem('flowi-last-path');
      if (last && last !== path) sessionStorage.setItem('flowi-prev-path', last);
      sessionStorage.setItem('flowi-last-path', path);
    } catch { /* sin almacenamiento */ }
  }, [path]);
  return null;
}

/** Página anterior dentro de FLOWI ('' si se entró directo). */
export const prevPath = () => { try { return sessionStorage.getItem('flowi-prev-path') || ''; } catch { return ''; } };
/** Mientras una página se está abriendo: la página de la que viene. */
export const comingFrom = () => { try { return sessionStorage.getItem('flowi-last-path') || ''; } catch { return ''; } };
