// Ayudas para el micrófono (reconocimiento de voz del navegador).
// En iPhone (Safari) el reconocimiento se comporta distinto que en Android:
//  - no se cierra solo al dejar de hablar, así que FLOWI lo cierra tras un silencio;
//  - repite la frase en sus resultados ("recibí 50 mil", "recibí 50 mil del sueldo"…), y al unirlos
//    salían varios ingresos iguales. Aquí se arma una sola frase sin repeticiones.

/** Une los resultados del reconocimiento en una sola frase, sin partes repetidas. */
export function cleanTranscript(parts: string[]): string {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const list = parts.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const keep: string[] = [];
  list.forEach((p, i) => {
    const n = norm(p);
    // Se descarta si otra parte ya la contiene (una versión más completa de la misma frase)
    const covered = list.some((q, j) => j !== i && norm(q).includes(n) && (norm(q).length > n.length || j > i));
    if (!covered) keep.push(p);
  });
  let text = keep.join(' ');
  // Frase dicha dos veces seguidas dentro del mismo resultado ("a b c a b c")
  const words = text.split(' ');
  for (let len = Math.floor(words.length / 2); len >= 2; len--) {
    for (let s = 0; s + 2 * len <= words.length; s++) {
      const a = norm(words.slice(s, s + len).join(' '));
      const b = norm(words.slice(s + len, s + 2 * len).join(' '));
      if (a === b) { words.splice(s + len, len); text = words.join(' '); s--; }
    }
  }
  return text.trim();
}

/** Lee el texto de un evento `onresult` (todos sus resultados, no solo los nuevos). */
export function transcriptFromEvent(event: any): string {
  const parts: string[] = [];
  for (let i = 0; i < event.results.length; i++) parts.push(event.results[i][0]?.transcript || '');
  return cleanTranscript(parts);
}

/** Tiempo de silencio tras el que se cierra el micrófono, y máximo de escucha. */
export const SILENCE_MS = 1800;
export const MAX_LISTEN_MS = 15000;
