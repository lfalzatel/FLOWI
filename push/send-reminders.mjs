// Envía los recordatorios de FLOWI como notificaciones push cuando la app está cerrada.
// Lo corre GitHub Actions cada 30 minutos (.github/workflows/push-reminders.yml), gratis:
// Firebase Cloud Messaging no cobra y las lecturas quedan muy por debajo del plan gratuito.
//
//  - Recordatorios con hora (diarios, semanales, de una vez) y sus alertas previas: se avisan
//    en la ventana de 30 minutos en que caen.
//  - Pagos y fechas (mensuales y anuales): un solo resumen a las 7:00 a. m. con lo que vence
//    hoy y mañana, sin lo ya pagado (marcado con "Ya lo pagué" o con un gasto registrado).
//  - CDT (fl_investments): en el mismo resumen, 3 días antes, el día anterior y el día que vencen.
//
// Necesita el secreto FIREBASE_SERVICE_ACCOUNT_FLOWI (llave de cuenta de servicio de flowi-9af82).

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const OFFSET_HOURS = -5;          // Colombia (sin horario de verano)
const SUMMARY_HOUR = 7;           // resumen diario de pagos y fechas
const MAX_WINDOW_MS = 3 * 3600e3; // si la tarea se atrasó mucho, no se reenvía todo lo viejo
const DEFAULT_WINDOW_MS = 30 * 60e3;
const DAY = 86400e3;
// Para probar sin enviar ni guardar nada: DRY_RUN=1 (y NOW=2026-11-07T12:05:00Z para simular la hora)
const DRY_RUN = process.env.DRY_RUN === '1';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  // Sin la llave todavía configurada no se hace nada (y la tarea no falla cada 30 minutos)
  console.log('Falta el secreto FIREBASE_SERVICE_ACCOUNT_FLOWI; no se envía nada.');
  process.exit(0);
}

initializeApp({ credential: cert(JSON.parse(raw)) });
const db = getFirestore();
const messaging = getMessaging();

// ── Fechas en hora de Colombia ─────────────────────────────────────────
// "local" = un Date cuyas partes UTC son la hora de Colombia
const toLocal = (d) => new Date(d.getTime() + OFFSET_HOURS * 3600e3);
const fromLocalParts = (y, m, d, h = 0, min = 0) => new Date(Date.UTC(y, m, d, h, min) - OFFSET_HOURS * 3600e3);
const dayInMonth = (y, m, d) => Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate());
const dateKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const parseTime = (t) => { const [h, m] = String(t || '08:00').split(':').map(Number); return [h || 0, m || 0]; };
const normalize = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const words = (s) => normalize(s).split(/[^a-z0-9]+/).filter(w => w.length >= 4);
const toDate = (v) => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : v ? new Date(v) : null);

function alertOffsetMs(a) {
  const unit = a.unit === 'minutes' ? 60e3 : a.unit === 'hours' ? 3600e3 : DAY;
  return (Number(a.value) || 0) * unit;
}

// ── Recordatorios con hora: momentos de aviso dentro de la ventana ──────
function timedOccurrences(r, from, to) {
  const [h, min] = parseTime(r.time);
  const offsets = [0, ...(r.alerts || []).map(alertOffsetMs)];
  const maxOffset = Math.max(...offsets);
  const hits = [];
  // Revisa los días que pueden caer en la ventana, contando las alertas previas
  const startLocal = toLocal(new Date(from.getTime()));
  const endLocal = toLocal(new Date(to.getTime() + maxOffset));
  for (let t = Date.UTC(startLocal.getUTCFullYear(), startLocal.getUTCMonth(), startLocal.getUTCDate()); t <= endLocal.getTime(); t += DAY) {
    const day = new Date(t);
    const y = day.getUTCFullYear(), m = day.getUTCMonth(), d = day.getUTCDate();
    let matches = false;
    if (r.type === 'daily') matches = true;
    else if (r.type === 'weekly') matches = day.getUTCDay() === r.dayOfWeek;
    else if (r.type === 'once' && r.date) matches = r.date === dateKey(y, m, d);
    if (!matches) continue;
    const event = fromLocalParts(y, m, d, h, min);
    for (const off of offsets) {
      const at = new Date(event.getTime() - off);
      if (at > from && at <= to) hits.push({ event, isAlert: off > 0 });
    }
  }
  return hits;
}

