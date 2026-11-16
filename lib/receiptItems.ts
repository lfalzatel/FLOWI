// Productos de un recibo: lo que la IA lee renglón por renglón (nombre, cantidad, precio unitario
// y total del renglón). Se guardan dentro del mismo gasto, así no cuesta más espacio ni lecturas.

export interface ReceiptItem {
  name: string;
  qty: number;      // unidades o kilos (0,845 kg)
  unit?: string;    // "kg", "und"… (opcional)
  price?: number;   // precio unitario
  total: number;    // lo que costó ese renglón
  category?: string; // categoría de gasto del producto (Mercado, Licores y Bares…)
}

const MAX_ITEMS = 60;

/** Limpia lo que devuelve la IA: descarta renglones sin valor y corrige números mal formados. */
export function sanitizeReceiptItems(raw: unknown): ReceiptItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ReceiptItem[] = [];
  for (const it of raw.slice(0, MAX_ITEMS)) {
    if (!it || typeof it !== 'object') continue;
    const o = it as Record<string, unknown>;
    const name = String(o.name ?? o.nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, 50);
    if (!name || name.toLowerCase() === 'null') continue;
    let qty = Number(o.qty ?? o.cantidad);
    if (!Number.isFinite(qty) || qty <= 0) qty = 1;
    qty = Math.round(qty * 1000) / 1000;
    const priceN = Number(o.price ?? o.precio);
    const price = Number.isFinite(priceN) && priceN > 0 ? Math.round(priceN) : undefined;
    let total = Number(o.total);
    if (!Number.isFinite(total) || total <= 0) total = price ? price * qty : NaN;
    if (!Number.isFinite(total) || total <= 0) continue;
    const category = typeof o.category === 'string' && o.category.trim() && o.category !== 'null' ? o.category.trim().slice(0, 40) : undefined;
    const unitRaw = typeof o.unit === 'string' ? o.unit.trim().toLowerCase() : '';
    const unit = /^(kg|kilo|kilos|kgs)$/.test(unitRaw) ? 'kg'
      : /^(g|gr|lb|lt|l|ml|m)$/.test(unitRaw) ? unitRaw
      : undefined;
    // El mismo producto repetido en varios renglones (6 latas de atún) se junta en uno: 6 × $ 4.275
    const same = out.find(p => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit && p.price === price && p.category === category);
    if (same && !unit) { same.qty = Math.round((same.qty + qty) * 1000) / 1000; same.total += Math.round(total); continue; }
    out.push({ name, qty, ...(unit ? { unit } : {}), ...(price ? { price } : {}), total: Math.round(total), ...(category ? { category } : {}) });
  }
  return out;
}

export function itemsSum(items: ReceiptItem[]) {
  return items.reduce((s, i) => s + i.total, 0);
}

/** ¿La suma de los productos cuadra con el total? Se tolera una diferencia pequeña por redondeos. */
export function itemsCheck(items: ReceiptItem[], total: number | null | undefined) {
  const sum = itemsSum(items);
  const diff = (Number(total) || 0) - sum;
  const ok = Math.abs(diff) <= Math.max(50, Math.abs(Number(total) || 0) * 0.01);
  return { sum, diff, ok };
}

export function formatQty(i: ReceiptItem) {
  const q = i.qty.toLocaleString('es-CO', { maximumFractionDigits: 3 });
  return i.unit ? `${q} ${i.unit}` : q;
}

export type ItemGroup = { category: string; sum: number; items: ReceiptItem[] };

/** Productos agrupados por categoría (los que no tienen, van a la categoría del gasto), de mayor a menor. */
export function groupByCategory(items: ReceiptItem[], fallback: string): ItemGroup[] {
  const map = new Map<string, ItemGroup>();
  for (const it of items) {
    const cat = it.category || fallback;
    const g = map.get(cat) || { category: cat, sum: 0, items: [] };
    g.sum += it.total;
    g.items.push(it);
    map.set(cat, g);
  }
  return Array.from(map.values()).sort((a, b) => b.sum - a.sum);
}

/**
 * Reparte el total pagado entre los grupos en proporción a lo que suma cada uno, para que las partes
 * sumen exactamente el total (descuentos o bolsas quedan repartidos). Lo que sobra del redondeo va al mayor.
 */
export function splitTotal(groups: ItemGroup[], total: number): number[] {
  const sum = groups.reduce((s, g) => s + g.sum, 0);
  if (!sum) return groups.map(() => 0);
  const parts = groups.map(g => Math.round(total * g.sum / sum));
  parts[0] += Math.round(total) - parts.reduce((s, p) => s + p, 0);
  return parts;
}
