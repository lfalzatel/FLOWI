import { EXPENSE_CATEGORY_DEFS, INCOME_CATEGORY_DEFS, normalizeText } from './categories';
import type { Transaction } from './firestore';

// Modo negocio: separa la plata de un negocio (ventas de ropa, zapatos, catálogo…) de la personal.
// Un movimiento es del negocio si se marcó con "Es del negocio" (Transaction.business) o, si no
// se marcó, cuando su categoría es del grupo "Negocio" (Venta, Venta por catálogo, Inventario…).

const BUSINESS = {
  ingreso: new Set(INCOME_CATEGORY_DEFS.filter(c => c.group === 'Negocio').map(c => normalizeText(c.label))),
  gasto: new Set(EXPENSE_CATEGORY_DEFS.filter(c => c.group === 'Negocio').map(c => normalizeText(c.label))),
};

export function isBusinessCategory(category: string, type: 'gasto' | 'ingreso'): boolean {
  return BUSINESS[type].has(normalizeText(category || ''));
}

export function isBusinessTx(t: Transaction): boolean {
  return t.business ?? isBusinessCategory(t.category, t.type);
}

export interface BusinessMonth {
  sales: number;          // ventas (ingresos del negocio)
  costs: number;          // costos (mercancía, insumos, envíos…)
  profit: number;         // ganancia = ventas − costos
  salesCount: number;
  byCategory: { label: string; type: 'gasto' | 'ingreso'; amount: number; count: number }[];
  items: Transaction[];   // movimientos del negocio del mes, del más reciente al más antiguo
}

const toDate = (v: any): Date => (v?.toDate ? v.toDate() : new Date(v));
const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function businessMonth(transactions: Transaction[], month: string): BusinessMonth {
  const items = transactions
    .filter(t => isBusinessTx(t) && monthOf(toDate(t.date)) === month)
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());
  const cats = new Map<string, { label: string; type: 'gasto' | 'ingreso'; amount: number; count: number }>();
  let sales = 0, costs = 0, salesCount = 0;
  for (const t of items) {
    if (t.type === 'ingreso') { sales += t.amount; salesCount++; } else costs += t.amount;
    const key = `${t.type}|${normalizeText(t.category)}`;
    const c = cats.get(key) || { label: t.category, type: t.type, amount: 0, count: 0 };
    c.amount += t.amount;
    c.count++;
    cats.set(key, c);
  }
  return {
    sales, costs, profit: sales - costs, salesCount,
    byCategory: Array.from(cats.values()).sort((a, b) => b.amount - a.amount),
    items,
  };
}
