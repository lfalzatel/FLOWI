'use client';
import { forwardRef, useImperativeHandle, useState } from 'react';
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
 * Opcional: `prefix` ('' para cantidades), `replace` (lo primero que se escribe reemplaza el valor),
 * `nextLabel`/`onNext` (qué hace el botón grande del teclado) y `ref.open()` para abrirlo desde otro campo.
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
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; // computador: Enter para seguir
  prefix?: string;
  decimals?: boolean;
  replace?: boolean;
  nextLabel?: string;
  onNext?: () => void;
  enterKeyHint?: React.InputHTMLAttributes<HTMLInputElement>['enterKeyHint'];
}

export interface CalcAmountHandle { open: () => void }

export const CalcAmountInput = forwardRef<CalcAmountHandle, Props>(function CalcAmountInput(
  { id, value, onType, onValue, toNum, className, placeholder, disabled, required, isTech, label, onKeyDown,
    prefix = '$ ', decimals, replace = false, nextLabel, onNext, enterKeyHint }, ref,
) {
  const { profile } = useAuth();
  const [isTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState('');
  const [inputEl, setInputEl] = useState<HTMLInputElement | null>(null);

  const num = toNum(value || '') || 0;
  const shown = num ? num.toLocaleString(currentLocale(), { maximumFractionDigits: 2 }) : '';

  const openKeys = () => {
    if (disabled) return;
    // Con `replace` arranca vacío: lo que se escriba reemplaza el valor (no hay que borrar el 1)
    setExpr(replace || !num ? '' : String(num));
    setOpen(true);
  };
  useImperativeHandle(ref, () => ({ open: () => (isTouch ? openKeys() : inputEl?.focus()) }));

  if (!isTouch) {
    return (
      <input autoComplete="off" id={id} type="text" inputMode="decimal" required={required} disabled={disabled} ref={setInputEl}
             enterKeyHint={enterKeyHint} value={value} onChange={(e) => onType(e.target.value)} onKeyDown={onKeyDown}
             onFocus={(e) => { if (replace) e.currentTarget.select(); }} className={className} placeholder={placeholder} />
    );
  }

  const change = (v: string) => {
    setExpr(v);
    const n = !v ? 0 : hasOperator(v) ? evalAmount(v) : Number(v);
    if (n !== null && Number.isFinite(n)) onValue(Math.max(0, Math.round(n * 100) / 100));
  };
  // Con `replace`, cerrar sin escribir nada deja el valor que había
  const close = () => setOpen(false);
  const next = () => { setOpen(false); onNext?.(); };

  // Tocar fuera cierra el teclado Y hace lo que se tocó (antes había que tocar dos veces "Agregar")
  const outside = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX: x, clientY: y } = e;
    const layer = e.currentTarget.parentElement as HTMLElement | null;
    if (layer) layer.style.pointerEvents = 'none';
    const target = document.elementFromPoint(x, y) as HTMLElement | null;
    close();
    if (target && !layer?.contains(target)) target.click();
  };

  return (
    <>
      <button type="button" id={id} disabled={disabled} onClick={openKeys} aria-label={label || tr('Monto')}
              className={`${className} text-left tabular-nums ${open ? '!border-accent' : ''}`}>
        {shown ? `${prefix}${shown}` : <span className="text-text-muted">{placeholder || `${prefix}0`}</span>}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[210] flex flex-col justify-end ${isTech ? 'font-mono' : ''}`}>
          <div className="absolute inset-0" onClick={outside} aria-hidden="true" />
          <div className="relative animate-fade-in-up shadow-2xl">
            {/* Lo que se está escribiendo y, si hay una cuenta, su resultado */}
            <div className={`px-4 pt-3 pb-2 border-t ${isTech ? 'bg-deep border-accent/30' : 'bg-card border-glass-border rounded-t-2xl'}`}>
              {label && <p className={`text-[11px] ${isTech ? 'text-accent/70 uppercase' : 'text-text-muted'}`}>{label}</p>}
              <p className="text-2xl font-bold tabular-nums text-text-primary min-h-[2rem]">
                {prefix}{expr ? displayExpr(expr) : <span className={replace && shown ? 'text-text-muted' : ''}>{replace && shown ? shown : '0'}</span>}
                {hasOperator(expr) && <span className="ml-2 text-sm font-normal text-text-muted">= {shown || '0'}</span>}
              </p>
            </div>
            <AmountKeypad value={expr} isTech={isTech} decimals={decimals ?? hasCents(profile?.currency)} nextLabel={nextLabel || tr('Listo')}
                          onChange={change} onNext={onNext ? next : close} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
});
