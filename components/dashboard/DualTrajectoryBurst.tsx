'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export interface DualTrajectoryBurstProps {
  trigger?: boolean;
  onComplete?: () => void;
  startPosition?: { x: number; y: number };
  targetAId?: string;
  targetBId?: string;
  type?: 'ingreso' | 'gasto' | 'abono' | 'logro';
  enableSound?: boolean;
}

interface Particle {
  id: number;
  icon: string;
  target: 'targetA' | 'targetB';
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  delay: number;
}

interface TriggerEventDetail {
  type?: 'ingreso' | 'gasto' | 'abono' | 'logro';
  targetAId?: string;
  targetBId?: string;
  startPosition?: { x: number; y: number };
}

const ICON_SETS = {
  ingreso: ['🪙', '💵', '💰', '✨', '💎', '📈', '⭐', '💸', '🤑', '💳', '🎉', '🚀'],
  abono:   ['🔓', '🎉', '💎', '🪙', '✨', '🔥', '🕊️', '🧘', '👏', '💥', '🟢', '👑'],
  logro:   ['🏆', '⭐', '🎯', '✨', '👑', '🥇', '🌟', '🎊', '🔮', '🚀', '🎁', '💎'],
  gasto:   ['💸', '🧾', '🛍️', '✨', '🏷️', '💳', '📉', '🛒', '⚡', '🔴', '📦', '💨'],
};

// 🎵 AudioContext Singleton para cero redundancia y cero repetición de sonido
let crystalAudioCtx: AudioContext | null = null;
let activeParticleTimers: ReturnType<typeof setTimeout>[] = [];

function getCrystalAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      if (!crystalAudioCtx || crystalAudioCtx.state === 'closed') {
        crystalAudioCtx = new AudioCtxClass();
      }
      if (crystalAudioCtx.state === 'suspended') {
        crystalAudioCtx.resume();
      }
      return crystalAudioCtx;
    }
  } catch (e) {}
  return null;
}

function stopCrystalAudio() {
  activeParticleTimers.forEach(clearTimeout);
  activeParticleTimers = [];
}

/**
 * 🎵 Sintetizador de 2 Fases (Despegue y Absorción/Impacto)
 * Cada tipo ('ingreso', 'abono', 'logro', 'gasto') tiene una escala y timbre musical único.
 */
function playToneForPhase(
  particleIndex: number, 
  type: string, 
  phase: 'launch' | 'impact', 
  delayMs: number
) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('sound_enabled') === 'false') return;

  const particleStyle = localStorage.getItem('sound_particles') || 'crystal';
  if (particleStyle === 'silent') return;

  const timer = setTimeout(() => {
    try {
      const ctx = getCrystalAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Configuración de escalas y frecuencias por tipo de animación (Ingreso, Abono, Logro, Gasto)
      let baseFreq = 1046.50; // Do6 (Ingresos)
      let stepFreq = 45;
      let waveType: OscillatorType = 'sine';
      let duration = 0.12;
      let volume = 0.10;

      if (type === 'abono') {
        baseFreq = 880.00; // La5 (Abono / Deudas - Resonancia Cristalina)
        stepFreq = 55;
        volume = 0.09;
      } else if (type === 'logro') {
        baseFreq = 1318.51; // Mi6 (Logro / Fanfarria Triunfal)
        stepFreq = 65;
        volume = 0.11;
      } else if (type === 'gasto') {
        baseFreq = 783.99; // Sol5 (Gastos - Pop Háptico)
        stepFreq = 35;
        volume = 0.08;
      }

      // Estilo de Instrumento elegido por el usuario en Configuración
      if (particleStyle === 'arcade') {
        waveType = 'square';
        volume *= 0.8;
        duration = 0.09;
      } else if (particleStyle === 'marimba') {
        waveType = 'triangle';
        volume *= 1.1;
        duration = 0.14;
      } else if (particleStyle === 'synth_laser') {
        waveType = 'sawtooth';
        volume *= 0.7;
        duration = 0.08;
      }

      // En la fase de Impacto/Absorción, la frecuencia sube a la siguiente octava (sonido de llegada al destino)
      if (phase === 'impact') {
        baseFreq = baseFreq * 1.5; // Salto armónico a quinta/octava alta
        duration *= 0.85;
        volume *= 0.75;
      }

      const freq = baseFreq + (particleIndex % 12) * stepFreq;

      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Ignorar si el navegador bloquea audio
    }
  }, delayMs);

  activeParticleTimers.push(timer);
}

