'use client';
import { useEffect } from 'react';
import { tr } from '@/lib/i18n';

// Si algo se rompe en la app, en vez de la pantalla negra de Next ("Application error…") se muestra
// qué falló (para poder mandar una captura) y un botón para volver a abrir FLOWI.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const detail = [error?.name, error?.message].filter(Boolean).join(': ')
    + '\n' + String(error?.stack || '').split('\n').slice(0, 6).join('\n')
    + `\n${typeof window !== 'undefined' ? window.location.pathname : ''} · ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`;

  useEffect(() => {
    try { localStorage.setItem('flowi_last_error', JSON.stringify({ at: Date.now(), detail })); } catch {}
  }, [detail]);

  return (
    <html lang="es">
      <body style={{ margin: 0, minHeight: '100vh', background: '#0F1729', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{tr('Algo falló en FLOWI')}</h1>
          <p style={{ fontSize: 14, opacity: 0.8, margin: '0 0 16px' }}>
            {tr('Tus datos están a salvo. Toma una captura de esta pantalla y envíasela al soporte para arreglarlo.')}
          </p>
          <pre style={{ textAlign: 'left', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, maxHeight: 260, overflow: 'auto', margin: '0 0 16px' }}>{detail}</pre>
          <button onClick={() => { window.location.href = '/'; }}
            style={{ background: '#22D3EE', color: '#0F1729', border: 0, borderRadius: 12, padding: '12px 20px', fontSize: 15, fontWeight: 700, width: '100%' }}>
            {tr('Volver a abrir FLOWI')}
          </button>
        </div>
      </body>
    </html>
  );
}
