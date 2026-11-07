'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Compass, Volume2, VolumeX, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

// Recorrido guiado: primero cómo registrar, luego cómo leer cada parte de Inicio (marcadas con
// data-tour="..."). Mientras dura, Inicio muestra datos de ejemplo que no se guardan. La voz usa
// la síntesis del propio navegador: no tiene costo ni necesita internet. Las partes que no
// estén en pantalla (p. ej. el menú inferior en computador) se saltan.

export const TOUR_DONE_KEY = 'flowi_tour_done';
const VOICE_KEY = 'flowi_tour_voice';

// target admite alternativas separadas por "|" (la primera que esté en pantalla)
interface Step { target?: string; title: string; text: string }

const STEPS: Step[] = [
  { title: '¡Hola! Te muestro FLOWI', text: 'Primero te enseño a registrar tu plata y después a leer tu pantalla de inicio. Lo que ves ahora son datos de ejemplo: tus datos no se tocan. Puedes omitir el recorrido cuando quieras.' },
  { target: 'voice|add', title: '1. Registra lo que sea desde aquí', text: 'Toca este botón y verás todo lo que puedes registrar: hablar, un gasto, un ingreso, la foto de un recibo, un extracto del banco, una deuda, un recordatorio, una nota o un CDT. Lo más rápido es hablar: di "gasté veinte mil en almuerzo" o "me pagaron el sueldo". Si mantienes presionado el botón, te escucho de una vez.' },
  { target: '#nav-gastos', title: '2. Gastos e ingresos', text: 'En estas pestañas ves la lista completa de gastos y de ingresos, y puedes editar o borrar. Cuando un gasto se repite cada mes, como el arriendo o los servicios, márcalo como gasto fijo; los demás son tus gastos del día a día.' },
  { target: '#nav-deudas', title: '3. Deudas', text: 'Aquí registras lo que debes y también lo que te deben, con intereses si aplica. Cada vez que pagas una parte, registras el abono y la deuda va bajando.' },
  { target: 'filter', title: 'Ahora, tu inicio: el período', text: 'Aquí escoges si ves todo, el mes, la semana o un día. Con las flechas cambias de mes. Todas las cifras de abajo dependen de lo que elijas aquí.' },
  { target: '#balance-card', title: 'Dinero disponible', text: 'Es lo que entró menos lo que salió en el período. En el ejemplo entraron tres millones y medio de sueldo y ya salió el arriendo. Si sale en rojo, gastaste más de lo que entró. Debajo, el balance neto también descuenta tus deudas.' },
  { target: 'totals', title: 'Gastos e ingresos del período', text: 'En rojo, todo lo que salió. En verde, todo lo que entró.' },
  { target: 'debts', title: 'Deudas pendientes', text: 'Lo que te falta por pagar de tus deudas. En el ejemplo, del préstamo de Juan ya se abonaron doscientos mil y faltan cuatrocientos mil. Tócala para ver el detalle.' },
  { target: 'today', title: 'Hoy puedes gastar', text: 'La cifra más útil del día: cuánto puedes gastar hoy sin quedarte corto a fin de mes. Ya aparta los pagos fijos que faltan, como el internet. Si te pasas, se pone en rojo y te dice cuánto puedes gastar desde mañana. Tócala para ver la cuenta.' },
  { target: 'next-action', title: 'Tu siguiente acción', text: 'Lo más útil que puedes hacer ahora. En el ejemplo, pagar el internet que vence pronto. Tócala para registrarlo, o sáltala por hoy con la X. Al empezar cada mes aquí te invito a cerrar el mes anterior.' },
  { target: 'projection', title: 'Control y proyección', text: 'Tus gastos fijos, el dinero libre que te queda y tu límite diario. Cada cuadro se puede tocar para ver el desglose.' },
  { target: 'commitments', title: 'Próximos compromisos', text: 'Los pagos fijos que te faltan este mes, con el valor que pagaste el mes pasado. Cuando pagues uno, tócalo para registrarlo.' },
  { target: 'goals', title: 'Metas de ahorro', text: 'Tu meta principal y cuánto llevas. Toca para ver todas tus metas y cuándo las lograrías.' },
  { target: 'chart', title: 'Gráfica del período', text: 'Muestra cómo se movió tu plata día a día en el período que elegiste.' },
  { target: 'budgets', title: 'Gastos por categoría', text: 'Compara en qué gastas con una guía sana: necesidades, gustos y ahorro. Toca cada grupo para ver sus categorías.' },
  { target: 'profile', title: 'Personaliza FLOWI', text: 'En tu foto cambias el tema y los colores: Cyber, Día, Noche y más. Ahí mismo está "Ver tutorial" para repetir este recorrido cuando quieras.' },
  { title: '¡Listo!', text: 'Ya sabes registrar y leer tu inicio. Al cerrar vuelven tus datos reales. ¡A llevar tus cuentas claras!' },
];

