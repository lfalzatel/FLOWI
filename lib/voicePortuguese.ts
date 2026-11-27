// Dictado en portugués (pt-PT): FLOWI entiende las frases con el mismo analizador del español (lib/voiceParser.ts).
// 1) portugueseToParserText cambia lo que da estructura a la frase (verbos, montos, fechas, conectores, medios de
//    pago y comandos) por su equivalente en español. Los sustantivos quedan en portugués, así la descripción del
//    gasto sale en portugués: "Gastei 20 euros no almoço" → "gaste 20 pesos en almoço" → descripción "Almoço".
// 2) portugueseCategoryHints agrega palabras en español solo para adivinar la categoría ("almoço" → "almuerzo").
// Sin dependencias de la app (lo usan las pruebas y el analizador).

let portugueseOn = false;
/** Lo activa el asistente cuando la app está en portugués; así solo entonces se usan las pistas en portugués. */
export function setVoicePortuguese(on: boolean) { portugueseOn = on; }
export function isVoicePortuguese() { return portugueseOn; }

const UNITS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, 'três': 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  catorze: 14, quatorze: 14, quinze: 15, dezasseis: 16, dezesseis: 16,
  dezassete: 17, dezessete: 17, dezoito: 18, dezanove: 19, dezenove: 19,
};
const TENS: Record<string, number> = {
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
};
const HUNDREDS: Record<string, number> = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600, setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const SCALES: Record<string, number> = {
  mil: 1000, milhao: 1000000, 'milhão': 1000000, milhoes: 1000000, 'milhões': 1000000,
};
const ARTICLES = new Set(['um', 'uma']);
const CURRENCY_NEXT = /^(?:euros?|eur|c[êe]ntimos?|d[óo]lares?|reais|pesos?|%|por)$/i;

/** "vinte e cinco mil" → "25000", "cento e cinquenta" → "150", "meio milhão" → "500000". */
export function portugueseNumbersToDigits(text: string): string {
  const words = text.split(/(\s+)/);
  const out: string[] = [];
  let i = 0;
  const clean = (s: string) => (s || '').toLowerCase().replace(/[,.!?]+$/, '');
  const isWordNum = (w: string) => {
    const k = clean(w);
    return k in UNITS || k in TENS || k in HUNDREDS || k in SCALES;
  };
  while (i < words.length) {
    const w = clean(words[i]);
    const prevW = i >= 2 ? clean(words[i - 2] || '') : '';
    const nextW = clean(words[i + 2] || '');
    // "por cento" es porcentaje (salvo "por cento e cinquenta" = "por 150")
    const afterCentoIsNum = nextW === 'e' && isWordNum(words[i + 4] || '');
    if (w === 'cento' && prevW === 'por' && !afterCentoIsNum) {
      out.push(words[i]);
      i++; continue;
    }
    // "meio milhão" / "meio mil"
    if (w === 'meio' && /^\s+$/.test(words[i + 1] || '') && nextW in SCALES) {
      out.push(String(SCALES[nextW] / 2));
      i += 3; continue;
    }
    // "um café" o "uma cerveja": artículo indefinido, no el monto 1 (salvo "um milhão", "um euro", "um por cento")
    if (ARTICLES.has(w) && !(nextW in SCALES) && !CURRENCY_NEXT.test(nextW)) {
      out.push(words[i]);
      i++; continue;
    }
    const digitWithScale = /^\d+([.,]\d+)?$/.test(w) && nextW in SCALES;
    if (!(isWordNum(w) || digitWithScale)) {
      out.push(words[i]);
      i++; continue;
    }
    let total = 0, current = 0, j = i, used = false;
    while (j < words.length) {
      const tok = words[j];
      if (/^\s+$/.test(tok)) { j++; continue; }
      const key = clean(tok);
      const afterKey = clean(words[j + 2] || '');
      if (key in UNITS) { current += UNITS[key]; used = true; }
      else if (key in TENS) { current += TENS[key]; used = true; }
      else if (key in HUNDREDS) { current += HUNDREDS[key]; used = true; }
      else if (/^\d+([.,]\d+)?$/.test(key) && (!used || afterKey in SCALES)) {
        current += Number(key.replace(',', '.'));
        used = true;
      } else if (key in SCALES) {
        total += (current || 1) * SCALES[key];
        current = 0;
        used = true;
        // "um milhão e meio"
        if (clean(words[j + 2] || '') === 'e' && clean(words[j + 4] || '') === 'meio') {
          total += SCALES[key] / 2;
          j += 5;
          continue;
        }
      } else if (key === 'e' && used && isWordNum(words[j + 2] || '')) {
        // "vinte e cinco", "cento e cinquenta", "mil e duzentos"
      } else {
        break;
      }
      j++;
    }
    while (j > i && /^\s+$/.test(words[j - 1])) j--;
    const trailing = (words[j - 1].match(/[,.!?]+$/) || [''])[0];
    out.push(String(total + current) + trailing);
    i = j;
  }
  return out.join('');
}

