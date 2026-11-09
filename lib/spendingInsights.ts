// Suscripciones y gastos hormiga: lo pequeño que se repite y, sumado, se lleva una buena parte del mes.
import type { Transaction } from '@/lib/firestore';
import { normalizeText } from '@/lib/categories';

type Resolver = (raw: string, type?: 'gasto' | 'ingreso') => { label: string; group: string };

const DAY = 86400000;
const toDate = (d: any): Date => (d instanceof Date ? d : d?.toDate ? d.toDate() : new Date(d));

// ── Suscripciones ──────────────────────────────────────────────────────
export type Subscription = {
  key: string;
  name: string;          // Netflix, Spotify, Claude…
  category: string;      // para el ícono
  lastAmount: number;
  lastDate: Date;
  nextDate: Date | null; // cuándo se espera el próximo cobro (si es mensual)
  months: number;        // en cuántos meses distintos se cobró
  monthly: boolean;      // se cobró en 2 o más meses
  active: boolean;       // hubo cobro en los últimos 40 días
};

// Etiquetas genéricas: ahí el nombre real está en el comercio o la descripción
const GENERIC = new Set(['suscripciones', 'apps e ia', 'musica', 'nube / almacenamiento', 'videojuegos', 'otros']);

function subscriptionName(t: Transaction, label: string) {
  if (t.merchant) return t.merchant;
  if (!GENERIC.has(normalizeText(label))) return label;
  const d = (t.description || '').trim();
  return d ? d.charAt(0).toUpperCase() + d.slice(1) : label;
}

export function detectSubscriptions(transactions: Transaction[], resolve: Resolver, now = new Date()): Subscription[] {
  const since = now.getTime() - 400 * DAY;
  const groups = new Map<string, { name: string; category: string; items: { date: Date; amount: number }[] }>();
  for (const t of transactions) {
    if (t.type !== 'gasto') continue;
    const date = toDate(t.date);
    if (date.getTime() < since || date > now) continue;
    const r = resolve(t.category);
    const merchantGroup = t.merchant ? resolve(t.merchant).group : '';
    if (r.group !== 'Suscripciones' && merchantGroup !== 'Suscripciones') continue;
    const name = subscriptionName(t, r.label);
    const key = normalizeText(name);
    const g = groups.get(key) || { name, category: t.merchant || t.category, items: [] };
    g.items.push({ date, amount: t.amount });
    groups.set(key, g);
  }

  const out: Subscription[] = [];
  groups.forEach((g, key) => {
    g.items.sort((a, b) => a.date.getTime() - b.date.getTime());
    const last = g.items[g.items.length - 1];
    const months = new Set(g.items.map(i => `${i.date.getFullYear()}-${i.date.getMonth()}`)).size;
    const monthly = months >= 2;
    const active = now.getTime() - last.date.getTime() <= 40 * DAY;
    let nextDate: Date | null = null;
    if (monthly) {
      nextDate = new Date(last.date);
      nextDate.setMonth(nextDate.getMonth() + 1);
    }
    out.push({ key, name: g.name, category: g.category, lastAmount: last.amount, lastDate: last.date, nextDate, months, monthly, active });
  });
  // Primero las activas y más caras
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.lastAmount - a.lastAmount);
}

/** Lo que cuestan al mes las suscripciones activas que se cobran cada mes. */
export function subscriptionsMonthly(subs: Subscription[]) {
  return subs.filter(s => s.active && s.monthly).reduce((s, x) => s + x.lastAmount, 0);
}

// ── Gastos hormiga ─────────────────────────────────────────────────────
export type AntGroup = {
  key: string;
  label: string;         // subcategoría (Café y Antojos, Licores y Bares…)
  count: number;         // veces en el periodo
  total: number;         // total en el periodo
  average: number;       // valor promedio de cada compra
  monthly: number;       // promedio al mes
  yearly: number;        // lo que sería en un año a este ritmo
  examples: string[];    // descripciones frecuentes
};

export const ANT_MAX_AMOUNT = 25000;  // compra pequeña (pesos)
const ANT_WINDOW_DAYS = 90;
const ANT_MIN_COUNT = 3;
// Grupos de "estilo de vida" donde están los antojos y salidas
const ANT_GROUPS = new Set(['Comer fuera', 'Ocio y viajes', 'Compras', 'Personalizadas']);
// Subcategorías de otros grupos que también suelen ser gasto hormiga
const ANT_LABELS = new Set(['parqueadero', 'tienda / minimercado', 'domicilios', 'cafe y antojos', 'licores y bares', 'cigarrillos', 'lavadero', 'apuestas / loterias']);

export function detectAntExpenses(transactions: Transaction[], resolve: Resolver, now = new Date()) {
  const since = now.getTime() - ANT_WINDOW_DAYS * DAY;
  // Si la persona lleva menos de 90 días registrando, se promedia sobre lo que lleva
  let first = now.getTime();
  const groups = new Map<string, { label: string; items: { amount: number; desc: string }[] }>();
  for (const t of transactions) {
    if (t.type !== 'gasto' || t.business) continue;
    const date = toDate(t.date);
    first = Math.min(first, date.getTime());
    if (date.getTime() < since || date > now || t.amount <= 0 || t.amount > ANT_MAX_AMOUNT) continue;
    const r = resolve(t.category);
    const key = normalizeText(r.label);
    if (!ANT_GROUPS.has(r.group) && !ANT_LABELS.has(key)) continue;
    const g = groups.get(key) || { label: r.label, items: [] };
    g.items.push({ amount: t.amount, desc: (t.description || '').trim() });
    groups.set(key, g);
  }
  const days = Math.max(30, Math.min(ANT_WINDOW_DAYS, (now.getTime() - first) / DAY));
  const months = days / 30;

  const list: AntGroup[] = [];
  groups.forEach((g, key) => {
    if (g.items.length < ANT_MIN_COUNT) return;
    const total = g.items.reduce((s, i) => s + i.amount, 0);
    const monthly = total / months;
    const freq = new Map<string, number>();
    g.items.forEach(i => { if (i.desc) freq.set(i.desc.toLowerCase(), (freq.get(i.desc.toLowerCase()) || 0) + 1); });
    const examples = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
    list.push({ key, label: g.label, count: g.items.length, total, average: total / g.items.length, monthly, yearly: monthly * 12, examples });
  });
  list.sort((a, b) => b.monthly - a.monthly);
  const monthly = list.reduce((s, g) => s + g.monthly, 0);
  return { groups: list, monthly, yearly: monthly * 12, days: Math.round(days) };
}
