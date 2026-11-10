// ¿FLOWI se abrió desde la app de Play Store (Trusted Web Activity)?
// Google no permite cobrar suscripciones digitales con pasarelas externas (Wompi) dentro de una
// app de Play Store, ni invitar a pagar por fuera. En esa versión se ocultan los pagos y las
// donaciones; quien ya tiene Premium lo sigue teniendo.
//
// La app de Android abre FLOWI con ?source=play (y el navegador la marca con un referrer
// android-app://). Se recuerda en este dispositivo para las siguientes páginas.
const KEY = 'flowi_play_store';
export const PLAY_PACKAGE = 'com.flowi.gastos';

export function detectPlayStoreApp() {
  if (typeof window === 'undefined') return;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('source') === 'play';
    const fromReferrer = document.referrer.startsWith(`android-app://${PLAY_PACKAGE}`);
    if (fromQuery || fromReferrer) localStorage.setItem(KEY, '1');
  } catch { /* sin almacenamiento */ }
}

export function isPlayStoreApp(): boolean {
  if (typeof window === 'undefined') return false;
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

// Se revisa apenas carga la app (antes de que alguna página limpie la dirección)
if (typeof window !== 'undefined') detectPlayStoreApp();
