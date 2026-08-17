'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/format';

interface PowerAnimationEvent {
  amount: number;
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion';
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

  // Reproducción de archivo si fue seleccionado un tono de audio alternativo
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

  // Síntesis con Web Audio API
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

        // Envolvente de volumen (Attack, Sustain, Decay)
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(gainLevel, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch (err) {
        // Ignorar excepciones de audio diferido
      }
    }, delayMs);
    activeTimers.push(t);
  };

  if (type === 'eliminacion' && soundSetting === 'synth_laser') {
    // 💥 1. Láser Ciberpunk Descendente (Eliminación Synth 2)
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
    // 🌌 2. Disolución Armónica Retro (Eliminación Synth 3)
    const notes = [587.33, 493.88, 392.00, 293.66];
    notes.forEach((freq, idx) => {
      playTone(freq, 'sine', 450, idx * 90, 0.16);
    });
  } else if (type === 'eliminacion') {
    // ⚡ 3. Barrido Descendente De-Rez (Eliminación Synth Default)
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
    // 🌟 Arpegio Celestial Ascendente + Campanada Cristalina
    const arpeggio = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51, 1567.98];
    arpeggio.forEach((freq, idx) => {
      playTone(freq, 'sine', 350, idx * 80, 0.16);
    });

    playTone(1567.98, 'sine', 800, 600, 0.20);
    playTone(2093.00, 'triangle', 600, 750, 0.12);
  } else if (type === 'gasto') {
    // 💥 Acorde Sintetizado Resonante
    const notes = [659.25, 523.25, 440.00, 349.23];
    notes.forEach((freq, idx) => {
      playTone(freq, 'triangle', 320, idx * 75, 0.18);
    });
    playTone(261.63, 'sine', 500, 300, 0.15);
  } else if (type === 'edicion') {
    // 🔮 Doble Repique Cristalino Moderno
    const notes = [659.25, 880.00, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      playTone(freq, 'sine', 300, idx * 90, 0.15);
    });
    playTone(1760.00, 'sine', 600, 450, 0.16);
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
      }, 3200);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!active || !data || typeof document === 'undefined') return null;

  // Personalización del tema y colores según la acción
  let labelPrefix = '';
  let colorGradient = 'from-emerald-400 via-teal-300 to-cyan-400';
  let primaryColor = '#00E5A0';
  let secondaryColor = '#00E5FF';
  let shadowRgba = 'rgba(0, 229, 160, 0.7)';
  let actionText = 'INGRESO REGISTRADO';
  let actionSubtitle = '¡Saldo actualizado con éxito!';

  if (data.type === 'ingreso') {
    labelPrefix = '+';
    colorGradient = 'from-emerald-400 via-teal-300 to-cyan-400';
    primaryColor = '#00E5A0';
    secondaryColor = '#00E5FF';
    shadowRgba = 'rgba(0, 229, 160, 0.7)';
    actionText = 'INGRESO REGISTRADO';
    actionSubtitle = '¡Tu saldo ha aumentado!';
  } else if (data.type === 'abono') {
    labelPrefix = '+';
    colorGradient = 'from-cyan-400 via-blue-400 to-indigo-400';
    primaryColor = '#00E5FF';
    secondaryColor = '#3B82F6';
    shadowRgba = 'rgba(0, 229, 255, 0.7)';
    actionText = 'ABONO COMPLETO';
    actionSubtitle = '¡Deuda reducida con éxito!';
  } else if (data.type === 'edicion') {
    labelPrefix = '✓ ';
    colorGradient = 'from-purple-400 via-indigo-400 to-blue-400';
    primaryColor = '#8B5CF6';
    secondaryColor = '#3B82F6';
    shadowRgba = 'rgba(139, 92, 246, 0.7)';
    actionText = 'TRANSACCIÓN ACTUALIZADA';
    actionSubtitle = '¡Cambios guardados!';
  } else if (data.type === 'eliminacion') {
    labelPrefix = '✕ ';
    colorGradient = 'from-red-500 via-rose-500 to-orange-500';
    primaryColor = '#EF4444';
    secondaryColor = '#F97316';
    shadowRgba = 'rgba(239, 68, 68, 0.7)';
    actionText = 'REGISTRO ELIMINADO';
    actionSubtitle = '¡Registro removido!';
  } else {
    // gasto
    labelPrefix = '-';
    colorGradient = 'from-rose-500 via-red-500 to-pink-500';
    primaryColor = '#FF2E63';
    secondaryColor = '#EF4444';
    shadowRgba = 'rgba(255, 46, 99, 0.7)';
    actionText = 'GASTO REGISTRADO';
    actionSubtitle = '¡Balance actualizado!';
  }

  const fmt = (n: number) => formatCurrency(n, profile?.currency).replace(/\.00$/, '');
  const formattedText = `${labelPrefix}${fmt(data.amount)}`;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes backdrop-fade {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes temu-pop {
          0% { transform: scale(0.2) translateY(40px); opacity: 0; }
          20% { transform: scale(1.25) translateY(-10px); opacity: 1; }
          30% { transform: scale(1) translateY(0); opacity: 1; }
          80% { transform: scale(1) translateY(-10px); opacity: 1; }
          100% { transform: scale(0.7) translateY(-60px); opacity: 0; }
        }
        @keyframes sunburst-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes ring-expand {
          0% { transform: scale(0.3); opacity: 0.9; border-width: 6px; }
          100% { transform: scale(2.2); opacity: 0; border-width: 1px; }
        }
        @keyframes particle-fly {
          0% { transform: translateY(20px) scale(0); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(-140px) scale(1.4) rotate(45deg); opacity: 0; }
        }
        .animate-backdrop-flowi {
          animation: backdrop-fade 3.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-temu-card {
          animation: temu-pop 3.2s cubic-bezier(0.22, 1.6, 0.4, 1) forwards;
        }
        .animate-sunburst-flowi {
          animation: sunburst-spin 12s linear infinite;
        }
        .animate-ring-flowi {
          animation: ring-expand 1.2s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .animate-particle-flowi {
          animation: particle-fly 1.4s cubic-bezier(0.1, 0.6, 0.2, 1) forwards;
        }
      `}</style>

      {/* 1. Telón oscuro con blur de alto contraste */}
      <div className="absolute inset-0 bg-[#050B14]/75 backdrop-blur-md animate-backdrop-flowi pointer-events-none" />

      {/* 2. Rayos Solares Giratorios (Sunburst GPU estilo Temu) */}
      <div 
        className="absolute top-1/2 left-1/2 w-[450px] h-[450px] rounded-full pointer-events-none animate-sunburst-flowi opacity-45"
        style={{
          background: `conic-gradient(from 0deg, ${shadowRgba} 0deg 15deg, transparent 15deg 30deg, ${shadowRgba} 30deg 45deg, transparent 45deg 60deg, ${shadowRgba} 60deg 75deg, transparent 75deg 90deg, ${shadowRgba} 90deg 105deg, transparent 105deg 120deg, ${shadowRgba} 120deg 135deg, transparent 135deg 150deg, ${shadowRgba} 150deg 165deg, transparent 165deg 180deg, ${shadowRgba} 180deg 195deg, transparent 195deg 210deg, ${shadowRgba} 210deg 225deg, transparent 225deg 240deg, ${shadowRgba} 240deg 255deg, transparent 255deg 270deg, ${shadowRgba} 270deg 285deg, transparent 285deg 300deg, ${shadowRgba} 300deg 315deg, transparent 315deg 330deg, ${shadowRgba} 330deg 345deg, transparent 345deg 360deg)`,
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
        }}
      />

      {/* 3. Anillos expansivos neón */}
      <div 
        className="absolute w-48 h-48 rounded-full border animate-ring-flowi pointer-events-none"
        style={{ borderColor: primaryColor, boxShadow: `0 0 35px ${primaryColor}` }}
      />
      <div 
        className="absolute w-64 h-64 rounded-full border animate-ring-flowi pointer-events-none"
        style={{ borderColor: secondaryColor, boxShadow: `0 0 25px ${secondaryColor}`, animationDelay: '0.15s' }}
      />

      {/* 4. Partículas neón flotantes */}
      {[...Array(14)].map((_, i) => {
        const leftOffset = (Math.random() - 0.5) * 200;
        const scale = 0.6 + Math.random() * 0.9;
        const delay = Math.random() * 0.4;
        return (
          <div
            key={i}
            className="absolute animate-particle-flowi w-2 h-2 rounded-full pointer-events-none"
            style={{
              left: `calc(50% + ${leftOffset}px)`,
              backgroundColor: i % 2 === 0 ? primaryColor : secondaryColor,
              boxShadow: `0 0 12px ${shadowRgba}`,
              animationDelay: `${delay}s`,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}

      {/* 5. Tarjeta Temu-Pop Elástica */}
      <div className="relative z-10 animate-temu-card flex flex-col items-center justify-center text-center p-6 sm:p-8 rounded-3xl bg-[#0B132B]/95 border-2 border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.9)] max-w-sm mx-4">
        <div 
          className="absolute inset-0 rounded-3xl opacity-35 blur-xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)` }}
        />

        <span 
          className="relative z-10 text-[10px] sm:text-xs font-black tracking-[0.25em] uppercase mb-2 px-3 py-1 rounded-full bg-black/60 border border-white/20 text-white shadow-md"
          style={{ textShadow: `0 0 10px ${primaryColor}` }}
        >
          {actionText}
        </span>

        <div 
          className={`relative z-10 text-4xl sm:text-5xl font-black ${isTechTheme ? 'font-mono' : 'font-syne'} tracking-tight bg-gradient-to-r ${colorGradient} bg-clip-text text-transparent filter drop-shadow-[0_4px_12px_rgba(0,0,0,1)] my-1`}
          style={{
            textShadow: `0 0 25px ${shadowRgba}`,
          }}
        >
          {formattedText}
        </div>

        <span className="relative z-10 text-[11px] font-bold text-gray-300 mt-1">
          {actionSubtitle}
        </span>
      </div>
    </div>,
    document.body
  );
}

// Función helper síncrona: dispara el audio sintetizado al instante de hacer clic
export function triggerPowerAnimation(amount: number, type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion') {
  if (typeof window !== 'undefined') {
    playSynthesizedSound(type);

    const event = new CustomEvent('show-power-animation', {
      detail: { amount, type }
    });
    window.dispatchEvent(event);
  }
}
