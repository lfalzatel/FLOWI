'use client';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import type { PlanOption } from '@/lib/plans';

// Pago de un plan por transferencia directa (Nequi, Bre-B): la persona envía el comprobante y el
// administrador lo revisa. Al aprobarlo, el servidor (functions: revisarPagoManual) activa Premium.
// El comprobante se guarda comprimido dentro del documento (fl_manual_payments).

export interface ManualPayment {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  plan: PlanOption['id'];
  amount: number;
  note?: string;
  image: string;            // data URL JPEG comprimida
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt?: Date;
  reviewNote?: string;
}

/** Reduce la captura a JPEG de máximo 1100 px (queda en ~100–300 KB). */
export function compressProof(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1100;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let q = 0.75;
      let data = canvas.toDataURL('image/jpeg', q);
      while (data.length > 700_000 && q > 0.35) { q -= 0.1; data = canvas.toDataURL('image/jpeg', q); }
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

export async function submitManualPayment(p: {
  userId: string; userName?: string; userEmail?: string; plan: PlanOption['id']; amount: number; image: string; note?: string;
}) {
  await addDoc(collection(db, 'fl_manual_payments'), {
    ...p,
    note: (p.note || '').slice(0, 200),
    status: 'PENDING',
    createdAt: serverTimestamp(),
  });
}

const toPayment = (d: any): ManualPayment => {
  const x = d.data();
  return { id: d.id, ...x, createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : undefined };
};

/** Comprobantes de la persona (para mostrar "en revisión"). */
export function watchMyManualPayments(userId: string, cb: (list: ManualPayment[]) => void) {
  const q = query(collection(db, 'fl_manual_payments'), where('userId', '==', userId));
  return onSnapshot(q, s => cb(s.docs.map(toPayment).sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))), () => cb([]));
}

/** Comprobantes por revisar (solo administrador). */
export function watchPendingManualPayments(cb: (list: ManualPayment[]) => void) {
  // Sin orderBy para no requerir un índice compuesto; se ordena aquí
  const q = query(collection(db, 'fl_manual_payments'), where('status', '==', 'PENDING'));
  return onSnapshot(q, s => cb(s.docs.map(toPayment).sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0))), () => cb([]));
}

export async function reviewManualPayment(id: string, approve: boolean, note?: string) {
  const fn = httpsCallable<{ id: string; approve: boolean; note?: string }, { status: string; premiumUntil?: string }>(
    getFunctions(app, 'us-central1'), 'revisarPagoManual');
  return (await fn({ id, approve, note })).data;
}
