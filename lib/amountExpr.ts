// Monto con operaciones: "25000+18500", "90000÷3", "12000×2-500". Sin eval: se lee número por número.
// El texto guardado usa "." como decimal y los signos + − × ÷ (también acepta - * / x).

const OPS = /[+\-×÷*/x]/;

/** Normaliza lo que se escribe: solo dígitos, punto decimal y operaciones; sin dos signos seguidos. */
export function cleanExpr(raw: string): string {
  let s = raw.replace(/,/g, '.').replace(/[*xX]/g, '×').replace(/\//g, '÷').replace(/−/g, '-').replace(/[^0-9.+\-×÷]/g, '');
  s = s.replace(/([+\-×÷])[+\-×÷]+/g, (_, last) => last);          // "+-" → el último no; se deja el primero
  s = s.replace(/^[+×÷]+/, '');                                      // no empezar con signo (salvo -)
  // Un solo punto por número
  return s.split(/([+\-×÷])/).map(part => {
    if (/^[+\-×÷]$/.test(part)) return part;
    const [raw0, ...rest] = part.split('.');
    const a = raw0.replace(/^0+(?=\d)/, ''); // sin ceros a la izquierda: "02000" → "2000"
    return rest.length ? `${a}.${rest.join('')}` : a;
  }).join('');
}

export const hasOperator = (expr: string) => OPS.test(expr.replace(/^-/, ''));

/** Resultado de la expresión, o null si está incompleta o no tiene sentido (p. ej. dividir por cero). */
export function evalAmount(expr: string): number | null {
  const s = cleanExpr(expr).replace(/[+\-×÷]$/, ''); // un signo al final se ignora mientras se escribe
  if (!s) return null;
  const tokens = s.match(/\d*\.?\d+|\d+\.|[+\-×÷]/g);
  if (!tokens) return null;
  // Primero × y ÷, luego + y −
  const nums: number[] = [];
  const ops: string[] = [];
  let sign = 1;
  let expectNum = true;
  for (const t of tokens) {
    if (expectNum) {
      if (t === '-') { sign = -sign; continue; }
      const n = Number(t);
      if (!Number.isFinite(n)) return null;
      const v = sign * n;
      sign = 1;
      const op = ops[ops.length - 1];
      if (op === '×' || op === '÷') {
        ops.pop();
        const prev = nums.pop()!;
        if (op === '÷' && v === 0) return null;
        nums.push(op === '×' ? prev * v : prev / v);
      } else {
        nums.push(v);
      }
      expectNum = false;
    } else {
      ops.push(t);
      expectNum = true;
    }
  }
  if (!nums.length) return null;
  let total = nums[0];
  let k = 1;
  for (const op of ops) {
    if (op === '+') total += nums[k++];
    else if (op === '-') total -= nums[k++];
  }
  if (!Number.isFinite(total)) return null;
  return Math.round(total * 100) / 100;
}

/** Para mostrar: números con puntos de miles (es-CO) y espacios alrededor de los signos. */
export function displayExpr(expr: string): string {
  return cleanExpr(expr).split(/([+\-×÷])/).map(part => {
    if (/^[+\-×÷]$/.test(part)) return ` ${part === '-' ? '−' : part} `;
    if (!part) return '';
    const [int, dec] = part.split('.');
    const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dec !== undefined ? `${withDots},${dec}` : withDots;
  }).join('').trim();
}
