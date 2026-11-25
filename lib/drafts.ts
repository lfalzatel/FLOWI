'use client';
// Borradores para no perder trabajo si la app se recarga (o el celular la cierra) a mitad de algo:
// un recibo que la IA ya leyó, la foto que estaba leyendo o un gasto a medio llenar.
// Todo queda SOLO en este celular (localStorage + IndexedDB para las fotos): sin servidores ni costos.
// Regla: el borrador se borra cuando la ventana se cierra normalmente (guardar, cerrar, cancelar);
// si la página se recarga, la ventana no alcanza a cerrarse y el borrador sobrevive.

const MAX_AGE_MS = 24 * 3600 * 1000; // después de un día el borrador ya no se ofrece
export const DRAFT_EVENT = 'flowi:drafts-changed';

export type DraftKind = 'voice' | 'expense';

/** Gasto o ingreso a medio llenar en el formulario. */
export interface ExpenseDraft {
  type: 'gasto' | 'ingreso'; amount: string; description: string; category: string;
  merchant: string; paymentMethod: string; isFixed: boolean; date: string; time: string;
}

/** Lo que la IA leyó de un recibo o de los movimientos del banco, con las correcciones hechas. */
export interface VoiceDraft { results: any[]; readKind: 'recibo' | 'movimientos' }

interface Stored<T> { at: number; data: T }

const key = (k: DraftKind) => `flowi-draft-${k}`;

export function saveDraft<T>(kind: DraftKind, data: T) {
  try { localStorage.setItem(key(kind), JSON.stringify({ at: Date.now(), data } as Stored<T>)); } catch { /* sin espacio */ }
}

export function loadDraft<T>(kind: DraftKind): T | null {
  try {
    const raw = localStorage.getItem(key(kind));
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored<T>;
    if (Date.now() - s.at > MAX_AGE_MS) { localStorage.removeItem(key(kind)); return null; }
    return s.data;
  } catch { return null; }
}

export function clearDraft(kind: DraftKind) {
  try { localStorage.removeItem(key(kind)); } catch { /* sin almacenamiento */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DRAFT_EVENT));
}

// ── Fotos del recibo que se estaba leyendo (IndexedDB: guarda archivos sin convertirlos a texto) ──
const DB = 'flowi-drafts';
const STORE = 'files';
const PHOTO_KEY = 'receipt';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}

export async function saveReceiptPhotos(files: File[]) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ at: Date.now(), files }, PHOTO_KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
  db.close();
}

export async function loadReceiptPhotos(): Promise<File[] | null> {
  const db = await openDb();
  if (!db) return null;
  const val = await new Promise<{ at: number; files: File[] } | undefined>(resolve => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(PHOTO_KEY);
    req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(undefined);
  });
  db.close();
  if (!val?.files?.length || Date.now() - val.at > MAX_AGE_MS) return null;
  return val.files;
}

export async function clearReceiptPhotos() {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(PHOTO_KEY);
    tx.oncomplete = () => resolve(); tx.onerror = () => resolve();
  });
  db.close();
}
