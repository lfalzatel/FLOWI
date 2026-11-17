// Gastos compartidos: la persona registra el gasto y con quién lo compartió (los demás no necesitan FLOWI).
//  - "Yo pagué": el gasto queda con TU parte; las otras personas te deben la suya.
//  - "Pagó otra persona": el gasto queda con tu parte y tú le debes eso a quien pagó.
// En Cuentas y patrimonio el dinero se mueve cuando de verdad sale o entra:
// si pagaste tú, sale el total y entra lo que te van devolviendo; si pagó otro, sale tu parte cuando le pagas.
import { normalizeText } from '@/lib/categories';

export interface SharedPerson {
  name: string;
  amount: number;            // lo que le toca (o lo que le debes, si pagó esa persona)
  settledAt?: string | null; // ISO: cuándo quedó saldado
}

export interface SharedInfo {
  total: number;      // lo que costó todo (si pagó otro, igual a tu parte)
  paidByMe: boolean;
  people: SharedPerson[];
}

type TxLike = {
  id?: string;
  type: string;
  amount: number;
  description?: string;
  category: string;
  date: Date | { toDate(): Date };
  shared?: SharedInfo | null;
};

const toDate = (d: TxLike['date']) => (d instanceof Date ? d : d.toDate());

export const personKey = (name: string) => normalizeText(name.trim());

/** Reparte en partes iguales entre las otras personas y tú, en pesos enteros. Devuelve lo de cada otra persona. */
export function equalShares(total: number, others: number): number[] {
  if (others <= 0 || total <= 0) return Array(Math.max(others, 0)).fill(0);
  const each = Math.floor(total / (others + 1));
  return Array(others).fill(each);
}

/** Tu parte cuando pagaste tú: el total menos lo de los demás. */
export function myPart(info: SharedInfo): number {
  if (!info.paidByMe) return info.people[0]?.amount ?? info.total;
  return info.total - info.people.reduce((s, p) => s + (p.amount || 0), 0);
}

/** Lo que te deben todavía en este gasto (si pagaste tú). */
export function pendingToMe(info: SharedInfo | null | undefined): number {
  if (!info?.paidByMe) return 0;
  return info.people.filter(p => !p.settledAt).reduce((s, p) => s + p.amount, 0);
}

/** Lo que debes todavía en este gasto (si pagó otra persona). */
export function pendingFromMe(info: SharedInfo | null | undefined): number {
  if (!info || info.paidByMe) return 0;
  return info.people.filter(p => !p.settledAt).reduce((s, p) => s + p.amount, 0);
}

/** Movimientos de dinero real de un gasto o ingreso, para Cuentas y patrimonio. */
export function moneyMoves(t: TxLike): { date: Date; amount: number; label: string }[] {
  const label = t.description?.trim() || t.category;
  const date = toDate(t.date);
  const s = t.type === 'gasto' ? t.shared : null;
  if (!s) return [{ date, amount: t.type === 'ingreso' ? t.amount : -t.amount, label }];
  if (s.paidByMe) {
    const moves = [{ date, amount: -s.total, label }];
    for (const p of s.people) {
      if (p.settledAt) moves.push({ date: new Date(p.settledAt), amount: p.amount, label: `${p.name} te pagó · ${label}` });
    }
    return moves;
  }
  const payer = s.people[0];
  return payer?.settledAt ? [{ date: new Date(payer.settledAt), amount: -payer.amount, label: `Le pagaste a ${payer.name} · ${label}` }] : [];
}

export interface SharedEntry<T> {
  tx: T;
  index: number;            // posición de la persona en shared.people
  amount: number;
  toMe: boolean;            // true: esa persona te debe; false: tú le debes
  settled: boolean;
  date: Date;
}

export interface PersonBalance<T> {
  key: string;
  name: string;
  owesMe: number;   // pendiente que te debe
  iOwe: number;     // pendiente que le debes
  net: number;      // > 0 te debe, < 0 le debes
  entries: SharedEntry<T>[]; // del más reciente al más antiguo
}

/** Saldo con cada persona, a partir de los gastos compartidos. Los pendientes primero, de mayor a menor. */
export function sharedBalances<T extends TxLike>(transactions: T[]): PersonBalance<T>[] {
  const map = new Map<string, PersonBalance<T>>();
  for (const t of transactions) {
    const s = t.type === 'gasto' ? t.shared : null;
    if (!s) continue;
    s.people.forEach((p, index) => {
      const key = personKey(p.name);
      if (!key) return;
      const b = map.get(key) || { key, name: p.name.trim(), owesMe: 0, iOwe: 0, net: 0, entries: [] };
      const settled = !!p.settledAt;
      if (!settled) {
        if (s.paidByMe) b.owesMe += p.amount; else b.iOwe += p.amount;
      }
      b.entries.push({ tx: t, index, amount: p.amount, toMe: s.paidByMe, settled, date: toDate(t.date) });
      map.set(key, b);
    });
  }
  const list = Array.from(map.values());
  list.forEach(b => {
    b.net = b.owesMe - b.iOwe;
    b.entries.sort((a, c) => c.date.getTime() - a.date.getTime());
  });
  return list.sort((a, c) => Math.abs(c.net) - Math.abs(a.net) || a.name.localeCompare(c.name));
}

