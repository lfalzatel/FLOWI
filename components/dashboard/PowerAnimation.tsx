'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Trash2, CheckCircle2, Trophy } from 'lucide-react';
import { triggerDualBurst } from '@/components/dashboard/DualTrajectoryBurst';
import { speakText } from '@/lib/voiceParser';

interface PowerAnimationEvent {
  amount: number;
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion';
  customTitle?: string;
  customText?: string;
}

// Global AudioContext singleton para sintaxis fluida y cero latencia
let globalAudioCtx: AudioContext | null = null;
let activeAudioFile: HTMLAudioElement | null = null;
let activeTimers: ReturnType<typeof setTimeout>[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
        globalAudioCtx = new AudioCtxClass();
      }
      if (globalAudioCtx.state === 'suspended') {
        globalAudioCtx.resume();
      }
      return globalAudioCtx;
    }
  } catch (e) {
    console.warn('Web Audio API not supported:', e);
  }
  return null;
}

// Detiene de forma inmediata cualquier audio o tono sintetizado anterior
export function stopCurrentSound() {
  if (activeAudioFile) {
    try {
      activeAudioFile.pause();
      activeAudioFile.currentTime = 0;
    } catch (e) {}
    activeAudioFile = null;
  }

  activeTimers.forEach(clearTimeout);
  activeTimers = [];

  if (globalAudioCtx && globalAudioCtx.state !== 'closed') {
    try {
      globalAudioCtx.close();
    } catch (e) {}
    globalAudioCtx = null;
  }
}

// Sintetizador autónomo Web Audio API & reproductor de tonos según configuración
export function playSynthesizedSound(type: PowerAnimationEvent['type'], overrideSetting?: string) {
  if (typeof window === 'undefined') return;

  // 1. Detener de inmediato cualquier sonido anterior en reproducción (Previsualización Limpia)
  stopCurrentSound();

  // Verificar si los sonidos globales están desactivados
  if (localStorage.getItem('sound_enabled') === 'false') return;

  // Obtener configuración para esta acción
  let soundSetting = overrideSetting;
  if (!soundSetting) {
    if (type === 'ingreso' || type === 'abono') {
      soundSetting = localStorage.getItem('sound_ingreso') || 'synth';
    } else if (type === 'gasto') {
      soundSetting = localStorage.getItem('sound_gasto') || 'synth';
    } else if (type === 'edicion') {
      soundSetting = localStorage.getItem('sound_edicion') || 'synth';
    } else if (type === 'eliminacion') {
      soundSetting = localStorage.getItem('sound_eliminacion') || 'synth';
    }
  }

  if (soundSetting === 'silent') return;

  // Reproducción de archivos de audio
  if (soundSetting === 'bass') {
    const audio = new Audio('/assets/sounds/550332__wax_vibe__cyberpunk-bass.wav');
    audio.volume = 0.6;
    activeAudioFile = audio;
    audio.play().catch(() => {});
    return;
  }
  if (soundSetting === 'rover') {
    const audio = new Audio('/assets/sounds/565373__the_runner_01__rover-landing.wav');
    audio.volume = 0.6;
    activeAudioFile = audio;
    audio.play().catch(() => {});
    return;
  }
  if (soundSetting === 'boomstick') {
    const audio = new Audio('/assets/sounds/73577__cyberpunk64bit__boomstick.mp3');
    audio.volume = 0.6;
    activeAudioFile = audio;
    audio.play().catch(() => {});
    return;
  }
  if (soundSetting === 'bell') {
    const audio = new Audio('/assets/sounds/notification-sound.mp3');
    audio.volume = 0.6;
    activeAudioFile = audio;
    audio.play().catch(() => {});
    return;
  }
  if (soundSetting === 'soft') {
    const audio = new Audio('/assets/sounds/notification.mp3');
    audio.volume = 0.6;
    activeAudioFile = audio;
    audio.play().catch(() => {});
    return;
  }

  // Síntesis Web Audio API
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const playTone = (
    freq: number,
    waveType: OscillatorType,
    durationMs: number,
    delayMs: number = 0,
    gainLevel: number = 0.18
  ) => {
    const t = setTimeout(() => {
      try {
        if (!ctx || ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = waveType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainLevel, ctx.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch (err) {}
    }, delayMs);
    activeTimers.push(t);
  };

  // 🍄 SÍNTESIS DE SONIDOS TIPO MARIO BROS (8-BIT NES)
  if (soundSetting === 'mario_1up') {
    const notes = [659.25, 1046.50, 1318.51, 1567.98, 2093.00, 3135.96];
    notes.forEach((freq, idx) => {
      const duration = idx === notes.length - 1 ? 360 : 70;
      playTone(freq, 'square', duration, idx * 70, 0.15);
    });
    return;
  }

  if (soundSetting === 'mario_coin') {
    playTone(987.77, 'square', 80, 0, 0.15);
    playTone(1318.51, 'square', 340, 80, 0.18);
    return;
  }

  if (soundSetting === 'mario_jump') {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
    return;
  }

  if (soundSetting === 'mario_pipe') {
    const notes = [261.63, 207.65, 174.61, 130.81];
    notes.forEach((freq, idx) => {
      playTone(freq, 'square', 110, idx * 95, 0.16);
    });
    return;
  }

  // OTROS SONIDOS SINTETIZADOS
  if (type === 'eliminacion' && soundSetting === 'synth_laser') {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880.00, now);
      osc.frequency.exponentialRampToValueAtTime(65.00, now + 0.35);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  } else if (type === 'eliminacion' && soundSetting === 'synth_dissolve') {
    const notes = [587.33, 493.88, 392.00, 293.66];
    notes.forEach((freq, idx) => {
      playTone(freq, 'sine', 450, idx * 90, 0.16);
    });
  } else if (type === 'eliminacion') {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(110.00, now + 0.45);

      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  } else if (type === 'ingreso' || type === 'abono') {
    const arpeggio = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
    arpeggio.forEach((freq, idx) => {
      playTone(freq, 'sine', 350, idx * 80, 0.16);
    });

    playTone(1567.98, 'sine', 800, 600, 0.20);
    playTone(2093.00, 'triangle', 600, 750, 0.12);
  } else if (type === 'gasto') {
    const notes = [659.25, 523.25, 440.00, 349.23];
    notes.forEach((freq, idx) => {
      playTone(freq, 'triangle', 320, idx * 75, 0.18);
    });
    playTone(261.63, 'sine', 500, 300, 0.15);
  } else if (type === 'edicion') {
    const notes = [659.25, 880.00, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      playTone(freq, 'sine', 300, idx * 90, 0.15);
    });
    playTone(1760.00, 'sine', 600, 450, 0.16);
  }
}

