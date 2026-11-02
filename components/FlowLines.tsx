'use client';
import { useId } from 'react';

// Fondo animado propio de FLOWI: un "río" de ondas por donde viajan destellos y puntos de dinero.
// Solo SVG + CSS (sin JavaScript en cada cuadro); toma el color del tema activo (--accent) y se
// queda quieto si el sistema pide reducir el movimiento.

const WAVES = [
  'M-80 300 C 160 220, 340 380, 560 300 S 940 200, 1180 290 S 1440 360, 1540 300',
  'M-80 340 C 200 270, 380 420, 620 340 S 980 250, 1220 330 S 1460 400, 1540 350',
  'M-80 260 C 120 190, 300 330, 520 260 S 900 160, 1140 250 S 1420 320, 1540 250',
  'M-80 390 C 240 330, 420 460, 680 390 S 1020 300, 1260 380 S 1470 440, 1540 400',
  'M-80 220 C 100 160, 280 280, 480 220 S 860 120, 1100 210 S 1400 270, 1540 210',
];

// Destellos: [onda, duración en s, retraso en s, sentido inverso]
const PULSES: [number, number, number, boolean][] = [
  [0, 11, 0, false],
  [1, 15, -4, true],
  [2, 13, -7, false],
  [3, 18, -2, true],
  [4, 16, -9, false],
];

interface Props {
  className?: string;
  // 'full' para fondos de pantalla completa; 'hero' para una franja superior más sutil
  variant?: 'full' | 'hero';
}

export function FlowLines({ className = '', variant = 'full' }: Props) {
  const uid = useId().replace(/:/g, '');
  const gradId = `flowGrad${uid}`;
  const fadeId = `flowFade${uid}`;
  const maskId = `flowMask${uid}`;
  const baseOpacity = variant === 'hero' ? 0.35 : 0.55;

  return (
    <div aria-hidden="true" className={`flow-lines pointer-events-none overflow-hidden ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={{ stopColor: 'rgb(var(--accent-dim))' }} />
            <stop offset="0.55" style={{ stopColor: 'rgb(var(--accent))' }} />
            <stop offset="1" style={{ stopColor: '#38BDF8' }} />
          </linearGradient>
          {/* Desvanece los bordes para que el contenido encima se lea limpio */}
          <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.75" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={maskId}>
            <rect x="0" y="0" width="1440" height="600" fill={`url(#${fadeId})`} />
          </mask>
        </defs>

        <g mask={`url(#${maskId})`} className="flow-lines-drift">
          {/* Ondas base, muy tenues */}
          {WAVES.map((d, i) => (
            <path key={`w${i}`} d={d} fill="none" stroke={`url(#${gradId})`} strokeWidth={1.2}
                  strokeOpacity={baseOpacity * (0.45 + (i % 3) * 0.15)} />
          ))}

          {/* Destellos que recorren las ondas */}
          {PULSES.map(([wave, duration, delay, reverse], i) => (
            <path key={`p${i}`} d={WAVES[wave]} fill="none" stroke={`url(#${gradId})`} strokeWidth={2.2}
                  strokeLinecap="round" className="flow-lines-pulse"
                  style={{
                    animationDuration: `${duration}s`,
                    animationDelay: `${delay}s`,
                    animationDirection: reverse ? 'reverse' : 'normal',
                    opacity: Math.min(1, baseOpacity + 0.35),
                  }} />
          ))}

          {/* Puntos de dinero que viajan por dos ondas */}
          {[0, 3].map((wave, i) => (
            <circle key={`c${i}`} r={4} className="flow-lines-coin"
                    style={{
                      offsetPath: `path('${WAVES[wave]}')`,
                      animationDuration: `${20 + i * 6}s`,
                      animationDelay: `${-i * 7}s`,
                      fill: 'rgb(var(--accent))',
                      opacity: Math.min(1, baseOpacity + 0.25),
                    }} />
          ))}
        </g>
      </svg>
    </div>
  );
}
