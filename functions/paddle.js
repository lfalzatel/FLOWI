// Pagos internacionales con Paddle (revendedor oficial: cobra, maneja el IVA y paga a FLOWI).
// Funciones puras, sin Firebase, para poder probarlas (scripts/test-paddle.mjs).
const crypto = require('crypto');

/**
 * Verifica el encabezado "Paddle-Signature" (ts=…;h1=…): HMAC-SHA256 de "ts:cuerpo" con el secreto
 * del webhook. Rechaza firmas de hace más de `toleranceSec` (evita que alguien repita un aviso viejo).
 */
function verifyPaddleSignature(header, rawBody, secret, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300) {
  if (!header || !secret || rawBody == null) return false;
  const parts = Object.fromEntries(String(header).split(';').map(p => p.split('=').map(s => s.trim())).filter(p => p.length === 2));
  const ts = Number(parts.ts);
  const h1 = String(parts.h1 || '').toLowerCase();
  if (!ts || !/^[0-9a-f]{64}$/.test(h1)) return false;
  if (Math.abs(nowSec - ts) > toleranceSec) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
  const expected = crypto.createHmac('sha256', secret).update(`${ts}:${body}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(h1));
}

/**
 * Qué compró: se decide por el precio de Paddle (no por lo que diga la app). Devuelve el plan y los
 * meses, o null si el precio no es uno de FLOWI.
 */
function planFromTransaction(data, prices) {
  const priceId = data?.items?.[0]?.price?.id || data?.items?.[0]?.price_id;
  if (!priceId) return null;
  if (prices.mensual && priceId === prices.mensual) return { plan: 'mensual', months: 1, priceId };
  if (prices.anual && priceId === prices.anual) return { plan: 'anual', months: 12, priceId };
  return null;
}

/** Premium se suma al tiempo que ya tenga (renovar antes no hace perder días). */
function extendUntil(current, months, now = new Date()) {
  const from = current && current > now ? current : now;
  const until = new Date(from);
  until.setMonth(until.getMonth() + months);
  return until;
}

module.exports = { verifyPaddleSignature, planFromTransaction, extendUntil };
