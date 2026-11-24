'use client';
import { currentLocale, tr } from '@/lib/i18n';
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, ReceiptText, Plus, Trash2, Check, Lightbulb } from 'lucide-react';
import { ReceiptItem, itemsCheck, formatQty, groupByCategory, shortCategory } from '@/lib/receiptItems';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CategoryPickerSheet } from '@/components/forms/CategoryPickerSheet';
import type { CategoryOption } from '@/hooks/useCategories';

const money = (n: number) => `$ ${Math.round(n).toLocaleString(currentLocale())}`;
const toNum = (v: string) => Number(String(v).replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
const toPesos = (v: string) => Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0);
const pesosText = (n?: number) => (n ? n.toLocaleString(currentLocale()) : '');

/**
 * Productos de una compra. Con `onChange` se pueden corregir (tocando el producto), cambiar de
 * categoría (tocando el chip, con la misma hoja de categorías de la app), quitar y agregar con la fila rápida.
 * `autoSum`: el monto sigue a la suma (gasto escrito a mano), así que no hay aviso de "no cuadra".
 */
export function ReceiptItemsList({
  items, total, isTech, defaultOpen = false, onChange, categories, recent = [], fallbackCategory, onUseSum, suggest, autoSum = false, onAutoSum, onAddToTotal,
}: {
  items: ReceiptItem[];
  total: number | null | undefined;
  isTech: boolean;
  defaultOpen?: boolean;
  onChange?: (items: ReceiptItem[]) => void;
  categories?: CategoryOption[];
  recent?: string[];
  fallbackCategory?: string;
  onUseSum?: (sum: number) => void;
  suggest?: (name: string) => string | null;
  autoSum?: boolean;
  onAutoSum?: (on: boolean) => void; // interruptor siempre visible: el total sigue (o no) la suma de los productos
  onAddToTotal?: (amount: number) => void; // sumar el producto nuevo al total del gasto (otro recibo de la misma compra)
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState<number | null>(null);
  // Hoja de categorías: para un producto de la lista (índice) o para el que se está agregando (-1)
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  // Fila rápida para agregar
  const [draft, setDraft] = useState({ name: '', qty: '1', price: '' });
  const [draftCat, setDraftCat] = useState<string | null>(null); // elegida a mano para el nuevo
  const nameRef = useRef<HTMLInputElement>(null);
  // La fila para agregar está escondida detrás de un botón (abierta de una vez si la lista está vacía)
  const [adding, setAdding] = useState(!items?.length);
  // ¿El producto nuevo se suma al total? Si la suma ya cuadra, lo nuevo es algo extra (otro recibo): sí.
  // Si no cuadra, lo más probable es que sea un renglón que la IA no leyó y ya está en el total: no.
  const [addToTotal, setAddToTotal] = useState<boolean | null>(null);

  const editable = !!onChange;
  const fallback = fallbackCategory || tr('Otros');
  const groups = useMemo(() => groupByCategory(items || [], fallback), [items, fallback]);
  const catMeta = useMemo(() => new Map((categories || []).map(c => [c.label, c])), [categories]);
  const suggested = draft.name.trim().length >= 3 ? suggest?.(draft.name) || null : null;
  const newCat = draftCat || suggested || fallback;

  if (!items?.length && !editable) return null;
  const { sum, diff, ok } = itemsCheck(items || [], total);
  const fine = autoSum || ok;
  const canAddToTotal = !!onAddToTotal && !autoSum;
  const sumIt = addToTotal ?? (ok || !items?.length);

  const update = (k: number, patch: Partial<ReceiptItem>) => {
    onChange?.(items.map((it, i) => {
      if (i !== k) return it;
      const next = { ...it, ...patch };
      // Si cambia la cantidad o el precio, el total del renglón se recalcula
      if (('qty' in patch || 'price' in patch) && !('total' in patch) && next.price) next.total = Math.round(next.qty * next.price);
      return next;
    }));
  };
  const remove = (k: number) => { onChange?.(items.filter((_, i) => i !== k)); setEditing(null); };
  const addDraft = () => {
    const name = draft.name.trim();
    const qty = toNum(draft.qty) > 0 ? Math.round(toNum(draft.qty) * 1000) / 1000 : 1;
    const price = toPesos(draft.price);
    if (!name || !price) { nameRef.current?.focus(); return; }
    const lineTotal = Math.round(qty * price);
    onChange?.([...(items || []), { name: name.slice(0, 50), qty, price, total: lineTotal, category: newCat }]);
    if (canAddToTotal && sumIt) onAddToTotal?.(lineTotal);
    setDraft({ name: '', qty: '1', price: '' });
    setDraftCat(null);
    // Agregado: se cierra el cuadro (y el teclado) y queda el botón "Agregar otro producto"
    setAdding(false);
    (document.activeElement as HTMLElement | null)?.blur?.();
  };
  const onEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } };

  const chip = (cat: string, onClick?: () => void, title?: string) => {
    const meta = catMeta.get(cat);
    return (
      <button type="button" onClick={onClick} disabled={!onClick} title={title || cat}
              className={`shrink-0 w-[5.25rem] flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold border border-white/15 bg-white/5 text-text-secondary ${onClick ? 'active:scale-95 hover:border-accent/50' : ''} ${isTech ? 'rounded-none' : 'rounded-full'}`}>
        <CategoryIcon icon={meta?.icon || cat} label={cat} className="w-3 h-3 shrink-0 flex items-center justify-center text-[10px]" />
        <span className="truncate">{shortCategory(cat)}</span>
      </button>
    );
  };

  const field = `w-full px-2 py-1.5 text-xs bg-black/40 border border-white/20 text-text-primary placeholder-text-muted focus:outline-none focus:border-accent ${isTech ? 'rounded-none font-mono' : 'rounded-lg'}`;
  const lbl = 'text-[9px] font-bold text-text-muted uppercase block mb-0.5';
  const showChips = !!categories;

  return (
    <div className={`border border-white/10 bg-black/20 normal-case ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
              className="w-full flex items-center gap-2 px-3 py-2 text-left">
        <ReceiptText className="w-4 h-4 text-accent shrink-0" />
        <span className="flex-1 min-w-0 text-xs font-semibold text-text-primary">
          {items.length ? `${items.length} ${items.length === 1 ? 'producto' : 'productos'}` : 'Productos'}
          {items.length > 0 && (
            <span className={`ml-1.5 font-medium ${fine ? 'text-emerald-400' : 'text-amber-400'}`}>
              {autoSum ? `· ${money(sum)}` : ok ? '· la suma cuadra ✓' : '· revisa la suma'}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-2.5">
          {editable && items.length > 0 && (
            <p className="text-[10px] text-text-muted mb-1">
              Toca un producto para corregirlo{showChips ? ', o su categoría para cambiarla' : ''}.
            </p>
          )}
          <ul className="divide-y divide-white/5 max-h-72 overflow-y-auto overflow-x-hidden overscroll-contain">
            {items.map((it, k) => (
              <li key={k} className="py-1.5">
                {editing === k && editable ? (
                  <div className="space-y-1.5 p-2 -mx-1 bg-accent/5 border border-accent/30 rounded-lg">
                    <div>
                      <label className={lbl}>{tr('Producto')}</label>
                      <input autoComplete="off" className={field} value={it.name} onChange={e => update(k, { name: e.target.value.slice(0, 50) })} />
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div>
                        <label className={lbl}>Cantidad{it.unit ? ` (${it.unit})` : ''}</label>
                        <input autoComplete="off" className={field} inputMode="decimal" defaultValue={String(it.qty).replace('.', ',')}
                               onChange={e => { const q = toNum(e.target.value); if (q > 0) update(k, { qty: Math.round(q * 1000) / 1000 }); }} />
                      </div>
                      <div>
                        <label className={lbl}>{tr('Precio c/u')}</label>
                        <input autoComplete="off" className={field} inputMode="numeric" value={pesosText(it.price)} placeholder="—"
                               onChange={e => update(k, { price: toPesos(e.target.value) || undefined })} />
                      </div>
                      <div>
                        <label className={lbl}>{tr('Total')}</label>
                        <input autoComplete="off" className={field} inputMode="numeric" value={pesosText(it.total)}
                               onChange={e => update(k, { total: toPesos(e.target.value) })} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <button type="button" onClick={() => remove(k)} className="flex items-center gap-1 text-[11px] text-rose-400 font-semibold">
                        <Trash2 className="w-3.5 h-3.5" /> Quitar
                      </button>
                      {showChips && chip(it.category || fallback, () => setPickerFor(k), 'Cambiar categoría')}
                      <button type="button" onClick={() => setEditing(null)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-accent text-black ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                        <Check className="w-3.5 h-3.5" /> Listo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    {showChips && <div className="pt-0.5">{chip(it.category || fallback, editable ? () => setPickerFor(k) : undefined)}</div>}
                    <button type="button" disabled={!editable} onClick={() => setEditing(k)}
                            className={`flex-1 min-w-0 flex items-start gap-2 text-left ${editable ? 'active:opacity-70' : 'cursor-default'}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-primary leading-snug break-words">{it.name}</p>
                        <p className="text-[10px] text-text-muted tabular-nums">{formatQty(it)}{it.price ? ` × ${money(it.price)}` : ''}</p>
                      </div>
                      <span className="text-xs font-semibold text-text-primary tabular-nums shrink-0">{money(it.total)}</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Agregar: escondido detrás de un botón; al abrirlo, nombre arriba y cantidad, precio y ＋ abajo */}
          {editable && !adding && (
            <button type="button" onClick={() => { setAdding(true); setTimeout(() => nameRef.current?.focus(), 50); }}
                    className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-accent border border-dashed border-accent/50 hover:bg-accent/10 ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
              <Plus className="w-3.5 h-3.5" /> {items?.length ? 'Agregar otro producto' : 'Agregar producto'}
            </button>
          )}
          {editable && adding && (
            <div className={`mt-1.5 p-2 border border-dashed border-accent/40 space-y-1.5 ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
              <div>
                <label className={lbl}>{tr('Producto')}</label>
                <input autoComplete="off" ref={nameRef} className={field} placeholder={tr('Ej. Arroz Diana')} value={draft.name} enterKeyHint="next"
                       onChange={e => { setDraft(d => ({ ...d, name: e.target.value })); setDraftCat(null); }} onKeyDown={onEnter} />
              </div>
              <div className="flex items-end gap-1.5">
                <div className="w-16 shrink-0">
                  <label className={lbl}>{tr('Cant.')}</label>
                  <input autoComplete="off" className={field} inputMode="decimal" value={draft.qty} onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} onKeyDown={onEnter} />
                </div>
                <div className="flex-1 min-w-0">
                  <label className={lbl}>{tr('Precio c/u')}</label>
                  <input autoComplete="off" className={field} inputMode="numeric" placeholder="$" value={draft.price ? toPesos(draft.price).toLocaleString(currentLocale()) : ''} enterKeyHint="done"
                         onChange={e => setDraft(d => ({ ...d, price: e.target.value }))} onKeyDown={onEnter} />
                </div>
                <button type="button" onClick={addDraft} aria-label={tr('Agregar producto')}
                        className={`shrink-0 h-[30px] px-3 flex items-center gap-1 text-[11px] font-bold bg-accent text-black ${isTech ? 'rounded-none' : 'rounded-lg'}`}>
                  <Plus className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
              {showChips && draft.name.trim().length >= 3 && (
                <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                  <Lightbulb className="w-3 h-3 text-accent shrink-0" />
                  <span>{draftCat ? tr('Categoría:') : suggested ? tr('Categoría sugerida:') : tr('Categoría:')}</span>
                  {chip(newCat, () => setPickerFor(-1), 'Cambiar categoría')}
                  <span className="truncate">{tr('toca para cambiarla')}</span>
                </div>
              )}
              {canAddToTotal && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={sumIt} onChange={e => setAddToTotal(e.target.checked)} className="mt-0.5 accent-[var(--accent,#10b981)]" />
                  <span className="text-[10px] text-text-secondary leading-snug">
                    <b className="text-text-primary">{tr('Sumar al total del gasto')}</b> — márcalo si es de otro recibo de la misma compra.
                    {tr('Déjalo sin marcar si la IA no leyó este producto y ya está en el total.')}
                  </span>
                </label>
              )}
              {items.length > 0 && (
                <button type="button" onClick={() => { setAdding(false); setDraft({ name: '', qty: '1', price: '' }); setDraftCat(null); }}
                        className="text-[10px] text-text-muted underline">
                  {tr('Cerrar')}
                </button>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="pt-1.5 mt-1.5 border-t border-white/10 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-muted">{autoSum ? 'Total (se suma solo)' : 'Suma de productos'}</span>
                <span className="font-bold tabular-nums text-text-primary">{money(sum)}</span>
              </div>
              {onAutoSum && (
                <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
                  <span className="text-[11px] text-text-secondary normal-case">{tr('Usar la suma de los productos como total')}</span>
                  <button type="button" role="switch" aria-checked={autoSum} onClick={() => onAutoSum(!autoSum)}
                          className={`relative w-10 h-6 shrink-0 transition-colors ${isTech ? 'rounded-none' : 'rounded-full'} ${autoSum ? 'bg-accent' : 'bg-white/15'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white shadow transition-transform ${isTech ? 'rounded-none' : 'rounded-full'} ${autoSum ? 'translate-x-4' : ''}`} />
                  </button>
                </label>
              )}
            </div>
          )}
          {!fine && items.length > 0 && (
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

      {pickerFor !== null && categories && (
        <CategoryPickerSheet
          type="gasto"
          categories={categories}
          selected={pickerFor === -1 ? newCat : items[pickerFor]?.category || fallback}
          recent={recent}
          onSelect={(label) => {
            if (pickerFor === -1) setDraftCat(label);
            else update(pickerFor, { category: label });
            setPickerFor(null);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}

/** Resumen de cuánto fue a cada categoría, para una compra con productos de varias categorías. */
export function ItemsByCategory({ items, total, fallbackCategory, isTech, split, onSplit, amounts, categories }: {
  items: ReceiptItem[]; total: number; fallbackCategory: string; isTech: boolean;
  split: boolean; onSplit: (v: boolean) => void; amounts: number[]; categories?: CategoryOption[];
}) {
  const groups = groupByCategory(items, fallbackCategory);
  if (groups.length < 2) return null;
  const meta = new Map((categories || []).map(c => [c.label, c]));
  return (
    <div className={`p-2.5 border border-accent/25 bg-accent/5 normal-case space-y-1.5 ${isTech ? 'rounded-none' : 'rounded-xl'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{tr('De esta compra')}</p>
      <ul className="space-y-1">
        {groups.map((g, i) => (
          <li key={g.category} className="flex items-center gap-2 text-xs">
            <CategoryIcon icon={meta.get(g.category)?.icon || g.category} label={g.category} className="w-4 h-4 shrink-0 flex items-center justify-center text-sm" />
            <span className="flex-1 min-w-0 text-text-primary truncate">{g.category} <span className="text-text-muted">({g.items.length})</span></span>
            <span className="font-semibold tabular-nums text-text-primary">{money(split ? amounts[i] : g.sum)}</span>
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-text-muted leading-snug">Se guarda como un solo gasto (en «{fallbackCategory}»); cada producto conserva su categoría.</p>
    </div>
  );
}
