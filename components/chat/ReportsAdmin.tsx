'use client';
import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { Flag } from 'lucide-react';
import { db } from '@/lib/firebase';
import { currentLocale, tr } from '@/lib/i18n';
import { REPORT_REASONS } from '@/lib/chatSafety';

interface Report {
  id: string;
  reporterName?: string; reportedName?: string; reported?: string; reason?: string; details?: string;
  messages?: { text: string; at: number }[]; status?: string; createdAt?: { toMillis: () => number } | null;
}

// Solo administradores: reportes que llegan desde el chat (lib/chatSafety.ts). Se revisan y se marcan como revisados.
// Para suspender una cuenta se usa la consola de Firebase (Authentication → deshabilitar usuario).
export function ReportsAdmin({ isTech }: { isTech: boolean }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  useEffect(() => {
    const q = query(collection(db, 'fl_reports'), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(q, s => setReports(s.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) }))), () => setReports([]));
  }, []);
  const box = isTech ? 'rounded-none' : 'rounded-2xl';
  const pending = (reports || []).filter(r => r.status !== 'revisado').length;
  return (
    <section className={`glass-card p-4 space-y-3 ${box}`}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
        <Flag className="w-4 h-4 text-red-400" /> {tr('Reportes del chat')} {pending ? <span className="text-red-400">({pending})</span> : null}
      </h2>
      {reports === null ? <p className="text-xs text-text-muted">{tr('Cargando…')}</p>
        : !reports.length ? <p className="text-xs text-text-muted">{tr('No hay reportes.')}</p>
        : reports.map(r => (
          <div key={r.id} className={`p-3 border space-y-1.5 ${box} ${r.status === 'revisado' ? 'border-glass-border opacity-60' : 'border-red-400/40'}`}>
            <p className="text-xs text-text-primary">
              <b>{r.reporterName}</b> {tr('reportó a')} <b>{r.reportedName}</b> · {tr(REPORT_REASONS.find(x => x.id === r.reason)?.label || 'Otro motivo')}
            </p>
            <p className="text-[10px] text-text-muted">{r.createdAt ? new Date(r.createdAt.toMillis()).toLocaleString(currentLocale()) : ''} · uid {r.reported}</p>
            {r.details && <p className="text-xs text-text-secondary">“{r.details}”</p>}
            {!!r.messages?.length && (
              <ul className="text-[11px] text-text-secondary space-y-0.5 max-h-40 overflow-y-auto">
                {r.messages.map((m, i) => <li key={i}>· {m.text}</li>)}
              </ul>
            )}
            {r.status !== 'revisado' && (
              <button type="button" onClick={() => updateDoc(doc(db, 'fl_reports', r.id), { status: 'revisado' }).catch(() => {})}
                      className={`px-2.5 py-1 text-[11px] font-semibold border border-accent/50 text-accent ${isTech ? 'rounded-none' : 'rounded-full'}`}>
                {tr('Marcar como revisado')}
              </button>
            )}
          </div>
        ))}
    </section>
  );
}
