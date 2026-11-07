import { db } from './firebase';
import { BASE_CATEGORY_DEFS, EXPENSE_CATEGORY_DEFS, INCOME_CATEGORY_DEFS } from './categories';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, setDoc, arrayUnion, orderBy } from 'firebase/firestore';

export interface Transaction {
  id?: string;
  type: 'gasto' | 'ingreso';
  amount: number;
  category: string;
  description?: string;
  date: Timestamp | Date;
  userId?: string;
  isFixed?: boolean;
  merchant?: string | null;
  paymentMethod?: string | null;
  accountId?: string | null; // cuenta exacta (gana sobre el medio de pago); ver lib/accounts.ts
}

export interface CustomCategory {
  id?: string;
  label: string;
  icon: string;
  color: string;
  userId: string;
}

// Catálogo completo en lib/categories.ts (gastos, ingresos, comercios y medios de pago)
export const BASE_CATEGORIES = BASE_CATEGORY_DEFS;

export const FIXED_CATEGORIES = [
  'Arriendo', 'Administración', 'Agua', 'Luz', 'EPM', 'Gas natural', 'Efigas', 'Alcanos',
  'Claro Hogar', 'Claro Móvil', 'Netflix', 'Spotify', 'YouTube', 'YT Music', 'Google', 'Play Store',
  'Cuota de crédito', 'Gimnasio', 'Empleada', 'Pensión', 'Matrícula', 'SOAT', 'Tecnomecánica',
  'Sura', 'Colsanitas', 'Compensar', 'Nueva EPS', 'FNA', 'Cesantías', 'Impuestos',
  'Internet', 'Medicina prepagada', 'Seguros', 'Cuota de manejo', 'Suscripciones', 'Apps e IA',
  'Música', 'Nube / almacenamiento', 'Natillera', 'Fondo de empleados', 'Cuota alimentaria'
];

export function isFixedExpenseCategory(category: string): boolean {
  if (!category) return false;
  const catLower = category.toLowerCase().trim();
  const isMatchInList = FIXED_CATEGORIES.some(fixed => {
    const fixedLower = fixed.toLowerCase();
    return catLower === fixedLower || catLower.includes(fixedLower) || fixedLower.includes(catLower);
  });
  if (isMatchInList) return true;
  return /servicio|arriendo|renta|suscripcio|suscripció|pension|pensió|matri|seguro|soat|impuesto|plan|fibra|celular|internet|tv|telef/i.test(catLower);
}

export const EXPENSE_CATEGORIES = EXPENSE_CATEGORY_DEFS;
export const INCOME_CATEGORIES = INCOME_CATEGORY_DEFS;

export async function getUserTransactions(userId: string, type?: 'gasto' | 'ingreso') {
  const expensesRef = collection(db, 'fl_expenses');
  let q = query(expensesRef, where('userId', '==', userId));
  
  if (type) {
    q = query(q, where('type', '==', type));
  }

  const querySnapshot = await getDocs(q);
  const transactions = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
    };
  }) as Transaction[];

  // Ordenar en memoria por fecha descendente
  return transactions.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date : new Date();
    const dateB = b.date instanceof Date ? b.date : new Date();
    return dateB.getTime() - dateA.getTime();
  });
}

export async function addExpense(expense: Omit<Transaction, 'id'> & { userId: string }) {
  const expensesRef = collection(db, 'fl_expenses');
  const docRef = await addDoc(expensesRef, {
    ...expense,
    date: expense.date || serverTimestamp(),
  });
  return { id: docRef.id, ...expense, date: expense.date || new Date() };
}

export async function updateExpense(id: string, expense: Partial<Transaction>) {
  const docRef = doc(db, 'fl_expenses', id);
  await updateDoc(docRef, expense);
}

export async function deleteExpense(id: string) {
  const docRef = doc(db, 'fl_expenses', id);
  await deleteDoc(docRef);
}

// === DEUDAS ===

export interface Debt {
  id?: string;
  userId: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  status: 'pending' | 'paid';
  createdAt?: Timestamp | Date;
  description?: string;
  interestRate?: number; // Tasa efectiva anual (E.A. %) opcional
  monthlyInsurance?: number | null; // seguro que cobra el banco cada mes (opcional)
  installment?: number | null;      // cuota fija mensual (opcional)
  termMonths?: number | null;       // plazo en meses (opcional)
  paymentDay?: number | null;       // día del mes en que se paga la cuota (opcional)
  // "debo" = yo le debo a alguien (por defecto); "me_deben" = alguien me debe a mí
  direction?: 'debo' | 'me_deben';
  payments?: Array<{
    id: string;
    amount: number;
    date: Timestamp | Date;
    description?: string;
  }>;
}

