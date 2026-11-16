import { Transaction } from './firestore';
import { categorizeText } from './voiceParser';
import { normalizeText } from './categories';

// Categoría sugerida para un gasto o ingreso según lo que se escribe en la descripción, sin IA:
//  1. el propio historial: movimientos del mismo tipo cuya descripción comparte palabras
//     ("Zapatos Ana" → la última vez "zapatos" fue Venta);
//  2. las reglas del dictado por voz y el catálogo ("compré mercancía" → Inventario).

const GENERIC = new Set(['pago', 'pague', 'compre', 'compra', 'para', 'del', 'los', 'las', 'con', 'por', 'una', 'uno', 'que', 'hoy', 'ayer', 'mil', 'pesos']);
const words = (s: string) => normalizeText(s).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));

export function suggestTxCategory(
  text: string,
  type: 'gasto' | 'ingreso',
  transactions: Transaction[],
  categories: { label: string; isCustom?: boolean; type?: string }[],
): string | null {
  const t = text.trim();
  if (t.length < 3) return null;
  const valid = (c: string) => categories.some(x => x.label === c);

  // La descripción es justo una categoría ("Inventario", "Publicidad")
  const key = normalizeText(t);
  const exact = categories.find(c => normalizeText(c.label) === key);
  if (exact) return exact.label;

  // Historial: lo más reciente pesa más
  const ws = words(t);
  if (ws.length) {
    const votes = new Map<string, number>();
    const recent = transactions.filter(x => x.type === type && x.category && x.description).slice(-400);
    recent.forEach((x, i) => {
      const desc = words(x.description || '');
      const hits = ws.filter(w => desc.includes(w)).length;
      if (hits && x.category !== 'Otros' && x.category !== 'Otros ingresos') {
        votes.set(x.category, (votes.get(x.category) || 0) + hits * (1 + i / recent.length));
      }
    });
    const best = Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0];
    if (best && valid(best[0])) return best[0];
  }

  const rule = categorizeText(t, type, categories);
  return rule.category && rule.category !== 'Otros' && rule.category !== 'Otros ingresos' && valid(rule.category) ? rule.category : null;
}

/**
 * Categoría sugerida para un producto de una compra ("cerveza" → Licores y Bares, "jabón" → Aseo del hogar).
 * Primero las reglas por palabras (más confiables para nombres de productos); si no hay, el historial.
 */
export function suggestItemCategory(
  name: string,
  transactions: Transaction[],
  categories: { label: string; isCustom?: boolean; type?: string }[],
): string | null {
  const t = name.trim();
  if (t.length < 3) return null;
  const has = (c: string) => categories.some(x => x.label === c);
  const key = ` ${normalizeText(t)} `;
  for (const [cat, words] of PRODUCT_WORDS) {
    if (!has(cat)) continue;
    if (words.some(w => key.includes(` ${w}`))) return cat;
  }
  const rule = categorizeText(t, 'gasto', categories);
  if (rule.category && rule.category !== 'Otros' && categories.some(c => c.label === rule.category)) return rule.category;
  return suggestTxCategory(t, 'gasto', transactions, categories);
}

// Productos típicos de un recibo de mercado (palabra al inicio de una palabra del nombre: "huevos", "huevo")
const PRODUCT_WORDS: [string, string[]][] = [
  ['Verduras y Frutas', ['cebolla', 'tomate', 'papa ', 'papas', 'zanahoria', 'ajo ', 'cilantro', 'pepino', 'pimenton', 'platano', 'banano', 'manzana', 'naranja', 'limon', 'aguacate', 'mango', 'fresa', 'mora ', 'lulo', 'guayaba', 'pina', 'papaya', 'lechuga', 'repollo', 'brocoli', 'habichuela', 'ahuyama', 'yuca', 'arracacha', 'mazorca', 'uva', 'granadilla', 'maracuya', 'tomate de arbol', 'apio', 'remolacha', 'espinaca', 'perejil', 'fruta', 'verdura']],
  ['Carnicería', ['carne', 'pollo', 'pechuga', 'cerdo', 'res ', 'costilla', 'chuleta', 'lomo de', 'molida', 'muslo', 'alas ', 'pescado', 'tilapia', 'mojarra', 'camaron']],
  ['Panadería', ['pan ', 'pandebono', 'almojabana', 'buñuelo', 'bunuelo', 'croissant', 'tostada', 'mogolla']],
  ['Aseo del hogar', ['jabon', 'detergente', 'suavizante', 'blanqueador', 'limpido', 'clorox', 'lavaloza', 'axion', 'papel higienico', 'servilleta', 'esponja', 'trapero', 'escoba', 'bolsa de basura', 'bolsas basura', 'desinfectante', 'ambientador', 'fab ', 'ariel']],
  ['Cuidado personal', ['shampoo', 'champu', 'crema dental', 'colgate', 'cepillo dental', 'desodorante', 'toalla higienica', 'protector', 'afeitar', 'acondicionador']],
  ['Licores y Bares', ['cerveza', 'aguardiente', 'ron ', 'vino', 'whisky', 'tequila', 'poker', 'aguila', 'club colombia', 'corona', 'andina', 'costeña', 'costena']],
  ['Mercado', ['huevo', 'arroz', 'leche', 'aceite', 'azucar', 'sal ', 'panela', 'frijol', 'lenteja', 'garbanzo', 'arveja', 'atun', 'sardina', 'pasta', 'spaghetti', 'harina', 'arepa', 'queso', 'mantequilla', 'margarina', 'yogur', 'kumis', 'avena', 'chocolate', 'cafe ', 'galleta', 'cereal', 'salchicha', 'jamon', 'mortadela', 'chorizo', 'salsa', 'mayonesa', 'mostaza', 'vinagre', 'gelatina', 'mermelada', 'bocadillo', 'maizena', 'caldo', 'maggi', 'sopa', 'agua ', 'gaseosa', 'jugo', 'te ', 'papel aluminio', 'leche condensada', 'crema de leche']],
];
