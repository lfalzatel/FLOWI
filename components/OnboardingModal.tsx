'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { Mic, Sparkles, X, ChevronRight, ChevronLeft, Check, ShieldCheck, Wallet, Calendar, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
}

const SLIDES = [
  {
    icon: Mic,
    badge: 'DICTADO INTELIGENTE',
    title: 'Dicta tus gastos por voz',
    description: 'Toca el micrófono amarillo y habla con tu voz natural. FLOWI entiende montos, categorías y frases compuestas como "Gasté 45 mil en mercado y 20 mil en gasolina".',
    color: 'from-amber-500/20 to-orange-500/10',
    iconColor: 'text-amber-400',
  },
  {
    icon: ShieldCheck,
    badge: 'CONTROL DE INGRESOS',
    title: 'Gastos Fijos vs. Dinero Libre',
    description: 'Marca arriendos y servicios como Gastos Fijos para aislarlos de tus compras diarias. FLOWI recalculará exactamente cuánto dinero libre te queda.',
    color: 'from-emerald-500/20 to-teal-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Wallet,
    badge: 'SALDURA DIARIA',
    title: 'Cuota diaria inteligente',
    description: 'Consulta cuántos días faltan para fin de mes y cuánto puedes gastar diariamente para no sobrepasar tus ingresos. ¡Sin estrés financiero!',
    color: 'from-blue-500/20 to-indigo-500/10',
    iconColor: 'text-blue-400',
  },
];

export function OnboardingModal({ onClose }: OnboardingModalProps) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const [currentSlide, setCurrentSlide] = useState(0);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      try {
        localStorage.setItem('flowi_has_seen_onboarding', 'true');
      } catch (e) {}
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono text-sm' : ''}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 ${theme === 'light' ? 'bg-black/40 backdrop-blur-xs' : 'bg-black/75 backdrop-blur-md'}`} 
        onClick={onClose} 
      />

      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up p-6 glass-dropdown flex flex-col items-center text-center overflow-hidden ${
          isTechTheme ? 'rounded-none border border-accent bg-deep uppercase' : 'rounded-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button 
          type="button"
          onClick={() => {
            localStorage.setItem('flowi_has_seen_onboarding', 'true');
            onClose();
          }} 
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${
            isTechTheme ? 'text-accent hover:bg-accent/10' : 'text-text-muted hover:text-text-primary hover:bg-white/10'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge superior */}
        <div className="flex items-center gap-1.5 mb-4">
          <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          <span className={`text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full ${
            isTechTheme ? 'bg-accent/20 text-accent font-mono border border-accent/40' : 'bg-accent/15 text-accent'
          }`}>
            {slide.badge}
          </span>
        </div>

        {/* Contenedor Ilustrativo */}
        <div className={`w-28 h-28 my-2 rounded-3xl bg-gradient-to-br ${slide.color} border border-white/10 flex items-center justify-center relative shadow-xl`}>
          <div className="absolute inset-0 rounded-3xl bg-white/5 backdrop-blur-xs" />
          <Icon className={`w-12 h-12 relative z-10 ${slide.iconColor} animate-bounce`} />
        </div>

        {/* Título & Descripción */}
        <div className="my-4 min-h-[7rem] flex flex-col items-center justify-center">
          <h2 className={`font-bold text-xl mb-2 ${isTechTheme ? 'text-accent tracking-wider font-mono' : 'text-text-primary font-syne'}`}>
            {slide.title}
          </h2>
          <p className={`text-xs leading-relaxed max-w-xs ${isTechTheme ? 'text-accent/80 font-mono' : 'text-text-secondary'}`}>
            {slide.description}
          </p>
        </div>

        {/* Indicadores de diapositiva (Puntos) */}
        <div className="flex items-center gap-2 my-3">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentSlide === idx 
                  ? 'w-6 bg-accent' 
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Botones de Navegación */}
        <div className="w-full flex items-center gap-3 mt-4">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center transition-all ${
                isTechTheme ? 'border border-accent/30 text-accent hover:bg-accent/10 font-mono' : 'bg-white/10 text-text-primary hover:bg-white/20'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              isTechTheme 
                ? 'bg-accent/20 border border-accent text-accent hover:bg-accent/30 font-mono uppercase tracking-wider' 
                : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl shadow-lg shadow-accent/25 hover:opacity-90 font-syne'
            }`}
          >
            <span>{currentSlide === SLIDES.length - 1 ? '¡Comenzar ahora!' : 'Siguiente'}</span>
            {currentSlide === SLIDES.length - 1 ? (
              <Check className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
