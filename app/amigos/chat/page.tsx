'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ChevronLeft, MessageCircle, Send, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { currentLocale, tr } from '@/lib/i18n';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/components/FriendsProvider';
import { useChats } from '@/components/ChatsProvider';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/friends/Avatar';
import { PublicProfile, getPublicProfile } from '@/lib/friends';
import {
  ChatMessage, MAX_CHAT_TEXT, chatIdFor, chatPeer, chatTime, isUnread, markChatRead, sendChatMessage, setOpenChat,
} from '@/lib/chat';

// Chat con amigos: sin ?u= muestra las conversaciones; con ?u=<uid> abre la conversación con ese amigo.
export default function ChatPage() {
  return <Suspense fallback={null}><ChatRouter /></Suspense>;
}

function ChatRouter() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);
  const peer = params.get('u');
  return peer ? <Conversation peerUid={peer} /> : <ChatList />;
}

const useIsTech = () => {
  const { theme } = useTheme();
  return theme === 'cyberpunk' || theme === 'kiloCode';
};

function GuestNotice({ isTech }: { isTech: boolean }) {
  return (
    <div className={`glass-card glass-static p-6 text-center space-y-2 ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
      <Users className="w-10 h-10 text-accent/50 mx-auto" />
      <p className="text-sm text-text-primary font-semibold">{tr('Para chatear con amigos necesitas una cuenta')}</p>
      <p className="text-xs text-text-muted">{tr('Vincula tu cuenta de Google desde Amigos.')}</p>
      <Link href="/amigos" className="inline-block text-xs font-semibold text-accent">{tr('Ir a Amigos')}</Link>
    </div>
  );
}

function timeLabel(ms: number) {
  if (!ms) return '';
  const d = new Date(ms);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
}

// ── Lista de conversaciones ──
function ChatList() {
  const isTech = useIsTech();
  const { user } = useAuth();
  const { friends, ready } = useFriends();
  const { chats, unavailable } = useChats();
  const uid = user?.uid || '';
  const box = isTech ? 'rounded-none' : 'rounded-2xl';

  // Primero los amigos con conversación (la más reciente arriba), luego el resto por nombre
  const rows = useMemo(() => {
    const byPeer = new Map(chats.map(c => [chatPeer(c, uid), c]));
    const withChat = friends.filter(f => byPeer.has(f.uid))
      .sort((a, b) => chatTime(byPeer.get(b.uid)!.lastAt) - chatTime(byPeer.get(a.uid)!.lastAt));
    const rest = friends.filter(f => !byPeer.has(f.uid));
    return [...withChat, ...rest].map(f => ({ f, c: byPeer.get(f.uid) }));
  }, [chats, friends, uid]);

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/amigos" aria-label={tr('Volver')} className={`p-2 -ml-2 shrink-0 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl font-bold leading-tight truncate ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>{tr('Chat')}</h1>
            <p className="text-xs text-text-muted">{tr('Habla con tus amigos de FLOWI. Solo ustedes dos ven los mensajes.')}</p>
          </div>
        </div>

        {user?.isAnonymous ? <GuestNotice isTech={isTech} /> : (
          <>
            {unavailable && (
              <p className={`p-3 text-xs text-amber-300 border border-amber-400/40 bg-amber-400/10 ${box}`}>
                {tr('El chat todavía no está activado en la base de datos. Muy pronto vas a poder escribirles a tus amigos.')}
              </p>
            )}
            {!ready ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
            ) : rows.length ? (
              <ul className={`glass-card px-3 divide-y divide-glass-border ${box}`}>
                {rows.map(({ f, c }) => {
                  const unread = !!c && isUnread(c, uid);
                  return (
                    <li key={f.uid}>
                      <Link href={`/amigos/chat?u=${f.uid}`} className="flex items-center gap-3 py-3">
                        <Avatar p={f} isTech={isTech} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <p className={`text-sm truncate flex-1 ${unread ? 'font-bold text-text-primary' : 'font-semibold text-text-primary'}`}>{f.name}</p>
                            {c && <span className={`text-[10px] shrink-0 ${unread ? 'text-accent font-semibold' : 'text-text-muted'}`}>{timeLabel(chatTime(c.lastAt))}</span>}
                          </div>
                          <p className={`text-xs truncate ${unread ? 'text-text-primary' : 'text-text-muted'}`}>
                            {c ? `${c.lastFrom === uid ? `${tr('Tú')}: ` : ''}${c.lastText || ''}` : tr('Toca para escribirle')}
                          </p>
                        </div>
                        {unread && <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" aria-label={tr('Mensaje nuevo')} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className={`glass-card glass-static p-5 text-center space-y-2 ${box}`}>
                <MessageCircle className="w-9 h-9 text-accent/40 mx-auto" />
                <p className="text-sm text-text-primary">{tr('Todavía no tienes amigos para chatear')}</p>
                <Link href="/amigos" className="inline-block text-xs font-semibold text-accent">{tr('Buscar amigos')}</Link>
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

// ── Conversación con un amigo ──
function Conversation({ peerUid }: { peerUid: string }) {
  const isTech = useIsTech();
  const { theme } = useTheme();
  const isLight = theme === 'light' || theme === 'nova';
  const { user } = useAuth();
  const { friends, ready } = useFriends();
  const { chats } = useChats();
  const uid = user?.uid || '';
  const chatId = uid ? chatIdFor(uid, peerUid) : '';
  const friend = friends.find(f => f.uid === peerUid);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const chat = chats.find(c => c.id === chatId);

  // La conversación ocupa justo la parte visible de la pantalla: al abrir el teclado se encoge (como en
  // WhatsApp) en vez de que el navegador corra la página y los mensajes queden fuera de la vista
  const [view, setView] = useState<{ h: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    const update = () => setView({ h: vv ? vv.height : window.innerHeight, top: vv ? vv.offsetTop : 0 });
    update();
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  const toBottom = () => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; };
  useEffect(toBottom, [view?.h]); // al abrir o cerrar el teclado, se sigue viendo lo último

  // Si ya no son amigos se sigue viendo la conversación (con el nombre de su perfil público)
  useEffect(() => {
    if (friend || !ready || !uid) return;
    getPublicProfile(peerUid).then(setProfile).catch(() => {});
  }, [friend, ready, peerUid, uid]);
  const person: PublicProfile = friend || profile || { uid: peerUid, name: tr('Amigo'), username: '' };

  // Mientras está abierta, no se avisa de sus mensajes
  useEffect(() => {
    if (!chatId) return;
    setOpenChat(chatId);
    return () => setOpenChat(null);
  }, [chatId]);

  // Mensajes en vivo (los últimos 200)
  useEffect(() => {
    if (!chatId || user?.isAnonymous) return;
    setMessages(null);
    const q = query(collection(db, 'fl_chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<ChatMessage, 'id'>) })).reverse());
    }, err => {
      setMessages([]);
      if ((err as any)?.code === 'permission-denied') setError(tr('El chat todavía no está activado en la base de datos.'));
    });
  }, [chatId, user?.isAnonymous]);

  // Al llegar mensajes: bajar hasta el último y marcar como leído
  useEffect(() => {
    toBottom();
    if (chat && uid && isUnread(chat, uid)) markChatRead(chatId, uid).catch(() => {});
  }, [messages?.length, chat?.lastAt?.toMillis?.()]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    const t = text.trim();
    if (!t || sending || !uid) return;
    setSending(true); setError('');
    setText('');
    try { await sendChatMessage(uid, peerUid, t); }
    catch (e: any) {
      setText(t);
      setError(e?.code === 'permission-denied'
        ? tr('No se pudo enviar: solo puedes escribirles a tus amigos.')
        : tr('No se pudo enviar. Revisa tu conexión.'));
    } finally { setSending(false); }
  };

  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const canWrite = !!friend;

  return (
    <div className="fixed inset-x-0 z-[1] flex flex-col bg-deep overflow-hidden"
         style={{ top: view?.top ?? 0, height: view ? view.h : '100dvh' }}>
      <Header />
      <main className={`relative flex-1 min-h-0 max-w-2xl mx-auto w-full px-4 pt-2 flex flex-col ${isTech ? 'font-mono' : ''}`}>
        <div className="shrink-0 flex items-center gap-3 mb-3">
          <Link href="/amigos/chat" aria-label={tr('Volver')} className={`p-2 -ml-2 shrink-0 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <Avatar p={person} isTech={isTech} />
          <div className="min-w-0">
            <h1 className={`text-base font-bold leading-tight truncate ${isTech ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{person.name}</h1>
            {person.username && <p className="text-[11px] text-text-muted truncate">@{person.username}</p>}
          </div>
        </div>

        {user?.isAnonymous ? <GuestNotice isTech={isTech} /> : (
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain -mx-4 px-4" aria-live="polite">
          {/* Los mensajes se apilan desde abajo, junto a la barra para escribir */}
          <div className="min-h-full flex flex-col justify-end gap-1.5 pb-3">
            {messages === null ? (
              <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
            ) : !messages.length ? (
              <div className={`glass-card glass-static p-5 text-center space-y-1 ${box}`}>
                <MessageCircle className="w-9 h-9 text-accent/40 mx-auto" />
                <p className="text-sm text-text-primary">{tr('Escríbele a {a}', { a: person.name.split(/\s+/)[0] })}</p>
                <p className="text-[11px] text-text-muted">{tr('Le llega al instante dentro de FLOWI.')}</p>
              </div>
            ) : messages.map((m, i) => {
              const mine = m.from === uid;
              const t = chatTime(m.createdAt);
              const prevT = i ? chatTime(messages[i - 1].createdAt) : 0;
              const newDay = !prevT || new Date(prevT).toDateString() !== new Date(t).toDateString();
              return (
                <div key={m.id}>
                  {newDay && t > 0 && (
                    <p className="text-center text-[10px] text-text-muted py-2">
                      {new Date(t).toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap break-words ${isTech ? 'rounded-none' : 'rounded-2xl'} ${mine
                      ? `bg-accent ${isLight ? 'text-white' : 'text-black'} ${isTech ? '' : 'rounded-br-md'}`
                      : `glass-card glass-static text-text-primary ${isTech ? '' : 'rounded-bl-md'}`}`}>
                      {m.text}
                      <span className={`block text-[9px] mt-0.5 text-right ${mine ? 'opacity-70' : 'text-text-muted'}`}>{t ? new Date(t).toLocaleTimeString(currentLocale(), { hour: 'numeric', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </main>

      {/* Barra para escribir, abajo (sube con el teclado) */}
      {!user?.isAnonymous && (
        <div className="shrink-0 bg-[color-mix(in_srgb,var(--bg-deep)_92%,transparent)] backdrop-blur-xl border-t border-glass-border"
             style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="max-w-2xl mx-auto px-4 pt-3">
            {error && <p className="text-xs text-amber-300 mb-2">{error}</p>}
            {canWrite || !ready ? (
              <form onSubmit={e => { e.preventDefault(); send(); }} className="flex items-end gap-2">
                <textarea value={text} onChange={e => setText(e.target.value.slice(0, MAX_CHAT_TEXT))} rows={1}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); send(); } }}
                          placeholder={tr('Escribe un mensaje…')} aria-label={tr('Mensaje')}
                          className={`flex-1 min-w-0 max-h-32 resize-none px-3 py-2.5 bg-glass border border-glass-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent/60 ${box}`} />
                <button type="submit" disabled={!text.trim() || sending || !canWrite} aria-label={tr('Enviar')}
                        className={`w-11 h-11 shrink-0 flex items-center justify-center bg-gradient-to-br from-accent to-accent-dim ${isLight ? 'text-white' : 'text-black'} disabled:opacity-40 ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                  <Send className="w-5 h-5" />
                </button>
              </form>
            ) : (
              <p className="text-xs text-text-muted text-center pb-1">{tr('Ya no son amigos en FLOWI: puedes leer la conversación, pero no escribir.')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
