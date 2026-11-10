// Agrupa cualquier categoría guardada en una transacción bajo los grupos del catálogo
// (los mismos que muestra el selector de categorías), para que Inicio, Presupuestos y
// "Mis Categorías" sumen y agrupen igual.
import {
  CUSTOM_GROUP, EXPENSE_CATEGORY_DEFS, EXPENSE_GROUPS, INCOME_CATEGORY_DEFS, MERCHANTS, aliasKey, normalizeText
} from '@/lib/categories';

export type BudgetPillar = 'necesidades' | 'deseos' | 'ahorro';

// Pilar 50/30/20 principal y peso sobre el presupuesto global de cada grupo (los pesos suman 1:
// necesidades 0,50 · deseos 0,30 · ahorro 0,20). Algunas subcategorías tienen un pilar distinto al
// de su grupo (ver SUBCATEGORY_PILLAR).
export const GROUP_BUDGET_CONFIG: Record<string, { icon: string; pillar: BudgetPillar; weight: number }> = {
  'Hogar y servicios': { icon: '🏠', pillar: 'necesidades', weight: 0.20 },
  'Mercado': { icon: '🛒', pillar: 'necesidades', weight: 0.10 },
  'Transporte': { icon: '🚌', pillar: 'necesidades', weight: 0.06 },
  'Salud y cuidado': { icon: '🏥', pillar: 'necesidades', weight: 0.04 },
  'Obligaciones': { icon: '🧾', pillar: 'necesidades', weight: 0.03 },
  'Impuestos': { icon: '🏛️', pillar: 'necesidades', weight: 0.01 },
  'Educación': { icon: '📚', pillar: 'necesidades', weight: 0.03 },
  'Familia y mascotas': { icon: '👨‍👩‍👧', pillar: 'necesidades', weight: 0.03 },
  'Comer fuera': { icon: '🍽️', pillar: 'deseos', weight: 0.06 },
  'Ocio y viajes': { icon: '🎭', pillar: 'deseos', weight: 0.07 },
  'Compras': { icon: '🛍️', pillar: 'deseos', weight: 0.05 },
  'Suscripciones': { icon: '📺', pillar: 'deseos', weight: 0.03 },
  'Deporte': { icon: '⚽', pillar: 'deseos', weight: 0.02 },
  'Negocio': { icon: '💼', pillar: 'deseos', weight: 0.02 },
  'Otros': { icon: '📌', pillar: 'deseos', weight: 0.02 },
  [CUSTOM_GROUP]: { icon: '⭐', pillar: 'deseos', weight: 0.03 },
  'Ahorro e inversión': { icon: '🐷', pillar: 'ahorro', weight: 0.20 },
};

// Subcategorías cuyo pilar no es el de su grupo (regla 50/30/20: necesidades = lo que hay que
// pagar para vivir y trabajar, incluidas las cuotas mínimas de deudas; deseos = estilo de vida)
const SUBCATEGORY_PILLAR: Record<string, BudgetPillar> = {
  'corrientazo / almuerzo': 'necesidades', // almuerzo de trabajo
  'decoracion': 'deseos',
  'remodelacion': 'deseos',
  'lavadero': 'deseos',
  'unas': 'deseos',
  'belleza': 'deseos',
  'bienestar / spa': 'deseos',
  'cumpleanos': 'deseos',
  'navidad / novenas': 'deseos',
  'fechas especiales': 'deseos',
  'tramites / notaria': 'necesidades',
  'lavanderia': 'necesidades',
};

// Pilar 50/30/20 de una subcategoría ya resuelta (label canónico y grupo)
export function pillarOf(label: string, group: string): BudgetPillar {
  return SUBCATEGORY_PILLAR[normalizeText(label)] || GROUP_BUDGET_CONFIG[group]?.pillar || 'deseos';
}

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
  'bbva': 'Obligaciones',
  'bancolombia': 'Obligaciones',
  'nequi': 'Obligaciones',
  'daviplata': 'Obligaciones',
  'davivienda': 'Obligaciones',
  'comida': 'Mercado',
  'finanzas': 'Obligaciones',
};

const groupByLabel = new Map<string, { label: string; group: string }>();
EXPENSE_CATEGORY_DEFS.forEach(c => groupByLabel.set(normalizeText(c.label), { label: c.label, group: c.group }));

// Último recurso para nombres libres que no están en el catálogo
function getGroupByKeywords(text: string): string {
  if (/licor|cerveza|\bbar\b|bares|trago|guaro|aguardiente/.test(text)) return 'Ocio y viajes';
  if (/restaurante|almuerzo|corrientazo|\bcafe|domicilio|empanada|hamburgues|pizza|perro|antojo|helado/.test(text)) return 'Comer fuera';
  if (/mercado|comida|panader|carne|fruta|verdura|\bpan\b|tienda|supermercado|huevo|leche/.test(text)) return 'Mercado';
  if (/arriendo|administracion|\bluz\b|\bagua\b|\bgas\b|internet|celular|telefono|hogar|aseo|energia|claro|movistar|\btigo\b/.test(text)) return 'Hogar y servicios';
  if (/transporte|taxi|\bbus\b|gasolina|parqueadero|peaje|soat|moto|carro|vehiculo/.test(text)) return 'Transporte';
  if (/salud|medic|farmacia|drogueria|doctor|odontolog|\beps\b|belleza|peluquer|barber/.test(text)) return 'Salud y cuidado';
  if (/ahorro|inversion|cdt|acciones|natillera|pension voluntaria/.test(text)) return 'Ahorro e inversión';
  if (/impuesto|4x1000|\biva\b|predial/.test(text)) return 'Impuestos';
  if (/banco|tarjeta|credito|prestamo|cuota|seguro|deuda|interes/.test(text)) return 'Obligaciones';
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
 * Por defecto resuelve gastos; con type 'ingreso' usa los grupos de ingreso.
 * Recibe las categorías del usuario (useCategories) para respetar sus personalizadas, que el
 * selector muestra en el grupo "Personalizadas". Normaliza mayúsculas, tildes y espacios para que
 * "mercado " y "Mercado" sumen en la misma subcategoría.
 */
export function createCategoryResolver(userCategories: { label: string; group?: string; isCustom?: boolean }[]) {
  const custom = new Map<string, string>();
  userCategories.forEach(c => {
    if (c.isCustom) custom.set(normalizeText(c.label), c.label);
  });

  return (rawLabel: string, type: 'gasto' | 'ingreso' = 'gasto'): { label: string; group: string } => {
    const key = aliasKey(rawLabel);

    const customLabel = custom.get(key);
    if (customLabel) return { label: customLabel, group: CUSTOM_GROUP };

    // Los ingresos se agrupan con los grupos de ingreso del catálogo (Trabajo, Negocio...)
    if (type === 'ingreso') {
      const incomeDef = INCOME_CATEGORY_DEFS.find(c => normalizeText(c.label) === key);
      if (incomeDef) return { label: incomeDef.label, group: incomeDef.group };
      return { label: groupByLabel.get(key)?.label || rawLabel.trim(), group: 'Otros ingresos' };
    }

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
    if (income) return { label: income.label, group: 'Ahorro e inversión' };

    const label = rawLabel.trim();
    return { label, group: LEGACY_GROUPS[key] || getGroupByKeywords(key) };
  };
}
