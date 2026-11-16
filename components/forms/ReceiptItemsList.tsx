'use client';
import { useMemo, useState } from 'react';
import { ChevronDown, ReceiptText, Plus, Trash2, Check } from 'lucide-react';
import { ReceiptItem, itemsCheck, formatQty, groupByCategory } from '@/lib/receiptItems';

const money = (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`;
const toNum = (v: string) => Number(String(v).replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
const toPesos = (v: string) => Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0);

type CatOption = { label: string; group?: string };

/**
 * Productos de un recibo, plegables. Si llega `onChange`, cada producto se puede tocar para corregir
 * nombre, cantidad, precio, total y (si llegan `categories`) su categoría; también quitar o agregar.
 */
export function ReceiptItemsList({ items, total, isTech, defaultOpen = false, onChange, categories, fallbackCategory, onUseSum }: {
  items: ReceiptItem[];
  total: number | null | undefined;
  isTech: boolean;
  defaultOpen?: boolean;
  onChange?: (items: ReceiptItem[]) => void;
  categories?: CatOption[];
  fallbackCategory?: string;
  onUseSum?: (sum: number) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState<number | null>(null);
  const groups = useMemo(() => groupByCategory(items || [], fallbackCategory || 'Otros'), [items, fallbackCategory]);
  // Categorías agrupadas para el selector
  const catGroups = useMemo(() => {
    const m = new Map<string, string[]>();
    (categories || []).forEach(c => { const g = c.group || 'Otras'; m.set(g, [...(m.get(g) || []), c.label]); });
    return Array.from(m.entries());
  }, [categories]);
  if (!items?.length && !onChange) return null;
  const { sum, diff, ok } = itemsCheck(items || [], total);
  const editable = !!onChange;

  const update = (k: number, patch: Partial<ReceiptItem>) => {
    if (!onChange) return;
    onChange(items.map((it, i) => {
      if (i !== k) return it;
      const next = { ...it, ...patch };
      // Si cambia la cantidad o el precio, el total del renglón se recalcula
      if (('qty' in patch || 'price' in patch) && !('total' in patch) && next.price) next.total = Math.round(next.qty * next.price);
      return next;
    }));
  };
  const remove = (k: number) => { onChange?.(items.filter((_, i) => i !== k)); setEditing(null); };
  const add = () => {
    onChange?.([...(items || []), { name: 'Producto', qty: 1, total: 0, ...(fallbackCategory ? { category: fallbackCategory } : {}) }]);
    setEditing((items || []).length);
    setOpen(true);
  };

  const field = `w-full px-2 py-1.5 text-xs bg-black/40 border border-white/20 text-text-primary focus:outline-none focus:border-accent ${isTech ? 'rounded-none font-mono' : 'rounded-lg'}`;
  const lbl = 'text-[9px] font-bold text-text-muted uppercase block mb-0.5';

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
          {editable && <p className="text-[10px] text-text-muted mb-1">Toca un producto para corregirlo.</p>}
          <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto overscroll-contain">
            {items.map((it, k) => (
              <li key={k} className="py-1.5">
                {editing === k && editable ? (
                  <div className="space-y-1.5 p-2 -mx-1 bg-accent/5 border border-accent/30 rounded-lg">
                    <div>
                      <label className={lbl}>Producto</label>
                      <input className={field} value={it.name} onChange={e => update(k, { name: e.target.value.slice(0, 50) })} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className={lbl}>Cantidad{it.unit ? ` (${it.unit})` : ''}</label>
                        <input className={field} inputMode="decimal" defaultValue={String(it.qty).replace('.', ',')}
                               onChange={e => { const q = toNum(e.target.value); if (q > 0) update(k, { qty: Math.round(q * 1000) / 1000 }); }} />
                      </div>
                      <div>
                        <label className={lbl}>Precio c/u</label>
                        <input className={field} inputMode="numeric" value={it.price ? it.price.toLocaleString('es-CO') : ''} placeholder="—"
                               onChange={e => update(k, { price: toPesos(e.target.value) || undefined })} />
                      </div>
                      <div>
                        <label className={lbl}>Total</label>
                        <input className={field} inputMode="numeric" value={it.total ? it.total.toLocaleString('es-CO') : ''}
                               onChange={e => update(k, { total: toPesos(e.target.value) })} />
                      </div>
                    </div>
                    {categories && (
                      <div>
                        <label className={lbl}>Categoría</label>
                        <select className={field} value={it.category || fallbackCategory || ''} onChange={e => update(k, { category: e.target.value })}>
                          {catGroups.map(([g, labels]) => (
                            <optgroup key={g} label={g}>
                              {labels.map(l => <option key={l} value={l}>{l}</option>)}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      <button type="button" onClick={() => remove(k)} className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                      <button type="button" onClick={() => setEditing(null)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-accent text-black ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                        <Check className="w-3.5 h-3.5" /> Listo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={!editable} onClick={() => setEditing(k)}
                          className={`w-full flex items-start gap-2 text-left ${editable ? 'active:opacity-70' : 'cursor-default'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-text-primary leading-snug break-words">{it.name}</p>
                      <p className="text-[10px] text-text-muted tabular-nums">
                        {formatQty(it)}{it.price ? ` × ${money(it.price)}` : ''}
                        {groups.length > 1 && it.category ? <span className="text-accent/80"> · {it.category}</span> : null}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-text-primary tabular-nums shrink-0">{money(it.total)}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {editable && (
            <button type="button" onClick={add} className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-accent">
              <Plus className="w-3.5 h-3.5" /> Agregar producto
            </button>
          )}
          <div className="flex justify-between pt-1.5 mt-1 border-t border-white/10 text-xs">
            <span className="text-text-muted">Suma de productos</span>
            <span className="font-bold tabular-nums text-text-primary">{money(sum)}</span>
          </div>
          {!ok && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[11px] text-amber-400 leading-snug">
                No cuadra con el total ({money(Number(total) || 0)}) por {money(Math.abs(diff))}. Puede haber un descuento, una bolsa o un renglón mal leído.
              </p>
              {onUseSum && sum > 0 && (
                <button type="button" onClick={() => onUseSum(sum)}
                        className={`px-2.5 py-1 text-[11px] font-semibold border border-amber-400/50 text-amber-300 ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                  Usar la suma ({money(sum)}) como total
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Resumen de cuánto fue a cada categoría, para una compra con productos de varias categorías. */
export function ItemsByCategory({ items, total, fallbackCategory, isTech, split, onSplit, amounts }: {
  items: ReceiptItem[]; total: number; fallbackCategory: string; isTech: boolean;
  split: boolean; onSplit: (v: boolean) => void; amounts: number[];
}) {
  const groups = groupByCategory(items, fallbackCategory);
  if (groups.length < 2) return null;
  return (
    <div className={`p-2.5 border border-accent/25 bg-accent/5 normal-case space-y-1.5 ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">De esta compra</p>
      <ul className="space-y-0.5">
        {groups.map((g, i) => (
          <li key={g.category} className="flex justify-between text-xs">
            <span className="text-text-primary truncate">{g.category} <span className="text-text-muted">({g.items.length})</span></span>
            <span className="font-semibold tabular-nums text-text-primary">{money(split ? amounts[i] : g.sum)}</span>
          </li>
        ))}
      </ul>
      <label className="flex items-start gap-2 pt-1 cursor-pointer">
        <input type="checkbox" checked={split} onChange={e => onSplit(e.target.checked)} className="mt-0.5 accent-[var(--accent,#10b981)]" />
        <span className="text-[11px] text-text-secondary leading-snug">
          Guardar separado por categoría ({groups.length} gastos que suman {money(total)}). Así tus informes muestran cuánto fue mercado y cuánto lo demás.
        </span>
      </label>
    </div>
  );
}
