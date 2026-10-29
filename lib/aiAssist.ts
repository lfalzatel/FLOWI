// IA opcional para el asistente de voz usando la cuenta GRATUITA de OpenRouter de cada usuario.
// El usuario conecta su cuenta con un botón (OAuth PKCE); la clave que entrega OpenRouter se guarda
// solo en este dispositivo y nunca pasa por nuestro servidor. Solo se usan modelos gratuitos.
import { BASE_CATEGORY_DEFS, normalizeText } from './categories';
import { isFixedExpenseCategory } from './firestore';
import type { ParsedVoiceItem, ParsedVoiceResult } from './voiceParser';

const KEY_STORAGE = 'flowi_openrouter_key';
const VERIFIER_STORAGE = 'flowi_openrouter_verifier';
const MODELS_CACHE = 'flowi_openrouter_free_models';
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
