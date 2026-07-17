import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, setDoc, arrayUnion, orderBy } from 'firebase/firestore';

export interface Transaction {
  id?: string;
  type: 'gasto' | 'ingreso';
  amount: number;
  category: string;
  description?: string;
  date: Timestamp | Date;
  userId?: string;
}

export interface CustomCategory {
  id?: string;
  label: string;
  icon: string;
  color: string;
  userId: string;
}

export const BASE_CATEGORIES = [
  // Originales / Comida y Ocio expandidos
  { label: 'Restaurantes', icon: '🍽️', color: '#FF5B5B' },
  { label: 'Mercado', icon: '🛒', color: '#10B981' },
  { label: 'Café y Antojos', icon: '☕', color: '#D1A153' },
  { label: 'Licores y Bares', icon: '🍺', color: '#F5A623' },
  { label: 'Transporte', icon: '🚌', color: '#F5A623' },
  { label: 'Entretenimiento', icon: '🎮', color: '#A855F7' },
  { label: 'Hogar', icon: '🏠', color: '#00E5A0' },
  { label: 'Arriendo', icon: '🏢', color: '#F59E0B' },
  { label: 'Sueldo', icon: '💰', color: '#00E5A0' },
  { label: 'Inversiones', icon: '📈', color: '#3B82F6' },
  { label: 'Regalos', icon: '🎁', color: '#EC4899' },
  // Nuevas pedidas por el usuario (con iconos corporativos nativos)
  { label: 'Claro Hogar', icon: 'claro_hogar', color: '#E11D48' },
  { label: 'Claro Móvil', icon: 'claro_movil', color: '#E11D48' },
  { label: 'Netflix', icon: 'netflix', color: '#E50914' },
  { label: 'Spotify', icon: 'spotify', color: '#1DB954' },
  { label: 'Google', icon: 'google', color: '#4285F4' },
  { label: 'Play Store', icon: 'play_store', color: '#607D8B' },
  { label: 'YouTube', icon: 'youtube', color: '#FF0000' },
  { label: 'YT Music', icon: 'yt music', color: '#FF0000' },
  { label: 'Viajes', icon: '✈️', color: '#06B6D4' },
  { label: 'Agua', icon: '💧', color: '#3B82F6' },
  { label: 'Luz', icon: '💡', color: '#F5A623' },
  { label: 'EPM', icon: 'epm', color: '#00A859' },
  { label: 'Administración', icon: '🔑', color: '#8B5CF6' },
  { label: 'Alcanos', icon: 'alcanos', color: '#0054A6' },
  { label: 'Efigas', icon: 'efigas', color: '#009EE0' },
  { label: 'Gas natural', icon: '🔥', color: '#EF4444' },
  { label: 'Parqueadero', icon: 'parqueadero', color: '#1E3A8A' },
  { label: 'Cine', icon: 'cine', color: '#7F1D1D' },
  { label: 'Fútbol', icon: '⚽', color: '#0F766E' },
  { label: 'Gimnasio', icon: '🏋️‍♂️', color: '#1E293B' },
  { label: 'Ciclismo', icon: '🚲', color: '#0369A1' },
  { label: 'Running', icon: '🏃‍♂️', color: '#B45309' },
  { label: 'Decathlon', icon: 'decathlon', color: '#0082C3' },
  { label: 'Nike', icon: 'nike', color: '#000000' },
  { label: 'Adidas', icon: 'adidas', color: '#000000' },
  { label: 'D1', icon: 'd1', color: '#E30613' },
  { label: 'Olímpica', icon: 'olimpica', color: '#E30613' },
  { label: 'Jumbo', icon: 'jumbo', color: '#00A859' },
  { label: 'Carulla', icon: 'carulla', color: '#005A36' },
  { label: 'Homecenter', icon: 'homecenter', color: '#004B87' },
  { label: 'Ktronix', icon: 'ktronix', color: '#FF6A00' },
  { label: 'Panamericana', icon: 'panamericana', color: '#0A2240' },
  { label: 'Frisby', icon: 'frisby', color: '#E30613' },
  { label: 'Popsy', icon: 'popsy', color: '#E10074' },
  { label: 'BBVA', icon: 'bbva', color: '#1D4ED8' },
  { label: 'Bancolombia', icon: 'bancolombia', color: '#FBBF24' },
  { label: 'Nequi', icon: 'nequi', color: '#D946EF' },
  { label: 'Daviplata', icon: 'daviplata', color: '#E30613' },
  { label: 'Davivienda', icon: 'davivienda', color: '#E30613' },
  // Compras y mercado (las más solicitadas)
  { label: 'Tienda / Minimercado', icon: '🏪', color: '#10B981' },
  { label: 'Verduras y Frutas',    icon: '🥦', color: '#22C55E' },
  { label: 'Carnicería',           icon: '🥩', color: '#EF4444' },
  { label: 'Panadería',            icon: '🥐', color: '#D97706' },
  { label: 'Aseo del hogar',       icon: '🧹', color: '#6366F1' },
  { label: 'Mascotas',             icon: '🐾', color: '#F59E0B' },
  { label: 'Médico / Salud',       icon: '🏥', color: '#3B82F6' },
  { label: 'Farmacia',             icon: '💊', color: '#14B8A6' },
  { label: 'Educación',            icon: '📚', color: '#8B5CF6' },
  { label: 'Ropa y Calzado',       icon: '👟', color: '#EC4899' },
  // Nuevas agregadas
  { label: 'Sura', icon: 'sura', color: '#0033A0' },
  { label: 'Colsanitas', icon: 'colsanitas', color: '#00467F' },
  { label: 'Compensar', icon: 'compensar', color: '#00873A' },
  { label: 'Nueva EPS', icon: 'nueva eps', color: '#005A9C' },
  { label: 'Odontología', icon: '🦷', color: '#14B8A6' },
  { label: 'Bienestar / Spa', icon: '💆', color: '#EC4899' },
  { label: 'Exámenes', icon: '🧪', color: '#8B5CF6' },
  { label: 'FNA', icon: 'fna', color: '#003DA5' },
  { label: 'Cesantías', icon: '🏦', color: '#10B981' },
  { label: 'Cuota de crédito', icon: '💳', color: '#F59E0B' },
  { label: 'Impuestos', icon: '🏛️', color: '#EF4444' },
  { label: 'Bolsa / Acciones', icon: '📊', color: '#3B82F6' },
  { label: 'Ahorro', icon: '🐷', color: '#F472B6' },
  { label: 'Comfama', icon: 'comfama', color: '#FF6A00' },
  { label: 'Colsubsidio', icon: 'colsubsidio', color: '#E30613' },
  { label: 'Ropa', icon: '👕', color: '#8B5CF6' },
  { label: 'Calzado', icon: '👠', color: '#EC4899' },
  { label: 'Zara', icon: 'zara', color: '#000000' },
  { label: 'H&M', icon: 'h&m', color: '#CD102D' },
  { label: 'Belleza', icon: '💄', color: '#EC4899' },
  { label: 'Matrícula', icon: '🎓', color: '#F59E0B' },
  { label: 'Udemy', icon: 'udemy', color: '#A435F0' },
  { label: 'Coursera', icon: 'coursera', color: '#0056D2' },
  { label: 'Útiles', icon: '✏️', color: '#F5A623' },
  { label: 'Gasolina', icon: '⛽', color: '#EF4444' },
  { label: 'Rappi', icon: 'rappi', color: '#FF441F' },
  { label: 'Uber', icon: 'uber', color: '#000000' },
  { label: 'SOAT', icon: '🚗', color: '#10B981' },
  { label: 'Tecnomecánica', icon: '🔧', color: '#64748B' },
  { label: 'Peajes', icon: '🛣️', color: '#6B7280' },
  { label: 'Multas', icon: '🛑', color: '#EF4444' },
  { label: 'Rumba', icon: '🪩', color: '#D946EF' },
  { label: 'Apuestas', icon: '🎲', color: '#F59E0B' },
  { label: 'Eventos', icon: '🎫', color: '#8B5CF6' },
  { label: 'Empleada', icon: '🧹', color: '#0EA5E9' },
  { label: 'Reparaciones', icon: '🔨', color: '#64748B' },
  { label: 'Veterinaria', icon: '🩺', color: '#14B8A6' },
  { label: 'Guardería', icon: '🐕', color: '#F59E0B' },
  { label: 'Inventario', icon: '📦', color: '#8B4513' },
  { label: 'Nómina', icon: '💼', color: '#3B82F6' },
  { label: 'Insumos', icon: '🛒', color: '#10B981' },
  { label: 'Diezmo', icon: '⛪', color: '#F59E0B' },
  { label: 'Ayuda familiar', icon: '🤝', color: '#EC4899' },
  { label: 'Préstamos prestados', icon: '💸', color: '#059669' },
  { label: 'Mantenimiento', icon: '🔧', color: '#64748B' },
  { label: 'Mudanza', icon: '📦', color: '#8B4513' },
  { label: 'Muebles', icon: '🛋️', color: '#D97706' },
  { label: 'Remodelación', icon: '👷', color: '#F59E0B' },
  { label: 'Freelance', icon: '💻', color: '#3B82F6' },
  { label: 'Arriendo recibido', icon: '🏘️', color: '#10B981' },
  { label: 'Transferencia', icon: '📲', color: '#06B6D4' },
  { label: 'Venta', icon: '🏷️', color: '#10B981' },
];

