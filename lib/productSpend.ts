// "¿Cuánto gasto en…?": busca un producto (huevos, cerveza, gasolina) en los productos de los recibos y,
// en los gastos sin productos, en la descripción. Da cuánto va por mes, cuántas veces y cómo ha cambiado el precio.
import type { Transaction } from './firestore';
import { normalizeText } from './categories';

export interface ProductPurchase {
  txId?: string;
  date: Date;
  name: string;          // nombre del producto o descripción del gasto
  qty?: number;
  unit?: string;
  unitPrice?: number;    // precio por unidad (o por kilo)
  total: number;
  merchant?: string;
  fromItems: boolean;    // true = producto de un recibo; false = descripción del gasto
}

export interface ProductSpend {
  purchases: ProductPurchase[];          // de la más reciente a la más antigua
  total: number;
  months: { month: string; total: number; count: number }[]; // del más antiguo al actual (sin huecos)
  thisMonth: number;
  monthlyAverage: number;                // promedio de los meses ya terminados (o lo que va, si es el primero)
  lastPrice?: { price: number; unit?: string; date: Date };
  firstPrice?: { price: number; unit?: string; date: Date };
  priceChange?: number;                  // fracción: 0,1 = subió 10 %
}

const toDate = (d: Transaction['date']) => (d instanceof Date ? d : (d as any)?.toDate ? (d as any).toDate() : new Date(d as any));
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Raíz sencilla para que "huevos" encuentre "huevo" y "tomates" encuentre "tomate"
const stem = (w: string) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);
const words = (s: string) => normalizeText(s).split(/[^a-z0-9ñ]+/).filter(Boolean).map(stem);

/** ¿El texto tiene todas las palabras buscadas (como inicio de alguna de sus palabras)? */
export function matchesProduct(text: string, query: string) {
  const q = words(query).filter(w => w.length >= 2);
  if (!q.length) return false;
  const t = words(text);
  return q.every(w => t.some(x => x.startsWith(w)));
}

/** ¿El nombre empieza por lo buscado? ("Huevos AA 30" sí; "Cebolla huevo blanca" no) */
export function startsWithQuery(text: string, query: string) {
  const q = words(query).filter(w => w.length >= 2);
  const t = words(text);
  return !!q.length && !!t.length && t[0].startsWith(q[0]);
}

