// Pruebas de las reglas de Amigos contra el emulador de Firestore
import fs from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-flowi',
  firestore: { rules: fs.readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});
let fails = 0;
const t = async (name, p) => { try { await p; console.log('✓', name); } catch (e) { fails++; console.log('✗', name, e.message?.slice(0, 120)); } };

const A = env.authenticatedContext('alice').firestore();
const B = env.authenticatedContext('bob').firestore();
const C = env.authenticatedContext('carl').firestore();
const anon = env.unauthenticatedContext().firestore();

const prof = (name) => ({ name, photo: null, username: name.toLowerCase() + '.abcd', searchable: true, updatedAt: serverTimestamp() });
const dir = (name) => ({ name, photo: null, username: name.toLowerCase() + '.abcd', prefixes: [name.toLowerCase().slice(0, 2), name.toLowerCase()], updatedAt: serverTimestamp() });
const req = (from, to, extra = {}) => ({ from, to, users: [from, to], status: 'pending', fromName: from, fromPhoto: null, fromUsername: from, toName: to, toPhoto: null, toUsername: to, createdAt: serverTimestamp(), ...extra });

// Perfiles
await t('crear mi perfil', assertSucceeds(setDoc(doc(A, 'fl_profiles/alice'), prof('Alice'))));
await t('no crear perfil de otro', assertFails(setDoc(doc(A, 'fl_profiles/bob'), prof('Bob'))));
await t('perfil con campos extra no', assertFails(setDoc(doc(A, 'fl_profiles/alice'), { ...prof('Alice'), email: 'x@y.com' })));
await t('leer perfil ajeno (get)', assertSucceeds(getDoc(doc(B, 'fl_profiles/alice'))));
await t('listar perfiles no', assertFails(getDocs(collection(B, 'fl_profiles'))));
await t('sin sesión no lee perfil', assertFails(getDoc(doc(anon, 'fl_profiles/alice'))));

// Directorio
await t('entrar al buscador', assertSucceeds(setDoc(doc(A, 'fl_directory/alice'), dir('Alice'))));
await t('no meter a otro al buscador', assertFails(setDoc(doc(A, 'fl_directory/bob'), dir('Bob'))));
await t('buscar por prefijo', assertSucceeds(getDocs(query(collection(B, 'fl_directory'), where('prefixes', 'array-contains', 'al')))));
await t('sin sesión no busca', assertFails(getDocs(query(collection(anon, 'fl_directory'), where('prefixes', 'array-contains', 'al')))));
await t('salir del buscador', assertSucceeds(deleteDoc(doc(A, 'fl_directory/alice'))));

// Solicitudes
await t('enviar solicitud', assertSucceeds(setDoc(doc(A, 'fl_friend_requests/alice_bob'), req('alice', 'bob'))));
await t('no enviarla a nombre de otro', assertFails(setDoc(doc(C, 'fl_friend_requests/alice_carl'), req('alice', 'carl'))));
await t('id que no corresponde', assertFails(setDoc(doc(A, 'fl_friend_requests/x_y'), req('alice', 'carl'))));
await t('no nacer aceptada', assertFails(setDoc(doc(A, 'fl_friend_requests/alice_carl'), req('alice', 'carl', { status: 'accepted' }))));
await t('no a mí mismo', assertFails(setDoc(doc(A, 'fl_friend_requests/alice_alice'), req('alice', 'alice'))));
await t('la ve quien la recibe', assertSucceeds(getDoc(doc(B, 'fl_friend_requests/alice_bob'))));
await t('un tercero no la ve', assertFails(getDoc(doc(C, 'fl_friend_requests/alice_bob'))));
await t('listar las mías', assertSucceeds(getDocs(query(collection(B, 'fl_friend_requests'), where('users', 'array-contains', 'bob')))));
await t('no listar las de otro', assertFails(getDocs(query(collection(C, 'fl_friend_requests'), where('users', 'array-contains', 'bob')))));
await t('quien la envía no se la acepta', assertFails(updateDoc(doc(A, 'fl_friend_requests/alice_bob'), { status: 'accepted' })));
await t('no cambiar otros campos al aceptar', assertFails(updateDoc(doc(B, 'fl_friend_requests/alice_bob'), { status: 'accepted', fromName: 'X' })));
await t('quien la recibe la acepta', assertSucceeds(updateDoc(doc(B, 'fl_friend_requests/alice_bob'), { status: 'accepted', respondedAt: serverTimestamp() })));
await t('ya aceptada no se cambia', assertFails(updateDoc(doc(B, 'fl_friend_requests/alice_bob'), { status: 'rejected' })));
await t('un tercero no la borra', assertFails(deleteDoc(doc(C, 'fl_friend_requests/alice_bob'))));
await t('eliminar amigo', assertSucceeds(deleteDoc(doc(A, 'fl_friend_requests/alice_bob'))));
await t('leer una que no existe falla (se maneja en la app)', assertFails(getDoc(doc(A, 'fl_friend_requests/bob_alice'))));

// Lo de siempre sigue cerrado
await t('no leer gastos de otro', assertFails(getDocs(query(collection(B, 'fl_expenses'), where('userId', '==', 'alice')))));

await env.cleanup();
console.log(fails ? `\n${fails} fallaron` : '\nTodas pasaron');
process.exit(fails ? 1 : 0);
