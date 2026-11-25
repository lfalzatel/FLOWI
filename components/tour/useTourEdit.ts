'use client';
import { useEffect, useRef } from 'react';

// Para los pasos del tutorial con open: 'edit': la página abre su ventana de editar con el primer
// elemento de su lista (una compra, un gasto, un ingreso) para que el tutorial muestre cada parte
// mientras la explica. Al pasar a otro paso o terminar, se cierra sin guardar nada.
//  open()  → abre la ventana; devuelve false si no hay nada que mostrar (lista vacía)
//  close() → la cierra
export function useTourEdit(open: () => boolean, close: () => void) {
  const fns = useRef({ open, close });
  fns.current = { open, close };
  useEffect(() => {
    let opened = false;
    const onOpen = (e: Event) => {
      const what = (e as CustomEvent<string>).detail;
      if (what === 'edit') { if (!opened) opened = fns.current.open(); }
      else if (opened) { opened = false; fns.current.close(); }
    };
    const onClose = () => { if (opened) { opened = false; fns.current.close(); } };
    window.addEventListener('flowi-tour-open', onOpen);
    window.addEventListener('flowi-tour-close', onClose);
    return () => {
      window.removeEventListener('flowi-tour-open', onOpen);
      window.removeEventListener('flowi-tour-close', onClose);
    };
  }, []);
}
