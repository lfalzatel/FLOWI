'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { arrayUnion, collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { updateDoc } from '@/lib/db';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useData } from '@/components/DataProvider';
import { useFriends } from '@/components/FriendsProvider';
import { addExpense, updateExpense, type Transaction } from '@/lib/firestore';
import { remainingOf, type SharedInfo, type SharedPerson } from '@/lib/shared';
import { SharedLink, createLink, linkId, mergePayments, payKey, updateLink } from '@/lib/sharedLinks';

// Gastos compartidos con amigos de FLOWI: escucha los enlaces y mantiene sincronizados los dos lados
// (quien pagó y el amigo). Ver lib/sharedLinks.ts.
interface Ctx {
  links: SharedLink[];
  incoming: SharedLink[];            // te compartieron y no has respondido
  deletedForMe: SharedLink[];        // quien pagó borró el gasto y tú aún lo tienes
  accept: (l: SharedLink) => Promise<void>;
  reject: (l: SharedLink) => Promise<void>;
  linkFor: (txId: string, friendUid: string) => SharedLink | undefined;
}
const SharedLinksCtx = createContext<Ctx>({
  links: [], incoming: [], deletedForMe: [], accept: async () => {}, reject: async () => {}, linkFor: () => undefined,
});

const iso = (d: Transaction['date']) => (d instanceof Date ? d : (d as any)?.toDate?.() ?? new Date()).toISOString();

/** Abono borrado en un gasto enlazado: se anota en el enlace para que no reaparezca en el otro lado. */
export const markLinkPaymentRemoved = (id: string, key: string) =>
  updateDoc(doc(db, 'fl_shared_links', id), { removed: arrayUnion(key) }).catch(() => {});