// ── Pagos y fechas para el resumen de la mañana ───────────────────────
function upcomingDates(r, todayLocal) {
  const y = todayLocal.getUTCFullYear(), m = todayLocal.getUTCMonth();
  const occ = [];
  if (r.type === 'monthly' && r.dayOfMonth) {
    const every = r.everyMonths > 1 ? r.everyMonths : 1;
    for (const o of [0, 1]) {
      const mm = m + o;
      const yy = y + Math.floor(mm / 12), m2 = ((mm % 12) + 12) % 12;
      if (every > 1 && r.startMonth) {
        const [sy, sm] = r.startMonth.split('-').map(Number);
        const diff = (yy * 12 + m2) - (sy * 12 + sm - 1);
        if (((diff % every) + every) % every !== 0) continue;
      }
      occ.push([yy, m2, dayInMonth(yy, m2, r.dayOfMonth)]);
    }
  } else if (r.type === 'yearly' && r.date) {
    const [, rm, rd] = r.date.split('-').map(Number);
    for (const yy of [y, y + 1]) occ.push([yy, rm - 1, dayInMonth(yy, rm - 1, rd)]);
  }
  return occ;
}

function isCoveredByExpense(r, occDate, expenses, shared) {
  if (!r.category) return false;
  const cat = normalize(r.category);
  const titleWords = words(r.title).filter(w => !words(r.category).includes(w));
  const before = r.type === 'yearly' ? 45 : 20;
  const from = occDate.getTime() - before * DAY, to = occDate.getTime() + DAY;
  return expenses.some(t => {
    if (t.type !== 'gasto' || normalize(t.category) !== cat) return false;
    const when = toDate(t.date)?.getTime() ?? 0;
    if (when < from || when > to) return false;
    if (!shared || !titleWords.length) return true;
    const desc = words(`${t.description || ''} ${t.merchant || ''}`);
    return titleWords.some(w => desc.includes(w));
  });
}

