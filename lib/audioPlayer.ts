// Helper global para reproducir vista previa de sonidos sintetizados y archivos audio con cancelación instantánea de audio anterior

let activePreviewAudio: HTMLAudioElement | null = null;
let activePreviewTimers: ReturnType<typeof setTimeout>[] = [];
let activePreviewCtx: AudioContext | null = null;

/**
 * Detiene de forma inmediata cualquier audio o tono sintetizado anterior
 */
export function stopAllAudioPreviews() {
  if (typeof window === 'undefined') return;

  if (activePreviewAudio) {
    try {
      activePreviewAudio.pause();
      activePreviewAudio.currentTime = 0;
    } catch (e) {}
    activePreviewAudio = null;
  }

  activePreviewTimers.forEach(clearTimeout);
  activePreviewTimers = [];

  if (activePreviewCtx && activePreviewCtx.state !== 'closed') {
    try {
      activePreviewCtx.close();
    } catch (e) {}
    activePreviewCtx = null;
  }
}

export function playSoundPreview(soundId: string) {
  if (typeof window === 'undefined' || !soundId || soundId === 'silent') return;

  // 1. Detener INMEDIATAMENTE cualquier sonido anterior que se esté reproduciendo
  stopAllAudioPreviews();

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    activePreviewCtx = new AudioCtx();
    if (activePreviewCtx.state === 'suspended') {
      activePreviewCtx.resume().catch(() => {});
    }

    const ctx = activePreviewCtx;

    const playTone = (freq: number, type: OscillatorType, durationMs: number, delayMs: number = 0, gainLevel: number = 0.18) => {
      if (!ctx || ctx.state === 'closed') return;
      const timer = setTimeout(() => {
        try {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
          if (!ctx || ctx.state === 'closed') return;

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          gain.gain.setValueAtTime(0.001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(gainLevel, ctx.currentTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + durationMs / 1000);
        } catch (e) {}
      }, delayMs);

      activePreviewTimers.push(timer);
    };

    const now = ctx.currentTime;

    // 🍄 1. SONIDOS MARIO BROS (8-BIT NES)
    if (soundId === 'mario_1up') {
      const notes = [659.25, 1046.50, 1318.51, 1567.98, 2093.00, 3135.96];
      notes.forEach((freq, idx) => {
        const duration = idx === notes.length - 1 ? 360 : 70;
        playTone(freq, 'square', duration, idx * 70, 0.18);
      });
      return;
    }

    if (soundId === 'mario_coin') {
      playTone(987.77, 'square', 80, 0, 0.18);
      playTone(1318.51, 'square', 340, 80, 0.20);
      return;
    }

    if (soundId === 'mario_jump') {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } catch (e) {}
      return;
    }

    if (soundId === 'mario_pipe') {
      const notes = [400, 350, 300, 250];
      notes.forEach((freq, idx) => {
        playTone(freq, 'square', 110, idx * 95, 0.18);
      });
      return;
    }

    // 🔔 2. CAMPANADA CLÁSICA Y CAMPANADA SUAVE (Síntesis Armónica Cristalina)
    if (soundId === 'bell' || soundId === 'notification-sound.mp3') {
      // Campanada cristalina rica en armónicos (Do6 1046Hz + Do7 2093Hz)
      playTone(1046.50, 'sine', 600, 0, 0.22);
      playTone(2093.00, 'sine', 800, 20, 0.12);
      playTone(3135.96, 'triangle', 450, 40, 0.08);

      // Intentar además reproducir archivo MP3 si el navegador lo permite
      try {
        const audio = new Audio('/assets/sounds/notification-sound.mp3');
        audio.volume = 0.7;
        activePreviewAudio = audio;
        audio.play().catch(() => {});
      } catch (e) {}
      return;
    }

    if (soundId === 'soft' || soundId === 'notification.mp3') {
      playTone(783.99, 'sine', 350, 0, 0.18);
      playTone(1174.66, 'sine', 400, 50, 0.12);

      try {
        const audio = new Audio('/assets/sounds/notification.mp3');
        audio.volume = 0.7;
        activePreviewAudio = audio;
        audio.play().catch(() => {});
      } catch (e) {}
      return;
    }

    // ⚡ 3. SINTETIZADORES CIBERPUNK Y ARPEGIOS
    if (soundId === 'synth_laser') {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.28);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
      } catch (e) {}
      return;
    }

    if (soundId === 'synth_dissolve') {
      const notes = [880, 659.25, 523.25, 349.23, 220];
      notes.forEach((freq, idx) => {
        playTone(freq, 'triangle', 320, idx * 75, 0.20);
      });
      return;
    }

    if (soundId === 'synth' || soundId === 'chime') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 'sine', 350, idx * 80, 0.18);
      });
      return;
    }

    // 🔊 4. OTROS SINTETIZADORES Y PAE
    if (soundId === 'pop') {
      playTone(600, 'sine', 60, 0, 0.18);
      playTone(900, 'sine', 80, 40, 0.18);
      return;
    }

    if (soundId === 'click') {
      playTone(1200, 'triangle', 40, 0, 0.18);
      return;
    }

    if (soundId === 'haptic') {
      playTone(120, 'sine', 90, 0, 0.30);
      return;
    }

    if (soundId === 'arcade') {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        playTone(freq, 'square', 80, idx * 60, 0.15);
      });
      return;
    }

    if (soundId === 'crystal') {
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 'sine', 450, idx * 90, 0.18);
      });
      return;
    }

    if (soundId === 'marimba') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        playTone(freq, 'triangle', 180, idx * 80, 0.20);
      });
      return;
    }

    // 🔊 5. ARCHIVOS DE AUDIO CIBERPUNK
    let audioFilePath = '';
    let fallbackFreqs = [783.99, 1046.50];

    if (soundId === 'bass') {
      audioFilePath = '/assets/sounds/550332__wax_vibe__cyberpunk-bass.wav';
      fallbackFreqs = [110.00, 164.81];
    } else if (soundId === 'rover') {
      audioFilePath = '/assets/sounds/565373__the_runner_01__rover-landing.wav';
      fallbackFreqs = [220.00, 440.00];
    } else if (soundId === 'boomstick') {
      audioFilePath = '/assets/sounds/73577__cyberpunk64bit__boomstick.mp3';
      fallbackFreqs = [150.00, 60.00];
    }

    if (audioFilePath) {
      const audio = new Audio(audioFilePath);
      audio.volume = 0.8;
      activePreviewAudio = audio;
      audio.play().catch((err) => {
        console.warn(`Fallback sintético para ${soundId}:`, err);
        fallbackFreqs.forEach((freq, idx) => {
          playTone(freq, 'sine', 300, idx * 120, 0.20);
        });
      });
    } else {
      // Tono generico por defecto
      playTone(783.99, 'sine', 300, 0, 0.20);
    }
  } catch (e) {
    console.error('Audio preview error:', e);
  }
}