export function SharedLinksProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const { transactions, loadingTransactions } = useData();
  const { friends } = useFriends();
  const [links, setLinks] = useState<SharedLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(new Set<string>()); // evita escribir dos veces lo mismo mientras llega la respuesta

  useEffect(() => {
    if (!user || user.isAnonymous) { setLinks([]); setLoaded(false); return; }
    const q = query(collection(db, 'fl_shared_links'), where('users', 'array-contains', user.uid));
    return onSnapshot(q, snap => {
      setLinks(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SharedLink, 'id'>) })));
      setLoaded(true);
    }, () => setLoaded(false));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sincronización ──
  useEffect(() => {
    if (!user || !loaded || loadingTransactions) return;
    const me = user.uid;
    const byId = new Map(links.map(l => [l.id, l]));
    const friendIds = new Set(friends.map(f => f.uid));
    const once = async (key: string, fn: () => Promise<unknown>) => {
      if (busy.current.has(key)) return;
      busy.current.add(key);
      try { await fn(); } catch (e) { console.warn('No se pudo sincronizar el gasto compartido', e); }
      finally { setTimeout(() => busy.current.delete(key), 1500); }
    };

    // 1) Yo pagué: cada amigo del gasto tiene su enlace al día
    const mine = new Set<string>();
    for (const t of transactions) {
      const s = t.type === 'gasto' ? t.shared : null;
      if (!t.id || !s?.paidByMe) continue;
      s.people.forEach((p, i) => {
        if (!p.friendUid) return;
        const id = linkId(t.id!, p.friendUid);
        mine.add(id);
        const l = byId.get(id);
        const desc = (t.description?.trim() || t.category).slice(0, 80);
        if (!l) {
          if (!friendIds.has(p.friendUid)) return; // ya no son amigos
          once(`c-${id}`, () => createLink({
            owner: me, friend: p.friendUid!, users: [me, p.friendUid!],
            ownerName: profile?.name || user.displayName || 'Tu amigo', friendName: p.name,
            txId: t.id!, description: desc, category: t.category, date: iso(t.date), share: p.amount,
          }));
          return;
        }
        if (l.status === 'deleted' || l.status === 'rejected') return;
        const patch: Partial<SharedLink> = {};
        if (l.description !== desc) patch.description = desc;
        if (l.category !== t.category) patch.category = t.category;
        if (l.date !== iso(t.date)) patch.date = iso(t.date);
        if (l.share !== p.amount) patch.share = p.amount;
        if ((l.absorbed || 0) !== (p.absorbed || 0)) patch.absorbed = p.absorbed || 0;
        const m = mergePayments(p.payments, l.payments, l.removed, me);
        if (m.toLink.length) patch.payments = [...(l.payments || []), ...m.toLink];
        if (Object.keys(patch).length) once(`u-${id}-${JSON.stringify(patch).length}`, () => updateLink(id, patch));
        if (m.changedLocal) {
          const np: SharedPerson = { ...p, payments: m.finalLocal };
          np.settledAt = remainingOf(np) <= 0 ? (p.settledAt || new Date().toISOString()) : null;
          once(`l-${t.id}-${i}`, () => updateExpense(t.id!, { shared: { ...s, people: s.people.map((x, j) => (j === i ? np : x)) } }));
        }
      });
    }
    // El gasto (o el amigo dentro del gasto) ya no existe: se avisa al amigo
    for (const l of links) {
      if (l.owner === me && (l.status === 'pending' || l.status === 'accepted') && !mine.has(l.id)) {
        once(`d-${l.id}`, () => updateLink(l.id, { status: 'deleted' }));
      }
    }

    // 2) Me compartieron y acepté: mi gasto refleja el enlace
    for (const l of links) {
      if (l.friend !== me || l.status !== 'accepted' || !l.friendTxId) continue;
      const t = transactions.find(x => x.id === l.friendTxId);
      if (!t) { once(`r-${l.id}`, () => updateLink(l.id, { status: 'rejected', friendTxId: null })); continue; } // lo borré de mis gastos
      const s = t.shared;
      const p = s?.people[0];
      if (!s || !p) continue;
      const m = mergePayments(p.payments, l.payments, l.removed, me);
      if (m.toLink.length) once(`fu-${l.id}-${m.toLink.length}`, () => updateLink(l.id, { payments: [...(l.payments || []), ...m.toLink] }));
      const np: SharedPerson = { ...p, amount: l.share, payments: m.finalLocal, absorbed: l.absorbed || 0 };
      np.settledAt = remainingOf(np) <= 0 ? (p.settledAt || new Date().toISOString()) : null;
      const changed = m.changedLocal || p.amount !== l.share || (p.absorbed || 0) !== (l.absorbed || 0)
        || !!p.settledAt !== !!np.settledAt || t.amount !== l.share || t.category !== l.category
        || (t.description || '') !== l.description || iso(t.date) !== l.date;
      if (changed) {
        const shared: SharedInfo = { total: l.share, paidByMe: false, people: [np] };
        once(`fl-${t.id}-${JSON.stringify(np).length}-${l.share}`, () => updateExpense(t.id!, {
          amount: l.share, category: l.category, description: l.description, date: new Date(l.date), shared,
        }));
      }
    }
  }, [links, transactions, loaded, loadingTransactions, friends, user, profile?.name]);

  const value = useMemo<Ctx>(() => {
    const me = user?.uid || '';
    return {
      links,
      incoming: links.filter(l => l.friend === me && l.status === 'pending'),
      deletedForMe: links.filter(l => l.friend === me && l.status === 'deleted' && !!l.friendTxId
        && transactions.some(t => t.id === l.friendTxId)),
      linkFor: (txId, friendUid) => links.find(l => l.id === linkId(txId, friendUid)),
      accept: async (l) => {
        if (!user) return;
        const person: SharedPerson = {
          name: l.ownerName, amount: l.share, friendUid: l.owner, absorbed: l.absorbed || 0,
          payments: (l.payments || []).filter(p => !(l.removed || []).includes(payKey(p))).map(p => ({ id: p.id, amount: p.amount, at: p.at, accountId: null })),
        };
        person.settledAt = remainingOf(person) <= 0 ? new Date().toISOString() : null;
        const res = await addExpense({
          userId: user.uid, type: 'gasto', amount: l.share, category: l.category, description: l.description,
          date: new Date(l.date), shared: { total: l.share, paidByMe: false, people: [person] }, sharedLinkId: l.id,
        } as any);
        await updateLink(l.id, { status: 'accepted', friendTxId: res.id });
      },
      reject: (l) => updateLink(l.id, { status: 'rejected' }),
    };
  }, [links, transactions, user]);

  return <SharedLinksCtx.Provider value={value}>{children}</SharedLinksCtx.Provider>;
}

export const useSharedLinks = () => useContext(SharedLinksCtx);
