import { currentLang } from '@/lib/i18n';
import { defaultCurrency } from '@/lib/format';

/**
 * Helper para detección inteligente de idioma de voz y moneda según
 * el idioma de la app, la región, zona horaria y configuración del navegador.
 */

export interface LocaleInfo {
  language: string;  // p.ej. 'es-CO', 'es-ES', 'en-US', 'pt-PT'
  currency: string;  // p.ej. 'COP', 'EUR', 'USD', 'MXN'
}

export function detectUserLocaleAndCurrency(profileCurrency?: string): LocaleInfo {
  const appLang = currentLang();
  let language = appLang === 'en' ? 'en-US' : appLang === 'pt' ? 'pt-PT' : appLang === 'es-ES' ? 'es-ES' : 'es-CO';
  let currency = profileCurrency || defaultCurrency(appLang);

  if (typeof window !== 'undefined') {
    const navLang = navigator.language || (navigator as any).userLanguage || 'es-CO';
    if (appLang === 'es') {
      if (navLang.startsWith('es-MX')) language = 'es-MX';
      else if (navLang.startsWith('es-')) language = navLang;
    }

    if (!profileCurrency && appLang !== 'es-ES' && appLang !== 'pt') {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        if (timeZone.startsWith('Europe/') || timeZone === 'Atlantic/Azores' || timeZone === 'Atlantic/Madeira' || timeZone === 'Atlantic/Canary') {
          currency = 'EUR';
        } else if (timeZone.includes('Bogota')) {
          currency = 'COP';
        } else if (timeZone.includes('Mexico')) {
          currency = 'MXN';
        } else if (timeZone.startsWith('America/New_York') || timeZone.startsWith('America/Chicago') || timeZone.startsWith('America/Los_Angeles')) {
          currency = 'USD';
        } else if (navLang.toLowerCase().startsWith('es-es') || navLang.toLowerCase().startsWith('pt')) {
          currency = 'EUR';
        }
      } catch (e) {
        console.warn('Error detectando zona horaria:', e);
      }
    }
  }

  return { language, currency };
}
