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
