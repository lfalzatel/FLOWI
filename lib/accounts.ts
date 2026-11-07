import { Account, AccountKind, Debt, Investment, Transaction, Transfer, calculateDebtInterest } from './firestore';
import { investmentStatus } from './investments';
import { normalizeText } from './categories';

// Saldos de cuentas y patrimonio neto.
//
// Saldo de una cuenta = saldo base (lo que la persona escribió o ajustó en baseAt)
//   + ingresos de la cuenta − gastos de la cuenta + transferencias que llegan − las que salen,
//   contando solo lo fechado desde baseAt.
// Un movimiento pertenece a la cuenta cuyo medio de pago coincide ("Bancolombia", "Nequi"…);
// si no dice con qué se pagó (o el medio no está en ninguna cuenta), va a la cuenta principal.

export const KIND_LABEL: Record<AccountKind, string> = {
  banco: 'Banco', billetera: 'Billetera digital', efectivo: 'Efectivo', credito: 'Tarjeta de crédito',
};
export const KIND_EMOJI: Record<AccountKind, string> = { banco: '🏦', billetera: '📱', efectivo: '💵', credito: '💳' };

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

export type Movement =
  | { kind: 'tx'; date: Date; amount: number; label: string; tx: Transaction }
  | { kind: 'transfer'; date: Date; amount: number; label: string; transfer: Transfer }
  | { kind: 'base'; date: Date; amount: number; label: string };

export interface AccountState {
  account: Account;
  balance: number;
  movements: Movement[]; // del más reciente al más antiguo; signo según la cuenta
}

// ¿A qué cuenta va un movimiento? (id o null si no hay cuentas que lo reciban)
export function accountFor(tx: Transaction, accounts: Account[]): string | null {
  const active = accounts.filter(a => !a.archived && a.id);
  const pm = tx.paymentMethod ? normalizeText(tx.paymentMethod) : '';
  if (pm) {
    const hit = active.find(a => a.methods.some(m => normalizeText(m) === pm));
    if (hit) return hit.id!;
  }
  const main = active.find(a => a.isDefault);
  return main ? main.id! : null;
}

export function accountStates(accounts: Account[], transactions: Transaction[], transfers: Transfer[]): AccountState[] {
  const states = new Map<string, AccountState>();
  for (const a of accounts) {
    if (!a.id || a.archived) continue;
    states.set(a.id, {
      account: a, balance: a.baseBalance,
      movements: [{ kind: 'base', date: new Date(a.baseAt), amount: a.baseBalance, label: a.adjustments?.length ? 'Saldo ajustado' : 'Saldo inicial' }],
    });
  }
  for (const t of transactions) {
    const id = accountFor(t, accounts);
    const st = id ? states.get(id) : undefined;
    if (!st) continue;
    const date = toDate(t.date);
    if (date.getTime() < new Date(st.account.baseAt).getTime()) continue;
    const amount = t.type === 'ingreso' ? t.amount : -t.amount;
    st.balance += amount;
    st.movements.push({ kind: 'tx', date, amount, label: t.description?.trim() || t.category, tx: t });
  }
  for (const tr of transfers) {
    const date = new Date(tr.date);
    const from = states.get(tr.fromId);
    const to = states.get(tr.toId);
    if (from && date.getTime() >= new Date(from.account.baseAt).getTime()) {
      from.balance -= tr.amount;
      from.movements.push({ kind: 'transfer', date, amount: -tr.amount, label: `A ${to?.account.name || 'otra cuenta'}`, transfer: tr });
    }
    if (to && date.getTime() >= new Date(to.account.baseAt).getTime()) {
      to.balance += tr.amount;
      to.movements.push({ kind: 'transfer', date, amount: tr.amount, label: `Desde ${from?.account.name || 'otra cuenta'}`, transfer: tr });
    }
  }
  const order: AccountKind[] = ['banco', 'billetera', 'efectivo', 'credito'];
  return Array.from(states.values())
    .map(s => ({ ...s, movements: s.movements.sort((a, b) => b.date.getTime() - a.date.getTime()) }))
    .sort((a, b) => Number(!!b.account.isDefault) - Number(!!a.account.isDefault) || order.indexOf(a.account.kind) - order.indexOf(b.account.kind));
}

export interface NetWorth {
  accounts: number;        // suma de cuentas con saldo positivo (bancos, billeteras, efectivo)
  cards: number;           // lo que se debe en tarjetas de crédito (positivo)
  investments: number;     // CDT activos: capital + intereses ganados a la fecha
  owedToMe: number;        // lo que me deben
  debts: number;           // lo que debo (con intereses causados)
  assets: number;
  liabilities: number;
  total: number;
}

export function netWorth(states: AccountState[], investments: Investment[], debts: Debt[], now = new Date()): NetWorth {
  let accounts = 0, cards = 0;
  for (const s of states) {
    if (s.balance >= 0) accounts += s.balance;
    else cards += -s.balance;
  }
  const investmentsTotal = investments
    .filter(i => i.status === 'activo')
    .reduce((sum, i) => sum + i.amount + investmentStatus(i, now).earnedToDate, 0);
  let owedToMe = 0, owed = 0;
  for (const d of debts) {
    if (d.status !== 'pending') continue;
    const left = Math.max(0, d.totalAmount - d.paidAmount) + calculateDebtInterest(d, now).accumulatedInterest;
    if (d.direction === 'me_deben') owedToMe += left;
    else owed += left;
  }
  const assets = accounts + investmentsTotal + owedToMe;
  const liabilities = cards + owed;
  return { accounts, cards, investments: investmentsTotal, owedToMe, debts: owed, assets, liabilities, total: assets - liabilities };
}

// Medios de pago que se sugieren para una cuenta según su nombre
export function suggestMethods(name: string, kind: AccountKind): string[] {
  const n = normalizeText(name);
  if (kind === 'efectivo') return ['Efectivo'];
  if (kind === 'credito') return ['Tarjeta crédito'];
  const known = ['Bancolombia', 'BBVA', 'Davivienda', 'Nequi', 'Daviplata', 'Nu', 'Lulo Bank', 'RappiPay', 'Banco de Bogotá', 'AV Villas', 'Banco Caja Social'];
  const hit = known.find(k => n.includes(normalizeText(k)) || normalizeText(k).includes(n));
  return hit ? [hit] : [];
}
