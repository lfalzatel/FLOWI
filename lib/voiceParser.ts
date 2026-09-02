import { BASE_CATEGORIES, CustomCategory, isFixedExpenseCategory } from './firestore';

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

export function parseVoiceTransaction(text: string, customCategories: { label: string }[] = []): ParsedVoiceResult {
  const clean = text.toLowerCase().trim();

  // 1. Detección de Tipo
  let type: 'gasto' | 'ingreso' | 'deuda' = 'gasto';
  if (/ingreso|ingresó|ingresaron|me pagaron|recibí|recibi|sueldo|nómina|nomina|gané|gane|remuneración/.test(clean)) {
    type = 'ingreso';
  } else if (/deuda|debo|debemos|le quedé debiendo|quedé debiendo|presté|preste|prestaron/.test(clean)) {
    type = 'deuda';
  }

  // 2. Extracción de Monto Numérico
  let amount: number | null = null;

  // Caso: "medio millón" / "medio millon"
  if (/medio mill[oó]n/.test(clean)) {
    amount = 500000;
  }

  if (amount === null) {
    // Buscar patrones con cifras numéricas (ej. "45 mil", "45.000", "1.5 millones", "1 millón 200 mil")
    const millionMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:millón|millon|millones)/);
    const thousandMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|k)/);
    const directDigitMatch = clean.match(/(?:(?:[$€£])\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,]\d{1,2})?/);

    if (millionMatch) {
      const numPart = parseFloat(millionMatch[1].replace(',', '.'));
      amount = Math.round(numPart * 1000000);

      // Ver si incluye miles adicionales después de millones (ej. "1 millón 200 mil")
      const subThousand = clean.match(/mill[oó]n(?:es)?\s+(\d+)\s*mil?/);
      if (subThousand) {
        const extraThousand = parseInt(subThousand[1], 10);
        amount += (extraThousand < 1000 ? extraThousand * 1000 : extraThousand);
      }
    } else if (thousandMatch) {
      const numPart = parseFloat(thousandMatch[1].replace(',', '.'));
      amount = Math.round(numPart * 1000);
    } else if (directDigitMatch) {
      const rawNum = directDigitMatch[1].replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(rawNum);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }
  }

  // Si aún no se encontró número por dígitos, probar por palabras escritas en español
  if (amount === null) {
    let wordSum = 0;
    const words = clean.split(/\s+/);
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
      amount = wordSum;
    }
  }

  // 3. Detección de Categoría
  const allAvailableCategories = [...customCategories, ...BASE_CATEGORIES];
  let category = '';

  // Probar coincidencia exacta o por palabras clave con las categorías disponibles
  for (const cat of allAvailableCategories) {
    const labelLower = cat.label.toLowerCase();
    if (clean.includes(labelLower)) {
      category = cat.label;
      break;
    }
  }

  // Si no coincide directo por etiqueta de categoría, inferir por palabras de contexto comunes
  if (!category) {
    if (/almuerzo|cena|desayuno|restaurante|comida|antojo|cafe|café|popsy|frisby|hamburguesa|pizza|cerveza|bar/.test(clean)) {
      category = 'Restaurantes';
    } else if (/mercado|supermercado|d1|olimpica|jumbo|carulla|exito|éxito|verdura|fruta|carniceria/.test(clean)) {
      category = 'Mercado';
    } else if (/gasolina|uber|taxi|bus|transporte|peaje|parqueadero|parking|pasaje/.test(clean)) {
      category = 'Transporte';
    } else if (/arriendo|alquiler|apto|apartamento/.test(clean)) {
      category = 'Arriendo';
    } else if (/claro|internet|wifi|epm|luz|agua|gas|efigas|alcanos/.test(clean)) {
      category = 'Claro Hogar';
    } else if (/netflix|spotify|google|youtube|yt music|suscripcion/.test(clean)) {
      category = 'Netflix';
    } else if (/sueldo|nómina|nomina|salario|pago/.test(clean)) {
      category = 'Sueldo';
    } else if (/gym|gimnasio|deporte|nike|adidas|decathlon/.test(clean)) {
      category = 'Gimnasio';
    } else if (/medicina|farmacia|drogueria|droguería|salud|doctor|medico|médico/.test(clean)) {
      category = 'Farmacia';
    } else {
      category = type === 'ingreso' ? 'Sueldo' : 'Otros';
    }
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
    // Intentar extraer el nombre del lugar o detalle de la frase
    const afterEnMatch = clean.match(/(?:en|de|por)\s+([a-záéíóúñ0-9\s]+)/i);
    if (afterEnMatch) {
      const detail = afterEnMatch[1].replace(/para|por|de|un|una|el|la|los|las|\d+/g, '').trim();
      if (detail.length > 2) {
        description = detail.charAt(0).toUpperCase() + detail.slice(1);
      }
    }
  }

  // 5. Determinar si es Gasto Fijo
  const isFixed = isFixedExpenseCategory(category);

  return {
    type,
    amount,
    category,
    description: description || text,
    isFixed,
    rawText: text,
    debtPerson,
  };
}
