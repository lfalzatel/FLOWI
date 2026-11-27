'use client';
import { tr } from '@/lib/i18n';
import { appSpeechLang, appSpeechLocale } from '@/lib/voiceParser';
import { englishToParserText } from '@/lib/voiceEnglish';
import { portugueseToParserText } from '@/lib/voicePortuguese';
import { useEffect, useRef, useState } from 'react';
import { MAX_LISTEN_MS, SILENCE_MS, transcriptFromEvent } from '@/lib/speechInput';
import { Mic, MicOff } from 'lucide-react';

// Botón para dictar dentro de un formulario: escucha, muestra lo que va entendiendo y entrega el texto.
// Quien lo usa decide cómo llenar los campos con lo dicho.
export function DictateButton({ onText, isTech, example, label = 'Dictarlo' }: {
  onText: (text: string) => string | void; // puede devolver un resumen de lo que llenó
  isTech: boolean;
  example: string;
  label?: string;
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [msg, setMsg] = useState('');
  const recRef = useRef<any>(null);
  const textRef = useRef('');

  useEffect(() => () => { try { recRef.current?.abort(); } catch { /* nada */ } }, []);

  const start = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMsg(tr('Este navegador no permite dictar. Escríbelo en los campos.')); return; }
    try { window.speechSynthesis?.cancel(); } catch { /* nada */ }
    const rec = new SR();
    rec.lang = appSpeechLocale();
    rec.continuous = false;
    rec.interimResults = true;
    textRef.current = '';
    setHeard('');
    setMsg('');
    // En iPhone el micrófono no se cierra solo y repite frases: se cierra tras un silencio corto
    // (o a los 15 s), se limpia la frase y se usa UNA sola vez.
    let done = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    let maxTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => { clearTimeout(silenceTimer); clearTimeout(maxTimer); };
    rec.onstart = () => { setListening(true); maxTimer = setTimeout(() => { try { rec.stop(); } catch { /* nada */ } }, MAX_LISTEN_MS); };
    rec.onresult = (e: any) => {
      if (done) return;
      const t = transcriptFromEvent(e);
      textRef.current = t;
      setHeard(t);
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => { try { rec.stop(); } catch { /* nada */ } }, SILENCE_MS);
    };
    rec.onerror = (e: any) => {
      clearTimers();
      setListening(false);
      if (e.error === 'not-allowed') setMsg(tr('Permiso de micrófono denegado.'));
      else if (e.error === 'no-speech') setMsg(tr('No se escuchó nada. Toca y vuelve a hablar.'));
    };
    rec.onend = () => {
      clearTimers();
      setListening(false);
      if (done) return;
      done = true;
      const heardText = textRef.current.trim();
      // En inglés o portugués se pasa a la forma que entienden los formularios (montos, fechas y verbos en español)
      const speechLang = appSpeechLang();
      const t = speechLang === 'en' ? englishToParserText(heardText) : speechLang === 'pt' ? portugueseToParserText(heardText) : heardText;
      if (!t) return;
      const summary = onText(t);
      setMsg(summary || tr('Listo. Revisa los datos antes de guardar.'));
    };
    recRef.current = rec;
    try { rec.start(); } catch { setMsg(tr('No pude encender el micrófono.')); }
  };
  const stop = () => { try { recRef.current?.stop(); } catch { /* nada */ } };

  return (
    <div>
      <button type="button" onClick={listening ? stop : start}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all active:scale-[0.98] ${listening
                ? 'border-red-500/60 bg-red-500/15 text-red-400'
                : isTech ? 'border-accent/40 text-accent' : 'border-glass-border text-text-primary hover:bg-white/5'} ${isTech ? 'rounded-none uppercase text-xs' : 'rounded-xl'}`}>
        {listening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4 text-accent" />}
        {listening ? tr('Escuchando… toca para terminar') : label}
      </button>
      <p className="text-[10px] text-text-muted leading-snug mt-1 normal-case">
        {listening
          ? (heard ? <span className="italic text-text-secondary">"{heard}"</span> : <>Di algo como: {example}</>)
          : msg
            ? <span className="text-text-secondary">{heard && <span className="italic">"{heard}" · </span>}{msg}</span>
            : <>{tr('Ejemplo:')} {example}</>}
      </p>
    </div>
  );
}
