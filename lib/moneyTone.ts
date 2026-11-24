// Colores del dinero en toda la app (definidos en app/globals.css y tailwind.config.js):
//   pos  = plata que tienes o te entra (verde)    neg  = gastos y resultados negativos (rojo)
//   debt = deudas y compromisos (amarillo)          save = ahorros e inversiones (azul)
export type MoneyTone = 'pos' | 'neg' | 'debt' | 'save' | 'plain';

export const MONEY_TEXT: Record<MoneyTone, string> = {
  pos: 'text-money-pos', neg: 'text-money-neg', debt: 'text-money-debt', save: 'text-money-save', plain: 'text-text-primary',
};

/** Color de un saldo: negativo en rojo, cero normal y positivo en el tono que se pida (verde por defecto). */
export function toneOf(n: number, positive: MoneyTone = 'pos'): MoneyTone {
  if (n < -0.5) return 'neg';
  if (n > 0.5) return positive;
  return 'plain';
}
