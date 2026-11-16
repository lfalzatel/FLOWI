'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Las estadísticas ahora están desplegadas dentro de "Resumen y estadísticas"
export default function EstadisticasRedirect() {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    router.replace(`/servicios/resumen?mes=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, [router]);
  return <div className="min-h-screen bg-deep" />;
}
