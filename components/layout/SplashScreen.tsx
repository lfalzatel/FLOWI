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

export function SplashScreen({ duration = 2500, mode = 'login', onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(mode === 'logout' ? 100 : 0);
  const [messageIndex, setMessageIndex] = useState(0);

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
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="150 100"
            className="animate-[spin_4s_linear_infinite] origin-center"
            strokeLinecap="round"
          />
          <circle
            cx="50" cy="50" r="41"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="120 80"
            className="animate-[spin_6s_linear_infinite_reverse] origin-center"
            strokeLinecap="round"
          />
        </svg>

        {/* Logo Container */}
        <div className="absolute inset-[15%] rounded-full overflow-hidden border border-white/10 bg-[#0D1527]">
          <img src="/icons/icon-512.png" alt="Logo" className="w-full h-full object-cover scale-[1.15]" />
        </div>
      </div>
      
      {/* Text */}
      <h1 className="mt-6 font-syne font-bold text-4xl text-white tracking-tight relative z-10">
        flowi
      </h1>
      
      {/* Dynamic Subtitle / Message */}
      <p className="mt-2 text-white/60 text-sm font-mono tracking-wider relative z-10 h-5">
        {`>_ ${currentMessage.toUpperCase()}`}
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