// Frases (de la más larga a la más corta) → equivalente en español que entiende el analizador
const PHRASES: [RegExp, string | ((...args: string[]) => string)][] = [
  // "12 euros e 50 cêntimos" / "2 euros e 50" → "12,50 euros"
  [/\b(\d+)\s+euros?\s+e\s+(\d{1,2})(?:\s+c[êe]ntimos?)?\b/gi, (_: string, e: string, c: string) => `${e},${String(c).padStart(2, '0')} euros`],
  [/(\d+)\.(\d{1,2})(?!\d)/g, '$1,$2'],
  // Tasas, plazos, meses y días de pago (formularios de deudas, depósitos e inversiones)
  [/\ba\s+(\d+(?:,\d+)?)\s*(?:%|por\s+cento\b)/gi, 'al $1 %'],
  [/\b(\d+(?:,\d+)?)\s*por\s+cento\b/gi, '$1 %'],
  [/\b(?:pago\s+)?no\s+dia\s+(\d{1,2})\b/gi, (m: string, d: string) => (/^pago/i.test(m) ? `pago los ${d}` : `el ${d}`)],
  [/\baos?\s+dias?\s+(\d{1,2})\b/gi, 'los $1'],
  [/\b(\d+)\s+m[êe]s\b/gi, '$1 meses'],
  [/\b(\d+)\s+anos?\b/gi, '$1 años'],
  [/\b(\d+)\s+dias?\b/gi, '$1 días'],
  [/\bao\s+m[êe]s\b|\bpor\s+m[êe]s\b|\bmensais\b|\bmensal\b/gi, 'mensual'],
  [/\bao\s+ano\b|\bpor\s+ano\b|\banuais\b|\banual(?:mente)?\b/gi, 'anual'],
  [/\bdep[óo]sitos?\s+a\s+prazo\b/gi, 'CDT'],
  [/\bcr[ée]dito\s+pessoal\b|\bempr[ée]stimo\s+pessoal\b|\bempr[ée]stimo\b/gi, 'crédito'],
  [/\bdesembolso\s+a\s+(\d{1,2})\s+de\s+/gi, 'desembolso el $1 de '],
  [/\bdesde\s+(\d{1,2})\s+de\s+/gi, 'desde el $1 de '],
  [/\bde\s+janeiro\b/gi, 'de enero'], [/\bde\s+fevereiro\b/gi, 'de febrero'], [/\bde\s+mar[çc]o\b/gi, 'de marzo'],
  [/\bde\s+abril\b/gi, 'de abril'], [/\bde\s+maio\b/gi, 'de mayo'], [/\bde\s+junho\b/gi, 'de junio'],
  [/\bde\s+julho\b/gi, 'de julio'], [/\bde\s+agosto\b/gi, 'de agosto'], [/\bde\s+setembro\b/gi, 'de septiembre'],
  [/\bde\s+outubro\b/gi, 'de octubre'], [/\bde\s+novembro\b/gi, 'de noviembre'], [/\bde\s+dezembro\b/gi, 'de diciembre'],
  [/\binvesti\b/gi, 'inverti'],
  [/\bj[áa]\s+tem\b|\bagora\s+tem\b|\bvale\s+agora\b/gi, 'ya tiene'],
  [/\bj[áa]\s+(?:lhe\s+)?paguei\b/gi, 'ya le pagué'],
  // Correcciones por voz
  [/\beram\s+(?=\d)/gi, 'eran '],
  [/\bforam\s+(?=\d)/gi, 'fueron '],
  [/\bp[õo]e(?:-o|\s+isso)?\s+(?:em|no|na)\s+|\bmuda\s+para\s+/gi, 'ponlo en '],
  [/\bfoi\s+ontem\b/gi, 'fue ayer'],
  [/\bfoi\s+(?:a|no\s+dia)\s+(\d{1,2})\s+de\s+/gi, 'fue el $1 de '],
  [/\ba\s+categoria\s+[ée]\s+/gi, 'la categoría es '],
  [/\b[ée]\s+uma?\s+receita\b/gi, 'es un ingreso'],
  [/\ba\s+descri[çc][ãa]o\s+[ée]\s+/gi, 'la descripción es '],
  // Deudas (antes que gastos/ingresos)
  [/\ba\s+minha\s+irm[ãa]\b|\bminha\s+irm[ãa]\b/gi, 'mi hermana'],
  [/\bo\s+meu\s+irm[ãa]o\b|\bmeu\s+irm[ãa]o\b/gi, 'mi hermano'],
  [/\bemprestaram-me\b|\bme\s+emprestaram\b|\bpedi\s+emprestado\b/gi, 'me prestaron'],
  [/\bemprestou-me\b|\bme\s+emprestou\b/gi, 'me prestó'],
  [/\bdeve-me\b|\bdevem-me\b|\bficou\s+a\s+dever-me\b|\bme\s+devem?\b/gi, 'me debe'],
  [/\bemprestei(?:-lhe)?\b/gi, 'le preste'],
  [/\bdevo(?:-lhe)?\b|\bfiquei\s+a\s+dever\b/gi, 'le debo'],
  [/\bd[íi]vidas?\b/gi, 'deuda'],
  // Ingresos
  [/\bpagaram-me\b|\bme\s+pagaram\b|\bcaiu\s+o\s+ordenado\b|\bcaiu\s+o\s+sal[áa]rio\b/gi, 'me pagaron'],
  [/\brecebi\b/gi, 'recibi'],
  [/\bganhei\b/gi, 'gane'],
  [/\bvendi\b/gi, 'vendi'],
  [/\bsal[áa]rio\b|\bordenado\b|\bvencimento\b/gi, 'sueldo'],
  [/\breembolso\b|\bdevolu[çc][ãa]o\b/gi, 'reembolso'],
  [/\bgorjetas?\b/gi, 'propina'],
  [/\breceitas?\b|\brendimentos?\b/gi, 'ingreso'],
  // Gastos
  [/\bgastei\b|\bpaguei\b|\bcomprei\b|\bcustou(?:-me)?\b|\bcobraram(?:-me)?\b/gi, 'gaste'],
  [/\bdespesas?\b/gi, 'gasto'],
  // Fechas
  [/\banteontem\b/gi, 'antier'],
  [/\bontem\s+[àa]\s+noite\b/gi, 'anoche'],
  [/\bontem\b/gi, 'ayer'],
  [/\bhoje\s+de\s+manh[ãa]\b|\besta\s+manh[ãa]\b/gi, 'esta manana'],
  [/\bhoje\s+[àa]\s+noite\b|\besta\s+noite\b/gi, 'esta noche'],
  [/\bhoje\b/gi, 'hoy'],
  [/\bamanh[ãa]\b/gi, 'manana'],
  // Comandos, notas y recordatorios
  [/\blembra-me\s+(?:de\s+)?|\blembre-me\s+(?:de\s+)?/gi, 'recuerdame '],
  [/\blembretes?\b/gi, 'recordatorio'],
  [/\baponta\b|\btoma\s+nota\b/gi, 'anota'],
  [/\b(?:abre|ir\s+para|mostra(?:-me)?)\s+/gi, 'abre '],
  [/\bestat[íi]sticas\b/gi, 'estadisticas'],
  [/\btodos\s+os\s+meses\b|\bcada\s+m[êe]s\b/gi, 'cada mes'],
  [/\btodas\s+as\s+semanas\b|\bcada\s+semana\b/gi, 'cada semana'],
  [/\btodos\s+os\s+dias\b|\bdiariamente\b/gi, 'todos los dias'],
  [/\b[àa]s\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|da\s+manh[ãa]|da\s+tarde|da\s+noite)?/gi, (_: string, h: string, m: string, p: string) => {
    const per = p ? (/tarde|noite|pm/i.test(p) ? ' pm' : ' am') : '';
    return `a las ${h}${m ? ':' + m : ''}${per}`;
  }],
  // Medios de pago habituales en Portugal y general
  [/\b(?:com|por|pelo|pela|no|via)\s+mb\s*way\b|\bmb\s*way\b/gi, 'con MB WAY'],
  [/\b(?:com|por|pelo|no)\s+multibanco\b/gi, 'con Multibanco'],
  [/\b(?:com|por|pelo|no)\s+revolut\b/gi, 'con Revolut'],
  [/\b(?:com|no|pelo)\s+(?:o\s+|meu\s+)?cart[ãa]o(?:\s+de\s+cr[ée]dito)?\b/gi, 'con tarjeta credito'],
  [/\b(?:em|com)\s+dinheiro\b|\bem\s+numer[áa]rio\b/gi, 'con efectivo'],
  [/\b(?:com|pelo|pela|atrav[ée]s\s+de|via)\s+(?=[a-záàâãéêíóôõúç])/gi, 'con '],
  // Monedas
  [/\beuros?\b|\beur\b|\bd[óo]lares?\b|\breais\b|\bcop\b/gi, 'pesos'],
  [/(\d)\s*€/g, '$1 pesos'],
  [/€\s*(\d)/g, '$$$1'],
  [/\bmilh[ãa]o\b/gi, 'millon'],
  [/\bmilh[õo]es\b/gi, 'millones'],
  // Conectores
  [/\s+e\s+tamb[ée]m\s+|\s+e\s+depois\s+|\s+e\s+/gi, ' y '],
  [/\s+(?:no|na|nos|nas|em|num|numa)\s+/gi, ' en '],
  [/\s+(?:ao|à)\s+/gi, ' a '],
  [/\s+para\s+(?:o|a)\s+/gi, ' para '],
];

