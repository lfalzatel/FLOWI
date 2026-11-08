import { Transaction } from './firestore';
import { categorizeText } from './voiceParser';
import { detectMerchantInText, normalizeText } from './categories';

// Comercio que aparece en el título ("Pago Claude" → Claude), con su categoría sugerida
export function suggestReminderMerchant(title: string): { merchant: string; category: string } | null {
  const mer = detectMerchantInText(normalizeText(title));
  return mer ? { merchant: mer.label, category: mer.categories[0] } : null;
}

// Categoría sugerida para un recordatorio según su título, sin IA y sin costo:
//  1. el propio historial: gastos cuya descripción comparte palabras con el título
//     ("EPM APTO 101" → los gastos "EPM Apto 101" están en EPM);
//  2. las reglas del dictado por voz y el catálogo de comercios ("Cambio de aceite" → Mecánico).

const GENERIC = new Set(['pago', 'pagar', 'cuota', 'mensual', 'factura', 'recibo', 'recordar', 'recordatorio', 'servicio', 'manizales', 'bogota', 'medellin', 'cali']);
const words = (s: string) => normalizeText(s).split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !GENERIC.has(w) && !/^\d+$/.test(w));

const REMINDER_RULES: [RegExp, string][] = [
  [/aceite|mecanic|revision.*(moto|carro)|mantenimiento.*(moto|carro)|frenos|llanta/, 'Mecánico'],
  [/\bsoat\b/, 'SOAT'],
  [/tecnomecanica|tecno mecanica|\brtm\b/, 'Tecnomecánica'],
  [/predial|impuesto|vehicular|\bdian\b|renta/, 'Impuestos'],
  [/arriendo|alquiler/, 'Arriendo'],
  [/administracion/, 'Administración'],
  [/matricula|semestre/, 'Matrícula'],
  [/colegio|pension escolar|mensualidad.*colegio/, 'Colegio / pensión escolar'],
  [/vacuna|veterinari|desparasit/, 'Veterinaria'],
  [/prepagada/, 'Medicina prepagada'],
  [/\beps\b|cita medica|odontolog|dentista/, 'Salud'],
  [/gimnasio|\bgym\b/, 'Gimnasio'],
  [/tarjeta de credito|pago tarjeta|\btc\b/, 'Tarjeta de crédito'],
  [/credito|prestamo|cuota/, 'Cuota de crédito'],
  [/seguro/, 'Seguros'],
  [/internet|fibra|wifi/, 'Internet'],
  [/celular|plan movil|recarga/, 'Celular / recargas'],
  [/\baguas?\b|acueducto/, 'Agua'],
  [/\bluz\b|energia/, 'Luz'],
  [/\bgas\b/, 'Gas natural'],
  [/natillera/, 'Natillera'],
  [/ahorro|\bcdt\b/, 'Ahorro'],
];

export function suggestReminderCategory(
  title: string,
  transactions: Transaction[],
  categories: { label: string; isCustom?: boolean; type?: string }[],
): string | null {
  const t = title.trim();
  if (t.length < 3) return null;
  const key = normalizeText(t);

  // El título es justo una categoría ("Netflix", "Agua")
  const exact = categories.find(c => normalizeText(c.label) === key);
  if (exact) return exact.label;

  const titleWords = words(t);
  if (titleWords.length) {
    const votes = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== 'gasto' || !tx.category) continue;
      const desc = words(`${tx.description || ''} ${tx.merchant || ''}`);
      const hits = titleWords.filter(w => desc.includes(w)).length;
      if (hits) votes.set(tx.category, (votes.get(tx.category) || 0) + hits);
    }
    const best = Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0];
    if (best) return best[0];
  }

  // Palabras típicas de recordatorios que el dictado no cubre
  for (const [re, cat] of REMINDER_RULES) {
    if (re.test(key) && categories.some(c => c.label === cat)) return cat;
  }

  const rule = categorizeText(t, 'gasto', categories);
  return rule.category && rule.category !== 'Otros' ? rule.category : null;
}
