import { BASE_CATEGORIES, isFixedExpenseCategory } from './firestore';

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
}

export interface ParsedVoiceCommand {
  kind: 'command';
  action: 'navigate' | 'create_note' | 'create_reminder' | 'ask_followup';
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
export function speakText(text: string, lang: string = 'es-CO', onDone?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
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

const NUMBER_WORDS: Record<string, number> = {
  'un': 1, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
  'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
  'dieciseis': 16, 'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20,
  'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60, 'setenta': 70, 'ochenta': 80, 'noventa': 90,
  'cien': 100, 'ciento': 100, 'doscientos': 200, 'trescientos': 300, 'cuatrocientos': 400, 'quinientos': 500,
  'seiscientos': 600, 'setecientos': 700, 'ochocientos': 800, 'novecientos': 900,
};

const CATEGORY_KEYWORDS: { category: string; regex: RegExp }[] = [
  // Licores y Bares (Prioridad alta)
  {
    category: 'Licores y Bares',
    regex: /\b(?:cerveza|cervezas|pola|polas|cigarro|cigarros|cigarrillo|cigarrillos|tabaco|licor|licores|trago|tragos|ron|aguardiente|whisky|whiskey|tequila|vodka|vino|vinos|coctel|cóctel|cocteles|cócteles|bar|bares|pub|discoteca|antro|estanco)\b/i
  },
  // Restaurantes y Comida
  {
    category: 'Restaurantes',
    regex: /\b(?:almuerzo|cena|desayuno|restaurante|restaurantes|comida|hamburguesa|pizza|frisby|perro caliente|asado|corrientazo|sushi|tacos|mcdonalds|kfc|subway|dominos)\b/i
  },
  // Café y Antojos
  {
    category: 'Café y Antojos',
    regex: /\b(?:café|cafe|capuchino|tinto|panadería|panaderia|antojo|postre|helado|popsy|donas|dunkin|starbucks)\b/i
  },
  // Mercado y Compras
  {
    category: 'Mercado',
    regex: /\b(?:mercado|supermercado|d1|olimpica|jumbo|carulla|exito|éxito|verdura|fruta|carniceria|tienda|minimercado|groceries)\b/i
  },
  // Transporte y Vehículos
  {
    category: 'Transporte',
    regex: /\b(?:gasolina|combustible|uber|didi|cabify|indriver|taxi|bus|transporte|peaje|parqueadero|parking|pasaje|metro)\b/i
  },
  // Arriendo
  {
    category: 'Arriendo',
    regex: /\b(?:arriendo|alquiler|apto|apartamento|renta)\b/i
  },
  // Servicios Domésticos / Conectividad
  {
    category: 'Claro Hogar',
    regex: /\b(?:claro|internet|wifi|epm|luz|agua|gas|efigas|alcanos|telefonía|telefonia)\b/i
  },
  // Suscripciones
  {
    category: 'Suscripciones',
    regex: /\b(?:netflix|spotify|disney|prime|youtube|hbo|apple|icloud|playstation|xbox|gym|gimnasio)\b/i
  },
  // Salud y Medicamentos
  {
    category: 'Salud',
    regex: /\b(?:farmacia|drogueria|droguería|medicina|medicamentos|pastillas|doctor|médico|medico|cita médica|consulta|eps|salud)\b/i
  },
  // Deudas / Préstamos
  {
    category: 'Deudas y Créditos',
    regex: /\b(?:prestamo|préstamo|tarjeta de crédito|tarjeta|banco|cuota|crédito|credito|hipoteca|deuda|intereses)\b/i
  },
  // Sueldo / Ingresos
  {
    category: 'Sueldo',
    regex: /\b(?:sueldo|salario|nómina|nomina|pago de nómina|honorarios|quincena|mesada)\b/i
  },
];

/**
 * Detecta comandos de navegación por voz o creación de notas/recordatorios
 */
export function detectVoiceCommand(text: string): ParsedVoiceCommand | null {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Navegación a Estadísticas
  if (/\b(?:estadísticas|estadisticas|gráficas|graficas|métricas|reporte de servicios)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/servicios/estadisticas',
      title: 'Ver Estadísticas 📊',
      label: 'Abrir Estadísticas',
      rawText: text
    };
  }

  // 2. Navegación a Configuración / Perfil
  if (/\b(?:configuración|configuracion|ajustes|mi perfil|perfil|centro de control)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/configuracion',
      title: 'Abrir Configuración ⚙️',
      label: 'Abrir Configuración',
      rawText: text
    };
  }

