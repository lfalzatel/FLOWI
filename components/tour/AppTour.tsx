'use client';
import { pickAppVoice, appSpeechLang } from '@/lib/voiceParser';
import { tr } from '@/lib/i18n';
import Link from 'next/link';
import { HOME_TOUR, TourStep } from './tours';
import { ShareIllustration } from './ShareIllustration';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Compass, Volume2, VolumeX, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { usePopupHold } from '@/lib/tourGate';
import { speechText } from '@/lib/speech';

// Recorrido guiado: primero cómo registrar, luego cómo leer cada parte de Inicio (marcadas con
// data-tour="..."). Mientras dura, Inicio muestra datos de ejemplo que no se guardan. La voz usa
// la síntesis del propio navegador: no tiene costo ni necesita internet. Las partes que no
// estén en pantalla (p. ej. el menú inferior en computador) se saltan.

// v2: el recorrido se renovó (IA, compartir desde el banco, cuentas, servicios): se ofrece otra vez
export const TOUR_DONE_KEY = 'flowi_tour_done_v2';
const VOICE_KEY = 'flowi_tour_voice';

type Step = TourStep;

function findTarget(step: Step): HTMLElement | null {
  if (!step.target) return null;
  for (const t of step.target.split('|')) {
    // Puede haber dos (una para celular y otra para PC): se usa la que se ve
    const all = Array.from(document.querySelectorAll<HTMLElement>(t.startsWith('#') ? t : `[data-tour="${t}"]`));
    const el = all.find(e => e.offsetParent !== null) || all[0] || null;
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}


// Centra la parte dentro de su ventana con scroll (el formulario), sin mover la página de atrás
function scrollWithin(el: HTMLElement) {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) {
      const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
      p.scrollTop += (r.top - pr.top) - Math.max(0, (pr.height - r.height) / 3);
      return;
    }
  }
}

export function readTourVoicePref(): boolean {
  try { return localStorage.getItem(VOICE_KEY) !== 'false'; } catch { return true; }
}

