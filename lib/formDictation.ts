// Entender lo que se dicta en los formularios de deudas e inversiones, sin IA (gratis e inmediato):
//  "Crediágil de 700 mil al 28,17 a 60 meses, pago los 15, desembolso el 5 de noviembre"
//  "Le presté 500 mil a Claudia al 2 % mensual"
//  "CDT de 5 millones en Bancolombia al 11 % a 6 meses"
import { normalizeText } from './categories';
import { extractAllAmounts, wordsToDigits } from './voiceParser';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ymd = (d: Date) => d.toLocaleDateString('en-CA');
const num = (s: string) => parseFloat(s.replace(',', '.'));
const STOP = new Set(['de', 'el', 'la', 'los', 'las', 'al', 'a', 'con', 'que', 'por', 'en', 'y', 'mil', 'millon', 'millones', 'pesos', 'un', 'una', 'me', 'le', 'lo', 'para', 'hoy', 'ayer']);
const titleCase = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Texto normalizado (sin tildes, minúsculas, números en cifras). */
function prep(text: string) {
  return wordsToDigits(normalizeText(text)).replace(/[^a-z0-9%.,$ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function takeDate(n: string, now: Date): { date?: string; rest: string } {
  const shift = (days: number) => { const d = new Date(now); d.setDate(d.getDate() - days); return ymd(d); };
  let m: RegExpMatchArray | null;
  if ((m = n.match(/\b(antier|anteayer|antes de ayer)\b/))) return { date: shift(2), rest: n.replace(m[0], ' ') };
  if ((m = n.match(/\bayer\b/))) return { date: shift(1), rest: n.replace(m[0], ' ') };
  if ((m = n.match(/\bhoy\b/))) return { date: ymd(now), rest: n.replace(m[0], ' ') };
  m = n.match(new RegExp(`\\b(?:el\\s+)?(\\d{1,2})\\s+de\\s+(${MONTHS.join('|')})(?:\\s+(?:de\\s+)?(\\d{4}))?\\b`));
  if (m) {
    const day = parseInt(m[1], 10), mi = MONTHS.indexOf(m[2]);
    let year = m[3] ? parseInt(m[3], 10) : now.getFullYear();
    let d = new Date(year, mi, day, 12);
    if (!m[3] && d.getTime() > now.getTime() + 86400000 * 31) d = new Date(--year, mi, day, 12);
    if (d.getMonth() === mi) return { date: ymd(d), rest: n.replace(m[0], ' ') };
  }
  return { rest: n };
}

function takeRate(n: string): { rate?: number; unit?: 'ea' | 'mensual'; rest: string } {
  const unitOf = (s?: string) => (s && /mensual|al mes|mes vencido|m v/.test(s) ? 'mensual' : 'ea') as 'ea' | 'mensual';
  let m = n.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por ?ciento)(\s*(?:mensual|al mes|mes vencido|m v|e a|ea|efectivo anual|anual))?/);
  if (!m) m = n.match(/\b(?:al|tasa(?: de)?|interes(?: de)?)\s+(\d{1,2}(?:[.,]\d+)?)(?!\s*(?:mil|millon|millones|meses|mes|anos|ano|dias|dia|de \d))(\s*(?:mensual|al mes|e a|ea|efectivo anual|anual))?\b/);
  if (!m) return { rest: n };
  const rate = num(m[1]);
  if (!(rate > 0 && rate < 200)) return { rest: n };
  return { rate, unit: unitOf(m[2]), rest: n.replace(m[0], ' ') };
}

function takeTerm(n: string): { months?: number; days?: number; rest: string } {
  const m = n.match(/\b(?:a|plazo(?: de)?|en|por)?\s*(\d{1,3})\s*(meses|mes|anos|ano|dias|dia)\b/);
  if (!m) return { rest: n };
  const v = parseInt(m[1], 10);
  const rest = n.replace(m[0], ' ');
  if (/^dia/.test(m[2])) return { days: v, rest };
  if (/^ano/.test(m[2])) return { months: v * 12, rest };
  return { months: v, rest };
}

function takePayDay(n: string): { day?: number; rest: string } {
  const m = n.match(/\b(?:pago|pagar|paga|pagamos|cuota|cuotas|pagando)\s+(?:los|el|cada)\s+(\d{1,2})(?:\s+de\s+cada\s+mes)?\b/)
    || n.match(/\b(?:los|el)\s+(\d{1,2})\s+de\s+cada\s+mes\b/);
  if (!m) return { rest: n };
  const day = parseInt(m[1], 10);
  return day >= 1 && day <= 31 ? { day, rest: n.replace(m[0], ' ') } : { rest: n };
}

function takeMoneyAfter(n: string, words: string): { value?: number; rest: string } {
  const m = n.match(new RegExp(`\\b(?:${words})\\s+(?:de\\s+|es\\s+de\\s+|va\\s+en\\s+|van\\s+)?((?:\\$\\s*)?\\d[\\d.,]*(?:\\s*(?:millones|millon|mil))?)`));
  if (!m) return { rest: n };
  const v = extractAllAmounts(m[1])[0] ?? (num(m[1].replace(/[^\d,]/g, '')) || undefined);
  return { value: v, rest: n.replace(m[0], ' ') };
}

// ── Deudas ────────────────────────────────────────────────────────────────
export interface DebtSpeech {
  kind?: 'banco' | 'persona' | 'preste';
  title?: string;
  amount?: number;
  date?: string;
  rate?: number;
  rateUnit?: 'ea' | 'mensual';
  termMonths?: number;
  paymentDay?: number;
  installment?: number;
  insurance?: number; // lo que va de seguro
  paid?: number;
}

const BANK_PRODUCTS: [RegExp, string][] = [
  [/crediagil/, 'Crediágil'], [/libre inversion/, 'Libre inversión'], [/tarjeta(?: de credito)?/, 'Tarjeta de crédito'],
  [/hipotec|vivienda/, 'Crédito de vivienda'], [/vehiculo|carro|moto/, 'Crédito de vehículo'], [/libranza/, 'Libranza'],
  [/rotativo/, 'Crédito rotativo'], [/educativo|icetex/, 'Crédito educativo'],
];

export function parseDebtSpeech(text: string, now = new Date()): DebtSpeech {
  let n = prep(text);
  const out: DebtSpeech = {};

  if (/\b(le preste|les preste|preste|me debe|me deben|le di prestado)\b/.test(n)) out.kind = 'preste';
  else if (/\b(me presto|me prestaron|le debo|les debo|me fio)\b/.test(n)) out.kind = 'persona';
  if (!out.kind && (/\b(credito|banco|prestamo del banco)\b/.test(n) || BANK_PRODUCTS.some(([re]) => re.test(n)))) out.kind = 'banco';

  // Nombre: el producto del banco o la persona
  if (out.kind === 'banco' || (!out.kind && BANK_PRODUCTS.some(([re]) => re.test(n)))) {
    out.title = BANK_PRODUCTS.find(([re]) => re.test(n))?.[1];
  } else if (out.kind) {
    const m = n.match(/\b(?:me presto|me prestaron|le debo a|le debo|me debe|me deben|preste a|le preste a|le di prestado a)\s+([a-z]+(?:\s+[a-z]+)?)/)
      || n.match(/\b(?:preste|le preste|le di prestado)\b.*?\ba\s+([a-z]+(?:\s+[a-z]+)?)/)
      || n.match(/\ba\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:le preste|le debo)/);
    if (m) {
      const words = m[1].split(' ').filter(w => !STOP.has(w) && !/\d/.test(w));
      const name = words.slice(0, words.length > 1 && STOP.has(m[1].split(' ')[1]) ? 1 : 2).join(' ');
      if (name) out.title = titleCase(name);
    }
  }

  let r: any;
  r = takeMoneyAfter(n, 'seguro(?: de vida)?(?: deudor)?'); if (r.value) out.insurance = r.value; n = r.rest;
  r = takeMoneyAfter(n, 'cuota(?: mensual)?|cuotas de'); if (r.value) out.installment = r.value; n = r.rest;
  r = takeMoneyAfter(n, 'ya (?:le |me )?(?:pague|pago|pagaste|abone|abono|devolvio)|he pagado|llevo pagado'); if (r.value) out.paid = r.value; n = r.rest;
  r = takePayDay(n); if (r.day) out.paymentDay = r.day; n = r.rest;
  r = takeRate(n); if (r.rate) { out.rate = r.rate; out.rateUnit = r.unit; } n = r.rest;
  r = takeTerm(n); if (r.months) out.termMonths = r.months; n = r.rest;
  r = takeDate(n, now); if (r.date) out.date = r.date; n = r.rest;
  const amounts = extractAllAmounts(n).filter(a => a >= 1000);
  if (amounts.length) out.amount = Math.max(...amounts);
  return out;
}