export async function getUserDebts(userId: string) {
  const debtsRef = collection(db, 'fl_debts');
  const q = query(debtsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const debts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    const rawPayments = data.payments || [];
    
    // Mapear los pagos convirtiendo timestamps a Date locales
    const payments = rawPayments.map((p: any) => {
      let finalDate: Date;
      if (p.date instanceof Timestamp) {
        finalDate = p.date.toDate();
      } else if (p.date && typeof p.date === 'object' && 'seconds' in p.date) {
        // Manejar Timestamps serializados como objetos planos en arreglos
        finalDate = new Timestamp(p.date.seconds, p.date.nanoseconds).toDate();
      } else if (p.date) {
        finalDate = new Date(p.date);
      } else {
        finalDate = new Date();
      }
      return {
        ...p,
        date: finalDate,
      };
    });

    return {
      id: doc.id,
      ...data,
      payments,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    };
  }) as Debt[];

  // Ordenar por fecha de creación descendente
  return debts.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
    return dateB.getTime() - dateA.getTime();
  });
}

export async function addDebt(debt: Omit<Debt, 'id'>) {
  const debtsRef = collection(db, 'fl_debts');
  const docRef = await addDoc(debtsRef, {
    ...debt,
    createdAt: debt.createdAt || serverTimestamp(),
  });
  return { id: docRef.id, ...debt, createdAt: debt.createdAt || new Date() };
}

export async function updateDebt(id: string, debt: Partial<Debt>) {
  const docRef = doc(db, 'fl_debts', id);
  await updateDoc(docRef, debt);
}

export async function deleteDebt(id: string) {
  const docRef = doc(db, 'fl_debts', id);
  await deleteDoc(docRef);
}

// Intereses (y seguro) causados día a día, como los liquidan los bancos colombianos:
//  - tasa E.A. → nominal mes vencido → tasa diaria comercial (÷ 360)
//  - cada abono paga primero los intereses y el seguro pendientes y luego el capital
//  - los centavos se truncan (el banco no redondea hacia arriba)
// accumulatedInterest = todo lo causado desde el inicio (intereses + seguro), de modo que
// lo que se debe hoy = totalAmount − paidAmount + accumulatedInterest.
export function calculateDebtInterest(debt: Debt, now = new Date()): {
  accumulatedInterest: number; interest: number; insurance: number; currentTotal: number; principalLeft: number;
} {
  const base = Math.max(0, debt.totalAmount - debt.paidAmount);
  const defaultResult = { accumulatedInterest: 0, interest: 0, insurance: 0, currentTotal: base, principalLeft: base };
  const rate = debt.interestRate && debt.interestRate > 0 ? debt.interestRate : 0;
  const insuranceMonthly = debt.monthlyInsurance && debt.monthlyInsurance > 0 ? debt.monthlyInsurance : 0;
  if (!rate && !insuranceMonthly) return defaultResult;

  const createdDate = debt.createdAt instanceof Date
    ? debt.createdAt
    : (debt.createdAt && 'toDate' in (debt.createdAt as any) ? (debt.createdAt as any).toDate() : new Date());
  if (createdDate.getTime() >= now.getTime()) return defaultResult;

  const nominalMensual = Math.pow(1 + rate / 100, 1 / 12) - 1;
  const dailyRate = (nominalMensual * 12) / 360;
  const dailyInsurance = insuranceMonthly / 30;

  const toD = (v: any) => (v instanceof Date ? v : new Date(v));
  const paymentsByDay = new Map<string, number>();
  for (const p of debt.payments || []) {
    const k = toD(p.date).toLocaleDateString('sv-SE');
    paymentsByDay.set(k, (paymentsByDay.get(k) || 0) + p.amount);
  }
  // Abonos registrados antes de que existiera el historial (o el "monto pagado" inicial)
  const logged = Array.from(paymentsByDay.values()).reduce((s, n) => s + n, 0);
  let principal = Math.max(0, debt.totalAmount - Math.max(0, debt.paidAmount - logged));

  let interest = 0, insurance = 0, owedCharges = 0;
  const day = new Date(createdDate.getTime());
  day.setHours(0, 0, 0, 0);
  const target = new Date(now.getTime());
  target.setHours(0, 0, 0, 0);

  while (day.getTime() < target.getTime()) {
    const i = principal * dailyRate;
    const ins = principal > 0 ? dailyInsurance : 0;
    interest += i;
    insurance += ins;
    owedCharges += i + ins;
    day.setDate(day.getDate() + 1);
    const paid = paymentsByDay.get(day.toLocaleDateString('sv-SE')) || 0;
    if (paid > 0) {
      const toCharges = Math.min(paid, owedCharges);
      owedCharges -= toCharges;
      principal = Math.max(0, principal - (paid - toCharges));
    }
  }

  interest = Math.floor(interest);
  insurance = Math.floor(insurance);
  const accumulatedInterest = interest + insurance;
  return {
    accumulatedInterest, interest, insurance,
    principalLeft: Math.floor(principal),
    currentTotal: Math.max(0, debt.totalAmount - debt.paidAmount + accumulatedInterest),
  };
}

