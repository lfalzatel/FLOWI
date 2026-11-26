'use client';
import { useState } from 'react';
import { tr } from '@/lib/i18n';
import { useTheme } from '@/components/ThemeProvider';
import { useTourAction } from '@/components/tour/useTourEdit';
import { ChatOptionsSheet } from '@/components/chat/ChatExtras';

// Para los tutoriales (Inicio, Amigos y Chat): abre una ventana "Opciones del chat" de ejemplo, igual a la
// real, para señalar paso a paso el candado, los mensajes temporales, bloquear y denunciar. No guarda nada.
export function ChatTourDemo() {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const [show, setShow] = useState<'options' | 'report' | null>(null);
  useTourAction('chat-options', () => { setShow('options'); return true; }, () => setShow(null));
  useTourAction('chat-report', () => { setShow('report'); return true; }, () => setShow(null));
  if (!show) return null;
  return (
    <ChatOptionsSheet key={show} demo demoReport={show === 'report'} uid="" peerName={tr('Ana')} locked={false} ttl={0} blocked={false} isTech={isTech}
      onLock={async () => {}} onTtl={async () => {}} onBlock={async () => {}} onReport={async () => {}} onClose={() => {}} />
  );
}
