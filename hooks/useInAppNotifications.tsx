'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface InAppNotif {
  id: string;
  title: string;
  body?: string;
  reminderId?: string;
  ts: number;
}

interface InAppContextType {
  notifications: InAppNotif[];
  push: (n: Omit<InAppNotif, 'id' | 'ts'>) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const InAppContext = createContext<InAppContextType>({
  notifications: [],
  push: () => {},
  dismiss: () => {},
  clearAll: () => {},
});

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotif[]>([]);

  const push = useCallback((n: Omit<InAppNotif, 'id' | 'ts'>) => {
    // Generar un ID único simple
    const notifId = Math.random().toString(36).substring(2, 9);
    const notif: InAppNotif = { ...n, id: notifId, ts: Date.now() };
    setNotifications(prev => [notif, ...prev].slice(0, 20)); // máximo 20
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  return (
    <InAppContext.Provider value={{ notifications, push, dismiss, clearAll }}>
      {children}
    </InAppContext.Provider>
  );
}

export function useInAppNotifications() {
  return useContext(InAppContext);
}
