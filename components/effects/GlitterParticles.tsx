'use client';
import { useEffect, useRef } from 'react';
import { MOTION_EVENT } from '@/lib/motion';

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
  // Carbón y oro: chispas doradas sobre carbón
  carbon: { colors: ['#C9A86A', '#E2C891', '#F3EBDD', '#A8834A', '#FFFFFF'],
    bg: 'radial-gradient(ellipse at 30% 35%, #2E2924 0%, #1B1917 45%, #0D0C0B 100%)' },
  // Obsidiana: vidrio negro con polvo de plata y hielo, y una aurora azul y violeta muy tenue
  obsidiana: { colors: ['#E5E7EB', '#C7D2FE', '#9BD7FF', '#FFFFFF'],
    bg: 'radial-gradient(ellipse at 18% 12%, rgba(64, 132, 255, 0.16) 0%, transparent 46%), radial-gradient(ellipse at 88% 85%, rgba(150, 110, 255, 0.13) 0%, transparent 50%), linear-gradient(180deg, #08090C 0%, #050608 100%)' },
  // Nova: papel crema cálido con polvo cobre y arena
  nova: { colors: ['#A8643C', '#C98B62', '#D9B48F', '#8A5A3B'], light: true,
    bg: 'radial-gradient(ellipse at 30% 30%, #FFFBF5 0%, #F8F2E9 50%, #EFE6D9 100%)' },
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
    // Ahorro de batería: cada punto se pinta UNA vez en una imagen pequeña (sprite) que luego solo se
    // copia; antes se calculaba un degradado nuevo por punto en cada cuadro. Se anima a ~30 cuadros por
    // segundo (se mueven despacio: no se nota) y con animaciones Suaves/Apagadas o batería baja
    // (MotionManager) se dibuja una vez y se queda quieto. Se pausa si la app no se ve.
    const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion !== 'full';
    const FRAME_MS = 33;
    let w = 0, h = 0, dpr = 1, parts: P[] = [], raf = 0, last = performance.now(), lastPaint = 0;

    const sprites = new Map<string, HTMLCanvasElement>();
    const SPRITE = 64; // tamaño de la imagen de cada punto (se escala al dibujar)
    const sprite = (color: string, blur: boolean) => {
      const key = `${color}|${blur ? 1 : 0}`;
      let c = sprites.get(key);
      if (c) return c;
      c = document.createElement('canvas');
      c.width = c.height = SPRITE;
      const g = c.getContext('2d')!;
      const half = SPRITE / 2;
      const grad = g.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
      g.fillStyle = grad; g.beginPath(); g.arc(half, half, half, 0, Math.PI * 2); g.fill();
      if (!blur) { // núcleo brillante del punto
        g.fillStyle = light ? color : '#fff';
        g.beginPath(); g.arc(half, half, half / 8, 0, Math.PI * 2); g.fill();
      }
      sprites.set(key, c);
      return c;
    };

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
      const target = Math.min(150, Math.round((w * h / 10000) * density));
      parts = Array.from({ length: target }, make);
      paint(0);
    };

    const paint = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      for (const p of parts) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.tw += 0.03 * p.ts * dt;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        const a = (p.blur ? 0.12 + 0.1 * Math.sin(p.tw) : 0.35 + 0.65 * Math.max(0, Math.sin(p.tw))) * (light ? 0.55 : 1);
        const R = p.r * (p.blur ? 3 : 4);
        ctx.globalAlpha = a;
        ctx.drawImage(sprite(p.c, p.blur), p.x - R, p.y - R, R * 2, R * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    };

    const loop = (now: number) => {
      raf = 0;
      if (still() || document.hidden) return;
      if (now - lastPaint >= FRAME_MS) {
        const dt = Math.min(100, now - last) / 16.67; last = now; lastPaint = now;
        paint(dt);
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (raf || still() || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    resize();
    start();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const vis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener(MOTION_EVENT, start); // si vuelven a Completas, se reanuda
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener(MOTION_EVENT, start);
    };
  }, [density, colors, light]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} style={background === 'none' ? undefined : { background }} aria-hidden="true">
      <canvas ref={ref} className="w-full h-full block" />
    </div>
  );
}