/** Nombres usados antes, del más reciente al más antiguo (para sugerirlos al compartir). */
export function knownPeople(transactions: TxLike[]): string[] {
  const seen = new Map<string, { name: string; at: number }>();
  for (const t of transactions) {
    if (!t.shared) continue;
    const at = toDate(t.date).getTime();
    for (const p of t.shared.people) {
      const k = personKey(p.name);
      if (!k) continue;
      const prev = seen.get(k);
      if (!prev || prev.at < at) seen.set(k, { name: p.name.trim(), at });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.at - a.at).map(x => x.name);
}

/** Copia de shared con las personas indicadas saldadas (o pendientes otra vez). */
export function withSettled(info: SharedInfo, indexes: number[], settled: boolean, when = new Date()): SharedInfo {
  return {
    ...info,
    people: info.people.map((p, i) => (indexes.includes(i) ? { ...p, settledAt: settled ? when.toISOString() : null } : p)),
  };
}

// ── Enlace para que la otra persona lo anote en su FLOWI ──────────────────────────────

export interface ShareLinkItem { d: string; a: number; c: string; f: string } // descripción, monto, categoría, fecha YYYY-MM-DD
export interface ShareLinkData { p?: string; i: ShareLinkItem[] }             // p: nombre de quien cobra

const APP_URL = 'https://flowi-gastos.web.app';

function toBase64Url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0)));
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function shareLink(data: ShareLinkData, base = APP_URL): string {
  const compact: ShareLinkData = {
    ...(data.p ? { p: data.p.slice(0, 40) } : {}),
    i: data.i.slice(0, 10).map(x => ({ d: x.d.slice(0, 60), a: Math.round(x.a), c: x.c.slice(0, 40), f: x.f })),
  };
  return `${base}/compartido?g=${toBase64Url(JSON.stringify(compact))}`;
}

/** Lee el enlace; devuelve null si está dañado o trae datos raros. */
export function readShareLink(g: string | null): ShareLinkData | null {
  if (!g || g.length > 4000) return null;
  try {
    const raw = JSON.parse(fromBase64Url(g));
    if (!raw || !Array.isArray(raw.i)) return null;
    const items: ShareLinkItem[] = raw.i.slice(0, 10).flatMap((x: any) => {
      const a = Number(x?.a);
      const f = typeof x?.f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.f) ? x.f : '';
      if (!Number.isFinite(a) || a <= 0 || a > 1e10 || !f) return [];
      return [{ d: String(x.d ?? '').slice(0, 60), a: Math.round(a), c: String(x.c ?? '').slice(0, 40), f }];
    });
    if (!items.length) return null;
    return { ...(typeof raw.p === 'string' && raw.p.trim() ? { p: raw.p.trim().slice(0, 40) } : {}), i: items };
  } catch {
    return null;
  }
}

/** Mensaje de WhatsApp para cobrarle a una persona lo pendiente (con enlace para anotarlo e invitación a FLOWI). */
export function chargeMessage<T extends TxLike>(
  person: PersonBalance<T>,
  fmt: (n: number) => string,
  myName?: string,
): string {
  const pending = person.entries.filter(e => e.toMe && !e.settled);
  const first = person.name.split(/\s+/)[0];
  const lines = pending.slice(0, 10).map(e => {
    const what = e.tx.description?.trim() || e.tx.category;
    const when = e.date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
    return `• ${what} (${when}): ${fmt(e.amount)}`;
  });
  const total = pending.reduce((s, e) => s + e.amount, 0);
  // Si tú también le debes algo, se descuenta y se cobra solo la diferencia
  const mine = person.entries.filter(e => !e.toMe && !e.settled);
  const minus = mine.reduce((s, e) => s + e.amount, 0);
  const offset = minus > 0 ? [
    `Menos lo que yo te debo:`,
    ...mine.slice(0, 10).map(e => `• ${e.tx.description?.trim() || e.tx.category}: ${fmt(e.amount)}`),
    `Total a pagarme: ${fmt(total - minus)}`,
  ] : [];
  const link = shareLink({
    p: myName?.split(/\s+/)[0],
    i: pending.map(e => ({ d: e.tx.description?.trim() || e.tx.category, a: e.amount, c: e.tx.category, f: dayKey(e.date) })),
  });
  return [
    `Hola ${first} 👋`,
    pending.length === 1 ? 'Te comparto lo que te tocó:' : 'Te comparto lo que quedó pendiente:',
    ...lines,
    ...(pending.length > 1 || minus > 0 ? [`Total: ${fmt(total)}`] : []),
    ...offset,
    '',
    `Si usas FLOWI, anótalo con un toque: ${link}`,
    '',
    `¿Aún no la tienes? FLOWI te ayuda a llevar el control de tus gastos, gratis: ${APP_URL}`,
  ].join('\n');
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
