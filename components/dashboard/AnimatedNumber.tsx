'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';

// Número que "cuenta" hasta su valor:
//  - la primera vez que aparece en pantalla (al entrar a la página, abrir un modal o hacer scroll
//    hasta él) cuenta desde 0;
//  - si después el valor cambia (registrar un gasto), cuenta del valor anterior al nuevo.
// Con "reducir movimiento" activado en el celular se muestra el valor de una.
export function AnimatedNumber({ value, delay = 0, prefix = '', format, duration = 1100 }: {
  value: number;
  delay?: number;
  prefix?: string;
  format?: (n: number) => string; // por defecto, pesos según la moneda del perfil
  duration?: number;              // ms
}) {
  const { profile } = useAuth();
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [display, setDisplay] = useState(0);
  const current = useRef(0);
  const frame = useRef<number | null>(null);

  const fmt = format || ((n: number) => formatCurrency(n, profile?.currency));

  // ¿Ya apareció en pantalla?
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    // Respaldo: si el observador no responde (pestaña en segundo plano, navegador viejo) y el número
    // está en pantalla, se da por visible igual
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight && r.width > 0) {
        setVisible(true); io.disconnect(); window.removeEventListener('scroll', check, true);
      }
    };
    const backup = setTimeout(check, 1500);
    window.addEventListener('scroll', check, { passive: true, capture: true });
    return () => { io.disconnect(); clearTimeout(backup); window.removeEventListener('scroll', check, true); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = current.current;
    const diff = value - from;
    if (reduce || diff === 0) { current.current = value; setDisplay(value); return; }

    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const v = from + diff * eased;
      current.current = v;
      setDisplay(v);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    const wait = Math.min(delay, 0.6) * 1000;
    const timer = setTimeout(() => { frame.current = requestAnimationFrame(step); }, wait);
    // Respaldo: si el celular no dibuja cuadros (app en segundo plano, ahorro de batería), al terminar
    // el tiempo de la animación se muestra el valor final igual. Nunca se queda en un valor intermedio.
    const finish = setTimeout(() => {
      if (current.current !== value) { current.current = value; setDisplay(value); }
    }, wait + duration + 250);
    return () => {
      clearTimeout(timer);
      clearTimeout(finish);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [visible, value, delay, duration]);

  const text = fmt(visible ? display : 0);
  return <span ref={ref} className="tabular-nums">{prefix === '$' ? text : `${prefix}${text}`}</span>;
}
