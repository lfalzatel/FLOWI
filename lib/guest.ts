// Modo invitado ("Probar sin cuenta"): entrar sin cuenta de Google (usuario anónimo de Firebase).
//
// Durante la prueba cerrada de Google Play está APAGADO en la web real: el botón se ve, pero al
// tocarlo avisa que no está disponible en esta versión. Para volver a abrirlo a todo el mundo,
// cambia GUEST_MODE_OPEN a true y publica.
export const GUEST_MODE_OPEN = false;

/** ¿Se puede entrar como invitado aquí? Siempre en el computador de desarrollo y en el sitio de
 *  pruebas (staging), para que se puedan probar pantallas sin usar una cuenta real. */
export function guestModeAvailable(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  if (GUEST_MODE_OPEN) return true;  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname) || hostname.includes('--staging');
}
