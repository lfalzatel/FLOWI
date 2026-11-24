import { currentLocale, tr } from '@/lib/i18n';
// Aviso de pago repetido: un gasto fijo (agua, luz, arriendo, Netflix…) que ya se registró este mes.
// Evita pagar o registrar dos veces lo mismo. Solo aplica a pagos fijos, para no molestar con el mercado o el tinto.
import { Transaction, isFixedExpenseCategory } from './firestore';
import { aliasKey, normalizeText } from './categories';

const toDate = (d: Transaction['date']) => (d instanceof Date ? d : (d as any)?.toDate ? (d as any).toDate() : new Date(d as any));

export function findRepeatedPayment(
  candidate: { type: string; category: string; merchant?: string | null; date?: Date; isFixed?: boolean },
  transactions: Transaction[],
  excludeId?: string,
): Transaction | null {
  if (candidate.type !== 'gasto' || !candidate.category) return null;
  if (!candidate.isFixed && !isFixedExpenseCategory(candidate.category)) return null;
  const when = candidate.date || new Date();
  const cat = aliasKey(candidate.category);
  const merchant = candidate.merchant ? normalizeText(candidate.merchant) : '';
  const found = transactions
    .filter(t => t.type === 'gasto' && t.id !== excludeId && aliasKey(t.category) === cat)
    .filter(t => !merchant || !t.merchant || normalizeText(t.merchant) === merchant)
    .filter(t => { const d = toDate(t.date); return d.getFullYear() === when.getFullYear() && d.getMonth() === when.getMonth(); })
    .sort((a, b) => toDate(b.date).getTime() - toDate(a.date).getTime());
  return found[0] || null;
}

/** "Ya registraste Agua (Aguas de Manizales) este mes: $ 85.000 el 3 de nov." */
export function repeatedPaymentText(t: Transaction) {
  const name = t.merchant ? `${t.category} (${t.merchant})` : t.category;
  const day = toDate(t.date).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' }).replace('.', '');
  return tr('Ya registraste {a} este mes: $ {b} el {c}.', { a: name, b: Math.round(t.amount).toLocaleString(currentLocale()), c: day });
}
