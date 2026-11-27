// Catálogo de categorías, comercios y medios de pago de FLOWI.
// Separa "en qué gastaste" (categoría), "dónde" (comercio) y "con qué pagaste" (medio de pago).

export type TransactionKind = 'gasto' | 'ingreso';
export type CatalogLang = 'es' | 'es-ES' | 'en' | 'pt';

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
  // Si se omite, el comercio es global y se sugiere en todos los idiomas; si se indica, solo en esos botones
  langs?: CatalogLang[];
}

export interface PaymentMethodDef {
  label: string;
  icon: string;
  color: string;
  langs?: CatalogLang[];
}

// Grupos de gasto. "Mercado" (comida en casa) y "Comer fuera" van separados, y las finanzas se
// dividen en obligaciones (lo que hay que pagar sí o sí) y ahorro e inversión, como en la regla
// 50/30/20 de Elizabeth Warren. El pilar de cada subcategoría está en lib/categoryGroups.ts.
export const EXPENSE_GROUPS = [
  'Mercado', 'Comer fuera', 'Hogar y servicios', 'Transporte', 'Salud y cuidado', 'Obligaciones', 'Impuestos',
  'Familia y mascotas', 'Educación', 'Compras', 'Suscripciones', 'Ocio y viajes', 'Deporte',
  'Ahorro e inversión', 'Negocio', 'Otros',
];

export const INCOME_GROUPS = ['Trabajo', 'Negocio', 'Rentas e inversiones', 'Otros ingresos'];

export const CUSTOM_GROUP = 'Personalizadas';

const g = (group: string, items: [string, string, string][]): CategoryDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, group, type: 'gasto' }));

const i = (group: string, items: [string, string, string][]): CategoryDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, group, type: 'ingreso' }));

