// Servidor de pagos de FLOWI (Firebase Functions, Node 20).
//  - wompiFirma: la app pide pagar un plan; aquí se arma la referencia y la firma de integridad
//    (el secreto nunca sale del servidor) y se anota el pago como pendiente.
//  - wompiEventos: Wompi avisa el resultado del pago. Se verifica la firma del aviso con el
//    secreto de eventos y, si el pago quedó APROBADO por el valor exacto, se activa Premium.
const crypto = require('crypto');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
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

  const payRef = db.collection('fl_payments').doc(String(tx.reference));
  try {
    await db.runTransaction(async (t) => {
      const pay = await t.get(payRef);
      if (!pay.exists) { logger.warn('Pago desconocido', { reference: tx.reference }); return; }
      const p = pay.data();
      if (p.status === 'APPROVED') return; // ya se procesó (Wompi puede repetir el aviso)

      const update = { status: tx.status, wompiId: tx.id || null, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
      if (tx.status !== 'APPROVED') { t.update(payRef, update); return; }
      if (Number(tx.amount_in_cents) !== p.amountInCents || tx.currency !== p.currency) {
        logger.error('Valor del pago no coincide', { reference: tx.reference, amount: tx.amount_in_cents });
        t.update(payRef, { ...update, status: 'AMOUNT_MISMATCH' });
        return;
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
    });
    res.status(200).send('ok');
  } catch (e) {
    logger.error('Error procesando aviso de Wompi', e);
    res.status(500).send('error'); // Wompi reintenta
  }
});
