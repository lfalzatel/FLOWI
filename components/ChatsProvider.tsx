'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/components/FriendsProvider';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { Chat, chatPeer, chatTime, getOpenChat, isUnread } from '@/lib/chat';
import { playNotificationSound } from '@/lib/notifications';
import { tr } from '@/lib/i18n';

// Conversaciones de la persona en vivo: cuántas tienen mensajes sin leer y aviso al instante cuando
// un amigo escribe (dentro de la app; con la app en segundo plano o cerrada avisa el servidor).
interface ChatsCtx {
  chats: Chat[];
  unreadCount: number;            // conversaciones con mensajes sin leer
  unreadFrom: Set<string>;        // uid de los amigos que escribieron y no se ha leído
  unavailable: boolean;           // la base de datos todavía no tiene las reglas del chat
}

const Ctx = createContext<ChatsCtx>({ chats: [], unreadCount: 0, unreadFrom: new Set(), unavailable: false });

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { friends } = useFriends();
  const { push } = useInAppNotifications();
  const [chats, setChats] = useState<Chat[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  const seen = useRef<Map<string, number> | null>(null); // último mensaje ya conocido de cada conversación
  const names = useRef<Map<string, string>>(new Map());
  names.current = new Map(friends.map(f => [f.uid, f.name]));
  const locked = useRef<string[]>([]);
  locked.current = profile?.lockedChats || [];

  useEffect(() => {
    seen.current = null;
    if (!user || user.isAnonymous) { setChats([]); return; }
    const uid = user.uid;
    const q = query(collection(db, 'fl_chats'), where('users', 'array-contains', uid));
    return onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<Chat, 'id'>) }))
        .sort((a, b) => chatTime(b.lastAt) - chatTime(a.lastAt));
      // Avisar de los mensajes nuevos (no la primera vez, que es lo que ya había)
      const first = seen.current === null;
      const prev = seen.current || new Map<string, number>();
      const next = new Map<string, number>();
      for (const c of list) {
        const t = chatTime(c.lastAt);
        next.set(c.id, t);
        if (first || t <= (prev.get(c.id) || 0) || !isUnread(c, uid) || getOpenChat() === c.id) continue;
        const peer = chatPeer(c, uid);
        const name = (names.current.get(peer) || tr('Un amigo')).split(/\s+/)[0];
        const title = tr('{a} te escribió', { a: name });
        // Chat bloqueado: el aviso no muestra el texto
        const body = locked.current.includes(c.id) ? tr('🔒 Mensaje en un chat bloqueado') : (c.lastText || '');
        // Con FLOWI en pantalla: aviso dentro de la app con sonido. Si no, el servidor manda la notificación
        // al celular (functions/index.js · avisarMensajeChat), también con la app cerrada.
        if (document.visibilityState === 'visible') {
          push({ title, body });
          playNotificationSound();
        }
      }
      seen.current = next;
      setChats(list);
      setUnavailable(false);
    }, err => {
      if ((err as any)?.code === 'permission-denied') setUnavailable(true);
    });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<ChatsCtx>(() => {
    const uid = user?.uid || '';
    const unread = chats.filter(c => isUnread(c, uid));
    return { chats, unreadCount: unread.length, unreadFrom: new Set(unread.map(c => chatPeer(c, uid))), unavailable };
  }, [chats, user?.uid, unavailable]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useChats = () => useContext(Ctx);
