'use client';
import { useEffect, useState } from 'react';

// La mano 👋 del saludo de Inicio: saluda al entrar, de nuevo cada cierto tiempo y cuando la
// persona vuelve arriba después de bajar por la página (para que se note).
const EVERY_MS = 20000;

export function WavingHand() {
  const [n, setN] = useState(0); // cambiar la key reinicia la animación
  useEffect(() => {
    const wave = () => setN(v => v + 1);
    const t = setInterval(() => { if (document.visibilityState === 'visible') wave(); }, EVERY_MS);
    let wentDown = false;
    const onScroll = () => {
      if (window.scrollY > 300) wentDown = true;
      else if (wentDown && window.scrollY < 60) { wentDown = false; wave(); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearInterval(t); window.removeEventListener('scroll', onScroll); };
  }, []);
  return <span key={n} className="text-[0.85em] inline-block animate-wave" aria-hidden="true">👋</span>;
}