// Cuota fija mensual (sistema francés) para un crédito: capital, tasa E.A. y plazo en meses
export function estimateInstallment(amount: number, rateEA: number, months: number, monthlyInsurance = 0): number {
  if (amount <= 0 || months <= 0) return 0;
  const i = Math.pow(1 + (rateEA || 0) / 100, 1 / 12) - 1;
  const base = i > 0 ? (amount * i) / (1 - Math.pow(1 + i, -months)) : amount / months;
  return Math.round(base + monthlyInsurance);
}

// Próxima fecha de pago de la cuota (desde hoy, incluido). La primera cuota cae al menos
// 20 días después de tomar el crédito (si se tomó el 5 de nov y se paga los 15, la primera es el 15 de dic)
export function nextDebtPaymentDate(debt: Debt, now = new Date()): Date | null {
  if (!debt.paymentDay) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const created = debt.createdAt instanceof Date ? debt.createdAt
    : (debt.createdAt && 'toDate' in (debt.createdAt as any) ? (debt.createdAt as any).toDate() : null);
  const earliest = created ? new Date(created.getTime() + 20 * 86400000) : today;
  for (const o of [0, 1, 2]) {
    const y = today.getFullYear(), m = today.getMonth() + o;
    const last = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(debt.paymentDay, last));
    if (d >= today && d >= earliest) return d;
  }
  return null;
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  phone?: string;
  currency?: string;
  createdAt?: Timestamp | Date;
}

export async function getAllUsers() {
  const usersRef = collection(db, 'users');
  const querySnapshot = await getDocs(usersRef);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt instanceof Timestamp ? doc.data().createdAt.toDate() : new Date(),
  })) as UserProfile[];
}

export async function updateUserProfile(userId: string, data: any) {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, data, { merge: true });
}

export async function hideBaseCategory(userId: string, label: string) {
  const docRef = doc(db, 'users', userId);
  await setDoc(docRef, { hiddenCategories: arrayUnion(label) }, { merge: true });
}
// Omite un compromiso solo en un mes (entrada "YYYY-MM|clave", ver lib/commitments.ts)
export async function skipCommitment(userId: string, entry: string) {
  await setDoc(doc(db, 'users', userId), { commitmentSkips: arrayUnion(entry) }, { merge: true });
}
// Marca un mes (YYYY-MM) como cerrado, ver lib/monthClose.ts
export async function closeMonth(userId: string, month: string) {
  await setDoc(doc(db, 'users', userId), { closedMonths: arrayUnion(month) }, { merge: true });
}
export async function getCustomCategories(userId: string) {
  const categoriesRef = collection(db, 'fl_customCategories');
  const q = query(categoriesRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomCategory[];
}

export async function addCustomCategory(category: Omit<CustomCategory, 'id'>) {
  const categoriesRef = collection(db, 'fl_customCategories');
  const docRef = await addDoc(categoriesRef, category);
  return docRef.id;
}

export async function updateCustomCategory(id: string, category: Partial<CustomCategory>) {
  const docRef = doc(db, 'fl_customCategories', id);
  await updateDoc(docRef, category);
}

export async function deleteCustomCategory(id: string) {
  const docRef = doc(db, 'fl_customCategories', id);
  await deleteDoc(docRef);
}

// ─── REMINDERS (RECORDATORIOS) ──────────────────────────────────────────────
export interface ReminderAlert {
  id: string;
  value: number;
  unit: 'minutes' | 'hours' | 'days';
}

export interface Reminder {
  id?: string;
  userId: string;
  title: string;               // "Pagar arriendo"
  description?: string;        // nota opcional
  category?: string;           // mismo tipo que Transaction.category
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'budget_alert';
  time: string;                // "08:30" en formato HH:mm
  dayOfWeek?: number;          // 0-6 para weekly (0=Domingo, 1=Lunes...)
  dayOfMonth?: number;         // 1-31 para monthly
  budgetPercent?: number;      // solo si type === 'budget_alert' — ej: 80
  sound: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  createdAt?: Timestamp | Date;
  lastTriggered?: Timestamp | Date | null;
  date?: string; // YYYY-MM-DD: la fecha de 'once', o el día y mes que se repite cada año en 'yearly'
  alerts?: ReminderAlert[]; // Alertas múltiples relativas al tiempo principal
  paidDates?: string[];     // Vencimientos ya pagados (YYYY-MM-DD de cada ocurrencia)
}

export async function getUserReminders(userId: string): Promise<Reminder[]> {
  const ref = collection(db, 'fl_reminders');
  const q = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      lastTriggered: data.lastTriggered instanceof Timestamp ? data.lastTriggered.toDate() : data.lastTriggered,
    };
  }) as Reminder[];
}

