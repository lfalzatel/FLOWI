'use client';
import { useState, useEffect } from 'react';

interface SplashScreenProps {
  duration?: number;
  onComplete?: () => void;
}

export function SplashScreen({ duration = 2500, onComplete }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onComplete) onComplete();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] z-[100] flex flex-col items-center justify-center">
      {/* Glow effects */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent-dim/10 blur-3xl rounded-full" />

      {/* Logo */}
      <div className="w-24 h-24 rounded-[36px] bg-gradient-to-br from-accent to-accent-dim
                      flex items-center justify-center shadow-2xl shadow-accent/25
                      animate-pulse relative z-10 p-4">
        <img src="/icons/icon-512.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      
      {/* Text */}
      <h1 className="mt-6 font-syne font-bold text-4xl text-white tracking-tight relative z-10">
        flowi
      </h1>
      
      {/* Subtitle */}
      <p className="mt-2 text-white/40 text-sm font-dm relative z-10">
        Tus finanzas en equilibrio
      </p>

      {/* Loading bar */}
      <div className="mt-12 w-48 h-1 bg-white/5 rounded-full overflow-hidden relative z-10">
        <div className="h-full bg-accent rounded-full animate-loading-bar w-full" />
      </div>
    </div>
  );
}
