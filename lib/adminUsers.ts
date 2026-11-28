// Lista de "Gestión de usuarios" (solo administrador).
// Junta dos fuentes que no siempre coinciden:
//  - las cuentas de inicio de sesión de Firebase (función listarUsuarios): todas las personas que
//    entraron, con el nombre y la foto de Google y si son invitados de verdad (anónimos);
//  - los perfiles de Firestore (users/{uid}): rol, días de uso, registros…
// Hay cuentas sin perfil (falló el paso de crear el perfil al entrar) y perfiles que dicen
// "Invitado" aunque la persona ya entró con Google; por eso no basta con leer solo los perfiles.
import type { UserProfile } from './firestore';

export interface AuthAccount {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  providers: string[];
  anonymous: boolean;
  createdAt: string | null;
  lastSignIn: string | null;
}

export interface AdminUser extends UserProfile {
  id: string;
  /** Entró con "Probar sin cuenta" y no ha vinculado Google */
  isGuest: boolean;
  /** Tiene cuenta de inicio de sesión pero nunca se creó su perfil en la base */
  noProfile?: boolean;
  lastSignIn?: string | null;
}

const GUEST_NAME = 'Invitado';

/** Invitado según el perfil solamente (cuando no se pudo leer la lista de cuentas). */
export function looksLikeGuest(p: UserProfile): boolean {
  return (p.name === GUEST_NAME || !p.name) && !p.email;
}

export function mergeAdminUsers(profiles: UserProfile[], accounts: AuthAccount[] | null): AdminUser[] {
  if (!accounts) {
    return profiles.map(p => ({ ...p, id: p.id!, isGuest: looksLikeGuest(p) }));
  }
  const byId = new Map(profiles.map(p => [p.id!, p]));
  const out: AdminUser[] = [];
  for (const a of accounts) {
    const p = byId.get(a.uid);
    byId.delete(a.uid);
    const profileName = p?.name && !(p.name === GUEST_NAME && !a.anonymous) ? p.name : '';
    out.push({
      ...(p || {}),
      id: a.uid,
      name: a.anonymous ? (profileName || GUEST_NAME) : (profileName || a.name || ''),
      email: p?.email || a.email || '',
      photoURL: p?.photoURL || a.photoURL || '',
      isGuest: a.anonymous,
      noProfile: !p,
      lastSignIn: a.lastSignIn,
      createdAt: p?.createdAt ?? (a.createdAt ? new Date(a.createdAt) : undefined),
    });
  }
  // Perfiles sin cuenta de inicio de sesión (p. ej. cuentas borradas): se dejan al final
  for (const p of Array.from(byId.values())) out.push({ ...p, id: p.id!, isGuest: looksLikeGuest(p) });
  return out;
}

/** Cuentas con nombre primero (las de uso más reciente arriba), invitados al final. */
export function sortAdminUsers(list: AdminUser[]): AdminUser[] {
  const recent = (u: AdminUser) => u.lastActiveDay || (u.lastSignIn ? new Date(u.lastSignIn).toISOString().slice(0, 10) : '');
  return [...list].sort((a, b) => Number(a.isGuest) - Number(b.isGuest) || recent(b).localeCompare(recent(a)));
}

export async function loadAdminUsers(): Promise<{ users: AdminUser[]; fromAuth: boolean }> {
  const { getAllUsers } = await import('./firestore');
  const profilesP = getAllUsers();
  let accounts: AuthAccount[] | null = null;
  try {
    const [{ getFunctions, httpsCallable }, { app }] = await Promise.all([import('firebase/functions'), import('./firebase')]);
    const fn = httpsCallable<void, { users: AuthAccount[] }>(getFunctions(app, 'us-central1'), 'listarUsuarios');
    accounts = (await fn()).data.users;
  } catch (e) {
    console.warn('No se pudo leer la lista de cuentas; se muestran solo los perfiles.', e);
  }
  return { users: sortAdminUsers(mergeAdminUsers(await profilesP, accounts)), fromAuth: !!accounts };
}
