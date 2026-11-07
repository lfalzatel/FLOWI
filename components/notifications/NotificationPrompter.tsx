'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { requestNotificationPermission, scheduleNotificationViaSW } from '@/lib/notifications';
import { syncPushToken } from '@/lib/push';
import {
  ASK_EVENT, CHANGED_EVENT, canAutoAsk, markDismissed, markShown, notificationsState,
} from '@/lib/notifPrompt';
import { NotificationDialog, NotificationDialogKind } from './NotificationDialog';

// Muestra, desde cualquier pantalla, los mensajes para activar las notificaciones
// (ver lib/notifPrompt.ts para cuándo se piden).
export function NotificationPrompter() {
  const { user } = useAuth();
  const [dialog, setDialog] = useState<{ kind: NotificationDialogKind; context?: string } | null>(null);

  useEffect(() => {
    const onAsk = (e: Event) => {
      const { context, force } = (e as CustomEvent).detail || {};
      const state = notificationsState();
      if (state === 'unsupported') return;
      if (force) {
        setDialog({ kind: state === 'enabled' ? 'enabled' : state === 'blocked' ? 'blocked' : state === 'ios-needs-install' ? 'ios-install' : 'ask', context });
        return;
      }
      if (!canAutoAsk()) return;
      markShown();
      setDialog({ kind: state === 'ios-needs-install' ? 'ios-install' : 'ask', context });
    };
    // Activadas desde el menú de perfil: confirmar con el mismo mensaje
    const onChanged = (e: Event) => {
      if ((e as CustomEvent).detail?.enabled) setDialog({ kind: 'enabled' });
    };
    window.addEventListener(ASK_EVENT, onAsk);
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(ASK_EVENT, onAsk);
      window.removeEventListener(CHANGED_EVENT, onChanged);
    };
  }, []);

  if (!dialog) return null;

  async function confirm() {
    if (dialog?.kind !== 'ask') { setDialog(null); return; }
    // El permiso del celular solo aparece aquí, después de que dijeron "Sí"
    const granted = await requestNotificationPermission();
    if (granted) {
      try { localStorage.setItem('notifications_enabled', 'true'); } catch {}
      if (user) syncPushToken(user.uid);
      window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { enabled: true, silent: true } }));
      scheduleNotificationViaSW({ title: 'Notificaciones activadas ✓', body: 'Te avisaremos tus pagos y recordatorios, incluso con FLOWI cerrada.', tag: 'flowi-notif-on' });
      setDialog({ kind: 'enabled' });
    } else if (notificationsState() === 'blocked') {
      setDialog({ kind: 'blocked' });
    } else {
      markDismissed();
      setDialog(null);
    }
  }

  function cancel() {
    if (dialog?.kind === 'ask' || dialog?.kind === 'ios-install') markDismissed();
    setDialog(null);
  }

  return <NotificationDialog kind={dialog.kind} context={dialog.context} onConfirm={confirm} onCancel={cancel} />;
}
