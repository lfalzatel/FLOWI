// Copia los datos y usuarios de FLOWI del proyecto compartido tienda-38d40 al proyecto propio flowi-9af82.
//
//   node copiar.mjs            → solo revisa: cuenta lo que se copiaría, no escribe nada
//   node copiar.mjs --copiar   → guarda un respaldo local, copia (inicio de sesión + Firestore) y verifica
//   node copiar.mjs --respaldo → solo guarda el respaldo local en ./respaldos/
//
// Solo LEE de tienda-38d40 (nunca escribe ni borra allí). En flowi-9af82 deja las colecciones de
// FLOWI como espejo exacto del origen, así que se puede volver a correr justo antes del cambio
// para traer lo último. NO correrlo después del cambio: borraría lo nuevo registrado en flowi-9af82.
//
// Necesita en ./llaves/ una llave de cuenta de servicio de cada proyecto (se borran al terminar).

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const SOURCE = 'tienda-38d40';
const TARGET = 'flowi-9af82';
const COLLECTIONS = ['fl_expenses', 'fl_debts', 'fl_customCategories', 'fl_notes', 'fl_reminders', 'fl_goals'];
const APPLY = process.argv.includes('--copiar');
const BACKUP_ONLY = process.argv.includes('--respaldo');

const here = dirname(fileURLToPath(import.meta.url));
const keysDir = join(here, 'llaves');

function loadKey(projectId) {
  let files = [];
  try { files = readdirSync(keysDir).filter(f => f.endsWith('.json')); } catch { /* carpeta vacía */ }
  for (const f of files) {
    const key = JSON.parse(readFileSync(join(keysDir, f), 'utf8'));
    if (key.type === 'service_account' && key.project_id === projectId) return key;
  }
  throw new Error(`Falta la llave de ${projectId} en migracion/llaves/ (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada).`);
}

let sourceKey, targetKey;
try {
  sourceKey = loadKey(SOURCE);
  // El respaldo solo lee del origen; no necesita la llave del destino
  if (!BACKUP_ONLY) targetKey = loadKey(TARGET);
} catch (err) {
  console.error(`\n${err.message}\n`);
  process.exit(1);
}
const sourceApp = initializeApp({ credential: cert(sourceKey) }, 'origen');
const targetApp = targetKey ? initializeApp({ credential: cert(targetKey) }, 'destino') : null;
const src = getFirestore(sourceApp);
const dst = targetApp && getFirestore(targetApp);
const srcAuth = getAuth(sourceApp);
const dstAuth = targetApp && getAuth(targetApp);

async function readAll(db, name) {
  const snap = await db.collection(name).get();
  return snap.docs;
}

async function listAllAuthUsers(auth) {
  const users = [];
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    users.push(...page.users);
    token = page.pageToken;
  } while (token);
  return users;
}

// Deja `name` en el destino igual a `docs` (crea/reemplaza por ID y borra lo que sobre)
async function mirror(name, docs) {
  const writer = dst.bulkWriter();
  const keep = new Set(docs.map(d => d.id));
  for (const d of docs) writer.set(dst.collection(name).doc(d.id), d.data());
  const existing = await readAll(dst, name);
  let removed = 0;
  for (const d of existing) if (!keep.has(d.id)) { writer.delete(d.ref); removed++; }
  await writer.close();
  return removed;
}

function toImportRecord(u) {
  return {
    uid: u.uid,
    email: u.email,
    emailVerified: u.emailVerified,
    displayName: u.displayName,
    photoURL: u.photoURL,
    phoneNumber: u.phoneNumber,
    disabled: u.disabled,
    metadata: { creationTime: u.metadata.creationTime, lastSignInTime: u.metadata.lastSignInTime },
    providerData: u.providerData
      .filter(p => p.providerId !== 'password')
      .map(p => ({ uid: p.uid, providerId: p.providerId, email: p.email, displayName: p.displayName, photoURL: p.photoURL })),
  };
}

