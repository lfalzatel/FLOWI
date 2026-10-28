// Formatos de dinero para gráficas: corto en los ejes ("$1,5M", "$500 mil") y completo en los detalles

export function formatCompactCOP(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${(m >= 10 ? Math.round(m).toString() : m.toFixed(1).replace(/\.0$/, '')).replace('.', ',')}M`;
  }
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)} mil`;
  return `${sign}$${Math.round(abs)}`;
}

export function formatFullCOP(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

// Redondea hacia arriba a un número "bonito" (1, 2, 2.5 o 5 × 10^k) para topes de eje
export function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find(s => s * exp >= value) ?? 10;
  return step * exp;
}
