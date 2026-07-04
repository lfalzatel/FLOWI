'use client';
import { useEffect } from 'react';
import { useInAppNotifications, InAppNotif } from '@/hooks/useInAppNotifications';
import { Bell, X } from 'lucide-react';

export function InAppToastStack() {
  const { notifications, dismiss } = useInAppNotifications();

  return (
    <div className="fixed top-16 right-3 z-[200] flex flex-col gap-2 w-[min(320px,90vw)]"
         aria-live="polite" aria-label="Notificaciones">
      {notifications.slice(0, 4).map((n) => (
        <InAppToast key={n.id} notif={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function InAppToast({ notif, onDismiss }: { notif: InAppNotif; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000); // auto-dismiss 6s
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="glass-card-strong flex items-start gap-3 p-3 rounded-2xl
                    border border-accent/20 shadow-xl shadow-black/30
                    animate-fade-in-up">
      <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-semibold text-sm truncate">{notif.title}</p>
        {notif.body && <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{notif.body}</p>}
      </div>
      <button onClick={onDismiss} className="text-text-muted hover:text-text-primary flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
