// IA opcional para el asistente de voz usando la cuenta GRATUITA de OpenRouter de cada usuario.
// El usuario conecta su cuenta con un botón (OAuth PKCE); la clave que entrega OpenRouter se guarda
// solo en este dispositivo y nunca pasa por nuestro servidor. Solo se usan modelos gratuitos.
import { BASE_CATEGORY_DEFS, normalizeText } from './categories';
import { isFixedExpenseCategory } from './firestore';
import type { ParsedVoiceItem, ParsedVoiceResult } from './voiceParser';

const KEY_STORAGE = 'flowi_openrouter_key';
const VERIFIER_STORAGE = 'flowi_openrouter_verifier';
const MODELS_CACHE = 'flowi_openrouter_free_models';
const VISION_MODELS_CACHE = 'flowi_openrouter_free_vision_models';
const RECEIPT_TIMEOUT_MS = 40_000;
const MODELS_CACHE_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

export const AI_CALLBACK_PATH = '/configuracion';

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch {}
}
function storageRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export function getAiKey(): string | null {
  return storageGet(KEY_STORAGE);
}

export function disconnectAi() {
  storageRemove(KEY_STORAGE);
  storageRemove(MODELS_CACHE);
  storageRemove(VISION_MODELS_CACHE);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Paso 1: enviar al usuario a OpenRouter para que autorice (crea su cuenta gratis si no tiene)
export async function startOpenRouterConnect() {
  const verifier = base64Url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  storageSet(VERIFIER_STORAGE, verifier);
  const callback = `${window.location.origin}${AI_CALLBACK_PATH}`;
  window.location.href = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callback)}&code_challenge=${base64Url(digest)}&code_challenge_method=S256`;
}

// Paso 2: al volver con ?code=..., cambiar el código por la clave del usuario
export async function completeOpenRouterConnect(code: string): Promise<boolean> {
  const verifier = storageGet(VERIFIER_STORAGE);
  if (!verifier) return false;
  const res = await fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  storageRemove(VERIFIER_STORAGE);
  if (!res.ok) return false;
  const data = await res.json();
  if (!data?.key) return false;
  storageSet(KEY_STORAGE, data.key);
  return true;
}

// Los modelos gratuitos cambian con el tiempo: se consultan y se eligen los mejores disponibles
const PREFERRED_MODELS = ['llama-3.3-70b', 'gemini', 'deepseek', 'qwen', 'mistral-small', 'llama'];

async function getFreeModels(key: string): Promise<string[]> {
  const cached = storageGet(MODELS_CACHE);
  if (cached) {
    try {
      const { at, models } = JSON.parse(cached);
      if (Date.now() - at < MODELS_CACHE_MS && models?.length) return models;
    } catch {}
  }
  const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return [];
  const { data } = await res.json();
  const free: string[] = (data || [])
    .filter((m: any) => String(m.id).endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0'))
    .map((m: any) => String(m.id));
  const rank = (id: string) => {
    const i = PREFERRED_MODELS.findIndex(p => id.includes(p));
    return i === -1 ? PREFERRED_MODELS.length : i;
  };
  const models = free.sort((a, b) => rank(a) - rank(b)).slice(0, 3);
  storageSet(MODELS_CACHE, JSON.stringify({ at: Date.now(), models }));
  return models;
}

// Solo se consulta la IA cuando el analizador local no quedó seguro
export function needsAiHelp(results: ParsedVoiceItem[]): boolean {
  const txs = results.filter(r => !('kind' in r) || r.kind === 'transaction') as ParsedVoiceResult[];
  if (!txs.length) return false;
  return txs.some(t => t.amount === null || (t.type !== 'deuda' && (t.category === 'Otros' || t.category === 'Otros ingresos')));
}

const EXPENSE_LABELS = BASE_CATEGORY_DEFS.filter(c => c.type === 'gasto').map(c => c.label);
const INCOME_LABELS = BASE_CATEGORY_DEFS.filter(c => c.type === 'ingreso').map(c => c.label);

function buildPrompt(customLabels: string[]) {
  return `Eres un asistente que convierte frases dictadas en español de Colombia en movimientos de dinero.
