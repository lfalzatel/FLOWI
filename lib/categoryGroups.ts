// Agrupa cualquier categoría guardada en una transacción bajo los grupos del catálogo
// (los mismos que muestra el selector de categorías), para que Inicio, Presupuestos y
// "Mis Categorías" sumen y agrupen igual.
import {
  CUSTOM_GROUP, EXPENSE_CATEGORY_DEFS, EXPENSE_GROUPS, INCOME_CATEGORY_DEFS, MERCHANTS, normalizeText
} from '@/lib/categories';

export type BudgetPillar = 'necesidades' | 'deseos' | 'ahorro';

// Pilar 50/30/20 y peso sobre el presupuesto global de cada grupo (los pesos suman 1)
export const GROUP_BUDGET_CONFIG: Record<string, { icon: string; pillar: BudgetPillar; weight: number }> = {
  'Hogar y servicios': { icon: '🏠', pillar: 'necesidades', weight: 0.20 },
  'Comida': { icon: '🍽️', pillar: 'necesidades', weight: 0.14 },
  'Transporte': { icon: '🚌', pillar: 'necesidades', weight: 0.06 },
  'Salud y cuidado': { icon: '🏥', pillar: 'necesidades', weight: 0.04 },
  'Educación': { icon: '📚', pillar: 'necesidades', weight: 0.03 },
  'Familia y mascotas': { icon: '👨‍👩‍👧', pillar: 'necesidades', weight: 0.03 },
  'Compras': { icon: '🛍️', pillar: 'deseos', weight: 0.07 },
  'Ocio y viajes': { icon: '🎭', pillar: 'deseos', weight: 0.09 },
  'Suscripciones': { icon: '📺', pillar: 'deseos', weight: 0.03 },
  'Deporte': { icon: '⚽', pillar: 'deseos', weight: 0.03 },
  'Negocio': { icon: '💼', pillar: 'deseos', weight: 0.03 },
  'Otros': { icon: '📌', pillar: 'deseos', weight: 0.02 },
  [CUSTOM_GROUP]: { icon: '⭐', pillar: 'deseos', weight: 0.03 },
  'Finanzas': { icon: '🏦', pillar: 'ahorro', weight: 0.20 },
};

export const PILLAR_STYLES: Record<BudgetPillar, { rule: string; color: string; bg: string }> = {
  necesidades: { rule: '50% Necesidades', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  deseos: { rule: '30% Estilo de Vida', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ahorro: { rule: '20% Ahorro', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
};

// Orden de los grupos: el del catálogo y al final las personalizadas
export const BUDGET_GROUP_ORDER = [...EXPENSE_GROUPS, CUSTOM_GROUP];

// Etiquetas antiguas que ya no existen en el catálogo (bancos pasaron a medios de pago)
const LEGACY_GROUPS: Record<string, string> = {
  'medico / salud': 'Salud y cuidado',
  'ropa y calzado': 'Compras',
  'diezmo': 'Otros',
  'bbva': 'Finanzas',
  'bancolombia': 'Finanzas',
  'nequi': 'Finanzas',
  'daviplata': 'Finanzas',
  'davivienda': 'Finanzas',
};

const groupByLabel = new Map<string, { label: string; group: string }>();
EXPENSE_CATEGORY_DEFS.forEach(c => groupByLabel.set(normalizeText(c.label), { label: c.label, group: c.group }));

// Último recurso para nombres libres que no están en el catálogo
function getGroupByKeywords(text: string): string {
  if (/mercado|restaurante|almuerzo|comida|\bcafe|panader|carne|fruta|verdura|licor|cerveza|domicilio|\bpan\b|empanada/.test(text)) return 'Comida';
  if (/arriendo|administracion|\bluz\b|\bagua\b|\bgas\b|internet|celular|telefono|hogar|aseo|energia|claro|movistar|\btigo\b/.test(text)) return 'Hogar y servicios';
  if (/transporte|taxi|\bbus\b|gasolina|parqueadero|peaje|soat|moto|carro|vehiculo/.test(text)) return 'Transporte';
  if (/salud|medic|farmacia|drogueria|doctor|odontolog|\beps\b|belleza|peluquer|barber/.test(text)) return 'Salud y cuidado';
  if (/banco|tarjeta|credito|ahorro|inversion|prestamo|cuota|impuesto|seguro/.test(text)) return 'Finanzas';
  if (/netflix|spotify|youtube|suscripcion|\bapps?\b/.test(text)) return 'Suscripciones';
  if (/deporte|\bgym\b|gimnasio|futbol|ciclismo|\bbici|running/.test(text)) return 'Deporte';
  if (/ropa|calzado|zapato|tecnologia|regalo/.test(text)) return 'Compras';
  if (/educacion|colegio|universidad|matricula|curso|libro/.test(text)) return 'Educación';
  if (/mascota|perro|gato|veterinari|hijo|familia/.test(text)) return 'Familia y mascotas';
  if (/cine|rumba|viaje|hotel|evento|entretenimiento/.test(text)) return 'Ocio y viajes';
  return 'Otros';
}

/**
 * Construye un resolvedor "categoría guardada en la transacción" -> { label canónico, grupo }.
 * Recibe las categorías del usuario (useCategories) para respetar sus personalizadas, que el
 * selector muestra en el grupo "Personalizadas". Normaliza mayúsculas, tildes y espacios para que
 * "mercado " y "Mercado" sumen en la misma subcategoría.
 */
export function createCategoryResolver(userCategories: { label: string; group?: string; isCustom?: boolean }[]) {
  const custom = new Map<string, string>();
  userCategories.forEach(c => {
    if (c.isCustom) custom.set(normalizeText(c.label), c.label);
  });

  return (rawLabel: string): { label: string; group: string } => {
    const key = normalizeText(rawLabel);

    const customLabel = custom.get(key);
    if (customLabel) return { label: customLabel, group: CUSTOM_GROUP };

    const known = groupByLabel.get(key);
    if (known) return known;

    // Un comercio usado como categoría cae en el grupo de su categoría sugerida
    const merchant = MERCHANTS.find(mer => normalizeText(mer.label) === key);
    if (merchant) {
      const group = groupByLabel.get(normalizeText(merchant.categories[0]))?.group || 'Otros';
      return { label: merchant.label, group };
    }

    // Una categoría de ingreso registrada como gasto (ej. "Cesantías")
    const income = INCOME_CATEGORY_DEFS.find(c => normalizeText(c.label) === key);
    if (income) return { label: income.label, group: 'Finanzas' };

    const label = rawLabel.trim();
    return { label, group: LEGACY_GROUPS[key] || getGroupByKeywords(key) };
  };
}