  // 3. Navegación a Notas
  if (/\b(?:mis notas|ver notas|abrir notas|lista de notas)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/servicios/notas',
      title: 'Abrir Notas 📝',
      label: 'Ver mis Notas',
      rawText: text
    };
  }

  // 4. Navegación a Recordatorios
  if (/\b(?:mis recordatorios|ver recordatorios|abrir recordatorios|lista de recordatorios)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/servicios/recordatorios',
      title: 'Abrir Recordatorios 🔔',
      label: 'Ver Recordatorios',
      rawText: text
    };
  }

  // 5. Navegación a Gastos
  if (/\b(?:mis gastos|ver gastos|abrir gastos|pantalla de gastos)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/gastos',
      title: 'Ver Gastos 🔴',
      label: 'Ver Gastos',
      rawText: text
    };
  }

  // 6. Navegación a Ingresos
  if (/\b(?:mis ingresos|ver ingresos|abrir ingresos|pantalla de ingresos)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/ingresos',
      title: 'Ver Ingresos 🟢',
      label: 'Ver Ingresos',
      rawText: text
    };
  }

  // 7. Navegación a Deudas
  if (/\b(?:mis deudas|ver deudas|abrir deudas|pantalla de deudas)\b/i.test(lower)) {
    return {
      kind: 'command',
      action: 'navigate',
      targetUrl: '/deudas',
      title: 'Ver Deudas 🟡',
      label: 'Ver Deudas',
      rawText: text
    };
  }

  // 8. Crear Nota por Voz ("Nota recordar comprar leche")
  const noteMatch = clean.match(/\b(?:nota|anotar|escribir nota|nueva nota)\s+(.+)/i);
  if (noteMatch) {
    const noteText = noteMatch[1].trim();
    return {
      kind: 'command',
      action: 'create_note',
      targetUrl: '/servicios/notas',
      title: 'Nueva Nota 📝',
      content: noteText.charAt(0).toUpperCase() + noteText.slice(1),
      label: 'Guardar Nota',
      rawText: text
    };
  }

  // 9. Crear Recordatorio por Voz ("Recordatorio mensual pagar servicio 50 mil el 15 de septiembre")
  const reminderMatch = clean.match(/\b(?:recordatorio|recordarme|nuevo recordatorio)\s+(.+)/i);
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

    let dueDate = '';
    if (/\bmañana\b/i.test(reminderText)) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dueDate = tomorrow.toISOString().split('T')[0];
    }

    return {
      kind: 'command',
      action: 'create_reminder',
      targetUrl: '/servicios/recordatorios',
      title: 'Nuevo Recordatorio 🔔',
      content: reminderText.charAt(0).toUpperCase() + reminderText.slice(1),
      amount: mainAmount,
      frequency,
      dueDate,
      time: '20:00',
      label: 'Guardar Recordatorio',
      rawText: text
    };
  }

  // 10. Detección de Frases Cortas Incompletas (Diálogo Interactivo de 2 Vías)
  if (/^(?:recordatorio|un recordatorio|nuevo recordatorio)$/i.test(lower)) {
    return {
      kind: 'command',
      action: 'ask_followup',
      title: 'Asistente de Voz 🎙️',
      prompt: '¿Qué deseas recordar y en qué fecha?',
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
      title: 'Asistente de Voz 🎙️',
      prompt: '¿De cuánto fue el ingreso y por qué concepto?',
      label: 'Responder',
      rawText: text
    };
  }

  return null;
}

/**
 * Convierte texto en números usando expresiones regulares y conversión de palabras a dígitos
 */
export function extractAllAmounts(text: string): number[] {
  const clean = text.toLowerCase().trim();
  const foundAmounts: number[] = [];

  const digitRegex = /(?:\$|\b)\s*(\d{1,3}(?:[.,\s]\d{3})+|\d+)\s*(?:mil(?:es)?|k|m|millon|millón|millones)?\b/gi;
  let match;

  while ((match = digitRegex.exec(clean)) !== null) {
    const fullMatch = match[0].toLowerCase();
    const rawNumberStr = match[1].replace(/[.,\s]/g, '');
    let num = parseInt(rawNumberStr, 10);

    if (isNaN(num)) continue;

    if (/\bmil(?:es)?\b|\bk\b/.test(fullMatch)) {
      if (num < 1000) num *= 1000;
    } else if (/\bmillon|\bmillón|\bmillones|\bm\b/.test(fullMatch)) {
      if (num < 1000000) num *= 1000000;
    }

    if (num > 0) {
      foundAmounts.push(num);
    }
  }

  if (foundAmounts.length > 0) return foundAmounts;

  // Modificador de palabras ("45 mil", "medio millon")
  let wordNum = 0;
  const words = clean.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    const w = words[i];

    if (NUMBER_WORDS[w] !== undefined) {
      wordNum += NUMBER_WORDS[w];
    } else if (w === 'medio' && words[i + 1] && (words[i + 1] === 'millón' || words[i + 1] === 'millon')) {
      foundAmounts.push(500000);
      i++;
    } else if (w === 'mil' || w === 'miles') {
      wordNum = wordNum > 0 ? wordNum * 1000 : 1000;
    } else if (w === 'millón' || w === 'millon' || w === 'millones') {
      wordNum = wordNum > 0 ? wordNum * 1000000 : 1000000;
    } else {
      if (wordNum > 0) {
        foundAmounts.push(wordNum);
        wordNum = 0;
      }
    }
  }

  if (wordNum > 0) {
    foundAmounts.push(wordNum);
  }

  return foundAmounts;
}

/**
 * Parser NLP principal para 1 sola frase de voz
 */
