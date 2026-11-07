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
  | { id: string; kind: 'link'; title: string; detail: string; href: string; tone: 'normal' };

interface Input {
  transactions: Transaction[];
  pending: Commitment[];
  today: DailyBudget | null;
  hasGoals: boolean;
  notificationsOff?: boolean; // los avisos de pagos no están activos en este celular
  maturing?: { id: string; bank: string; amount: number; daysLeft: number }[]; // CDT que vencen pronto
  formatMoney: (n: number) => string;
  skipped?: string[];
  now?: Date;
}

function toDate(v: any): Date {
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  return new Date(v);
}

export function getNextActions({ transactions, pending, today, hasGoals, notificationsOff = false, maturing = [], formatMoney, skipped = [], now = new Date() }: Input): NextAction[] {
  const out: NextAction[] = [];
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
      detail: `${when[0].toUpperCase()}${when.slice(1)}${c.amount ? ` · el mes pasado fueron ${formatMoney(c.amount)}` : ''}. Toca para registrarlo.`,
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

  return out.filter(a => !skipped.includes(a.id));
}
