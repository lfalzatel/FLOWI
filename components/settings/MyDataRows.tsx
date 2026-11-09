'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, FileJson, FileSpreadsheet, Loader2, Lock, Trash2, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clearLocalData, deleteMyAccount, deleteMyRecords, exportCsv, exportJson, RECORD_COLLECTIONS } from '@/lib/myData';

type Open = 'export' | 'records' | 'account' | null;

// Filas de "Datos y Privacidad": descargar mis datos, borrar lo registrado y eliminar la cuenta
export function MyDataRows({ isTechTheme }: { isTechTheme: boolean }) {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const isAdmin = profile?.role === 'admin';
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [typed, setTyped] = useState('');

  const show = (o: Open) => { setOpen(o); setMsg(null); setTyped(''); };
  const close = () => { if (!busy) setOpen(null); };

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    try { setMsg({ ok: true, text: await fn() }); }
    catch (e: any) { console.error(e); setMsg({ ok: false, text: e?.message?.includes('administrador') ? e.message : 'No se pudo completar. Revisa tu conexión e intenta de nuevo.' }); }
    finally { setBusy(false); }
  };

  const mono = isTechTheme ? 'font-mono' : '';
  const row = (last = false) => `w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-white/5 transition-colors ${last ? '' : `border-b ${isTechTheme ? 'border-accent/15' : 'border-glass-border'}`}`;
  // Clases completas (Tailwind no ve clases armadas por partes)
  const TINT: Record<string, string> = {
    blue: isTechTheme ? 'border border-blue-500/20 rounded-none bg-blue-500/5' : 'rounded-xl bg-blue-500/10',
    orange: isTechTheme ? 'border border-orange-500/20 rounded-none bg-orange-500/5' : 'rounded-xl bg-orange-500/10',
    red: isTechTheme ? 'border border-red-500/20 rounded-none bg-red-500/5' : 'rounded-xl bg-red-500/10',
  };
  const icon = (c: string) => `w-8 h-8 shrink-0 flex items-center justify-center ${TINT[c]}`;
  const btn = `w-full py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`;

  const word = open === 'records' ? 'BORRAR' : 'ELIMINAR';
  const done = msg?.ok && open !== 'export';

  return (
    <>
      <button type="button" onClick={() => show('export')} className={row()}>
        <div className="flex items-center gap-3">
          <div className={icon('blue')}><Download className="w-4 h-4 text-blue-400" /></div>
          <div className={mono}>
            <p className="text-sm font-medium text-text-primary">Descargar mis datos</p>
            <p className="text-[10px] text-text-muted">Excel (CSV) con tus movimientos o todo en un archivo</p>
          </div>
        </div>
      </button>
      <button type="button" onClick={() => show('records')} className={row()}>
        <div className="flex items-center gap-3">
          <div className={icon('orange')}><Trash2 className="w-4 h-4 text-orange-400" /></div>
          <div className={mono}>
            <p className="text-sm font-medium text-text-primary">Borrar todo lo registrado</p>
            <p className="text-[10px] text-text-muted">Empezar de cero, sin cerrar tu cuenta</p>
          </div>
        </div>
      </button>
      <button type="button" onClick={() => show('account')} className={row(true)}>
        <div className="flex items-center gap-3">
          <div className={icon('red')}><Lock className="w-4 h-4 text-red-500" /></div>
          <div className={mono}>
            <p className="text-sm font-medium text-red-400">Eliminar mi cuenta</p>
            <p className="text-[10px] text-red-400/70">Borra la cuenta y todos tus datos. No se puede deshacer</p>
          </div>
        </div>
      </button>

      {open && uid && createPortal(
        <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={close}>
          <div onClick={e => e.stopPropagation()}
               className={`relative w-full sm:max-w-md bg-deep border border-glass-border p-6 space-y-4 max-h-[90vh] overflow-y-auto ${isTechTheme ? 'rounded-none' : 'rounded-t-3xl sm:rounded-3xl'}`}
               style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={close} aria-label="Cerrar" className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-glass flex items-center justify-center">
              <X className="w-4 h-4 text-text-muted" />
            </button>

            {open === 'export' && (
              <>
                <h3 className="text-lg font-bold font-syne text-text-primary pr-8">Descargar mis datos</h3>
                <p className="text-sm text-text-secondary">El archivo se guarda en tu celular o computador. Nadie más lo recibe.</p>
                <button type="button" disabled={busy} onClick={() => run(async () => `Listo: ${await exportCsv(uid)} movimientos descargados.`)}
                        className={`${btn} bg-accent text-black`}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Mis gastos e ingresos (Excel)
                </button>
                <button type="button" disabled={busy} onClick={() => run(async () => `Listo: ${await exportJson(uid)} registros descargados.`)}
                        className={`${btn} border border-glass-border text-text-primary hover:bg-glass`}>
                  <FileJson className="w-4 h-4 text-accent" /> Todo (perfil, deudas, cuentas, metas…)
                </button>
                <p className="text-[11px] text-text-muted">“Todo” es un archivo JSON: sirve como copia de seguridad o para llevar tus datos a otra app.</p>
              </>
            )}

            {(open === 'records' || open === 'account') && !done && (
              <>
                <h3 className="text-lg font-bold font-syne text-text-primary pr-8">
                  {open === 'records' ? 'Borrar todo lo registrado' : 'Eliminar mi cuenta'}
                </h3>
                {open === 'account' && isAdmin ? (
                  <p className="text-sm text-text-secondary">La cuenta de administrador no se puede eliminar desde la app.</p>
                ) : (
                  <>
                    <p className="text-sm text-text-secondary">
                      {open === 'records'
                        ? 'Se borran para siempre tus '
                        : 'Se borran para siempre tu cuenta, tu perfil y tus '}
                      {RECORD_COLLECTIONS.map(c => c.label).join(', ')}.
                      {open === 'records'
                        ? ' Tu cuenta, tu plan y tu configuración se mantienen.'
                        : ' Si tienes Premium, también lo pierdes. Solo se guarda el registro de los pagos que hiciste (valor y fecha), como exige la ley.'}
                    </p>
                    <p className="text-sm text-amber-400">
                      No se puede deshacer.{' '}
                      <button type="button" onClick={() => show('export')} className="underline">Descarga tus datos antes</button> si quieres conservarlos.
                    </p>
                    <label className="block space-y-1">
                      <span className="text-xs text-text-muted">Para confirmar, escribe <b className="text-text-primary">{word}</b></span>
                      <input value={typed} onChange={e => setTyped(e.target.value.toUpperCase())} disabled={busy} autoCapitalize="characters"
                             className={`w-full px-3 py-2.5 bg-glass border border-glass-border text-text-primary text-sm focus:outline-none focus:border-red-400 ${isTechTheme ? 'rounded-none font-mono' : 'rounded-xl'}`} />
                    </label>
                    <button type="button" disabled={busy || typed.trim() !== word}
                            onClick={() => run(async () => {
                              if (open === 'records') {
                                const n = await deleteMyRecords(uid);
                                return `Listo: se borraron ${n} registros. Puedes empezar de cero.`;
                              }
                              await deleteMyAccount();
                              clearLocalData(uid);
                              const { signOut } = await import('@/lib/auth');
                              await signOut().catch(() => {});
                              setTimeout(() => { window.location.href = '/login'; }, 1800);
                              return 'Tu cuenta fue eliminada. Gracias por haber usado FLOWI.';
                            })}
                            className={`${btn} bg-red-500 text-white`}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {busy ? 'Borrando…' : open === 'records' ? 'Borrar todo lo registrado' : 'Eliminar mi cuenta'}
                    </button>
                  </>
                )}
              </>
            )}

            {msg && <p className={`text-sm text-center ${msg.ok ? 'text-accent' : 'text-red-400'}`}>{msg.text}</p>}
            {done && open === 'records' && (
              <button type="button" onClick={() => window.location.reload()} className={`${btn} border border-glass-border text-text-primary`}>Cerrar</button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
