// Servidor de pagos de FLOWI (Firebase Functions, Node 22).
//  - wompiFirma: la app pide pagar un plan; aquí se arma la referencia y la firma de integridad
//    (el secreto nunca sale del servidor) y se anota el pago como pendiente.
//  - wompiEventos: Wompi avisa el resultado del pago. Se verifica la firma del aviso con el
//    secreto de eventos y, si el pago quedó APROBADO por el valor exacto, se activa Premium.
const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const WOMPI_INTEGRITY = defineSecret('WOMPI_INTEGRITY');
const WOMPI_EVENTS = defineSecret('WOMPI_EVENTS');
const WOMPI_PUBLIC_KEY = defineString('WOMPI_PUBLIC_KEY');
const APP_URL = defineString('APP_URL', { default: 'https://flowi-gastos.web.app' });

// Deben coincidir con lib/plans.ts
const PLANS = {
  mensual: { months: 1, price: 5000 },
  trimestral: { months: 3, price: 14000 },
  anual: { months: 12, price: 50000 },
};

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

exports.wompiFirma = onCall({ secrets: [WOMPI_INTEGRITY], region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para pagar.');
  const planId = String(req.data?.plan || '');
  const plan = PLANS[planId];
  if (!plan) throw new HttpsError('invalid-argument', 'Plan no válido.');

  const uid = req.auth.uid;
  const reference = `FLW-${uid}-${planId}-${Date.now()}`;
  const amountInCents = plan.price * 100;
  const currency = 'COP';
  const signature = sha256(`${reference}${amountInCents}${currency}${WOMPI_INTEGRITY.value()}`);

  await db.collection('fl_payments').doc(reference).set({
    userId: uid, plan: planId, months: plan.months, amountInCents, currency,
    status: 'PENDING', createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    reference, amountInCents, currency, signature,
    publicKey: WOMPI_PUBLIC_KEY.value(),
    redirectUrl: `${APP_URL.value()}/planes`,
  };
});

// Lee "transaction.id" dentro de body.data
const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

// Aplica el resultado de una transacción de Wompi a su pago y, si quedó APROBADA por el valor
// exacto, suma los meses de Premium. Sirve para el aviso de Wompi y para la confirmación desde la app.
async function applyTransaction(tx) {
  const payRef = db.collection('fl_payments').doc(String(tx.reference));
  return db.runTransaction(async (t) => {
    const pay = await t.get(payRef);
    if (!pay.exists) { logger.warn('Pago desconocido', { reference: tx.reference }); return null; }
    const p = pay.data();
    if (p.status === 'APPROVED') return p; // ya se procesó (Wompi puede repetir el aviso)

    const update = { status: tx.status, wompiId: tx.id || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (tx.status !== 'APPROVED') { t.update(payRef, update); return { ...p, ...update }; }
    if (Number(tx.amount_in_cents) !== p.amountInCents || tx.currency !== p.currency) {
      logger.error('Valor del pago no coincide', { reference: tx.reference, amount: tx.amount_in_cents });
      t.update(payRef, { ...update, status: 'AMOUNT_MISMATCH' });
      return null;
    }

    // Premium se suma al tiempo que ya tenga (renovar antes no hace perder días)
    const userRef = db.collection('users').doc(p.userId);
    const user = await t.get(userRef);
    const now = new Date();
    const current = user.exists && user.data().premiumUntil ? user.data().premiumUntil.toDate() : null;
    const from = current && current > now ? current : now;
    const until = new Date(from);
    until.setMonth(until.getMonth() + p.months);

    t.set(userRef, { premiumUntil: admin.firestore.Timestamp.fromDate(until), plan: p.plan }, { merge: true });
    t.update(payRef, { ...update, premiumUntil: admin.firestore.Timestamp.fromDate(until) });
    return { ...p, ...update };
  });
}

// Respaldo del aviso: al terminar el pago, la app pide confirmar la transacción. El servidor la
// consulta directamente a Wompi (no confía en lo que diga la app) y la aplica.
exports.wompiConfirmar = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const id = String(req.data?.id || '');
  if (!/^[\w-]{5,80}$/.test(id)) throw new HttpsError('invalid-argument', 'Transacción no válida.');
  const base = WOMPI_PUBLIC_KEY.value().startsWith('pub_test_') ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
  const r = await fetch(`${base}/transactions/${encodeURIComponent(id)}`);
  if (!r.ok) throw new HttpsError('not-found', 'Wompi no encontró la transacción.');
  const tx = (await r.json())?.data;
  if (!tx?.reference || !String(tx.reference).startsWith(`FLW-${req.auth.uid}-`)) {
    throw new HttpsError('permission-denied', 'Esta transacción no es tuya.');
  }
  const p = await applyTransaction(tx);
  return { status: p?.status || tx.status };
});

