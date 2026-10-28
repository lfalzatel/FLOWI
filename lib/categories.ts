// Catálogo de categorías, comercios y medios de pago de FLOWI.
// Separa "en qué gastaste" (categoría), "dónde" (comercio) y "con qué pagaste" (medio de pago).

export type TransactionKind = 'gasto' | 'ingreso';

export interface CategoryDef {
  label: string;
  icon: string;
  color: string;
  group: string;
  type: TransactionKind;
}

export interface MerchantDef {
  label: string;
  icon: string;
  color: string;
  // La primera categoría es la sugerida al elegir el comercio
  categories: string[];
}

export interface PaymentMethodDef {
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_GROUPS = [
  'Comida', 'Hogar y servicios', 'Transporte', 'Salud y cuidado', 'Compras', 'Suscripciones',
  'Ocio y viajes', 'Familia y mascotas', 'Educación', 'Finanzas', 'Deporte', 'Negocio', 'Otros',
];

export const INCOME_GROUPS = ['Trabajo', 'Negocio', 'Rentas e inversiones', 'Otros ingresos'];

export const CUSTOM_GROUP = 'Personalizadas';

const g = (group: string, items: [string, string, string][]): CategoryDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, group, type: 'gasto' }));

const i = (group: string, items: [string, string, string][]): CategoryDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, group, type: 'ingreso' }));

