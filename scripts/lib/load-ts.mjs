// Carga un archivo .ts del proyecto para probarlo con Node, sin compilar toda la app.
// Transpila el archivo y los suyos (imports "./x" y "@/x") a una carpeta temporal. Los paquetes externos
// (firebase, react…) se cambian por piezas falsas con los mismos nombres: así se prueba la lógica pura
// de archivos que también tienen funciones de Firebase (que en las pruebas no se llaman).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ts = createRequire(path.join(root, 'package.json'))('typescript');

export async function loadTs(relPath) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowi-test-'));
  const done = new Map(); // ruta .ts → ruta .mjs
  let stubN = 0;

  const resolveLocal = (spec, fromDir) => {
    const base = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(fromDir, spec);
    for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    throw new Error(`No encontré ${spec} (desde ${fromDir})`);
  };

  // Paquete externo → módulo falso que exporta los mismos nombres (funciones vacías)
  const stub = (names, hasDefault) => {
    const file = path.join(outDir, `stub-${stubN++}.mjs`);
    // Cualquier propiedad o llamada devuelve otra pieza falsa (googleProvider.setCustomParameters(), getAuth()…)
    const fn = `const Stub = new Proxy(function () {}, {
      get: (t, p) => (p === 'prototype' ? t.prototype : p === 'then' || typeof p === 'symbol' ? undefined : Stub),
      apply: () => Stub,
      construct: () => Stub,
    });`;
    const lines = [fn, ...names.map(n => `export const ${n} = Stub;`)];
    if (hasDefault) lines.push('export default Stub;');
    fs.writeFileSync(file, lines.join('\n'));
    return file;
  };

  const build = (file) => {
    if (done.has(file)) return done.get(file);
    const out = path.join(outDir, `${path.relative(root, file).replace(/[\\/]/g, '__').replace(/\.tsx?$/, '')}.mjs`);
    done.set(file, out);
    let js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    js = js.replace(/(import|export)\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?/g, (all, kw, what, spec) => {
      if (spec.startsWith('.') || spec.startsWith('@/')) {
        const dep = build(resolveLocal(spec, path.dirname(file)));
        return `${kw} ${what} from '${pathToFileURL(dep).href}';`;
      }
      // import Def, { a, b as c } from 'pkg'  /  import * as x from 'pkg'
      const names = [];
      const braces = what.match(/\{([^}]*)\}/);
      if (braces) braces[1].split(',').map(s => s.trim()).filter(Boolean).forEach(s => names.push(s.split(/\s+as\s+/)[0].replace(/^type\s+/, '')));
      const hasDefault = /^[A-Za-z_$][\w$]*\s*(,|$)/.test(what.trim());
      if (/\*\s+as\s+/.test(what)) return `${kw} ${what} from '${pathToFileURL(stub([], true)).href}';`;
      return `${kw} ${what} from '${pathToFileURL(stub(names, hasDefault)).href}';`;
    });
    js = js.replace(/^import\s+['"][^'"]+['"];?$/gm, ''); // imports solo por efecto (css, etc.)
    fs.writeFileSync(out, js);
    return out;
  };

  const entry = build(path.join(root, relPath));
  return import(pathToFileURL(entry).href);
}

// Mini herramienta de pruebas: eq(nombre, obtenido, esperado) y al final done()
export function tester() {
  let fails = 0;
  const eq = (name, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) { fails++; console.log(`✗ ${name}\n   esperado ${JSON.stringify(want)}\n   obtenido ${JSON.stringify(got)}`); }
    else console.log(`✓ ${name}`);
  };
  const done = () => { console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron'); process.exit(fails ? 1 : 0); };
  return { eq, done };
}