exports.wompiEventos = onRequest({ secrets: [WOMPI_EVENTS], region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Método no permitido'); return; }
  const body = req.body || {};
  const props = body.signature?.properties;
  const checksum = String(body.signature?.checksum || '').toLowerCase();
  if (!Array.isArray(props) || !checksum || body.timestamp == null) { res.status(400).send('Aviso incompleto'); return; }

  const concat = props.map(p => String(pick(body.data, p) ?? '')).join('') + body.timestamp + WOMPI_EVENTS.value();
  const expected = sha256(concat);
  if (expected.length !== checksum.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(checksum))) {
    logger.warn('Aviso de Wompi con firma inválida');
    res.status(401).send('Firma inválida');
    return;
  }

  const tx = body.data?.transaction;
  if (body.event !== 'transaction.updated' || !tx?.reference) { res.status(200).send('ok'); return; }

  try {
    await applyTransaction(tx);
    res.status(200).send('ok');
  } catch (e) {
    logger.error('Error procesando aviso de Wompi', e);
    res.status(500).send('error'); // Wompi reintenta
  }
});

// Pago por transferencia directa (Bre-B): la persona sube el comprobante (fl_manual_payments) y el
// administrador lo aprueba o rechaza desde Planes. Al aprobar se suman los meses de Premium.
exports.revisarPagoManual = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const reviewer = await db.collection('users').doc(req.auth.uid).get();
  if (!reviewer.exists || reviewer.data().role !== 'admin') throw new HttpsError('permission-denied', 'Solo el administrador revisa pagos.');
  const id = String(req.data?.id || '');
  const approve = req.data?.approve === true;
  const note = String(req.data?.note || '').slice(0, 200);
  if (!id) throw new HttpsError('invalid-argument', 'Falta el comprobante.');

  const ref = db.collection('fl_manual_payments').doc(id);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'No existe ese comprobante.');
    const p = snap.data();
    if (p.status !== 'PENDING') return { status: p.status };
    const reviewed = { reviewedAt: admin.firestore.FieldValue.serverTimestamp(), reviewedBy: req.auth.uid, reviewNote: note };
    if (!approve) { t.update(ref, { status: 'REJECTED', ...reviewed }); return { status: 'REJECTED' }; }

    const plan = PLANS[p.plan];
    if (!plan) throw new HttpsError('invalid-argument', 'Plan no válido.');
    const userRef = db.collection('users').doc(p.userId);
    const user = await t.get(userRef);
    const now = new Date();
    const current = user.exists && user.data().premiumUntil ? user.data().premiumUntil.toDate() : null;
    const until = new Date(current && current > now ? current : now);
    until.setMonth(until.getMonth() + plan.months);
    t.set(userRef, { premiumUntil: admin.firestore.Timestamp.fromDate(until), plan: p.plan }, { merge: true });
    t.update(ref, { status: 'APPROVED', premiumUntil: admin.firestore.Timestamp.fromDate(until), ...reviewed });
    return { status: 'APPROVED', premiumUntil: until.toISOString() };
  });
});


// Aviso al administrador (notificación push) cada vez que alguien envía un comprobante
exports.avisarComprobante = onDocumentCreated({ document: 'fl_manual_payments/{id}', region: 'us-central1' }, async (event) => {
  const p = event.data?.data();
  if (!p || p.status !== 'PENDING') return;
  const admins = await db.collection('users').where('role', '==', 'admin').get();
  const amount = Number(p.amount || 0).toLocaleString('es-CO');
  for (const a of admins.docs) {
    const tokens = (a.get('pushTokens') || []).filter(Boolean);
    if (!tokens.length) continue;
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        title: '🧾 Nuevo comprobante por revisar',
        body: `${p.userName || p.userEmail || 'Alguien'} envió $${amount} (plan ${p.plan}). Toca para revisarlo.`,
        url: '/planes',
        tag: `comprobante-${event.params.id}`,
      },
      webpush: { headers: { Urgency: 'high', TTL: '86400' } },
    });
    const dead = tokens.filter((_, i) => {
      const code = res.responses[i].error?.code || '';
      return code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');
    });
    if (dead.length) await a.ref.update({ pushTokens: admin.firestore.FieldValue.arrayRemove(...dead) });
  }
});

