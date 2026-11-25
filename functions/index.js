// Servidor de pagos de FLOWI (Firebase Functions, Node 22).
//  - wompiFirma: la app pide pagar un plan; aquí se arma la referencia y la firma de integridad
//    (el secreto nunca sale del servidor) y se anota el pago como pendiente.
//  - wompiEventos: Wompi avisa el resultado del pago. Se verifica la firma del aviso con el
//    secreto de eventos y, si el pago quedó APROBADO por el valor exacto, se activa Premium.
const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
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

// ── Pagos internacionales con Paddle (fuera de Colombia, en euros o dólares) ──────────────────────
// Paddle es el revendedor: cobra (tarjeta, PayPal, Apple/Google Pay), maneja el IVA y paga a FLOWI.
// La app abre el pago con custom_data { uid }; Paddle avisa aquí "transaction.completed" con una firma
// (PADDLE_WEBHOOK_SECRET). Se verifica la firma, se mira qué precio se pagó y se suma Premium.
// Se activa solo cuando existe la cuenta de Paddle: PADDLE_ENABLED=1 en functions/.env y el secreto
// PADDLE_WEBHOOK_SECRET guardado (firebase functions:secrets:set PADDLE_WEBHOOK_SECRET). Mientras tanto
// no se declara, para que desplegar las demás funciones no pida un secreto que todavía no existe.
const { verifyPaddleSignature, planFromTransaction, extendUntil } = require('./paddle');
if (process.env.PADDLE_ENABLED === '1') {
const PADDLE_WEBHOOK_SECRET = defineSecret('PADDLE_WEBHOOK_SECRET');
const PADDLE_PRICE_MENSUAL = defineString('PADDLE_PRICE_MENSUAL', { default: '' });
const PADDLE_PRICE_ANUAL = defineString('PADDLE_PRICE_ANUAL', { default: '' });

exports.paddleEventos = onRequest({ secrets: [PADDLE_WEBHOOK_SECRET], region: 'us-central1' }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Método no permitido'); return; }
  if (!verifyPaddleSignature(req.get('paddle-signature'), req.rawBody, PADDLE_WEBHOOK_SECRET.value())) {
    logger.warn('Aviso de Paddle con firma inválida');
    res.status(401).send('Firma inválida');
    return;
  }
  const body = req.body || {};
  if (body.event_type !== 'transaction.completed') { res.status(200).send('ok'); return; }
  const data = body.data || {};
  const uid = String(data.custom_data?.uid || '');
  const bought = planFromTransaction(data, { mensual: PADDLE_PRICE_MENSUAL.value(), anual: PADDLE_PRICE_ANUAL.value() });
  if (!data.id || !uid || !bought) {
    logger.error('Pago de Paddle sin persona o con un precio desconocido', { id: data.id, uid, price: data.items?.[0]?.price?.id });
    res.status(200).send('ok'); // no se reintenta: no hay nada que activar
    return;
  }

  try {
    const payRef = db.collection('fl_payments').doc(`paddle_${data.id}`);
    const userRef = db.collection('users').doc(uid);
    await db.runTransaction(async (t) => {
      const pay = await t.get(payRef);
      if (pay.exists && pay.data().status === 'APPROVED') return; // Paddle puede repetir el aviso
      const user = await t.get(userRef);
      if (!user.exists) { logger.error('Pago de Paddle para una persona que no existe', { uid, id: data.id }); return; }
      const current = user.data().premiumUntil ? user.data().premiumUntil.toDate() : null;
      const until = extendUntil(current, bought.months);
      t.set(userRef, { premiumUntil: admin.firestore.Timestamp.fromDate(until), plan: bought.plan }, { merge: true });
      t.set(payRef, {
        userId: uid, plan: bought.plan, months: bought.months, provider: 'paddle', paddleId: data.id,
        currency: data.currency_code || null, total: data.details?.totals?.grand_total || null,
        status: 'APPROVED', premiumUntil: admin.firestore.Timestamp.fromDate(until),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    res.status(200).send('ok');
  } catch (e) {
    logger.error('Error procesando aviso de Paddle', e);
    res.status(500).send('error'); // Paddle reintenta
  }
});
} // fin de PADDLE_ENABLED

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

// ── Amigos: aviso al celular ─────────────────────────────────────────
// Envía una notificación push a una persona (a todos sus celulares con FLOWI) y limpia los que ya no sirven.
// `make` puede ser el mensaje o una función que lo arma en el idioma de la persona (users/{uid}.lang).
async function pushTo(uid, make) {
  const ref = db.collection('users').doc(uid);
  const user = await ref.get();
  const tokens = ((user.exists && user.get('pushTokens')) || []).filter(Boolean);
  if (!tokens.length) return;
  const lang = (user.exists && user.get('lang')) === 'en' ? 'en' : 'es';
  const data = typeof make === 'function' ? make(lang) : make;
  const res = await admin.messaging().sendEachForMulticast({ tokens, data, webpush: { headers: { Urgency: 'high', TTL: '86400' } } });
  const dead = tokens.filter((_, i) => {
    const code = res.responses[i].error?.code || '';
    return code.includes('registration-token-not-registered') || code.includes('invalid-registration-token');
  });
  if (dead.length) await ref.update({ pushTokens: admin.firestore.FieldValue.arrayRemove(...dead) });
}
const { t: msg, locale: msgLocale } = require('./messages');
const firstName = (n, lang = 'es') => String(n || msg(lang, 'Alguien')).trim().split(/\s+/)[0];

// Alguien te envió una solicitud de amistad
exports.avisarSolicitudAmistad = onDocumentCreated({ document: 'fl_friend_requests/{id}', region: 'us-central1' }, async (event) => {
  const r = event.data?.data();
  if (!r || r.status !== 'pending' || !r.to) return;
  await pushTo(r.to, (lang) => ({
    title: msg(lang, '👋 {a} quiere ser tu amigo', { a: firstName(r.fromName, lang) }),
    body: msg(lang, 'Acepta la solicitud en FLOWI para compartir gastos.'),
    url: '/amigos',
    tag: `amistad-${event.params.id}`,
  }));
});

// Aceptaron tu solicitud
exports.avisarAmistadAceptada = onDocumentUpdated({ document: 'fl_friend_requests/{id}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after || before.status === 'accepted' || after.status !== 'accepted') return;
  await pushTo(after.from, (lang) => ({
    title: msg(lang, '🤝 {a} aceptó tu solicitud', { a: firstName(after.toName, lang) }),
    body: msg(lang, 'Ya son amigos en FLOWI.'),
    url: '/amigos',
    tag: `amistad-ok-${event.params.id}`,
  }));
});

// Un amigo te compartió un gasto (lib/sharedLinks.ts)
exports.avisarGastoCompartido = onDocumentCreated({ document: 'fl_shared_links/{id}', region: 'us-central1' }, async (event) => {
  const l = event.data?.data();
  if (!l || l.status !== 'pending' || !l.friend) return;
  await pushTo(l.friend, (lang) => ({
    title: msg(lang, '👥 {a} compartió un gasto contigo', { a: firstName(l.ownerName, lang) }),
    body: msg(lang, '{a}: te toca ${b}. Acéptalo en FLOWI.', {
      a: String(l.description || msg(lang, 'Un gasto')).slice(0, 60),
      b: Math.round(Number(l.share || 0)).toLocaleString(msgLocale(lang)),
    }),
    url: '/servicios/compartidos',
    tag: `compartido-${event.params.id}`,
  }));
});

// Tu amigo aceptó el gasto que le compartiste, o te registró un abono
exports.avisarCambioCompartido = onDocumentUpdated({ document: 'fl_shared_links/{id}', region: 'us-central1' }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;
  if (before.status === 'pending' && after.status === 'accepted') {
    await pushTo(after.owner, (lang) => ({
      title: msg(lang, '🤝 {a} aceptó el gasto compartido', { a: firstName(after.friendName, lang) }),
      body: msg(lang, '{a} ya está en su FLOWI.', { a: String(after.description || '').slice(0, 60) }),
      url: '/servicios/compartidos',
      tag: `compartido-ok-${event.params.id}`,
    }));
    return;
  }
  // Abono nuevo anotado por el amigo: avisarle a quien pagó
  const prev = new Set((before.payments || []).map((p) => p.id));
  const added = (after.payments || []).filter((p) => !prev.has(p.id) && p.by === after.friend);
  if (added.length) {
    const total = added.reduce((s, p) => s + Number(p.amount || 0), 0);
    await pushTo(after.owner, (lang) => ({
      title: msg(lang, '💸 {a} te abonó ${b}', { a: firstName(after.friendName, lang), b: Math.round(total).toLocaleString(msgLocale(lang)) }),
      body: msg(lang, 'De {a}.', { a: String(after.description || msg(lang, 'un gasto compartido')).slice(0, 60) }),
      url: '/servicios/compartidos',
      tag: `abono-${event.params.id}-${added[0].id}`,
    }));
  }
});

// Comentario o sugerencia nueva (app/servicios/opiniones): aviso a los administradores
exports.avisarComentario = onDocumentCreated({ document: 'fl_feedback/{id}', region: 'us-central1' }, async (event) => {
  const f = event.data?.data();
  if (!f) return;
  const emoji = { gusta: '👍', mejorar: '👎', idea: '💡', error: '🐞' }[f.type] || '💬';
  const admins = await db.collection('users').where('role', '==', 'admin').get();
  for (const a of admins.docs) {
    if (a.id === f.userId) continue; // si lo escribió el mismo administrador, no se avisa
    await pushTo(a.id, {
      title: `${emoji} Comentario nuevo · ${String(f.area || '').slice(0, 30)}`,
      body: `${firstName(f.userName)}: ${String(f.text || '').slice(0, 120)}`,
      url: '/servicios/opiniones',
      tag: `comentario-${event.params.id}`,
    });
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

  // Comentarios y sugerencias que envió
  for (;;) {
    const fb = await db.collection('fl_feedback').where('userId', '==', uid).limit(400).get();
    if (fb.empty) break;
    const batch = db.batch();
    fb.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += fb.size;
  }
  // Amigos: perfil público, buscador y solicitudes donde está la persona
  // Gastos compartidos con amigos donde participa
  for (;;) {
    const links = await db.collection('fl_shared_links').where('users', 'array-contains', uid).limit(400).get();
    if (links.empty) break;
    const batch = db.batch();
    links.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += links.size;
  }
  await db.collection('fl_profiles').doc(uid).delete().catch(() => {});
  await db.collection('fl_directory').doc(uid).delete().catch(() => {});
  for (;;) {
    const reqs = await db.collection('fl_friend_requests').where('users', 'array-contains', uid).limit(400).get();
    if (reqs.empty) break;
    const batch = db.batch();
    reqs.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    removed += reqs.size;
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

// ── Mudanza a la nueva dirección (lib/move.ts) ──────────────────────────────────────────────
// La app vieja pide un código de un solo uso (válido 10 min) con la sesión de quien lo pide y sus
// ajustes; la app nueva lo canjea por un "token" de esa MISMA cuenta (sirve también para invitados).
// En la base solo se guarda la huella (sha256) del código, nunca el código.
exports.crearMudanza = onCall({ region: 'us-central1' }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Inicia sesión para mudarte.');
  const prefs = req.data?.prefs && typeof req.data.prefs === 'object' ? req.data.prefs : {};
  if (JSON.stringify(prefs).length > 70000) throw new HttpsError('invalid-argument', 'Demasiados ajustes.');
  const code = crypto.randomBytes(24).toString('base64url');
  await db.collection('fl_moves').doc(sha256(code)).set({
    uid: req.auth.uid,
    prefs,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000),
  });
  return { code };
});

exports.usarMudanza = onCall({ region: 'us-central1' }, async (req) => {
  const code = String(req.data?.code || '');
  if (code.length < 20 || code.length > 80) throw new HttpsError('invalid-argument', 'Código no válido.');
  const ref = db.collection('fl_moves').doc(sha256(code));
  const move = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    tx.delete(ref); // un solo uso
    return snap.data();
  });
  if (!move) throw new HttpsError('not-found', 'Este enlace ya se usó o no existe. Vuelve a tocar Mudarme.');
  if (move.expiresAt.toMillis() < Date.now()) throw new HttpsError('deadline-exceeded', 'El enlace venció. Vuelve a tocar Mudarme.');
  const token = await admin.auth().createCustomToken(move.uid);
  logger.info('Mudanza', { uid: move.uid });
  return { token, prefs: move.prefs || {} };
});
