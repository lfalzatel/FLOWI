'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Compass, Volume2, VolumeX, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

// Recorrido guiado por la pantalla de Inicio: resalta cada parte (marcada con data-tour="...")
// y explica cómo leerla. La voz usa la síntesis del propio navegador: no tiene costo ni
// necesita internet. Las partes que no estén en pantalla (p. ej. sin metas) se saltan.

export const TOUR_DONE_KEY = 'flowi_tour_done';
const VOICE_KEY = 'flowi_tour_voice';

interface Step { target?: string; title: string; text: string }

const STEPS: Step[] = [
  { title: '¡Hola! Te muestro FLOWI', text: 'En un minuto te explico cómo leer tu pantalla de inicio. Puedes omitir el recorrido cuando quieras.' },
  { target: 'filter', title: 'Elige qué período ver', text: 'Aquí escoges si ves todo, el mes, la semana o un día. Con las flechas cambias de mes. Todas las cifras de abajo dependen de lo que elijas aquí.' },
  { target: '#balance-card', title: 'Dinero disponible', text: 'Es lo que entró menos lo que salió en el período. Si sale en rojo, gastaste más de lo que entró. Debajo, el balance neto también descuenta tus deudas.' },
  { target: 'totals', title: 'Gastos e ingresos', text: 'En rojo, todo lo que salió en el período. En verde, todo lo que entró.' },
  { target: 'debts', title: 'Deudas pendientes', text: 'Lo que te falta por pagar de tus deudas, con intereses si tienen tasa. Tócala para ver cada deuda.' },
  { target: 'today', title: 'Hoy puedes gastar', text: 'La cifra más útil del día: cuánto puedes gastar hoy sin quedarte corto a fin de mes. Ya aparta tus pagos fijos pendientes. Si te pasas, se pone en rojo y te dice cuánto puedes gastar desde mañana. Tócala para ver la cuenta.' },
  { target: 'next-action', title: 'Tu siguiente acción', text: 'Lo más útil que puedes hacer ahora: pagar algo que vence, registrar tu sueldo o cerrar el mes. Tócala para hacerlo, o sáltala por hoy con la X.' },
  { target: 'projection', title: 'Control y proyección', text: 'Tus gastos fijos, el dinero libre que te queda y tu límite diario. Cada cuadro se puede tocar para ver el desglose.' },
  { target: 'commitments', title: 'Próximos compromisos', text: 'Los pagos fijos que te faltan este mes, con el valor que pagaste el mes pasado. Cuando pagues uno, tócalo para registrarlo.' },
  { target: 'goals', title: 'Metas de ahorro', text: 'Tu meta principal y cuánto llevas. Toca para ver todas tus metas y cuándo las lograrías.' },
  { target: 'chart', title: 'Gráfica del período', text: 'Muestra cómo se movió tu plata día a día en el período que elegiste.' },
  { target: 'budgets', title: 'Gastos por categoría', text: 'Compara en qué gastas con una guía sana: necesidades, gustos y ahorro. Toca cada grupo para ver sus categorías.' },
  { target: 'voice', title: 'Registra con tu voz', text: 'La forma más rápida de anotar: toca el micrófono y di algo como "gasté veinte mil en almuerzo". La app lo entiende y lo guarda.' },
  { title: '¡Listo!', text: 'Ya sabes leer tu inicio. Puedes repetir este recorrido cuando quieras desde Configuración.' },
];

const selectorOf = (t: string) => (t.startsWith('#') ? t : `[data-tour="${t}"]`);

function findTarget(step: Step): HTMLElement | null {
  if (!step.target) return null;
  const el = document.querySelector<HTMLElement>(selectorOf(step.target));
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const es = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
  return es.find(v => /es-(co|419|us|mx)/i.test(v.lang)) || es[0] || null;
}

export function readTourVoicePref(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== 'false'; } catch { return true; }
}