// 🍿 Sintetizador de efectos de interfaz PAE (Navegación / Menú Inferior / Botones)
export function playUISound(overrideType?: string) {
  if (typeof window === 'undefined') return;

  if (localStorage.getItem('sound_enabled') === 'false') return;

  const soundType = overrideType || localStorage.getItem('sound_ui_nav') || 'pop';
  if (soundType === 'silent') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (soundType === 'pop') {
    // 🍿 1. Pop / Burbuja (Sine 440Hz -> 880Hz, 80ms)
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  } else if (soundType === 'click') {
    // ⚡ 2. Click Digital (Triangle 1200Hz, 30ms)
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  } else if (soundType === 'chime') {
    // 🎵 3. Campana Armónica (Dual Sine C5 523Hz + E5 659Hz, 120ms)
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.12);
      osc2.stop(now + 0.12);
    } catch (e) {}
  } else if (soundType === 'haptic') {
    // 📳 4. Toque Háptico (Sine 160Hz -> 50Hz, 40ms)
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.04);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  } else if (soundType === 'arcade') {
    // ✨ 5. Chime Brillos (Sine 600Hz -> 1200Hz -> 1800Hz, 120ms)
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.12);
      gain.gain.setValueAtTime(0.10, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }
}

export function PowerAnimation() {
  const [active, setActive] = useState(false);
  const [data, setData] = useState<PowerAnimationEvent | null>(null);
  const { theme } = useTheme();
  const { profile } = useAuth();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<PowerAnimationEvent>;
      const eventData = customEvent.detail;
      setData(eventData);
      setActive(true);
    };

    window.addEventListener('show-power-animation', handleTrigger);
    return () => window.removeEventListener('show-power-animation', handleTrigger);
  }, []);

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => {
        setActive(false);
      }, 3400);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || !data || typeof document === 'undefined') return null;

  // Personalización del tema, colores e insignias flotantes 3D
  let labelPrefix = '';
  let colorGradient = 'from-emerald-300 via-emerald-400 to-teal-300';
  let borderGradient = 'from-emerald-400 via-teal-300 to-cyan-400';
  let primaryColor = '#00E5A0';
  let secondaryColor = '#00E5FF';
  let shadowRgba = 'rgba(0, 229, 160, 0.75)';
  let actionText = 'INGRESO REGISTRADO';
  let actionSubtitle = '¡Tu saldo ha aumentado!';
  let IconComponent = TrendingUp;
  let badgeEmoji = '⭐';

  if (data.type === 'ingreso') {
    labelPrefix = '+';
    colorGradient = 'from-emerald-300 via-teal-300 to-cyan-300';
    borderGradient = 'from-emerald-400 via-teal-400 to-cyan-400';
    primaryColor = '#00E5A0';
    secondaryColor = '#00E5FF';
    shadowRgba = 'rgba(0, 229, 160, 0.75)';
    actionText = 'INGRESO REGISTRADO';
    actionSubtitle = '¡Saldo actualizado con éxito!';
    IconComponent = TrendingUp;
    badgeEmoji = '✨';
  } else if (data.type === 'abono') {
    labelPrefix = '+';
    colorGradient = 'from-cyan-300 via-blue-400 to-indigo-300';
    borderGradient = 'from-cyan-400 via-blue-400 to-indigo-400';
    primaryColor = '#00E5FF';
    secondaryColor = '#3B82F6';
    shadowRgba = 'rgba(0, 229, 255, 0.75)';
    actionText = 'ABONO REGISTRADO';
    actionSubtitle = '¡Deuda reducida con éxito!';
    IconComponent = RefreshCw;
    badgeEmoji = '💎';
  } else if (data.type === 'edicion') {
    labelPrefix = '✓ ';
    colorGradient = 'from-purple-300 via-indigo-300 to-blue-300';
    borderGradient = 'from-purple-400 via-indigo-400 to-blue-400';
    primaryColor = '#8B5CF6';
    secondaryColor = '#3B82F6';
    shadowRgba = 'rgba(139, 92, 246, 0.75)';
    actionText = 'TRANSACCIÓN EDITA';
    actionSubtitle = '¡Cambios guardados con éxito!';
    IconComponent = CheckCircle2;
    badgeEmoji = '🔮';
  } else if (data.type === 'eliminacion') {
    labelPrefix = data.amount > 0 ? '✕ ' : '';
    colorGradient = 'from-red-400 via-rose-400 to-orange-400';
    borderGradient = 'from-red-500 via-rose-500 to-orange-500';
    primaryColor = '#EF4444';
    secondaryColor = '#F97316';
    shadowRgba = 'rgba(239, 68, 68, 0.75)';
    actionText = data.customTitle || (data.amount > 0 ? 'TRANSACCIÓN ELIMINADA' : 'REGISTRO ELIMINADO');
    actionSubtitle = '¡Removido con éxito!';
    IconComponent = Trash2;
    badgeEmoji = '⚡';
  } else {
    // gasto
    labelPrefix = '-';
    colorGradient = 'from-rose-300 via-red-400 to-pink-300';
    borderGradient = 'from-rose-500 via-red-500 to-pink-500';
    primaryColor = '#FF2E63';
    secondaryColor = '#EF4444';
    shadowRgba = 'rgba(255, 46, 99, 0.75)';
    actionText = data.customTitle || 'GASTO REGISTRADO';
    actionSubtitle = '¡Balance actualizado!';
    IconComponent = TrendingDown;
    badgeEmoji = '💸';
  }

  const fmt = (n: number) => formatCurrency(n, profile?.currency).replace(/\.00$/, '');
  const formattedText = data.customText || (data.amount > 0 ? `${labelPrefix}${fmt(data.amount)}` : '¡REMOVIDO!');

  return createPortal(
    <div 
      className="fixed inset-0 pointer-events-auto z-[9999] flex items-center justify-center overflow-hidden touch-none select-none"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <style>{`
        @keyframes backdrop-fade {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes mario-temu-pop {
          0% { transform: scale(0.15) translateY(60px) rotateX(25deg); opacity: 0; }
          22% { transform: scale(1.18) translateY(-12px) rotateX(-5deg); opacity: 1; }
          32% { transform: scale(1) translateY(0) rotateX(0deg); opacity: 1; }
          80% { transform: scale(1) translateY(-6px); opacity: 1; }
          100% { transform: scale(0.65) translateY(-80px) rotateX(-20deg); opacity: 0; }
        }
        @keyframes sunburst-cw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes sunburst-ccw {
          from { transform: translate(-50%, -50%) rotate(360deg); }
          to { transform: translate(-50%, -50%) rotate(0deg); }
        }
        @keyframes badge-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.1); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes star-burst-up {
          0% { transform: translateY(10px) scale(0) rotate(0deg); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(-160px) scale(1.5) rotate(360deg); opacity: 0; }
        }
        .animate-backdrop-flowi {
          animation: backdrop-fade 3.4s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-mario-temu-card {
          animation: mario-temu-pop 3.4s cubic-bezier(0.18, 1.4, 0.35, 1) forwards;
        }
        .animate-sunburst-cw {
          animation: sunburst-cw 12s linear infinite;
        }
        .animate-sunburst-ccw {
          animation: sunburst-ccw 8s linear infinite;
        }
        .animate-badge-bounce {
          animation: badge-bounce 2s ease-in-out infinite;
        }
        .animate-shimmer-sweep {
          animation: shimmer-sweep 2.2s ease-in-out infinite;
        }
        .animate-star-burst {
          animation: star-burst-up 1.6s cubic-bezier(0.1, 0.7, 0.2, 1) forwards;
        }
      `}</style>

      {/* 1. Telón oscuro multicapa con blur pro (bloqueador de eventos) */}
      <div className="absolute inset-0 bg-[#030712]/80 backdrop-blur-lg animate-backdrop-flowi pointer-events-auto" />

      {/* 2. Doble Sunburst Concéntrico Neón (Estilo Mario Wonder / Temu Reward) */}
      <div 
        className="absolute top-1/2 left-1/2 w-[520px] h-[520px] rounded-full pointer-events-none animate-sunburst-cw opacity-40"
        style={{
          background: `conic-gradient(from 0deg, ${shadowRgba} 0deg 15deg, transparent 15deg 30deg, ${shadowRgba} 30deg 45deg, transparent 45deg 60deg, ${shadowRgba} 60deg 75deg, transparent 75deg 90deg, ${shadowRgba} 90deg 105deg, transparent 105deg 120deg, ${shadowRgba} 120deg 135deg, transparent 135deg 150deg, ${shadowRgba} 150deg 165deg, transparent 165deg 180deg, ${shadowRgba} 180deg 195deg, transparent 195deg 210deg, ${shadowRgba} 210deg 225deg, transparent 225deg 240deg, ${shadowRgba} 240deg 255deg, transparent 255deg 270deg, ${shadowRgba} 270deg 285deg, transparent 285deg 300deg, ${shadowRgba} 300deg 315deg, transparent 315deg 330deg, ${shadowRgba} 330deg 345deg, transparent 345deg 360deg)`,
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 70%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 70%)',
        }}
      />
      <div 
        className="absolute top-1/2 left-1/2 w-[380px] h-[380px] rounded-full pointer-events-none animate-sunburst-ccw opacity-30"
        style={{
          background: `conic-gradient(from 0deg, rgba(255,255,255,0.4) 0deg 10deg, transparent 10deg 25deg, rgba(255,255,255,0.4) 25deg 35deg, transparent 35deg 50deg, rgba(255,255,255,0.4) 50deg 60deg, transparent 60deg 75deg, rgba(255,255,255,0.4) 75deg 85deg, transparent 85deg 100deg)`,
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)',
        }}
      />

      {/* 3. Estrellas y Monedas Flotantes (Particle Physics Burst) */}
      {[...Array(10)].map((_, i) => {
        const leftPos = 50 + (i % 2 === 0 ? 1 : -1) * (15 + i * 14);
        const delay = 0.1 + i * 0.08;
        const particleIcons = ['⭐', '🪙', '✨', '💎', '🌟'];
        const pIcon = particleIcons[i % particleIcons.length];
        return (
          <div
            key={i}
            className="absolute animate-star-burst text-lg sm:text-2xl pointer-events-none select-none"
            style={{
              left: `${leftPos}%`,
              top: '55%',
              animationDelay: `${delay}s`,
              filter: `drop-shadow(0 0 10px ${primaryColor})`,
            }}
          >
            {pIcon}
          </div>
        );
      })}

      {/* 4. Tarjeta 3D Holográfica de Alto Impacto (Super Mario Item Collect & Temu Chest Style) */}
      <div className="relative z-10 animate-mario-temu-card flex flex-col items-center justify-center text-center p-7 sm:p-9 rounded-[2.2rem] max-w-sm mx-4 bg-[#091124]/95 border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-visible">
        
        {/* Borde metálico con Shimmer Light Sweep */}
        <div 
          className="absolute -inset-[2px] rounded-[2.3rem] p-[2px] pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor}, rgba(255,255,255,0.3))` }}
        >
          <div className="w-full h-full rounded-[2.2rem] bg-[#091124] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-sweep pointer-events-none" />
          </div>
        </div>

        {/* Resplandor radial interno de profundidad 3D */}
        <div 
          className="absolute inset-0 rounded-[2.2rem] opacity-35 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 30%, ${primaryColor} 0%, transparent 75%)` }}
        />

        {/* 🌟 EMBLEMA FLOTANTE 3D CON INSIGNIA Y HALO SUPERIOR (Sobresale de la tarjeta) */}
        <div className="absolute -top-7 z-20 flex items-center justify-center animate-badge-bounce">
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_25px_rgba(0,0,0,0.8)] relative"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              boxShadow: `0 0 30px ${shadowRgba}, 0 4px 15px rgba(0,0,0,0.6)`
            }}
          >
            <IconComponent className="w-7 h-7 text-black stroke-[2.5]" />
            <span className="absolute -bottom-1 -right-1 text-xs select-none filter drop-shadow">{badgeEmoji}</span>
          </div>
        </div>

        {/* Espaciador para la insignia flotante */}
        <div className="h-4" />

        {/* Cinta / Banner Titular */}
        <div 
          className="relative z-10 text-[10px] sm:text-xs font-black tracking-[0.2em] uppercase px-4 py-1 rounded-full bg-black/70 border border-white/20 text-white shadow-lg mb-2"
          style={{ textShadow: `0 0 10px ${primaryColor}` }}
        >
          {actionText}
        </div>

        {/* Número 3D Neón Gigante */}
        <div 
          className={`relative z-10 text-4xl sm:text-5xl font-black ${isTechTheme ? 'font-mono' : 'font-syne'} tracking-tight bg-gradient-to-r ${colorGradient} bg-clip-text text-transparent filter drop-shadow-[0_4px_16px_rgba(0,0,0,1)] my-2`}
          style={{
            textShadow: `0 0 30px ${shadowRgba}`,
          }}
        >
          {formattedText}
        </div>

        {/* Subtítulo elegante */}
        <span className="relative z-10 text-xs font-bold text-gray-200 mt-1 flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          {actionSubtitle}
        </span>
      </div>
    </div>,
    document.body
  );
}

