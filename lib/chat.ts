// Chat entre amigos: conversaciones de dos personas, en vivo con Firestore.
//  - fl_chats/{a_b}: la conversación (a y b = los dos uid en orden). Guarda el último mensaje
//    (para la lista y los avisos), cuándo leyó cada uno (read.{uid}) para contar los no leídos y,
//    si está activado, cuánto duran los mensajes (ttl, en segundos; lo eligen los dos, como en WhatsApp).
//  - fl_chats/{a_b}/messages/{id}: cada mensaje { from, text, createdAt, expiresAt? }.
//    Con mensajes temporales, Firestore borra solo los vencidos (política TTL sobre expiresAt) y la app
//    los deja de mostrar apenas vencen. Un cambio de duración queda como aviso en la conversación (kind 'ttl').
// Solo se puede escribir a un amigo aceptado (lo revisan las reglas). Los mensajes solo los ven los dos.
// Bloqueo por chat: users/{uid}.lockedChats (lista de conversaciones que piden PIN o huella para abrirse).
import { Timestamp, arrayRemove, arrayUnion, collection, doc, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setDoc } from '@/lib/db';

export const MAX_CHAT_TEXT = 1000;

/** Duraciones de los mensajes temporales (0 = desactivados). */
export const CHAT_TTLS: { sec: number; label: string }[] = [
  { sec: 0, label: 'Desactivados' },
  { sec: 86400, label: '24 horas' },
  { sec: 7 * 86400, label: '7 días' },
  { sec: 90 * 86400, label: '90 días' },
];
export const ttlLabel = (sec?: number) => CHAT_TTLS.find(t => t.sec === (sec || 0))?.label || CHAT_TTLS[0].label;

export interface Chat {
  id: string;
  users: string[];
  lastText?: string;
  lastFrom?: string;
  lastAt?: Timestamp | null;
  lastExpiresAt?: Timestamp | null; // el último mensaje es temporal y vence entonces
  read?: Record<string, Timestamp | null>;
  ttl?: number;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  createdAt: Timestamp | null;
  expiresAt?: Timestamp | null;
  kind?: 'ttl';   // aviso: alguien cambió la duración de los mensajes
  ttl?: number;
}

/** Id de la conversación entre dos personas (siempre el mismo, sin importar quién escribe primero). */
export const chatIdFor = (a: string, b: string) => [a, b].sort().join('_');

/** La otra persona de la conversación. */
export const chatPeer = (c: Chat, myUid: string) => c.users.find(u => u !== myUid) || '';

const ms = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);

/** ¿Hay un mensaje de la otra persona que todavía no he visto? */
export const isUnread = (c: Chat, myUid: string) =>
  !!c.lastFrom && c.lastFrom !== myUid && ms(c.lastAt) > ms(c.read?.[myUid]) && !lastExpired(c);

/** El último mensaje era temporal y ya venció (no se muestra su texto). */
export const lastExpired = (c: Chat) => !!c.lastExpiresAt && ms(c.lastExpiresAt) <= Date.now();

/** Un mensaje temporal que ya venció (Firestore lo borra en las horas siguientes; la app ya no lo muestra). */
export const msgExpired = (m: ChatMessage) => !!m.expiresAt && ms(m.expiresAt) <= Date.now();

export const chatTime = ms;

/** Envía un mensaje: lo guarda y actualiza el último mensaje de la conversación (en un solo paso). */
export async function sendChatMessage(myUid: string, otherUid: string, raw: string, ttlSec = 0) {
  const text = raw.trim().slice(0, MAX_CHAT_TEXT);
  if (!text) return;
  const id = chatIdFor(myUid, otherUid);
  const chatRef = doc(db, 'fl_chats', id);
  const msgRef = doc(collection(chatRef, 'messages'));
  const expiresAt = ttlSec > 0 ? Timestamp.fromMillis(Date.now() + ttlSec * 1000) : null;
  const batch = writeBatch(db);
  batch.set(chatRef, {
    users: [myUid, otherUid].sort(),
    lastText: text.slice(0, 140),
    lastFrom: myUid,
    lastAt: serverTimestamp(),
    lastExpiresAt: expiresAt,
    read: { [myUid]: serverTimestamp() },
  }, { merge: true });
  batch.set(msgRef, { from: myUid, text, createdAt: serverTimestamp(), ...(expiresAt ? { expiresAt } : {}) });
  await batch.commit();
}

/** Cambia cuánto duran los mensajes de la conversación (para los dos) y lo deja anotado en el chat. */
export async function setChatTtl(myUid: string, otherUid: string, ttlSec: number) {
  const id = chatIdFor(myUid, otherUid);
  const chatRef = doc(db, 'fl_chats', id);
  const batch = writeBatch(db);
  batch.set(chatRef, { users: [myUid, otherUid].sort(), ttl: ttlSec }, { merge: true });
  batch.set(doc(collection(chatRef, 'messages')), { from: myUid, text: '', kind: 'ttl', ttl: ttlSec, createdAt: serverTimestamp() });
  await batch.commit();
}

/** Marca la conversación como leída por mí. */
export const markChatRead = (chatId: string, myUid: string) =>
  updateDoc(doc(db, 'fl_chats', chatId), { [`read.${myUid}`]: serverTimestamp() });

/** Bloquea o desbloquea una conversación (se guarda en el perfil: aplica en todos tus celulares). */
export const setChatLocked = (myUid: string, chatId: string, locked: boolean) =>
  setDoc(doc(db, 'users', myUid), { lockedChats: locked ? arrayUnion(chatId) : arrayRemove(chatId) }, { merge: true });

// Conversación abierta en pantalla (para no avisar de los mensajes que la persona ya está viendo)
let openChatId: string | null = null;
export const setOpenChat = (id: string | null) => { openChatId = id; };
export const getOpenChat = () => openChatId;
