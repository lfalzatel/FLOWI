'use client';
import { tr } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { Avatar } from '@/components/friends/Avatar';
import { speakText } from '@/lib/voiceParser';

// Celebración de una amistad nueva: tu foto y la de tu amigo llegan desde los lados, se juntan con un 🤝
// y salen chispas. Sale sola cuando aparece un amigo nuevo (aceptaste o te aceptaron) y se prueba desde Servicios.
const EVENT = 'flowi:friend-celebrate';

export function triggerFriendCelebration(friend: { name: string; photo?: string | null }) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: friend }));
}

function playChime() {
  try {
    if (localStorage.getItem('sound_enabled') === 'false') return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Dos notas que "se encuentran" y un acorde al juntarse
    [[440, 0], [554.37, 0.18], [659.25, 0.62], [880, 0.62], [1108.73, 0.62]].forEach(([f, d]) => {
      const t = ctx.currentTime + d;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = d > 0.5 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (d > 0.5 ? 1.1 : 0.3));
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 2200);
  } catch { /* sin audio */ }
}

function sparks() {
  try {
    if (localStorage.getItem('anim_confetti_enabled') === 'false') return;
    const colors = ['#22D3EE', '#10B981', '#A7F3D0', '#FFFFFF', '#F97316'];
    confetti({ particleCount: 90, spread: 80, startVelocity: 38, origin: { y: 0.45 }, colors, zIndex: 100001, shapes: ['circle', 'star'], scalar: 0.9 });
    setTimeout(() => confetti({ particleCount: 40, spread: 120, startVelocity: 25, origin: { y: 0.45 }, colors, zIndex: 100001, scalar: 0.7 }), 250);
  } catch { /* sin confeti */ }
}

export function FriendCelebration() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [friend, setFriend] = useState<{ name: string; photo?: string | null } | null>(null);
  const [met, setMet] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      setFriend((e as CustomEvent).detail);
      setMet(false);
      playChime();
      setTimeout(() => {
        setMet(true); sparks();
        try { navigator.vibrate?.([30, 60, 30]); } catch { /* sin vibración */ }
        // Voz (si la persona tiene activada la voz en Configuración → Sonidos)
        const first = String((e as CustomEvent).detail?.name || '').split(/\s+/)[0];
        speakText(first ? tr('¡Ahora eres amigo de {a}!', { a: first }) : tr('¡Tienes un amigo nuevo en FLOWI!'), 'es-CO');
      }, 650);
      setTimeout(() => setFriend(null), 3600);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  if (!friend || typeof document === 'undefined') return null;
  const me = { name: profile?.name || user?.displayName || 'Tú', photo: profile?.photoURL || user?.photoURL || null };
  const first = friend.name.split(/\s+/)[0];

  return createPortal(
    <div className={`fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-up ${isTech ? 'font-mono' : ''}`}
         onClick={() => setFriend(null)} role="dialog" aria-label={tr('Ahora eres amigo de {a}', { a: first })}>
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="relative flex items-center justify-center h-28 w-72">
          {/* Las dos fotos llegan desde los lados y se juntan */}
          <div className="absolute transition-all duration-[650ms] ease-out" style={{ transform: `translateX(${met ? -34 : -140}px)`, opacity: met ? 1 : 0.6 }}>
            <div className="rounded-full ring-4 ring-cyan-400/70 shadow-[0_0_30px_rgba(34,211,238,0.6)]"><Avatar p={me} size={84} /></div>
          </div>
          <div className="absolute transition-all duration-[650ms] ease-out" style={{ transform: `translateX(${met ? 34 : 140}px)`, opacity: met ? 1 : 0.6 }}>
            <div className="rounded-full ring-4 ring-emerald-400/70 shadow-[0_0_30px_rgba(16,185,129,0.6)]"><Avatar p={friend} size={84} /></div>
          </div>
          <span className={`absolute text-4xl transition-all duration-300 ${met ? 'scale-125 opacity-100' : 'scale-0 opacity-0'}`} style={{ transitionDelay: met ? '80ms' : '0ms' }}>🤝</span>
        </div>
        <div className={`transition-all duration-500 ${met ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <p className={`text-2xl font-bold ${isTech ? 'text-accent uppercase tracking-wider' : 'text-white font-syne'}`}>{tr('¡Ahora son amigos!')}</p>
          <p className="text-sm text-white/80 mt-1">{tr('Tú y {a} ya pueden compartir gastos en FLOWI.', { a: first })}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