function findTarget(step: Step): HTMLElement | null {
  if (!step.target) return null;
  for (const t of step.target.split('|')) {
    const el = document.querySelector<HTMLElement>(t.startsWith('#') ? t : `[data-tour="${t}"]`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
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

export function AppTour({ voice: initialVoice, demo = false, onClose }: { voice: boolean; demo?: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  // Solo los pasos cuya parte está en pantalla; se calcula después de pintar, cuando Inicio
  // ya muestra los datos de ejemplo
  const [steps, setSteps] = useState<Step[] | null>(null);
  useLayoutEffect(() => { setSteps(STEPS.filter(s => !s.target || findTarget(s))); }, []);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [voice, setVoice] = useState(initialVoice);
  const dir = useRef(1);
  const target = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardH, setCardH] = useState(240); // alto real del cuadro (cambia con el texto y el tema)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const step = steps?.[index] ?? STEPS[0];

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
      if (steps && next >= 0 && next < steps.length) setIndex(next);
      return;
    }
    target.current = el;
    setRect(el.getBoundingClientRect());
  }, [index, step, steps]);

  // Mide el cuadro después de pintarlo, para ubicarlo sin tapar la parte explicada
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 2) setCardH(h);
  });

  // Desplaza la página para que la parte y el cuadro quepan juntos debajo del encabezado
  useEffect(() => {
    const el = target.current;
    if (!el || !steps) return;
    const pos = getComputedStyle(el).position;
    if (pos === 'fixed' || pos === 'sticky' || el.closest('header')) return;
    const r = el.getBoundingClientRect();
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
    const filter = document.querySelector<HTMLElement>('[data-tour="filter"]');
    const topSafe = headerH + (filter && filter !== el ? filter.offsetHeight : 0) + 12;
    const avail = window.innerHeight - topSafe - 16;
    const needed = r.height + 16 + 12 + cardH;
    const desiredTop = needed <= avail ? topSafe + 8 + (avail - needed) / 2 : topSafe + 8;
    const delta = r.top - desiredTop;
    if (Math.abs(delta) > 8) window.scrollBy({ top: delta, behavior: 'smooth' });
  }, [index, steps, cardH]);

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
      // En mayúsculas la voz lo deletrea ("F, L, O…"); así lo lee como palabra
      const u = new SpeechSynthesisUtterance(`${step.title}. ${step.text}`.replace(/FLOWI/g, 'Flowi'));
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
    if (!steps) return;
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

  if (typeof document === 'undefined' || !steps) return null;

  const pad = 8;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const cardW = Math.min(360, vw - 32);
  let cardStyle: React.CSSProperties;
  if (rect) {
    // Debajo si cabe, si no encima; si no cabe en ninguno, del lado con más espacio
    const below = rect.bottom + pad + 12;
    const above = rect.top - pad - 12 - cardH;
    const top = below + cardH + 12 <= vh ? below
      : above >= 12 ? above
      : (vh - rect.bottom > rect.top ? vh - cardH - 12 : 12);
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardW / 2), vw - cardW - 16);
    cardStyle = { top, left, width: cardW };
  } else {
    // Posición explícita: la animación de entrada usa transform y anularía un translate de centrado
    cardStyle = { top: Math.max(16, (vh - cardH) / 2), left: (vw - cardW) / 2, width: cardW };
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

      {demo && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap">
          Datos de ejemplo · tus datos no se tocan
        </div>
      )}

      <div ref={cardRef} className={`absolute glass-dropdown p-4 shadow-2xl animate-fade-in-up ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-2xl'}`} style={cardStyle}>
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
