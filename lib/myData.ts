// Tus datos: descargarlos (JSON completo y CSV de movimientos), borrar lo registrado o eliminar la cuenta.
import { collection, deleteField, doc, getDoc, getDocs, query, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '@/lib/firebase';
import { getLocalDateString } from '@/lib/dateUtils';

// Lo que la persona registra (se puede borrar desde la app)
export const RECORD_COLLECTIONS: { id: string; label: string }[] = [
  { id: 'fl_expenses', label: 'movimientos' },
  { id: 'fl_debts', label: 'deudas' },
  { id: 'fl_accounts', label: 'cuentas' },
  { id: 'fl_transfers', label: 'movimientos entre cuentas' },
  { id: 'fl_investments', label: 'inversiones y ahorros' },
  { id: 'fl_goals', label: 'metas' },
  { id: 'fl_reminders', label: 'recordatorios' },
  { id: 'fl_notes', label: 'notas' },
  { id: 'fl_customCategories', label: 'categorías propias' },
];
// Solo se exportan (los pagos los maneja el servidor)
const READ_ONLY = ['fl_payments', 'fl_manual_payments'];

// Fechas legibles en el archivo
function clean(v: any): any {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
  return v;
}

async function readAll(uid: string, name: string) {
  const snap = await getDocs(query(collection(db, name), where('userId', '==', uid)));
  return snap.docs.map(d => {
    const data = { id: d.id, ...d.data() } as any;
    delete data.image; // la imagen del comprobante no va en la descarga
    return clean(data);
  });
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const today = () => getLocalDateString(new Date());

/** Descarga todo lo de la persona en un archivo JSON. Devuelve cuántos registros salieron. */
export async function exportJson(uid: string) {
  const profileSnap = await getDoc(doc(db, 'users', uid));
  const profile = profileSnap.exists() ? clean(profileSnap.data()) : null;
  if (profile) delete profile.pushTokens; // identificadores técnicos del celular
  const out: Record<string, unknown> = { exportadoEl: new Date().toISOString(), app: 'FLOWI', perfil: profile };
  let total = 0;
  for (const c of [...RECORD_COLLECTIONS.map(c => c.id), ...READ_ONLY]) {
    const rows = await readAll(uid, c).catch(() => []);
    out[c.replace(/^fl_/, '')] = rows;
    total += rows.length;
  }
  download(`flowi-mis-datos-${today()}.json`, JSON.stringify(out, null, 2), 'application/json');
  return total;
}

/** Descarga los gastos e ingresos en CSV (se abre en Excel o Google Sheets). */
export async function exportCsv(uid: string) {
  const rows = (await readAll(uid, 'fl_expenses'))
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const cell = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Comercio', 'Medio de pago', 'Negocio'];
  const lines = rows.map((t: any) => [
    t.date ? new Date(t.date).toLocaleString('es-CO') : '', t.type === 'ingreso' ? 'Ingreso' : 'Gasto', t.category,
    t.description, t.amount, t.merchant, t.paymentMethod, t.business ? 'Sí' : '',
  ].map(cell).join(';'));
  // ";" y BOM para que Excel en español lo abra bien con tildes
  download(`flowi-movimientos-${today()}.csv`, '﻿' + [header.join(';'), ...lines].join('\r\n'), 'text/csv;charset=utf-8');
  return rows.length;
}

/** Borra todo lo registrado pero deja la cuenta (perfil, plan y configuración). */
export async function deleteMyRecords(uid: string, onProgress?: (done: number) => void) {
  let done = 0;
  for (const { id } of RECORD_COLLECTIONS) {
    const snap = await getDocs(query(collection(db, id), where('userId', '==', uid)));
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
      done += Math.min(400, snap.docs.length - i);
      onProgress?.(done);
    }
  }
  // Lo que dependía de esos registros
  await updateDoc(doc(db, 'users', uid), {
    categoryBudgets: deleteField(), closedMonths: deleteField(), commitmentSkips: deleteField(),
    txCount: deleteField(), lastTxDay: deleteField(),
  }).catch(() => {});
  return done;
}

/** Elimina la cuenta y todos sus datos (en el servidor). */
export async function deleteMyAccount() {
  const fn = httpsCallable<{ confirm: string }, { ok: boolean; removed: number }>(getFunctions(app, 'us-central1'), 'eliminarMiCuenta');
  const res = await fn({ confirm: 'ELIMINAR' });
  return res.data;
}

/** Quita lo que FLOWI guardó en este celular para esa cuenta. */
export function clearLocalData(uid: string) {
  try {
    Object.keys(localStorage).filter(k => k.includes(uid)).forEach(k => localStorage.removeItem(k));
    const known = JSON.parse(localStorage.getItem('knownAccounts') || '[]');
    localStorage.setItem('knownAccounts', JSON.stringify(known.filter((a: { uid: string }) => a.uid !== uid)));
  } catch { /* nada */ }
}
