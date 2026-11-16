'use client';
import { useState } from 'react';
import { ChevronDown, ReceiptText } from 'lucide-react';
import { ReceiptItem, itemsCheck, formatQty } from '@/lib/receiptItems';

const money = (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`;

/** Lista plegable de los productos de un recibo, con aviso si la suma no cuadra con el total. */
export function ReceiptItemsList({ items, total, isTech, defaultOpen = false }: { items: ReceiptItem[]; total: number | null | undefined; isTech: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items?.length) return null;
  const { sum, diff, ok } = itemsCheck(items, total);
  return (
    <div className={`border border-white/10 bg-black/20 normal-case ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <ReceiptText className="w-4 h-4 text-accent shrink-0" />
        <span className="flex-1 min-w-0 text-xs font-semibold text-text-primary">
          {items.length} {items.length === 1 ? 'producto' : 'productos'}
          <span className={`ml-1.5 font-medium ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
            {ok ? '· la suma cuadra ✓' : '· revisa la suma'}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-2.5">
          <ul className="divide-y divide-white/5 max-h-64 overflow-y-auto overscroll-contain">
            {items.map((it, k) => (
              <li key={k} className="flex items-start gap-2 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary leading-snug break-words">{it.name}</p>
                  <p className="text-[10px] text-text-muted tabular-nums">
                    {formatQty(it)}{it.price ? ` × ${money(it.price)}` : ''}
                  </p>
                </div>
                <span className="text-xs font-semibold text-text-primary tabular-nums shrink-0">{money(it.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between pt-1.5 mt-1 border-t border-white/10 text-xs">
            <span className="text-text-muted">Suma de productos</span>
            <span className="font-bold tabular-nums text-text-primary">{money(sum)}</span>
          </div>
          {!ok && (
            <p className="mt-1.5 text-[11px] text-amber-400 leading-snug">
              No cuadra con el total por {money(Math.abs(diff))}. Puede haber un descuento, una bolsa o un renglón mal leído. El gasto se guarda con el total.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
