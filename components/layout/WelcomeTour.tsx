'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';

export function WelcomeTour() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;
    
    // Verificar si el tour ya fue completado
    const isCompleted = localStorage.getItem('flowi_welcome_tour_v1');
    if (!isCompleted) {
      // Retrasar la aparición del tour un momento para que cargue la app de fondo
      const timer = setTimeout(() => {
        setShow(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('flowi_welcome_tour_v1', 'completed');
    setShow(false);
  };

  if (!show || !user) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col pointer-events-none select-none">
      {/* Fondo oscuro con máscara o simplemente oscuro translúcido */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
        onClick={handleDismiss}
      />

      {/* Flecha indicadora animada apuntando a la cápsula de perfil (esquina superior derecha) */}
      <div className="absolute right-6 top-16 z-[101] flex flex-col items-center animate-bounce">
        {/* Flecha SVG de estilo boceto/neon */}
        <svg 
          className={`w-12 h-12 rotate-[-45deg] ${isTechTheme ? 'text-accent drop-shadow-[0_0_8px_rgba(0,229,160,0.5)]' : 'text-accent'}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </div>

      {/* Caja de mensaje flotante */}
      <div className="absolute right-4 top-28 z-[101] max-w-[290px] w-[calc(100vw-32px)] pointer-events-auto">
        <div className={`
          p-5 shadow-2xl transition-all duration-300
          ${isTechTheme 
            ? 'bg-black border-2 border-accent rounded-none shadow-[0_0_30px_rgba(0,229,160,0.15)]' 
            : 'glass-card rounded-2xl border border-glass-border bg-deep/90 backdrop-blur-xl'
          }
        `}>
          <div className="flex items-start gap-3 mb-3">
            <span className="text-xl">🎨</span>
            <h4 className={`font-bold text-sm leading-tight ${isTechTheme ? 'font-mono text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
              {isTechTheme ? '>_ CAMBIAR_TEMA' : '¡Personaliza tu Flowi!'}
            </h4>
          </div>
          
          <p className={`text-xs leading-relaxed mb-4 ${isTechTheme ? 'font-mono text-accent/80' : 'text-text-secondary'}`}>
            Toca tu <strong className={isTechTheme ? 'text-accent' : 'text-text-primary'}>foto de perfil</strong> para abrir el menú y cambiar entre el modo Claro, Cyberpunk o KiloCode en cualquier momento.
          </p>

          <button
            onClick={handleDismiss}
            className={`
              w-full py-2.5 text-center text-xs font-bold transition-all duration-200
              ${isTechTheme 
                ? 'bg-accent/10 border border-accent text-accent hover:bg-accent hover:text-black font-mono uppercase tracking-widest' 
                : 'rounded-xl bg-gradient-to-r from-accent to-accent-dim text-white shadow-lg shadow-accent/20 hover:opacity-95 active:scale-[0.98]'
              }
            `}
          >
            {isTechTheme ? 'ENTENDIDO.EXE' : '¡Entendido!'}
          </button>
        </div>
      </div>
    </div>
  );
}
