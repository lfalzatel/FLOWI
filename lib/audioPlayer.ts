// Helper global para reproducir vista previa de sonidos sintetizados y archivos audio
export function playSoundPreview(soundId: string) {
  if (typeof window === 'undefined' || !soundId || soundId === 'silent') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    let ctx: AudioContext | null = null;
    if (AudioCtx) {
      ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }

    const now = ctx ? ctx.currentTime : 0;

    const playTone = (freq: number, type: OscillatorType, durationMs: number, delayMs: number = 0, gainLevel: number = 0.18) => {
      if (!ctx) return;
      setTimeout(() => {
        try {
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
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
    };

    // 1. Sonidos Sintetizados (Web Audio API)
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
      if (ctx) {
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
      }
      return;
    }

    if (soundId === 'mario_pipe') {
      const notes = [400, 350, 300, 250];
      notes.forEach((freq, idx) => {
        playTone(freq, 'square', 110, idx * 95, 0.18);
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

    if (soundId === 'synth_laser') {
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      }
      return;
    }

    if (soundId === 'synth_dissolve') {
      const notes = [880, 659.25, 523.25, 349.23, 220];
      notes.forEach((freq, idx) => {
        playTone(freq, 'triangle', 320, idx * 75, 0.20);
      });
      return;
    }

    // 2. Archivos de Audio MP3 / WAV con Fallback Sintetizado Garantizado
    let audioFilePath = '';
    let fallbackFreqs = [783.99, 1046.50];

    if (soundId === 'notification.mp3' || soundId === 'soft') {
      audioFilePath = '/assets/sounds/notification.mp3';
      fallbackFreqs = [587.33, 880.00];
    } else if (soundId === 'notification-sound.mp3' || soundId === 'bell') {
      audioFilePath = '/assets/sounds/notification-sound.mp3';
      fallbackFreqs = [783.99, 1046.50];
    } else if (soundId === 'bass') {
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
      audio.volume = 1.0;
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
