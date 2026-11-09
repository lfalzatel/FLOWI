'use client';
import { useEffect, useRef, useState } from 'react';
import { Delete, Fingerprint } from 'lucide-react';

export const PIN_LENGTH = 4;

// Teclado numérico de 4 dígitos. Acepta también el teclado del computador.
export function PinPad({ onComplete, error, disabled = false, onBiometric }: {
  onComplete: (pin: string) => void | Promise<void>;
  error?: string | null;
  disabled?: boolean;
  onBiometric?: () => void;
}) {
  const [pin, setPinState] = useState('');
  // Se lleva también en una ref: al teclear rápido varias teclas llegan antes de que React vuelva a pintar
  const pinRef = useRef('');
  const setPin = (v: string | ((p: string) => string)) => {
    pinRef.current = typeof v === 'function' ? v(pinRef.current) : v;
    setPinState(pinRef.current);
  };
  const [shake, setShake] = useState(false);

  // Cuando llega un error se borra lo escrito y se sacude
  useEffect(() => {
    if (!error) return;
    setPin('');
    setShake(true);
    const t = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(t);
  }, [error]);

  const press = (d: string) => {
    if (disabled || pinRef.current.length >= PIN_LENGTH) return;
    const next = pinRef.current + d;
    setPin(next);
    if (next.length === PIN_LENGTH) setTimeout(() => { setPin(''); onComplete(next); }, 120);
  };
  const back = () => !disabled && setPin(p => p.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const key = 'h-16 rounded-full text-2xl font-semibold text-text-primary bg-glass border border-glass-border hover:bg-glass-strong active:scale-95 active:bg-accent/20 transition-all flex items-center justify-center disabled:opacity-40';

  return (
    <div className="w-full max-w-[280px] mx-auto space-y-6">
      <div className="flex justify-center gap-4" style={shake ? { animation: 'flowi-shake 0.4s' } : undefined}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-accent border-accent' : error ? 'border-red-400' : 'border-text-muted'}`} />
        ))}
      </div>
      <p className={`text-center text-sm min-h-[20px] ${error ? 'text-red-400' : 'text-transparent'}`}>{error || '.'}</p>
      <div className="grid grid-cols-3 gap-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className={key}>{d}</button>
        ))}
        {onBiometric ? (
          <button type="button" onClick={onBiometric} aria-label="Usar huella o rostro" className={`${key} text-accent`}>
            <Fingerprint className="w-7 h-7" />
          </button>
        ) : <span />}
        <button type="button" disabled={disabled} onClick={() => press('0')} className={key}>0</button>
        <button type="button" onClick={back} aria-label="Borrar" className={`${key} !bg-transparent !border-transparent`}>
          <Delete className="w-6 h-6" />
        </button>
      </div>
      <style>{`@keyframes flowi-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}