export const EXPENSE_CATEGORY_DEFS: CategoryDef[] = [
  ...g('Mercado', [
    ['Mercado', '🛒', '#10B981'],
    ['Tienda / Minimercado', '🏪', '#10B981'],
    ['Verduras y Frutas', '🥦', '#22C55E'],
    ['Carnicería', '🥩', '#EF4444'],
    ['Panadería', '🥐', '#D97706'],
  ]),
  ...g('Comer fuera', [
    ['Restaurantes', '🍽️', '#FF5B5B'],
    ['Corrientazo / almuerzo', '🍛', '#D97706'],
    ['Domicilios', '🛵', '#F97316'],
    ['Comidas rápidas', '🍔', '#EF4444'],
    ['Café y Antojos', '☕', '#D1A153'],
  ]),
  ...g('Hogar y servicios', [
    ['Arriendo', '🏢', '#F59E0B'],
    ['Administración', '🔑', '#8B5CF6'],
    ['Servicios públicos', '🏙️', '#0EA5E9'], // una sola factura con varios servicios (EPM: agua, luz, aseo)
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
    ['Moto (plataformas)', '🏍️', '#F59E0B'],
    ['Bicicleta / patineta', '🚲', '#22C55E'],
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
    ['Licores y Bares', '🍺', '#F5A623'],
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
    ['Mesada', '💵', '#22C55E'],
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
  ...g('Obligaciones', [
    ['Cuota de crédito', '🏦', '#F59E0B'],
    ['Tarjeta de crédito', '💳', '#F59E0B'],
    ['Deudas', '🧾', '#F97316'],
    ['Intereses', '📉', '#EF4444'],
    ['Cuota de manejo', '🧾', '#64748B'],
    ['Seguros', '🛡️', '#3B82F6'],
  ]),
  // En Colombia hay varios: el 4x1000 (GMF) en los movimientos del banco, el IVA, el predial…
  ...g('Impuestos', [
    ['4x1000', '🧾', '#64748B'],
    ['IVA', '🧾', '#0EA5E9'],
    ['Predial', '🏠', '#F59E0B'],
    ['Impuesto vehicular', '🚗', '#64748B'],
    ['Declaración de renta', '📄', '#8B5CF6'],
    ['Impuestos', '🏛️', '#EF4444'],
  ]),
  ...g('Ahorro e inversión', [
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
    ['Natación', '🏊', '#0EA5E9'],
    ['Yoga / Pilates', '🧘', '#A855F7'],
    ['Artes marciales', '🥋', '#EF4444'],
    ['Tenis / pádel', '🎾', '#84CC16'],
    ['Baile', '💃', '#EC4899'],
    ['Entrenador personal', '🏋️', '#F59E0B'],
    ['Clases deportivas', '🏅', '#F59E0B'],
  ]),
  ...g('Negocio', [
    ['Inventario', '📦', '#8B4513'],          // mercancía para vender
    ['Insumos', '🧰', '#10B981'],
    ['Empaques', '🛍️', '#F59E0B'],            // bolsas, cajas, etiquetas
    ['Envíos a clientes', '🚚', '#F97316'],
    ['Publicidad', '📣', '#EC4899'],          // pauta en Instagram/Facebook, volantes
    ['Comisiones y plataformas', '💳', '#8B5CF6'], // datáfono, Wompi, Mercado Libre
    ['Arriendo del local', '🏬', '#64748B'],
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
    ['Abono de cliente', '🧾', '#06B6D4'],    // clientes que pagan por cuotas
    ['Servicios prestados', '🛠️', '#3B82F6'], // uñas a domicilio, arreglos, clases…
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
    ['Préstamo devuelto', '💸', '#059669'],
    ['Premio / lotería', '🍀', '#22C55E'],
    ['Otros ingresos', '➕', '#6B7280'],
  ]),
];

const m = (categories: string[], items: [string, string, string][], langs?: CatalogLang[]): MerchantDef[] =>
  items.map(([label, icon, color]) => ({ label, icon, color, categories, ...(langs ? { langs } : {}) }));

const MERCHANT_LIST: MerchantDef[] = [
  // ── Globales (salen en todos los idiomas) ──
  ...m(['Restaurantes', 'Comidas rápidas', 'Domicilios'], [
    ["McDonald's", '🍟', '#FBBF24'],
    ['Burger King', '🍔', '#D97706'],
    ['KFC', '🍗', '#E30613'],
    ["Domino's", '🍕', '#0054A6'],
    ['Pizza Hut', '🍕', '#E30613'],
    ['Subway', '🥪', '#00A859'],
  ]),
  ...m(['Café y Antojos'], [
    ['Starbucks', '☕', '#00704A'],
  ]),
  ...m(['Taxi / plataformas'], [
    ['Uber', 'uber', '#000000'],
  ]),
  ...m(['Ropa'], [
    ['Zara', 'zara', '#000000'],
    ['H&M', 'h&m', '#CD102D'],
    ['Pull&Bear', '👕', '#1E293B'],
    ['Bershka', '👕', '#1E293B'],
  ]),
  ...m(['Artículos deportivos', 'Calzado', 'Ropa'], [
    ['Nike', 'nike', '#000000'],
    ['Adidas', 'adidas', '#000000'],
    ['Decathlon', 'decathlon', '#0082C3'],
  ]),
  ...m(['Compras en línea'], [
    ['Amazon', '📦', '#F59E0B'],
    ['Temu', '📦', '#F97316'],
    ['Shein', '📦', '#000000'],
    ['AliExpress', '📦', '#E30613'],
  ]),
  ...m(['Muebles', 'Decoración', 'Hogar'], [
    ['IKEA', 'badge:#0058A3:IKEA', '#0058A3'],
  ]),
  ...m(['Cursos en línea'], [
    ['Udemy', 'udemy', '#A435F0'],
    ['Coursera', 'coursera', '#0056D2'],
  ]),
  ...m(['Idiomas', 'Apps e IA'], [
    ['Duolingo', '🦉', '#58CC02'],
  ]),
  // FLOWI: el pago de Premium (Suscripciones) o un aporte para apoyar la app (Donaciones)
  ...m(['Suscripciones', 'Donaciones'], [
    ['FLOWI', 'flowi', '#00C4CC'],
  ]),
  ...m(['Suscripciones'], [
    ['Netflix', 'netflix', '#E50914'],
    ['Disney+', '📺', '#113CCF'],
    ['Max', '📺', '#002BE7'],
    ['Prime Video', '📺', '#00A8E1'],
    ['YouTube', 'youtube', '#FF0000'],
    ['YouTube Premium', 'youtube', '#FF0000'],
    ['Paramount+', '📺', '#0064FF'],
    ['Crunchyroll', '📺', '#F47521'],
  ]),
  ...m(['Música'], [
    ['Spotify', 'spotify', '#1DB954'],
    ['YT Music', 'yt music', '#FF0000'],
    ['Apple Music', '🎵', '#FA243C'],
  ]),
  ...m(['Apps e IA'], [
    ['Claude', 'claude', '#D97757'],
    ['ChatGPT', 'chatgpt', '#10A37F'],
    ['Gemini', 'gemini', '#4285F4'],
    ['Google AI Pro', 'gemini', '#4285F4'],
    ['Google Play', 'google play', '#01875F'],
    ['Google', 'google', '#4285F4'],
    ['Canva', 'canva', '#00C4CC'],
    ['Microsoft 365', '💼', '#0078D4'],
  ]),
  ...m(['Nube / almacenamiento'], [
    ['Google One', 'google one', '#4285F4'],
    ['iCloud', '☁️', '#3B82F6'],
  ]),
  ...m(['Videojuegos'], [
    ['PlayStation', 'playstation', '#003791'],
    ['PlayStation Plus', 'playstation', '#003791'],
    ['Xbox', 'badge:#107C10:XBOX', '#107C10'],
    ['Xbox Game Pass', 'badge:#107C10:GAME PASS', '#107C10'],
    ['Steam', 'steam', '#1B2838'],
    ['Epic Games', 'epic games', '#2A2A2A'],
    ['Ubisoft+', 'ubisoft', '#0070FF'],
    ['EA Play', 'ea', '#FF4747'],
    ['Nintendo', 'badge:#E60012:NINTENDO', '#E60012'],
    ['Roblox', 'roblox', '#E2231A'],
    ['Free Fire', 'badge:#F97316:FREE FIRE', '#F97316'],
  ]),
  ...m(['Eventos', 'Entretenimiento'], [
    ['Ticketmaster', 'ticketmaster', '#026CDF'],
  ]),

  // ── Colombia / Latinoamérica ('es') ──
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
    ['La 80', 'badge:#E30613:LA 80', '#E30613'],
    ['Mercaldas', 'badge:#00843D:MERCALDAS', '#00843D'],
    ['La Canasta', 'badge:#F59E0B:CANASTA', '#F59E0B'],
    ['Colsubsidio', 'colsubsidio', '#E30613'],
    ['Comfandi', 'badge:#0054A6:COMFANDI', '#0054A6'],
    ['Super Inter', 'badge:#E30613:INTER', '#E30613'],
    ['Mercacentro', 'badge:#16A34A:MERCA', '#16A34A'],
    ['Megatiendas', 'badge:#DC2626:MEGA', '#DC2626'],
    ['Merkepaisa', 'badge:#EA580C:MERKE', '#EA580C'],
    ['Consumo', 'badge:#2563EB:CONSUMO', '#2563EB'],
    ['Mercamás', 'badge:#059669:MERCAMÁS', '#059669'],
    ['Surtifamiliar', 'badge:#DB2777:SURTI', '#DB2777'],
    ['Zapatoca', 'badge:#B91C1C:ZAPATOCA', '#B91C1C'],
    ['Cooratiendas', 'badge:#047857:COORA', '#047857'],
    ['Metro', 'badge:#F59E0B:METRO', '#F59E0B'],
    ['Justo & Bueno', 'badge:#E11D48:J&B', '#E11D48'],
  ], ['es']),
  ...m(['Farmacia'], [
    ['Farmatodo', '💊', '#0054A6'],
    ['Cruz Verde', '💊', '#00A859'],
    ['La Rebaja', '💊', '#E30613'],
    ['Locatel', '💊', '#00A859'],
    ['Cafam', '💊', '#0054A6'],
  ], ['es']),
  ...m(['Restaurantes', 'Comidas rápidas', 'Domicilios'], [
    ['Crepes & Waffles', '🥞', '#8B4513'],
    ['El Corral', '🍔', '#E30613'],
    ['Kokoriko', '🍗', '#F97316'],
    ['Frisby', 'frisby', '#E30613'],
    ['Sándwich Qbano', '🥪', '#F59E0B'],
    ['Presto', '🍔', '#E30613'],
  ], ['es']),
  ...m(['Café y Antojos'], [
    ['Juan Valdez', '☕', '#8B4513'],
    ['Tostao', '☕', '#1E293B'],
    ['Popsy', 'popsy', '#E10074'],
  ], ['es']),
  ...m(['Domicilios', 'Mercado'], [
    ['Rappi', 'rappi', '#FF441F'],
  ], ['es']),
  ...m(['Taxi / plataformas'], [
    ['DiDi', '🚕', '#F97316'],
    ['InDrive', '🚕', '#22C55E'],
    ['Cabify', '🚕', '#7C3AED'],
    ['Taxis Libres', '🚖', '#FACC15'],
    ['Taxi en la calle', '🚖', '#FBBF24'],
  ], ['es']),
  ...m(['Moto (plataformas)', 'Taxi / plataformas'], [
    ['Uber Moto', 'uber', '#000000'],
    ['DiDi Moto', '🏍️', '#F97316'],
    ['InDrive Moto', '🏍️', '#22C55E'],
    ['Picap', '🏍️', '#F59E0B'],
    ['Mototaxi', '🏍️', '#F59E0B'],
  ], ['es']),
  ...m(['Bicicleta / patineta'], [
    ['Tembici', '🚲', '#FF6B00'],
    ['Patineta eléctrica', '🛴', '#22C55E'],
  ], ['es']),
  ...m(['Transporte'], [
    ['TransMilenio', '🚌', '#E30613'],
    ['SITP', '🚌', '#0054A6'],
    ['Metro de Medellín', '🚇', '#0054A6'],
    ['MIO Cali', '🚌', '#0054A6'],
    ['Megabús Pereira', '🚌', '#00A859'],
    ['Metrolínea', '🚌', '#E30613'],
    ['Transcaribe', '🚌', '#0EA5E9'],
    ['Cable Aéreo Manizales', '🚡', '#0072BC'],
    ['Buseta', '🚌', '#F5A623'],
  ], ['es']),
  ...m(['Gasolina'], [
    ['Terpel', '⛽', '#E30613'],
    ['Primax', '⛽', '#0054A6'],
    ['Biomax', '⛽', '#00A859'],
    ['Texaco', '⛽', '#E30613'],
  ], ['es']),
  ...m(['Viajes'], [
    ['Avianca', '✈️', '#E30613'],
    ['LATAM', '✈️', '#1E3A8A'],
    ['Wingo', '✈️', '#7C3AED'],
    ['JetSMART', '✈️', '#0054A6'],
  ], ['es']),
  ...m(['Ropa'], [
    ['Arturo Calle', '👔', '#1E293B'],
    ['Studio F', '👗', '#000000'],
    ['Koaj', '👕', '#1E293B'],
    ['Tennis', '👕', '#1E293B'],
    ['Offcorss', '👶', '#0EA5E9'],
    ['Pat Primo', '👕', '#E30613'],
  ], ['es']),
  ...m(['Calzado'], [
    ['Vélez', '👞', '#8B4513'],
    ['Bosi', '👞', '#1E293B'],
    ['Spring Step', '👟', '#0054A6'],
    ['Bata', '👞', '#E30613'],
  ], ['es']),
  ...m(['Accesorios'], [
    ['Totto', '🎒', '#E30613'],
    ['Mario Hernández', '👜', '#8B4513'],
  ], ['es']),
  ...m(['Tecnología', 'Electrodomésticos'], [
    ['Ktronix', 'ktronix', '#FF6A00'],
    ['Alkosto', '🛍️', '#0054A6'],
    ['Falabella', '🛍️', '#22C55E'],
  ], ['es']),
  ...m(['Compras en línea'], [
    ['Mercado Libre', '📦', '#FBBF24'],
    ['Dollarcity', '🛍️', '#22C55E'],
  ], ['es']),
  ...m(['Hogar', 'Reparaciones', 'Remodelación'], [
    ['Homecenter', 'homecenter', '#004B87'],
    ['Easy', '🛠️', '#E30613'],
  ], ['es']),
  ...m(['Útiles', 'Libros'], [
    ['Panamericana', 'panamericana', '#0A2240'],
  ], ['es']),
  ...m(['Cursos en línea'], [
    ['Platzi', '🧑‍💻', '#98CA3F'],
  ], ['es']),
  ...m(['Internet', 'Celular / recargas'], [
    ['Claro Hogar', 'claro_hogar', '#E11D48'],
    ['Claro Móvil', 'claro_movil', '#E11D48'],
    ['Movistar', '📡', '#019DF4'],
    ['Tigo', '📡', '#00377B'],
    ['WOM', '📡', '#7C3AED'],
    ['ETB', '📡', '#0054A6'],
  ], ['es']),
  ...m(['Servicios públicos', 'Luz', 'Agua', 'Gas natural'], [
    ['EPM', 'epm', '#00A859'],
    ['EPM Manizales', 'badge:#0E7490:EP MZL', '#0E7490'],
  ], ['es']),
  ...m(['Agua', 'Servicios públicos'], [
    ['Aguas de Manizales', 'aguas_manizales', '#0072BC'],
  ], ['es']),
  ...m(['Luz', 'Agua', 'Gas natural'], [
    ['Enel', '⚡', '#0555FA'],
    ['Celsia', '⚡', '#E30613'],
    ['Air-e', '⚡', '#0054A6'],
    ['Afinia', '⚡', '#F97316'],
  ], ['es']),
  ...m(['Gas natural'], [
    ['Vanti', '🔥', '#0054A6'],
    ['Efigas', 'efigas', '#009EE0'],
    ['Alcanos', 'alcanos', '#0054A6'],
    ['Gases del Caribe', '🔥', '#E30613'],
  ], ['es']),
  ...m(['Salud', 'Medicina prepagada'], [
    ['Sura', 'sura', '#0033A0'],
    ['Colsanitas', 'colsanitas', '#00467F'],
    ['Sanitas', '🩺', '#00467F'],
    ['Nueva EPS', 'nueva eps', '#005A9C'],
    ['Salud Total', '🩺', '#00A859'],
    ['Compensar', 'compensar', '#00873A'],
    ['Comfama', 'comfama', '#FF6A00'],
    ['Colsubsidio', 'colsubsidio', '#E30613'],
  ], ['es']),
  ...m(['Gimnasio'], [
    ['Smart Fit', '🏋️‍♂️', '#FBBF24'],
    ['Bodytech', '🏋️‍♂️', '#E30613'],
    ['Stark', 'badge:#111827:STARK', '#111827'],
    ['Spinning Center', 'badge:#DC2626:SPINNING', '#DC2626'],
    ['Hard Body', 'badge:#0F172A:HARD BODY', '#0F172A'],
  ], ['es']),
  ...m(['Natación', 'Gimnasio', 'Clases deportivas', 'Entretenimiento', 'Cursos en línea'], [
    ['Comfama', 'comfama', '#FF6A00'],
    ['Comfenalco', 'badge:#0054A6:COMFENALCO', '#0054A6'],
    ['Confa', 'badge:#00843D:CONFA', '#00843D'],
    ['Compensar', 'compensar', '#E30613'],
    ['Cafam', 'badge:#E30613:CAFAM', '#E30613'],
  ], ['es']),
  ...m(['Cine'], [
    ['Cine Colombia', 'cine', '#E30613'],
    ['Cinemark', 'cine', '#E30613'],
    ['Procinal', 'cine', '#0054A6'],
    ['Cinépolis', 'badge:#0B2D72:CINÉPOLIS', '#0B2D72'],
    ['Royal Films', 'badge:#B91C1C:ROYAL', '#B91C1C'],
  ], ['es']),
  ...m(['Eventos', 'Entretenimiento'], [
    ['Tuboleta', 'badge:#E11D48:TUBOLETA', '#E11D48'],
    ['Eticket', 'badge:#1D4ED8:ETICKET', '#1D4ED8'],
    ['Parque del Café', 'badge:#7C2D12:PARQUE', '#7C2D12'],
  ], ['es']),
  ...m(['Cuota de crédito', 'Ahorro', 'Cesantías'], [
    ['FNA', 'fna', '#003DA5'],
  ], ['es']),
  ...m(['Inversiones', 'Bolsa / Acciones', 'Ahorro'], [
    ['Trii', 'badge:#5B21B6:trii', '#5B21B6'],
    ['tyba', 'badge:#0EA5E9:tyba', '#0EA5E9'],
    ['Pibank', 'badge:#6D28D9:PIBANK', '#6D28D9'],
    ['Ualá', 'badge:#2563EB:UALÁ', '#2563EB'],
    ['Fiduciaria Bogotá', 'badge:#0054A6:FIDU', '#0054A6'],
    ['Credicorp Capital', 'badge:#1E3A8A:CREDICORP', '#1E3A8A'],
    ['Acciones y Valores', 'badge:#0F766E:A&V', '#0F766E'],
  ], ['es']),
  ...m(['Pensión voluntaria', 'Cesantías'], [
    ['Skandia', 'badge:#00A19A:SKANDIA', '#00A19A'],
    ['Porvenir', '🏦', '#E30613'],
    ['Protección', '🏦', '#0054A6'],
    ['Colfondos', '🏦', '#00A859'],
  ], ['es']),

  // ── España ('es-ES') ──
  ...m(['Mercado'], [
    ['Mercadona', 'badge:#009444:MERCADONA', '#009444'],
    ['Carrefour', 'badge:#004E9E:CARREFOUR', '#004E9E'],
    ['Lidl', 'badge:#0050AA:LIDL', '#0050AA'],
    ['Supermercados Dia', 'badge:#E30613:DIA', '#E30613'],
    ['Alcampo', 'badge:#E30613:ALCAMPO', '#E30613'],
    ['Eroski', 'badge:#E30613:EROSKI', '#E30613'],
    ['Consum', 'badge:#F97316:CONSUM', '#F97316'],
    ['Aldi', 'badge:#0050AA:ALDI', '#0050AA'],
    ['El Corte Inglés', 'badge:#00843D:ECI', '#00843D'],
  ], ['es-ES']),
  ...m(['Farmacia', 'Belleza', 'Cuidado personal'], [
    ['Primor', '💄', '#EC4899'],
    ['Druni', '🧴', '#14B8A6'],
  ], ['es-ES']),
  ...m(['Restaurantes', 'Comidas rápidas', 'Licores y Bares'], [
    ['100 Montaditos', '🥪', '#8B4513'],
    ['Telepizza', '🍕', '#E30613'],
    ['VIPS', '🍽️', '#E30613'],
    ['Goiko', '🍔', '#1E293B'],
    ['Rodilla', '🥪', '#00843D'],
  ], ['es-ES']),
  ...m(['Domicilios', 'Mercado'], [
    ['Glovo', 'badge:#FFC244:GLOVO', '#F59E0B'],
    ['Just Eat', '🛵', '#FF8000'],
    ['Uber Eats', 'uber', '#06C167'],
  ], ['es-ES']),
  ...m(['Taxi / plataformas'], [
    ['Cabify', '🚕', '#7C3AED'],
    ['Bolt', '🚕', '#22C55E'],
    ['Free Now', '🚖', '#E30613'],
  ], ['es-ES']),
  ...m(['Transporte', 'Bus intermunicipal'], [
    ['Renfe', '🚆', '#7C3AED'],
    ['Metro de Madrid', '🚇', '#0054A6'],
    ['TMB Barcelona', '🚇', '#E30613'],
    ['ALSA', '🚍', '#0054A6'],
    ['BlaBlaCar', '🚗', '#00AFF5'],
  ], ['es-ES']),
  ...m(['Gasolina'], [
    ['Repsol', '⛽', '#F97316'],
    ['Cepsa', '⛽', '#E30613'],
    ['Galp', '⛽', '#F97316'],
    ['BP', '⛽', '#009900'],
    ['Plenoil', '⛽', '#2563EB'],
  ], ['es-ES']),
  ...m(['Viajes'], [
    ['Iberia', '✈️', '#E30613'],
    ['Vueling', '✈️', '#FACC15'],
    ['Ryanair', '✈️', '#073590'],
  ], ['es-ES']),
  ...m(['Ropa', 'Calzado', 'Compras'], [
    ['Mango', '👗', '#1E293B'],
    ['Massimo Dutti', '👔', '#1E293B'],
    ['Stradivarius', '👗', '#1E293B'],
    ['Primark', '🛍️', '#0EA5E9'],
    ['El Corte Inglés', 'badge:#00843D:ECI', '#00843D'],
  ], ['es-ES']),
  ...m(['Tecnología', 'Electrodomésticos', 'Compras en línea'], [
    ['MediaMarkt', 'badge:#DF0000:MM', '#DF0000'],
    ['PCComponentes', '💻', '#FF6000'],
    ['Wallapop', '📦', '#13C1AC'],
  ], ['es-ES']),
  ...m(['Hogar', 'Reparaciones', 'Remodelación'], [
    ['Leroy Merlin', 'badge:#78BE20:LEROY', '#78BE20'],
  ], ['es-ES']),
  ...m(['Internet', 'Celular / recargas'], [
    ['Movistar', '📡', '#019DF4'],
    ['Vodafone', '📡', '#E60000'],
    ['Orange', '📡', '#FF7900'],
    ['MásMóvil', '📡', '#FACC15'],
    ['Digi', '📡', '#0054A6'],
    ['Yoigo', '📡', '#EC4899'],
  ], ['es-ES']),
  ...m(['Luz', 'Gas natural', 'Servicios públicos'], [
    ['Iberdrola', '⚡', '#58A618'],
    ['Endesa', '⚡', '#0055FF'],
    ['Naturgy', '🔥', '#F97316'],
  ], ['es-ES']),
  ...m(['Salud', 'Medicina prepagada', 'Seguros'], [
    ['Sanitas', '🩺', '#00467F'],
    ['Adeslas', '🩺', '#0072BC'],
    ['Quirónsalud', '🏥', '#009999'],
    ['Mapfre', '🛡️', '#E30613'],
  ], ['es-ES']),
  ...m(['Gimnasio'], [
    ['Basic-Fit', '🏋️‍♂️', '#FF6600'],
    ['VivaGym', '🏋️‍♂️', '#F97316'],
  ], ['es-ES']),
  ...m(['Cine'], [
    ['Cinesa', 'cine', '#0054A6'],
    ['Yelmo Cines', 'cine', '#E30613'],
  ], ['es-ES']),
  ...m(['Inversiones', 'Bolsa / Acciones', 'Ahorro', 'Pensión voluntaria'], [
    ['MyInvestor', '📈', '#0F172A'],
    ['Trade Republic', '📈', '#111827'],
    ['Indexa Capital', '📊', '#2563EB'],
    ['Pibank', 'badge:#6D28D9:PIBANK', '#6D28D9'],
  ], ['es-ES']),

  // ── Portugal ('pt') ──
  ...m(['Mercado'], [
    ['Continente', 'badge:#E30613:CONTINENTE', '#E30613'],
    ['Pingo Doce', 'badge:#16A34A:PINGO DOCE', '#16A34A'],
    ['Mercadona', 'badge:#009444:MERCADONA', '#009444'],
    ['Lidl', 'badge:#0050AA:LIDL', '#0050AA'],
    ['Auchan', 'badge:#E30613:AUCHAN', '#E30613'],
    ['Aldi', 'badge:#0050AA:ALDI', '#0050AA'],
    ['Minipreço', 'badge:#0054A6:MINIPREÇO', '#0054A6'],
    ['Intermarché', 'badge:#E30613:INTER', '#E30613'],
    ['El Corte Inglés', 'badge:#00843D:ECI', '#00843D'],
  ], ['pt']),
  ...m(['Farmacia', 'Salud', 'Medicina prepagada'], [
    ['Wells', '💊', '#0EA5E9'],
    ['Hospital CUF', '🏥', '#0054A6'],
    ['Luz Saúde', '🏥', '#0072BC'],
    ['Médis', '🩺', '#00A859'],
    ['Multicare', '🩺', '#0054A6'],
  ], ['pt']),
  ...m(['Restaurantes', 'Café y Antojos', 'Panadería'], [
    ['A Padaria Portuguesa', '🥐', '#D97706'],
    ['Portugália', '🍽️', '#8B4513'],
    ['Vitaminas', '🥗', '#22C55E'],
  ], ['pt']),
  ...m(['Domicilios', 'Mercado'], [
    ['Uber Eats', 'uber', '#06C167'],
    ['Glovo', 'badge:#FFC244:GLOVO', '#F59E0B'],
    ['Bolt Food', '🛵', '#22C55E'],
  ], ['pt']),
  ...m(['Taxi / plataformas'], [
    ['Bolt', '🚕', '#22C55E'],
  ], ['pt']),
  ...m(['Transporte', 'Bus intermunicipal'], [
    ['CP Comboios', '🚆', '#16A34A'],
    ['Metro de Lisboa', '🚇', '#E30613'],
    ['Metro do Porto', '🚇', '#0054A6'],
    ['Carris', '🚌', '#FACC15'],
    ['Navegante', '🚌', '#00843D'],
    ['Andante', '🚌', '#0054A6'],
    ['Rede Expressos', '🚍', '#E30613'],
  ], ['pt']),
  ...m(['Gasolina', 'Peajes'], [
    ['Galp', '⛽', '#F97316'],
    ['Repsol', '⛽', '#F97316'],
    ['BP', '⛽', '#009900'],
    ['Prio', '⛽', '#0EA5E9'],
    ['Cepsa', '⛽', '#E30613'],
    ['Via Verde', '🛣️', '#16A34A'],
  ], ['pt']),
  ...m(['Viajes'], [
    ['TAP Air Portugal', '✈️', '#16A34A'],
    ['Ryanair', '✈️', '#073590'],
  ], ['pt']),
  ...m(['Ropa', 'Accesorios', 'Compras'], [
    ['Salsa Jeans', '👕', '#1E293B'],
    ['Parfois', '👜', '#1E293B'],
    ['Primark', '🛍️', '#0EA5E9'],
  ], ['pt']),
  ...m(['Tecnología', 'Electrodomésticos', 'Libros', 'Compras en línea'], [
    ['Worten', 'badge:#E30613:WORTEN', '#E30613'],
    ['FNAC', 'badge:#E1A400:FNAC', '#D97706'],
    ['Rádio Popular', '🔌', '#0054A6'],
    ['OLX', '📦', '#0F766E'],
  ], ['pt']),
  ...m(['Hogar', 'Reparaciones', 'Remodelación'], [
    ['Leroy Merlin', 'badge:#78BE20:LEROY', '#78BE20'],
  ], ['pt']),
  ...m(['Internet', 'Celular / recargas'], [
    ['MEO', '📡', '#009999'],
    ['NOS Telecom', '📡', '#F97316'],
    ['Vodafone', '📡', '#E60000'],
    ['Digi', '📡', '#0054A6'],
  ], ['pt']),
  ...m(['Luz', 'Agua', 'Gas natural', 'Servicios públicos'], [
    ['EDP', '⚡', '#E30613'],
    ['Endesa', '⚡', '#0055FF'],
    ['Galp Energia', '🔥', '#F97316'],
    ['Iberdrola', '⚡', '#58A618'],
    ['EPAL', '💧', '#0EA5E9'],
  ], ['pt']),
  ...m(['Gimnasio'], [
    ['Solinca', '🏋️‍♂️', '#0EA5E9'],
    ['Fitness Hut', '🏋️‍♂️', '#FACC15'],
    ['VivaGym', '🏋️‍♂️', '#F97316'],
  ], ['pt']),
  ...m(['Cine'], [
    ['Cinema NOS', 'cine', '#0054A6'],
  ], ['pt']),
  ...m(['Inversiones', 'Bolsa / Acciones', 'Ahorro'], [
    ['XTB', '📈', '#E30613'],
    ['Trade Republic', '📈', '#111827'],
    ['DEGIRO', '📊', '#0054A6'],
  ], ['pt']),

  // ── Inglés / EE. UU. e internacional ('en') ──
  ...m(['Mercado'], [
    ['Walmart', 'badge:#0071CE:WALMART', '#0071CE'],
    ['Costco', 'badge:#E31837:COSTCO', '#E31837'],
    ['Target', 'badge:#CC0000:TARGET', '#CC0000'],
    ["Trader Joe's", '🛒', '#B91C1C'],
    ['Whole Foods', '🥦', '#00674B'],
    ['Kroger', '🛒', '#0054A6'],
    ['Aldi', 'badge:#0050AA:ALDI', '#0050AA'],
    ['Publix', '🛒', '#16A34A'],
    ['Safeway', '🛒', '#E30613'],
    ["Sam's Club", '🛒', '#0067A0'],
  ], ['en']),
  ...m(['Farmacia'], [
    ['CVS', '💊', '#CC0000'],
    ['Walgreens', '💊', '#E31837'],
    ['Rite Aid', '💊', '#0054A6'],
  ], ['en']),
  ...m(['Restaurantes', 'Comidas rápidas', 'Café y Antojos'], [
    ['Chipotle', '🌯', '#7C2D12'],
    ['Chick-fil-A', '🍗', '#E31837'],
    ["Wendy's", '🍔', '#E31837'],
    ['Taco Bell', '🌮', '#7C3AED'],
    ['Panera Bread', '🥐', '#4D7C0F'],
    ["Dunkin'", '☕', '#FF671F'],
  ], ['en']),
  ...m(['Domicilios', 'Mercado'], [
    ['DoorDash', '🛵', '#FF3008'],
    ['Uber Eats', 'uber', '#06C167'],
    ['Grubhub', '🛵', '#F63440'],
    ['Instacart', '🛒', '#10B981'],
  ], ['en']),
  ...m(['Taxi / plataformas'], [
    ['Lyft', '🚕', '#FF00BF'],
  ], ['en']),
  ...m(['Transporte', 'Bus intermunicipal'], [
    ['MTA', '🚇', '#0039A6'],
    ['Amtrak', '🚆', '#0054A6'],
  ], ['en']),
  ...m(['Gasolina'], [
    ['Shell', '⛽', '#FBCE07'],
    ['Chevron', '⛽', '#0054A6'],
    ['Exxon', '⛽', '#E31837'],
    ['Mobil', '⛽', '#E31837'],
    ['BP', '⛽', '#009900'],
    ['7-Eleven', '🏪', '#00843D'],
  ], ['en']),
  ...m(['Viajes'], [
    ['Delta', '✈️', '#003366'],
    ['United Airlines', '✈️', '#005DAA'],
    ['American Airlines', '✈️', '#0078D2'],
    ['Southwest', '✈️', '#304CB2'],
  ], ['en']),
  ...m(['Tecnología', 'Electrodomésticos', 'Compras en línea', 'Ropa'], [
    ['Best Buy', 'badge:#0046BE:BEST BUY', '#0046BE'],
    ['Apple Store', '💻', '#64748B'],
    ['TJ Maxx', '👕', '#E31837'],
    ['Ross', '👕', '#0054A6'],
    ['eBay', '📦', '#E53238'],
    ['Etsy', '🎁', '#F1641E'],
  ], ['en']),
  ...m(['Hogar', 'Reparaciones', 'Remodelación'], [
    ['Home Depot', 'badge:#F96302:HOME DEPOT', '#F96302'],
    ["Lowe's", '🛠️', '#004990'],
  ], ['en']),
  ...m(['Internet', 'Celular / recargas'], [
    ['AT&T', '📡', '#00A8E0'],
    ['Verizon', '📡', '#CD040B'],
    ['T-Mobile', '📡', '#E20074'],
    ['Xfinity', '📡', '#7C3AED'],
    ['Spectrum', '📡', '#0054A6'],
  ], ['en']),
  ...m(['Gimnasio'], [
    ['Planet Fitness', '🏋️‍♂️', '#7C3AED'],
    ['LA Fitness', '🏋️‍♂️', '#F59E0B'],
    ['Equinox', '🏋️‍♂️', '#1E293B'],
  ], ['en']),
  ...m(['Cine'], [
    ['AMC Theatres', 'cine', '#E31837'],
    ['Regal Cinemas', 'cine', '#F97316'],
  ], ['en']),
  ...m(['Inversiones', 'Bolsa / Acciones', 'Ahorro', 'Pensión voluntaria'], [
    ['Fidelity', '📈', '#16A34A'],
    ['Vanguard', '📊', '#991B1B'],
    ['Robinhood', '📈', '#22C55E'],
    ['Charles Schwab', '🏦', '#00A0DF'],
  ], ['en']),
];