export async function addReminder(reminder: Omit<Reminder, 'id'>): Promise<string> {
  const ref = collection(db, 'fl_reminders');
  const docRef = await addDoc(ref, { 
    ...reminder, 
    createdAt: serverTimestamp(),
    lastTriggered: null 
  });
  return docRef.id;
}

export async function updateReminder(id: string, data: Partial<Reminder>) {
  const docRef = doc(db, 'fl_reminders', id);
  // Si mandamos un Date para lastTriggered, se guarda como Timestamp de Firebase
  await updateDoc(docRef, data);
}

// Marca como pagado un vencimiento puntual; el recordatorio sigue activo para los siguientes
export async function markReminderPaid(id: string, dueDateKey: string) {
  await updateDoc(doc(db, 'fl_reminders', id), { paidDates: arrayUnion(dueDateKey) });
}

export async function deleteReminder(id: string) {
  const docRef = doc(db, 'fl_reminders', id);
  await deleteDoc(docRef);
}

// ─── NOTAS (NOTES) ─────────────────────────────────────────────────────────

export interface Note {
  id?: string;
  userId: string;
  title: string;
  content: string;
  color: string; // Hex color or predefined color name for Google Keep style
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export async function getUserNotes(userId: string): Promise<Note[]> {
  const ref = collection(db, 'fl_notes');
  const q = query(ref, where('userId', '==', userId), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt,
    };
  }) as Note[];
}

