// "Compartir con FLOWI": desde la app del banco, la galería o WhatsApp el celular manda la imagen o el
// texto a FLOWI (share_target del manifest). El service worker (worker/index.js) lo guarda en la caché
// "flowi-share" y abre /gastos; aquí se recoge una sola vez.

export const SHARE_CACHE = 'flowi-share';
const MAX_AGE_MS = 30 * 60 * 1000; // lo compartido hace más de 30 min ya no se abre solo

export interface SharedInbox { file?: File; text?: string }

export async function takeSharedInbox(): Promise<SharedInbox | null> {
  if (typeof window === 'undefined' || !('caches' in window)) return null;
  try {
    if (!(await caches.has(SHARE_CACHE))) return null;
    const cache = await caches.open(SHARE_CACHE);
    const meta = await cache.match('/__shared-meta');
    if (!meta) { await caches.delete(SHARE_CACHE); return null; }
    const info = await meta.json() as { at: number; text?: string; name?: string; type?: string; hasFile?: boolean };
    const fileRes = info.hasFile ? await cache.match('/__shared-file') : undefined;
    const blob = fileRes ? await fileRes.blob() : null;
    await caches.delete(SHARE_CACHE); // se toma una sola vez
    if (!info.at || Date.now() - info.at > MAX_AGE_MS) return null;
    const out: SharedInbox = {};
    if (blob && blob.size) out.file = new File([blob], info.name || 'compartido.jpg', { type: info.type || blob.type || 'image/jpeg' });
    const text = (info.text || '').trim();
    if (text) out.text = text;
    return out.file || out.text ? out : null;
  } catch {
    return null;
  }
}

// Monto de un texto del banco: el primer valor con "$" ("$45.300", "$ 1.250.000,00", "COP 45,300.00").
// No se suman otros números del mensaje (últimos dígitos de la tarjeta, referencias, horas).
export function amountFromBankText(text: string): number | null {
  const m = text.match(/(?:\$|COP)\s?-?\s?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
  if (!m) return null;
  let raw = m[1];
  const dec = raw.match(/[.,](\d{1,2})$/);
  if (dec) raw = raw.slice(0, -dec[0].length); // centavos fuera
  const n = Number(raw.replace(/[.,]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Texto corto y limpio para "¿En qué fue?": sin montos ni los dígitos de la tarjeta
export function descriptionFromBankText(text: string): string {
  return text.replace(/(?:\$|COP)\s?-?\s?[\d.,]+/gi, '').replace(/\*+\s?\d{3,4}/g, '')
    // "con tu tarjeta" es el medio de pago, no la categoría
    .replace(/\b(con|desde|de)\s+(tu|su)\s+(tarjeta|cuenta)(\s+(de\s+)?(cr[eé]dito|d[eé]bito|ahorros))?/gi, '')
    .replace(/\btarjeta\s+(de\s+)?(cr[eé]dito|d[eé]bito)\b/gi, '').replace(/\s+/g, ' ').trim().slice(0, 80);
}