export const EXPENSE_CATEGORY_DEFS: CategoryDef[] = [
  ...g('Comida', [
    ['Mercado', '🛒', '#10B981'],
    ['Restaurantes', '🍽️', '#FF5B5B'],
    ['Domicilios', '🛵', '#F97316'],
    ['Corrientazo / almuerzo', '🍛', '#D97706'],
    ['Comidas rápidas', '🍔', '#EF4444'],
    ['Café y Antojos', '☕', '#D1A153'],
    ['Panadería', '🥐', '#D97706'],
    ['Tienda / Minimercado', '🏪', '#10B981'],
    ['Verduras y Frutas', '🥦', '#22C55E'],
    ['Carnicería', '🥩', '#EF4444'],
    ['Licores y Bares', '🍺', '#F5A623'],
  ]),
  ...g('Hogar y servicios', [
    ['Arriendo', '🏢', '#F59E0B'],
    ['Administración', '🔑', '#8B5CF6'],
    ['Luz', '💡', '#F5A623'],
    ['Agua', '💧', '#3B82F6'],
    ['Gas natural', '🔥', '#EF4444'],
    ['Gas pipeta', '🧯', '#EF4444'],
    ['Internet', '📶', '#06B6D4'],
    ['Celular / recargas', '📱', '#E11D48'],
    ['Aseo del hogar', '🧹', '#6366F1'],
    ['Empleada', '🧽', '#0EA5E9'],
    ['Reparaciones', '🔨', '#64748B'],
    ['Mantenimiento', '🔧', '#64748B'],
    ['Muebles', '🛋️', '#D97706'],
    ['Electrodomésticos', '🔌', '#3B82F6'],
    ['Decoración', '🪴', '#22C55E'],
    ['Remodelación', '👷', '#F59E0B'],
    ['Mudanza', '📦', '#8B4513'],
    ['Hogar', '🏠', '#00E5A0'],
  ]),
  ...g('Transporte', [
    ['Transporte', '🚌', '#F5A623'],
    ['Taxi / plataformas', '🚕', '#FBBF24'],
    ['Bus intermunicipal', '🚍', '#0EA5E9'],
    ['Gasolina', '⛽', '#EF4444'],
    ['Parqueadero', 'parqueadero', '#1E3A8A'],
    ['Peajes', '🛣️', '#6B7280'],
    ['SOAT', '🚗', '#10B981'],
    ['Tecnomecánica', '🔧', '#64748B'],
    ['Seguro del vehículo', '🛡️', '#3B82F6'],
    ['Mecánico', '🔩', '#64748B'],
    ['Lavadero', '🧼', '#06B6D4'],
    ['Llantas', '🛞', '#1E293B'],
    ['Multas', '🛑', '#EF4444'],
  ]),
  ...g('Salud y cuidado', [
    ['Salud', '🏥', '#3B82F6'],
    ['Farmacia', '💊', '#14B8A6'],
    ['Medicina prepagada', '🩺', '#0EA5E9'],
    ['Odontología', '🦷', '#14B8A6'],
    ['Exámenes', '🧪', '#8B5CF6'],
    ['Óptica', '👓', '#6366F1'],
    ['Psicología', '🧠', '#EC4899'],
    ['Peluquería / barbería', '💈', '#F43F5E'],
    ['Uñas', '💅', '#EC4899'],
    ['Belleza', '💄', '#EC4899'],
    ['Cuidado personal', '🧴', '#14B8A6'],
    ['Bienestar / Spa', '💆', '#EC4899'],
  ]),
  ...g('Compras', [
    ['Ropa', '👕', '#8B5CF6'],
    ['Calzado', '👟', '#EC4899'],
    ['Accesorios', '👜', '#D946EF'],
    ['Tecnología', '💻', '#3B82F6'],
    ['Compras en línea', '📦', '#F59E0B'],
    ['Regalos', '🎁', '#EC4899'],
  ]),
  ...g('Suscripciones', [
    ['Suscripciones', '📺', '#E50914'],
    ['Apps e IA', '🤖', '#D97757'],
    ['Música', '🎵', '#1DB954'],
    ['Nube / almacenamiento', '☁️', '#4285F4'],
    ['Videojuegos', '🎮', '#A855F7'],
  ]),
  ...g('Ocio y viajes', [
    ['Entretenimiento', '🎭', '#A855F7'],
    ['Cine', 'cine', '#7F1D1D'],
    ['Rumba', '🪩', '#D946EF'],
    ['Eventos', '🎫', '#8B5CF6'],
    ['Viajes', '✈️', '#06B6D4'],
    ['Hoteles', '🏨', '#0EA5E9'],
    ['Hobbies', '🎨', '#F97316'],
    ['Apuestas', '🎲', '#F59E0B'],
    ['Chance / lotería', '🎟️', '#F59E0B'],
  ]),
  ...g('Familia y mascotas', [
    ['Hijos', '🧒', '#F59E0B'],
    ['Pañales y bebé', '🍼', '#F472B6'],
    ['Colegio / pensión escolar', '🏫', '#8B5CF6'],
    ['Uniformes', '👔', '#6366F1'],
    ['Cuota alimentaria', '⚖️', '#64748B'],
    ['Ayuda familiar', '🤝', '#EC4899'],
    ['Cumpleaños', '🎂', '#EC4899'],
    ['Navidad / novenas', '🎄', '#22C55E'],
    ['Fechas especiales', '💐', '#F43F5E'],
    ['Mascotas', '🐾', '#F59E0B'],
    ['Veterinaria', '🩺', '#14B8A6'],
    ['Guardería', '🐕', '#F59E0B'],
  ]),
  ...g('Educación', [
    ['Educación', '📚', '#8B5CF6'],
    ['Matrícula', '🎓', '#F59E0B'],
    ['Cursos en línea', '🧑‍💻', '#A435F0'],
    ['Idiomas', '🗣️', '#06B6D4'],
    ['Libros', '📖', '#D97706'],
    ['Útiles', '✏️', '#F5A623'],
  ]),
  ...g('Finanzas', [
    ['Tarjeta de crédito', '💳', '#F59E0B'],
    ['Cuota de crédito', '🏦', '#F59E0B'],
    ['Cuota de manejo', '🧾', '#64748B'],
    ['4x1000', '🧾', '#64748B'],
    ['Intereses', '📉', '#EF4444'],
    ['Impuestos', '🏛️', '#EF4444'],
    ['Seguros', '🛡️', '#3B82F6'],
    ['Ahorro', '🐷', '#F472B6'],
    ['Natillera', '🫙', '#10B981'],
    ['Fondo de empleados', '🤝', '#0EA5E9'],
    ['Pensión voluntaria', '🧓', '#3B82F6'],
    ['Inversiones', '📈', '#3B82F6'],
    ['Bolsa / Acciones', '📊', '#3B82F6'],
    ['Préstamos prestados', '💸', '#059669'],
  ]),
  ...g('Deporte', [
    ['Gimnasio', '🏋️‍♂️', '#1E293B'],
    ['Fútbol', '⚽', '#0F766E'],
    ['Ciclismo', '🚲', '#0369A1'],
    ['Running', '🏃‍♂️', '#B45309'],
    ['Artículos deportivos', '🎽', '#0082C3'],
  ]),
  ...g('Negocio', [
    ['Inventario', '📦', '#8B4513'],
    ['Insumos', '🧰', '#10B981'],
    ['Nómina', '💼', '#3B82F6'],
  ]),
  ...g('Otros', [
    ['Diezmo / ofrenda', '⛪', '#F59E0B'],
    ['Donaciones', '💝', '#EC4899'],
    ['Trámites / notaría', '📝', '#64748B'],
    ['Envíos / mensajería', '📮', '#F97316'],
    ['Lavandería', '🧺', '#06B6D4'],
    ['Otros', '📌', '#6B7280'],
  ]),
];

