import { isFixedExpenseCategory } from './firestore';
import { detectMerchantInText, normalizeText } from './categories';

export interface ParsedVoiceResult {
  kind?: 'transaction';
  type: 'gasto' | 'ingreso' | 'deuda';
  amount: number | null;
  category: string;
  description: string;
  isFixed: boolean;
  rawText: string;
  debtPerson?: string;
  interestRate?: number;
  merchant?: string;
  // Solo para deudas: "debo" (yo le debo a alguien) o "me_deben" (alguien me debe a mí)
  debtDirection?: 'debo' | 'me_deben';
}

export interface ParsedVoiceCommand {
  kind: 'command';
  action: 'navigate' | 'create_note' | 'create_reminder' | 'ask_followup';
  pendingAction?: 'create_reminder' | 'create_note' | 'create_income' | 'create_expense';
  targetUrl?: string;
  title: string;
  content?: string;
  amount?: number | null;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly';
  dueDate?: string;
  time?: string;
  prompt?: string;
  label: string;
  rawText: string;
}

/**
 * Síntesis de voz nativa del navegador para responder al usuario en voz alta
 */
export function speakText(text: string, lang: string = 'es-CO', onDone?: () => void, ignoreToggle: boolean = false) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onDone) onDone();
    return;
  }
  const isSpeechEnabled = localStorage.getItem('sound_speech_enabled') !== 'false';
  if (!isSpeechEnabled && !ignoreToggle) {
    if (onDone) onDone();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      if (onDone) onDone();
    };

    utterance.onerror = () => {
      if (onDone) onDone();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Error al reproducir voz:', e);
    if (onDone) onDone();
  }
}

export type ParsedVoiceItem = ParsedVoiceResult | ParsedVoiceCommand;

type VoiceCategory = { label: string; type?: string; isCustom?: boolean };

// ─── 1. Números dichos en palabras → dígitos ("treinta y cinco mil" → "35000") ───────────────

const UNIT_WORDS: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};
const TEN_WORDS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const HUNDRED_WORDS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};
const ARTICLE_NUMBERS = new Set(['un', 'uno', 'una']);
const isMillionWord = (w: string) => w === 'millon' || w === 'millones';

function wordKey(token: string) {
  return normalizeText(token).replace(/[^a-z]/g, '');
}

// Lee un número en palabras desde words[start]; devuelve el valor y cuántas palabras usó
function readNumberWords(words: string[], start: number): { value: number; used: number } | null {
  let total = 0;
  let current = 0;
  let i = start;
  let read = 0;
  let onlyArticle = true;

  while (i < words.length) {
    const w = wordKey(words[i]);
    const next = i + 1 < words.length ? wordKey(words[i + 1]) : '';
    if (UNIT_WORDS[w] !== undefined) {
      if (!ARTICLE_NUMBERS.has(w)) onlyArticle = false;
      current += UNIT_WORDS[w];
    } else if (TEN_WORDS[w] !== undefined) {
      onlyArticle = false;
      current += TEN_WORDS[w];
      const after = i + 2 < words.length ? wordKey(words[i + 2]) : '';
      if (next === 'y' && UNIT_WORDS[after] !== undefined && UNIT_WORDS[after] < 10) {
        current += UNIT_WORDS[after];
        i += 2;
        read += 2;
      }
    } else if (HUNDRED_WORDS[w] !== undefined) {
      onlyArticle = false;
      current += HUNDRED_WORDS[w];
    } else if (w === 'mil') {
      onlyArticle = false;
      current = (current || 1) * 1000;
    } else if (isMillionWord(w)) {
      onlyArticle = false;
      total += (current || 1) * 1_000_000;
      current = 0;
      const after = i + 2 < words.length ? wordKey(words[i + 2]) : '';
      if (next === 'y' && after === 'medio') {
        total += 500_000;
        i += 2;
        read += 2;
      }
    } else if (w === 'medio' && isMillionWord(next) && read === 0) {
      onlyArticle = false;
      total += 500_000;
      i += 1;
      read += 1;
    } else {
      break;
    }
    i++;
    read++;
  }

  if (read === 0 || onlyArticle) return null;
  return { value: total + current, used: read };
}

export function wordsToDigits(text: string): string {
  const parts = text.split(/(\s+)/);
  const words: string[] = [];
  const wordIdx: number[] = [];
  parts.forEach((p, idx) => { if (p.trim()) { words.push(p); wordIdx.push(idx); } });

  let i = 0;
  while (i < words.length) {
    // "5 mil" / "2 millones": la escala acompaña a un número en dígitos y la lee el buscador de montos
    const key = wordKey(words[i]);
    if ((key === 'mil' || isMillionWord(key)) && i > 0 && /\d$/.test(words[i - 1])) {
      i++;
      continue;
    }
    const num = readNumberWords(words, i);
    if (num) {
      const firstPart = wordIdx[i];
      const lastPart = wordIdx[i + num.used - 1];
      const trailing = (words[i + num.used - 1].match(/[^a-záéíóúñü0-9]+$/i) || [''])[0];
      parts[firstPart] = String(num.value) + trailing;
      for (let k = firstPart + 1; k <= lastPart; k++) parts[k] = '';
      i += num.used;
    } else {
      i++;
    }
  }
  return parts.join('').replace(/\s{2,}/g, ' ');
}

