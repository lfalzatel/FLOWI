// Pruebas de las reglas de comentarios y sugerencias (fl_feedback)
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-flowi3',
  firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
let fails = 0;
const t = async (name, p) => { try { await p; console.log('✓', name); } catch (e) { fails++; console.log('✗', name, e.message?.slice(0, 160)); } };
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users/jefe'), { role: 'admin', name: 'Admin' });
  await setDoc(doc(db, 'users/ana'), { role: 'Usuario', name: 'Ana' });
});
const A = env.authenticatedContext('ana').firestore();
const B = env.authenticatedContext('beto').firestore();
const J = env.authenticatedContext('jefe').firestore();
const fb = (o = {}) => ({ userId: 'ana', userName: 'Ana', type: 'mejorar', area: 'Gastos', rating: 4, text: 'La calculadora tapa todo', status: 'nuevo', reply: null, createdAt: serverTimestamp(), ...o });

await t('enviar comentario', assertSucceeds(setDoc(doc(A, 'fl_feedback/f1'), fb())));
await t('sin calificación', assertSucceeds(setDoc(doc(A, 'fl_feedback/f2'), fb({ rating: null, type: 'idea' }))));
await t('no a nombre de otro', assertFails(setDoc(doc(B, 'fl_feedback/f3'), fb())));
await t('tipo inválido', assertFails(setDoc(doc(A, 'fl_feedback/f4'), fb({ type: 'spam' }))));
await t('texto vacío', assertFails(setDoc(doc(A, 'fl_feedback/f5'), fb({ text: '' }))));
await t('calificación 9', assertFails(setDoc(doc(A, 'fl_feedback/f6'), fb({ rating: 9 }))));
await t('no nacer resuelto', assertFails(setDoc(doc(A, 'fl_feedback/f7'), fb({ status: 'hecho' }))));
await t('no traer respuesta', assertFails(setDoc(doc(A, 'fl_feedback/f8'), fb({ reply: 'listo' }))));
await t('veo el mío', assertSucceeds(getDoc(doc(A, 'fl_feedback/f1'))));
await t('listo los míos', assertSucceeds(getDocs(query(collection(A, 'fl_feedback'), where('userId', '==', 'ana')))));
await t('otro no lo ve', assertFails(getDoc(doc(B, 'fl_feedback/f1'))));
await t('otro no lista todo', assertFails(getDocs(collection(B, 'fl_feedback'))));
await t('admin lista todo', assertSucceeds(getDocs(query(collection(J, 'fl_feedback'), orderBy('createdAt', 'desc')))));
await t('yo no me lo marco resuelto', assertFails(updateDoc(doc(A, 'fl_feedback/f1'), { status: 'hecho' })));
await t('admin marca resuelto y responde', assertSucceeds(updateDoc(doc(J, 'fl_feedback/f1'), { status: 'hecho', reply: 'Ya lo arreglamos' })));
await t('admin no cambia el texto', assertFails(updateDoc(doc(J, 'fl_feedback/f1'), { text: 'otro' })));
await t('otro no lo borra', assertFails(deleteDoc(doc(B, 'fl_feedback/f2'))));
await t('yo borro el mío', assertSucceeds(deleteDoc(doc(A, 'fl_feedback/f2'))));
await t('admin borra', assertSucceeds(deleteDoc(doc(J, 'fl_feedback/f1'))));

await env.cleanup();
console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
