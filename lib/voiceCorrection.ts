// Corregir por voz una transacción que ya está en pantalla (leída de un recibo o dictada):
// "eran 25 mil", "ponlo en Nequi", "fue ayer", "la categoría es hogar", "es un ingreso".
// Se resuelve aquí, sin IA (gratis e inmediato). Si no se entiende, quien llama puede preguntarle a la IA.
import { normalizeText } from './categories';
import { categorizeText, extractAllAmounts, type ParsedVoiceResult } from './voiceParser';

type Cat = { label: string; type?: 'gasto' | 'ingreso'; isCustom?: boolean };

export interface CorrectionResult {
  item: ParsedVoiceResult;
  changed: string[]; // campos que cambiaron: amount, paymentMethod, date, category, type, description
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ymd = (d: Date) => d.toLocaleDateString('en-CA');

function detectDate(n: string, now = new Date()): string | null {
  const shift = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return ymd(d); };
  if (/\b(antier|anteayer|antes de ayer)\b/.test(n)) return shift(2);
  if (/\bayer\b/.test(n)) return shift(1);
  if (/\bhoy\b/.test(n)) return ymd(now);
  // "el 10", "el 10 de noviembre", "10 de noviembre"
  const m = n.match(/\b(?:el|del|dia)\s+(\d{1,2})(?:\s+de\s+([a-z]+))?\b/) || n.match(/\b(\d{1,2})\s+de\s+([a-z]+)\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthIdx = m[2] ? MONTHS.indexOf(m[2]) : now.getMonth();
    if (day >= 1 && day <= 31 && monthIdx >= 0) {
      let d = new Date(now.getFullYear(), monthIdx, day, 12);
      if (d.getTime() > now.getTime() + 86400000) d = new Date(now.getFullYear() - 1, monthIdx, day, 12); // no fechas futuras
      return ymd(d);
    }
  }
  return null;
}

export function applyVoiceCorrection(
  current: ParsedVoiceResult, text: string, categories: Cat[], payOptions: string[], now = new Date(),
): CorrectionResult {
  const n = normalizeText(text).replace(/[^a-z0-9 .,]/g, ' ').replace(/\s+/g, ' ').trim();
  const item: ParsedVoiceResult = { ...current };
  const changed: string[] = [];
  const set = (key: keyof ParsedVoiceResult, val: any) => {
    if ((item as any)[key] !== val) { (item as any)[key] = val; changed.push(key as string); }
  };

  // Con qué se pagó (se revisa primero: "ponlo en Nequi" no es una categoría)
  const pay = [...payOptions].sort((a, b) => b.length - a.length)
    .find(p => new RegExp(`\\b${normalizeText(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(n));
  if (pay) set('paymentMethod', pay);

  // Tipo
  if (/\b(es|era|fue)\s+(un\s+)?ingreso\b|\bme\s+(pagaron|llego|consignaron)\b/.test(n)) set('type', 'ingreso');
  else if (/\b(es|era|fue)\s+(un\s+)?gasto\b/.test(n)) set('type', 'gasto');

  // Fecha
  const date = detectDate(n, now);
  if (date) { set('date', date); if (item.time && changed.includes('date')) item.time = undefined; }

  // Descripción: "la descripción es…", "ponle de nombre…", "se llama…"
  const desc = text.match(/(?:descripci[oó]n|concepto|nombre|ll[aá]malo|se llama|ponle)\s*(?:es|de|a)?\s*[:,-]?\s*(.+)$/i);
  if (desc && desc[1].trim().length > 1) {
    const d = desc[1].trim().replace(/[.]$/, '');
    set('description', d.charAt(0).toUpperCase() + d.slice(1));
  }

  // Monto: si dice un número (y no es solo el día de la fecha)
  if (!desc) {
    const withoutDate = n.replace(/\b(?:el|del|dia)\s+\d{1,2}(?:\s+de\s+[a-z]+)?\b/g, ' ').replace(/\b\d{1,2}\s+de\s+[a-z]+\b/g, ' ');
    const amounts = extractAllAmounts(withoutDate).filter(a => a >= 50);
    if (amounts.length) set('amount', amounts[amounts.length - 1]);
  }

  // Categoría: "categoría X", "es de X", "ponlo en X" o simplemente el nombre de una categoría
  if (!desc) {
    const type = item.type === 'ingreso' ? 'ingreso' : 'gasto';
    const usable = categories.filter(c => !c.type || c.type === type);
    const exact = usable.sort((a, b) => b.label.length - a.label.length)
      .find(c => c.label.length >= 4 && n.includes(normalizeText(c.label)));
    if (exact) set('category', exact.label);
    else if (/\bcategoria\b|\bes de\b|\bpara\b/.test(n)) {
      const { category } = categorizeText(n, type, usable as any);
      if (category && category !== 'Otros' && category !== 'Otros ingresos') set('category', category);
    }
  }

  return { item, changed };
}