export const FIXED_CATEGORIES = [
  'Arriendo', 'Administración', 'Agua', 'Luz', 'EPM', 'Gas natural', 'Efigas', 'Alcanos',
  'Claro Hogar', 'Claro Móvil', 'Netflix', 'Spotify', 'YouTube', 'YT Music', 'Google', 'Play Store',
  'Cuota de crédito', 'Gimnasio', 'Empleada', 'Pensión', 'Matrícula', 'SOAT', 'Tecnomecánica'
];

export const EXPENSE_CATEGORIES = BASE_CATEGORIES;
export const INCOME_CATEGORIES = BASE_CATEGORIES;

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

// Función financiera para calcular intereses acumulados día a día (Capitalización Diaria de la E.A.)
export function calculateDebtInterest(debt: Debt): { accumulatedInterest: number, currentTotal: number } {
  const defaultResult = { accumulatedInterest: 0, currentTotal: debt.totalAmount };
  
  if (!debt.interestRate || debt.interestRate <= 0) {
    return defaultResult;
  }

  const createdDate = debt.createdAt instanceof Date 
    ? debt.createdAt 
    : (debt.createdAt && 'toDate' in (debt.createdAt as any) 
        ? (debt.createdAt as any).toDate() 
        : new Date());

  const today = new Date();
  
  // Si por algún motivo la fecha de creación es futura, retornar valores por defecto
  if (createdDate.getTime() >= today.getTime()) {
    return defaultResult;
  }

  // Convertir Tasa Efectiva Anual (E.A.) a Tasa Nominal Mensual y luego a Nominal Anual (N.A.M.V)
  const nominalMensual = Math.pow(1 + debt.interestRate / 100, 1 / 12) - 1;
  const nominalAnual = nominalMensual * 12;
  
  // Dividir la tasa Nominal Anual por 360 días para obtener la tasa diaria comercial
  const dailyRate = nominalAnual / 360;

  // Ordenar el historial de abonos cronológicamente
  const paymentsSorted = debt.payments 
    ? [...debt.payments].sort((a, b) => {
        const da = a.date instanceof Date ? a.date : new Date(a.date as any);
        const db = b.date instanceof Date ? b.date : new Date(b.date as any);
        return da.getTime() - db.getTime();
      })
    : [];

  let currentBalance = debt.totalAmount;
  let accumulatedInterest = 0;
  let currentDate = new Date(createdDate.getTime());
  
  // Normalizar currentDate a las 00:00:00 del día de creación
  currentDate.setHours(0, 0, 0, 0);
  const targetDate = new Date(today.getTime());
  targetDate.setHours(0, 0, 0, 0);

  // Simulación día a día para acumular interés y aplicar abonos a tiempo
  while (currentDate.getTime() < targetDate.getTime()) {
    // 1. Calcular el interés diario sobre el saldo actual (interés simple diario)
    const dailyInterest = currentBalance * dailyRate;
    accumulatedInterest += dailyInterest;

    // 2. Avanzar un día
    currentDate.setDate(currentDate.getDate() + 1);

    // 3. Aplicar los abonos correspondientes a este día específico
    const dateStr = currentDate.toLocaleDateString('sv-SE');
    const dayPayments = paymentsSorted.filter(p => {
      const pd = p.date instanceof Date ? p.date : new Date(p.date as any);
      return pd.toLocaleDateString('sv-SE') === dateStr;
    });

    for (const pay of dayPayments) {
      currentBalance = Math.max(0, currentBalance - pay.amount);
    }
  }

  // Redondear el interés acumulado al entero más cercano (comportamiento bancario estándar en COP)
  accumulatedInterest = Math.round(accumulatedInterest);

  return {
    accumulatedInterest,
    currentTotal: currentBalance + accumulatedInterest,
  };
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
  type: 'once' | 'daily' | 'weekly' | 'monthly' | 'budget_alert';
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
  date?: string; // Formato YYYY-MM-DD para recordatorios 'once'
  alerts?: ReminderAlert[]; // Alertas múltiples relativas al tiempo principal
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

