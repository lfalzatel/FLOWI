'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';

interface PowerAnimationEvent {
  amount: number;
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion';
}

export function PowerAnimation() {
  const [active, setActive] = useState(false);
  const [data, setData] = useState<PowerAnimationEvent | null>(null);
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<PowerAnimationEvent>;
      setData(customEvent.detail);
      setActive(true);
    };

    window.addEventListener('show-power-animation', handleTrigger);
    return () => window.removeEventListener('show-power-animation', handleTrigger);
  }, []);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setActive(false);
      }, 1300); // Duración de la animación
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || !data || typeof document === 'undefined') return null;

  // Personalización del color y signo según el tipo de acción
  let labelPrefix = '';
  let colorClass = '';
  let shadowColor = '';
  let actionText = '';

  if (data.type === 'ingreso') {
    labelPrefix = '+';
    colorClass = 'from-emerald-400 via-green-400 to-yellow-400';
    shadowColor = 'rgba(16,185,129,0.5)';
    actionText = 'INGRESO REGISTRADO';
  } else if (data.type === 'abono') {
    labelPrefix = '+';
    colorClass = 'from-cyan-400 via-[#00E5A0] to-emerald-400';
    shadowColor = 'rgba(0,229,160,0.5)';
    actionText = 'ABONO COMPLETO';
  } else if (data.type === 'edicion') {
    labelPrefix = '✓';
    colorClass = 'from-blue-400 via-indigo-400 to-purple-400';
    shadowColor = 'rgba(59,130,246,0.5)';
    actionText = 'TRANSACCIÓN ACTUALIZADA';
  } else {
    // gasto
    labelPrefix = '-';
    colorClass = 'from-rose-500 via-red-500 to-pink-500';
    shadowColor = 'rgba(239,68,68,0.5)';
    actionText = 'GASTO REGISTRADO';
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0 }).format(n);

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[200] flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        @keyframes power-up {
          0% {
            transform: scale(0.2) translateY(30px);
            opacity: 0;
          }
          15% {
            transform: scale(1.1) translateY(-10px);
            opacity: 1;
          }
          25% {
            transform: scale(1) translateY(0);
          }
          75% {
            opacity: 1;
            transform: translateY(-20px);
          }
          100% {
            opacity: 0;
            transform: translateY(-70px) scale(0.9);
          }
        }
        @keyframes ring-flash {
          0% {
            transform: scale(0.3);
            opacity: 0;
            border-width: 8px;
          }
          30% {
            opacity: 0.8;
          }
          100% {
            transform: scale(2);
            opacity: 0;
            border-width: 1px;
          }
        }
        @keyframes particle-rise {
          0% {
            transform: translateY(20px) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-120px) scale(1.2) rotate(45deg);
            opacity: 0;
          }
        }
        .animate-power {
          animation: power-up 1.3s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-ring {
          animation: ring-flash 0.8s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .particle {
          animation: particle-rise 1.1s cubic-bezier(0.1, 0.6, 0.2, 1) forwards;
        }
      `}</style>

      {/* Ring Flash (Destello circular expansivo tipo Age of Empires) */}
      <div 
        className="absolute w-44 h-44 rounded-full border border-white flex items-center justify-center animate-ring"
        style={{ borderColor: shadowColor, boxShadow: `0 0 30px ${shadowColor}` }}
      />

      {/* Floating Particles (Partículas de luz ascendentes) */}
      {[...Array(12)].map((_, i) => {
        const leftOffset = (Math.random() - 0.5) * 160; // Desplazamiento horizontal aleatorio
        const scale = 0.5 + Math.random() * 0.8;
        const delay = Math.random() * 0.4;
        return (
          <div
            key={i}
            className="absolute particle w-1.5 h-1.5 rounded-full"
            style={{
              left: `calc(50% + ${leftOffset}px)`,
              backgroundColor: shadowColor.replace('0.5', '0.8'),
              boxShadow: `0 0 8px 2px ${shadowColor}`,
              animationDelay: `${delay}s`,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}

      {/* Power Up Banner & Numbers */}
      <div className="flex flex-col items-center justify-center text-center animate-power">
        <span 
          className={`
            text-[9px] tracking-[0.3em] font-extrabold mb-1
            ${isTechTheme ? 'font-mono text-accent' : 'font-syne text-white/50'}
          `}
          style={{ textShadow: `0 0 10px ${shadowColor}` }}
        >
          {actionText}
        </span>
        <div 
          className={`
            text-4xl md:text-5xl font-black font-syne bg-clip-text text-transparent bg-gradient-to-r filter drop-shadow-lg
            ${isTechTheme ? 'font-mono' : ''}
          `}
          style={{ 
            backgroundImage: `linear-gradient(to right, #FFF, ${shadowColor.replace('0.5', '1')})`,
            textShadow: `0 0 25px ${shadowColor}`,
            filter: `drop-shadow(0 0 10px ${shadowColor})`
          }}
        >
          {labelPrefix}${fmt(data.amount)}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Función helper para disparar la animación desde cualquier sitio
export function triggerPowerAnimation(amount: number, type: 'gasto' | 'ingreso' | 'abono' | 'edicion') {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-power-animation', {
      detail: { amount, type }
    });
    window.dispatchEvent(event);
  }
}
