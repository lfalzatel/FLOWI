'use client';
import { tr } from '@/lib/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import { REPEAT_DAYS, friendRepeatOn, setFriendRepeatOn } from '@/lib/friendCelebrate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search, UserPlus, Check, X, MessageCircle, Share2, Clock, UserMinus, Users } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/components/FriendsProvider';
import { useChats } from '@/components/ChatsProvider';
import { prevPath } from '@/components/layout/NavTracker';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ConfirmDialog } from '@/components/layout/ConfirmDialog';
import { Avatar } from '@/components/friends/Avatar';
import { LinkAccountModal } from '@/components/layout/GuestBanner';
import { PageTourButton } from '@/components/tour/PageTourButton';
import {
  PublicProfile, answerFriendRequest, friendWhatsapp, getPublicProfile, inviteLink, removeFriendship, searchPeople, sendFriendRequest,
} from '@/lib/friends';

// Amigos: buscar personas en FLOWI, enviar y aceptar solicitudes, invitar por WhatsApp a quien no la tiene.
// De cada persona solo se ve nombre, foto y @usuario.
export default function AmigosPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { me, friends, incoming, outgoing, all, ready, unavailable, setSearchable } = useFriends();
  const { unreadFrom, unreadCount } = useChats();
  // Repetir la celebración del último amigo cada 20 días (en este celular)
  const [repeatOn, setRepeatOn] = useState(true);
  useEffect(() => { setRepeatOn(friendRepeatOn()); }, []);
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [authLoading, user, router]);

  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<PublicProfile | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [invited, setInvited] = useState<PublicProfile | null>(null); // llegó con ?u= (enlace de invitación)
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // Enlace de invitación: /amigos?u=<uid>
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('u');
    if (!u || !user || u === user.uid) return;
    getPublicProfile(u).then(p => p && setInvited(p)).catch(() => {});
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Buscar mientras se escribe (con una pausa corta)
  useEffect(() => {
    clearTimeout(timer.current);
    const text = q.trim();
    if (text.length < 2 || !user) { setResults(null); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try { setResults(await searchPeople(text, user.uid)); setError(''); }
      catch (e: any) { setResults([]); setError(e?.code === 'permission-denied' ? 'unavailable' : 'No se pudo buscar. Revisa tu conexión.'); }
      finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Estado de la relación con cada persona
  const relation = (uid: string) => {
    const r = all.find(x => x.users.includes(uid));
    if (!r) return { kind: 'none' as const };
    if (r.status === 'accepted') return { kind: 'friend' as const, r };
    if (r.status === 'pending') return r.from === uid ? { kind: 'incoming' as const, r } : { kind: 'outgoing' as const, r };
    return r.from === uid ? { kind: 'none' as const } : { kind: 'rejected' as const, r };
  };

  const add = async (p: PublicProfile) => {
    if (!me || busy) return;
    setBusy(p.uid); setError('');
    try {
      const res = await sendFriendRequest(me, p);
      if (res === 'sent') setJustSent(p);
    } catch (e: any) {
      setError(e?.code === 'permission-denied' ? 'unavailable' : 'No se pudo enviar la solicitud.');
    } finally { setBusy(null); }
  };
  const answer = async (id: string, accept: boolean) => {
    setBusy(id);
    try { await answerFriendRequest(id, accept); } catch { setError(tr('No se pudo responder la solicitud.')); }
    finally { setBusy(null); }
  };

  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const btn = `px-3 py-1.5 text-xs font-semibold border inline-flex items-center gap-1.5 shrink-0 ${isTech ? 'rounded-none' : 'rounded-full'}`;

  // Abre la conversación con ese amigo (con un punto si escribió y no se ha leído)
  const ChatButton = ({ uid }: { uid: string }) => (
    <Link href={`/amigos/chat?u=${uid}`} className={`${btn} relative border-accent/40 text-accent`}>
      <MessageCircle className="w-3.5 h-3.5" /> {tr('Chat')}
      {unreadFrom.has(uid) && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-[var(--bg-deep)]" aria-label={tr('Mensaje nuevo')} />}
    </Link>
  );

  const ActionFor = ({ p }: { p: PublicProfile }) => {
    const rel = relation(p.uid);
    if (rel.kind === 'friend') return (
      <span className="flex gap-1.5">
        <span className={`${btn} border-accent/40 text-accent`}><Check className="w-3.5 h-3.5" /> {tr('Amigos')}</span>
        <ChatButton uid={p.uid} />
      </span>
    );
    if (rel.kind === 'outgoing') return <span className={`${btn} border-glass-border text-text-muted`}><Clock className="w-3.5 h-3.5" /> {tr('Enviada')}</span>;
    if (rel.kind === 'incoming') return (
      <button type="button" disabled={!!busy} onClick={() => answer(rel.r.id, true)} className={`${btn} border-accent bg-accent/15 text-accent`}>
        <Check className="w-3.5 h-3.5" /> {tr('Aceptar')}
      </button>
    );
    return (
      <button type="button" disabled={!!busy} onClick={() => add(p)} className={`${btn} border-accent bg-accent/15 text-accent`}>
        <UserPlus className="w-3.5 h-3.5" /> {busy === p.uid ? 'Enviando…' : 'Agregar'}
      </button>
    );
  };

  const PersonRow = ({ p, children }: { p: PublicProfile; children?: React.ReactNode }) => (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar p={p} isTech={isTech} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{p.name}</p>
        <p className="text-[11px] text-text-muted truncate">@{p.username}</p>
      </div>
      {children ?? <ActionFor p={p} />}
    </li>
  );

  const shareMine = async () => {
    if (!me) return;
    const url = inviteLink(me.uid);
    const text = tr('Agrégame como amigo en FLOWI: {a}', { a: url });
    try {
      if (navigator.share) await navigator.share({ title: 'FLOWI', text, url });
      else { await navigator.clipboard.writeText(url); setError(tr('Enlace copiado ✓')); }
    } catch { /* la persona canceló */ }
  };

  const noRules = unavailable || error === 'unavailable';
  // Los invitados no tienen perfil público: para Amigos hace falta vincular la cuenta
  if (user?.isAnonymous) {
    return (
      <div className="relative min-h-screen flex flex-col bg-deep">
        <Header />
        <main className="relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32">
          <div className={`glass-card glass-static p-6 text-center space-y-3 ${box}`}>
            <Users className="w-10 h-10 text-accent/50 mx-auto" />
            <p className="text-sm text-text-primary font-semibold">{tr('Para tener amigos en FLOWI necesitas una cuenta')}</p>
            <p className="text-xs text-text-muted">{tr('Así tus amigos te pueden encontrar y compartir gastos contigo.')}</p>
            <button type="button" onClick={() => setRemoving({ id: '__link', name: '' })} className={`${btn} mx-auto border-accent bg-accent/15 text-accent`}>{tr('Vincular mi cuenta de Google')}</button>
          </div>
        </main>
        <BottomNav />
        {removing?.id === '__link' && <LinkAccountModal onClose={() => setRemoving(null)} />}
      </div>
    );
  }
  const pendingSent = useMemo(() => outgoing.length, [outgoing]);

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          {/* Atrás: a la página de donde vino (Servicios, Inicio…); si se abrió directo con un enlace, a Servicios */}
          <button type="button" onClick={() => { if (prevPath()) router.back(); else router.push('/servicios'); }}
                  aria-label={tr('Volver')} className={`p-2 -ml-2 shrink-0 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className={`text-2xl font-bold leading-tight ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>{tr('Amigos')}</h1>
            <p className="text-xs text-text-muted">{tr('Busca a tus amigos para chatear y compartir gastos. Solo ven tu nombre y tu foto.')}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link href="/amigos/chat" aria-label={tr('Chats')} className={`relative w-10 h-10 flex items-center justify-center bg-glass border text-accent ${isTech ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-full'}`}>
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </Link>
            <PageTourButton id="amigos" />
          </div>
        </div>

        {noRules && (
          <p className={`p-3 text-xs text-amber-300 border border-amber-400/40 bg-amber-400/10 ${box}`}>
            {tr('Amigos todavía no está activado en la base de datos. Muy pronto vas a poder buscar y agregar amigos.')}
          </p>
        )}

        {/* Llegó con el enlace de alguien */}
        {invited && (
          <div className={`glass-card p-3 border-accent/40 ${box}`}>
            <p className="text-xs text-accent font-semibold mb-1">{tr('Te invitaron a ser amigos')}</p>
            <ul><PersonRow p={invited} /></ul>
          </div>
        )}

        {/* Buscador */}
        <div className={`flex items-center gap-2 px-3 py-2.5 bg-glass border ${isTech ? 'rounded-none border-accent/30' : 'rounded-2xl border-glass-border'}`}>
          <Search className="w-4 h-4 text-text-muted shrink-0" />
          <input autoComplete="off" value={q} onChange={e => setQ(e.target.value)} placeholder={tr('Buscar por nombre o @usuario')}
                 className="flex-1 min-w-0 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none" aria-label={tr('Buscar amigos')} />
          {q && <button type="button" onClick={() => setQ('')} aria-label={tr('Borrar búsqueda')} className="text-text-muted"><X className="w-4 h-4" /></button>}
        </div>

        {justSent && (
          <div className={`p-3 border border-accent/40 bg-accent/10 space-y-2 ${box}`}>
            <p className="text-xs text-text-primary">{tr('✓ Le enviaste una solicitud a')} <b>{justSent.name.split(/\s+/)[0]}</b>. Le llega en FLOWI; si quieres, avísale también por WhatsApp.</p>
            <div className="flex gap-2">
              <a href={friendWhatsapp(me?.name || '', me?.uid || '', justSent.name, true)} target="_blank" rel="noopener noreferrer"
                 className={`${btn} border-emerald-500/40 bg-emerald-500/15 text-emerald-400`}><MessageCircle className="w-3.5 h-3.5" /> {tr('Avisarle por WhatsApp')}</a>
              <button type="button" onClick={() => setJustSent(null)} className={`${btn} border-glass-border text-text-muted`}>{tr('Listo')}</button>
            </div>
          </div>
        )}

        {error && error !== 'unavailable' && <p className="text-xs text-amber-300">{error}</p>}

        {results !== null && (
          <section className={`glass-card px-3 ${box}`}>
            {searching && !results.length ? (
              <p className="py-4 text-center text-xs text-text-muted">{tr('Buscando…')}</p>
            ) : results.length ? (
              <ul className="divide-y divide-glass-border">{results.map(p => <PersonRow key={p.uid} p={p} />)}</ul>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm text-text-secondary">{tr('No encontramos a «{q}» en FLOWI.', { q: q.trim() })}</p>
                <p className="text-[11px] text-text-muted">{tr('Puede que aún no la tenga, o que no deje que la encuentren por el nombre.')}</p>
                <a href={friendWhatsapp(me?.name || '', me?.uid || '', q.trim(), false)} target="_blank" rel="noopener noreferrer"
                   className={`${btn} mx-auto border-emerald-500/40 bg-emerald-500/15 text-emerald-400`}><MessageCircle className="w-3.5 h-3.5" /> {tr('Invitar a FLOWI por WhatsApp')}</a>
              </div>
            )}
          </section>
        )}

        {/* Solicitudes recibidas */}
        {incoming.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{tr('Solicitudes')} ({incoming.length})</h2>
            <ul className={`glass-card px-3 divide-y divide-glass-border ${box}`}>
              {incoming.map(r => (
                <PersonRow key={r.id} p={{ uid: r.from, name: r.fromName, photo: r.fromPhoto, username: r.fromUsername }}>
                  <span className="flex gap-1.5">
                    <button type="button" disabled={busy === r.id} onClick={() => answer(r.id, true)} className={`${btn} border-accent bg-accent/15 text-accent`}><Check className="w-3.5 h-3.5" /> {tr('Aceptar')}</button>
                    <button type="button" disabled={busy === r.id} onClick={() => answer(r.id, false)} aria-label={tr('Rechazar')} className={`${btn} border-glass-border text-text-muted`}><X className="w-3.5 h-3.5" /></button>
                  </span>
                </PersonRow>
              ))}
            </ul>
          </section>
        )}

        {/* Mis amigos */}
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{tr('Mis amigos')} {friends.length ? `(${friends.length})` : ''}</h2>
            {/* Entrada visible a la página de Chat */}
            {friends.length > 0 && (
              <Link href="/amigos/chat" data-tour="friends-chat" className={`${btn} relative border-accent bg-accent/15 text-accent`}>
                <MessageCircle className="w-3.5 h-3.5" /> {tr('Ir al chat')}
                {unreadCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </Link>
            )}
          </div>
          {!ready ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>
          ) : friends.length ? (
            <ul className={`glass-card px-3 divide-y divide-glass-border ${box}`}>
              {friends.map(f => (
                <PersonRow key={f.uid} p={f}>
                  <span className="flex gap-1.5">
                    <ChatButton uid={f.uid} />
                    <button type="button" onClick={() => setRemoving({ id: f.requestId, name: f.name })} aria-label={`Eliminar a ${f.name}`}
                            className={`${btn} border-glass-border text-text-muted`}><UserMinus className="w-3.5 h-3.5" /></button>
                  </span>
                </PersonRow>
              ))}
            </ul>
          ) : (
            <div className={`glass-card glass-static p-5 text-center space-y-1 ${box}`}>
              <Users className="w-9 h-9 text-accent/40 mx-auto" />
              <p className="text-sm text-text-primary">{tr('Todavía no tienes amigos en FLOWI')}</p>
              <p className="text-[11px] text-text-muted">{tr('Búscalos arriba o compárteles tu enlace.')}</p>
            </div>
          )}
          {pendingSent > 0 && <p className="text-[11px] text-text-muted">{pendingSent === 1 ? tr('1 solicitud enviada esperando respuesta.') : tr('{n} solicitudes enviadas esperando respuesta.', { n: pendingSent })}</p>}
        </section>

        {/* Mi perfil público */}
        {me && (
          <section className={`glass-card p-3 space-y-3 ${box}`}>
            <div className="flex items-center gap-3">
              <Avatar p={me} isTech={isTech} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{me.name}</p>
                <p className="text-[11px] text-text-muted truncate">@{me.username} · {tr('así te ven tus amigos')}</p>
              </div>
              <button type="button" onClick={shareMine} className={`${btn} border-accent/40 text-accent`}><Share2 className="w-3.5 h-3.5" /> {tr('Mi enlace')}</button>
            </div>
            <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={me.searchable} onChange={e => setSearchable(e.target.checked).catch(() => {})} className="mt-0.5 w-4 h-4 accent-[var(--accent)]" />
              <span>{tr('Que me encuentren por mi nombre. Si lo apagas, solo te pueden agregar con tu enlace.')}</span>
            </label>
            <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer" data-tour="friends-repeat">
              <input type="checkbox" checked={repeatOn} onChange={e => { setFriendRepeatOn(e.target.checked); setRepeatOn(e.target.checked); }} className="mt-0.5 w-4 h-4 accent-[var(--accent)]" />
              <span>{tr('Repetir la celebración de mi último amigo cada {a} días. Si la apagas y haces un amigo nuevo, se vuelve a activar.', { a: REPEAT_DAYS })}</span>
            </label>
          </section>
        )}
      </main>
      <BottomNav />
      <ConfirmDialog isOpen={!!removing} title={tr('Eliminar amigo')} confirmText={tr('Sí, eliminar')}
                     message={removing ? tr('{a} ya no estará en tus amigos. No se le avisa.', { a: removing.name.split(/\s+/)[0] }) : ''}
                     onCancel={() => setRemoving(null)}
                     onConfirm={async () => { const r = removing; setRemoving(null); if (r) await removeFriendship(r.id).catch(() => setError(tr('No se pudo eliminar.'))); }} />
    </div>
  );
}