Responde SOLO con un JSON: {"movimientos":[{"type":"gasto"|"ingreso"|"deuda","amount":numero_en_pesos,"category":"...","description":"texto corto","merchant":"comercio o null","debtDirection":"debo"|"me_deben"|null,"debtPerson":"nombre o null"}]}
Reglas:
- Cada monto con su concepto es un movimiento distinto. Solo suma si la persona dice "en total".
- "mil" = 1000, "millón" = 1000000, "1,5 millones" = 1500000. Cantidad × precio unitario cuando dice "a X cada uno".
- "me pagaron", "recibí", "sueldo", "vendí" = ingreso. "gasté", "pagué", "compré" = gasto.
- "le debo", "me prestaron" = deuda con debtDirection "debo". "me debe", "le presté" = deuda con debtDirection "me_deben".
- category de gasto debe ser exactamente una de: ${[...EXPENSE_LABELS, ...customLabels].join(', ')}.
- category de ingreso debe ser exactamente una de: ${INCOME_LABELS.join(', ')}.
- Para deudas usa category "Otros".`;
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function matchCategory(label: string, type: 'gasto' | 'ingreso', customLabels: string[]): string {
  const options = type === 'ingreso' ? INCOME_LABELS : [...EXPENSE_LABELS, ...customLabels];
  const key = normalizeText(label || '');
  return options.find(o => normalizeText(o) === key) || (type === 'ingreso' ? 'Otros ingresos' : 'Otros');
}

// Pide a la IA gratuita que interprete la frase; devuelve null si no hay conexión o algo falla
export async function improveWithAi(text: string, categories: { label: string; isCustom?: boolean }[]): Promise<ParsedVoiceResult[] | null> {
  const key = getAiKey();
  if (!key) return null;

  const models = await getFreeModels(key);
  if (!models.length) return null;
  const customLabels = categories.filter(c => c.isCustom).map(c => c.label);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FLOWI',
      },
      body: JSON.stringify({
        model: models[0],
        models,
        temperature: 0,
        messages: [
          { role: 'system', content: buildPrompt(customLabels) },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
    const items: any[] = parsed?.movimientos;
    if (!Array.isArray(items) || !items.length) return null;

    const results: ParsedVoiceResult[] = [];
    for (const item of items) {
      const type = item?.type;
      const amount = Number(item?.amount);
      if (!['gasto', 'ingreso', 'deuda'].includes(type) || !Number.isFinite(amount) || amount <= 0) continue;
      if (type === 'deuda') {
        const direction = item.debtDirection === 'me_deben' ? 'me_deben' : 'debo';
        const person = typeof item.debtPerson === 'string' ? item.debtPerson.trim() : '';
        results.push({
          kind: 'transaction', type, amount: Math.round(amount), category: 'Otros', isFixed: false, rawText: text,
          description: direction === 'me_deben' ? (person ? `${person} me debe` : 'Me deben') : (person ? `Deuda con ${person}` : 'Deuda por voz'),
          debtPerson: person, debtDirection: direction,
        });
      } else {
        const category = matchCategory(item.category, type, customLabels);
        results.push({
          kind: 'transaction', type, amount: Math.round(amount), category, rawText: text,
          description: String(item.description || category).slice(0, 80),
          isFixed: type === 'gasto' && isFixedExpenseCategory(category),
          merchant: typeof item.merchant === 'string' && item.merchant.trim() ? item.merchant.trim() : undefined,
        });
      }
    }
    return results.length ? results : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── Gasto por foto del recibo ─────────────────────────────────────────────
// La foto se reduce en el dispositivo y se envía solo al modelo gratuito para leerla; FLOWI no la guarda.

const PREFERRED_VISION = ['gemini', 'gemma-4-31b', 'gemma', '-vl', 'qwen', 'llama-4', 'llama-3.2', 'mistral-small', 'nemotron'];
// Modelos que aceptan imágenes pero no sirven para leer un recibo (música, clasificadores, experimentales)
const NOT_FOR_RECEIPTS = /safety|guard|lyria|stealth|^openrouter\//i;

async function getFreeVisionModels(key: string): Promise<string[]> {
  const cached = storageGet(VISION_MODELS_CACHE);
  if (cached) {
    try {
      const { at, models } = JSON.parse(cached);
      if (Date.now() - at < MODELS_CACHE_MS && models?.length) return models;
    } catch {}
  }
  const res = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) return [];
  const { data } = await res.json();
  const free: string[] = (data || [])
    .filter((m: any) => String(m.id).endsWith(':free') || (m.pricing?.prompt === '0' && m.pricing?.completion === '0'))
    .filter((m: any) => (m.architecture?.input_modalities || []).includes('image'))
    .filter((m: any) => (m.architecture?.output_modalities || ['text']).includes('text') && !NOT_FOR_RECEIPTS.test(String(m.id)))
    .map((m: any) => String(m.id));
  const rank = (id: string) => {
    const i = PREFERRED_VISION.findIndex(p => id.includes(p));
    return i === -1 ? PREFERRED_VISION.length : i;
  };
  const models = free.sort((a, b) => rank(a) - rank(b)).slice(0, 3);
  storageSet(VISION_MODELS_CACHE, JSON.stringify({ at: Date.now(), models }));
  return models;
}

// Reduce la foto (máx. 1280 px, JPEG) para que viaje rápido incluso con datos móviles
async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function receiptPrompt(customLabels: string[]) {
  return `Lees fotos de recibos, facturas y tiquetes de compra de Colombia.