/** Convierte una frase dictada en portugués en algo que el analizador en español entiende. */
export function portugueseToParserText(text: string): string {
  let t = ' ' + portugueseNumbersToDigits(text) + ' ';
  for (const [re, rep] of PHRASES) t = t.replace(re, rep as any);
  return t.replace(/\s+/g, ' ').trim();
}

// Pistas para la categoría (sobre texto normalizado sin tildes ni cedillas: "almoço" → "almoco")
const HINTS: [RegExp, string][] = [
  [/\balmocos?\b/, 'almuerzo'], [/\bpequeno[- ]almoco\b/, 'desayuno'], [/\bjantar(?:es)?\b/, 'cena'],
  [/\bcafes?\b|\bbica\b|\bgalao\b|\bpastel\s+de\s+nata\b|\blanche\b/, 'tinto'],
  [/\bcervejas?\b|\bfino\b|\bimperial\b/, 'cerveza'], [/\bvinhos?\b/, 'vino'], [/\bbebidas?\b|\bbar\b/, 'licor'],
  [/\bsupermercado\b|\bcompras?\b|\bcontinente\b|\bpingo\s+doce\b|\bmercadona\b|\blidl\b|\baldi\b|\bauchan\b|\bminipreco\b/, 'mercado'],
  [/\bpadaria\b|\bpao\b/, 'pan'], [/\btalho\b|\bcarne\b|\bfrango\b/, 'carne'], [/\bfruta\b|\blegumes\b/, 'verduras'],
  [/\brestaurantes?\b|\brefeicao\b/, 'restaurante'], [/\bhamburguer\b|\bpizza\b/, 'hamburguesa'],
  [/\bgasolina\b|\bgasoleo\b|\bcombustivel\b|\bgalp\b|\brepsol\b|\bbp\b|\bcepsa\b|\bprio\b/, 'gasolina'],
  [/\btaxi\b|\buber\b|\bbolt\b|\btvde\b/, 'uber'], [/\bautocarro\b|\bcomboio\b|\bmetro\b|\bel[eé]trico\b|\bnavegante\b|\bandante\b/, 'bus'],
  [/\bestacionamento\b|\bparque\b/, 'parqueadero'], [/\bportagens?\b|\bportagem\b|\bvia\s+verde\b/, 'peaje'],
  [/\brenda\b|\baluguer\b/, 'arriendo'], [/\bcondominio\b/, 'administracion'],
  [/\bluz\b|\beletricidade\b|\bedp\b|\bendesa\b|\biberdrola\b/, 'luz'], [/\bagua\b/, 'agua'],
  [/\bgas\b|\bgarlei?\b|\bbotija\b/, 'gas'], [/\binternet\b|\bwifi\b|\bfibra\b|\bmeo\b|\bnos\b|\bvodafone\b|\bdigi\b/, 'internet'],
  [/\btelemovel\b|\bcarregamento\b/, 'celular'],
  [/\bfarmacia\b|\bremedios?\b|\bmedicamentos?\b/, 'drogueria'], [/\bmedico\b|\bconsulta\b/, 'medico'], [/\bdentista\b/, 'odontologo'],
  [/\bginasio\b/, 'gimnasio'], [/\bcinema\b|\bfilmes?\b/, 'cine'],
  [/\broupa\b|\bcamisola\b|\bcalcas\b|\bvestido\b/, 'ropa'], [/\bsapatos?\b|\bsapatilhas?\b|\btenis\b/, 'zapatos'],
  [/\bcabeleireiro\b|\bbarbeiro\b/, 'peluqueria'], [/\bescola\b|\bpropinas?\b|\buniversidade\b|\bcurso\b/, 'colegio'],
  [/\blivros?\b/, 'libros'], [/\banimal\b|\bcao\b|\bgato\b|\bracao\b|\bveterinario\b/, 'mascota'],
  [/\bpresentes?\b|\bprendas?\b/, 'regalo'], [/\bviagem\b|\bvoos?\b|\bhotel\b/, 'viaje'],
  [/\bseguro\b/, 'seguro'], [/\bimpostos?\b|\birs\b|\bibi\b|\bimi\b|\biuc\b/, 'impuesto'], [/\bpoupanca\b/, 'ahorro'],
  [/\bsalario\b|\bordenado\b|\bvencimento\b/, 'salario'], [/\bcliente\b|\bfreelance\b/, 'freelance'], [/\bjuros\b/, 'intereses'],
];

/** Palabras en español que se agregan solo para buscar la categoría (no cambian la descripción). */
export function portugueseCategoryHints(normalized: string): string {
  if (!portugueseOn) return '';
  const extra: string[] = [];
  for (const [re, word] of HINTS) if (re.test(normalized)) extra.push(word);
  return extra.length ? ' ' + extra.join(' ') : '';
}

/**
 * Lo que arma el analizador en español, dicho en portugués (pt-PT):
 * "João me debe" → "João deve-me", "Deuda con João" → "Dívida com João".
 */
export function portugueseDescription(desc: string): string {
  if (!desc) return desc;
  const cleaned = desc
    .replace(/^(?:O|A|Os|As|Do|Da|Dos|Das|Um|Uma)\s+/i, '')
    .replace(/^(.+?) me debe$/i, '$1 deve-me')
    .replace(/^Me deben$/i, 'Devem-me')
    .replace(/^Deuda con (.+)$/i, 'Dívida com $1')
    .replace(/^Deuda por voz$/i, 'Dívida')
    .replace(/\s+con\s+/gi, ' com ')
    .replace(/\s+en\s+/gi, ' em ')
    .replace(/\s+y\s+/gi, ' e ');
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : desc;
}
