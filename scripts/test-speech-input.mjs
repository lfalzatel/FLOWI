// Prueba de la limpieza del dictado (lib/speechInput.ts): iPhone repite frases en los resultados.
// Uso: node scripts/test-speech-input.mjs   (sale con código 1 si alguna falla)
import { loadTs, tester } from './lib/load-ts.mjs';

const S = await loadTs('lib/speechInput.ts');
const { eq, done } = tester();

eq('una sola parte', S.cleanTranscript(['recibí 50 mil del sueldo']), 'recibí 50 mil del sueldo');
eq('iPhone: versiones crecientes de la misma frase', S.cleanTranscript(['recibí', 'recibí 50 mil', 'recibí 50 mil del sueldo']), 'recibí 50 mil del sueldo');
eq('iPhone: la misma frase repetida', S.cleanTranscript(['ingreso de 20 mil', 'ingreso de 20 mil', 'ingreso de 20 mil']), 'ingreso de 20 mil');
eq('frase doblada dentro de un resultado', S.cleanTranscript(['ingreso de 20 mil ingreso de 20 mil']), 'ingreso de 20 mil');
eq('Android: partes distintas se unen', S.cleanTranscript(['gasté 10 mil en tinto', 'y 20 mil en almuerzo']), 'gasté 10 mil en tinto y 20 mil en almuerzo');
eq('dos gastos iguales dichos a propósito con "y"', S.cleanTranscript(['gasté 5 mil en pan y 5 mil en leche']), 'gasté 5 mil en pan y 5 mil en leche');
eq('evento con varios resultados', S.transcriptFromEvent({ results: [[{ transcript: 'pagué' }], [{ transcript: 'pagué 30 mil de luz' }]] }), 'pagué 30 mil de luz');

done();