Responde SOLO con un JSON: {"total":numero_en_pesos,"merchant":"nombre del comercio o null","date":"YYYY-MM-DD o null","category":"...","description":"texto corto de lo que se compró"}
Reglas:
- "total" es el TOTAL A PAGAR del recibo (no el subtotal, ni el IVA, ni el cambio, ni lo recibido en efectivo).
- En Colombia el punto separa miles: "$45.900" = 45900 y "1.250.000" = 1250000. Si hay centavos con coma, ignóralos.
- "date" es la fecha de la compra impresa en el recibo; null si no se ve.
- category debe ser exactamente una de: ${[...EXPENSE_LABELS, ...customLabels].join(', ')}.
- Si la foto no es un recibo o no se puede leer el total, responde {"total":null}.`;
}

export type ReceiptReadResult =
  | { ok: true; result: ParsedVoiceResult }
  | { ok: false; reason: 'no-key' | 'no-model' | 'unreadable' | 'failed' };

export async function readReceiptWithAi(file: File, categories: { label: string; isCustom?: boolean }[]): Promise<ReceiptReadResult> {
  const key = getAiKey();
  if (!key) return { ok: false, reason: 'no-key' };
  const models = await getFreeVisionModels(key).catch(() => []);
  if (!models.length) return { ok: false, reason: 'no-model' };
  const customLabels = categories.filter(c => c.isCustom).map(c => c.label);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECEIPT_TIMEOUT_MS);
  try {
    const image = await shrinkImage(file);
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FLOWI',
      },
      body: JSON.stringify({
        model: models[0],
        models,
        temperature: 0,
        messages: [
          { role: 'system', content: receiptPrompt(customLabels) },
          { role: 'user', content: [
            { type: 'text', text: 'Lee este recibo.' },
            { type: 'image_url', image_url: { url: image } },
          ] },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: 'failed' };
    const data = await res.json();
    const parsed = extractJson(data?.choices?.[0]?.message?.content || '');
    const total = Number(parsed?.total);
    if (!parsed || !Number.isFinite(total) || total <= 0) return { ok: false, reason: 'unreadable' };

    const category = matchCategory(parsed.category, 'gasto', customLabels);
    const merchant = typeof parsed.merchant === 'string' && parsed.merchant.trim() && parsed.merchant !== 'null' ? parsed.merchant.trim().slice(0, 60) : undefined;
    // La fecha del recibo solo se usa si es válida y no está en el futuro
    let date: string | undefined;
    if (typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
      const [y, m, d] = parsed.date.split('-').map(Number);
      const when = new Date(y, m - 1, d);
      if (when.getMonth() === m - 1 && when <= new Date() && Date.now() - when.getTime() < 400 * 86400000) date = parsed.date;
    }
    return {
      ok: true,
      result: {
        kind: 'transaction', type: 'gasto', amount: Math.round(total), category,
        description: String(parsed.description || merchant || category).slice(0, 80),
        isFixed: isFixedExpenseCategory(category), rawText: 'Recibo',
        ...(merchant ? { merchant } : {}),
        ...(date ? { date } : {}),
      },
    };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}

// ── CDT desde capturas de la app del banco ────────────────────────────────
// Lee una o varias capturas (resumen y detalle) y devuelve los datos para llenar el formulario.
// Se pide ignorar números de CDT, de cuenta y nombres: FLOWI no los guarda.

export interface CdtReading {
  bank?: string;
  amount?: number;
  rateEA?: number;
  nominalRate?: number;
  startDate?: string;     // YYYY-MM-DD
  maturityDate?: string;  // YYYY-MM-DD
  bankInterest?: number;
  autoRenew?: boolean;
  termDays?: number;      // plazo en días según la captura (para revisar las fechas)
}

export type CdtReadResult =
  | { ok: true; data: CdtReading; found: number }
  | { ok: false; reason: 'no-key' | 'no-model' | 'unreadable' | 'failed' };

const CDT_PROMPT = `Eres un asistente que lee capturas de pantalla de la app de un banco colombiano sobre un CDT (certificado de depósito a término).
Pueden ser varias capturas del mismo CDT. Responde SOLO un JSON con estas claves (null si no aparece):
{"bank": nombre del banco, "amount": capital o monto invertido en pesos (número sin puntos), "rateEA": tasa efectiva anual en % (número, ej 9.9),
 "nominalRate": tasa nominal en % si aparece, "startDate": fecha de apertura o de inicio del periodo "YYYY-MM-DD",
 "maturityDate": fecha de vencimiento "YYYY-MM-DD" (cópiala tal cual aparece; no la calcules), "termDays": plazo en días si aparece (número),
 "bankInterest": intereses del periodo en pesos si aparecen, "autoRenew": true si dice que se renueva automáticamente}