// ── Inversiones (CDT, cajitas, fondos, pensión) ───────────────────────────
export interface InvestmentSpeech {
  bank?: string;
  amount?: number;
  current?: number;   // saldo actual ("ya tiene 2,3 millones")
  rateEA?: number;
  termMonths?: number;
  termDays?: number;
  startDate?: string;
  maturityDate?: string;
}

const BANKS: [RegExp, string][] = [
  [/bancolombia/, 'Bancolombia'], [/\bbbva\b/, 'BBVA'], [/davivienda/, 'Davivienda'], [/banco de bogota|bogota/, 'Banco de Bogotá'],
  [/\bnu\b|nubank/, 'Nu'], [/lulo/, 'Lulo Bank'], [/popular/, 'Banco Popular'], [/itau/, 'Itaú'], [/falabella/, 'Banco Falabella'],
  [/pichincha/, 'Banco Pichincha'], [/finandina/, 'Finandina'], [/av villas|villas/, 'AV Villas'], [/caja social/, 'Banco Caja Social'],
  [/colpatria|scotiabank/, 'Scotiabank Colpatria'], [/occidente/, 'Banco de Occidente'], [/\bmibanco\b/, 'Mibanco'],
  [/nequi/, 'Nequi'], [/daviplata/, 'Daviplata'], [/ualá|uala/, 'Ualá'], [/\bpibank\b/, 'Pibank'], [/coltefinanciera/, 'Coltefinanciera'],
  [/porvenir/, 'Porvenir'], [/proteccion/, 'Protección'], [/colfondos/, 'Colfondos'], [/skandia/, 'Skandia'], [/trii/, 'Trii'],
];