// ─── 2. Montos de dinero ("$25.000", "25 mil", "1,5 millones", "2 millones 500 mil") ──────────

interface MoneyMatch { value: number; start: number; end: number; isMoney: boolean; hasScale: boolean; scale: number }

const MONEY_RE = /(\$\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d{1,2})?)(?:\s*(mil(?:es)?|k|mill[oó]n(?:es)?|millones|mm)(?![a-záéíóúñü]))?(\s+(?:de\s+)?pesos\b)?/gi;

function findMoney(text: string): MoneyMatch[] {
  const found: MoneyMatch[] = [];
  MONEY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MONEY_RE.exec(text)) !== null) {
    // Ignorar porcentajes (tasas de interés) y horas ("a las 3:30")
    const after = text.slice(m.index + m[0].length);
    if (/^\s*(?:%|por\s*ciento)/i.test(after)) continue;
    if (/^:\d/.test(after)) continue;

    const raw = m[2];
    const scaleWord = (m[3] || '').toLowerCase();
    let value = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw)
      ? parseInt(raw.replace(/[.,]/g, ''), 10)
      : parseFloat(raw.replace(',', '.'));
    let scale = 1;
    if (/^mill/.test(scaleWord) || scaleWord === 'mm') scale = 1_000_000;
    else if (scaleWord) scale = 1000;
    value = Math.round(value * scale);
    if (!value) continue;

    const hasScale = scale > 1;
    const isMoney = hasScale || !!m[1] || !!m[4] || value >= 100;
    found.push({ value, start: m.index, end: m.index + m[0].length, isMoney, hasScale, scale });
  }

  // Unir cadenas como "2 millones 500 mil" o "15 mil 500" en un solo monto
  const merged: MoneyMatch[] = [];
  for (const cur of found) {
    const prev = merged[merged.length - 1];
    const gap = prev ? text.slice(prev.end, cur.start) : '';
    if (prev && /^\s*(?:y|con)?\s*$/.test(gap) && (
      (prev.scale === 1_000_000 && cur.value < 1_000_000) ||
      (prev.scale === 1000 && !cur.hasScale && cur.value < 1000)
    )) {
      prev.value += cur.value;
      prev.end = cur.end;
      prev.isMoney = true;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function extractAllAmounts(text: string): number[] {
  return findMoney(wordsToDigits(text.toLowerCase())).filter(m => m.isMoney).map(m => m.value);
}

// ─── 3. Tipo de movimiento por frase ─────────────────────────────────────────────────────────

type TxType = 'gasto' | 'ingreso' | 'deuda';

const ME_DEBEN_RE = /\b(?:me\s+deben?|me\s+quedo\s+debiendo|me\s+quedaron\s+debiendo|me\s+tiene\s+que\s+pagar|le\s+preste|les\s+preste|preste)\b/;
const GASTO_RE = /\b(?:gaste|pague|compre|gasto|gastos|me\s+gaste|costo|me\s+costo|me\s+cobraron|perdi|se\s+me\s+perdio|tanquee|almorce|desayune|cene|transferi|consigne)\b/;
const DEBO_RE = /\b(?:me\s+prestaron|me\s+presto|le\s+debo|les\s+debo|debo|debemos|quede\s+debiendo)\b/;
const INGRESO_RE = /\b(?:ingreso|ingresos|ingresaron|me\s+ingresaron|me\s+pagaron|me\s+consignaron|me\s+depositaron|me\s+transfirieron|me\s+giraron|me\s+llego|me\s+llegaron|recibi|recibo|me\s+dieron|me\s+regalaron|gane|ganancia|ganancias|cobre|vendi|venta|ventas|sueldo|salario|nomina|quincena|reembolso|me\s+devolvieron|devolucion|bonificacion|comision|comisiones|propina|propinas|honorarios|cesantias|remesa)\b/;
const DEUDA_RE = /\b(?:deuda|deudas)\b/;

function detectType(normalized: string): { type: TxType; direction?: 'debo' | 'me_deben' } | null {
  if (ME_DEBEN_RE.test(normalized)) return { type: 'deuda', direction: 'me_deben' };
  if (GASTO_RE.test(normalized)) return { type: 'gasto' };
  if (DEBO_RE.test(normalized)) return { type: 'deuda', direction: 'debo' };
  if (INGRESO_RE.test(normalized)) return { type: 'ingreso' };
  if (DEUDA_RE.test(normalized)) return { type: 'deuda', direction: 'debo' };
  return null;
}

// ─── 4. Categoría (catálogo actual) ─────────────────────────────────────────────────────────

const EXPENSE_KEYWORDS: [RegExp, string][] = [
  [/\b(?:cervezas?|polas?|aguardiente|ron|tragos?|licor(?:es)?|bar|bares|discoteca|cigarr\w*|tabaco|estanco|vinos?|whisky|tequila|vodka|cocteles?)\b/, 'Licores y Bares'],
  [/\b(?:gasolina|tanque\w*|combustible|acpm|diesel)\b/, 'Gasolina'],
  [/\b(?:taxis?|uber|didi|cabify|indrive|indriver|picap)\b/, 'Taxi / plataformas'],
  [/\b(?:parqueadero|parqueo|parking)\b/, 'Parqueadero'],
  [/\b(?:peajes?)\b/, 'Peajes'],
  [/\b(?:soat)\b/, 'SOAT'],
  [/\b(?:tecnomecanica|revision\s+tecnico)\b/, 'Tecnomecánica'],
  [/\b(?:lavada|lavadero)\b/, 'Lavadero'],
  [/\b(?:mecanico|taller)\b/, 'Mecánico'],
  [/\b(?:bus|buseta|pasajes?|metro|transmilenio|mio|transporte)\b/, 'Transporte'],
  [/\b(?:domicilios?|rappi)\b/, 'Domicilios'],
  [/\b(?:hamburguesas?|pizzas?|perro\s+caliente|salchipapas?|empanadas?|comida\s+rapida)\b/, 'Comidas rápidas'],
  [/\b(?:corrientazo)\b/, 'Corrientazo / almuerzo'],
  [/\b(?:almuerzos?|cenas?|desayunos?|restaurantes?|comida)\b/, 'Restaurantes'],
  [/\b(?:panaderia|pan|pandebonos?|bunuelos?|croissant)\b/, 'Panadería'],
  [/\b(?:cafe|tinto|capuchino|helados?|postres?|antojos?|dulces?|galletas?|mecato|snacks?)\b/, 'Café y Antojos'],
  [/\b(?:carniceria|carne|pollo)\b/, 'Carnicería'],
  [/\b(?:verduras?|frutas?|fruver)\b/, 'Verduras y Frutas'],
  [/\b(?:supermercado|mercado|viveres)\b/, 'Mercado'],
  [/\b(?:tienda|minimercado)\b/, 'Tienda / Minimercado'],
  [/\b(?:luz|energia)\b/, 'Luz'],
  [/\b(?:agua|acueducto)\b/, 'Agua'],
  [/\b(?:gas|pipeta)\b/, 'Gas natural'],
  [/\b(?:internet|wifi|fibra)\b/, 'Internet'],
  [/\b(?:celular|recargas?|plan\s+de\s+datos|minutos)\b/, 'Celular / recargas'],
  [/\b(?:arriendo|alquiler|renta)\b/, 'Arriendo'],
  [/\b(?:administracion)\b/, 'Administración'],
  [/\b(?:farmacia|drogueria|medicamentos?|pastillas|remedios?)\b/, 'Farmacia'],
  [/\b(?:odontologo|dentista|odontologia)\b/, 'Odontología'],
  [/\b(?:examenes|laboratorio)\b/, 'Exámenes'],
  [/\b(?:medico|doctor|consulta|cita\s+medica|clinica|hospital|eps|salud)\b/, 'Salud'],
  [/\b(?:gimnasio|gym)\b/, 'Gimnasio'],
  [/\b(?:netflix|disney|hbo|prime\s+video|suscripcion(?:es)?)\b/, 'Suscripciones'],
  [/\b(?:spotify|musica)\b/, 'Música'],
  [/\b(?:chatgpt|claude|gemini|inteligencia\s+artificial)\b/, 'Apps e IA'],
  [/\b(?:videojuegos?|playstation|xbox)\b/, 'Videojuegos'],
  [/\b(?:zapatos|tenis|zapatillas|calzado|botas)\b/, 'Calzado'],
  [/\b(?:ropa|camisas?|camisetas?|pantalon(?:es)?|vestidos?|jeans?|blusas?|chaquetas?)\b/, 'Ropa'],
  [/\b(?:veterinari[oa]|vacuna\s+del\s+perro)\b/, 'Veterinaria'],
  [/\b(?:mascotas?|perro|gato|concentrado|purina)\b/, 'Mascotas'],
  [/\b(?:matricula)\b/, 'Matrícula'],
  [/\b(?:colegio|pension\s+escolar)\b/, 'Colegio / pensión escolar'],
  [/\b(?:libros?)\b/, 'Libros'],
  [/\b(?:utiles|cuadernos?)\b/, 'Útiles'],
  [/\b(?:universidad|curso|cursos|fotocopias|educacion)\b/, 'Educación'],
  [/\b(?:peluqueria|barberia|corte\s+de\s+pelo)\b/, 'Peluquería / barbería'],
  [/\b(?:unas|manicure|pedicure)\b/, 'Uñas'],
  [/\b(?:tarjeta\s+de\s+credito|tarjeta)\b/, 'Tarjeta de crédito'],
  [/\b(?:cuota|credito|prestamo|deuda)\b/, 'Cuota de crédito'],
  [/\b(?:impuestos?|predial)\b/, 'Impuestos'],
  [/\b(?:regalos?)\b/, 'Regalos'],
  [/\b(?:cine|pelicula)\b/, 'Cine'],
  [/\b(?:concierto|boletas?|evento)\b/, 'Eventos'],
  [/\b(?:fiesta|rumba)\b/, 'Rumba'],
  [/\b(?:hotel|hospedaje)\b/, 'Hoteles'],
  [/\b(?:viajes?|vuelos?|tiquetes?\s+aereos?)\b/, 'Viajes'],
  [/\b(?:jabon|detergente|aseo)\b/, 'Aseo del hogar'],
  [/\b(?:diezmo|ofrenda)\b/, 'Diezmo / ofrenda'],
];

const INCOME_KEYWORDS: [RegExp, string][] = [
  [/\b(?:prima)\b/, 'Prima'],
  [/\b(?:cesantias)\b/, 'Cesantías'],
  [/\b(?:sueldo|salario|nomina|quincena)\b/, 'Sueldo'],
  [/\b(?:freelance|honorarios)\b/, 'Freelance'],
  [/\b(?:bono|bonificacion)\b/, 'Bonificación'],
  [/\b(?:comision|comisiones)\b/, 'Comisiones'],
  [/\b(?:propinas?)\b/, 'Propinas'],
  [/\b(?:arriendo|alquiler)\b/, 'Arriendo recibido'],
  [/\b(?:intereses|rendimientos)\b/, 'Rendimientos / intereses'],
  [/\b(?:reembolso|devolucion|me\s+devolvieron)\b/, 'Reembolso / devolución'],
  [/\b(?:remesa)\b/, 'Remesas del exterior'],
  [/\b(?:regalo|me\s+regalaron)\b/, 'Regalo recibido'],
  [/\b(?:vendi|venta|ventas)\b/, 'Venta'],
  [/\b(?:transferencia|me\s+transfirieron|me\s+consignaron|me\s+giraron)\b/, 'Transferencia'],
];

function matchesLabel(normalized: string, label: string) {
  const key = normalizeText(label).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (key.length < 3) return false;
  return new RegExp(`(?:^|\\s)${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(normalized);
}

function detectCategory(normalized: string, type: TxType, categories: VoiceCategory[]): { category: string; merchant?: string } {
  const merchant = type === 'gasto' ? detectMerchantInText(normalized) : undefined;
  const usable = categories
    .filter(c => !c.type || c.type === type)
    .filter(c => c.label !== 'Otros' && c.label !== 'Otros ingresos')
    .sort((a, b) => b.label.length - a.label.length);

  // Personalizadas del usuario primero: son lo más específico
  const custom = usable.find(c => c.isCustom && matchesLabel(normalized, c.label));
  if (custom) return { category: custom.label, merchant: merchant?.label };

  // Si varias reglas coinciden, manda lo que se mencionó primero ("tinto y pan" → Café y Antojos)
  const rules = type === 'ingreso' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
  // "Transferencia" describe el medio, no el concepto: solo aplica si no se dijo nada más
  let rule: { category: string; index: number } | null = null;
  for (const [re, cat] of rules) {
    const m = re.exec(normalized);
    if (!m) continue;
    const fallback = cat === 'Transferencia';
    const ruleIsFallback = rule?.category === 'Transferencia';
    if (!rule || (ruleIsFallback && !fallback) || (fallback === ruleIsFallback && m.index < rule.index)) {
      rule = { category: cat, index: m.index };
    }
  }
  if (rule) return { category: rule.category, merchant: merchant?.label };

  if (merchant) return { category: merchant.categories[0], merchant: merchant.label };

  const base = usable.find(c => !c.isCustom && matchesLabel(normalized, c.label));
  if (base) return { category: base.label };

  return { category: type === 'ingreso' ? 'Otros ingresos' : 'Otros' };
}

// ─── 5. Descripción y persona ───────────────────────────────────────────────────────────────

const LEADING_FILLERS = new Set([
  'gaste', 'pague', 'compre', 'gasto', 'gastos', 'me', 'le', 'les', 'se', 'de', 'del', 'en', 'por', 'el', 'la', 'los', 'las',
  'un', 'una', 'y', 'e', 'que', 'con', 'para', 'mi', 'mis', 'pagaron', 'ingresaron', 'consignaron', 'depositaron',
  'transfirieron', 'dieron', 'recibi', 'ingreso', 'ingresos', 'debo', 'debe', 'deben', 'preste', 'prestaron', 'presto',
  'tambien', 'ademas', 'luego', 'despues', 'pero', 'hoy', 'ayer', 'costo', 'cobraron', 'gane', 'cobre', 'vendi',
  'al', 'a', 'total', 'todo', 'fue', 'sali', 'salio', 'pesos', 'cada', 'uno', 'quedo', 'debiendo',
]);
const TRAILING_FILLERS = new Set(['de', 'del', 'en', 'por', 'el', 'la', 'los', 'las', 'a', 'al', 'y', 'e', 'con', 'para', 'cada', 'uno', 'una', 'que', 'pesos', 'me', 'le']);

function cleanDescription(text: string): string {
  let words = text
    .replace(/\$/g, ' ')
    .replace(/[,;:.!?¿¡]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (words.length && LEADING_FILLERS.has(wordKey(words[0]))) words.shift();
  while (words.length && TRAILING_FILLERS.has(wordKey(words[words.length - 1]))) words.pop();
  const result = words.join(' ').trim();
  return result ? result.charAt(0).toUpperCase() + result.slice(1) : '';
}

const NOT_A_PERSON = new Set(['la', 'el', 'los', 'las', 'un', 'una', 'mi', 'mis', 'su', 'sus', 'me', 'le', 'que', 'pesos', 'mil', 'cada', 'credito', 'interes']);

function detectPerson(segment: string, direction: 'debo' | 'me_deben'): string {
  const patterns = direction === 'me_deben'
    ? [/^([a-záéíóúñ]+)\s+me\s+(?:debe|deben|quedo|quedaron|tiene)/i, /\bpresté\s+(?:\S+\s+){0,4}?(?:a|al)\s+([a-záéíóúñ]+)/i, /\b(?:a|al)\s+([a-záéíóúñ]+)/i]
    : [/^([a-záéíóúñ]+)\s+me\s+prest/i, /\bme\s+prest[oó]\s+([a-záéíóúñ]+)/i, /\b(?:a|al|con)\s+([a-záéíóúñ]+)/i];
  for (const re of patterns) {
    const m = segment.match(re);
    if (m && !NOT_A_PERSON.has(wordKey(m[1])) && !/^\d/.test(m[1])) {
      return m[1].charAt(0).toUpperCase() + m[1].slice(1);
    }
  }
  return '';
}

// ─── 6. Comandos (navegación, notas, recordatorios) ─────────────────────────────────────────

export function cleanReminderTitle(raw: string): string {
  let text = raw;
  // Remover patrones de hora
  text = text.replace(/\ba\s+las\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)?\b/gi, '');
  text = text.replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)\b/gi, '');

  // Remover patrones de fecha / frecuencia
  text = text.replace(/\b(?:para\s+)?(?:mañana|hoy)\b/gi, '');
  text = text.replace(/\b(?:diario|diaria|cada\s+d[íi]a|todos\s+los\s+d[íi]as)\b/gi, '');
  text = text.replace(/\b(?:semanal|cada\s+semana|todas\s+las\s+semanas)\b/gi, '');
  text = text.replace(/\b(?:mensual|cada\s+mes|todos\s+los\s+meses)\b/gi, '');
  text = text.replace(/\b(?:el\s+d[íi]a\s+\d{1,2}|el\s+\d{1,2})\b/gi, '');

  // Limpiar espacios extras y conectores sobrantes al inicio/fin
  text = text.replace(/^\s*(?:de|para|a|en|que)\s+/gi, '');
  text = text.replace(/\s*(?:de|para|a|en)\s*$/gi, '');
  text = text.trim();

  if (!text) return raw.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Detecta comandos de navegación por voz o creación de notas/recordatorios.
 * Notas y recordatorios solo cuentan si la frase EMPIEZA con la palabra clave, y la navegación
 * solo si no se dijo ningún monto: así "pagué 120 mil de la nota de crédito" sigue siendo un gasto.
 */
export function detectVoiceCommand(text: string): ParsedVoiceCommand | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const hasMoney = extractAllAmounts(clean).length > 0;

  if (!hasMoney) {
    const navigation: [RegExp, string, string, string][] = [
      [/\b(?:estadísticas|estadisticas|gráficas|graficas|métricas|metricas|reporte de servicios)\b/i, '/servicios/estadisticas', 'Ver Estadísticas 📊', 'Abrir Estadísticas'],
      [/\b(?:configuración|configuracion|ajustes|mi perfil|perfil|centro de control)\b/i, '/configuracion', 'Abrir Configuración ⚙️', 'Abrir Configuración'],
      [/\b(?:mis notas|ver notas|abrir notas|lista de notas)\b/i, '/servicios/notas', 'Abrir Notas 📝', 'Ver mis Notas'],
      [/\b(?:mis recordatorios|ver recordatorios|abrir recordatorios|lista de recordatorios)\b/i, '/servicios/recordatorios', 'Abrir Recordatorios 🔔', 'Ver Recordatorios'],
      [/\b(?:mis gastos|ver gastos|abrir gastos|pantalla de gastos)\b/i, '/gastos', 'Ver Gastos 🔴', 'Ver Gastos'],
      [/\b(?:mis ingresos|ver ingresos|abrir ingresos|pantalla de ingresos)\b/i, '/ingresos', 'Ver Ingresos 🟢', 'Ver Ingresos'],
      [/\b(?:mis deudas|ver deudas|abrir deudas|pantalla de deudas)\b/i, '/deudas', 'Ver Deudas 🟡', 'Ver Deudas'],
    ];
    for (const [re, targetUrl, title, label] of navigation) {
      if (re.test(lower)) return { kind: 'command', action: 'navigate', targetUrl, title, label, rawText: text };
    }
  }

  // Crear Nota por Voz ("Nota recordar comprar leche")
  const noteMatch = clean.match(/^\s*(?:(?:crear|crea|agrega|agregar|guarda|guardar)\s+)?(?:una\s+)?(?:nueva\s+)?(?:nota|anotar|escribir\s+nota)\s+(.+)/i);
  if (noteMatch) {
    const noteText = noteMatch[1].trim();
    let title = '';
    let content = noteText;
    const titleMatch = noteText.match(/\b(?:t[íi]tulo|asunto)\s*[:\-]?\s*(.+?)(?:\s+(?:contenido|nota|texto|cuerpo)\s*[:\-]?\s*(.+)|$)/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      if (titleMatch[2]) content = titleMatch[2].trim();
    } else {
      const parts = noteText.split(/[:\-–—]/);
      if (parts.length > 1 && parts[0].trim().length < 30) {
        title = parts[0].trim();
        content = parts.slice(1).join('-').trim();
      } else {
        const words = noteText.split(/\s+/);
        title = words.length <= 4 ? noteText : words.slice(0, 3).join(' ');
      }
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);
    content = content.charAt(0).toUpperCase() + content.slice(1);

    return {
      kind: 'command',
      action: 'create_note',
      targetUrl: '/servicios/notas',
      title,
      content,
      label: 'Guardar Nota',
      rawText: text
    };
  }

  // Crear Recordatorio por Voz ("Recordatorio mensual pagar servicio 50 mil el 15 de septiembre")
  const reminderMatch = clean.match(/^\s*(?:(?:crear|crea|agrega|agregar|pon|poner)\s+)?(?:un\s+)?(?:nuevo\s+)?(?:recordatorio|recordarme|recuérdame|recuerdame)\s+(.+)/i);
  if (reminderMatch) {
    const reminderText = reminderMatch[1].trim();
    const amounts = extractAllAmounts(reminderText);
    const mainAmount = amounts.length > 0 ? amounts[0] : null;

    let frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';
    if (/\b(?:diario|diaria|cada día|todos los días)\b/i.test(reminderText)) {
      frequency = 'daily';
    } else if (/\b(?:semanal|cada semana|todas las semanas)\b/i.test(reminderText)) {
      frequency = 'weekly';
    } else if (/\b(?:mensual|cada mes|todos los meses)\b/i.test(reminderText)) {
      frequency = 'monthly';
    }

    let dueDate = new Date().toISOString().split('T')[0];
    if (/\bmañana\b/i.test(reminderText)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    }

    // Detección de Hora por Voz
    let time = '08:00';
    const timeMatch = reminderText.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|de la mañana|de la tarde|de la noche)?\b/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3]?.toLowerCase();
      if (period && (period.includes('pm') || period.includes('tarde') || period.includes('noche')) && hour < 12) {
        hour += 12;
      } else if (period && (period.includes('am') || period.includes('mañana')) && hour === 12) {
        hour = 0;
      }
      if (hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
        time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      }
    }

    const cleanTitle = cleanReminderTitle(reminderText);

    return {
      kind: 'command',
      action: 'create_reminder',
      targetUrl: '/servicios/recordatorios',
      title: 'Nuevo Recordatorio 🔔',
      content: cleanTitle,
      amount: mainAmount,
      frequency,
      dueDate,
      time,
      label: 'Guardar Recordatorio',
      rawText: text
    };
  }

  // Detección de Frases Cortas Incompletas (Diálogo Interactivo de 2 Vías)
  if (/^(?:recordatorio|un recordatorio|nuevo recordatorio)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      pendingAction: 'create_reminder',
      title: '🔔 Nuevo Recordatorio',
      prompt: '¿Qué deseas recordar, a qué hora y con qué frecuencia?',
      label: 'Responder',
      rawText: text
    };
  }

  if (/^(?:nota|una nota|nueva nota|nota importante|anotar)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      pendingAction: 'create_note',
      title: '📝 Nueva Nota Importante',
      prompt: '¿Cuál es el título y contenido de tu nota?',
      label: 'Responder',
      rawText: text
    };
  }

  if (/^(?:deuda|una deuda|nueva deuda|debo|me deben)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      title: 'Asistente de Voz 🎙️',
      prompt: '¿A quién le debes o quién te debe, y de cuánto es el monto?',
      label: 'Responder',
      rawText: text
    };
  }

  if (/^(?:tasa de interés|interés|interes)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      title: 'Asistente de Voz 🎙️',
      prompt: '¿Cuál es el porcentaje de interés mensual de esta deuda?',
      label: 'Responder',
      rawText: text
    };
  }

  if (/^(?:gasto|un gasto|nuevo gasto)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      pendingAction: 'create_expense',
      title: 'Asistente de Voz 🎙️',
      prompt: '¿De cuánto fue el gasto y en qué lo usaste?',
      label: 'Responder',
      rawText: text
    };
  }

  if (/^(?:ingreso|un ingreso|nuevo ingreso)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      pendingAction: 'create_income',
      title: 'Asistente de Voz 🎙️',
      prompt: '¿De cuánto fue el ingreso y por qué concepto?',
      label: 'Responder',
      rawText: text
    };
  }

  return null;
}

// ─── 7. Frase → lista de movimientos ───────────────────────────────────────────────────────

// Separadores entre movimientos; "1,5" o "1.500" no se cortan porque la coma/punto va pegada a un dígito
const CLAUSE_SPLIT_RE = /(\s*;\s*|\s*,(?!\d)\s*|\.(?=\s|$)\s*|\s+y\s+tambi[eé]n\s+|\s+y\s+|\s+e\s+|\s+pero\s+|\s+adem[aá]s\s+|\s+luego\s+|\s+despu[eé]s\s+|\s+tambi[eé]n\s+)/i;
const TOTAL_MARKER_RE = /\b(?:en\s+total|por\s+todo|todo\s+(?:fue|me\s+cost[oó]|sali[oó])|total)\b/i;

interface Segment { text: string; money: MoneyMatch[] }

// Divide una frase con varios montos seguidos ("5 mil cerveza 10 mil cigarrillos") en un tramo por monto
function splitByAmounts(text: string, money: MoneyMatch[]): Segment[] {
  const amounts = money.filter(m => m.isMoney);
  if (amounts.length <= 1) return [{ text, money }];

  const before = cleanDescription(text.slice(0, amounts[0].start));
  const segments: Segment[] = [];
  if (before && !detectType(normalizeText(text.slice(0, amounts[0].start)))) {
    // "cerveza 5 mil cigarrillos 10 mil": el concepto va antes de cada monto
    let from = 0;
    amounts.forEach((a, i) => {
      const to = i === amounts.length - 1 ? text.length : a.end;
      const piece = text.slice(from, to);
      segments.push({ text: piece, money: findMoney(piece) });
      from = to;
    });
  } else {
    // "gasté 5 mil en cerveza 10 mil en cigarrillos": el concepto va después de cada monto
    const prefix = text.slice(0, amounts[0].start);
    amounts.forEach((a, i) => {
      const to = i === amounts.length - 1 ? text.length : amounts[i + 1].start;
      const piece = (i === 0 ? prefix : '') + text.slice(a.start, to);
      segments.push({ text: piece, money: findMoney(piece) });
    });
  }
  return segments;
}

function splitIntoSegments(text: string): Segment[] {
  const parts = text.split(CLAUSE_SPLIT_RE);
  const clauses: { text: string; sep: string }[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    clauses.push({ text: parts[i] || '', sep: parts[i - 1] || '' });
  }

  // Las frases sin monto se pegan a la anterior ("45 mil en helado y ensalada") o a la siguiente
  const merged: string[] = [];
  let pending = '';
  for (const c of clauses) {
    if (!c.text.trim()) continue;
    const hasMoney = findMoney(c.text).some(m => m.isMoney);
    if (hasMoney) {
      merged.push(pending ? `${pending} ${c.text}` : c.text);
      pending = '';
    } else if (merged.length) {
      merged[merged.length - 1] += `${c.sep || ' '}${c.text}`;
    } else {
      pending = pending ? `${pending}${c.sep || ' '}${c.text}` : c.text;
    }
  }
  if (pending) {
    if (merged.length) merged[merged.length - 1] += ` ${pending}`;
    else merged.push(pending);
  }

  return merged.flatMap(t => splitByAmounts(t, findMoney(t)));
}

function buildTransaction(
  segmentText: string,
  money: MoneyMatch[],
  inherited: { type: TxType; direction?: 'debo' | 'me_deben' },
  categories: VoiceCategory[],
  rawText: string,
): ParsedVoiceResult {
  const normalized = normalizeText(segmentText).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
  const own = detectType(normalized);
  const type = own?.type ?? inherited.type;
  const direction = type === 'deuda' ? (own?.direction ?? inherited.direction ?? 'debo') : undefined;

  const amounts = money.filter(m => m.isMoney);
  let amount: number | null = amounts.length ? amounts.reduce((sum, m) => sum + m.value, 0) : null;
  let qtyNote = '';

  // Cantidad × precio unitario: "3 cervezas a 5 mil (cada una)"
  if (amounts.length === 1) {
    const qty = money.find(m => !m.isMoney && m.end <= amounts[0].start && Number.isInteger(m.value) && m.value >= 2);
    const between = qty ? segmentText.slice(qty.end, amounts[0].start) : '';
    const unitPrice = /\s(?:a|de\s+a)\s*$/i.test(between) || /\bcada\s+(?:un[oa]?|una)\b|\bc\/u\b/i.test(segmentText.slice(amounts[0].end));
    if (qty && unitPrice) {
      amount = qty.value * amounts[0].value;
      qtyNote = ` (${qty.value} × $${amounts[0].value.toLocaleString('es-CO')})`;
    }
  }

  // Interés de deudas ("al 2%", "con 3 por ciento de interés")
  let interestRate: number | undefined;
  const interestMatch = segmentText.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por\s*ciento)/i);
  if (type === 'deuda' && interestMatch) interestRate = parseFloat(interestMatch[1].replace(',', '.'));

  let description = segmentText;
  [...money].sort((a, b) => b.start - a.start).forEach(m => {
    if (m.isMoney) description = description.slice(0, m.start) + ' ' + description.slice(m.end);
  });
  description = description.replace(/(\d+(?:[.,]\d+)?)\s*(?:%|por\s*ciento)(?:\s+de\s+inter[eé]s)?/gi, ' ');
  description = description.replace(/\bcada\s+(?:un[oa]?|una)\b/gi, ' ');
  description = cleanDescription(description);

  if (type === 'deuda') {
    const person = detectPerson(segmentText, direction!);
    const title = direction === 'me_deben'
      ? (person ? `${person} me debe` : 'Me deben')
      : (person ? `Deuda con ${person}` : 'Deuda por voz');
    return {
      kind: 'transaction',
      type,
      amount,
      category: 'Otros',
      description: title + (interestRate ? ` (Interés: ${interestRate}%)` : ''),
      isFixed: false,
      rawText,
      debtPerson: person,
      interestRate,
      debtDirection: direction,
    };
  }

  const { category, merchant } = detectCategory(normalized, type, categories);
  return {
    kind: 'transaction',
    type,
    amount,
    category,
    description: (description || category) + qtyNote,
    isFixed: type === 'gasto' && isFixedExpenseCategory(category),
    rawText,
    merchant,
  };
}

/**
 * Parser de una sola frase (un movimiento). Se mantiene por compatibilidad.
 */
export function parseVoiceTransaction(text: string, customCategories: VoiceCategory[] = []): ParsedVoiceResult {
  const working = wordsToDigits(text.toLowerCase().trim());
  return buildTransaction(working, findMoney(working), { type: 'gasto' }, customCategories, text);
}

/**
 * Parser de frases compuestas: cada monto con su concepto es un movimiento, y cada uno conserva su
 * tipo (gasto, ingreso o deuda). Solo se suma en un único movimiento si se dice "en total".
 */
export function parseMultiVoiceTransaction(text: string, customCategories: VoiceCategory[] = []): ParsedVoiceItem[] {
  const clean = text.trim();
  if (!clean) return [];

  const command = detectVoiceCommand(clean);
  if (command) return [command];

  const working = wordsToDigits(clean.toLowerCase());

  // "compré cerveza y cigarrillos, en total 15 mil" → un solo movimiento por el total
  const totalMatch = working.match(TOTAL_MARKER_RE);
  if (totalMatch && totalMatch.index !== undefined) {
    const afterTotal = findMoney(working.slice(totalMatch.index)).filter(m => m.isMoney);
    if (afterTotal.length) {
      const offset = totalMatch.index;
      const totalMoney = { ...afterTotal[0], start: afterTotal[0].start + offset, end: afterTotal[0].end + offset };
      const others = findMoney(working).filter(m => m.start !== totalMoney.start);
      let textWithoutOthers = working;
      [...others].sort((a, b) => b.start - a.start).forEach(m => {
        if (m.isMoney) textWithoutOthers = textWithoutOthers.slice(0, m.start) + ' ' + textWithoutOthers.slice(m.end);
      });
      const cleaned = textWithoutOthers.replace(TOTAL_MARKER_RE, ' ');
      return [buildTransaction(cleaned, findMoney(cleaned), { type: 'gasto' }, customCategories, text)];
    }
  }

  const segments = splitIntoSegments(working);
  const results: ParsedVoiceItem[] = [];
  let inherited: { type: TxType; direction?: 'debo' | 'me_deben' } = { type: 'gasto' };

  for (const seg of segments) {
    const tx = buildTransaction(seg.text, seg.money, inherited, customCategories, text);
    inherited = { type: tx.type, direction: tx.debtDirection };
    if (tx.amount !== null || segments.length === 1) results.push(tx);
  }

  if (results.length === 0) {
    results.push(buildTransaction(working, findMoney(working), { type: 'gasto' }, customCategories, text));
  }
  return results;
}
