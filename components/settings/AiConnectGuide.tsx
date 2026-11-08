'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { startOpenRouterConnect } from '@/lib/aiAssist';

// Paso a paso (con voz del navegador, sin costo) para conectar la IA gratuita de OpenRouter.
// Lo importante: OpenRouter puede pedir una tarjeta al crear la cuenta; no hace falta, se omite.

interface GuideStep { emoji: string; title: string; text: string; tip?: string }

const STEPS: GuideStep[] = [
  { emoji: '✨', title: 'Conecta la IA gratis',
    text: 'Te muestro cómo conectar la IA gratuita en un minuto. Con ella FLOWI entiende mejor lo que dictas y puede leer recibos y capturas del banco. Es gratis hoy y sigue siendo gratis después de configurarla: FLOWI solo usa los modelos gratuitos.' },
  { emoji: '👆', title: '1. Toca "Conectar IA gratis"',
    text: 'FLOWI te lleva a OpenRouter, la página que da acceso a los modelos de IA gratuitos.' },
  { emoji: '🔑', title: '2. Entra con Google',
    text: 'Toca "Continuar con Google" y elige tu cuenta. Si ya tienes cuenta de OpenRouter, solo inicia sesión.' },
  { emoji: '💳', title: '3. Si te pide tarjeta, NO la pongas',
    text: 'Si aparece "Add a payment method", no llenes nada. Baja hasta el final de esa pantalla y toca "Later" o "Skip". Sin tarjeta no hay forma de que te cobren: la IA de FLOWI es gratis siempre.',
    tip: 'Busca abajo: Later / Skip' },
  { emoji: '⏭️', title: '4. Omite otra vez',
    text: 'Si aparece otra pantalla preguntando algo más, como créditos o tu uso, vuelve a tocar "Skip".',
    tip: 'Otra vez: Skip' },
  { emoji: '✅', title: '5. Toca "Authorize"',
    text: 'Verás una pantalla que pide permiso para FLOWI. Revisa que diga flowi-gastos punto web punto app y toca el botón morado "Authorize". No cambies nada más.',
    tip: 'Botón morado: Authorize' },
  { emoji: '🎉', title: '6. ¡Listo!',
    text: 'Vuelves a FLOWI y verás "IA conectada". Desde ahí ya puedes dictar con más precisión y llenar con fotos los recibos y tus CDT. Y recuerda: es gratis, no tienes que pagar nada ni ahora ni después.' },
];

const VOICE_KEY = 'flowi_ai_guide_voice';

function pickSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const es = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
  return es.find(v => /es-(co|419|us|mx)/i.test(v.lang)) || es[0] || null;
}

export function AiConnectGuide({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [i, setI] = useState(0);
  const [voice, setVoice] = useState(() => { try { return localStorage.getItem(VOICE_KEY) !== 'false'; } catch { return true; } });
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  // Lee cada paso en voz alta
  useEffect(() => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (!voice) return;
    const speak = () => {
      const u = new SpeechSynthesisUtterance(`${step.title.replace(/^\d+\.\s*/, '')}. ${step.text}`);
      const v = pickSpanishVoice();
      if (v) u.voice = v;
      u.lang = v?.lang || 'es-CO';
      u.rate = 1;
      synth.speak(u);
    };
    if (synth.getVoices().length) speak();
    else synth.addEventListener('voiceschanged', speak, { once: true });
    return () => synth.cancel();
  }, [i, voice, canSpeak]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (canSpeak) window.speechSynthesis.cancel(); }, [canSpeak]);

  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    try { localStorage.setItem(VOICE_KEY, String(next)); } catch { /* sin almacenamiento */ }
  };

  const connect = () => {
    if (canSpeak) window.speechSynthesis.cancel();
    startOpenRouterConnect();
  };

  if (typeof document === 'undefined') return null;
  const btn = isTech ? 'rounded-none font-mono uppercase text-xs tracking-wider' : 'rounded-xl text-sm';
  return createPortal(
    <div className={`fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-sm p-5 animate-fade-in-up glass-dropdown ${isTech ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider text-text-muted">Paso {i + 1} de {STEPS.length}</span>
          <div className="flex items-center gap-1">
            {canSpeak && (
              <button type="button" onClick={toggleVoice} aria-label={voice ? 'Silenciar voz' : 'Activar voz'}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10">
                {voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Cerrar la guía" className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-4xl mb-2" aria-hidden="true">{step.emoji}</div>
        <h3 className={`text-base font-bold text-text-primary mb-1.5 ${isTech ? 'uppercase tracking-wide' : 'font-syne'}`}>{step.title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{step.text}</p>
        {step.tip && (
          <p className={`mt-3 inline-block text-xs font-bold px-2.5 py-1 bg-accent/15 text-accent border border-accent/40 ${isTech ? 'rounded-none' : 'rounded-full'}`}>{step.tip}</p>
        )}

        <div className="flex justify-center gap-1.5 my-4" aria-hidden="true">
          {STEPS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-accent' : 'w-1.5 bg-white/20'}`} />)}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}
                  className={`py-3 font-semibold border border-glass-border text-text-secondary disabled:opacity-40 flex items-center justify-center gap-1 ${btn}`}>
            <ChevronLeft className="w-4 h-4" /> Atrás
          </button>
          {last ? (
            <button type="button" onClick={connect}
                    className={`py-3 font-bold ${isTech ? 'bg-accent/20 border border-accent text-accent' : `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`} ${btn}`}>
              Conectar ahora
            </button>
          ) : (
            <button type="button" onClick={() => setI(i + 1)}
                    className={`py-3 font-bold flex items-center justify-center gap-1 ${isTech ? 'bg-accent/20 border border-accent text-accent' : `bg-accent ${theme === 'light' ? 'text-white' : 'text-black'}`} ${btn}`}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
