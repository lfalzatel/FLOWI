import { Transaction, isFixedExpenseCategory } from './firestore';
import { categorizeText } from './voiceParser';
import { getLocalDateString } from './dateUtils';

// Importar el extracto del banco (CSV o Excel). Cada banco nombra distinto sus columnas, así que se
// adivina cuál es la fecha, la descripción y el valor (una columna con signo, o débito y crédito
// separados), y la persona puede corregirlo antes de importar. Nada se guarda sin su confirmación.

export type Cell = string | number | Date | null | undefined;

export interface ColumnMap {
  headerRow: number;        // fila de encabezados (las de datos van debajo)
  date: number;
  description: number;
  amount: number | null;    // una sola columna con signo (negativo = gasto)
  debit: number | null;     // o dos columnas: salidas...
  credit: number | null;    // ...y entradas
}

export interface StatementRow {
  id: string;
  date: string;             // YYYY-MM-DD
  description: string;
  amount: number;           // siempre positivo
  type: 'gasto' | 'ingreso';
  category: string;
  merchant?: string;
  duplicate: boolean;       // ya hay un movimiento igual (mismo día, tipo y valor)
  selected: boolean;
}

const norm = (v: Cell) => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const RE = {
  date: /^(fecha|fecha (de )?(transaccion|movimiento|operacion)|dia)\b/,
  description: /(descripcion|concepto|detalle|transaccion|movimiento|referencia|establecimiento|comercio)/,
  amount: /^(valor|monto|importe|valor (de la )?transaccion|cantidad)\b/,
  debit: /(debito|debitos|cargo|cargos|retiro|retiros|salida|salidas|egreso)/,
  credit: /(credito|creditos|abono|abonos|deposito|depositos|entrada|entradas|ingreso)/,
  balance: /(saldo)/,
};

// Busca la fila de encabezados en las primeras filas y propone qué es cada columna
export function guessColumns(rows: Cell[][]): ColumnMap | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cells = rows[r].map(norm);
    const find = (re: RegExp, skip: number[] = []) => cells.findIndex((c, i) => !skip.includes(i) && c && re.test(c) && !RE.balance.test(c));
    const date = find(RE.date);
    if (date === -1) continue;
    const amount = find(RE.amount, [date]);
    const debit = find(RE.debit, [date]);
    const credit = find(RE.credit, [date, debit]);
    if (amount === -1 && (debit === -1 || credit === -1)) continue;
    let description = find(RE.description, [date, amount, debit, credit]);
    if (description === -1) {
      // La columna con más texto de las primeras filas de datos
      const sample = rows.slice(r + 1, r + 11);
      let best = -1, bestLen = 0;
      cells.forEach((_, i) => {
        if ([date, amount, debit, credit].includes(i)) return;
        const len = sample.reduce((s, row) => s + (typeof row[i] === 'string' ? String(row[i]).length : 0), 0);
        if (len > bestLen) { best = i; bestLen = len; }
      });
      description = best;
    }
    return {
      headerRow: r, date, description,
      amount: amount === -1 ? null : amount,
      debit: amount === -1 ? debit : null,
      credit: amount === -1 ? credit : null,
    };
  }
  return null;
}

// "$ -45.900,00", "(45,900.00)", "1.250.000", 45900 → número (negativo si sale)
export function parseAmount(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v ?? '').trim();
  if (!s) return null;
  let negative = /^\(.*\)$/.test(s) || /-/.test(s);
  s = s.replace(/[^\d.,]/g, '');
  if (!s) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  let decimalSep: '.' | ',' | null = null;
  if (lastDot !== -1 && lastComma !== -1) decimalSep = lastDot > lastComma ? '.' : ',';
  else {
    const sep = lastDot !== -1 ? '.' : lastComma !== -1 ? ',' : null;
    // Un solo separador seguido de 1 o 2 dígitos al final es decimal; de 3, es de miles
    if (sep && s.split(sep).length === 2 && s.length - s.lastIndexOf(sep) - 1 <= 2) decimalSep = sep;
  }
  const thousandsSep = decimalSep === '.' ? ',' : '.';
  s = s.split(thousandsSep).join('');
  if (decimalSep === ',') s = s.replace(',', '.');
  if (!decimalSep) s = s.replace(/[.,]/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };

// Fechas del banco: Date de Excel, número de serie, "03/11/2026", "2026-11-03", "20261103", "3 nov 2026"
export function parseDate(v: Cell): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return getLocalDateString(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return getLocalDateString(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const s = norm(v);
  if (!s) return null;
  let y = 0, m = 0, d = 0;
  let match: RegExpMatchArray | null;
  if ((match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) [d, m, y] = [+match[1], +match[2], +match[3]]; // día/mes/año (Colombia)
  else if ((match = s.match(/^(\d{4})(\d{2})(\d{2})$/))) [y, m, d] = [+match[1], +match[2], +match[3]];
  else if ((match = s.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?\s*(?:de\s+)?(\d{2,4})/)) && MONTHS[match[2]]) [d, m, y] = [+match[1], MONTHS[match[2]], +match[3]];
  else return null;
  if (y < 100) y += 2000;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return getLocalDateString(date);
}

function tidyDescription(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim();
  // Los bancos escriben TODO EN MAYÚSCULAS: se deja en tipo oración
  const upper = s === s.toUpperCase() && /[A-Z]/.test(s);
  const out = upper ? s.charAt(0) + s.slice(1).toLowerCase() : s;
  return out.slice(0, 80);
}

const INCOME_HINTS: [RegExp, string][] = [
  [/nomina|salario|sueldo|pago de nomina/, 'Sueldo'],
  [/prima/, 'Prima'],
  [/devolucion|reembolso|reverso/, 'Reembolso / devolución'],
  [/transferencia|transf|consignacion|abono/, 'Transferencia'],
];

const toDate = (v: any): Date => (v instanceof Date ? v : v && typeof v.toDate === 'function' ? v.toDate() : new Date(v));

export function buildRows(
  rows: Cell[][],
  map: ColumnMap,
  existing: Transaction[],
  categories: { label: string; type?: string; isCustom?: boolean }[] = [],
): StatementRow[] {
  const seen = new Set(existing.map(t => `${getLocalDateString(toDate(t.date))}|${t.type}|${Math.round(t.amount)}`));
  const out: StatementRow[] = [];
  rows.slice(map.headerRow + 1).forEach((row, i) => {
    const date = parseDate(row[map.date]);
    if (!date) return;
    let value: number | null;
    if (map.amount !== null) value = parseAmount(row[map.amount]);
    else {
      const debit = map.debit !== null ? parseAmount(row[map.debit]) : null;
      const credit = map.credit !== null ? parseAmount(row[map.credit]) : null;
      value = debit ? -Math.abs(debit) : credit ? Math.abs(credit) : null;
    }
    if (!value) return;
    const type: 'gasto' | 'ingreso' = value < 0 ? 'gasto' : 'ingreso';
    const amount = Math.round(Math.abs(value));
    const rawDesc = String(row[map.description] ?? '').trim();
    const description = tidyDescription(rawDesc) || (type === 'gasto' ? 'Gasto del banco' : 'Ingreso del banco');
    let category: string;
    let merchant: string | undefined;
    if (type === 'ingreso') {
      const hint = INCOME_HINTS.find(([re]) => re.test(norm(rawDesc)));
      category = hint ? hint[1] : categorizeText(rawDesc, 'ingreso', categories).category;
    } else {
      const c = categorizeText(rawDesc, 'gasto', categories);
      category = c.category;
      merchant = c.merchant;
    }
    const duplicate = seen.has(`${date}|${type}|${amount}`);
    out.push({ id: `r${i}`, date, description, amount, type, category, merchant, duplicate, selected: !duplicate });
  });
  return out;
}

export function rowToTransaction(r: StatementRow, userId: string): Omit<Transaction, 'id'> {
  return {
    userId, type: r.type, amount: r.amount, category: r.category, description: r.description,
    date: new Date(`${r.date}T12:00:00`),
    isFixed: r.type === 'gasto' && isFixedExpenseCategory(r.category),
    ...(r.merchant ? { merchant: r.merchant } : {}),
  };
}
