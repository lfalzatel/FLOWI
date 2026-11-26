// Chat entre amigos (etapa 1): conversaciones de dos personas, en vivo con Firestore.
//  - fl_chats/{a_b}: la conversación (a y b = los dos uid en orden). Guarda el último mensaje
//    (para la lista y los avisos) y cuándo leyó cada uno (read.{uid}) para contar los no leídos.
//  - fl_chats/{a_b}/messages/{id}: cada mensaje { from, text, createdAt }.
// Solo se puede escribir a un amigo aceptado (lo revisan las reglas). Los mensajes solo los ven los dos.
import { Timestamp, collection, doc, serverTimestamp, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const MAX_CHAT_TEXT = 1000;

export interface Chat {
  id: string;
  users: string[];
  lastText?: string;
  lastFrom?: string;
  lastAt?: Timestamp | null;
  read?: Record<string, Timestamp | null>;
}

export interface ChatMessage {
  id: string;
  from: string;
  text: string;
  createdAt: Timestamp | null;
}

/** Id de la conversación entre dos personas (siempre el mismo, sin importar quién escribe primero). */
export const chatIdFor = (a: string, b: string) => [a, b].sort().join('_');

/** La otra persona de la conversación. */
export const chatPeer = (c: Chat, myUid: string) => c.users.find(u => u !== myUid) || '';

const ms = (t?: Timestamp | null) => (t && typeof t.toMillis === 'function' ? t.toMillis() : 0);

/** ¿Hay un mensaje de la otra persona que todavía no he visto? */
export const isUnread = (c: Chat, myUid: string) =>
  !!c.lastFrom && c.lastFrom !== myUid && ms(c.lastAt) > ms(c.read?.[myUid]);

export const chatTime = ms;

/** Envía un mensaje: lo guarda y actualiza el último mensaje de la conversación (en un solo paso). */
export async function sendChatMessage(myUid: string, otherUid: string, raw: string) {
  const text = raw.trim().slice(0, MAX_CHAT_TEXT);
  if (!text) return;
  const id = chatIdFor(myUid, otherUid);
  const chatRef = doc(db, 'fl_chats', id);
  const msgRef = doc(collection(chatRef, 'messages'));
  const batch = writeBatch(db);
  batch.set(chatRef, {
    users: [myUid, otherUid].sort(),
    lastText: text.slice(0, 140),
    lastFrom: myUid,
    lastAt: serverTimestamp(),
    read: { [myUid]: serverTimestamp() },
  }, { merge: true });
  batch.set(msgRef, { from: myUid, text, createdAt: serverTimestamp() });
  await batch.commit();
}

/** Marca la conversación como leída por mí. */
export const markChatRead = (chatId: string, myUid: string) =>
  updateDoc(doc(db, 'fl_chats', chatId), { [`read.${myUid}`]: serverTimestamp() });

// Conversación abierta en pantalla (para no avisar de los mensajes que la persona ya está viendo)
let openChatId: string | null = null;
export const setOpenChat = (id: string | null) => { openChatId = id; };
export const getOpenChat = () => openChatId;