Las fechas pueden venir como "29 ene 2027" o "29/01/2027" (día/mes/año).
No incluyas números de CDT, de cuenta, de documento ni nombres de personas. Los montos colombianos usan punto de miles y coma decimal.`;

export async function readCdtWithAi(files: File[]): Promise<CdtReadResult> {
  const key = getAiKey();
  if (!key) return { ok: false, reason: 'no-key' };
  const models = await getFreeVisionModels(key).catch(() => []);
  if (!models.length) return { ok: false, reason: 'no-model' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECEIPT_TIMEOUT_MS * 2);
  try {
    const images = await Promise.all(files.slice(0, 4).map(shrinkImage));
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FLOWI',
      },
      body: JSON.stringify({
        model: models[0],
        models,
        temperature: 0,
        messages: [
          { role: 'system', content: CDT_PROMPT },
          { role: 'user', content: [
            { type: 'text', text: `Estas son ${images.length} captura(s) de un CDT.` },
            ...images.map(url => ({ type: 'image_url', image_url: { url } })),
          ] },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: 'failed' };
    const json = await res.json();
    const p = extractJson(json?.choices?.[0]?.message?.content || '');
    if (!p) return { ok: false, reason: 'unreadable' };

    const num = (v: any) => {
      if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : undefined;
      if (typeof v !== 'string') return undefined;
      const n = Number(v.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const day = (v: any) => {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
      const [y, m, d] = v.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.getMonth() === m - 1 && y > 2000 && y < 2100 ? v : undefined;
    };
    const rate = (v: any) => { const n = num(v); return n !== undefined && n < 60 ? Math.round(n * 100) / 100 : undefined; };
    const data: CdtReading = {
      bank: typeof p.bank === 'string' && p.bank.trim() && p.bank !== 'null' ? p.bank.trim().slice(0, 30) : undefined,
      amount: num(p.amount) ? Math.round(num(p.amount)!) : undefined,
      rateEA: rate(p.rateEA),
      nominalRate: rate(p.nominalRate),
      startDate: day(p.startDate),
      maturityDate: day(p.maturityDate),
      bankInterest: num(p.bankInterest) ? Math.round(num(p.bankInterest)!) : undefined,
      autoRenew: p.autoRenew === true ? true : undefined,
      termDays: num(p.termDays) && num(p.termDays)! < 4000 ? Math.round(num(p.termDays)!) : undefined,
    };
    const found = Object.values(data).filter(v => v !== undefined).length;
    if (!found) return { ok: false, reason: 'unreadable' };
    return { ok: true, data, found };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}


// ── Cajitas, fondos y pensión desde capturas ──────────────────────────────
// Lee el saldo o valor de la inversión, lo invertido (si aparece) y la tasa E.A.

export interface SavingsReading {
  bank?: string;
  balance?: number;   // saldo o valor actual
  invested?: number;  // lo aportado / invertido (fondos), si aparece
  rateEA?: number;    // tasa efectiva anual en %
}

export type SavingsReadResult =
  | { ok: true; data: SavingsReading; found: number }
  | { ok: false; reason: 'no-key' | 'no-model' | 'unreadable' | 'failed' };

const SAVINGS_KIND_TEXT: Record<string, string> = {
  ahorro: 'una cuenta de ahorro o "cajita" que paga intereses (Nu, Nequi, Lulo, Pibank, bancos)',
  fondo: 'un fondo de inversión, acciones o ETF (Trii, Tyba, fiduciarias, bancos)',
  pension: 'un fondo de pensión voluntaria u obligatoria (Porvenir, Protección, Colfondos, Skandia)',
};

export async function readSavingsWithAi(files: File[], kind: string): Promise<SavingsReadResult> {
  const key = getAiKey();
  if (!key) return { ok: false, reason: 'no-key' };
  const models = await getFreeVisionModels(key).catch(() => []);
  if (!models.length) return { ok: false, reason: 'no-model' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RECEIPT_TIMEOUT_MS * 2);
  const prompt = `Eres un asistente que lee capturas de pantalla de la app de una entidad financiera colombiana sobre ${SAVINGS_KIND_TEXT[kind] || 'un ahorro o inversión'}.
