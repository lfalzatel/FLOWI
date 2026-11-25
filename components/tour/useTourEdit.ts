'use client';
import { useEffect, useRef } from 'react';

// Pasos del tutorial que abren algo de la página para mostrarlo mientras lo explican (TourStep.open).
// La página dice cómo abrirlo y cómo cerrarlo; al pasar a otro paso o terminar se cierra sin guardar.
//  open()  → lo abre; devuelve false si no hay nada que mostrar (p. ej. lista vacía)
//  close() → lo cierra
export function useTourAction(name: string, open: () => boolean, close: () => void) {
  const fns = useRef({ open, close });
  fns.current = { open, close };
  useEffect(() => {
    let opened = false;
    const onOpen = (e: Event) => {
      const what = (e as CustomEvent<string>).detail;
      if (what === name) { if (!opened) opened = fns.current.open(); }
      else if (opened) { opened = false; fns.current.close(); }
    };
    const onClose = () => { if (opened) { opened = false; fns.current.close(); } };
    window.addEventListener('flowi-tour-open', onOpen);
    window.addEventListener('flowi-tour-close', onClose);
    return () => {
      window.removeEventListener('flowi-tour-open', onOpen);
      window.removeEventListener('flowi-tour-close', onClose);
    };
  }, [name]);
}

// open: 'edit' → la página abre su primer elemento (una compra, un gasto, un ingreso) en edición
export const useTourEdit = (open: () => boolean, close: () => void) => useTourAction('edit', open, close);
