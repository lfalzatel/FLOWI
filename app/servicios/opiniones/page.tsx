'use client';
import { currentLocale, tr, lazyT } from '@/lib/i18n';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Star, Send, Check, Trash2, BarChart3 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ReportsAdmin } from '@/components/chat/ReportsAdmin';
import { getAllUsers } from '@/lib/firestore';
import {
  FEEDBACK_AREAS, FEEDBACK_TYPES, Feedback, FeedbackType, deleteFeedback, sendFeedback, updateFeedback, watchAllFeedback, watchMyFeedback,
} from '@/lib/feedback';

// Comentarios y sugerencias. Cada persona envía lo que le gusta, lo que no, ideas y fallas.
// El administrador ve además el panel: puntos a favor y en contra por parte de la app, calificación y lo más usado.
const SERVICE_NAMES: Record<string, string> = lazyT(() => ({
  cuentas: tr('Cuentas'), hormiga: tr('Gastos hormiga'), amigos: tr('Amigos'), recordatorios: tr('Recordatorios'), resumen: tr('Resumen'),
  presupuestos: tr('Presupuestos'), metas: tr('Metas'), inversiones: tr('Inversiones'), negocio: tr('Mi negocio'), productos: tr('¿Cuánto gasto en…?'),
  recibos: tr('Mis recibos'), importar: tr('Importar extracto'), notas: tr('Notas'), compartidos: tr('Compartidos'), configuracion: tr('Configuración'),
  opiniones: tr('Comentarios'),
}));