Pueden ser varias capturas del mismo producto. Responde SOLO un JSON con estas claves (null si no aparece):
{"bank": nombre de la entidad o app, "balance": saldo total o valor actual en pesos (número sin puntos),
 "invested": total aportado o invertido en pesos si aparece separado del valor actual, "rateEA": tasa efectiva anual en % si aparece (número, ej 9.25)}
No incluyas números de cuenta, de documento ni nombres de personas. Los montos colombianos usan punto de miles y coma decimal.`;
  try {
    const images = await Promise.all(files.slice(0, 4).map(shrinkImage));
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'FLOWI',
      },
      body: JSON.stringify({
        model: models[0],
        models,
        temperature: 0,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: [
            { type: 'text', text: `Estas son ${images.length} captura(s).` },
            ...images.map(url => ({ type: 'image_url', image_url: { url } })),
          ] },
        ],
      }),
    });
    if (!res.ok) return { ok: false, reason: 'failed' };
    const json = await res.json();
    const p = extractJson(json?.choices?.[0]?.message?.content || '');
    if (!p) return { ok: false, reason: 'unreadable' };
    const num = (v: any) => {
      if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : undefined;
      if (typeof v !== 'string') return undefined;
      const n = Number(v.replace(/[^\d.,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
      return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    const rate = num(p.rateEA);
    const data: SavingsReading = {
      bank: typeof p.bank === 'string' && p.bank.trim() && p.bank !== 'null' ? p.bank.trim().slice(0, 30) : undefined,
      balance: num(p.balance) ? Math.round(num(p.balance)!) : undefined,
      invested: num(p.invested) ? Math.round(num(p.invested)!) : undefined,
      rateEA: rate !== undefined && rate < 60 ? Math.round(rate * 100) / 100 : undefined,
    };
    const found = Object.values(data).filter(v => v !== undefined).length;
    if (!found) return { ok: false, reason: 'unreadable' };
    return { ok: true, data, found };
  } catch {
    return { ok: false, reason: 'failed' };
  } finally {
    clearTimeout(timer);
  }
}
