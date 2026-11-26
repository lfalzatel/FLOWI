import { currentLang } from '@/lib/i18n';

export const CURRENCIES = [
  { code: 'COP', name: 'Peso Colombiano', locale: 'es-CO' },
  { code: 'USD', name: 'Dólar Estadounidense', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', locale: 'de-DE' },
  { code: 'MXN', name: 'Peso Mexicano', locale: 'es-MX' },
  { code: 'BRL', name: 'Real Brasileño', locale: 'pt-BR' },
  { code: 'ARS', name: 'Peso Argentino', locale: 'es-AR' },
  { code: 'CLP', name: 'Peso Chileno', locale: 'es-CL' },
  { code: 'PEN', name: 'Sol Peruano', locale: 'es-PE' },
  { code: 'GBP', name: 'Libra Esterlina', locale: 'en-GB' },
  { code: 'JPY', name: 'Yen Japonés', locale: 'ja-JP' },
  { code: 'CAD', name: 'Dólar Canadiense', locale: 'en-CA' },
  { code: 'AUD', name: 'Dólar Australiano', locale: 'en-AU' },
];

// Monedas que en la práctica no usan centavos (en Colombia nadie escribe 0,25 pesos)
const NO_CENTS = new Set(['COP', 'CLP', 'JPY', 'PYG', 'KRW', 'VND']);

/** ¿Esta moneda usa centavos? (euro y dólar sí: "gasté 0,25 €") */
export function hasCents(currencyCode: string = 'COP'): boolean {
  return !NO_CENTS.has(currencyCode);
}

/** Redondea a lo que maneja la moneda: pesos enteros, o centavos. */
export function roundMoney(amount: number, currencyCode: string = 'COP'): number {
  return hasCents(currencyCode) ? Math.round(amount * 100) / 100 : Math.round(amount);
}

export function formatCurrency(amount: number, currencyCode: string = 'COP'): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];

  // Con la app en inglés los miles van con coma (2,600,000), aunque la moneda sea pesos
  const locale = currentLang() === 'en' ? 'en-US' : currencyInfo.locale;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyInfo.code,
    maximumFractionDigits: hasCents(currencyInfo.code) ? 2 : 0,
  }).format(amount);
}
