import { Transaction } from './firestore';
import { Commitment } from './commitments';
import { DailyBudget } from './dailyBudget';
import { getLocalDateString, getLocalMonthString } from './dateUtils';

// "Tu siguiente acción": de todo lo que la app sabe, la cosa más útil que conviene hacer ahora.
// Se muestra una sola; las que la persona salta hoy no vuelven hasta mañana.

export type NextAction =
  | { id: string; kind: 'pay'; title: string; detail: string; commitment: Commitment; tone: 'alert' | 'normal' }
  | { id: string; kind: 'income'; title: string; detail: string; prefill: { amount: number; category: string; description: string }; tone: 'normal' }
  | { id: string; kind: 'today'; title: string; detail: string; tone: 'alert' }
  | { id: string; kind: 'add'; title: string; detail: string; tone: 'normal' }
  | { id: string; kind: 'notify'; title: string; detail: string; tone: 'normal' }
  | { id: string; kind: 'link'; title: string; detail: string; href: string; tone: 'normal' | 'alert' }
  | { id: string; kind: 'reconcile'; title: string; detail: string; tone: 'normal'; accountId: string; balance: number }
  | { id: string; kind: 'support'; title: string; detail: string; tone: 'normal' };

// Ideas para descubrir funciones que la persona aún no usa (se ocultan para siempre al tocarlas)
export const TIP_IDS = ['tip:cuentas', 'tip:inversiones', 'tip:recibo', 'tip:extracto', 'tip:recordatorios', 'tip:hormiga'] as const;

