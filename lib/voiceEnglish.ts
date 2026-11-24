// Dictado en inglés: FLOWI entiende las frases con el mismo analizador del español (lib/voiceParser.ts).
// 1) englishToParserText cambia lo que da estructura a la frase (verbos, montos, fechas, conectores, medios de
//    pago y comandos) por su equivalente en español. Los sustantivos quedan en inglés, así la descripción del
//    gasto sale en inglés: "I spent 20 dollars on lunch" → "gaste 20 en lunch" → descripción "lunch".
// 2) englishCategoryHints agrega palabras en español solo para adivinar la categoría ("lunch" → "almuerzo").
// Sin dependencias de la app (lo usan las pruebas y el analizador).

let englishOn = false;
/** Lo pone el asistente según el idioma de la app; solo así se usan las pistas en inglés para la categoría. */
export function setVoiceEnglish(on: boolean) { englishOn = on; }
export function isVoiceEnglish() { return englishOn; }

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES: Record<string, number> = { thousand: 1000, grand: 1000, million: 1000000, millions: 1000000 };

/** "twenty five thousand" → 25000, "one hundred and fifty" → 150, "half a million" → 500000. */
export function englishNumbersToDigits(text: string): string {
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  let i = 0;
  const isNum = (w: string) => {
    const k = w.toLowerCase().replace(/[,.]$/, '');
    return k in UNITS || k in TENS || k === 'hundred' || k in SCALES || /^\d+([.,]\d+)?$/.test(k) || k === 'a' || k === 'and';
  };
  while (i < words.length) {
    const w = words[i].toLowerCase();
    // "half a million" / "half a thousand"
    if (w === 'half' && /^\s+$/.test(words[i + 1] || '') && (words[i + 2] || '').toLowerCase() === 'a' && /^(million|thousand)$/i.test(words[i + 4] || '')) {
      out.push(String((SCALES[(words[i + 4] || '').toLowerCase()] || 0) / 2));
      i += 5; continue;
    }
    const k = w.replace(/[,.]$/, '');
    if (!(k in UNITS || k in TENS || k === 'hundred' || (/^\d+([.,]\d+)?$/.test(k) && SCALES[(words[i + 2] || '').toLowerCase()]))) { out.push(words[i]); i++; continue; }
    // Junta una secuencia de palabras numéricas
    let total = 0, current = 0, j = i, used = false;
    while (j < words.length) {
      const t = words[j];
      if (/^\s+$/.test(t)) { j++; continue; }
      const key = t.toLowerCase().replace(/[,.]$/, '');
      if (key in UNITS) { current += UNITS[key]; used = true; }
      else if (key in TENS) { current += TENS[key]; used = true; }
      else if (/^\d+([.,]\d+)?$/.test(key)) { current += Number(key.replace(',', '.')); used = true; }
      else if (key === 'hundred') { current = (current || 1) * 100; }
      else if (key in SCALES) { total += (current || 1) * SCALES[key]; current = 0; }
      else if ((key === 'and' || key === 'a') && used && isNum(words[j + 2] || '')) { /* "one hundred and five" */ }
      else break;
      j++;
    }
    // no consumir el espacio final
    while (j > i && /^\s+$/.test(words[j - 1])) j--;
    out.push(String(total + current));
    i = j;
  }
  return out.join('');
}