export const INCOME_CATEGORY_DEFS: CategoryDef[] = [
  ...i('Trabajo', [
    ['Sueldo', '💰', '#00E5A0'],
    ['Prima', '🎉', '#F59E0B'],
    ['Cesantías', '🏦', '#10B981'],
    ['Vacaciones', '🏖️', '#06B6D4'],
    ['Bonificación', '🏆', '#F59E0B'],
    ['Horas extra', '⏱️', '#3B82F6'],
    ['Comisiones', '🤝', '#8B5CF6'],
    ['Propinas', '🪙', '#FBBF24'],
    ['Freelance', '💻', '#3B82F6'],
  ]),
  ...i('Negocio', [
    ['Venta', '🏷️', '#10B981'],
    ['Venta por catálogo', '📒', '#EC4899'],
    ['Negocio propio', '🏪', '#F97316'],
  ]),
  ...i('Rentas e inversiones', [
    ['Arriendo recibido', '🏘️', '#10B981'],
    ['Rendimientos / intereses', '📈', '#3B82F6'],
    ['Dividendos', '📊', '#3B82F6'],
  ]),
  ...i('Otros ingresos', [
    ['Transferencia', '📲', '#06B6D4'],
    ['Reembolso / devolución', '↩️', '#64748B'],
    ['Remesas del exterior', '🌎', '#0EA5E9'],
    ['Subsidio', '🏛️', '#8B5CF6'],
    ['Pensión (jubilación)', '🧓', '#3B82F6'],
    ['Natillera recibida', '🫙', '#10B981'],
    ['Regalo recibido', '🎁', '#EC4899'],
    ['Préstamo recibido', '🤲', '#F59E0B'],
    ['Premio / lotería', '🍀', '#22C55E'],
    ['Otros ingresos', '➕', '#6B7280'],
  ]),
];

const m = (categories: string[], items: [string, string, string][]): MerchantDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, categories }));

