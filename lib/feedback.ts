// Comentarios y sugerencias: cada persona cuenta lo que le gusta, lo que no, ideas y fallas, por parte de la app.
// El administrador ve todo con estadísticas para decidir qué mejorar (app/servicios/opiniones).
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type FeedbackType = 'gusta' | 'mejorar' | 'idea' | 'error';

export const FEEDBACK_TYPES: { id: FeedbackType; label: string; emoji: string; tone: string }[] = [
  { id: 'gusta', label: 'Me gusta', emoji: '👍', tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { id: 'mejorar', label: 'No me gusta', emoji: '👎', tone: 'text-red-400 border-red-500/40 bg-red-500/10' },
  { id: 'idea', label: 'Tengo una idea', emoji: '💡', tone: 'text-amber-300 border-amber-400/40 bg-amber-400/10' },
  { id: 'error', label: 'Algo falla', emoji: '🐞', tone: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
];

export const FEEDBACK_AREAS = [
  'Inicio', 'Gastos', 'Ingresos', 'Deudas', 'Cuentas y tarjetas', 'Voz e IA', 'Fotos y recibos',
  'Amigos y compartidos', 'Metas y ahorro', 'Recordatorios', 'Diseño y facilidad', 'Otro',
];

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  type: FeedbackType;
  area: string;
  rating: number | null;   // 1 a 5 (opcional)
  text: string;
  status: 'nuevo' | 'visto' | 'hecho';
  reply?: string | null;   // respuesta del administrador
  createdAt?: Date;
}

const toDate = (v: any): Date | undefined => (v?.toDate ? v.toDate() : v instanceof Date ? v : undefined);
const map = (d: any): Feedback => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) });

export const sendFeedback = (f: Omit<Feedback, 'id' | 'status' | 'reply' | 'createdAt'>) =>
  addDoc(collection(db, 'fl_feedback'), { ...f, text: f.text.trim().slice(0, 1000), status: 'nuevo', reply: null, createdAt: serverTimestamp() });

export const watchMyFeedback = (uid: string, cb: (l: Feedback[]) => void) =>
  onSnapshot(query(collection(db, 'fl_feedback'), where('userId', '==', uid)),
    s => cb(s.docs.map(map).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))), () => cb([]));

/** Solo el administrador: todas las opiniones (las más recientes primero). */
export const watchAllFeedback = (cb: (l: Feedback[]) => void, onError?: () => void) =>
  onSnapshot(query(collection(db, 'fl_feedback'), orderBy('createdAt', 'desc'), limit(500)), s => cb(s.docs.map(map)), () => onError?.());

export const updateFeedback = (id: string, data: Partial<Pick<Feedback, 'status' | 'reply'>>) => updateDoc(doc(db, 'fl_feedback', id), data);
export const deleteFeedback = (id: string) => deleteDoc(doc(db, 'fl_feedback', id));
