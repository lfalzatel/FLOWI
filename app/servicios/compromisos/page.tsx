'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// "Próximos compromisos" ahora es la pestaña "Pagos del mes" de Recordatorios
export default function CompromisosRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/servicios/recordatorios?tab=pagos'); }, [router]);
  return <div className="min-h-screen bg-deep" />;
}
