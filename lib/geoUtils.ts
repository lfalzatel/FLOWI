/**
 * Helper para detección inteligente de idioma de voz y moneda según
 * la región, zona horaria y configuración del navegador del usuario.
 */

export interface LocaleInfo {
  language: string;  // p.ej. 'es-CO', 'es-ES', 'en-US'
  currency: string;  // p.ej. 'COP', 'EUR', 'USD', 'MXN'
}

export function detectUserLocaleAndCurrency(profileCurrency?: string): LocaleInfo {
  let language = 'es-CO';
  let currency = profileCurrency || 'COP';

  if (typeof window !== 'undefined') {
    // 1. Detectar idioma del navegador/dispositivo
    const navLang = navigator.language || (navigator as any).userLanguage || 'es-CO';
    if (navLang.startsWith('es-ES') || navLang.startsWith('es-EU')) {
      language = 'es-ES';
    } else if (navLang.startsWith('es-MX')) {
      language = 'es-MX';
    } else if (navLang.startsWith('en')) {
      language = 'en-US';
    } else {
      language = navLang;
    }

    // 2. Si el perfil no especifica moneda, inferirla por la zona horaria o locale
    if (!profileCurrency) {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (timeZone.startsWith('Europe/')) {
          currency = 'EUR';
        } else if (timeZone.includes('Bogota')) {
          currency = 'COP';
        } else if (timeZone.includes('Mexico')) {
          currency = 'MXN';
        } else if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Chicago') || timeZone.startsWith('America/Los_Angeles')) {
          currency = 'USD';
        } else if (navLang.includes('ES')) {
          currency = 'EUR';
        }
      } catch (e) {
        console.warn('Error detectando zona horaria:', e);
      }
    }
  }

  return { language, currency };
}
