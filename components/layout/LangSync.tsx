'use client';
import { useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/lib/firestore';

// Guarda en el perfil el idioma con que la persona usa FLOWI, para que las notificaciones que manda el
// servidor (recordatorios, amigos, gastos compartidos) le lleguen en ese idioma.
export function LangSync() {
  const { lang } = useT();
  const { user, profile } = useAuth();
  const saved = (profile as any)?.lang;
  useEffect(() => {
    if (!user || user.isAnonymous || !profile || saved === lang) return;
    updateUserProfile(user.uid, { lang }).catch(() => { /* se intenta de nuevo la próxima vez */ });
  }, [user, profile, saved, lang]);
  return null;
}
