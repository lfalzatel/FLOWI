'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { tr, currentLocale } from '@/lib/i18n';
import { AmountKeypad } from '@/components/forms/AmountKeypad';
import { displayExpr, evalAmount, hasOperator } from '@/lib/amountExpr';
import { hasCents } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';

/**
 * Campo de monto con el teclado-calculadora de FLOWI (el mismo del formulario de gastos).
 * En el celular, al tocarlo sube el teclado propio con + − × ÷ (sin abrir el teclado del sistema).
 * En el computador es un campo normal para escribir.
 *
 * Cada formulario guarda el monto a su manera, así que:
 *  - onType: lo que ya hacía el campo al escribir (computador)
 *  - onValue: recibe el número calculado y lo guarda en el formato de ese formulario
 *  - toNum: convierte el valor guardado en número (para arrancar la cuenta y mostrarlo)
 */
interface Props {
  id?: string;
  value: string;
  onType: (raw: string) => void;
  onValue: (n: number) => void;
  toNum: (v: string) => number;
  className: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  isTech: boolean;
  label?: string;          // se muestra arriba del teclado para saber qué se está llenando
}

export function CalcAmountInput({ id, value, onType, onValue, toNum, className, placeholder, disabled, required, isTech, label }: Props) {
  const { profile } = useAuth();
  const [isTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');

  if (!isTouch) {
    return (
      <input autoComplete="off" id={id} type="text" inputMode="decimal" required={required} disabled={disabled}
             value={value} onChange={(e) => onType(e.target.value)} className={className} placeholder={placeholder} />
    );
  }

  const num = toNum(value || '') || 0;
  const shown = num ? num.toLocaleString(currentLocale(), { maximumFractionDigits: 2 }) : '';

  const change = (v: string) => {
    setExpr(v);
    const n = !v ? 0 : hasOperator(v) ? evalAmount(v) : Number(v);
    if (n !== null && Number.isFinite(n)) onValue(Math.max(0, Math.round(n * 100) / 100));
  };

  const openKeys = () => {
    if (disabled) return;
    setExpr(num ? String(num) : '');
    setOpen(true);
  };

  return (
    <>
      <button type="button" id={id} disabled={disabled} onClick={openKeys} aria-label={label || tr('Monto')}
              className={`${className} text-left tabular-nums ${open ? '!border-accent' : ''}`}>
        {shown ? `$ ${shown}` : <span className="text-text-muted">{placeholder || '$ 0'}</span>}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[210] flex flex-col justify-end ${isTech ? 'font-mono' : ''}`}>
          <div className="absolute inset-0" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="relative animate-fade-in-up shadow-2xl">
            {/* Lo que se está escribiendo y, si hay una cuenta, su resultado */}
            <div className={`px-4 pt-3 pb-2 border-t ${isTech ? 'bg-deep border-accent/30' : 'bg-card border-glass-border rounded-t-2xl'}`}>
              {label && <p className={`text-[11px] ${isTech ? 'text-accent/70 uppercase' : 'text-text-muted'}`}>{label}</p>}
              <p className="text-2xl font-bold tabular-nums text-text-primary min-h-[2rem]">
                $ {expr ? displayExpr(expr) : '0'}
                {hasOperator(expr) && <span className="ml-2 text-sm font-normal text-text-muted">= {shown || '0'}</span>}
              </p>
            </div>
            <AmountKeypad value={expr} isTech={isTech} decimals={hasCents(profile?.currency)} nextLabel={tr('Listo')}
                          onChange={change} onNext={() => setOpen(false)} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
