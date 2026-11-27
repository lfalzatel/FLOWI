'use client';
import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { usePopupBusy, usePopupHold } from '@/lib/tourGate';
import {
  ExpenseDraft, VoiceDraft, clearDraft, clearReceiptPhotos, loadDraft, loadReceiptPhotos,
} from '@/lib/drafts';
import { formatCurrency } from '@/lib/format';
import { Button, Sheet } from '@/components/ui';

// Al abrir FLOWI, si quedó algo a medias por una recarga (un recibo leído sin guardar, una foto que
// se estaba leyendo o un gasto a medio llenar), se ofrece retomarlo. Lo abre el menú inferior.
type Found =
  | { kind: 'voice'; draft: VoiceDraft }
  | { kind: 'photos'; files: File[] }
  | { kind: 'expense'; draft: ExpenseDraft };

export function DraftRecovery({ onVoice, onPhotos, onExpense }: {
  onVoice: (d: VoiceDraft) => void;
  onPhotos: (files: File[]) => void;
  onExpense: (d: ExpenseDraft) => void;
}) {
  const { user, profile } = useAuth();
  const [found, setFound] = useState<Found | null>(null);
  const busy = usePopupBusy();
  const [visible, setVisible] = useState(false);

  // Se busca una sola vez, cuando ya hay sesión
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const voice = loadDraft<VoiceDraft>('voice');
      if (voice?.results?.length) { if (alive) setFound({ kind: 'voice', draft: voice }); return; }
      const photos = await loadReceiptPhotos();
      if (photos?.length) { if (alive) setFound({ kind: 'photos', files: photos }); return; }
      const expense = loadDraft<ExpenseDraft>('expense');
      if (expense && (expense.amount || expense.description)) { if (alive) setFound({ kind: 'expense', draft: expense }); }
    })();
    return () => { alive = false; };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Espera su turno (tutorial u otras ventanas) y lo ocupa mientras se ve
  useEffect(() => {
    if (!found || visible || busy) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [found, visible, busy]);
  usePopupHold(visible);

  if (!found || !visible) return null;

  const discard = () => {
    if (found.kind === 'voice') clearDraft('voice');
    else if (found.kind === 'photos') clearReceiptPhotos().catch(() => {});
    else clearDraft('expense');
    setFound(null); setVisible(false);
  };
  const resume = () => {
    const f = found;
    setFound(null); setVisible(false);
    if (f.kind === 'voice') onVoice(f.draft);
    else if (f.kind === 'photos') onPhotos(f.files);
    else onExpense(f.draft);
  };

  const money = (n: number) => formatCurrency(n, profile?.currency);
  let title = '', text = '';
  if (found.kind === 'voice') {
    const n = found.draft.results.length;
    const total = found.draft.results.reduce((s, r: any) => s + (Number(r?.amount) || 0), 0);
    title = found.draft.readKind === 'movimientos' ? tr('Tenías movimientos del banco sin guardar') : tr('Tenías un recibo leído sin guardar');
    text = n > 1
      ? tr('La IA ya había leído {a} movimientos ({b}). Retómalos donde ibas, sin volver a tomar la foto.', { a: n, b: money(total) })
      : tr('La IA ya lo había leído ({a}). Retómalo donde ibas, sin volver a tomar la foto.', { a: money(total) });
  } else if (found.kind === 'photos') {
    title = tr('Se interrumpió la lectura de tu recibo');
    text = tr('La foto quedó guardada. ¿La leo otra vez? No cuenta como un recibo más de hoy.');
  } else {
    title = found.draft.editId
      ? (found.draft.type === 'ingreso' ? tr('Estabas editando un ingreso') : tr('Estabas editando un gasto'))
      : (found.draft.type === 'ingreso' ? tr('Tenías un ingreso a medio registrar') : tr('Tenías un gasto a medio registrar'));
    const amt = Number(String(found.draft.amount).replace(/[^\d.]/g, '')) || 0;
    text = [amt ? money(amt) : '', found.draft.category, found.draft.description].filter(Boolean).join(' · ');
  }

  return (
    <Sheet variant="dialog" showClose onClose={discard} z={140}>
      <div className="ui-icon-box mb-3"><History className="w-5 h-5" /></div>
      <h3 className="ui-title text-base mb-1 pr-8">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{text}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={discard}>{tr('Descartar')}</Button>
        <Button onClick={resume}>{found.kind === 'photos' ? tr('Leerla otra vez') : tr('Retomar')}</Button>
      </div>
    </Sheet>
  );
}