// Función helper síncrona: dispara el audio sintetizado al instante de hacer clic
export function triggerPowerAnimation(
  amount: number, 
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion',
  customTitle?: string,
  customText?: string
) {
  if (typeof window !== 'undefined') {
    const isCardEnabled = localStorage.getItem('anim_card_enabled') !== 'false';
    const isBurstEnabled = localStorage.getItem('anim_burst_enabled') !== 'false';

    // Síntesis de voz hablada automática en registros manuales y por voz
    let spokenText = '';
    if (type === 'ingreso') spokenText = 'Ingreso registrado con éxito';
    else if (type === 'gasto') spokenText = 'Gasto registrado con éxito';
    else if (type === 'abono') spokenText = 'Abono registrado con éxito';
    else if (type === 'edicion') spokenText = 'Transacción actualizada con éxito';
    else if (type === 'eliminacion' && amount > 0) spokenText = 'Transacción eliminada con éxito';

    if (spokenText) {
      speakText(spokenText, 'es-CO');
    }

    if (isCardEnabled) {
      playSynthesizedSound(type);

      const event = new CustomEvent('show-power-animation', {
        detail: { amount, type, customTitle, customText }
      });
      window.dispatchEvent(event);
    }

    if (isBurstEnabled) {
      let burstType: 'ingreso' | 'gasto' | 'abono' | 'logro' = 'ingreso';
      let targetAId = 'balance-card';
      let targetBId = 'header-profile';
      let targetCId = 'total-ingresos-card';

      if (type === 'ingreso') {
        burstType = 'ingreso';
        targetAId = 'balance-card';
        targetBId = 'nav-ingresos';
        targetCId = 'total-ingresos-card';
      } else if (type === 'abono') {
        burstType = 'abono';
        targetAId = 'nav-deudas';
        targetBId = 'header-profile';
        targetCId = 'total-deudas-card';
      } else if (type === 'gasto') {
        burstType = 'gasto';
        targetAId = 'balance-card';
        targetBId = 'nav-gastos';
        targetCId = 'total-gastos-card';
      } else {
        burstType = 'logro';
        targetAId = 'balance-card';
        targetBId = 'header-profile';
        targetCId = 'total-ingresos-card';
      }

      // Si la tarjeta está activa, la explosión desfasa 1.5s. Si está desactivada, dispara de inmediato!
      const delayMs = isCardEnabled ? 1500 : 0;

      setTimeout(() => {
        triggerDualBurst({
          type: burstType,
          targetAId,
          targetBId,
          targetCId
        });
      }, delayMs);
    }
  }
}
