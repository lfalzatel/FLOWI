import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface Transaction {
  id?: string;
  type: 'gasto' | 'ingreso';
  amount: number;
  category: string;
  description?: string;
  date: Timestamp | Date;
  userId?: string;
}

export const EXPENSE_CATEGORIES = [
  { label: 'Comida', icon: '🍔', color: '#FF5B5B' },
  { label: 'Transporte', icon: '🚗', color: '#F5A623' },
  { label: 'Entretenimiento', icon: '🎮', color: '#A855F7' },
  { label: 'Hogar', icon: '🏠', color: '#00E5A0' },
  { label: 'Otros', icon: '💡', color: '#6B7280' },
];

export const INCOME_CATEGORIES = [
  { label: 'Sueldo', icon: '💰', color: '#00E5A0' },
  { label: 'Inversiones', icon: '📈', color: '#3B82F6' },
  { label: 'Regalos', icon: '🎁', color: '#EC4899' },
  { label: 'Otros', icon: '💡', color: '#6B7280' },
];

export async function getUserTransactions(userId: string, type?: 'gasto' | 'ingreso') {
  const expensesRef = collection(db, 'expenses');
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
  const expensesRef = collection(db, 'expenses');
  const docRef = await addDoc(expensesRef, {
    ...expense,
    date: expense.date || serverTimestamp(),
  });
  return { id: docRef.id, ...expense, date: expense.date || new Date() };
}