export function parseVoiceTransaction(text: string, customCategories: { label: string }[] = []): ParsedVoiceResult {
  const clean = text.toLowerCase().trim();

  // 1. Determinar el Tipo (Gasto, Ingreso, Deuda)
  let type: 'gasto' | 'ingreso' | 'deuda' = 'gasto';

  if (/\b(?:ingreso|ingresó|ingresaron|me pagaron|me ingresaron|sueldo|nómina|gané|gane|me gané|me gane|recibí|recibi|abono|premio)\b/i.test(clean)) {
    type = 'ingreso';
  } else if (/\b(?:deuda|deudas|debo|presté|preste|me prestaron|le debo|deber)\b/i.test(clean)) {
    type = 'deuda';
  } else if (/\b(?:perdí|perdi|se me perdió|se me perdio|pérdida|perdida|gasté|gaste|pagué|pague|compré|compre)\b/i.test(clean)) {
    type = 'gasto';
  }

  // 2. Extraer Montos y Suma Automática
  const amounts = extractAllAmounts(clean);
  let amount: number | null = null;
  let breakdown = '';

  if (amounts.length === 1) {
    amount = amounts[0];
  } else if (amounts.length > 1) {
    amount = amounts.reduce((acc, curr) => acc + curr, 0);
    const partsStr = amounts.map(a => `$${a.toLocaleString('es-CO')}`).join(' + ');
    breakdown = ` (${partsStr})`;
  }

  // 3. Determinar Categoría
  let category = '';

  for (const catRule of CATEGORY_KEYWORDS) {
    if (catRule.regex.test(clean)) {
      category = catRule.category;
      break;
    }
  }

  if (!category && customCategories.length > 0) {
    for (const c of customCategories) {
      if (clean.includes(c.label.toLowerCase())) {
        category = c.label;
        break;
      }
    }
  }

  if (!category) {
    category = type === 'ingreso' ? 'Sueldo' : 'Otros';
  }

  // 4. Extracción de Descripción & Detalle de Persona
  let description = '';
  let debtPerson = '';

  if (type === 'deuda') {
    const personMatch = clean.match(/(?:a|con|de)\s+([a-záéíóúñ]+)/i);
    if (personMatch) {
      debtPerson = personMatch[1].charAt(0).toUpperCase() + personMatch[1].slice(1);
      description = `Deuda con ${debtPerson}`;
    } else {
      description = 'Deuda por voz';
    }
  } else {
    const afterEnMatch = clean.match(/(?:en|de|por)\s+([a-záéíóúñ0-9\s]+)/i);
    if (afterEnMatch) {
      const detail = afterEnMatch[1].replace(/para|por|de|un|una|el|la|los|las/g, '').trim();
      if (detail.length > 1) {
        description = detail.charAt(0).toUpperCase() + detail.slice(1);
      }
    }
  }

  let interestRate: number | undefined = undefined;
  if (type === 'deuda') {
    const interestMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:%|por\s*ciento|de\s*interés|interes)/i);
    if (interestMatch) {
      interestRate = parseFloat(interestMatch[1].replace(',', '.'));
      breakdown += ` (Interés: ${interestRate}%)`;
    }
  }

  const finalDescription = (description || text) + breakdown;
  const isFixed = isFixedExpenseCategory(category);

  return {
    kind: 'transaction',
    type,
    amount,
    category,
    description: finalDescription,
    isFixed,
    rawText: text,
    debtPerson,
    interestRate,
  };
}

/**
 * Parser de frases compuestas largas con múltiples transacciones O comandos de voz
 */
export function parseMultiVoiceTransaction(text: string, customCategories: { label: string }[] = []): ParsedVoiceItem[] {
  const clean = text.trim();
  if (!clean) return [];

  // Primero verificar si es un comando directo de voz (navegación o crear nota/recordatorio)
  const command = detectVoiceCommand(clean);
  if (command) {
    return [command];
  }

  const splitRegex = /(?=\b(?:gast[ée]|compr[ée]|pagu[ée]|gasto|gastos|ingreso|ingresos|me ingresaron|me pagaron|recib[íi]|deuda|deudas|debo|debemos|prest[ée])\b)|(?:;|\.|\bpero\b|\badem[áa]s\b|\bluego\b|\bdespu[ée]s\b|\by tambi[ée]n\b)/gi;
  const rawSegments = clean.split(splitRegex);

  const results: ParsedVoiceItem[] = [];
  let lastType: 'gasto' | 'ingreso' | 'deuda' = 'gasto';

  for (const seg of rawSegments) {
    if (!seg) continue;
    const trimmed = seg.trim();
    if (trimmed.length < 3) continue;

    const parsed = parseVoiceTransaction(trimmed, customCategories);

    if (parsed.amount !== null || parsed.category !== 'Otros') {
      if (!/ingreso|ingresó|ingresaron|me pagaron|me ingresaron|sueldo|nómina|gané|deuda|deudas|debo|presté/.test(trimmed.toLowerCase())) {
        parsed.type = lastType;
      } else {
        lastType = parsed.type;
      }
      results.push(parsed);
    }
  }

  if (results.length === 0) {
    results.push(parseVoiceTransaction(clean, customCategories));
  }

  return results;
}