export function parseInvestmentSpeech(text: string, now = new Date()): InvestmentSpeech {
  let n = prep(text);
  const out: InvestmentSpeech = {};
  out.bank = BANKS.find(([re]) => re.test(n))?.[1];
  let r: any;
  r = takeMoneyAfter(n, 'ya tiene|tiene|tengo|saldo(?: de)?|vale|va en|hoy hay'); if (r.value) out.current = r.value; n = r.rest;
  r = takeRate(n); if (r.rate) out.rateEA = r.unit === 'mensual' ? Math.round(((Math.pow(1 + r.rate / 100, 12) - 1) * 100) * 100) / 100 : r.rate; n = r.rest;
  r = takeTerm(n); if (r.months) out.termMonths = r.months; if (r.days) out.termDays = r.days; n = r.rest;
  const vence = n.match(/\b(?:vence|vencimiento|hasta)\b(.*)$/);
  if (vence) { const d = takeDate(vence[1], new Date(now.getFullYear() + 5, 0, 1)); if (d.date) { out.maturityDate = d.date; n = n.replace(vence[0], ' '); } }
  r = takeDate(n, now); if (r.date) out.startDate = r.date; n = r.rest;
  const amounts = extractAllAmounts(n).filter(a => a >= 1000);
  if (amounts.length) out.amount = Math.max(...amounts);
  // Vencimiento a partir del plazo (si no se dijo la fecha)
  if (!out.maturityDate && (out.termMonths || out.termDays)) {
    const s = out.startDate ? new Date(`${out.startDate}T12:00:00`) : new Date(now);
    if (out.termMonths) s.setMonth(s.getMonth() + out.termMonths); else s.setDate(s.getDate() + out.termDays!);
    out.maturityDate = ymd(s);
  }
  return out;
}
