'use client';

import { useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';

export interface PointsBurstAnimationProps {
  amount: number;
  type: 'gasto' | 'ingreso' | 'abono' | 'edicion' | 'eliminacion';
  targetSelector?: string;  // Selector CSS del elemento destino (ej: '[data-points-capsule]')
  originSelector?: string; // Selector CSS del elemento origen (opcional)
  onComplete: () => void;  // Callback al finalizar la animación
}

export default function PointsBurstAnimation({
  amount,
  type,
  targetSelector = '[data-points-capsule]',
  originSelector,
  onComplete,
}: PointsBurstAnimationProps) {
  const ranRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const { profile } = useAuth();

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // Configuración según el tipo de acción (Colores, Textos, Signos)
    let primaryColor = '#00E5A0';   // Emerald / Mint
    let secondaryColor = '#00E5FF'; // Cyan
    let shadowRgba = 'rgba(0, 229, 160, 0.9)';
    let actionTitle = 'INGRESO REGISTRADO';
    let actionSubtitle = '¡Excelente Gestión!';
    let signPrefix = '+';
    let isPositive = true;

    if (type === 'ingreso') {
      primaryColor = '#00E5A0';
      secondaryColor = '#00E5FF';
      shadowRgba = 'rgba(0, 229, 160, 0.9)';
      actionTitle = 'INGRESO REGISTRADO';
      actionSubtitle = '¡Tu saldo ha aumentado!';
      signPrefix = '+';
      isPositive = true;
    } else if (type === 'abono') {
      primaryColor = '#3B82F6';
      secondaryColor = '#00E5A0';
      shadowRgba = 'rgba(59, 130, 246, 0.9)';
      actionTitle = 'ABONO COMPLETO';
      actionSubtitle = '¡Deuda reducida con éxito!';
      signPrefix = '+';
      isPositive = true;
    } else if (type === 'gasto') {
      primaryColor = '#FF2E63';
      secondaryColor = '#EF4444';
      shadowRgba = 'rgba(255, 46, 99, 0.9)';
      actionTitle = 'GASTO REGISTRADO';
      actionSubtitle = '¡Balance actualizado!';
      signPrefix = '-';
      isPositive = false;
    } else if (type === 'edicion') {
      primaryColor = '#8B5CF6';
      secondaryColor = '#3B82F6';
      shadowRgba = 'rgba(139, 92, 246, 0.9)';
      actionTitle = 'TRANSACCIÓN ACTUALIZADA';
      actionSubtitle = '¡Cambios guardados!';
      signPrefix = '✓ ';
      isPositive = true;
    } else if (type === 'eliminacion') {
      primaryColor = '#EF4444';
      secondaryColor = '#F97316';
      shadowRgba = 'rgba(239, 68, 68, 0.9)';
      actionTitle = 'REGISTRO ELIMINADO';
      actionSubtitle = '¡Registro removido!';
      signPrefix = '✕ ';
      isPositive = false;
    }

    const formattedAmount = formatCurrency(amount, profile?.currency).replace(/\.00$/, '');
    const displayText = `${signPrefix}${formattedAmount}`;

    // Buscar elemento destino visible en pantalla
    const pickVisible = (selector: string): Element | null => {
      const candidates = Array.from(document.querySelectorAll(selector));
      return (
        candidates.find((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        }) || candidates[0] || null
      );
    };

    const targetContainer = pickVisible(targetSelector);
    const targetEl = (targetContainer?.querySelector('button') || targetContainer) as HTMLElement | null;
    const originEl = originSelector ? pickVisible(originSelector) : null;

    const targetRect = targetEl?.getBoundingClientRect();
    const originRect = originEl?.getBoundingClientRect();

    const targetX = targetRect ? targetRect.left + targetRect.width / 2 : window.innerWidth / 2;
    const targetY = targetRect ? targetRect.top + targetRect.height / 2 : 120;
    const originX = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2;
    const originY = originRect ? originRect.top : window.innerHeight * 0.7;

    const nodes: HTMLElement[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Sintetizador Web Audio API autónomo con desbloqueo síncrono
    let audioCtx: AudioContext | null = null;
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtx) {
            audioCtx = new AudioContextClass();
          }
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        }
      } catch (e) {
        audioCtx = null;
      }
    };

    unlockAudio();
    const unlockHandler = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };
    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });

    const playTone = (freq: number, type: OscillatorType, durationMs: number, delayMs: number = 0, gainLevel: number = 0.15) => {
      timers.push(setTimeout(() => {
        try {
          unlockAudio();
          if (!audioCtx || audioCtx.state === 'closed') return;

          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

          gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(gainLevel, audioCtx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (durationMs / 1000));

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + (durationMs / 1000));
        } catch (err) {}
      }, delayMs));
    };

    // 1. Audio Sintetizado por Fases (Web Audio API)
    // Fase A: Arpegio inicial
    const baseFreqs = isPositive ? [523.25, 659.25, 783.99, 987.77, 1046.50] : [783.99, 659.25, 523.25, 440.00, 392.00];
    baseFreqs.forEach((freq, idx) => {
      playTone(freq, 'sine', 320, 100 + idx * 100, 0.14);
    });

    // Fase B: Campanada central armónica
    playTone(isPositive ? 1318.51 : 880.00, 'sine', 700, 700, 0.18);
    playTone(isPositive ? 1567.98 : 1046.50, 'sine', 800, 750, 0.15);

    // Fase C: Fanfarria de clímax (4.2s extensión)
    const fireworksNotes = isPositive 
      ? [1567.98, 1760.00, 1975.53, 2093.00, 2637.02]
      : [1046.50, 987.77, 880.00, 783.99, 659.25];

    fireworksNotes.forEach((freq, idx) => {
      playTone(freq, 'triangle', 500, 2800 + idx * 70, 0.20);
      playTone(freq * 1.5, 'sine', 400, 2840 + idx * 70, 0.10);
    });

    // 2. Inyección de Keyframes CSS para rotación GPU
    const styleId = 'burst-sunburst-keyframes-flowi';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes flowiSunburstSpin {
          from { transform: translate3d(-50%, -50%, 0) scale(1.3) rotate(0deg); }
          to { transform: translate3d(-50%, -50%, 0) scale(1.3) rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // 3. Flash de pantalla suave
    const flash = document.createElement('div');
    Object.assign(flash.style, {
      position: 'fixed', inset: '0', background: primaryColor, opacity: '0',
      zIndex: '9996', pointerEvents: 'none', transition: 'opacity 200ms ease-out',
      willChange: 'opacity',
    });
    document.body.appendChild(flash);
    nodes.push(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0.25'; });
    timers.push(setTimeout(() => {
      flash.style.transition = 'opacity 600ms ease-in';
      flash.style.opacity = '0';
    }, 200));

    // 4. Rayos Solares Giratorios (Sunburst GPU) con colores de FLOWI
    const sunburst = document.createElement('div');
    Object.assign(sunburst.style, {
      position: 'fixed', left: '50%', top: '42%',
      width: '420px', height: '420px',
      zIndex: '9997', pointerEvents: 'none',
      transform: 'translate3d(-50%, -50%, 0) scale(0.2)', opacity: '0',
      borderRadius: '50%',
      background: `conic-gradient(from 0deg, ${shadowRgba} 0deg 15deg, transparent 15deg 30deg, ${shadowRgba} 30deg 45deg, transparent 45deg 60deg, ${shadowRgba} 60deg 75deg, transparent 75deg 90deg, ${shadowRgba} 90deg 105deg, transparent 105deg 120deg, ${shadowRgba} 120deg 135deg, transparent 135deg 150deg, ${shadowRgba} 150deg 165deg, transparent 165deg 180deg, ${shadowRgba} 180deg 195deg, transparent 195deg 210deg, ${shadowRgba} 210deg 225deg, transparent 225deg 240deg, ${shadowRgba} 240deg 255deg, transparent 255deg 270deg, ${shadowRgba} 270deg 285deg, transparent 285deg 300deg, ${shadowRgba} 300deg 315deg, transparent 315deg 330deg, ${shadowRgba} 330deg 345deg, transparent 345deg 360deg)`,
      maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
      WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
      willChange: 'transform, opacity',
      WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
      transition: 'transform 800ms cubic-bezier(.22,1.6,.4,1), opacity 600ms ease',
    });
    document.body.appendChild(sunburst);
    nodes.push(sunburst);

    requestAnimationFrame(() => {
      sunburst.style.opacity = '0.85';
      sunburst.style.animation = 'flowiSunburstSpin 14s linear infinite';
    });

    // 5. Doble onda expansiva en el origen
    [0, 1].forEach((r) => {
      const ring = document.createElement('div');
      Object.assign(ring.style, {
        position: 'fixed', left: '0px', top: '0px',
        width: '16px', height: '16px', borderRadius: '50%',
        border: `3px solid ${r === 0 ? primaryColor : secondaryColor}`,
        zIndex: '9998',
        transform: `translate3d(${originX}px, ${originY}px, 0) translate(-50%, -50%) scale(1)`,
        opacity: '0.9', willChange: 'transform, opacity',
        transition: 'transform 850ms ease-out, opacity 850ms ease-out',
      });
      document.body.appendChild(ring);
      nodes.push(ring);
      timers.push(setTimeout(() => requestAnimationFrame(() => {
        ring.style.transform = `translate3d(${originX}px, ${originY}px, 0) translate(-50%, -50%) scale(${14 + r * 6})`;
        ring.style.opacity = '0';
      }), r * 120));
      timers.push(setTimeout(() => ring.remove(), 1000 + r * 120));
    });

    // 6. Lanzamiento de Estrellas/Partículas en abanico (100% GPU translate3d)
    const starsN = 10;
    for (let i = 0; i < starsN; i++) {
      const angle = (Math.PI / (starsN + 1)) * (i + 1) + Math.PI;
      const spreadX = originX + Math.cos(angle) * 100;
      const spreadY = originY + Math.sin(angle) * 65;

      const star = document.createElement('div');
      star.innerHTML = isPositive ? '★' : '◆';
      Object.assign(star.style, {
        position: 'fixed', left: '0px', top: '0px',
        zIndex: '9999', color: i % 2 === 0 ? primaryColor : secondaryColor, fontSize: '32px', lineHeight: '1',
        textShadow: `0 0 14px ${shadowRgba}, 0 0 28px ${secondaryColor}`,
        transform: `translate3d(${originX}px, ${originY}px, 0) translate(-50%, -50%) scale(0.2) rotate(0deg)`,
        opacity: '0', willChange: 'transform, opacity',
        WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
        transition: 'transform 1100ms cubic-bezier(.22,1.6,.4,1), opacity 1100ms ease',
      });
      document.body.appendChild(star);
      nodes.push(star);

      requestAnimationFrame(() => {
        star.style.transform = `translate3d(${spreadX}px, ${spreadY}px, 0) translate(-50%, -50%) scale(2.2) rotate(45deg)`;
        star.style.opacity = '1';
      });

      // Estela de chispas
      timers.push(setTimeout(() => {
        for (let s = 0; s < 2; s++) {
          const dot = document.createElement('div');
          const dx = spreadX + (Math.random() - 0.5) * 70;
          const dy = spreadY + (Math.random() - 0.5) * 70 - 10;
          Object.assign(dot.style, {
            position: 'fixed', left: '0px', top: '0px',
            width: '7px', height: '7px', borderRadius: '50%',
            background: s % 2 === 0 ? primaryColor : secondaryColor,
            zIndex: '9998', opacity: '1', boxShadow: `0 0 10px ${shadowRgba}`,
            transform: `translate3d(${spreadX}px, ${spreadY}px, 0) translate(-50%, -50%) scale(1)`,
            willChange: 'transform, opacity',
            transition: 'transform 800ms ease-out, opacity 800ms ease-out',
          });
          document.body.appendChild(dot);
          nodes.push(dot);
          requestAnimationFrame(() => {
            dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%) scale(0.2)`;
            dot.style.opacity = '0';
          });
          timers.push(setTimeout(() => dot.remove(), 820));
        }
      }, 350 + i * 120));

      // Convergencia hacia la cápsula / BalanceCard
      timers.push(setTimeout(() => {
        star.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) scale(0.35) rotate(600deg)`;
        star.style.opacity = '0.9';
      }, 1000 + i * 120));

      // Repique de sonido al absorber cada partícula
      playTone(1046.50 + i * 75, 'sine', 200, 1900 + i * 120, 0.16);

      timers.push(setTimeout(() => star.remove(), 2300 + i * 120));
    }

    // 7. Gran Estrella / Badge Central Blur "+$ MONTO"
    const starContainer = document.createElement('div');
    Object.assign(starContainer.style, {
      position: 'fixed', left: '50%', top: '42%',
      width: '260px', height: '260px',
      zIndex: '100000', transform: 'translate3d(-50%,-50%,0) scale(0.2)', opacity: '0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none', willChange: 'transform, opacity',
      WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden',
      transition: 'transform 800ms cubic-bezier(.22,1.6,.4,1), opacity 600ms ease',
    });

    const starBg = document.createElement('div');
    Object.assign(starBg.style, {
      position: 'absolute', inset: '0',
      clipPath: 'polygon(50% 0%, 63% 33%, 98% 35%, 70% 58%, 81% 92%, 50% 72%, 19% 92%, 30% 58%, 2% 35%, 37% 33%)',
      background: `radial-gradient(circle, ${shadowRgba} 0%, rgba(13, 21, 39, 0.95) 100%)`,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: `2px solid ${primaryColor}`,
      boxShadow: `0 0 35px ${shadowRgba}, inset 0 0 20px rgba(255,255,255,0.4)`,
      willChange: 'transform, opacity',
      transition: 'transform 700ms cubic-bezier(.22,1.6,.4,1), opacity 600ms ease',
    });
    starContainer.appendChild(starBg);

    const labelText = document.createElement('div');
    labelText.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
         <span style="font-size: 24px; font-weight: 900; color: #ffffff; text-shadow: 0 2px 12px rgba(0,0,0,0.9), 0 0 14px ${primaryColor}; font-family: monospace, system-ui; letter-spacing: 0.5px;">
           ${displayText}
         </span>
         <span style="font-size: 11px; font-weight: 800; color: #ffffff; background: rgba(0,0,0,0.45); padding: 3px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid ${secondaryColor}55;">
           ${actionTitle}
         </span>
      </div>
    `;
    Object.assign(labelText.style, {
      position: 'relative', zIndex: '2', textAlign: 'center',
      willChange: 'opacity', transition: 'transform 450ms ease, opacity 450ms ease',
    });
    starContainer.appendChild(labelText);

    document.body.appendChild(starContainer);
    nodes.push(starContainer);

    requestAnimationFrame(() => {
      starContainer.style.transform = 'translate3d(-50%,-50%,0) scale(1.25)';
      starContainer.style.opacity = '1';
    });

    timers.push(setTimeout(() => {
      starContainer.style.transform = 'translate3d(-50%,-50%,0) scale(1)';
    }, 700));

    // 8. Desprendimiento de 5 puntas al segundo 2.8s (duración extendida a 4.2s)
    timers.push(setTimeout(() => {
      starBg.style.transition = 'transform 700ms ease-in, opacity 700ms ease-in';
      starBg.style.transform = 'scale(0) rotate(240deg)';
      starBg.style.opacity = '0';
      labelText.style.transition = 'opacity 400ms ease-in';
      labelText.style.opacity = '0';

      sunburst.style.transition = 'transform 700ms ease-in, opacity 700ms ease-in';
      sunburst.style.transform = 'translate3d(-50%,-50%,0) scale(0.1) rotate(360deg)';
      sunburst.style.opacity = '0';

      for (let p = 0; p < 5; p++) {
        const tipAngle = ((p * 72) - 90) * (Math.PI / 180);
        const startX = window.innerWidth / 2 + Math.cos(tipAngle) * 50;
        const startY = window.innerHeight * 0.42 + Math.sin(tipAngle) * 50;

        const tip = document.createElement('div');
        tip.innerHTML = isPositive ? '★' : '◆';
        Object.assign(tip.style, {
          position: 'fixed', left: `${startX}px`, top: `${startY}px`,
          zIndex: '100001', color: primaryColor, fontSize: '42px', lineHeight: '1',
          textShadow: `0 0 20px ${primaryColor}, 0 0 35px ${secondaryColor}`,
          transform: 'translate3d(-50%,-50%,0) scale(1.4) rotate(0deg)', opacity: '1',
          willChange: 'transform, opacity',
          transition: 'transform 900ms cubic-bezier(.17,.89,.32,1.28), opacity 900ms ease-out',
        });
        document.body.appendChild(tip);
        nodes.push(tip);

        const destX = Math.cos(tipAngle) * 170;
        const destY = Math.sin(tipAngle) * 170;

        requestAnimationFrame(() => {
          tip.style.transform = `translate3d(calc(-50% + ${destX}px), calc(-50% + ${destY}px), 0) scale(0.1) rotate(${360 + p * 72}deg)`;
          tip.style.opacity = '0';
        });

        for (let spark = 0; spark < 3; spark++) {
          const sparkEl = document.createElement('div');
          Object.assign(sparkEl.style, {
            position: 'fixed', left: `${startX}px`, top: `${startY}px`,
            width: '8px', height: '8px', borderRadius: '50%',
            background: spark % 2 === 0 ? '#ffffff' : secondaryColor,
            zIndex: '100002', opacity: '1', boxShadow: `0 0 12px ${primaryColor}`,
            willChange: 'transform, opacity',
            transition: 'transform 800ms ease-out, opacity 800ms ease-out',
          });
          document.body.appendChild(sparkEl);
          nodes.push(sparkEl);

          const sparkAngle = tipAngle + (Math.random() - 0.5) * 1.2;
          const sparkDist = 80 + Math.random() * 80;
          const sdx = Math.cos(sparkAngle) * sparkDist;
          const sdy = Math.sin(sparkAngle) * sparkDist;

          requestAnimationFrame(() => {
            sparkEl.style.transform = `translate3d(${sdx}px, ${sdy}px, 0) scale(0.1)`;
            sparkEl.style.opacity = '0';
          });
          timers.push(setTimeout(() => sparkEl.remove(), 850));
        }

        timers.push(setTimeout(() => tip.remove(), 950));
      }
    }, 2800));

    timers.push(setTimeout(() => starContainer.remove(), 3600));

    // 9. Pulso progresivo de la Cápsula Destino (BalanceCard)
    if (targetEl) {
      const computedRadius = window.getComputedStyle(targetEl).borderRadius || '9999px';

      timers.push(setTimeout(() => {
        targetEl.style.transition = 'transform 450ms cubic-bezier(.22,1.6,.4,1), box-shadow 450ms ease';
        targetEl.style.borderRadius = computedRadius;
        targetEl.style.transform = 'scale(1.08)';
        targetEl.style.boxShadow = `0 0 20px 4px ${shadowRgba}`;
      }, 900));

      timers.push(setTimeout(() => {
        targetEl.style.transform = 'scale(1.18)';
        targetEl.style.boxShadow = `0 0 35px 12px ${shadowRgba}`;
      }, 2000));

      timers.push(setTimeout(() => {
        targetEl.style.transform = 'scale(1.25)';
        targetEl.style.boxShadow = `0 0 50px 18px ${shadowRgba}`;
      }, 2900));

      timers.push(setTimeout(() => {
        targetEl.style.transform = '';
        targetEl.style.boxShadow = '';
        targetEl.style.transition = '';
      }, 3800));
    }

    // Duración total ampliada a ~4.2 segundos para mejor apreciación visual y sonora
    const doneTimer = setTimeout(() => {
      if (onCompleteRef.current) onCompleteRef.current();
    }, 4200);
    timers.push(doneTimer);

    return () => {
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
      timers.forEach(clearTimeout);
      nodes.forEach((n) => n.remove());
      if (audioCtx && audioCtx.state !== 'closed') {
        try { audioCtx.close(); } catch (e) {}
      }
      if (targetEl) {
        targetEl.style.transform = '';
        targetEl.style.boxShadow = '';
        targetEl.style.transition = '';
      }
    };
  }, [amount, type, targetSelector, originSelector, profile]);

  return null;
}
