// Prueba de los pagos con Paddle (functions/paddle.js): firma del aviso, plan comprado y meses de Premium.
// Uso: node scripts/test-paddle.mjs   (sale con código 1 si alguna falla)
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = createRequire(path.join(root, 'functions', 'package.json'))('./paddle.js');

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) { fails++; console.log('   esperado', JSON.stringify(want), '\n   obtenido', JSON.stringify(got)); }
};

const secret = 'pdl_ntfset_prueba';
const body = JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_1' } });
const ts = 1795000000;
const sign = (t, b, s = secret) => `ts=${t};h1=${crypto.createHmac('sha256', s).update(`${t}:${b}`).digest('hex')}`;

eq('firma correcta', P.verifyPaddleSignature(sign(ts, body), body, secret, ts + 10), true);
eq('firma con otro secreto', P.verifyPaddleSignature(sign(ts, body, 'otro'), body, secret, ts + 10), false);
eq('cuerpo cambiado', P.verifyPaddleSignature(sign(ts, body), body.replace('txn_1', 'txn_2'), secret, ts + 10), false);
eq('firma vieja (más de 5 minutos)', P.verifyPaddleSignature(sign(ts, body), body, secret, ts + 400), false);
eq('sin encabezado', P.verifyPaddleSignature('', body, secret, ts), false);
eq('cuerpo como Buffer', P.verifyPaddleSignature(sign(ts, body), Buffer.from(body), secret, ts), true);

const prices = { mensual: 'pri_mes', anual: 'pri_ano' };
eq('plan mensual por su precio', P.planFromTransaction({ items: [{ price: { id: 'pri_mes' } }] }, prices), { plan: 'mensual', months: 1, priceId: 'pri_mes' });
eq('plan anual por su precio', P.planFromTransaction({ items: [{ price: { id: 'pri_ano' } }] }, prices), { plan: 'anual', months: 12, priceId: 'pri_ano' });
eq('precio desconocido no activa nada', P.planFromTransaction({ items: [{ price: { id: 'pri_otro' } }] }, prices), null);
eq('sin precios configurados no activa nada', P.planFromTransaction({ items: [{ price: { id: 'pri_mes' } }] }, { mensual: '', anual: '' }), null);

const now = new Date('2026-11-24T12:00:00Z');
eq('sin Premium: desde hoy', P.extendUntil(null, 1, now).toISOString(), '2026-12-24T12:00:00.000Z');
eq('con Premium vigente: se suma', P.extendUntil(new Date('2027-01-10T00:00:00Z'), 12, now).toISOString(), '2028-01-10T00:00:00.000Z');
eq('Premium vencido: desde hoy', P.extendUntil(new Date('2026-10-01T00:00:00Z'), 1, now).toISOString(), '2026-12-24T12:00:00.000Z');

console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