// Ofrecimiento la primera vez que se entra a Inicio
export function TourOffer({ onStart, onSkip }: { onStart: (voice: boolean) => void; onSkip: () => void }) {
  const { theme } = useTheme();
  usePopupHold(); // nada más se abre mientras se ofrece el recorrido
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  if (typeof document === 'undefined') return null;
  const primary = `w-full flex items-center justify-center gap-2 py-3 font-bold transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase text-xs tracking-wider' : 'rounded-xl bg-accent text-white hover:bg-accent/90 text-sm'}`;
  const secondary = `w-full py-3 text-sm font-semibold border transition-all active:scale-[0.98] ${isTechTheme ? 'rounded-none border-accent/40 text-accent uppercase text-xs' : 'rounded-xl border-glass-border text-text-primary hover:bg-glass'}`;
  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono' : ''}`}>
      <div className={`absolute inset-0 ${(theme === 'light' || theme === 'nova') ? 'bg-black/20' : 'bg-black/60'} backdrop-blur-sm`} onClick={onSkip} aria-hidden="true" />
      <div className={`w-full max-w-sm relative z-10 animate-fade-in-up p-6 glass-dropdown text-center ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-3xl'}`}>
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/15 flex items-center justify-center">
          <Compass className="w-7 h-7 text-accent" />
        </div>
        <h2 className={`font-bold text-lg ${isTechTheme ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{tr('¿Te muestro cómo usar FLOWI?')}</h2>
        <p className="text-sm text-text-secondary mt-1 mb-5">{tr('Un recorrido corto: cómo registrar, escanear recibos con IA, compartir desde tu banco, conectar tus cuentas y leer tu inicio.')}</p>
        <div className="space-y-2">
          <button type="button" onClick={() => onStart(true)} className={primary}><Volume2 className="w-4 h-4" /> {tr('Sí, con voz')}</button>
          <button type="button" onClick={() => onStart(false)} className={secondary}>{tr('Sí, solo leyendo')}</button>
          <button type="button" onClick={onSkip} className="w-full py-2 text-xs font-semibold text-text-muted hover:text-text-primary">{tr('Omitir')}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AppTour({ voice: initialVoice, demo = false, steps: source = HOME_TOUR, markDone = true, onClose }: {
  voice: boolean; demo?: boolean; steps?: Step[]; markDone?: boolean; onClose: () => void;
}) {
  const { theme } = useTheme();
  usePopupHold(); // ni avisos ni otras ventanas encima del recorrido
  const isLight = theme === 'light' || theme === 'nova';
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  // Solo los pasos cuya parte está en pantalla; se calcula después de pintar, cuando Inicio
  // ya muestra los datos de ejemplo
  const [steps, setSteps] = useState<Step[] | null>(null);
  useLayoutEffect(() => { setSteps(source.filter(s => !s.target || s.open || findTarget(s))); }, [source]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [voice, setVoice] = useState(initialVoice);
  const dir = useRef(1);
  const target = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardH, setCardH] = useState(240); // alto real del cuadro (cambia con el texto y el tema)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const step = steps?.[index] ?? source[0];

  const finish = useCallback(() => {
    if (canSpeak) window.speechSynthesis.cancel();
    if (markDone) try { localStorage.setItem(TOUR_DONE_KEY, 'true'); } catch { /* sin almacenamiento */ }
    closeOpened();
    onClose();
  }, [canSpeak, onClose, markDone]);

  // Lo que el paso abre para mostrarlo (el menú del + o el formulario de gasto). Se cierra al
  // pasar a un paso que no lo necesita y al terminar.
  const opened = useRef<TourStep['open'] | null>(null);
  const closeOpened = () => {
    if (opened.current) window.dispatchEvent(new Event('flowi-tour-close'));
    opened.current = null;
  };
  useEffect(() => () => closeOpened(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ubica la parte del paso; si no está en pantalla, pasa a la siguiente en la misma dirección.
  // Si el paso abre algo, espera un momento a que aparezca.
  useLayoutEffect(() => {
    const want = step.open || null;
    if (want !== opened.current) {
      closeOpened(); // cierra lo anterior (p. ej. el menú) antes de abrir lo del paso
      if (want) { window.dispatchEvent(new CustomEvent('flowi-tour-open', { detail: want })); opened.current = want; }
    }
    if (!step.target) { target.current = null; setRect(null); return; }
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const locate = () => {
      const el = findTarget(step);
      if (!el) {
        if (want && tries++ < 15) { timer = setTimeout(locate, 120); return; }
        const next = index + dir.current;
        if (steps && next >= 0 && next < steps.length) setIndex(next);
        return;
      }
      if (want) scrollWithin(el);
      target.current = el;
      setRect(el.getBoundingClientRect());
    };
    if (want) { target.current = null; setRect(null); timer = setTimeout(locate, 60); }
    else locate();
    return () => { if (timer) clearTimeout(timer); };
  }, [index, step, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mide el cuadro después de pintarlo, para ubicarlo sin tapar la parte explicada
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight;
    if (h && Math.abs(h - cardH) > 2) setCardH(h);
  });

  // Desplaza la página para que la parte y el cuadro quepan juntos debajo del encabezado
  useEffect(() => {
    const el = target.current;
    if (!el || !steps) return;
    // Lo que está fijo en pantalla (el botón +, la barra de abajo, un formulario abierto) no se alcanza bajando la página
    for (let p: HTMLElement | null = el; p; p = p.parentElement) {
      const pos = getComputedStyle(p).position;
      if (pos === 'fixed' || pos === 'sticky') return;
    }
    if (el.closest('header') || step.open) return;
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
      const u = new SpeechSynthesisUtterance(speechText(`${step.title.replace(/^\d+\.\s*/, '')}. ${step.text}`, appSpeechLang() === 'en' ? 'en' : 'es'));
      const v = pickAppVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || (appSpeechLang() === 'en' ? 'en-US' : 'es-CO');
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
    <div className={`fixed inset-0 z-[200] ${isTechTheme ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={tr('Recorrido por FLOWI')}>
      {/* Bloquea la pantalla de abajo; el hueco del resaltado es solo visual */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      {rect ? (
        <div className={`absolute pointer-events-none transition-all duration-300 ring-2 ring-accent ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}
             style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: `0 0 0 9999px rgba(0,0,0,${isLight ? 0.5 : 0.72})` }} />
      ) : (
        <div className={`absolute inset-0 ${isLight ? 'bg-black/50' : 'bg-black/70'} pointer-events-none`} />
      )}

      {demo && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-black text-[11px] font-bold shadow-lg pointer-events-none whitespace-nowrap">
          {tr('Datos de ejemplo · tus datos no se tocan')}
        </div>
      )}

      <div ref={cardRef} className={`absolute glass-dropdown tour-card p-4 shadow-2xl animate-fade-in-up ${isTechTheme ? 'rounded-none border border-accent/50 bg-deep' : 'rounded-2xl'}`} style={cardStyle}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className={`font-bold ${isTechTheme ? 'text-accent uppercase text-sm' : 'font-syne text-text-primary'}`}>{step.title}</h3>
          <div className="flex items-center gap-1 -mr-1 -mt-1 shrink-0">
            {canSpeak && (
              <button type="button" onClick={toggleVoice} aria-label={voice ? tr('Silenciar la voz') : tr('Activar la voz')} title={voice ? tr('Silenciar') : tr('Escuchar')}
                      className={`p-1.5 rounded-lg ${voice ? 'text-accent' : 'text-text-muted'} hover:bg-white/10`}>
                {voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={finish} aria-label={tr('Cerrar el recorrido')} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {step.illus && <div className="mb-3"><ShareIllustration frame={step.illus} /></div>}
        <p className="text-sm text-text-secondary leading-relaxed">{step.text}</p>
        {step.cta && (
          <Link href={step.cta.href} onClick={finish}
                className={`mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border ${isTechTheme ? 'rounded-none border-accent text-accent uppercase' : 'rounded-xl border-accent/50 text-accent bg-accent/10 hover:bg-accent/20'}`}>
            {step.cta.label} <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <div className="flex items-center justify-between gap-2 mt-4">
          <span className="text-[11px] text-text-muted">{tr('Paso {a} de {b}', { a: index + 1, b: total })}</span>
          <div className="flex items-center gap-2">
            {index === 0 ? (
              <button type="button" onClick={finish} className="px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary">{tr('Omitir')}</button>
            ) : (
              <button type="button" onClick={() => go(-1)} className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold border ${isTechTheme ? 'rounded-none border-accent/40 text-accent' : 'rounded-xl border-glass-border text-text-primary'}`}>
                <ChevronLeft className="w-3.5 h-3.5" /> {tr('Atrás')}
              </button>
            )}
            <button type="button" onClick={() => go(1)} className={`flex items-center gap-1 px-4 py-2 text-xs font-bold ${isTechTheme ? 'rounded-none bg-accent/20 border border-accent text-accent uppercase' : `rounded-xl bg-accent ${(theme === 'light' || theme === 'nova') ? 'text-white' : 'text-black'}`}`}>
              {isLast ? tr('Terminar') : tr('Siguiente')} {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
