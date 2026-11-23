// Pruebas de las reglas de gastos compartidos entre amigos (fl_shared_links)
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, arrayUnion } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-flowi2',
  firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
let fails = 0;
const t = async (name, p) => { try { await p; console.log('✓', name); } catch (e) { fails++; console.log('✗', name, e.message?.slice(0, 160)); } };

// Datos de partida (sin reglas)
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'fl_expenses/tx1'), { userId: 'luis', amount: 0, type: 'gasto', category: 'Viajes' });
  await setDoc(doc(db, 'fl_expenses/tx2'), { userId: 'luis', amount: 0, type: 'gasto', category: 'Viajes' });
  await setDoc(doc(db, 'fl_expenses/txOtro'), { userId: 'carl', amount: 0, type: 'gasto', category: 'Viajes' });
  await setDoc(doc(db, 'fl_friend_requests/luis_leidy'), { from: 'luis', to: 'leidy', users: ['luis', 'leidy'], status: 'accepted' });
  await setDoc(doc(db, 'fl_friend_requests/carl_luis'), { from: 'carl', to: 'luis', users: ['carl', 'luis'], status: 'pending' });
});
const L = env.authenticatedContext('luis').firestore();
const Y = env.authenticatedContext('leidy').firestore();
const C = env.authenticatedContext('carl').firestore();
const link = (over = {}) => ({ owner: 'luis', friend: 'leidy', users: ['luis', 'leidy'], ownerName: 'Luis', friendName: 'Leidy', txId: 'tx1',
  description: 'Despegar', category: 'Viajes', date: '2026-11-16T22:37:00Z', share: 382939, status: 'pending', payments: [], removed: [], absorbed: 0, friendTxId: null, ...over });

await t('compartir con amiga', assertSucceeds(setDoc(doc(L, 'fl_shared_links/tx1_leidy'), link())));
await t('no con alguien que no es amigo', assertFails(setDoc(doc(L, 'fl_shared_links/tx1_carl'), link({ friend: 'carl', users: ['luis', 'carl'], friendName: 'Carl' }))));
await t('no con un gasto ajeno', assertFails(setDoc(doc(L, 'fl_shared_links/txOtro_leidy'), link({ txId: 'txOtro' }))));
await t('no a nombre de otro', assertFails(setDoc(doc(C, 'fl_shared_links/tx2_leidy'), link({ txId: 'tx2' }))));
await t('no nacer aceptado', assertFails(setDoc(doc(L, 'fl_shared_links/tx2_leidy'), link({ txId: 'tx2', status: 'accepted' }))));
await t('id que no corresponde', assertFails(setDoc(doc(L, 'fl_shared_links/x_leidy'), link({ txId: 'tx2' }))));
await t('la amiga lo ve', assertSucceeds(getDoc(doc(Y, 'fl_shared_links/tx1_leidy'))));
await t('la amiga lista los suyos', assertSucceeds(getDocs(query(collection(Y, 'fl_shared_links'), where('users', 'array-contains', 'leidy')))));
await t('un tercero no lo ve', assertFails(getDoc(doc(C, 'fl_shared_links/tx1_leidy'))));
await t('la amiga no cambia el monto', assertFails(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { share: 1 })));
await t('quien pagó no se lo acepta', assertFails(updateDoc(doc(L, 'fl_shared_links/tx1_leidy'), { status: 'accepted' })));
await t('la amiga lo acepta', assertSucceeds(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { status: 'accepted', friendTxId: 'ftx1' })));
await t('quien pagó cambia el monto', assertSucceeds(updateDoc(doc(L, 'fl_shared_links/tx1_leidy'), { share: 300000 })));
await t('la amiga anota un abono', assertSucceeds(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { payments: [{ id: 'a1', amount: 100000, at: '2026-11-20T10:00:00Z', by: 'leidy' }] })));
await t('borrar un abono (removed)', assertSucceeds(updateDoc(doc(L, 'fl_shared_links/tx1_leidy'), { removed: arrayUnion('a1') })));
await t('quien pagó asume lo que falta', assertSucceeds(updateDoc(doc(L, 'fl_shared_links/tx1_leidy'), { absorbed: 200000 })));
await t('la amiga no cambia lo asumido', assertFails(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { absorbed: 0 })));
await t('la amiga lo quita de su app', assertSucceeds(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { status: 'rejected', friendTxId: null })));
await t('la amiga no lo revive', assertFails(updateDoc(doc(Y, 'fl_shared_links/tx1_leidy'), { status: 'accepted' })));
await t('quien pagó lo marca borrado', assertSucceeds(updateDoc(doc(L, 'fl_shared_links/tx1_leidy'), { status: 'deleted' })));
await t('la amiga no lo borra', assertFails(deleteDoc(doc(Y, 'fl_shared_links/tx1_leidy'))));
await t('quien pagó lo borra', assertSucceeds(deleteDoc(doc(L, 'fl_shared_links/tx1_leidy'))));

await env.cleanup();
console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