// Ofrecimiento la primera vez que se entra a Inicio
export function TourOffer({ onStart, onSkip }: { onStart: (voice: boolean) => void; onSkip: () => void }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  if (typeof document === 'undefined') return null;
  const primary = `w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`;
  const secondary = `w-full py-3 text-sm font-semibold border transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-glass-border text-text-primary hover:bg-glass'}`;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/20' : 'bg-black/60'} backdrop-blur-sm`} onClick={onSkip} aria-hidden="true" />
      <div className={`w-full max-w-sm relative z-10 animate-fade-in-up p-6 glass-dropdown text-center ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-3xl'}`}>
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/15 flex items-center justify-center">
          <Compass className="w-7 h-7 text-accent" />
        </div>
        <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>¿Te muestro cómo usar FLOWI?</h2>
        <p className="text-sm text-text-secondary mt-1 mb-5">Un recorrido de un minuto por tu pantalla de inicio: qué significa cada cifra y cómo aprovecharla.</p>
        <div className="space-y-2">
          <button type="button" onClick={() => onStart(true)} className={primary}><Volume2 className="w-4 h-4" /> Sí, con voz</button>
          <button type="button" onClick={() => onStart(false)} className={secondary}>Sí, solo leyendo</button>
          <button type="button" onClick={onSkip} className="w-full py-2 text-xs font-semibold text-text-muted hover:text-text-primary">Omitir</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AppTour({ voice: initialVoice, onClose }: { voice: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  // Solo los pasos cuya parte está en pantalla al empezar (sin metas no hay paso de metas, etc.)
  const [steps] = useState(() => STEPS.filter(s => !s.target || findTarget(s)));
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [voice, setVoice] = useState(initialVoice);
  const dir = useRef(1);
  const target = useRef<HTMLElement | null>(null);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const step = steps[index];

  const finish = useCallback(() => {
    if (canSpeak) window.speechSynthesis.cancel();
    try { localStorage.setItem(TOUR_DONE_KEY, 'true'); } catch { /* sin almacenamiento */ }
    onClose();
  }, [canSpeak, onClose]);

  // Ubica la parte del paso; si no está en pantalla, pasa a la siguiente en la misma dirección
  useLayoutEffect(() => {
    if (!step.target) { target.current = null; setRect(null); return; }
    const el = findTarget(step);
    if (!el) {
      const next = index + dir.current;
      if (next >= 0 && next < steps.length) setIndex(next);
      return;
    }
    target.current = el;
    if (getComputedStyle(el).position !== 'fixed') el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setRect(el.getBoundingClientRect());
  }, [index, step, steps.length]);

  // Sigue a la parte resaltada mientras termina el desplazamiento o cambia el tamaño
  useEffect(() => {
    const update = () => { if (target.current) setRect(target.current.getBoundingClientRect()); };
    const timers = [150, 350, 700].map(ms => setTimeout(update, ms));
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [index]);

  // Voz del navegador
  useEffect(() => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (!voice) return;
    const speak = () => {
      const u = new SpeechSynthesisUtterance(`${step.title}. ${step.text}`);
      const v = pickSpanishVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || 'es-CO';
      u.rate = 1;
      synth.speak(u);
    };
    if (synth.getVoices().length) speak();
    else synth.addEventListener('voiceschanged', speak, { once: true });
    return () => { synth.removeEventListener('voiceschanged', speak); synth.cancel(); };
  }, [index, voice, canSpeak, step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function go(delta: number) {
    const next = index + delta;
    if (next >= steps.length) return finish();
    if (next < 0) return;
    dir.current = delta;
    setIndex(next);
  }

  function toggleVoice() {
    setVoice(v => {
      try { localStorage.setItem(VOICE_KEY, String(!v)); } catch { /* sin almacenamiento */ }
      return !v;
    });
  }

  if (typeof document === 'undefined') return null;

  const pad = 8;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const cardW = Math.min(360, vw - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + pad + 12;
    const fitsBelow = below + 230 < vh;
    const top = fitsBelow ? below : Math.max(12, rect.top - pad - 12 - 230);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    cardStyle = { top, left, width: cardW };
  } else {
    // Posición explícita: la animación de entrada usa transform y anularía un translate de centrado
    cardStyle = { top: Math.max(16, vh / 2 - 110), left: (vw - cardW) / 2, width: cardW };
  }
  const isLast = index === steps.length - 1;
  const total = steps.length;

  return createPortal(
    <div className={`fixed inset-0 z-[200] ${isTechTheme ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label="Recorrido por FLOWI">
      {/* Bloquea la pantalla de abajo; el hueco del resaltado es solo visual */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div className={`absolute pointer-events-none transition-all duration-300 ring-2 ring-accent ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
             style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)' }} />
      ) : (
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
      )}

      <div className={`absolute glass-dropdown p-4 shadow-2xl animate-fade-in-up ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-2xl'}`} style={cardStyle}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className={`font-bold ${isTechTheme ? 'text-accent uppercase text-sm' : 'font-syne text-text-primary'}`}>{step.title}</h3>
          <div className="flex items-center gap-1 -mr-1 -mt-1 shrink-0">
            {canSpeak && (
              <button type="button" onClick={toggleVoice} aria-label={voice ? 'Silenciar la voz' : 'Activar la voz'} title={voice ? 'Silenciar' : 'Escuchar'}
                      className={`p-1.5 rounded-lg ${voice ? 'text-accent' : 'text-text-muted'} hover:bg-white/10`}>
                {voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={finish} aria-label="Cerrar el recorrido" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">{step.text}</p>
        <div className="flex items-center justify-between gap-2 mt-4">
          <span className="text-[11px] text-text-muted">{index + 1} de {total}</span>
          <div className="flex items-center gap-2">
            {index === 0 ? (
              <button type="button" onClick={finish} className="px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary">Omitir</button>
            ) : (
              <button type="button" onClick={() => go(-1)} className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold border ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-primary'}`}>
                <ChevronLeft className="w-3.5 h-3.5" /> Atrás
              </button>
            )}
            <button type="button" onClick={() => go(1)} className={`flex items-center gap-1 px-4 py-2 text-xs font-bold ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : `rounded-xl bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`}`}>
              {isLast ? 'Terminar' : 'Siguiente'} {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
