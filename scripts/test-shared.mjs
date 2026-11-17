// Prueba de los gastos compartidos (lib/shared.ts): partes, saldos por persona, movimientos de cuentas y enlace.
// Uso: node scripts/test-shared.mjs   (sale con código 1 si alguna falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-shared-'));
let js = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/shared.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
// normalizeText de lib/categories (sin tildes, minúsculas) sin cargar todo el catálogo
js = js.replace(/import \{ normalizeText \} from '@\/lib\/categories';/,
  "const normalizeText = (t) => t.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();");
const out = path.join(outDir, 'shared.mjs');
fs.writeFileSync(out, js);
const S = await import(pathToFileURL(out).href);

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`✗ ${name}\n   esperado ${JSON.stringify(want)}\n   obtenido ${JSON.stringify(got)}`); }
  else console.log(`✓ ${name}`);
};

const d = new Date('2026-11-17T13:00:00');
eq('partes iguales 90.000 entre 3', S.equalShares(90000, 2), [30000, 30000]);
eq('partes iguales con residuo: los demás redondean hacia abajo', S.equalShares(100000, 2), [33333, 33333]);
eq('tu parte con residuo', S.myPart({ total: 100000, paidByMe: true, people: [{ name: 'Ana', amount: 33333 }, { name: 'Pedro', amount: 33333 }] }), 33334);

const almuerzo = { id: 'a', type: 'gasto', amount: 30000, category: 'Restaurantes', description: 'Almuerzo viernes', date: d,
  shared: { total: 90000, paidByMe: true, people: [{ name: 'Ana', amount: 30000 }, { name: 'Pedro', amount: 30000, settledAt: '2026-11-18T10:00:00.000Z' }] } };
const cine = { id: 'b', type: 'gasto', amount: 20000, category: 'Cine', description: 'Cine', date: new Date('2026-11-16T20:00:00'),
  shared: { total: 20000, paidByMe: false, people: [{ name: 'ána', amount: 20000 }] } };
const normal = { id: 'c', type: 'gasto', amount: 5000, category: 'Café', date: d };

eq('pendiente a mí', S.pendingToMe(almuerzo.shared), 30000);
eq('pendiente mío', S.pendingFromMe(cine.shared), 20000);

const b = S.sharedBalances([almuerzo, cine, normal]);
eq('personas (Ana y ána son la misma)', b.map(x => [x.name, x.owesMe, x.iOwe, x.net]), [['Ana', 30000, 20000, 10000], ['Pedro', 0, 0, 0]]);
eq('entradas de Ana', b[0].entries.map(e => [e.tx.id, e.amount, e.toMe, e.settled]), [['a', 30000, true, false], ['b', 20000, false, false]]);

eq('movimientos: pagué yo (sale total, entra lo de Pedro)', S.moneyMoves(almuerzo).map(m => m.amount), [-90000, 30000]);
eq('movimientos: pagó otro y no he pagado', S.moneyMoves(cine).map(m => m.amount), []);
eq('movimientos: pagó otro y ya le pagué',
  S.moneyMoves({ ...cine, shared: S.withSettled(cine.shared, [0], true, d) }).map(m => m.amount), [-20000]);
eq('movimientos: gasto normal', S.moneyMoves(normal).map(m => m.amount), [-5000]);

eq('nombres conocidos', S.knownPeople([almuerzo, cine]), ['Ana', 'Pedro']);

const link = S.shareLink({ p: 'Luis', i: [{ d: 'Almuerzo viernes ñandú', a: 30000, c: 'Restaurantes', f: '2026-11-17' }] });
eq('enlace ida y vuelta (con ñ)', S.readShareLink(new URL(link).searchParams.get('g')),
  { p: 'Luis', i: [{ d: 'Almuerzo viernes ñandú', a: 30000, c: 'Restaurantes', f: '2026-11-17' }] });
eq('enlace dañado', S.readShareLink('xx!!'), null);
eq('enlace con monto raro', S.readShareLink(Buffer.from(JSON.stringify({ i: [{ d: 'x', a: -5, c: '', f: '2026-11-17' }] })).toString('base64url')), null);

const msg = S.chargeMessage(b[0], n => `$${n}`, 'Luis Alzate');
eq('mensaje incluye lo pendiente y la invitación', [msg.includes('Hola Ana'), msg.includes('$30000'), msg.includes('/compartido?g='), msg.includes('gratis')], [true, true, true, true]);

console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
