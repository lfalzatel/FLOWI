// Ayuda para traducir: lista los textos en español visibles de uno o varios archivos (JSX y comillas),
// sin los que ya pasan por t()/tr(). Uso: node scripts/i18n-find.mjs archivo1 archivo2 …
import fs from 'node:fs';

const looksSpanish = (s) => /[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡]{2}/.test(s) && !/^[a-z0-9_\-./:#@]+$/i.test(s.trim()) && !/^(?:[a-z]+(?:-[a-z0-9]+)+|https?:)/.test(s.trim());
for (const f of process.argv.slice(2)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  const found = new Map();
  lines.forEach((ln, i) => {
    if (/^\s*(\/\/|\*|import )/.test(ln) || /className=|class=/.test(ln) && !/>[^<{]*[A-Za-zÁ-ú]/.test(ln.replace(/className="[^"]*"|className=\{`[^`]*`\}/g, ''))) {}
    const clean = ln.replace(/className=(?:"[^"]*"|\{`[^`]*`\}|\{[^}]*\})/g, '').replace(/\b(?:t|tr)\('(?:[^'\\]|\\.)*'/g, '');
    for (const m of clean.matchAll(/>([^<>{}]+)</g)) if (looksSpanish(m[1])) found.set(m[1].trim(), i + 1);
    for (const m of clean.matchAll(/(?:placeholder|title|aria-label)="([^"]+)"/g)) if (looksSpanish(m[1])) found.set(m[1], i + 1);
    for (const m of clean.matchAll(/'((?:[^'\\]|\\.){3,})'/g)) if (looksSpanish(m[1]) && /[ ¿¡áéíóúñ]|^[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/.test(m[1]) && !/^[a-z-]+ [a-z-]+$/.test(m[1])) found.set(m[1], i + 1);
    const only = clean.trim();
    if (only && !/[<>{}();=]/.test(only) && looksSpanish(only) && /^[A-ZÁÉÍÓÚ¿¡a-záéíóúñ]/.test(only) && !/^(return|const|let|if|else|export|function|case|default)\b/.test(only)) found.set(only, i + 1);
  });
  console.log(`\n## ${f}`);
  for (const [s, l] of found) console.log(`${l}\t${s}`);
}
