// Prueba de la lista de "Gestión de usuarios" (lib/adminUsers.ts): cruza las cuentas de inicio de
// sesión con los perfiles de Firestore.
// Uso: node scripts/test-admin-users.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const A = await loadTs('lib/adminUsers.ts');
const { eq, done } = tester();

const acc = (uid, o = {}) => ({ uid, name: '', email: '', photoURL: '', providers: [], anonymous: false, createdAt: null, lastSignIn: null, ...o });
const google = (uid, name, email, photo) => acc(uid, { name, email, photoURL: photo, providers: ['google.com'] });

const profiles = [
  { id: 'g1', name: 'Ana Pérez', email: 'ana@x.co', photoURL: 'https://f/ana', role: 'Usuario', activeDays: 3 },
  { id: 'g2', name: 'Invitado', email: '', photoURL: '', role: 'Usuario' },   // vinculó Google, el perfil quedó viejo
  { id: 'a1', name: 'Invitado', email: '', photoURL: '', role: 'Usuario' },   // invitado de verdad
  { id: 'old', name: 'Borrada', email: 'b@x.co' },                            // sin cuenta de inicio de sesión
];
const accounts = [
  google('g1', 'Ana Pérez', 'ana@x.co', 'https://f/ana'),
  google('g2', 'Beto Ruiz', 'beto@x.co', 'https://f/beto'),
  google('g3', 'Caro Gil', 'caro@x.co', 'https://f/caro'),                    // nunca se creó su perfil
  acc('a1', { anonymous: true }),
  acc('a2', { anonymous: true }),                                             // invitado sin perfil
];

const list = A.mergeAdminUsers(profiles, accounts);
const by = Object.fromEntries(list.map(u => [u.id, u]));

eq('salen todas las cuentas y el perfil suelto', list.length, 6);
eq('cuenta con perfil conserva su nombre', by.g1.name, 'Ana Pérez');
eq('conserva datos del perfil (rol, días)', by.g1.activeDays, 3);
eq('Google con perfil "Invitado" muestra su nombre real', by.g2.name, 'Beto Ruiz');
eq('… y su foto de Google', by.g2.photoURL, 'https://f/beto');
eq('… y su correo', by.g2.email, 'beto@x.co');
eq('… y NO es invitado', by.g2.isGuest, false);
eq('cuenta de Google sin perfil aparece', by.g3.name, 'Caro Gil');
eq('… marcada sin perfil', by.g3.noProfile, true);
eq('… con foto', by.g3.photoURL, 'https://f/caro');
eq('anónimo es invitado', by.a1.isGuest, true);
eq('anónimo sin perfil es invitado', by.a2.isGuest, true);
eq('anónimo sin perfil se llama Invitado', by.a2.name, 'Invitado');
eq('perfil sin cuenta queda en la lista', by.old.name, 'Borrada');

const sorted = A.sortAdminUsers(list);
eq('invitados al final', sorted.slice(-2).every(u => u.isGuest), true);

// Sin la lista de cuentas (falla la función): se usa solo el perfil
const only = A.mergeAdminUsers(profiles, null);
eq('sin cuentas: invitado por perfil', only.find(u => u.id === 'a1').isGuest, true);
eq('sin cuentas: perfil con correo no es invitado', only.find(u => u.id === 'g1').isGuest, false);
eq('sin cuentas: salen solo los perfiles', only.length, 4);

done();
