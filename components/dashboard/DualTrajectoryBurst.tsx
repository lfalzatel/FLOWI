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
  targetCId?: string;
  type?: 'ingreso' | 'gasto' | 'abono' | 'logro';
  enableSound?: boolean;
}

interface Particle {
  id: number;
  icon: string;
  target: 'targetA' | 'targetB' | 'targetC';
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
  targetCId?: string;
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
 * 🎵 Sintetizador Armónico de Cascada Única
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

// 🛡️ Helper para asegurar que las coordenadas apunten SIEMPRE a un área visible dentro del viewport
function getVisibleTargetCoordinates(
  el: HTMLElement | null, 
  defaultFallback: { x: number; y: number }
) {
  if (!el) return defaultFallback;
  const rect = el.getBoundingClientRect();
  
  let x = rect.left + rect.width / 2;
  let y = rect.top + rect.height / 2;

  // Si el usuario hizo scroll y el elemento quedó fuera de la pantalla por ARRIBA
  if (rect.bottom < 60) {
    y = 60; // Apuntar a la barra superior sticky (Header)
    x = Math.max(40, Math.min(window.innerWidth - 40, x));
  } 
  // Si el elemento quedó fuera de la pantalla por ABAJO
  else if (rect.top > window.innerHeight - 60) {
    y = window.innerHeight - 50; // Apuntar a la barra de navegación inferior
    x = Math.max(40, Math.min(window.innerWidth - 40, x));
  }

  return { x, y };
}

export function DualTrajectoryBurst({
  trigger = false,
  onComplete,
  startPosition,
  targetAId = 'balance-card',
  targetBId = 'header-profile',
  targetCId = 'total-ingresos-card',
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
    const elC = targetCId ? document.getElementById(targetCId) : null;

    const fallbackA = { x: window.innerWidth - 60, y: 20 };
    const fallbackB = { x: window.innerWidth / 2, y: window.innerHeight - 50 };
    const fallbackC = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Calcular coordenadas garantizadas dentro del área visible de la pantalla (Scroll-Safe)
    const targetA = getVisibleTargetCoordinates(elA, fallbackA);
    const targetB = getVisibleTargetCoordinates(elB, fallbackB);
    const targetC = getVisibleTargetCoordinates(elC, fallbackC);

    const startX = startPosition?.x ?? window.innerWidth / 2;
    const startY = startPosition?.y ?? window.innerHeight / 2;

    const icons = ICON_SETS[type] || ICON_SETS.ingreso;
    const generated: Particle[] = [];

    // 🚀 Generar 24 partículas divididas en 3 Destinos (8 para A, 8 para B, 8 para C)
    for (let i = 0; i < 24; i++) {
      let particleTarget: 'targetA' | 'targetB' | 'targetC' = 'targetA';
      let destX = targetA.x;
      let destY = targetA.y;

      if (i % 3 === 1) {
        particleTarget = 'targetB';
        destX = targetB.x;
        destY = targetB.y;
      } else if (i % 3 === 2) {
        particleTarget = 'targetC';
        destX = targetC.x;
        destY = targetC.y;
      }

      const delaySec = i * 0.05;

      generated.push({
        id: Date.now() + i,
        icon: icons[i % icons.length],
        target: particleTarget,
        startX,
        startY,
        targetX: destX,
        targetY: destY,
        delay: delaySec,
      });

      if (enableSound) {
        // 🎵 Una sola cascada musical fluida (0ms a 2100ms)
        playToneForPhase(i, type, 'launch', i * 90);
      }
    }

    setParticles(generated);

    // Disparar evento de absorción si la tarjeta destino C es visible
    if (targetCId && typeof window !== 'undefined') {
      const absorbTimer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('absorb-total-impact', { detail: { targetCId } }));
      }, 500);
      activeParticleTimers.push(absorbTimer);
    }

    // Finalizar animación exacto al aterrizar la última partícula
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
                p.startX + (p.target === 'targetA' ? 70 : p.target === 'targetB' ? -70 : (p.id % 2 === 0 ? 40 : -40)),
                p.targetX
              ],
              y: [
                p.startY,
                p.startY - (p.target === 'targetA' ? 100 : p.target === 'targetB' ? 50 : 80),
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
      targetCId={options.targetCId || 'total-ingresos-card'}
      startPosition={options.startPosition}
      onComplete={() => setActive(false)}
    />
  );
}

// Helper para disparar la animación global de 24 partículas con 3 destinos (A, B y C)
export function triggerDualBurst(options?: TriggerEventDetail) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('show-dual-burst', {
      detail: options || {}
    });
    window.dispatchEvent(event);
  }
}

export default DualTrajectoryBurst;