export default function OpinionesPage() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

  const [type, setType] = useState<FeedbackType | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [mine, setMine] = useState<Feedback[]>([]);
  useEffect(() => (user ? watchMyFeedback(user.uid, setMine) : undefined), [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSend = !!type && !!area && text.trim().length >= 3 && !sending;
  const send = async () => {
    if (!user || !canSend) return;
    setSending(true); setError('');
    try {
      await sendFeedback({ userId: user.uid, userName: (profile?.name || 'Usuario').slice(0, 60), type: type!, area: area!, rating, text });
      setSent(true); setType(null); setArea(null); setRating(null); setText('');
      setTimeout(() => setSent(false), 4000);
    } catch (e: any) {
      setError(e?.code === 'permission-denied' ? tr('Todavía no se pueden enviar comentarios. Muy pronto.') : tr('No se pudo enviar. Revisa tu conexión.'));
    } finally { setSending(false); }
  };

  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const chip = (on: boolean, tone = '') => `px-3 py-1.5 text-xs font-semibold border transition-all active:scale-95 ${isTech ? 'rounded-none' : 'rounded-full'} ${on ? tone || 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-secondary'}`;
  const typeOf = (id: FeedbackType) => FEEDBACK_TYPES.find(t => t.id === id)!;

  return (
    <div className="relative min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`relative flex-1 max-w-2xl lg:max-w-4xl mx-auto w-full p-4 pb-32 space-y-5 animate-fade-in-up ${isTech ? 'font-mono' : ''}`}>
        <div className="flex items-center gap-3">
          <Link href="/servicios" aria-label={tr('Volver a Servicios')} className={`p-2 -ml-2 bg-glass border ${isTech ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className={`text-2xl font-bold leading-tight ${isTech ? 'text-accent uppercase tracking-wider' : 'font-syne text-text-primary'}`}>{tr('Comentarios y sugerencias')}</h1>
            <p className="text-xs text-text-muted">{tr('Cuéntanos qué te gusta y qué no. Leemos todo para mejorar FLOWI.')}</p>
          </div>
        </div>

        {/* Formulario */}
        <section className={`glass-card p-4 space-y-4 ${box}`}>
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">{tr('¿Qué nos quieres contar?')}</p>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_TYPES.map(t => (
                <button key={t.id} type="button" onClick={() => setType(t.id)} className={chip(type === t.id, t.tone)}>{t.emoji} {tr(t.label)}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-2">{tr('¿De qué parte de la app?')}</p>
            <div className="flex flex-wrap gap-1.5">
              {FEEDBACK_AREAS.map(a => <button key={a} type="button" onClick={() => setArea(a)} className={chip(area === a)}>{tr(a)}</button>)}
            </div>
          </div>
          <div>
            <label htmlFor="fb-text" className="text-xs font-semibold text-text-secondary mb-2 block">{tr('Cuéntanos')}</label>
            <textarea id="fb-text" value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={4}
                      placeholder={type === 'error' ? tr('¿Qué estabas haciendo y qué pasó?') : type === 'idea' ? tr('¿Qué te gustaría que FLOWI hiciera?') : tr('Escribe aquí…')}
                      className={`w-full bg-glass border px-3 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none ${isTech ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-xl'}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-secondary mb-1.5">{tr('¿Cómo calificas FLOWI?')} <span className="font-normal text-text-muted">({tr('opcional')})</span></p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(rating === n ? null : n)} aria-label={`${n} estrellas`}>
                  <Star className={`w-7 h-7 ${rating && n <= rating ? 'text-amber-400 fill-amber-400' : 'text-text-muted'}`} />
                </button>
              ))}
            </div>
          </div>
          <button type="button" disabled={!canSend} onClick={send}
                  className={`w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 ${isTech ? 'rounded-none bg-accent/15 border border-accent text-accent uppercase' : 'rounded-xl bg-accent text-black'}`}>
            <Send className="w-4 h-4" /> {sending ? tr('Enviando…') : tr('Enviar')}
          </button>
          {sent && <p className="text-sm text-accent text-center">{tr('✓ ¡Gracias! Lo recibimos.')}</p>}
          {error && <p className="text-xs text-amber-300 text-center">{error}</p>}
        </section>

        {/* Lo que yo he enviado */}
        {mine.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{tr('Lo que nos has contado')} ({mine.length})</h2>
            <ul className="space-y-2">
              {mine.map(f => (
                <li key={f.id} className={`glass-card p-3 text-xs space-y-1 ${box}`}>
                  <p className="text-text-muted">{typeOf(f.type).emoji} {tr(typeOf(f.type).label)} · {tr(f.area)}{f.createdAt ? ` · ${f.createdAt.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })}` : ''}
                    {f.status === 'hecho' ? tr(' · ✅ Resuelto') : f.status === 'visto' ? tr(' · 👀 Visto') : ''}</p>
                  <p className="text-text-primary whitespace-pre-wrap">{f.text}</p>
                  {f.reply && <p className="text-accent">💬 FLOWI: {f.reply}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin && <ReportsAdmin isTech={isTech} />}
        {isAdmin && <AdminPanel isTech={isTech} />}
      </main>
      <BottomNav />
    </div>
  );
}

// ── Panel del administrador ─────────────────────────────────────────────
function AdminPanel({ isTech }: { isTech: boolean }) {
  const [all, setAll] = useState<Feedback[]>([]);
  const [failed, setFailed] = useState(false);
  const [usage, setUsage] = useState<{ people: number; top: [string, number][] } | null>(null);
  const [fType, setFType] = useState<FeedbackType | 'todos'>('todos');
  const [fArea, setFArea] = useState<string>('todas');
  const [fStatus, setFStatus] = useState<'todos' | 'nuevo' | 'visto' | 'hecho'>('nuevo');
  const [replying, setReplying] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => watchAllFeedback(setAll, () => setFailed(true)), []);
  useEffect(() => {
    getAllUsers().then(users => {
      const sum: Record<string, number> = {};
      let people = 0;
      for (const u of users as any[]) {
        if (!u.servicesUsage) continue;
        people++;
        for (const [k, v] of Object.entries(u.servicesUsage as Record<string, number>)) sum[k] = (sum[k] || 0) + (v || 0);
      }
      setUsage({ people, top: Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 10) });
    }).catch(() => setUsage({ people: 0, top: [] }));
  }, []);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const byArea: Record<string, { pro: number; contra: number; idea: number; error: number }> = {};
    let rSum = 0, rN = 0;
    for (const f of all) {
      byType[f.type] = (byType[f.type] || 0) + 1;
      const a = (byArea[f.area] ||= { pro: 0, contra: 0, idea: 0, error: 0 });
      if (f.type === 'gusta') a.pro++; else if (f.type === 'mejorar') a.contra++; else if (f.type === 'idea') a.idea++; else a.error++;
      if (f.rating) { rSum += f.rating; rN++; }
    }
    const areas = Object.entries(byArea).sort((x, y) => (y[1].contra + y[1].error) - (x[1].contra + x[1].error) || (y[1].pro - x[1].pro));
    return { byType, areas, avg: rN ? rSum / rN : null, rN };
  }, [all]);

  const shown = all.filter(f => (fType === 'todos' || f.type === fType) && (fArea === 'todas' || f.area === fArea) && (fStatus === 'todos' || f.status === fStatus));
  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const pill = (on: boolean) => `px-2.5 py-1 text-[11px] font-semibold border ${isTech ? 'rounded-none' : 'rounded-full'} ${on ? 'border-accent bg-accent/15 text-accent' : 'border-glass-border text-text-muted'}`;
  const typeOf = (id: FeedbackType) => FEEDBACK_TYPES.find(t => t.id === id)!;
  const maxArea = Math.max(1, ...stats.areas.map(([, v]) => v.pro + v.contra + v.idea + v.error));

  return (
    <section className="space-y-4 pt-2">
      <h2 className={`flex items-center gap-2 text-base font-bold ${isTech ? 'text-accent uppercase' : 'text-text-primary font-syne'}`}><BarChart3 className="w-5 h-5 text-accent" /> {tr('Panel del administrador')}</h2>
      {failed && <p className="text-xs text-amber-300">{tr('No se pudieron leer las opiniones (faltan las reglas de la base de datos).')}</p>}

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {FEEDBACK_TYPES.map(t => (
          <div key={t.id} className={`glass-card glass-static p-3 ${box}`}>
            <p className="text-[11px] text-text-muted">{t.emoji} {tr(t.label)}</p>
            <p className="text-lg font-bold text-text-primary">{stats.byType[t.id] || 0}</p>
          </div>
        ))}
        <div className={`glass-card glass-static p-3 ${box}`}>
          <p className="text-[11px] text-text-muted">{tr('⭐ Calificación')}</p>
          <p className="text-lg font-bold text-amber-300">{stats.avg ? stats.avg.toFixed(1) : '—'}<span className="text-[11px] text-text-muted font-normal"> {stats.rN ? `(${stats.rN})` : ''}</span></p>
        </div>
      </div>

      {/* A favor y en contra por parte de la app */}
      {stats.areas.length > 0 && (
        <div className={`glass-card glass-static p-4 space-y-2 ${box}`}>
          <p className="text-xs font-semibold text-text-primary">{tr('A favor y en contra por parte de la app')} <span className="font-normal text-text-muted">{tr('(arriba lo que más critican)')}</span></p>
          {stats.areas.map(([a, v]) => {
            const w = (n: number) => `${(n / maxArea) * 100}%`;
            return (
              <button key={a} type="button" onClick={() => { setFArea(a); setFStatus('todos'); }} className="w-full text-left">
                <div className="flex justify-between text-[11px] text-text-secondary"><span>{tr(a)}</span>
                  <span>👍 {v.pro} · 👎 {v.contra} · 💡 {v.idea} · 🐞 {v.error}</span></div>
                <div className="flex h-2 mt-0.5 bg-white/5 overflow-hidden rounded-full">
                  <div className="bg-emerald-500" style={{ width: w(v.pro) }} />
                  <div className="bg-red-500" style={{ width: w(v.contra) }} />
                  <div className="bg-amber-400" style={{ width: w(v.idea) }} />
                  <div className="bg-orange-500" style={{ width: w(v.error) }} />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Lo más usado */}
      {usage && usage.top.length > 0 && (
        <div className={`glass-card glass-static p-4 space-y-1.5 ${box}`}>
          <p className="text-xs font-semibold text-text-primary">{tr('Lo más usado en Servicios')} <span className="font-normal text-text-muted">({usage.people} {usage.people === 1 ? 'persona' : 'personas'})</span></p>
          {usage.top.map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-[11px] text-text-secondary"><span>{SERVICE_NAMES[k] || k}</span><span>{v}</span></div>
              <div className="h-1.5 mt-0.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-accent" style={{ width: `${(v / usage.top[0][1]) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Lista con filtros */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {(['nuevo', 'visto', 'hecho', 'todos'] as const).map(s => <button key={s} type="button" onClick={() => setFStatus(s)} className={pill(fStatus === s)}>{s === 'nuevo' ? 'Nuevos' : s === 'visto' ? 'Vistos' : s === 'hecho' ? 'Resueltos' : 'Todos'}</button>)}
          <span className="w-px bg-glass-border mx-1" />
          <button type="button" onClick={() => setFType('todos')} className={pill(fType === 'todos')}>{tr('Todo tipo')}</button>
          {FEEDBACK_TYPES.map(t => <button key={t.id} type="button" onClick={() => setFType(t.id)} className={pill(fType === t.id)}>{t.emoji}</button>)}
          {fArea !== 'todas' && <button type="button" onClick={() => setFArea('todas')} className={pill(true)}>{fArea} ✕</button>}
        </div>
        {!shown.length ? <p className="text-xs text-text-muted py-3 text-center">{tr('No hay opiniones con ese filtro.')}</p> : (
          <ul className="space-y-2">
            {shown.map(f => (
              <li key={f.id} className={`glass-card p-3 text-xs space-y-1.5 ${box}`}>
                <p className="text-text-muted">{typeOf(f.type).emoji} {tr(typeOf(f.type).label)} · <b className="text-text-secondary">{tr(f.area)}</b> · {f.userName}
                  {f.rating ? ` · ${'⭐'.repeat(f.rating)}` : ''}{f.createdAt ? ` · ${f.createdAt.toLocaleString(currentLocale(), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}</p>
                <p className="text-text-primary whitespace-pre-wrap">{f.text}</p>
                {f.reply && <p className="text-accent">💬 {f.reply}</p>}
                {replying?.id === f.id ? (
                  <div className="flex gap-1.5">
                    <input autoComplete="off" value={replying.text} onChange={e => setReplying({ id: f.id, text: e.target.value })} placeholder={tr('Respuesta (la ve la persona)')}
                           className="flex-1 min-w-0 bg-glass border border-glass-border px-2 py-1 text-xs text-text-primary rounded-lg focus:outline-none focus:border-accent" />
                    <button type="button" onClick={() => { updateFeedback(f.id, { reply: replying.text.trim().slice(0, 500) || null, status: 'visto' }).catch(() => {}); setReplying(null); }} className={pill(true)}>{tr('Enviar')}</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {f.status !== 'visto' && <button type="button" onClick={() => updateFeedback(f.id, { status: 'visto' }).catch(() => {})} className={pill(false)}>{tr('👀 Visto')}</button>}
                    {f.status !== 'hecho' && <button type="button" onClick={() => updateFeedback(f.id, { status: 'hecho' }).catch(() => {})} className={pill(false)}><Check className="w-3 h-3 inline" /> {tr('Resuelto')}</button>}
                    <button type="button" onClick={() => setReplying({ id: f.id, text: f.reply || '' })} className={pill(false)}>{tr('💬 Responder')}</button>
                    <button type="button" onClick={() => deleteFeedback(f.id).catch(() => {})} aria-label={tr('Borrar')} className={pill(false)}><Trash2 className="w-3 h-3 inline" /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
