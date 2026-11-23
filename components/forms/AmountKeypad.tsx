'use client';
import { tr } from '@/lib/i18n';
import { Delete } from 'lucide-react';
import { cleanExpr, evalAmount, hasOperator } from '@/lib/amountExpr';

// Teclado del monto (como el de las apps de gastos): números, 000 y operaciones, sin abrir el teclado del celular.
// "Siguiente" resuelve la cuenta si la hay y pasa al siguiente paso.
interface Props {
  value: string;
  isTech: boolean;
  onChange: (v: string) => void;
  onNext: () => void;
  nextLabel?: string;
  decimals?: boolean; // la moneda usa centavos: muestra la tecla decimal
}

const KEYS = (decimals: boolean) => [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '-'],
  [decimals ? '.' : '00', '0', '000', '+'],
];

export function AmountKeypad({ value, isTech, onChange, onNext, nextLabel = 'Siguiente', decimals = false }: Props) {
  const press = (k: string) => {
    if ((k === '000' || k === '00') && (!value || /[+\-×÷]$/.test(value))) return; // no empezar un número con ceros
    onChange(cleanExpr(value + k));
  };
  const solve = () => {
    const r = evalAmount(value);
    if (r !== null) onChange(String(r));
  };
  const next = () => {
    if (hasOperator(value)) solve();
    onNext();
  };

  const base = `h-12 flex items-center justify-center text-lg font-semibold select-none active:scale-95 transition-transform ${isTech ? 'rounded-none font-mono' : 'rounded-xl'}`;
  const num = `${base} ${isTech ? 'bg-accent/5 border border-accent/20 text-text-primary' : 'bg-glass border border-glass-border text-text-primary'}`;
  const op = `${base} ${isTech ? 'bg-accent/15 border border-accent/40 text-accent' : 'bg-accent/10 border border-accent/30 text-accent'}`;

  return (
    <div className={`shrink-0 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t ${isTech ? 'bg-deep border-accent/20' : 'bg-card border-glass-border'}`}
         role="group" aria-label={tr('Teclado del monto')}>
      <div className="grid grid-cols-4 gap-1.5">
        {KEYS(decimals).flat().map(k => (
          <button key={k} type="button" onClick={() => press(k)} className={/[+\-×÷]/.test(k) ? op : num}
                  aria-label={k === '-' ? 'menos' : k === '+' ? 'más' : k === '×' ? 'por' : k === '÷' ? 'dividido' : k === '.' ? 'coma decimal' : k}>
            {k === '-' ? '−' : k === '.' ? ',' : k}
          </button>
        ))}
        <button type="button" onClick={() => onChange('')} className={`${num} text-sm`} aria-label={tr('Borrar todo')}>C</button>
        <button type="button" onClick={() => onChange(value.slice(0, -1))} className={num} aria-label={tr('Borrar')}>
          <Delete className="w-5 h-5" />
        </button>
        <button type="button" onClick={solve} className={op} aria-label={tr('Igual')}>=</button>
        <button type="button" onClick={next}
                className={`${base} text-sm font-bold ${isTech ? 'bg-accent text-deep uppercase' : 'bg-accent text-white'}`}>
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
