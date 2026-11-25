// Escrituras a Firestore que funcionan SIN INTERNET.
// Con la memoria local activada (lib/firebase.ts), Firestore guarda cada cambio en el celular al
// instante y lo sube solo cuando vuelve la conexión. Pero la promesa de addDoc/setDoc… espera a que
// el SERVIDOR confirme: sin internet, el botón "Guardar" se quedaba cargando para siempre.
// Estas versiones esperan como máximo unos segundos (o nada si se sabe que no hay internet) y siguen;
// el cambio ya quedó guardado en el celular y se sincroniza después.
// Úsalas en vez de las de 'firebase/firestore' (mismo nombre y mismos argumentos).
import {
  addDoc as fbAddDoc, setDoc as fbSetDoc, updateDoc as fbUpdateDoc, deleteDoc as fbDeleteDoc,
  doc, CollectionReference, DocumentReference,
} from 'firebase/firestore';

const WAIT_MS = 6000; // con internet lento: tras esto se sigue (el cambio queda en cola en el celular)

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

function settle<T>(p: Promise<T>): Promise<T | void> {
  p.catch(e => console.warn('FLOWI: el cambio se sincronizará cuando vuelva la conexión', e));
  if (offline()) return Promise.resolve();
  return Promise.race([p, new Promise<void>(r => setTimeout(r, WAIT_MS))]);
}

/** Como addDoc, pero el id se crea en el celular y no espera al servidor sin internet. */
export async function addDoc<T = any>(ref: CollectionReference<T>, data: any): Promise<DocumentReference<T>> {
  const d = doc(ref) as DocumentReference<T>;
  if (offline()) { settle(fbSetDoc(d, data)); return d; }
  // Con internet se espera la confirmación (así los errores, como un permiso negado, llegan a la pantalla)
  await Promise.race([fbSetDoc(d, data), new Promise<void>(r => setTimeout(r, WAIT_MS))]);
  return d;
}

export const setDoc = ((ref: any, data: any, options?: any) =>
  options ? settle(fbSetDoc(ref, data, options)) : settle(fbSetDoc(ref, data))) as unknown as typeof fbSetDoc;

export const updateDoc = ((ref: any, ...rest: any[]) => settle((fbUpdateDoc as any)(ref, ...rest))) as unknown as typeof fbUpdateDoc;

export const deleteDoc = ((ref: any) => settle(fbDeleteDoc(ref))) as unknown as typeof fbDeleteDoc;
