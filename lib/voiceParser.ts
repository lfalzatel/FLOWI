import { BASE_CATEGORIES, isFixedExpenseCategory } from './firestore';

export interface ParsedVoiceResult {
  type: 'gasto' | 'ingreso' | 'deuda';
  amount: number | null;
  category: string;
  description: string;
  isFixed: boolean;
  rawText: string;
  debtPerson?: string;
}

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
  // Licores y Bares (Prioridad alta antes que comida)
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
    category: 'Netflix',
    regex: /\b(?:netflix|spotify|google|youtube|yt music|suscripcion|suscripción|play store)\b/i
  },
  // Salud y Farmacia
  {
    category: 'Farmacia',
    regex: /\b(?:medicina|farmacia|drogueria|droguería|salud|doctor|medico|médico|pastillas|remedio)\b/i
  },
  // Gimnasio y Deportes
  {
    category: 'Gimnasio',
    regex: /\b(?:gym|gimnasio|deporte|nike|adidas|decathlon|piscina|natacion|natación|futbol|fútbol)\b/i
  },
  // Sueldo e Ingresos
  {
    category: 'Sueldo',
    regex: /\b(?:sueldo|nómina|nomina|salario|pago|honorarios|freelance)\b/i
  }
];

export function extractAllAmounts(clean: string): { total: number; breakdown: string } {
  const foundAmounts: number[] = [];

  // Reemplazar expresiones especiales
  let text = clean.replace(/medio mill[oó]n/gi, ' 500000 ');

  // 1. Extraer patrones de "X millones [Y mil]"
  const millionRegex = /(\d+(?:[.,]\d+)?)\s*(?:millón|millon|millones)(?:\s+(\d+)\s*mil)?/gi;
  text = text.replace(millionRegex, (_, mill, subMil) => {
    let val = Math.round(parseFloat(mill.replace(',', '.')) * 1000000);
    if (subMil) {
      const extra = parseInt(subMil, 10);
      val += (extra < 1000 ? extra * 1000 : extra);
    }
    foundAmounts.push(val);
    return ' ';
  });

  // 2. Extraer patrones de "X mil" o "X k"
  const thousandRegex = /(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/gi;
  text = text.replace(thousandRegex, (_, num) => {
    const val = Math.round(parseFloat(num.replace(',', '.')) * 1000);
    foundAmounts.push(val);
    return ' ';
  });

  // 3. Unificar números con espacio introducido por dictado de voz (ej. "19 700" -> "19700")
  text = text.replace(/(\b\d{1,3})\s+(\d{3}\b)/g, '$1$2');

  // 4. Extraer todas las cifras numéricas sueltas (ej. "19700", "9000", "$ 19700")
  const digitRegex = /(?:[$€£]\s*)?(\d+(?:[.,]\d+)*)/g;
  let match;
  while ((match = digitRegex.exec(text)) !== null) {
    let raw = match[1];

    if (/^\d{1,3}(?:[.,]\d{3})+$/.test(raw)) {
      raw = raw.replace(/[.,]/g, '');
    } else if (/^\d+[.,]\d{1,2}$/.test(raw)) {
      raw = raw.replace(',', '.');
    } else {
      raw = raw.replace(/[.,]/g, '');
    }

    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) {
      foundAmounts.push(val);
    }
  }

  // 5. Si no se encontraron cifras numéricas, probar palabras escritas en español
  if (foundAmounts.length === 0) {
    let wordSum = 0;
    const words = text.split(/\s+/);
    let hasNumberWords = false;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w === 'mil') {
        if (wordSum === 0) wordSum = 1;
        wordSum *= 1000;
        hasNumberWords = true;
      } else if (w === 'millón' || w === 'millon' || w === 'millones') {
        if (wordSum === 0) wordSum = 1;
        wordSum *= 1000000;
        hasNumberWords = true;
      } else if (NUMBER_WORDS[w]) {
        wordSum += NUMBER_WORDS[w];
        hasNumberWords = true;
      }
    }
    if (hasNumberWords && wordSum > 0) {
      foundAmounts.push(wordSum);
    }
  }

  const total = foundAmounts.reduce((acc, curr) => acc + curr, 0);
  const breakdown = foundAmounts.length > 1 
    ? ` (${foundAmounts.map(a => `$${a.toLocaleString('es-CO')}`).join(' + ')})` 
    : '';

  return { total, breakdown };
}

export function parseVoiceTransaction(text: string, customCategories: { label: string }[] = []): ParsedVoiceResult {
  const clean = text.toLowerCase().trim();

  // 1. Detección de Tipo
  let type: 'gasto' | 'ingreso' | 'deuda' = 'gasto';
  if (/ingreso|ingresó|ingresaron|me pagaron|recibí|recibi|sueldo|nómina|nomina|gané|gane|remuneración/.test(clean)) {
    type = 'ingreso';
  } else if (/deuda|debo|debemos|le quedé debiendo|quedé debiendo|presté|preste|prestaron/.test(clean)) {
    type = 'deuda';
  }

  // 2. Extracción y Suma de Todos los Montos Dictados en la Frase
  const { total, breakdown } = extractAllAmounts(clean);
  const amount = total > 0 ? total : null;

  // 3. Detección de Categoría Inteligente
  const allAvailableCategories = [...customCategories, ...BASE_CATEGORIES];
  let category = '';

  // A. Coincidencia directa por nombre de categoría del usuario
  for (const cat of allAvailableCategories) {
    const labelLower = cat.label.toLowerCase();
    if (clean.includes(labelLower)) {
      category = cat.label;
      break;
    }
  }

  // B. Coincidencia por palabras clave avanzadas (Licores, Restaurantes, Mercado, etc.)
  if (!category) {
    for (const kw of CATEGORY_KEYWORDS) {
      if (kw.regex.test(clean)) {
        category = kw.category;
        break;
      }
    }
  }

  // C. Fallback por defecto
  if (!category) {
    category = type === 'ingreso' ? 'Sueldo' : 'Otros';
  }

  // 4. Extracción de Descripción & Detalle de Persona en Deuda
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
    // Extraer el comercio/producto mencionado (ej. "cerveza y cigarros")
    const afterEnMatch = clean.match(/(?:en|de|por)\s+([a-záéíóúñ0-9\s]+)/i);
    if (afterEnMatch) {
      const detail = afterEnMatch[1].replace(/para|por|de|un|una|el|la|los|las/g, '').trim();
      if (detail.length > 1) {
        description = detail.charAt(0).toUpperCase() + detail.slice(1);
      }
    }
  }

  const finalDescription = (description || text) + breakdown;

  // 5. Determinar si es Gasto Fijo
  const isFixed = isFixedExpenseCategory(category);

  return {
    type,
    amount,
    category,
    description: finalDescription,
    isFixed,
    rawText: text,
    debtPerson,
  };
}
