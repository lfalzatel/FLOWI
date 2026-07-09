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

export function formatCurrency(amount: number, currencyCode: string = 'COP'): string {
  const currencyInfo = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0];
  
  return new Intl.NumberFormat(currencyInfo.locale, {
    style: 'currency',
    currency: currencyInfo.code,
    maximumFractionDigits: currencyInfo.code === 'COP' || currencyInfo.code === 'CLP' || currencyInfo.code === 'JPY' ? 0 : 2
  }).format(amount);
}
