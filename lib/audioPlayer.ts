// Helper global para reproducir vista previa de sonidos sintetizados y archivos MP3
export function playSoundPreview(soundId: string) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, type: OscillatorType, durationMs: number, delayMs: number = 0, gainLevel: number = 0.15) => {
      setTimeout(() => {
        try {
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

    if (soundId === 'mario_1up') {
      const notes = [659.25, 1046.50, 1318.51, 1567.98, 2093.00, 3135.96];
      notes.forEach((freq, idx) => {
        const duration = idx === notes.length - 1 ? 360 : 70;
        playTone(freq, 'square', duration, idx * 70, 0.15);
      });
      return;
    }

    if (soundId === 'mario_coin') {
      playTone(987.77, 'square', 80, 0, 0.15);
      playTone(1318.51, 'square', 340, 80, 0.18);
      return;
    }

    if (soundId === 'mario_jump') {
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
      return;
    }

    if (soundId === 'mario_pipe') {
      const notes = [400, 350, 300, 250];
      notes.forEach((freq, idx) => {
        playTone(freq, 'square', 110, idx * 95, 0.16);
      });
      return;
    }

    if (soundId === 'synth' || soundId === 'chime') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 'sine', 350, idx * 80, 0.16);
      });
      return;
    }

    if (soundId === 'pop') {
      playTone(600, 'sine', 60, 0, 0.15);
      playTone(900, 'sine', 80, 40, 0.15);
      return;
    }

    if (soundId === 'click') {
      playTone(1200, 'triangle', 40, 0, 0.15);
      return;
    }

    if (soundId === 'haptic') {
      playTone(120, 'sine', 90, 0, 0.25);
      return;
    }

    if (soundId === 'arcade') {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, idx) => {
        playTone(freq, 'square', 80, idx * 60, 0.12);
      });
      return;
    }

    if (soundId === 'crystal' || soundId === 'bass') {
      const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
      notes.forEach((freq, idx) => {
        playTone(freq, 'sine', 450, idx * 90, 0.16);
      });
      return;
    }

    if (soundId === 'marimba') {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        playTone(freq, 'triangle', 180, idx * 80, 0.18);
      });
      return;
    }

    if (soundId === 'synth_laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
      return;
    }

    if (soundId === 'synth_dissolve') {
      const notes = [880, 659.25, 523.25, 349.23, 220];
      notes.forEach((freq, idx) => {
        playTone(freq, 'triangle', 320, idx * 75, 0.18);
      });
      return;
    }

    if (soundId === 'boomstick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      return;
    }

    if (soundId === 'bell' || soundId === 'soft' || soundId === 'notification.mp3' || soundId === 'notification-sound.mp3') {
      const audio = new Audio(`/assets/sounds/${soundId.includes('.mp3') ? soundId : 'notification-sound.mp3'}`);
      audio.play().catch(() => {});
      return;
    }
  } catch (e) {
    console.error('Audio preview error:', e);
  }
}