// Un comercio que aparece en varias listas (p. ej. Mercadona en España y Portugal, o Comfama en Salud y Deporte)
// queda una sola vez con todas sus categorías e idiomas unidos
export const MERCHANTS: MerchantDef[] = (() => {
  const byLabel = new Map<string, MerchantDef>();
  for (const mer of MERCHANT_LIST) {
    const prev = byLabel.get(mer.label);
    if (prev) {
      prev.categories = Array.from(new Set([...prev.categories, ...mer.categories]));
      prev.langs = (!prev.langs || !mer.langs) ? undefined : Array.from(new Set([...prev.langs, ...mer.langs]));
    } else {
      byLabel.set(mer.label, { ...mer, categories: [...mer.categories], ...(mer.langs ? { langs: [...mer.langs] } : {}) });
    }
  }
  return Array.from(byLabel.values());
})();


export const PAYMENT_METHODS: PaymentMethodDef[] = [
  // Generales (todos los idiomas)
  { label: 'Efectivo', icon: '💵', color: '#22C55E' },
  { label: 'Tarjeta débito', icon: '💳', color: '#3B82F6' },
  { label: 'Tarjeta crédito', icon: '💳', color: '#F59E0B' },
  { label: 'Transferencia', icon: '📲', color: '#06B6D4' },
  // Colombia ('es')
  { label: 'Nequi', icon: 'nequi', color: '#D946EF', langs: ['es'] },
  { label: 'Daviplata', icon: 'daviplata', color: '#E30613', langs: ['es'] },
  { label: 'Bancolombia', icon: 'bancolombia', color: '#FBBF24', langs: ['es'] },
  { label: 'Davivienda', icon: 'davivienda', color: '#E30613', langs: ['es'] },
  { label: 'BBVA', icon: 'bbva', color: '#1D4ED8', langs: ['es', 'es-ES'] },
  { label: 'Nu', icon: '💜', color: '#820AD1', langs: ['es'] },
  { label: 'Lulo Bank', icon: '🟢', color: '#22C55E', langs: ['es'] },
  { label: 'RappiPay', icon: '🧡', color: '#FF441F', langs: ['es'] },
  { label: 'Banco de Bogotá', icon: '🏦', color: '#0054A6', langs: ['es'] },
  { label: 'AV Villas', icon: '🏦', color: '#0054A6', langs: ['es'] },
  { label: 'Banco Caja Social', icon: '🏦', color: '#0054A6', langs: ['es'] },
  { label: 'Addi', icon: '🛍️', color: '#0054A6', langs: ['es'] },
  { label: 'Sistecrédito', icon: '🛍️', color: '#F97316', langs: ['es'] },
  // España ('es-ES') y Europa
  { label: 'Bizum', icon: 'badge:#059669:BIZUM', color: '#059669', langs: ['es-ES'] },
  { label: 'Revolut', icon: 'badge:#111827:REVOLUT', color: '#3B82F6', langs: ['es-ES', 'pt', 'en'] },
  { label: 'Santander', icon: 'badge:#EC0000:SANTANDER', color: '#EC0000', langs: ['es-ES', 'pt'] },
  { label: 'CaixaBank', icon: 'badge:#007EAE:CAIXA', color: '#007EAE', langs: ['es-ES'] },
  { label: 'Sabadell', icon: '🏦', color: '#006DFF', langs: ['es-ES'] },
  { label: 'Bankinter', icon: '🏦', color: '#FF7300', langs: ['es-ES', 'pt'] },
  { label: 'ING', icon: 'badge:#FF6200:ING', color: '#FF6200', langs: ['es-ES'] },
  { label: 'Openbank', icon: '🏦', color: '#E30613', langs: ['es-ES'] },
  { label: 'Imagin', icon: '💚', color: '#10B981', langs: ['es-ES'] },
  // Portugal ('pt')
  { label: 'MB WAY', icon: 'badge:#E30613:MB WAY', color: '#E30613', langs: ['pt'] },
  { label: 'Multibanco', icon: 'badge:#0054A6:MB', color: '#0054A6', langs: ['pt'] },
  { label: 'Caixa Geral', icon: 'badge:#0066B3:CGD', color: '#0066B3', langs: ['pt'] },
  { label: 'Millennium bcp', icon: 'badge:#D1005D:BCP', color: '#D1005D', langs: ['pt'] },
  { label: 'Novo Banco', icon: '🏦', color: '#84CC16', langs: ['pt'] },
  { label: 'BPI', icon: 'badge:#FF6600:BPI', color: '#FF6600', langs: ['pt'] },
  { label: 'ActivoBank', icon: '🏦', color: '#0EA5E9', langs: ['pt'] },
  { label: 'Moey!', icon: '💜', color: '#8B5CF6', langs: ['pt'] },
  { label: 'Banco Montepio', icon: '🏦', color: '#F59E0B', langs: ['pt'] },
  // Internacional / EE. UU. ('en', y billeteras globales en Europa)
  { label: 'Apple Pay', icon: '📱', color: '#64748B', langs: ['es-ES', 'pt', 'en'] },
  { label: 'Google Pay', icon: '📱', color: '#4285F4', langs: ['es-ES', 'pt', 'en'] },
  { label: 'PayPal', icon: 'badge:#003087:PAYPAL', color: '#003087', langs: ['es-ES', 'pt', 'en'] },
  { label: 'Zelle', icon: 'badge:#6D1ED4:ZELLE', color: '#6D1ED4', langs: ['en'] },
  { label: 'Venmo', icon: 'badge:#008CFF:VENMO', color: '#008CFF', langs: ['en'] },
  { label: 'Cash App', icon: 'badge:#00D632:CASH', color: '#00D632', langs: ['en'] },
  { label: 'Chase', icon: 'badge:#117ACA:CHASE', color: '#117ACA', langs: ['en'] },
  { label: 'Bank of America', icon: 'badge:#E31837:BOFA', color: '#E31837', langs: ['en'] },
  { label: 'Wells Fargo', icon: '🏦', color: '#D71E28', langs: ['en'] },
  { label: 'Citi', icon: '🏦', color: '#003B70', langs: ['en'] },
  { label: 'Capital One', icon: '💳', color: '#004977', langs: ['en'] },
  { label: 'American Express', icon: '💳', color: '#006FCF', langs: ['en'] },
  { label: 'Discover', icon: '💳', color: '#FF6000', langs: ['en'] },
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
// Nombres viejos o repetidos que son el mismo comercio ("Play Store" es la tienda Google Play)
const ALIASES: Record<string, string> = { 'play store': 'Google Play', playstore: 'Google Play', gmf: '4x1000', 'cuatro por mil': '4x1000' };

// Clave normalizada y unificada: "Play Store" y "Google Play" dan lo mismo
export function aliasKey(text: string): string {
  const key = normalizeText(text);
  return ALIASES[key] ? normalizeText(ALIASES[key]) : key;
}

/** ¿El nombre ya existe en el catálogo (categoría o comercio)? Así una personalizada igual no se repite. */
export function isCatalogLabel(label: string): boolean {
  const key = aliasKey(label);
  return BASE_CATEGORY_DEFS.some(c => normalizeText(c.label) === key) || MERCHANTS.some(m => normalizeText(m.label) === key);
}

export function canonicalLabel(label: string): string {
  return ALIASES[normalizeText(label)] || label;
}

export function findCatalogEntry(label: string): { label: string; icon: string; color: string } | undefined {
  const key = aliasKey(label);
  if (!key) return undefined;
  const pools = [BASE_CATEGORY_DEFS, MERCHANTS, PAYMENT_METHODS, LEGACY_CATEGORIES];
  for (const pool of pools) {
    const found = pool.find(item => normalizeText(item.label) === key);
    if (found) return found;
  }
  return undefined;
}

export function findMerchant(label: string): MerchantDef | undefined {
  const key = aliasKey(label);
  return MERCHANTS.find(mer => normalizeText(mer.label) === key);
}

export function getMerchantsForCategory(category: string, lang?: CatalogLang): MerchantDef[] {
  return MERCHANTS.filter(mer => mer.categories.includes(category) && (!lang || !mer.langs || mer.langs.includes(lang)));
}

export function getPaymentMethodsForLang(lang?: CatalogLang): PaymentMethodDef[] {
  return PAYMENT_METHODS.filter(p => !lang || !p.langs || p.langs.includes(lang));
}

// Detecta un comercio conocido dentro de un texto libre (ej. "mercado en jumbo")
export function detectMerchantInText(text: string): MerchantDef | undefined {
  const normalized = ` ${normalizeText(text).replace(/[^a-z0-9&+ ]/g, ' ')} `;
  // Si varios coinciden, gana el nombre más largo ("Google AI Pro" antes que "Google")
  let best: MerchantDef | undefined;
  let bestLen = 0;
  for (const mer of MERCHANTS) {
    const name = normalizeText(mer.label).replace(/[^a-z0-9&+ ]/g, ' ').trim();
    // "1 euro" es la moneda, no el supermercado Euro de Medellín
    if (name === 'euro' && /\b\d+\s+euro\b/.test(normalized)) continue;
    if (name.length >= 2 && name.length > bestLen && normalized.includes(` ${name} `)) { best = mer; bestLen = name.length; }
  }
  return best;
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