async function main() {
  console.log(`\n${APPLY ? 'COPIANDO' : BACKUP_ONLY ? 'RESPALDO (solo lee)' : 'REVISIÓN (no escribe nada)'}: ${SOURCE} → ${TARGET}\n`);

  // 1. Datos de FLOWI en el origen
  const data = {};
  const uids = new Set();
  for (const name of COLLECTIONS) {
    data[name] = await readAll(src, name);
    for (const d of data[name]) if (d.get('userId')) uids.add(d.get('userId'));
    console.log(`  ${name.padEnd(20)} ${String(data[name].length).padStart(6)} documentos`);
  }

  // 2. Perfiles: los de quienes tienen datos de FLOWI, más los perfiles creados por FLOWI (tienen "currency")
  //    aunque aún no hayan registrado nada. El resto de "users" se considera de la tienda y no se copia.
  const allProfiles = await readAll(src, 'users');
  const withData = allProfiles.filter(d => uids.has(d.id));
  const profileOnly = allProfiles.filter(d => !uids.has(d.id) && d.get('currency') !== undefined);
  const others = allProfiles.filter(d => !uids.has(d.id) && d.get('currency') === undefined);
  const profiles = [...withData, ...profileOnly];
  profileOnly.forEach(d => uids.add(d.id));
  const otherKeys = new Set(others.flatMap(d => Object.keys(d.data())));

  console.log(`\n  Perfiles (users):`);
  console.log(`    con datos de FLOWI:             ${withData.length}`);
  console.log(`    de FLOWI sin datos todavía:     ${profileOnly.length}`);
  console.log(`    de la tienda (no se copian):    ${others.length}${others.length ? `  · campos: ${[...otherKeys].sort().join(', ')}` : ''}`);
  console.log(`    administradores entre los de FLOWI: ${profiles.filter(d => d.get('role') === 'admin').length}`);

  // 3. Cuentas de inicio de sesión
  const authUsers = (await listAllAuthUsers(srcAuth)).filter(u => uids.has(u.uid));
  const missingAuth = [...uids].filter(uid => !authUsers.some(u => u.uid === uid));
  const passwordUsers = authUsers.filter(u => u.providerData.some(p => p.providerId === 'password'));
  const providers = new Set(authUsers.flatMap(u => u.providerData.map(p => p.providerId)));
  console.log(`\n  Cuentas de inicio de sesión a copiar: ${authUsers.length}  (proveedores: ${[...providers].join(', ') || 'ninguno'})`);
  if (passwordUsers.length) console.log(`    ⚠ ${passwordUsers.length} usan correo y contraseña: su contraseña no se copia; tendrían que restablecerla.`);
  if (missingAuth.length) console.log(`    ⚠ ${missingAuth.length} identificadores con datos no tienen cuenta (datos huérfanos; se copian igual).`);

  if (APPLY || BACKUP_ONLY) {
    // Respaldo local de todo lo de FLOWI tal como está en el origen (tiene datos personales: no compartirlo)
    const dir = join(here, 'respaldos');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `flowi-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    const dump = {
      origen: SOURCE,
      fecha: new Date().toISOString(),
      users: Object.fromEntries(profiles.map(d => [d.id, d.data()])),
      cuentas: authUsers.map(toImportRecord),
    };
    for (const name of COLLECTIONS) dump[name] = Object.fromEntries(data[name].map(d => [d.id, d.data()]));
    writeFileSync(file, JSON.stringify(dump, null, 1));
    console.log(`\n  Respaldo guardado: ${file}`);
  }
  if (BACKUP_ONLY) {
    console.log(`\nSolo se guardó el respaldo; no se escribió nada en Firebase.\n`);
    return;
  }

  // 4. Estado del destino
  let targetCounts;
  try {
    targetCounts = {};
    for (const name of [...COLLECTIONS, 'users']) targetCounts[name] = (await dst.collection(name).count().get()).data().count;
  } catch (err) {
    if (String(err.message).includes('NOT_FOUND') || err.code === 5) {
      console.log(`\n  ✗ ${TARGET} todavía no tiene base de datos Firestore. Créala en la consola y vuelve a correr esto.`);
      return;
    }
    throw err;
  }
  console.log(`\n  En ${TARGET} hoy: ${Object.entries(targetCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);

  if (!APPLY) {
    console.log(`\nNada se escribió. Para copiar: node copiar.mjs --copiar\n`);
    return;
  }

  // 5. Copia
  console.log(`\n  Copiando cuentas de inicio de sesión…`);
  for (let i = 0; i < authUsers.length; i += 1000) {
    const res = await dstAuth.importUsers(authUsers.slice(i, i + 1000).map(toImportRecord));
    if (res.failureCount) res.errors.forEach(e => console.log(`    ✗ cuenta #${i + e.index}: ${e.error.message}`));
  }

  console.log(`  Copiando Firestore…`);
  for (const name of COLLECTIONS) {
    const removed = await mirror(name, data[name]);
    console.log(`    ${name.padEnd(20)} ${data[name].length} copiados${removed ? `, ${removed} sobrantes borrados` : ''}`);
  }
  const removedProfiles = await mirror('users', profiles);
  console.log(`    ${'users'.padEnd(20)} ${profiles.length} copiados${removedProfiles ? `, ${removedProfiles} sobrantes borrados` : ''}`);

  // 6. Verificación
  console.log(`\n  Verificando…`);
  let ok = true;
  for (const name of COLLECTIONS) {
    const n = (await dst.collection(name).count().get()).data().count;
    if (n !== data[name].length) { ok = false; console.log(`    ✗ ${name}: origen ${data[name].length}, destino ${n}`); }
  }
  const nUsers = (await dst.collection('users').count().get()).data().count;
  if (nUsers !== profiles.length) { ok = false; console.log(`    ✗ users: origen ${profiles.length}, destino ${nUsers}`); }
  const copiedAuth = (await listAllAuthUsers(dstAuth)).filter(u => uids.has(u.uid)).length;
  if (copiedAuth !== authUsers.length) { ok = false; console.log(`    ✗ cuentas: origen ${authUsers.length}, destino ${copiedAuth}`); }
  console.log(ok ? `    ✓ Todo coincide.\n` : `\n    Revisa los ✗ de arriba.\n`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
