// Suscripción a notificaciones push (Firebase Cloud Messaging, gratis) para avisar con la app
// cerrada. Cada celular guarda su "token" en el perfil; la función enviarRecordatorios de
// Firebase (functions/reminders.mjs) los usa para enviar los recordatorios.
import { arrayRemove, arrayUnion, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { pushOn } from './notifPrefs';

const TOKEN_STORAGE = 'flowi_push_token';
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

function storedToken(): string | null {
  try { return localStorage.getItem(TOKEN_STORAGE); } catch { return null; }
}

export async function currentToken(): Promise<string | null> {
  if (!VAPID_KEY || typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return null;
  const { isSupported, getMessaging, getToken } = await import('firebase/messaging');
  if (!(await isSupported())) return null;
  const { app } = await import('./firebase');
  const registration = await navigator.serviceWorker.ready;
  return getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

// Registra este celular para recibir avisos (no hace nada si no hay permiso o falta la clave)
export async function syncPushToken(uid: string): Promise<void> {
  try {
    if (!pushOn()) return;
    const token = await currentToken();
    if (!token || token === storedToken()) return;
    const previous = storedToken();
    await setDoc(doc(db, 'users', uid), { pushTokens: arrayUnion(token) }, { merge: true });
    if (previous) await setDoc(doc(db, 'users', uid), { pushTokens: arrayRemove(previous) }, { merge: true });
    localStorage.setItem(TOKEN_STORAGE, token);
  } catch (e) {
    console.warn('No se pudo activar el push:', e);
  }
}

// Deja de recibir avisos en este celular
export async function removePushToken(uid: string): Promise<void> {
  const token = storedToken();
  if (!token) return;
  try {
    await setDoc(doc(db, 'users', uid), { pushTokens: arrayRemove(token) }, { merge: true });
    const { getMessaging, deleteToken, isSupported } = await import('firebase/messaging');
    const { app } = await import('./firebase');
    if (await isSupported()) await deleteToken(getMessaging(app)).catch(() => {});
  } catch (e) {
    console.warn('No se pudo desactivar el push:', e);
  } finally {
    try { localStorage.removeItem(TOKEN_STORAGE); } catch {}
  }
}

export type PushTestResult =
  | { step: 'permission'; state: string }
  | { step: 'no-token' }
  | { step: 'server'; ok: boolean; reason?: string; registered: number };

/**
 * Prueba de notificaciones de este celular: 1) aviso local (¿el celular las muestra?) y
 * 2) aviso real desde el servidor de Firebase a este celular (¿llegan con la app cerrada?).
 */
export async function testPush(uid: string): Promise<PushTestResult> {
  if (typeof window === 'undefined' || !('Notification' in window)) return { step: 'permission', state: 'unsupported' };
  if (Notification.permission !== 'granted') return { step: 'permission', state: Notification.permission };
  // 1. Aviso local inmediato
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification('Prueba 1 de 2: aviso del celular', {
      body: 'Este lo muestra el celular directamente.', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'flowi-test-local',
    });
  } catch { /* se informa con el paso del servidor */ }
  // 2. Aviso desde el servidor
  await syncPushToken(uid);
  const token = await currentToken().catch(() => null);
  if (!token) return { step: 'no-token' };
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const { app } = await import('./firebase');
  const fn = httpsCallable<{ token: string }, { ok: boolean; reason?: string; registered: number }>(getFunctions(app, 'us-central1'), 'probarNotificacion');
  // Si el token cambió, se vuelve a registrar antes de probar
  let res = (await fn({ token })).data;
  if (!res.ok && res.reason === 'not-registered') {
    try { localStorage.removeItem(TOKEN_STORAGE); } catch {}
    await syncPushToken(uid);
    res = (await fn({ token })).data;
  }
  return { step: 'server', ...res };
}