// ── Eliminar mi cuenta ────────────────────────────────────────────────
// La persona borra su cuenta y todo lo que registró (Ley 1581: derecho a suprimir sus datos).
// Se conserva solo el registro de los pagos (valor, plan, fecha y estado), como dice la política;
// a los comprobantes de transferencia se les quita la imagen y los datos personales.
const USER_COLLECTIONS = ['fl_expenses', 'fl_debts', 'fl_customCategories', 'fl_notes', 'fl_reminders',
  'fl_goals', 'fl_investments', 'fl_accounts', 'fl_transfers'];

async function deleteWhere(collection, uid) {
  let total = 0;
  for (;;) {
    const snap = await db.collection(collection).where('userId', '==', uid).limit(400).get();
    if (snap.empty) return total;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
  }
}

exports.eliminarMiCuenta = onCall({ region: 'us-central1', timeoutSeconds: 300 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  if (req.data?.confirm !== 'ELIMINAR') throw new HttpsError('invalid-argument', 'Falta la confirmación.');
  const uid = req.auth.uid;
  const userRef = db.collection('users').doc(uid);
  const user = await userRef.get();
  if (user.exists && user.data().role === 'admin') {
    throw new HttpsError('permission-denied', 'La cuenta de administrador no se puede eliminar desde la app.');
  }

  let removed = 0;
  for (const c of USER_COLLECTIONS) removed += await deleteWhere(c, uid);

  const manual = await db.collection('fl_manual_payments').where('userId', '==', uid).get();
  if (!manual.empty) {
    const batch = db.batch();
    manual.docs.forEach((d) => batch.update(d.ref, {
      image: admin.firestore.FieldValue.delete(), userName: admin.firestore.FieldValue.delete(),
      userEmail: admin.firestore.FieldValue.delete(), note: admin.firestore.FieldValue.delete(), accountDeleted: true,
    }));
    await batch.commit();
  }

  await userRef.delete();
  await admin.auth().deleteUser(uid).catch((e) => logger.warn('No se pudo borrar el usuario de Auth', e.code));
  logger.info('Cuenta eliminada', { removed });
  return { ok: true, removed };
});

// ── Recordatorios push ────────────────────────────────────────────────
// Cada 5 minutos revisa qué recordatorios tocan y los envía al celular (lógica en reminders.mjs).
// Antes lo hacía GitHub Actions, que atrasaba la tarea varias horas y se perdían avisos.
exports.enviarRecordatorios = onSchedule({
  schedule: 'every 5 minutes', timeZone: 'America/Bogota', region: 'us-central1',
  timeoutSeconds: 120, retryCount: 0, maxInstances: 1,
}, async () => {
  const { runReminders } = await import('./reminders.mjs');
  await runReminders();
});

// ── Notificación de prueba ────────────────────────────────────────────
// Desde Configuración: envía un aviso real a ESTE celular (el token que manda la app, que debe
// estar registrado en el perfil) y dice si Google lo aceptó. Sirve para saber si el problema
// está en el servidor o en los permisos del celular.
exports.probarNotificacion = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión.');
  const userRef = db.collection('users').doc(req.auth.uid);
  const user = await userRef.get();
  const tokens = (user.exists && user.data().pushTokens) || [];
  const token = String(req.data?.token || '');
  if (!token) throw new HttpsError('invalid-argument', 'Falta el identificador de este celular.');
  if (!tokens.includes(token)) return { ok: false, reason: 'not-registered', registered: tokens.length };
  try {
    await admin.messaging().send({
      token,
      data: { title: 'Prueba de FLOWI ✓', body: 'Si ves esto, las notificaciones con la app cerrada funcionan.', url: '/configuracion', tag: `test-${Date.now()}` },
      webpush: { headers: { Urgency: 'high', TTL: '600' } },
    });
    return { ok: true, registered: tokens.length };
  } catch (e) {
    const code = e.code || 'error';
    if (/registration-token-not-registered|invalid-registration-token|invalid-argument/.test(code)) {
      await userRef.update({ pushTokens: admin.firestore.FieldValue.arrayRemove(token) });
    }
    return { ok: false, reason: code, registered: tokens.length };
  }
});
