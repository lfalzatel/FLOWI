// Amigos en FLOWI (etapa 1): perfil público mínimo, buscador y solicitudes de amistad.
// Privacidad: de cada persona solo se publica nombre, foto y @usuario. Nunca gastos, saldos ni correo.
//  - fl_profiles/{uid}: perfil público (lo puede leer quien tenga sesión; sirve para el enlace de invitación)
//  - fl_directory/{uid}: el mismo perfil con las palabras para buscarlo. Existe solo si la persona deja que la
//    encuentren por su nombre (si lo apaga, se borra y solo la pueden agregar con su enlace)
//  - fl_friend_requests/{de}_{para}: la solicitud; "accepted" = son amigos
import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const APP_URL = 'https://flowi-gastos.web.app';

export interface PublicProfile {
  uid: string;
  name: string;
  photo?: string | null;
  username: string;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  users: string[];
  status: 'pending' | 'accepted' | 'rejected';
  fromName: string; fromPhoto?: string | null; fromUsername: string;
  toName: string; toPhoto?: string | null; toUsername: string;
}

/** Texto sin tildes y en minúsculas, para buscar. */
export const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ@. ]+/g, ' ').trim();

/** @usuario a partir del nombre: "Luis Felipe Alzate" → "luis.felipe.k7f2" (los 4 del final lo hacen único). */
export function usernameFor(name: string, uid: string): string {
  const base = norm(name).replace(/[@.]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).join('.') || 'flowi';
  return `${base.slice(0, 20)}.${uid.slice(0, 4).toLowerCase()}`;
}

/** Comienzos de cada palabra del nombre y del @usuario ("le", "lei", "leid", "leidy"…), para buscar por prefijo. */
export function searchPrefixes(name: string, username: string): string[] {
  const words = [...norm(name).split(/\s+/), ...username.split('.')].filter(w => w.length >= 2);
  const out = new Set<string>();
  for (const w of words) for (let i = 2; i <= Math.min(w.length, 15); i++) out.add(w.slice(0, i));
  return Array.from(out).slice(0, 80);
}

/** Publica (o actualiza) el perfil público; con searchable=false se quita del buscador. */
export async function publishProfile(uid: string, name: string, photo: string | null | undefined, searchable: boolean) {
  const clean = (name || '').trim().slice(0, 60) || 'Usuario de FLOWI';
  const username = usernameFor(clean, uid);
  const data = { name: clean, photo: photo || null, username, updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'fl_profiles', uid), { ...data, searchable });
  if (searchable) await setDoc(doc(db, 'fl_directory', uid), { ...data, prefixes: searchPrefixes(clean, username) });
  else await deleteDoc(doc(db, 'fl_directory', uid)).catch(() => {});
}

export async function getPublicProfile(uid: string): Promise<(PublicProfile & { searchable?: boolean }) | null> {
  const snap = await getDoc(doc(db, 'fl_profiles', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { uid, name: d.name, photo: d.photo, username: d.username, searchable: d.searchable !== false };
}

/** Busca personas por nombre o @usuario (las que dejan que las encuentren). */
export async function searchPeople(q: string, myUid: string): Promise<PublicProfile[]> {
  const words = norm(q.replace(/^@/, '')).replace(/\./g, ' ').split(/\s+/).filter(w => w.length >= 2);
  if (!words.length) return [];
  const first = words[0].slice(0, 15);
  const snap = await getDocs(query(collection(db, 'fl_directory'), where('prefixes', 'array-contains', first), limit(25)));
  return snap.docs
    .filter(d => d.id !== myUid)
    .map(d => ({ uid: d.id, name: d.get('name'), photo: d.get('photo'), username: d.get('username'), prefixes: d.get('prefixes') as string[] }))
    // Todas las palabras escritas tienen que coincidir ("leidy mar" → Leidy Marín)
    .filter(p => words.every(w => p.prefixes?.includes(w.slice(0, 15))))
    .map(({ prefixes, ...p }) => p);
}

const reqId = (from: string, to: string) => `${from}_${to}`;

/** Envía la solicitud. Si la otra persona ya te había enviado una, la acepta. */
export async function sendFriendRequest(me: PublicProfile, other: PublicProfile): Promise<'sent' | 'accepted'> {
  const reverse = await getDoc(doc(db, 'fl_friend_requests', reqId(other.uid, me.uid))).catch(() => null);
  if (reverse?.exists() && reverse.get('status') === 'pending') {
    await updateDoc(reverse.ref, { status: 'accepted', respondedAt: serverTimestamp() });
    return 'accepted';
  }
  const ref = doc(db, 'fl_friend_requests', reqId(me.uid, other.uid));
  // Una solicitud vieja (rechazada) se borra para poder enviarla de nuevo
  const old = await getDoc(ref).catch(() => null);
  if (old?.exists()) await deleteDoc(ref);
  await setDoc(ref, {
    from: me.uid, to: other.uid, users: [me.uid, other.uid], status: 'pending',
    fromName: me.name, fromPhoto: me.photo || null, fromUsername: me.username,
    toName: other.name, toPhoto: other.photo || null, toUsername: other.username,
    createdAt: serverTimestamp(),
  });
  return 'sent';
}

export const answerFriendRequest = (id: string, accept: boolean) =>
  updateDoc(doc(db, 'fl_friend_requests', id), { status: accept ? 'accepted' : 'rejected', respondedAt: serverTimestamp() });

/** Cancela una solicitud enviada o elimina a un amigo. */
export const removeFriendship = (id: string) => deleteDoc(doc(db, 'fl_friend_requests', id));

/** La otra persona de una solicitud, vista desde mí. */
export function otherSide(r: FriendRequest, myUid: string): PublicProfile {
  return r.from === myUid
    ? { uid: r.to, name: r.toName, photo: r.toPhoto, username: r.toUsername }
    : { uid: r.from, name: r.fromName, photo: r.fromPhoto, username: r.fromUsername };
}

export const inviteLink = (uid: string) => `${APP_URL}/amigos?u=${uid}`;

/** Mensaje de WhatsApp: aviso de la solicitud (si ya tiene FLOWI) o invitación (si no). */
export function friendWhatsapp(myName: string, myUid: string, otherName?: string, hasFlowi = true): string {
  const first = (otherName || '').split(/\s+/)[0];
  const me = myName.split(/\s+/)[0] || 'Yo';
  const text = hasFlowi
    ? `Hola${first ? ` ${first}` : ''} 👋 Te envié una solicitud de amistad en FLOWI. Acéptala aquí: ${inviteLink(myUid)}`
    : `Hola${first ? ` ${first}` : ''} 👋 Estoy usando FLOWI para llevar mis gastos (es gratis). Agrégame como amigo para compartir gastos: ${inviteLink(myUid)}\n— ${me}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