export const MERCHANTS: MerchantDef[] = [
  ...m(['Mercado'], [
    ['Éxito', 'exito', '#FFE800'],
    ['Carulla', 'carulla', '#005A36'],
    ['Jumbo', 'jumbo', '#00A859'],
    ['Olímpica', 'olimpica', '#E30613'],
    ['D1', 'd1', '#E30613'],
    ['Ara', '🏬', '#E30613'],
    ['Isimo', '🏬', '#F97316'],
    ['Makro', '🏬', '#FBBF24'],
    ['PriceSmart', '🏬', '#0054A6'],
    ['Euro', '🏬', '#0033A0'],
    ['Surtimax', '🏬', '#E30613'],
  ]),
  ...m(['Farmacia'], [
    ['Farmatodo', '💊', '#0054A6'],
    ['Cruz Verde', '💊', '#00A859'],
    ['La Rebaja', '💊', '#E30613'],
    ['Locatel', '💊', '#00A859'],
    ['Cafam', '💊', '#0054A6'],
  ]),
  ...m(['Restaurantes', 'Comidas rápidas', 'Domicilios'], [
    ['Crepes & Waffles', '🥞', '#8B4513'],
    ['El Corral', '🍔', '#E30613'],
    ['KFC', '🍗', '#E30613'],
    ["McDonald's", '🍟', '#FBBF24'],
    ["Domino's", '🍕', '#0054A6'],
    ['Kokoriko', '🍗', '#F97316'],
    ['Frisby', 'frisby', '#E30613'],
    ['Sándwich Qbano', '🥪', '#F59E0B'],
    ['Presto', '🍔', '#E30613'],
    ['Subway', '🥪', '#00A859'],
  ]),
  ...m(['Café y Antojos'], [
    ['Juan Valdez', '☕', '#8B4513'],
    ['Tostao', '☕', '#1E293B'],
    ['Starbucks', '☕', '#00704A'],
    ['Popsy', 'popsy', '#E10074'],
  ]),
  ...m(['Domicilios', 'Mercado'], [
    ['Rappi', 'rappi', '#FF441F'],
  ]),
  ...m(['Taxi / plataformas'], [
    ['Uber', 'uber', '#000000'],
    ['DiDi', '🚕', '#F97316'],
    ['InDrive', '🚕', '#22C55E'],
    ['Cabify', '🚕', '#7C3AED'],
    ['Picap', '🏍️', '#F59E0B'],
  ]),
  ...m(['Transporte'], [
    ['TransMilenio', '🚌', '#E30613'],
    ['Metro de Medellín', '🚇', '#0054A6'],
    ['MIO Cali', '🚌', '#0054A6'],
  ]),
  ...m(['Gasolina'], [
    ['Terpel', '⛽', '#E30613'],
    ['Primax', '⛽', '#0054A6'],
    ['Biomax', '⛽', '#00A859'],
    ['Texaco', '⛽', '#E30613'],
  ]),
  ...m(['Viajes'], [
    ['Avianca', '✈️', '#E30613'],
    ['LATAM', '✈️', '#1E3A8A'],
    ['Wingo', '✈️', '#7C3AED'],
    ['JetSMART', '✈️', '#0054A6'],
  ]),
  ...m(['Ropa'], [
    ['Zara', 'zara', '#000000'],
    ['H&M', 'h&m', '#CD102D'],
    ['Arturo Calle', '👔', '#1E293B'],
    ['Studio F', '👗', '#000000'],
    ['Koaj', '👕', '#1E293B'],
    ['Tennis', '👕', '#1E293B'],
    ['Offcorss', '👶', '#0EA5E9'],
    ['Pat Primo', '👕', '#E30613'],
  ]),
  ...m(['Calzado'], [
    ['Vélez', '👞', '#8B4513'],
    ['Bosi', '👞', '#1E293B'],
    ['Spring Step', '👟', '#0054A6'],
    ['Bata', '👞', '#E30613'],
  ]),
  ...m(['Artículos deportivos', 'Calzado', 'Ropa'], [
    ['Nike', 'nike', '#000000'],
    ['Adidas', 'adidas', '#000000'],
    ['Decathlon', 'decathlon', '#0082C3'],
  ]),
  ...m(['Accesorios'], [
    ['Totto', '🎒', '#E30613'],
    ['Mario Hernández', '👜', '#8B4513'],
  ]),
  ...m(['Tecnología', 'Electrodomésticos'], [
    ['Ktronix', 'ktronix', '#FF6A00'],
    ['Alkosto', '🛍️', '#0054A6'],
    ['Falabella', '🛍️', '#22C55E'],
  ]),
  ...m(['Compras en línea'], [
    ['Mercado Libre', '📦', '#FBBF24'],
    ['Amazon', '📦', '#F59E0B'],
    ['Temu', '📦', '#F97316'],
    ['Shein', '📦', '#000000'],
    ['AliExpress', '📦', '#E30613'],
    ['Dollarcity', '🛍️', '#22C55E'],
  ]),
  ...m(['Hogar', 'Reparaciones', 'Remodelación'], [
    ['Homecenter', 'homecenter', '#004B87'],
    ['Easy', '🛠️', '#E30613'],
  ]),
  ...m(['Útiles', 'Libros'], [
    ['Panamericana', 'panamericana', '#0A2240'],
  ]),
  ...m(['Cursos en línea'], [
    ['Platzi', '🧑‍💻', '#98CA3F'],
    ['Udemy', 'udemy', '#A435F0'],
    ['Coursera', 'coursera', '#0056D2'],
  ]),
  ...m(['Idiomas', 'Apps e IA'], [
    ['Duolingo', '🦉', '#58CC02'],
  ]),
  ...m(['Suscripciones'], [
    ['Netflix', 'netflix', '#E50914'],
    ['Disney+', '📺', '#113CCF'],
    ['Max', '📺', '#002BE7'],
    ['Prime Video', '📺', '#00A8E1'],
    ['YouTube', 'youtube', '#FF0000'],
    ['Paramount+', '📺', '#0064FF'],
    ['Crunchyroll', '📺', '#F47521'],
  ]),
  ...m(['Música'], [
    ['Spotify', 'spotify', '#1DB954'],
    ['YT Music', 'yt music', '#FF0000'],
    ['Apple Music', '🎵', '#FA243C'],
  ]),
  ...m(['Apps e IA'], [
    ['Claude', '🤖', '#D97757'],
    ['ChatGPT', '🤖', '#10A37F'],
    ['Gemini', '🤖', '#4285F4'],
    ['Canva', '🎨', '#00C4CC'],
    ['Microsoft 365', '💼', '#0078D4'],
    ['Play Store', 'play_store', '#607D8B'],
  ]),
  ...m(['Nube / almacenamiento'], [
    ['Google', 'google', '#4285F4'],
    ['iCloud', '☁️', '#3B82F6'],
  ]),
  ...m(['Videojuegos'], [
    ['PlayStation', '🎮', '#003791'],
    ['Xbox', '🎮', '#107C10'],
    ['Steam', '🎮', '#1B2838'],
  ]),
  ...m(['Internet', 'Celular / recargas'], [
    ['Claro Hogar', 'claro_hogar', '#E11D48'],
    ['Claro Móvil', 'claro_movil', '#E11D48'],
    ['Movistar', '📡', '#019DF4'],
    ['Tigo', '📡', '#00377B'],
    ['WOM', '📡', '#7C3AED'],
    ['ETB', '📡', '#0054A6'],
  ]),
  ...m(['Luz', 'Agua', 'Gas natural'], [
    ['EPM', 'epm', '#00A859'],
    ['Enel', '⚡', '#0555FA'],
    ['Celsia', '⚡', '#E30613'],
    ['Air-e', '⚡', '#0054A6'],
    ['Afinia', '⚡', '#F97316'],
  ]),
  ...m(['Gas natural'], [
    ['Vanti', '🔥', '#0054A6'],
    ['Efigas', 'efigas', '#009EE0'],
    ['Alcanos', 'alcanos', '#0054A6'],
    ['Gases del Caribe', '🔥', '#E30613'],
  ]),
  ...m(['Salud', 'Medicina prepagada'], [
    ['Sura', 'sura', '#0033A0'],
    ['Colsanitas', 'colsanitas', '#00467F'],
    ['Sanitas', '🩺', '#00467F'],
    ['Nueva EPS', 'nueva eps', '#005A9C'],
    ['Salud Total', '🩺', '#00A859'],
    ['Compensar', 'compensar', '#00873A'],
    ['Comfama', 'comfama', '#FF6A00'],
    ['Colsubsidio', 'colsubsidio', '#E30613'],
  ]),
  ...m(['Gimnasio'], [
    ['Smart Fit', '🏋️‍♂️', '#FBBF24'],
    ['Bodytech', '🏋️‍♂️', '#E30613'],
  ]),
  ...m(['Cine'], [
    ['Cine Colombia', 'cine', '#E30613'],
    ['Cinemark', 'cine', '#E30613'],
    ['Procinal', 'cine', '#0054A6'],
  ]),
  ...m(['Cuota de crédito', 'Ahorro', 'Cesantías'], [
    ['FNA', 'fna', '#003DA5'],
  ]),
  ...m(['Pensión voluntaria', 'Cesantías'], [
    ['Porvenir', '🏦', '#E30613'],
    ['Protección', '🏦', '#0054A6'],
    ['Colfondos', '🏦', '#00A859'],
  ]),
];

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { label: 'Efectivo', icon: '💵', color: '#22C55E' },
  { label: 'Nequi', icon: 'nequi', color: '#D946EF' },
  { label: 'Daviplata', icon: 'daviplata', color: '#E30613' },
  { label: 'Tarjeta débito', icon: '💳', color: '#3B82F6' },
  { label: 'Tarjeta crédito', icon: '💳', color: '#F59E0B' },
  { label: 'Bancolombia', icon: 'bancolombia', color: '#FBBF24' },
  { label: 'Davivienda', icon: 'davivienda', color: '#E30613' },
  { label: 'BBVA', icon: 'bbva', color: '#1D4ED8' },
  { label: 'Nu', icon: '💜', color: '#820AD1' },
  { label: 'Lulo Bank', icon: '🟢', color: '#22C55E' },
  { label: 'RappiPay', icon: '🧡', color: '#FF441F' },
  { label: 'Banco de Bogotá', icon: '🏦', color: '#0054A6' },
  { label: 'AV Villas', icon: '🏦', color: '#0054A6' },
  { label: 'Banco Caja Social', icon: '🏦', color: '#0054A6' },
  { label: 'Addi', icon: '🛍️', color: '#0054A6' },
  { label: 'Sistecrédito', icon: '🛍️', color: '#F97316' },
  { label: 'Transferencia', icon: '📲', color: '#06B6D4' },
];