interface Input {
  transactions: Transaction[];
  pending: Commitment[];
  today: DailyBudget | null;
  hasGoals: boolean;
  notificationsOff?: boolean; // los avisos de pagos no están activos en este celular
  maturing?: { id: string; bank: string; amount: number; daysLeft: number }[]; // CDT que vencen pronto
  // Cuentas cuyo saldo no se revisa hace 15 días o más (se pregunta si cuadra con el banco)
  toReconcile?: { id: string; name: string; balance: number }[];
  staleFunds?: { id: string; name: string; days: number }[]; // fondos, acciones o pensión con valor viejo
  summary?: { month: string; name: string; hint?: string } | null; // resumen del mes pasado listo (días 1 a 10)
  discover?: { hasAccounts: boolean; hasInvestments: boolean; reminders: number; seenTips: string[] };
  showSupport?: boolean;
  premiumEnd?: { until: Date; gift: boolean } | null; // fin del Premium (aviso para renovar)
  formatMoney: (n: number) => string;
  skipped?: string[];
  now?: Date;
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

export function getNextActions({ transactions, pending, today, hasGoals, notificationsOff = false, maturing = [], toReconcile = [], staleFunds = [], summary = null, discover, showSupport = false, premiumEnd = null, formatMoney, skipped = [], now = new Date() }: Input): NextAction[] {
  const out: NextAction[] = [];

  // Premium por vencer (5 días antes) o recién vencido (hasta 7 días después)
  if (premiumEnd) {
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const left = Math.round((day(premiumEnd.until) - day(now)) / 86400000);
    if (left <= 5 && left >= -7) {
      const what = premiumEnd.gift ? 'Tu mes de Premium de regalo' : 'Tu FLOWI Premium';
      const dateText = premiumEnd.until.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });
      out.push({
        id: `premium:${getLocalDateString(premiumEnd.until)}`, kind: 'link', href: '/planes', tone: left <= 1 ? 'alert' : 'normal',
        title: left > 1 ? `${what} vence en ${left} días` : left === 1 ? `${what} vence mañana` : left === 0 ? `${what} vence hoy` : `${what} terminó`,
        detail: left >= 0
          ? `Renuévalo antes del ${dateText} para seguir sin límites. Si renuevas antes, los días se suman. Toca para ver los planes.`
          : 'Volviste al plan gratis: tus datos siguen ahí, solo no puedes agregar más de lo que permite. Toca para renovar.',
      });
    }
  }
  const month = getLocalMonthString(now);
  const lastMonth = getLocalMonthString(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const todayKey = getLocalDateString(now);
  const monthName = now.toLocaleDateString('es-CO', { month: 'long' });

  // 1. Pagos vencidos o que vencen hoy/mañana (con fecha de recordatorio)
  for (const c of pending) {
    if (!c.exactDate || c.daysLeft > 1) continue;
    const when = c.daysLeft < 0 ? `venció hace ${-c.daysLeft} ${c.daysLeft === -1 ? 'día' : 'días'}` : c.daysLeft === 0 ? 'vence hoy' : 'vence mañana';
    out.push({
      id: `pay:${c.key}`, kind: 'pay', commitment: c, tone: c.daysLeft < 0 ? 'alert' : 'normal',
      title: `Paga ${c.title}`,
      detail: `${when[0].toUpperCase()}${when.slice(1)}${c.amount ? (c.debt ? ` · cuota de ${formatMoney(c.amount)}` : ` · el mes pasado fueron ${formatMoney(c.amount)}`) : ''}. Toca para registrarlo.`,
    });
  }

  // 1b. Un CDT vence en los próximos 3 días (o ya venció y no se ha marcado)
  for (const m of maturing) {
    if (m.daysLeft > 3) continue;
    const when = m.daysLeft < 0 ? 'ya venció' : m.daysLeft === 0 ? 'vence hoy' : m.daysLeft === 1 ? 'vence mañana' : `vence en ${m.daysLeft} días`;
    out.push({
      id: `cdt:${m.id}`, kind: 'link', href: '/servicios/inversiones', tone: 'normal',
      title: `Tu CDT de ${m.bank} ${when}`,
      detail: m.daysLeft > 0
        ? `${formatMoney(m.amount)}. Antes de que se renueve, compara la tasa con otros bancos.`
        : `${formatMoney(m.amount)}. Cuéntame si lo renovaste o te lo pagaron.`,
    });
  }

  // 2. El ingreso de siempre aún no aparece este mes
  const incomesThisMonth = transactions.filter(t => t.type === 'ingreso' && getLocalMonthString(toDate(t.date)) === month);
  const lastIncomes = transactions.filter(t => t.type === 'ingreso' && getLocalMonthString(toDate(t.date)) === lastMonth);
  if (!incomesThisMonth.length && lastIncomes.length) {
    const main = lastIncomes.reduce((a, b) => (b.amount > a.amount ? b : a));
    const usualDay = toDate(main.date).getDate();
    if (now.getDate() >= usualDay) {
      out.push({
        id: 'income', kind: 'income', tone: 'normal',
        title: `Registra tu ingreso de ${monthName}`,
        detail: `Sin ingresos no puedo calcular cuánto puedes gastar. El mes pasado recibiste ${formatMoney(main.amount)} por ${main.description || main.category}.`,
        prefill: { amount: main.amount, category: main.category, description: main.description || '' },
      });
    }
  }

  // 2b. Tiene pagos por delante pero los avisos están apagados
  if (notificationsOff && pending.length) {
    const next = pending.find(c => c.daysLeft >= 0) || pending[0];
    out.push({
      id: 'notify', kind: 'notify', tone: 'normal',
      title: 'Activa los avisos de tus pagos',
      detail: `Te avisamos de ${next.title} y tus otros pagos antes de que venzan, aunque FLOWI esté cerrada.`,
    });
  }

  // 2c. ¿El saldo de una cuenta cuadra con el banco? (una a la vez)
  const acc = toReconcile[0];
  if (acc) {
    out.push({
      id: `reconcile:${acc.id}`, kind: 'reconcile', tone: 'normal', accountId: acc.id, balance: acc.balance,
      title: `¿Tu ${acc.name} dice ${formatMoney(acc.balance)}?`,
      detail: 'Revisa la app del banco: si cuadra, lo confirmo; si no, lo ajustamos en un toque.',
    });
  }

  // 2d. Fondos y acciones no crecen con una tasa: hay que anotar su valor de vez en cuando
  const fund = staleFunds[0];
  if (fund) {
    out.push({
      id: `fund:${fund.id}:${Math.floor(fund.days / 30)}`, kind: 'link', href: '/servicios/inversiones', tone: 'normal',
      title: `¿Cuánto vale hoy ${fund.name}?`,
      detail: `Hace ${fund.days} días no lo actualizas. Mira la app y anótalo para ver tu ganancia real.`,
    });
  }

  // 3. Hoy ya se pasó de la cuota
  if (today && today.hasBase && today.remainingToday < 0 && today.tomorrowAllowance !== null) {
    out.push({
      id: 'today-over', kind: 'today', tone: 'alert',
      title: `Desde mañana, máximo ${formatMoney(today.tomorrowAllowance)} al día`,
      detail: `Hoy te pasaste ${formatMoney(-today.remainingToday)} de tu cuota. Toca para ver el cálculo.`,
    });
  }

  // 4. Sin metas: empezar por el fondo de emergencia
  if (!hasGoals) {
    out.push({
      id: 'goal-emergency', kind: 'link', href: '/servicios/metas', tone: 'normal',
      title: 'Crea tu fondo de emergencia',
      detail: 'Es la primera meta que conviene tener: unos 3 meses de tus gastos fijos para cualquier imprevisto.',
    });
  }

  // 5. Fin de mes con plata libre: apartarla antes de que se vaya
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (hasGoals && today && today.hasBase && daysInMonth - now.getDate() < 5) {
    const freeNow = today.freeAtStartOfDay - today.spentToday;
    if (freeNow > 0) {
      out.push({
        id: 'goal-surplus', kind: 'link', href: '/servicios/metas', tone: 'normal',
        title: `Aparta lo que te sobra de ${monthName}`,
        detail: `Te quedan ${formatMoney(freeNow)} libres y el mes casi termina. Guárdalos en tu meta antes de que se vayan.`,
      });
    }
  }

  // 6. De noche y sin nada registrado hoy
  const anyToday = transactions.some(t => getLocalDateString(toDate(t.date)) === todayKey);
  if (!anyToday && now.getHours() >= 19) {
    out.push({
      id: 'add-today', kind: 'add', tone: 'normal',
      title: '¿Gastaste algo hoy?',
      detail: 'Anótalo ahora que lo recuerdas; con la voz te toma 5 segundos.',
    });
  }

  // 7. Resumen del mes pasado (del 1 al 10)
  if (summary) {
    out.push({
      id: `review:${summary.month}`, kind: 'link', href: `/servicios/resumen?mes=${summary.month}`, tone: 'normal',
      title: `Revisa tu resumen de ${summary.name}`,
      detail: summary.hint || `Mira en qué se fue tu plata en ${summary.name} y cómo vas frente al mes anterior.`,
    });
  }

  // 8. Descubrir FLOWI: funciones que aún no usa
  if (discover) {
    const tips: NextAction[] = [];
    if (!discover.hasAccounts) tips.push({ id: 'tip:cuentas', kind: 'link', href: '/servicios/cuentas', tone: 'normal', title: 'Agrega tus cuentas y mira tu patrimonio', detail: 'Bancolombia, Nequi, efectivo… y tu "Dinero disponible" será la plata real que tienes.' });
    if (!discover.hasInvestments) tips.push({ id: 'tip:inversiones', kind: 'link', href: '/servicios/inversiones', tone: 'normal', title: '¿Ahorras en Nu o tienes un CDT?', detail: 'Regístralo y te digo cuánto vas ganando con su tasa.' });
    tips.push({ id: 'tip:recibo', kind: 'link', href: '/?accion=foto', tone: 'normal', title: 'Registra un gasto con la foto del recibo', detail: 'Toca el botón + y elige "Foto del recibo": la IA lee el total por ti.' });
    tips.push({ id: 'tip:extracto', kind: 'link', href: '/servicios/importar', tone: 'normal', title: 'Importa el extracto de tu banco', detail: 'Sube el Excel y registro todos los movimientos de una vez.' });
    tips.push({ id: 'tip:hormiga', kind: 'link', href: '/servicios/hormiga', tone: 'normal', title: '¿Cuánto se te va en gastos hormiga?', detail: 'Mira tus suscripciones y las compras pequeñas que se repiten, y cuánto suman al año.' });
    if (discover.reminders < 3) tips.push({ id: 'tip:recordatorios', kind: 'link', href: '/servicios/recordatorios', tone: 'normal', title: 'Crea recordatorios para tus pagos fijos', detail: 'Te aviso antes de que venzan y los reservo en lo que puedes gastar.' });
    out.push(...tips.filter(t => !discover.seenTips.includes(t.id)));
  }

  // 9. Apoyar el proyecto (siempre de último)
  if (showSupport) {
    out.push({ id: 'support', kind: 'support', tone: 'normal', title: '¿Te sirve FLOWI? Apoya el proyecto', detail: 'Es gratis y sin publicidad. Toca para ver cómo ayudar a que siga creciendo.' });
  }

  // Orden: lo urgente primero; luego ideas para descubrir y al final el apoyo. Máximo 6 tarjetas.
  const rank = (a: NextAction) => {
    const id = a.id;
    if (id.startsWith('pay:')) return a.tone === 'alert' ? 0 : 1;
    if (id.startsWith('cdt:')) return 2;
    if (id.startsWith('premium:')) return a.tone === 'alert' ? 0 : 2;
    if (id === 'income') return 3;
    if (id === 'today-over') return 4;
    if (id.startsWith('review:')) return 5;
    if (id.startsWith('reconcile:')) return 6;
    if (id.startsWith('fund:')) return 7;
    if (id === 'notify') return 7;
    if (id.startsWith('goal-')) return 8;
    if (id === 'add-today') return 9;
    if (id.startsWith('tip:')) return 10;
    return 11; // apoyo
  };
  const visible = out.filter(a => !skipped.includes(a.id)).sort((a, b) => rank(a) - rank(b));
  const main = visible.filter(a => !a.id.startsWith('tip:') && a.id !== 'support').slice(0, 5);
  const tips = visible.filter(a => a.id.startsWith('tip:')).slice(0, Math.max(0, 5 - main.length));
  const support = visible.filter(a => a.id === 'support');
  return [...main, ...tips, ...support];
}