// Frases (de la más larga a la más corta) → equivalente en español que entiende el analizador
const PHRASES: [RegExp, string][] = [
  // Tasas, plazos y días de pago (formularios de deudas, CDT y ahorros)
  [/(\d+)\.(\d{1,2})(?!\d)/g, '$1,$2'],
  [/\bat\s+(\d+(?:,\d+)?)\s*(?:%|percent\b)/gi, 'al $1 %'],
  [/\b(\d+(?:,\d+)?)\s*percent\b/gi, '$1 %'],
  [/\bon\s+the\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi, 'los $1'],
  [/\b(?:i\s+)?pay\s+(?=los\s)/gi, 'pago '],
  [/\b(\d+)\s+months?\b/gi, '$1 meses'],
  [/\b(\d+)\s+years?\b/gi, '$1 años'],
  [/\b(\d+)\s+days?\b/gi, '$1 días'],
  [/\ba\s+month\b|\bper\s+month\b/gi, 'mensual'],
  [/\ba\s+year\b|\bper\s+year\b|\bannual(?:ly)?\b/gi, 'anual'],
  // Antes que "lent": "lent me" es que me prestaron
  [/\blent\s+me\b|\bloaned\s+me\b|\b(?:i\s+)?borrowed\b/gi, 'me prestaron'],
  [/\b(?:i\s+)?invested\b/gi, 'inverti'],
  [/\bnow\s+has\b|\bis\s+worth\b|\bit\s+has\b/gi, 'ya tiene'],
  // Ingresos
  [/\b(?:i\s+)?got\s+paid\b|\bthey\s+paid\s+me\b|\bpaid\s+me\b/gi, 'me pagaron'],
  [/\b(?:i\s+)?received\b|\b(?:i\s+)?got\b(?=\s+\d)/gi, 'recibi'],
  [/\b(?:i\s+)?earned\b|\b(?:i\s+)?made\b(?=\s+\d)/gi, 'gane'],
  [/\b(?:i\s+)?sold\b/gi, 'vendi'],
  [/\bsalary\b|\bpaycheck\b|\bwages?\b/gi, 'sueldo'],
  [/\brefund\b/gi, 'reembolso'],
  [/\btip\b|\btips\b/gi, 'propina'],
  [/\bincome\b/gi, 'ingreso'],
  // Deudas
  [/\b(?:they|he|she)\s+owes?\s+me\b|\bowes\s+me\b|\bowe\s+me\b/gi, 'me deben'],
  [/\b(?:i\s+)?lent\b|\b(?:i\s+)?loaned\b/gi, 'le preste'],
  [/\b(?:i\s+)?borrowed\b|\blent\s+me\b|\bloaned\s+me\b/gi, 'me prestaron'],
  [/\bi\s+owe\b/gi, 'le debo'],
  [/\bdebts?\b|\bloan\b/gi, 'deuda'],
  // Gastos
  [/\b(?:i\s+)?spent\b|\b(?:i\s+)?paid\b|\b(?:i\s+)?bought\b|\bit\s+cost\b|\bcosts?\b|\bcharged\s+me\b/gi, 'gaste'],
  [/\bexpenses?\b/gi, 'gasto'],
  // Fechas
  [/\bthe\s+day\s+before\s+yesterday\b/gi, 'antier'],
  [/\byesterday\b/gi, 'ayer'],
  [/\blast\s+night\b/gi, 'anoche'],
  [/\btoday\b/gi, 'hoy'],
  [/\bthis\s+morning\b/gi, 'esta manana'],
  [/\btonight\b/gi, 'esta noche'],
  [/\btomorrow\b/gi, 'manana'],
  // Comandos, notas y recordatorios
  [/\bremind\s+me\s+(?:to\s+)?/gi, 'recuerdame '],
  [/\breminder\b/gi, 'recordatorio'],
  [/\btake\s+a\s+note\b|\bwrite\s+down\b|\bnote\s+that\b/gi, 'anota'],
  [/\bnote\b/gi, 'nota'],
  [/\b(?:open|go\s+to|show(?:\s+me)?)\s+/gi, 'abre '],
  [/\bstatistics\b|\bstats\b/gi, 'estadisticas'],
  [/\bevery\s+month\b|\bmonthly\b/gi, 'cada mes'],
  [/\bevery\s+week\b|\bweekly\b/gi, 'cada semana'],
  [/\bevery\s+day\b|\bdaily\b/gi, 'todos los dias'],
  [/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/gi, 'a las $1:$2 $3'],
  // Medios de pago
  [/\b(?:with|by|using)\s+(?:a\s+|my\s+)?(?:credit\s+)?card\b/gi, 'con tarjeta credito'],
  [/\b(?:with|in|using)\s+cash\b|\bcash\b/gi, 'con efectivo'],
  [/\b(?:with|by|using|from|through|via)\s+(?=[a-z])/gi, 'con '],
  // Montos
  [/\bbucks?\b|\bdollars?\b|\bpesos\b|\bcop\b/gi, 'pesos'],
  [/\bthousand\b|\bgrand\b/gi, 'mil'],
  [/\bmillions?\b/gi, 'millones'],
  // Conectores
  [/\s+and\s+also\s+|\s+and\s+then\s+|\s+and\s+/gi, ' y '],
  [/\s+(?:on|for|at|in)\s+/gi, ' en '],
  [/\s+to\s+/gi, ' a '],
  [/\bfrom\b/gi, 'de'],
];