export async function addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = collection(db, 'fl_notes');
  const docRef = await addDoc(ref, { 
    ...note, 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateNote(id: string, data: Partial<Note>) {
  const docRef = doc(db, 'fl_notes', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteNote(id: string) {
  const docRef = doc(db, 'fl_notes', id);
  await deleteDoc(docRef);
}


// ─── METAS DE AHORRO (GOALS) ───────────────────────────────────────────────

export type GoalPriority = 'alta' | 'media' | 'baja';

export interface GoalMovement {
  amount: number;  // positivo = ahorro, negativo = retiro
  date: string;    // ISO
  note?: string;
}

export interface Goal {
  id?: string;
  userId: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  priority: GoalPriority;
  deadline?: string | null; // YYYY-MM
  movements?: GoalMovement[];
  completedAt?: string | null;
  createdAt?: Timestamp | Date;
}

export async function addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'fl_goals'), { ...goal, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateGoal(id: string, data: Partial<Goal>) {
  await updateDoc(doc(db, 'fl_goals', id), data);
}

export async function deleteGoal(id: string) {
  await deleteDoc(doc(db, 'fl_goals', id));
}

// Registra un ahorro (o retiro, con monto negativo) y actualiza el acumulado
export async function addGoalMovement(goal: Goal, amount: number, note?: string) {
  if (!goal.id) return;
  const savedAmount = Math.max(0, goal.savedAmount + amount);
  const movement: GoalMovement = { amount, date: new Date().toISOString(), ...(note ? { note } : {}) };
  const reached = savedAmount >= goal.targetAmount;
  await updateDoc(doc(db, 'fl_goals', goal.id), {
    savedAmount,
    movements: arrayUnion(movement),
    completedAt: reached ? (goal.completedAt || movement.date) : null,
  });
  return { savedAmount, reached };
}


// ─── INVERSIONES (CDT) ─────────────────────────────────────────────────────
// Plata guardada a plazo: no es un gasto ni cuenta en lo disponible del mes.
// Por privacidad no se guardan números de CDT, de cuenta ni nombres de titulares.

export interface InvestmentPeriod {
  startDate: string;     // YYYY-MM-DD
  maturityDate: string;  // YYYY-MM-DD
  amount: number;
  rateEA: number;
  interest: number;      // intereses brutos del periodo
  outcome: 'renovado' | 'pagado';
}

export interface Investment {
  id?: string;
  userId: string;
  kind: 'cdt';
  bank: string;
  amount: number;              // capital
  rateEA: number;              // tasa efectiva anual, en %
  nominalRate?: number | null; // tasa nominal que muestra el banco (opcional)
  startDate: string;           // YYYY-MM-DD (apertura o última renovación)
  maturityDate: string;        // YYYY-MM-DD
  bankInterest?: number | null; // intereses del periodo según el banco; si falta, se estiman
  withholdingPct: number;      // retención en la fuente sobre los intereses, en %
  autoRenew?: boolean;
  note?: string;
  status: 'activo' | 'cerrado';
  closedAt?: string | null;
  history?: InvestmentPeriod[];
  // Plata que entró al CDT desde una cuenta (apertura, abono o renovación con más capital).
  // accountId null = ya estaba ahorrada: no se descuenta de ninguna cuenta.
  fundings?: InvestmentFunding[];
  // Plata que volvió a una cuenta (al pagarlo o al retirar parte al renovar)
  payouts?: InvestmentFunding[];
  createdAt?: Timestamp | Date;
}

export interface InvestmentFunding {
  at: string;               // ISO
  amount: number;
  accountId: string | null;
  kind: 'apertura' | 'abono' | 'renovacion' | 'pago';
}

export async function addInvestment(inv: Omit<Investment, 'id' | 'createdAt'>): Promise<string> {
  const docRef = await addDoc(collection(db, 'fl_investments'), { ...inv, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateInvestment(id: string, data: Partial<Investment>) {
  await updateDoc(doc(db, 'fl_investments', id), data);
}

export async function deleteInvestment(id: string) {
  await deleteDoc(doc(db, 'fl_investments', id));
}


// ─── CUENTAS Y TRANSFERENCIAS ──────────────────────────────────────────────
// El saldo de una cuenta parte del "saldo base" que la persona escribe (o ajusta) en una fecha,
// y desde ahí lo mueven los gastos/ingresos de esa cuenta y las transferencias. Ver lib/accounts.ts.
// Por privacidad no se guardan números de cuenta.

export type AccountKind = 'banco' | 'billetera' | 'efectivo' | 'credito';

export interface Account {
  id?: string;
  userId: string;
  name: string;              // "Bancolombia", "Nequi", "Efectivo"…
  kind: AccountKind;
  methods: string[];         // medios de pago que caen en esta cuenta ("Bancolombia", "Tarjeta débito")
  isDefault?: boolean;       // recibe los movimientos que no dicen con qué se pagaron
  baseBalance: number;       // saldo en baseAt (en crédito: negativo = lo que se debe)
  baseAt: string;            // ISO
  adjustments?: { at: string; from: number; to: number }[];
  archived?: boolean;
  createdAt?: Timestamp | Date;
}

export interface Transfer {
  id?: string;
  userId: string;
  fromId: string;
  toId: string;
  amount: number;
  date: string;              // ISO
  note?: string;
  createdAt?: Timestamp | Date;
}

export async function addAccount(a: Omit<Account, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'fl_accounts'), { ...a, createdAt: serverTimestamp() });
  return ref.id;
}
export async function updateAccount(id: string, data: Partial<Account>) {
  await updateDoc(doc(db, 'fl_accounts', id), data);
}
export async function deleteAccount(id: string) {
  await deleteDoc(doc(db, 'fl_accounts', id));
}
export async function addTransfer(t: Omit<Transfer, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'fl_transfers'), { ...t, createdAt: serverTimestamp() });
  return ref.id;
}
export async function deleteTransfer(id: string) {
  await deleteDoc(doc(db, 'fl_transfers', id));
}