async function morningSummary(uid, reminders, investments, todayLocal) {
  const today = Date.UTC(todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate());
  const candidates = reminders.filter(r => r.pushEnabled !== false && (r.type === 'monthly' || r.type === 'yearly'));
  if (!candidates.length && !investments.length) return null;

  let expenses = null;
  const items = [];
  for (const inv of investments) {
    const [y, m, d] = String(inv.maturityDate || '').split('-').map(Number);
    if (!y) continue;
    const daysLeft = Math.round((Date.UTC(y, m - 1, d) - today) / DAY);
    if (daysLeft === 0 || daysLeft === 1 || daysLeft === 3) items.push({ title: `CDT ${inv.bank}`, daysLeft, isCdt: true });
  }
  for (const r of candidates) {
    const isPayment = r.type === 'monthly' || !!r.category;
    const alertDays = (r.alerts || []).filter(a => a.unit === 'days').map(a => Number(a.value) || 0);
    for (const [y, m, d] of upcomingDates(r, todayLocal)) {
      const daysLeft = Math.round((Date.UTC(y, m, d) - today) / DAY);
      const announce = daysLeft === 0 || daysLeft === 1 || alertDays.includes(daysLeft);
      if (!announce) continue;
      if (isPayment) {
        if ((r.paidDates || []).includes(dateKey(y, m, d))) continue;
        if (r.category) {
          if (!expenses) {
            const snap = await db.collection('fl_expenses').where('userId', '==', uid).get();
            expenses = snap.docs.map(x => x.data());
          }
          const shared = reminders.some(o => o !== r && o.category && normalize(o.category) === normalize(r.category));
          if (isCoveredByExpense(r, fromLocalParts(y, m, d), expenses, shared)) continue;
        }
      }
      items.push({ title: r.amount ? `${r.title} $${Number(r.amount).toLocaleString('es-CO')}` : r.title, daysLeft, isPayment });
      break;
    }
  }
  if (!items.length) return null;
  items.sort((a, b) => a.daysLeft - b.daysLeft);
  const when = (n) => (n === 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
  const when2 = (i) => (i.isCdt ? `vence ${when(i.daysLeft)}` : when(i.daysLeft));
  const body = items.map(i => `${i.isCdt ? '🏦' : i.isPayment ? '💳' : '🎉'} ${i.title} (${when2(i)})`).join(' · ');
  const payments = items.filter(i => i.isPayment).length;
  const onlyCdt = items.every(i => i.isCdt);
  return {
    title: payments ? (payments === 1 ? 'Tienes 1 pago por hacer' : `Tienes ${payments} pagos por hacer`) : onlyCdt ? 'Tu CDT está por vencer' : 'Fechas importantes',
    body,
    url: onlyCdt ? '/servicios/inversiones' : '/servicios/recordatorios',
    tag: `summary-${dateKey(todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate())}`,
  };
}

async function send(uid, tokens, msg) {
  if (DRY_RUN) {
    console.log(`  [prueba] ${uid.slice(0, 6)}… → ${msg.title}: ${msg.body}`);
    return 0;
  }
  const res = await messaging.sendEachForMulticast({
    tokens,
    data: { title: msg.title, body: msg.body, url: msg.url, tag: msg.tag },
    webpush: { headers: { Urgency: 'high', TTL: '3600' } },
  });
  // Quita los celulares que ya no aceptan avisos (app desinstalada, permiso retirado)
  const dead = tokens.filter((_, i) => {
    const code = res.responses[i].error?.code || '';
    return code.includes('registration-token-not-registered') || code.includes('invalid-registration-token') || code.includes('invalid-argument');
  });
  if (dead.length) {
    const { FieldValue } = await import('firebase-admin/firestore');
    await db.collection('users').doc(uid).update({ pushTokens: FieldValue.arrayRemove(...dead) });
  }
  return res.successCount;
}

async function main() {
  const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
  const stateRef = db.collection('push_state').doc('cron');
  const state = (await stateRef.get()).data();
  const last = toDate(state?.lastRun);
  const from = new Date(Math.max(now.getTime() - MAX_WINDOW_MS, last ? last.getTime() : now.getTime() - DEFAULT_WINDOW_MS));
  const todayLocal = toLocal(now);
  const summaryAt = fromLocalParts(todayLocal.getUTCFullYear(), todayLocal.getUTCMonth(), todayLocal.getUTCDate(), SUMMARY_HOUR);
  const summaryNow = summaryAt > from && summaryAt <= now;

  let sent = 0;
  const users = await db.collection('users').get();
  for (const u of users.docs) {
    const tokens = (u.get('pushTokens') || []).filter(Boolean);
    if (!tokens.length && !DRY_RUN) continue;
    const remSnap = await db.collection('fl_reminders').where('userId', '==', u.id).get();
    const reminders = remSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.active);

    for (const r of reminders) {
      if (r.pushEnabled === false || !['daily', 'weekly', 'once'].includes(r.type)) continue;
      for (const hit of timedOccurrences(r, from, now)) {
        sent += await send(u.id, tokens, {
          title: hit.isAlert ? `Pronto: ${r.title}` : r.title,
          body: r.description || 'Recordatorio de Flowi',
          url: '/servicios/recordatorios',
          tag: `reminder-${r.id}`,
        });
      }
    }

    if (summaryNow) {
      const invSnap = await db.collection('fl_investments').where('userId', '==', u.id).get();
      const investments = invSnap.docs.map(d => d.data()).filter(i => i.status === 'activo');
      const summary = await morningSummary(u.id, reminders, investments, todayLocal);
      if (summary) sent += await send(u.id, tokens, summary);
    }
  }

  if (!DRY_RUN) await stateRef.set({ lastRun: Timestamp.fromDate(now) });
  console.log(`Ventana ${from.toISOString()} → ${now.toISOString()}${summaryNow ? ' (con resumen de la mañana)' : ''}: ${sent} avisos enviados.`);
}

main().catch(err => {
  console.error('Error enviando recordatorios:', err.message);
  process.exit(1);
});
