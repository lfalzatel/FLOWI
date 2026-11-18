// Prueba de la calculadora del monto (lib/amountExpr.ts).
// Uso: node scripts/test-amount-expr.mjs   (sale con código 1 si alguna falla)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-expr-'));
const js = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/amountExpr.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const out = path.join(outDir, 'amountExpr.mjs');
fs.writeFileSync(out, js);
const E = await import(pathToFileURL(out).href);

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log(`✗ ${name}\n   esperado ${JSON.stringify(want)}\n   obtenido ${JSON.stringify(got)}`); }
  else console.log(`✓ ${name}`);
};

eq('número solo', E.evalAmount('25000'), 25000);
eq('suma', E.evalAmount('25000+18500'), 43500);
eq('resta', E.evalAmount('90000-12000'), 78000);
eq('división', E.evalAmount('90000÷3'), 30000);
eq('multiplicación primero', E.evalAmount('12000×2-500'), 23500);
eq('con * y /', E.evalAmount('10*3/2'), 15);
eq('signo al final se ignora', E.evalAmount('25000+'), 25000);
eq('decimales', E.evalAmount('10.5+0.25'), 10.75);
eq('dividir por cero', E.evalAmount('5÷0'), null);
eq('vacío', E.evalAmount(''), null);
eq('negativo al inicio', E.evalAmount('-5+10'), 5);
eq('limpia letras y comas', E.cleanExpr('2,5ab+3'), '2.5+3');
eq('dos signos seguidos: queda el primero', E.cleanExpr('5+-3'), '5+3');
eq('un punto por número', E.cleanExpr('1.2.3+4'), '1.23+4');
eq('tiene operación', [E.hasOperator('25000'), E.hasOperator('25000+1'), E.hasOperator('-5')], [false, true, false]);
eq('mostrar', E.displayExpr('25000+18500.5'), '25.000 + 18.500,5');
eq('mostrar resta', E.displayExpr('1000000-5'), '1.000.000 − 5');

console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