/** Convierte una frase dictada en inglés en algo que el analizador en español entiende. */
export function englishToParserText(text: string): string {
  let t = ' ' + englishNumbersToDigits(text) + ' ';
  for (const [re, rep] of PHRASES) t = t.replace(re, rep);
  return t.replace(/\s+/g, ' ').replace(/:\s/g, ' ').trim();
}

// Pistas para la categoría: palabra en inglés → palabra en español que ya reconoce el analizador
const HINTS: [RegExp, string][] = [
  [/\blunch\b/, 'almuerzo'], [/\bbreakfast\b/, 'desayuno'], [/\bdinner\b|\bsupper\b/, 'cena'], [/\bcoffee\b/, 'tinto'],
  [/\bbeers?\b/, 'cerveza'], [/\bwine\b/, 'vino'], [/\bliquor\b|\bdrinks?\b/, 'licor'], [/\bsnacks?\b/, 'mecato'],
  [/\bgroceries\b|\bgrocery\b|\bsupermarket\b/, 'mercado'], [/\bbread\b|\bbakery\b/, 'pan'], [/\beggs?\b/, 'huevos'], [/\bmilk\b/, 'leche'],
  [/\brestaurant\b|\bfood\b|\bmeal\b/, 'restaurante'], [/\bpizza\b/, 'pizza'], [/\bburgers?\b|\bhamburgers?\b/, 'hamburguesa'],
  [/\bgas(?:oline)?\b|\bfuel\b|\bpetrol\b/, 'gasolina'], [/\btaxi\b|\bcab\b/, 'taxi'], [/\buber\b/, 'uber'], [/\bbus\b|\bsubway\b|\bmetro\b/, 'bus'],
  [/\bparking\b/, 'parqueadero'], [/\btolls?\b/, 'peaje'],
  [/\brent\b/, 'arriendo'], [/\belectricity\b|\bpower\s+bill\b/, 'luz'], [/\bwater\s+bill\b|\bwater\b/, 'agua'], [/\binternet\b|\bwifi\b/, 'internet'],
  [/\bphone\s+bill\b|\bcell\s+phone\b|\bphone\b/, 'celular'],
  [/\bpharmacy\b|\bmedicine\b|\bdrugstore\b/, 'drogueria'], [/\bdoctor\b/, 'medico'], [/\bdentist\b/, 'odontologo'],
  [/\bgym\b/, 'gimnasio'], [/\bmovies?\b|\bcinema\b/, 'cine'], [/\bclothes\b|\bclothing\b|\bshirt\b|\bjeans\b/, 'ropa'], [/\bshoes\b|\bsneakers\b/, 'zapatos'],
  [/\bhaircut\b|\bbarber\b/, 'peluqueria'], [/\bschool\b/, 'colegio'], [/\bbooks?\b/, 'libros'], [/\bcourse\b|\bclass\b|\btuition\b/, 'curso'],
  [/\bpets?\b|\bdog\s+food\b|\bcat\s+food\b|\bvet\b/, 'mascota'], [/\bgifts?\b|\bpresents?\b/, 'regalo'], [/\btravel\b|\bflights?\b|\bhotel\b/, 'viaje'],
  [/\binsurance\b/, 'seguro'], [/\btaxes?\b/, 'impuesto'], [/\bsavings?\b/, 'ahorro'],
  [/\bsalary\b|\bpaycheck\b/, 'salario'], [/\bfreelance\b|\bclient\b/, 'freelance'], [/\binterest\b/, 'intereses'],
];

/** Palabras en español que se agregan solo para buscar la categoría (no cambian la descripción). */
export function englishCategoryHints(normalized: string): string {
  if (!englishOn) return '';
  const extra: string[] = [];
  for (const [re, word] of HINTS) if (re.test(normalized)) extra.push(word);
  return extra.length ? ' ' + extra.join(' ') : '';
}

/**
 * Lo que arma el analizador en español, dicho en inglés: "Juan me debe" → "Juan owes me",
 * "Deuda con Juan" → "Debt with Juan", "Beer con nequi" → "Beer with nequi".
 */
export function englishDescription(desc: string): string {
  if (!desc) return desc;
  return desc
    .replace(/^(.+?) me debe$/i, '$1 owes me')
    .replace(/^Me deben$/i, 'Owed to me')
    .replace(/^Deuda con (.+)$/i, 'Debt with $1')
    .replace(/^Deuda por voz$/i, 'Debt')
    .replace(/\s+con\s+/gi, ' with ')
    .replace(/\s+en\s+/gi, ' on ')
    .replace(/\s+y\s+/gi, ' and ');
}
