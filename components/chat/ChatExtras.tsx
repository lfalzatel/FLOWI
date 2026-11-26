'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Ban, Check, Flag, Lock, LockOpen, Timer, X } from 'lucide-react';
import { REPORT_REASONS } from '@/lib/chatSafety';
import { tr } from '@/lib/i18n';
import { checkPin, getLock, verifyBiometric } from '@/lib/appLock';
import { PinPad } from '@/components/security/PinPad';
import { CHAT_TTLS } from '@/lib/chat';

const MAX_TRIES = 5;
const WAIT_SEC = 30;

// Chat bloqueado: pide el PIN o la huella del bloqueo de FLOWI de este celular antes de mostrar los mensajes
export function ChatLockGate({ uid, name, isTech, onUnlock }: { uid: string; name: string; isTech: boolean; onUnlock: () => void }) {
  const cfg = getLock(uid);
  const hasBio = !!cfg?.credId;
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [waitUntil, setWaitUntil] = useState(0);
  const tried = useRef(false);

  const bio = useCallback(async () => { if (await verifyBiometric(uid)) onUnlock(); }, [uid, onUnlock]);
  useEffect(() => { if (hasBio && !tried.current) { tried.current = true; bio(); } }, [hasBio, bio]);

  if (!cfg) {
    // Bloqueado desde otro celular, pero aquí todavía no hay PIN
    return (
      <div className={`glass-card glass-static p-6 text-center space-y-3 ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
        <Lock className="w-10 h-10 text-accent mx-auto" />
        <p className="text-sm font-semibold text-text-primary">{tr('Este chat está bloqueado')}</p>
        <p className="text-xs text-text-muted">{tr('Para abrirlo en este celular, crea tu PIN en Configuración › Seguridad.')}</p>
        <Link href="/configuracion#seguridad" className="inline-block text-xs font-semibold text-accent">{tr('Ir a Seguridad')}</Link>
      </div>
    );
  }

  const waiting = waitUntil > Date.now();
  const onPin = async (pin: string) => {
    if (waiting) return;
    if (await checkPin(uid, pin)) { onUnlock(); return; }
    const n = tries + 1;
    setTries(n);
    if (n >= MAX_TRIES) {
      setWaitUntil(Date.now() + WAIT_SEC * 1000); setTries(0);
      setError(tr('Demasiados intentos. Espera {a} segundos.', { a: WAIT_SEC }));
      setTimeout(() => { setWaitUntil(0); setError(null); }, WAIT_SEC * 1000);
    } else setError(tr('PIN incorrecto. Te quedan {a} intentos.', { a: MAX_TRIES - n }));
  };

  return (
    <div className="flex flex-col items-center pt-2 pb-4">
      <div className="w-14 h-14 rounded-3xl bg-accent/15 flex items-center justify-center mb-3"><Lock className="w-7 h-7 text-accent" /></div>
      <p className="text-sm font-semibold text-text-primary text-center">{tr('Chat bloqueado con {a}', { a: name.split(/\s+/)[0] })}</p>
      <p className="text-xs text-text-muted mb-4 text-center">{hasBio ? tr('Usa tu huella o escribe tu PIN') : tr('Escribe tu PIN para abrirlo')}</p>
      <PinPad onComplete={onPin} error={error} disabled={waiting} onBiometric={hasBio ? bio : undefined} />
    </div>
  );
}

// Opciones de la conversación: bloquear el chat, la duración de los mensajes, bloquear al contacto y reportarlo
export function ChatOptionsSheet({ uid, peerName, locked, ttl, blocked, isTech, onLock, onTtl, onBlock, onReport, onClose }: {
  uid: string; peerName: string; locked: boolean; ttl: number; blocked: boolean; isTech: boolean;
  onLock: (v: boolean) => Promise<void>; onTtl: (sec: number) => Promise<void>;
  onBlock: (v: boolean) => Promise<void>;
  onReport: (reason: string, details: string, alsoBlock: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [reported, setReported] = useState(false);
  const first = peerName.split(/\s+/)[0];
  const hasPin = !!getLock(uid);
  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const run = async (f: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setMsg('');
    try { await f(); } catch { setMsg(tr('No se pudo guardar. Revisa tu conexión.')); } finally { setBusy(false); }
  };
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[120] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={tr('Opciones del chat')}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-md glass-dropdown max-h-[90dvh] overflow-y-auto p-5 space-y-4 animate-fade-in-up ${isTech ? 'rounded-none border border-accent/50' : 'rounded-[28px]'}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-bold text-lg ${isTech ? 'text-accent uppercase' : 'font-syne text-text-primary'}`}>{tr('Opciones del chat')}</h2>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="p-1 -mr-1 text-text-secondary"><X className="w-5 h-5" /></button>
        </div>

        {/* Bloqueo */}
        <section className="space-y-2">
          <button type="button" disabled={busy || (!locked && !hasPin)} onClick={() => run(() => onLock(!locked))}
                  className={`w-full flex items-center gap-3 p-3 border text-left disabled:opacity-60 ${box} ${locked ? 'border-accent bg-accent/10' : 'border-glass-border hover:bg-white/5'}`}>
            {locked ? <Lock className="w-5 h-5 text-accent shrink-0" /> : <LockOpen className="w-5 h-5 text-text-secondary shrink-0" />}
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-text-primary">{locked ? tr('Chat bloqueado') : tr('Bloquear este chat')}</span>
              <span className="block text-[11px] text-text-muted">{locked ? tr('Toca para quitar el bloqueo.') : tr('Pide tu PIN o huella para abrirlo y oculta sus mensajes en los avisos.')}</span>
            </span>
          </button>
          {!locked && !hasPin && (
            <p className="text-[11px] text-amber-300">
              {tr('Primero crea tu PIN en')} <Link href="/configuracion#seguridad" className="underline font-semibold">{tr('Configuración › Seguridad')}</Link>.
            </p>
          )}
        </section>

        {/* Mensajes temporales */}
        <section className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Timer className="w-4 h-4 text-accent" /> {tr('Mensajes temporales')}</p>
          <p className="text-[11px] text-text-muted">{tr('Los mensajes nuevos se borran solos después del tiempo elegido. Aplica para los dos y tu amigo verá el cambio.')}</p>
          <div className="grid grid-cols-2 gap-2">
            {CHAT_TTLS.map(t => (
              <button key={t.sec} type="button" disabled={busy} onClick={() => t.sec !== ttl && run(() => onTtl(t.sec))}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold border ${box} ${t.sec === ttl ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary hover:bg-white/5'}`}>
                {t.sec === ttl && <Check className="w-3.5 h-3.5" />} {tr(t.label)}
              </button>
            ))}
          </div>
        </section>
        {/* Bloquear contacto y reportar (como en WhatsApp) */}
        <section className="space-y-2 pt-1 border-t border-glass-border">
          <button type="button" disabled={busy} onClick={() => run(() => onBlock(!blocked))}
                  className={`w-full flex items-center gap-3 p-3 border text-left disabled:opacity-60 ${box} ${blocked ? 'border-red-400/50 bg-red-500/10' : 'border-glass-border hover:bg-white/5'}`}>
            <Ban className="w-5 h-5 text-red-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-red-400">{blocked ? tr('Desbloquear a {a}', { a: first }) : tr('Bloquear a {a}', { a: first })}</span>
              <span className="block text-[11px] text-text-muted">{blocked ? tr('Podrán volver a escribirse.') : tr('Ninguno de los dos podrá escribirle al otro. No se le avisa.')}</span>
            </span>
          </button>

          {reported ? (
            <p className={`p-3 text-xs text-text-primary border border-accent/40 bg-accent/10 ${box}`}>{tr('Gracias. Recibimos tu reporte y lo revisaremos. Si hay un peligro inmediato, comunícate con las autoridades.')}</p>
          ) : !reporting ? (
            <button type="button" onClick={() => setReporting(true)}
                    className={`w-full flex items-center gap-3 p-3 border border-glass-border hover:bg-white/5 text-left ${box}`}>
              <Flag className="w-5 h-5 text-red-400 shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-red-400">{tr('Reportar a {a}', { a: first })}</span>
                <span className="block text-[11px] text-text-muted">{tr('FLOWI revisa los últimos mensajes que te envió.')}</span>
              </span>
            </button>
          ) : (
            <div className={`p-3 space-y-2 border border-red-400/40 ${box}`}>
              <p className="text-sm font-semibold text-text-primary">{tr('¿Por qué reportas a {a}?', { a: first })}</p>
              <div className="space-y-1">
                {REPORT_REASONS.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer py-1">
                    <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="w-4 h-4 accent-[var(--accent)]" />
                    {tr(r.label)}
                  </label>
                ))}
              </div>
              <textarea value={details} onChange={e => setDetails(e.target.value.slice(0, 500))} rows={2}
                        placeholder={tr('Cuéntanos qué pasó (opcional)')} aria-label={tr('Detalles del reporte')}
                        className={`w-full resize-none px-3 py-2 bg-glass border border-glass-border text-xs text-text-primary placeholder-text-muted focus:outline-none ${box}`} />
              {!blocked && (
                <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={alsoBlock} onChange={e => setAlsoBlock(e.target.checked)} className="w-4 h-4 accent-[var(--accent)]" />
                  {tr('Bloquear también a {a}', { a: first })}
                </label>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setReporting(false)} className={`flex-1 py-2 text-xs font-semibold border border-glass-border text-text-secondary ${box}`}>{tr('Cancelar')}</button>
                <button type="button" disabled={!reason || busy}
                        onClick={() => run(async () => { await onReport(reason, details, alsoBlock && !blocked); setReported(true); setReporting(false); })}
                        className={`flex-1 py-2 text-xs font-semibold border border-red-400/60 bg-red-500/15 text-red-400 disabled:opacity-50 ${box}`}>{busy ? tr('Enviando…') : tr('Enviar reporte')}</button>
              </div>
            </div>
          )}
        </section>
        {msg && <p className="text-xs text-amber-300">{msg}</p>}
      </div>
    </div>,
    document.body,
  );
}
