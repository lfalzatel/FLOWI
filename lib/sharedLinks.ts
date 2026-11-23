// Gastos compartidos entre amigos de FLOWI (etapa 2).
// Cuando pagas algo y lo compartes con un amigo, se crea un "enlace" en fl_shared_links que ven los dos.
// Tu amigo lo acepta y le queda en su FLOWI como gasto suyo ("Pagó Luis"), debiéndote su parte.
// Los abonos (y lo que asumes si no te paga) se sincronizan por el enlace en los dos sentidos.
//
// fl_shared_links/{txId}_{amigoUid}:
//   owner, friend, users:[owner, friend], ownerName, friendName
//   txId (gasto de quien pagó), friendTxId (el gasto que se creó en el FLOWI del amigo)
//   description, category, date (ISO), share (lo que le toca al amigo)
//   status: pending | accepted | rejected | deleted
//   payments: [{ id, amount, at, by }]   removed: [ids de abonos borrados]   absorbed: lo que asumió quien pagó
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SharedPayment } from '@/lib/shared';

export interface LinkPayment { id: string; amount: number; at: string; by: string }

export interface SharedLink {
  id: string;
  owner: string; friend: string; users: string[];
  ownerName: string; friendName: string;
  txId: string; friendTxId?: string | null;
  description: string; category: string; date: string;
  share: number;
  status: 'pending' | 'accepted' | 'rejected' | 'deleted';
  payments?: LinkPayment[];
  removed?: string[];
  absorbed?: number;
}

export const linkId = (txId: string, friendUid: string) => `${txId}_${friendUid}`;

/** Clave de un abono (los viejos no tienen id). */
export const payKey = (p: { id?: string; at: string; amount: number }) => p.id || `${p.at}|${p.amount}`;

export const newPaymentId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/**
 * Une los abonos de los dos lados. Devuelve los que faltan en cada lado y la lista local final.
 * Los borrados (removed) no vuelven a aparecer.
 */
export function mergePayments(local: SharedPayment[] = [], link: LinkPayment[] = [], removed: string[] = [], me = '') {
  const gone = new Set(removed);
  const localKeys = new Set(local.map(payKey));
  const linkKeys = new Set(link.map(payKey));
  const toLink: LinkPayment[] = local
    .filter(p => !linkKeys.has(payKey(p)) && !gone.has(payKey(p)))
    .map(p => ({ id: payKey(p), amount: p.amount, at: p.at, by: me }));
  const toLocal: SharedPayment[] = link
    .filter(p => !localKeys.has(payKey(p)) && !gone.has(payKey(p)))
    .map(p => ({ id: p.id, amount: p.amount, at: p.at, accountId: null }));
  const finalLocal = [...local.filter(p => !gone.has(payKey(p))), ...toLocal]
    .sort((a, b) => a.at.localeCompare(b.at));
  const changedLocal = toLocal.length > 0 || finalLocal.length !== local.length;
  return { toLink, finalLocal, changedLocal };
}

export async function createLink(l: Omit<SharedLink, 'id' | 'status' | 'payments' | 'removed' | 'absorbed' | 'friendTxId'>) {
  await setDoc(doc(db, 'fl_shared_links', linkId(l.txId, l.friend)), {
    ...l, status: 'pending', payments: [], removed: [], absorbed: 0, friendTxId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

export const updateLink = (id: string, data: Partial<SharedLink>) =>
  updateDoc(doc(db, 'fl_shared_links', id), { ...data, updatedAt: serverTimestamp() });
