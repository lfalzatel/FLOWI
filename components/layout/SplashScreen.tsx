'use client';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  duration?: number;
  mode?: 'login' | 'reload' | 'logout';
  onComplete?: () => void;
}

const LOGIN_MESSAGES = ["Conectando al servidor...", "Verificando credenciales...", "Descargando perfil...", "Iniciando sistema..."];
const RELOAD_MESSAGES = ["Restaurando sesión...", "Cargando datos...", "Listo"];
const LOGOUT_MESSAGES = ["Borrando caché...", "Cerrando conexión...", "Desconectando perfil...", "Apagando..."];

import { useTheme } from '@/components/ThemeProvider';

export function SplashScreen({ duration = 2500, mode = 'login', onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(mode === 'logout' ? 100 : 0);
  const [messageIndex, setMessageIndex] = useState(0);
  const { theme } = useTheme();

  useEffect(() => {
    let start: number | null = null;
    let animationFrame: number;

    const messages = mode === 'login' ? LOGIN_MESSAGES : mode === 'reload' ? RELOAD_MESSAGES : LOGOUT_MESSAGES;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const t = Math.min(elapsed / duration, 1);
      
      const currentProgress = mode === 'logout' ? 100 - (t * 100) : (t * 100);
      setProgress(currentProgress);

      const msgIdx = Math.min(Math.floor(t * messages.length), messages.length - 1);
      setMessageIndex(msgIdx);

      if (t < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        if (onComplete) onComplete();
      }
    };

    animationFrame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, mode, onComplete]);

  const messages = mode === 'login' ? LOGIN_MESSAGES : mode === 'reload' ? RELOAD_MESSAGES : LOGOUT_MESSAGES;
  const currentMessage = messages[messageIndex];

  // Dynamic colors for the logo based on theme
  let logoOuterColor = '#10B981'; // Default / Dark theme
  let logoInnerColor = '#3B82F6';
  let fColorClass = 'text-white';
  
  if (theme === 'cyberpunk') {
    logoOuterColor = '#00FF41'; // Neon Green
    logoInnerColor = '#0FF0FC'; // Cyan
    fColorClass = 'text-[#00FF41] drop-shadow-[0_0_12px_rgba(0,255,65,0.8)]';
  } else if (theme === 'kiloCode') {
    logoOuterColor = '#F0DB4F'; // JS Yellow
    logoInnerColor = '#F97316'; // Orange
    fColorClass = 'text-[#F0DB4F] drop-shadow-[0_0_12px_rgba(240,219,79,0.8)]';
  } else if (theme === 'light') {
    logoOuterColor = '#059669'; // Darker green
    logoInnerColor = '#2563EB'; // Darker blue
    fColorClass = 'text-[#059669]';
  }

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] z-[9999] flex flex-col items-center justify-center">
      {/* Glow effects */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-dim/10 blur-3xl rounded-full" />

      <div className="relative w-40 h-40 mx-auto z-10">
        {/* SVG Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="46"
            fill="none"
            stroke={logoOuterColor}
            strokeWidth="2"
            strokeDasharray="70 26.3"
            className="animate-[spin_4s_linear_infinite] origin-center transition-colors duration-500"
            strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r="41"
            fill="none"
            stroke={logoInnerColor}
            strokeWidth="2"
            strokeDasharray="60 25.8"
            className="animate-[spin_6s_linear_infinite_reverse] origin-center transition-colors duration-500"
            strokeLinecap="round"
          />
        </svg>

        {/* Logo Container */}
        <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527] flex items-center justify-center">
          <svg className="w-full h-full drop-shadow-lg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            {/* Vertical stem */}
            <line x1="33" y1="25" x2="33" y2="75" stroke={logoOuterColor} strokeWidth="12" strokeLinecap="round" className="transition-colors duration-500" />
            {/* Top bar */}
            <line x1="33" y1="25" x2="58" y2="25" stroke={logoInnerColor} strokeWidth="12" strokeLinecap="round" className="transition-colors duration-500" />
            {/* Middle bar */}
            <line x1="33" y1="50" x2="48" y2="50" stroke={logoOuterColor} strokeWidth="12" strokeLinecap="round" className="transition-colors duration-500" />
            {/* Dot */}
            <circle cx="68" cy="50" r="6" fill={logoInnerColor} className="transition-colors duration-500" />
          </svg>
        </div>
      </div>
      
      {/* Text */}
      <h1 className="mt-6 font-syne font-bold text-4xl text-white tracking-tight relative z-10">
        flowi
      </h1>
      
      {/* Dynamic Subtitle / Message */}
      <p className="mt-2 text-white/60 text-sm font-mono tracking-wider relative z-10 h-5 flex items-center justify-center gap-2">
        <span>{`>_ ${currentMessage.toUpperCase()}`}</span>
        <span className="text-accent font-bold">[{Math.round(progress)}%]</span>
      </p>

      {/* Loading bar */}
      <div className="mt-8 w-64 h-1 bg-white/10 rounded-full overflow-hidden relative z-10">
        <div 
          className="h-full bg-accent rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
