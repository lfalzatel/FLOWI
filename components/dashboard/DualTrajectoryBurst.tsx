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

// 🎵 Reproduce las 24 notas cristalinas en sincronía exacta con el viaje de cada partícula
function playCrystalTone(particleIndex: number, type: string, delayMs: number = 0) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('sound_enabled') === 'false') return;

  const timer = setTimeout(() => {
    try {
      const ctx = getCrystalAudioContext();
      if (!ctx || ctx.state === 'closed') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      let baseFreq = 1046.50; // Do6 (Ingresos)
      let stepFreq = 50;

      if (type === 'abono') {
        baseFreq = 880.00; // La5 (Abono / Deudas)
        stepFreq = 60;
      } else if (type === 'logro') {
        baseFreq = 1318.51; // Mi6 (Logro / Fanfarria)
        stepFreq = 70;
      } else if (type === 'gasto') {
        baseFreq = 783.99; // Sol5 (Gastos)
        stepFreq = 40;
      }

      const freq = baseFreq + (particleIndex % 12) * stepFreq;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.10, ctx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
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

    // Limpiar sonidos anteriores de partículas para evitar duplicación
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
    for (let i = 0; i < 24; i++) {
      const isTargetA = i % 2 === 0;
      const delaySec = i * 0.05; // 50ms entre cada partícula

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

      // El sonido empieza al volar cada partícula y finaliza con el último ícono
      if (enableSound) {
        playCrystalTone(i, type, i * 50);
      }
    }

    setParticles(generated);

    // Finalizar animación exacto al aterrizar la última partícula
    const timer = setTimeout(() => {
      setParticles([]);
      stopCrystalAudio();
      onComplete?.();
    }, 2500);

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
