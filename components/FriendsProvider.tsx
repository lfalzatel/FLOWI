'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { triggerFriendCelebration } from '@/components/friends/FriendCelebration';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { FriendRequest, PublicProfile, getPublicProfile, otherSide, publishProfile, usernameFor } from '@/lib/friends';

// Amigos de la persona en vivo: amigos, solicitudes recibidas y enviadas. También mantiene al día su perfil
// público (nombre, foto y @usuario) para que la puedan encontrar.
interface FriendsCtx {
  me: (PublicProfile & { searchable: boolean }) | null;
  friends: (PublicProfile & { requestId: string })[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  all: FriendRequest[];
  ready: boolean;
  unavailable: boolean; // la base de datos todavía no tiene las reglas de amigos
  setSearchable: (v: boolean) => Promise<void>;
}

const Ctx = createContext<FriendsCtx>({
  me: null, friends: [], incoming: [], outgoing: [], all: [], ready: false, unavailable: false, setSearchable: async () => {},
});

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [all, setAll] = useState<FriendRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [searchable, setSearchableState] = useState(true);

  const name = profile?.name || user?.displayName || '';
  const photo = profile?.photoURL || user?.photoURL || null;

  // Perfil público al día (una vez por sesión o si cambian nombre o foto). Los invitados no tienen.
  useEffect(() => {
    if (!user || !name || user.isAnonymous) return;
    let alive = true;
    (async () => {
      try {
        const cur = await getPublicProfile(user.uid);
        const s = cur ? cur.searchable !== false : true; // por defecto, se puede encontrar
        if (alive) setSearchableState(s);
        if (!cur || cur.name !== name.trim().slice(0, 60) || (cur.photo || null) !== photo) await publishProfile(user.uid, name, photo, s);
      } catch (e: any) {
        if (e?.code === 'permission-denied' && alive) setUnavailable(true);
      }
    })();
    return () => { alive = false; };
  }, [user?.uid, name, photo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Amistad nueva durante la sesión (la primera carga no cuenta): celebración
  const knownFriends = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!ready || !user) return;
    const accepted = all.filter(r => r.status === 'accepted');
    const ids = new Set(accepted.map(r => r.id));
    if (knownFriends.current) {
      const fresh = accepted.find(r => !knownFriends.current!.has(r.id));
      if (fresh) { const o = otherSide(fresh, user.uid); triggerFriendCelebration({ name: o.name, photo: o.photo }); }
    }
    knownFriends.current = ids;
  }, [all, ready, user]);

  // Solicitudes donde está la persona (enviadas o recibidas)
  useEffect(() => {
    if (!user || user.isAnonymous) { setAll([]); setReady(!!user); return; }
    const q = query(collection(db, 'fl_friend_requests'), where('users', 'array-contains', user.uid));
    return onSnapshot(q, snap => {
      setAll(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FriendRequest, 'id'>) })));
      setReady(true);
    }, err => {
      if ((err as any)?.code === 'permission-denied') setUnavailable(true);
      setReady(true);
    });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<FriendsCtx>(() => {
    const uid = user?.uid || '';
    const friends = all.filter(r => r.status === 'accepted')
      .map(r => ({ ...otherSide(r, uid), requestId: r.id }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return {
      me: user ? { uid, name: name || 'Tú', photo, username: usernameFor(name, uid), searchable } : null,
      friends,
      incoming: all.filter(r => r.status === 'pending' && r.to === uid),
      outgoing: all.filter(r => r.status === 'pending' && r.from === uid),
      all, ready, unavailable,
      setSearchable: async (v: boolean) => {
        if (!user) return;
        setSearchableState(v);
        await publishProfile(user.uid, name, photo, v);
      },
    };
  }, [all, ready, unavailable, user, name, photo, searchable]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useFriends = () => useContext(Ctx);