export function productSpend(transactions: Transaction[], query: string, now = new Date()): ProductSpend {
  const purchases: ProductPurchase[] = [];
  const leadOnly = transactions.some(t => t.type === 'gasto' && t.items?.some(it => matchesProduct(it.name, query) && startsWithQuery(it.name, query)));
  for (const t of transactions) {
    if (t.type !== 'gasto') continue;
    const date = toDate(t.date);
    if (date > now) continue;
    if (t.items?.length) {
      for (const it of t.items) {
        if (!matchesProduct(it.name, query)) continue;
        if (leadOnly && !startsWithQuery(it.name, query)) continue;
        purchases.push({
          txId: t.id, date, name: it.name, qty: it.qty, unit: it.unit, total: it.total,
          unitPrice: it.price || (it.qty ? Math.round(it.total / it.qty) : undefined),
          merchant: t.merchant || undefined, fromItems: true,
        });
      }
    } else if (matchesProduct(`${t.description || ''} ${t.merchant || ''}`, query)) {
      purchases.push({ txId: t.id, date, name: (t.description || t.category).trim(), total: t.amount, merchant: t.merchant || undefined, fromItems: false });
    }
  }
  purchases.sort((a, b) => b.date.getTime() - a.date.getTime());
  const total = purchases.reduce((s, p) => s + p.total, 0);

  const months: ProductSpend['months'] = [];
  if (purchases.length) {
    const byMonth = new Map<string, { total: number; count: number }>();
    purchases.forEach(p => { const k = monthKey(p.date); const m = byMonth.get(k) || { total: 0, count: 0 }; m.total += p.total; m.count++; byMonth.set(k, m); });
    const first = purchases[purchases.length - 1].date;
    const cur = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = monthKey(now);
    for (;;) {
      const k = monthKey(cur);
      months.push({ month: k, ...(byMonth.get(k) || { total: 0, count: 0 }) });
      if (k >= end) break;
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  const thisMonth = months.length && months[months.length - 1].month === monthKey(now) ? months[months.length - 1].total : 0;
  const closed = months.slice(0, -1);
  const monthlyAverage = closed.length ? closed.reduce((s, m) => s + m.total, 0) / closed.length : thisMonth;

  // Precio: solo con productos de recibos (con precio por unidad)
  const withPrice = purchases.filter(p => p.fromItems && p.unitPrice);
  // Se compara en la misma unidad (por kilo con por kilo, por unidad con por unidad)
  const priced = withPrice.filter(p => p.unit === withPrice[0]?.unit);
  const lastPrice = priced[0] ? { price: priced[0].unitPrice!, unit: priced[0].unit, date: priced[0].date } : undefined;
  const oldest = priced[priced.length - 1];
  const firstPrice = oldest && priced.length > 1 ? { price: oldest.unitPrice!, unit: oldest.unit, date: oldest.date } : undefined;
  const priceChange = lastPrice && firstPrice && firstPrice.price ? (lastPrice.price - firstPrice.price) / firstPrice.price : undefined;

  return { purchases, total, months, thisMonth, monthlyAverage, lastPrice, firstPrice, priceChange };
}

/** Productos que más se repiten en los recibos (para sugerir búsquedas). */
export function frequentProducts(transactions: Transaction[], limit = 12): string[] {
  const count = new Map<string, { label: string; n: number }>();
  for (const t of transactions) {
    if (t.type !== 'gasto' || !t.items?.length) continue;
    for (const it of t.items) {
      const first = words(it.name).find(w => w.length >= 3 && !/^\d/.test(w));
      if (!first) continue;
      const c = count.get(first) || { label: it.name.split(/\s+/)[0].toLowerCase(), n: 0 };
      c.n++;
      count.set(first, c);
    }
  }
  return Array.from(count.values()).sort((a, b) => b.n - a.n).slice(0, limit).map(c => c.label.charAt(0).toUpperCase() + c.label.slice(1));
}

export interface CatalogProduct {
  query: string;     // lo que se busca al tocarlo (la palabra clave, así encuentra todas sus variantes)
  name: string;      // el nombre completo más usado, sin recortar
  n: number;         // cuántas veces aparece en los recibos
  total: number;     // cuánto se ha gastado en total
  category?: string; // categoría más usada para ese producto
}

const niceName = (s: string) => {
  const t = s.replace(/\s+/g, ' ').trim();
  // Casi todo en mayúsculas (como salen en el recibo: "ATUN MUA 170g") → en minúsculas para que se lea mejor
  const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
  const fixed = letters.length && upper / letters.length > 0.7 ? t.toLowerCase() : t;
  return fixed.charAt(0).toUpperCase() + fixed.slice(1);
};

/** Todos los productos de los recibos, agrupados por su palabra clave, del más comprado al menos comprado. */
export function productCatalog(transactions: Transaction[]): CatalogProduct[] {
  const map = new Map<string, { names: Map<string, number>; cats: Map<string, number>; n: number; total: number; first: string }>();
  for (const t of transactions) {
    if (t.type !== 'gasto' || !t.items?.length) continue;
    for (const it of t.items) {
      const key = words(it.name).find(w => w.length >= 3 && !/^\d/.test(w));
      if (!key) continue;
      const g = map.get(key) || { names: new Map(), cats: new Map(), n: 0, total: 0, first: it.name.split(/\s+/)[0].toLowerCase() };
      const nm = niceName(it.name);
      g.names.set(nm, (g.names.get(nm) || 0) + 1);
      const cat = it.category || t.category;
      if (cat) g.cats.set(cat, (g.cats.get(cat) || 0) + 1);
      g.n++;
      g.total += Number(it.total) || 0;
      map.set(key, g);
    }
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
  return Array.from(map.values())
    .map(g => ({ query: g.first, name: top(g.names) || g.first, n: g.n, total: Math.round(g.total), category: top(g.cats) }))
    .sort((a, b) => b.n - a.n || b.total - a.total);
}
