import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, setDoc, arrayUnion } from 'firebase/firestore';

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
  { label: 'Deportes', icon: 'deportes', color: '#065F46' },
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
  { label: 'Otros', icon: '📦', color: '#6B7280' },
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
}

export async function getUserDebts(userId: string) {
  const debtsRef = collection(db, 'fl_debts');
  const q = query(debtsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const debts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
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
    createdAt: serverTimestamp(),
  });
  return { id: docRef.id, ...debt, createdAt: new Date() };
}

export async function updateDebt(id: string, debt: Partial<Debt>) {
  const docRef = doc(db, 'fl_debts', id);
  await updateDoc(docRef, debt);
}

export async function deleteDebt(id: string) {
  const docRef = doc(db, 'fl_debts', id);
  await deleteDoc(docRef);
}

export interface UserProfile {
  id?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  phone?: string;
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