export function DualTrajectoryBurst({
  trigger = false,
  onComplete,
  startPosition,
  targetAId = 'balance-card',
  targetBId = 'header-profile',
  type = 'ingreso',
  enableSound = true
}: DualTrajectoryBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!trigger) return;

    // Limpiar cualquier sonido anterior
    stopCrystalAudio();

    const elA = document.getElementById(targetAId);
    const elB = document.getElementById(targetBId);

    const rectA = elA ? elA.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 };
    const rectB = elB ? elB.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 50, width: 40, height: 40 };

    const startX = startPosition?.x ?? window.innerWidth / 2;
    const startY = startPosition?.y ?? window.innerHeight / 2;

    const targetAX = rectA.left + rectA.width / 2;
    const targetAY = rectA.top + rectA.height / 2;
    const targetBX = rectB.left + rectB.width / 2;
    const targetBY = rectB.top + rectB.height / 2;

    const icons = ICON_SETS[type] || ICON_SETS.ingreso;
    const generated: Particle[] = [];

    // 🚀 Generar 24 partículas (12 hacia Destino A y 12 hacia Destino B)
    const flightDurationMs = 1500; // Duración de vuelo de cada partícula en ms

    for (let i = 0; i < 24; i++) {
      const isTargetA = i % 2 === 0;
      const delaySec = i * 0.05; // 50ms entre cada despegue (total despegues: 0 a 1150ms)

      generated.push({
        id: Date.now() + i,
        icon: icons[i % icons.length],
        target: isTargetA ? 'targetA' : 'targetB',
        startX,
        startY,
        targetX: isTargetA ? targetAX : targetBX,
        targetY: isTargetA ? targetAY : targetBY,
        delay: delaySec,
      });

      if (enableSound) {
        // 🎵 Una sola cascada musical fluida (1 nota por partícula repartida a lo largo de todo el vuelo, 0ms a 2100ms)
        playToneForPhase(i, type, 'launch', i * 90);
      }
    }

    setParticles(generated);

    // Finalizar animación exacto al aterrizar y ser absorbida la última partícula (~2.7s)
    const totalDurationMs = 2700;
    const timer = setTimeout(() => {
      setParticles([]);
      stopCrystalAudio();
      onComplete?.();
    }, totalDurationMs);

    return () => {
      clearTimeout(timer);
      stopCrystalAudio();
    };
  }, [trigger]);

  if (!mounted || !trigger || particles.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: p.startX,
              y: p.startY,
              scale: 0.1,
              opacity: 0,
              rotate: 0,
            }}
            animate={{
              x: [
                p.startX,
                p.startX + (p.target === 'targetA' ? 70 : -70),
                p.targetX
              ],
              y: [
                p.startY,
                p.startY - (p.target === 'targetA' ? 100 : 50),
                p.targetY
              ],
              scale: [0.3, 1.4, 1.4, 1.1, 0.15],
              opacity: [0, 1, 1, 1, 0],
              rotate: [0, 180, 540],
            }}
            transition={{
              duration: 1.5,
              delay: p.delay,
              times: [0, 0.12, 0.78, 0.92, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute text-2xl sm:text-3xl select-none drop-shadow-2xl pointer-events-none"
          >
            {p.icon}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

// 🌐 Componente Global escuchador de eventos para disparar desde cualquier punto de FLOWI
export function DualTrajectoryBurstGlobal() {
  const [active, setActive] = useState(false);
  const [options, setOptions] = useState<TriggerEventDetail>({});

  useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<TriggerEventDetail>;
      setOptions(customEvent.detail || {});
      setActive(true);
    };

    window.addEventListener('show-dual-burst', handleTrigger);
    return () => window.removeEventListener('show-dual-burst', handleTrigger);
  }, []);

  return (
    <DualTrajectoryBurst
      trigger={active}
      type={options.type || 'ingreso'}
      targetAId={options.targetAId || 'balance-card'}
      targetBId={options.targetBId || 'header-profile'}
      startPosition={options.startPosition}
      onComplete={() => setActive(false)}
    />
  );
}

// Helper para disparar la animación global de 24 partículas de doble trayectoria
export function triggerDualBurst(options?: TriggerEventDetail) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-dual-burst', {
      detail: options || {}
    });
    window.dispatchEvent(event);
  }
}

export default DualTrajectoryBurst;
