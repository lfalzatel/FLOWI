'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { Crown, Camera, Landmark, Target, Sparkles, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';

// Celebración al volverse Premium: corona dorada con rayos, lo que se desbloquea y confeti dorado.
// Sale sola cuando un pago nuevo extiende el Premium, y se puede probar desde Servicios.
const EVENT = 'flowi:premium-celebrate';
const SEEN_KEY = 'flowi_premium_seen_until';

export function triggerPremiumCelebration(until?: Date) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { until: until?.toISOString() } }));
}

const PERKS = [
  { icon: Camera, text: 'Recibos con foto sin límite' },
  { icon: Landmark, text: 'Todas tus inversiones y CDT' },
  { icon: Target, text: 'Todas las metas de ahorro' },
  { icon: Sparkles, text: 'Y lo que vamos sumando' },
];

function playFanfare() {
  try {
    if (localStorage.getItem('sound_enabled') === 'false') return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // do-mi-sol-do-mi
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.12;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i === notes.length - 1 ? 'triangle' : 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (i === notes.length - 1 ? 1.2 : 0.35));
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.3);
    });
    setTimeout(() => ctx.close().catch(() => {}), 2500);
  } catch { /* sin audio */ }
}

function goldConfetti() {
  try {
    if (localStorage.getItem('anim_confetti_enabled') === 'false') return;
    const colors = ['#FBBF24', '#F59E0B', '#FDE68A', '#FFFFFF', '#D97706'];
    const end = Date.now() + 1800;
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 100001, scalar: 1.1 });
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 100001, scalar: 1.1 });
      if (Date.now() < end) setTimeout(frame, 30);
    };
    setTimeout(() => confetti({ particleCount: 120, spread: 100, startVelocity: 45, origin: { y: 0.42 }, colors, zIndex: 100001, shapes: ['star', 'circle'] }), 450);
    frame();
  } catch { /* nada */ }
}

export function PremiumCelebration() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [open, setOpen] = useState<{ until: Date | null } | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const iso = (e as CustomEvent).detail?.until;
      setOpen({ until: iso ? new Date(iso) : null });
      playFanfare();
      goldConfetti();
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  // Cuando llega un pago nuevo (premiumUntil crece), se celebra una vez en este dispositivo.
  // La primera vez solo se guarda la fecha, para no celebrar un Premium que ya se tenía.
  useEffect(() => {
    const raw = (profile as any)?.premiumUntil;
    const until = raw ? (typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw)) : null;
    if (!until || isNaN(until.getTime())) return;
    try {
      const seen = localStorage.getItem(SEEN_KEY);
      localStorage.setItem(SEEN_KEY, until.toISOString());
      if (seen && until.getTime() > new Date(seen).getTime() + 60_000 && until > new Date()) triggerPremiumCelebration(until);
    } catch { /* sin almacenamiento */ }
  }, [profile]);

  if (!open || typeof document === 'undefined') return null;
  const untilText = open.until?.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return createPortal(
    <div className={`fixed inset-0 z-[100000] flex items-center justify-center p-6 ${isTech ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label="Ya eres Premium">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" style={{ animation: 'pc-fade .4s ease-out' }} onClick={() => setOpen(null)} aria-hidden="true" />
      <div className="relative w-full max-w-sm flex flex-col items-center text-center">
        {/* Corona con rayos girando y un halo que respira */}
        <div className="relative w-44 h-44 flex items-center justify-center mb-2">
          <div className="absolute inset-0 rounded-full opacity-70"
               style={{ background: 'repeating-conic-gradient(from 0deg, rgba(251,191,36,.45) 0deg 8deg, transparent 8deg 24deg)', animation: 'pc-spin 9s linear infinite', maskImage: 'radial-gradient(circle, black 30%, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)' }} />
          <div className="absolute w-28 h-28 rounded-full bg-amber-400/30 blur-2xl" style={{ animation: 'pc-breathe 2.2s ease-in-out infinite' }} />
          <div className={`relative w-24 h-24 flex items-center justify-center bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_0_40px_rgba(251,191,36,.6)] ${isTech ? 'rounded-none' : 'rounded-3xl'}`}
               style={{ animation: 'pc-pop .7s cubic-bezier(.2,1.6,.4,1) both' }}>
            <Crown className="w-12 h-12 text-amber-950" strokeWidth={2.2} />
            <span className="absolute inset-0 overflow-hidden rounded-[inherit]">
              <span className="absolute -inset-y-4 -left-1/2 w-1/3 bg-white/50 blur-md" style={{ animation: 'pc-shine 2.4s ease-in-out .8s infinite' }} />
            </span>
          </div>
        </div>

        <h2 className={`text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent ${isTech ? 'uppercase tracking-wider' : 'font-syne'}`}
            style={{ backgroundSize: '200% auto', animation: 'pc-up .5s ease-out .35s both, pc-text 3s linear infinite' }}>
          ¡Ya eres Premium!
        </h2>
        <p className="text-sm text-white/80 mt-1" style={{ animation: 'pc-up .5s ease-out .5s both' }}>
          Gracias por apoyar a FLOWI{untilText ? ` · activo hasta el ${untilText}` : ''}.
        </p>

        <ul className="mt-5 w-full space-y-2">
          {PERKS.map((p, i) => (
            <li key={p.text} className={`flex items-center gap-3 px-4 py-2.5 bg-white/5 border border-amber-400/25 text-left ${isTech ? 'rounded-none' : 'rounded-2xl'}`}
                style={{ animation: `pc-up .45s ease-out ${0.7 + i * 0.15}s both` }}>
              <p.icon className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="flex-1 text-sm text-white">{p.text}</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </li>
          ))}
        </ul>

        <button type="button" onClick={() => setOpen(null)}
                className={`mt-6 w-full py-3.5 font-bold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-transform ${isTech ? 'rounded-none uppercase tracking-widest' : 'rounded-xl'}`}
                style={{ animation: `pc-up .45s ease-out ${0.7 + PERKS.length * 0.15}s both` }}>
          ¡A disfrutarlo!
        </button>
      </div>
      <style>{`
        @keyframes pc-fade{from{opacity:0}to{opacity:1}}
        @keyframes pc-spin{to{transform:rotate(360deg)}}
        @keyframes pc-breathe{0%,100%{transform:scale(.9);opacity:.6}50%{transform:scale(1.15);opacity:1}}
        @keyframes pc-pop{0%{transform:scale(0) rotate(-25deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
        @keyframes pc-shine{0%{transform:translateX(0) rotate(20deg)}60%,100%{transform:translateX(450%) rotate(20deg)}}
        @keyframes pc-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes pc-text{to{background-position:200% center}}
      `}</style>
    </div>,
    document.body,
  );
}