// Etiquetas antiguas que ya no se ofrecen como categoría pero siguen en transacciones guardadas
const LEGACY_CATEGORIES: { label: string; icon: string; color: string }[] = [
  { label: 'Médico / Salud', icon: '🏥', color: '#3B82F6' },
  { label: 'Ropa y Calzado', icon: '👟', color: '#EC4899' },
  { label: 'Diezmo', icon: '⛪', color: '#F59E0B' },
];

export const BASE_CATEGORY_DEFS: CategoryDef[] = [...EXPENSE_CATEGORY_DEFS, ...INCOME_CATEGORY_DEFS];

// Normaliza para búsquedas sin tildes ni mayúsculas
export function normalizeText(text: string): string {
  return (text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Inserta cortes silábicos invisibles (\u00AD) en palabras largas para que en tarjetas
// angostas se partan con guion ("Entreteni-miento") y no a mitad de sílaba
export function softHyphenate(label: string): string {
  return label.replace(/\S{10,}/g, word =>
    word.replace(/([aeiouáéíóú])(?=[bcdfghjklmnñpqrstvwxyz][aeiouáéíóú])/gi, '$1\u00AD')
  );
}

// Busca icono y color para cualquier etiqueta guardada (categoría, comercio, medio de pago o antigua)
export function findCatalogEntry(label: string): { label: string; icon: string; color: string } | undefined {
  const key = normalizeText(label);
  if (!key) return undefined;
  const pools = [BASE_CATEGORY_DEFS, MERCHANTS, PAYMENT_METHODS, LEGACY_CATEGORIES];
  for (const pool of pools) {
    const found = pool.find(item => normalizeText(item.label) === key);
    if (found) return found;
  }
  return undefined;
}

export function findMerchant(label: string): MerchantDef | undefined {
  const key = normalizeText(label);
  return MERCHANTS.find(mer => normalizeText(mer.label) === key);
}

export function getMerchantsForCategory(category: string): MerchantDef[] {
  return MERCHANTS.filter(mer => mer.categories.includes(category));
}

// Detecta un comercio conocido dentro de un texto libre (ej. "mercado en jumbo")
export function detectMerchantInText(text: string): MerchantDef | undefined {
  const normalized = ` ${normalizeText(text).replace(/[^a-z0-9&+ ]/g, ' ')} `;
  return MERCHANTS.find(mer => {
    const name = normalizeText(mer.label).replace(/[^a-z0-9&+ ]/g, ' ').trim();
    return name.length >= 2 && normalized.includes(` ${name} `);
  });
}

// --- Uso frecuente (por dispositivo) para ordenar categorías y medios de pago ---

const USAGE_KEY = 'flowi_selection_usage';

type UsageMap = Record<string, { count: number; last: number }>;
type UsageStore = Record<string, UsageMap>;

function readUsage(): UsageStore {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function recordUsage(bucket: string, label: string) {
  if (!label) return;
  try {
    const store = readUsage();
    const map = store[bucket] || {};
    const prev = map[label] || { count: 0, last: 0 };
    map[label] = { count: prev.count + 1, last: Date.now() };
    store[bucket] = map;
    localStorage.setItem(USAGE_KEY, JSON.stringify(store));
  } catch {
    // Sin almacenamiento disponible: se ignora
  }
}

// Más usadas primero (frecuencia con peso por recencia)
export function getFrequent(bucket: string): string[] {
  const map = readUsage()[bucket] || {};
  const now = Date.now();
  return Object.entries(map)
    .map(([label, { count, last }]) => {
      const days = (now - last) / 86_400_000;
      return { label, score: count / (1 + days / 30) };
    })
    .sort((a, b) => b.score - a.score)
    .map(e => e.label);
}

export function getRecent(bucket: string): string[] {
  const map = readUsage()[bucket] || {};
  return Object.entries(map)
    .sort((a, b) => b[1].last - a[1].last)
    .map(([label]) => label);
}

export const DEFAULT_FREQUENT: Record<TransactionKind, string[]> = {
  gasto: ['Mercado', 'Restaurantes', 'Transporte', 'Café y Antojos', 'Domicilios', 'Ropa', 'Suscripciones'],
  ingreso: ['Sueldo', 'Freelance', 'Venta', 'Transferencia', 'Prima', 'Reembolso / devolución', 'Regalo recibido'],
};
