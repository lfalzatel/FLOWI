'use client';
import { useEffect, useRef } from 'react';

// Fondo de partículas brillantes (como polvo de luz azul flotando), dibujado con canvas.
// Liviano: pocas partículas en el celular, se pausa si la pestaña no se ve y respeta "reducir movimiento".
interface Props {
  className?: string;
  density?: number;          // partículas por cada 10.000 px² (por defecto 1.1)
  colors?: string[];         // colores de las partículas
  background?: string;       // degradado de fondo (CSS); 'none' = transparente (la página pone el suyo)
  light?: boolean;           // fondo claro: las partículas se pintan normal (no suman luz) y más suaves
}

// Colores de las partículas para cada tema de FLOWI
export const GLITTER_THEMES: Record<string, { colors: string[]; light?: boolean; bg: string }> = {
  dark: { colors: ['#7DD3FC', '#38BDF8', '#22D3EE', '#A5F3FC', '#FFFFFF'],
    bg: 'radial-gradient(ellipse at 30% 35%, #0E4A63 0%, #062435 45%, #020B12 100%)' },
  // Glass: el fondo de la página de prueba (azul profundo) con tarjetas de vidrio
  glassmorphism: { colors: ['#7DD3FC', '#38BDF8', '#22D3EE', '#A5F3FC', '#FFFFFF'],
    bg: 'radial-gradient(ellipse at 30% 40%, #0E4A63 0%, #062435 45%, #020B12 100%)' },
  // Nebulosa: violeta y rosado
  nebula: { colors: ['#C4B5FD', '#A78BFA', '#F0ABFC', '#93C5FD', '#FFFFFF'],
    bg: 'radial-gradient(ellipse at 30% 35%, #3B1F66 0%, #1E1040 45%, #0A0618 100%)' },
  // Cyber y Kilo: partículas sobre su fondo de siempre (sin resplandor)
  cyberpunk: { colors: ['#00FF41', '#39FF88', '#0FF0FC', '#B6FFCE', '#FFFFFF'], bg: 'var(--bg-deep)' },
  kiloCode: { colors: ['#F0DB4F', '#FACC15', '#F97316', '#FDE68A', '#FFFFFF'], bg: 'var(--bg-deep)' },
  light: { colors: ['#06B6D4', '#10B981', '#0EA5E9', '#14B8A6'], light: true,
    bg: 'radial-gradient(ellipse at 30% 35%, #E0F7FB 0%, #EEF9F6 45%, #F8FAFC 100%)' },
};

interface P { x: number; y: number; r: number; vx: number; vy: number; tw: number; ts: number; c: string; blur: boolean }

export function GlitterParticles({
  className = '',
  density = 1.1,
  colors = ['#7DD3FC', '#38BDF8', '#22D3EE', '#A5F3FC', '#FFFFFF'],
  background = 'radial-gradient(ellipse at 30% 40%, #0E4A63 0%, #062435 45%, #020B12 100%)',
  light = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1, parts: P[] = [], raf = 0, last = performance.now();

    const make = (): P => {
      const blur = Math.random() < 0.18; // algunas grandes y desenfocadas (bokeh)
      return {
        x: Math.random() * w, y: Math.random() * h,
        r: blur ? 2.5 + Math.random() * 5 : 0.4 + Math.random() * 1.6,
        vx: (Math.random() - 0.5) * 0.12, vy: -0.05 - Math.random() * 0.25,
        tw: Math.random() * Math.PI * 2, ts: 0.6 + Math.random() * 1.8,
        c: colors[Math.floor(Math.random() * colors.length)], blur,
      };
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(260, Math.round((w * h / 10000) * density));
      parts = Array.from({ length: target }, make);
    };

    const draw = (now: number) => {
      const dt = Math.min(50, now - last) / 16.67; last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.tw += 0.03 * p.ts * dt;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        const a = (p.blur ? 0.12 + 0.1 * Math.sin(p.tw) : 0.35 + 0.65 * Math.max(0, Math.sin(p.tw))) * (light ? 0.55 : 1);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * (p.blur ? 3 : 4));
        g.addColorStop(0, p.c); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.blur ? 3 : 4), 0, Math.PI * 2); ctx.fill();
        if (!p.blur) { ctx.globalAlpha = Math.min(1, a + 0.2); ctx.fillStyle = light ? p.c : '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw(performance.now());
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const vis = () => { cancelAnimationFrame(raf); if (!document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(draw); } };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [density, colors, light]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={background === 'none' ? undefined : { background }} aria-hidden="true">
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
