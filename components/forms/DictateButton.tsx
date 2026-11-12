'use client';
import { useEffect, useRef, useState } from 'react';
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
    if (!SR) { setMsg('Este navegador no permite dictar. Escríbelo en los campos.'); return; }
    try { window.speechSynthesis?.cancel(); } catch { /* nada */ }
    const rec = new SR();
    rec.lang = 'es-CO';
    rec.continuous = false;
    rec.interimResults = true;
    textRef.current = '';
    setHeard('');
    setMsg('');
    rec.onstart = () => setListening(true);
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      textRef.current = t;
      setHeard(t);
    };
    rec.onerror = (e: any) => {
      setListening(false);
      if (e.error === 'not-allowed') setMsg('Permiso de micrófono denegado.');
      else if (e.error === 'no-speech') setMsg('No se escuchó nada. Toca y vuelve a hablar.');
    };
    rec.onend = () => {
      setListening(false);
      const t = textRef.current.trim();
      if (!t) return;
      const summary = onText(t);
      setMsg(summary || 'Listo. Revisa los datos antes de guardar.');
    };
    recRef.current = rec;
    try { rec.start(); } catch { setMsg('No pude encender el micrófono.'); }
  };
  const stop = () => { try { recRef.current?.stop(); } catch { /* nada */ } };

  return (
    <div>
      <button type="button" onClick={listening ? stop : start}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border transition-all active:scale-[0.98] ${listening
                ? 'border-red-500/60 bg-red-500/15 text-red-400'
                : isTech ? 'border-accent/40 text-accent' : 'border-glass-border text-text-primary hover:bg-white/5'} ${isTech ? 'rounded-none uppercase text-xs' : 'rounded-xl'}`}>
        {listening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4 text-accent" />}
        {listening ? 'Escuchando… toca para terminar' : label}
      </button>
      <p className="text-[10px] text-text-muted leading-snug mt-1 normal-case">
        {listening
          ? (heard ? <span className="italic text-text-secondary">"{heard}"</span> : <>Di algo como: {example}</>)
          : msg
            ? <span className="text-text-secondary">{heard && <span className="italic">"{heard}" · </span>}{msg}</span>
            : <>Ejemplo: {example}</>}
      </p>
    </div>
  );
}
