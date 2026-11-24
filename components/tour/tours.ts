import { tr, lazyT } from '@/lib/i18n';

// Contenido de los recorridos guiados (AppTour). El de Inicio se ofrece la primera vez; los de
// cada página se abren con el botón "Tutorial" de esa página (PageTourButton).
// target: parte de la pantalla a resaltar (data-tour="..." o #id; alternativas con "|").
// cta: botón opcional que cierra el recorrido y lleva a donde se activa algo (IA, cuentas…).

export interface TourStep {
  target?: string;
  title: string;
  text: string;
  cta?: { label: string; href: string };
  // Abre algo antes de señalar: el menú del botón + o el formulario de gasto (se cierra solo)
  open?: 'quick' | 'expense';
}

// Pasos que abren el menú del botón + y señalan sus opciones
const QUICK_STEPS = (): TourStep[] => [
  { open: 'quick', target: 'quick-voice', title: tr('Hablar: lo más rápido'), text: tr('Toca Hablar y di "gasté veinte mil en almuerzo y tres mil en tinto": registro las dos cosas. En cada página, arriba de esto sale primero lo de esa página.') },
  { open: 'quick', target: 'quick-foto', title: tr('Foto del recibo con IA'), text: tr('Aquí tomas la foto de un recibo o una factura y la IA lee el total y cada producto. Primero conecta la IA gratis, una sola vez; si no está conectada, al tocar aquí te digo cómo.'), cta: { label: tr('Activar la IA'), href: '/configuracion#ia' } },
  { open: 'quick', target: 'quick-extracto', title: tr('Importar extracto'), text: tr('Sube el PDF o el Excel de tu banco y registro todos los movimientos de una vez.') },
];

// Pasos que abren el formulario de gasto y señalan cada parte
const EXPENSE_STEPS = (): TourStep[] => [
  { open: 'expense', target: 'exp-keypad', title: tr('La calculadora'), text: tr('Escribe el valor con este teclado. También suma: escribe 12000+3500 y te queda el total, útil cuando pagas varias cosas juntas.') },
  { open: 'expense', target: 'exp-voice|exp-photo', title: tr('Voz y foto desde el formulario'), text: tr('Con Voz dictas el gasto. Con Foto lees con la IA un recibo, una factura o el pantallazo del comprobante de tu banco.') },
  { open: 'expense', target: 'exp-category', title: tr('La categoría'), text: tr('Elige la categoría con un toque. En "Ver todas" están las demás y puedes crear las tuyas.') },
  { open: 'expense', target: 'exp-fixed', title: tr('Gasto fijo'), text: tr('Márcalo si se repite cada mes, como el arriendo o el internet: FLOWI lo aparta de lo que puedes gastar.') },
  { open: 'expense', target: 'exp-account', title: tr('¿Con qué pagaste?'), text: tr('Elige la cuenta o el medio de pago. Si tienes tus cuentas en FLOWI, su saldo se actualiza solo.') },
  { open: 'expense', target: 'exp-shared', title: tr('Compartir con amigos'), text: tr('¿Pagaste por varios? Toca aquí, elige con quién y cuánto pone cada uno. A tus amigos de FLOWI les llega para aceptarlo y tú ves quién te debe.') },
];

// ── Inicio: lo esencial para empezar bien ──
export const HOME_TOUR: TourStep[] = lazyT(() => ([
  { title: tr('¡Hola! Te muestro FLOWI'), text: tr('Te enseño a registrar tu plata, a conectar lo que hace que las cifras sean reales y a leer tu inicio. Lo que ves ahora son datos de ejemplo: tus datos no se tocan. Puedes omitir el recorrido cuando quieras.') },
  { target: 'voice|add', title: tr('1. Registra lo que sea desde aquí'), text: tr('Toca el botón + para ver todo lo que puedes registrar. Si lo mantienes presionado, te escucho de una vez. Mira lo que tiene adentro.') },
  ...QUICK_STEPS(),
  ...EXPENSE_STEPS(),
  { title: tr('Comparte desde tu banco'), text: tr('Con FLOWI instalada, en la app de tu banco o de Nequi abre el comprobante de un pago, toca Compartir y elige FLOWI. Si compartes una imagen, la IA la lee; si compartes el texto del movimiento, lo convierto en gasto o ingreso. Solo revisas y guardas.') },
  { title: tr('Agrega tus cuentas'), text: tr('Para que "Dinero disponible" sea la plata que de verdad tienes, ve a Servicios, Cuentas y patrimonio, y agrega tus cuentas: banco, Nequi, efectivo y tarjetas de crédito, con su saldo de hoy. Desde ahí cada gasto o ingreso mueve el saldo de su cuenta.'), cta: { label: tr('Agregar mis cuentas'), href: '/servicios/cuentas' } },
  { target: '#nav-gastos', title: tr('Gastos e ingresos'), text: tr('En estas pestañas ves la lista completa de gastos y de ingresos, buscas, editas o borras. Cada página tiene su propio botón Tutorial arriba, por si quieres ver los detalles.') },
  { target: '#nav-deudas', title: tr('Deudas'), text: tr('Lo que debes y lo que te deben, tus tarjetas de crédito y los gastos compartidos. Cada vez que pagas una parte, registras el abono y la deuda baja.') },
  { target: '#nav-servicios', title: tr('Servicios'), text: tr('Aquí está todo lo demás: amigos y gastos compartidos, metas, ahorro e inversiones, presupuestos, recordatorios, recibos escaneados, suscripciones y gastos hormiga, tu negocio, el resumen del mes y más. Mantén presionada una tarjeta para moverla.') },
  { target: 'filter', title: tr('Ahora, tu inicio: el período'), text: tr('Aquí escoges si ves todo, el mes, la semana o un día. Con las flechas cambias de mes. Todas las cifras de abajo dependen de lo que elijas aquí.') },
  { target: '#balance-card', title: tr('Dinero disponible'), text: tr('Es lo que entró menos lo que salió en el período. En el ejemplo entraron tres millones y medio de sueldo y ya salió el arriendo. Si sale en rojo, gastaste más de lo que entró. Debajo, el balance neto también descuenta tus deudas.') },
  { target: 'today', title: tr('Hoy puedes gastar'), text: tr('La cifra más útil del día: cuánto puedes gastar hoy sin quedarte corto a fin de mes. Ya aparta los pagos fijos que faltan, como el internet. Si te pasas, se pone en rojo y te dice cuánto puedes gastar desde mañana. Tócala para ver la cuenta.') },
  { target: 'next-action', title: tr('Tus sugerencias'), text: tr('Tarjetas que pasan solas con lo más útil para hacer ahora: un pago que vence, un ingreso que falta o una función que aún no usas. Deslízalas con el dedo, tócalas para hacerlo o sáltalas por hoy con la X.') },
  { target: 'projection', title: tr('Control y proyección'), text: tr('Tus gastos fijos, el dinero libre que te queda y tu límite diario. Cada cuadro se puede tocar para ver el desglose.') },
  { target: 'commitments', title: tr('Próximos compromisos'), text: tr('Los pagos fijos que te faltan este mes, con el valor que pagaste el mes pasado. Cuando pagues uno, tócalo para registrarlo.') },
  { target: 'goals', title: tr('Metas de ahorro'), text: tr('Tu meta principal y cuánto llevas. Toca para ver todas tus metas y cuándo las lograrías.') },
  { target: 'budgets', title: tr('Gastos por categoría'), text: tr('Compara en qué gastas con una guía sana: necesidades, gustos y ahorro. Toca cada grupo para ver sus categorías.') },
  { target: 'profile', title: tr('Personaliza FLOWI'), text: tr('En tu foto cambias el tema y los colores. Ahí mismo está "Ver tutorial" para repetir este recorrido cuando quieras.') },
  { title: tr('¡Listo!'), text: tr('Ya sabes registrar y leer tu inicio. Al cerrar vuelven tus datos reales. Si te pierdes en alguna página, busca su botón Tutorial. ¡A llevar tus cuentas claras!') },
]));

// ── Tutoriales de cada página ──
export type PageTourId =
  | 'gastos' | 'ingresos' | 'deudas' | 'cuentas' | 'inversiones' | 'metas' | 'presupuestos'
  | 'amigos' | 'compartidos' | 'hormiga' | 'recordatorios' | 'recibos' | 'productos'
  | 'importar' | 'negocio' | 'resumen' | 'notas' | 'compartir' | 'configuracion' | 'temas';

const ADD = 'voice|add';

export const PAGE_TOURS: Record<PageTourId, TourStep[]> = lazyT(() => ({
  gastos: [
    { title: tr('Tus gastos'), text: tr('Aquí está la lista completa de lo que sale. Arriba ves el total del período y abajo cada gasto, del más reciente al más antiguo.') },
    { target: ADD, title: tr('Registra un gasto'), text: tr('Con el botón + en esta página sale primero "Nuevo gasto". Te muestro el formulario por dentro.') },
    ...EXPENSE_STEPS(),
    { target: 'search', title: tr('Busca y edita'), text: tr('Usa el buscador por categoría, descripción o valor. Toca un gasto para editarlo, borrarlo o pasarlo a deuda si todavía no lo pagaste.') },
  ],
  ingresos: [
    { title: tr('Tus ingresos'), text: tr('Todo lo que entra: sueldo, ventas, pagos que te hacen. Con tus ingresos calculo cuánto puedes gastar cada día.') },
    { target: ADD, title: tr('Registra un ingreso'), text: tr('Con el botón + en esta página sale primero "Nuevo ingreso". Por voz di algo como "me pagaron el sueldo, dos millones".') },
    { title: tr('Con su cuenta'), text: tr('Si tienes tus cuentas en FLOWI, elige a cuál entró la plata y su saldo sube solo. Si es una venta de tu negocio, usa su categoría y aparece en Mi negocio.') },
    { title: tr('Edita o borra'), text: tr('Toca un ingreso de la lista para editarlo o borrarlo.') },
  ],
  deudas: [
    { title: tr('Tus deudas'), text: tr('Lo que debes y lo que te deben, en un solo lugar. Arriba ves el total pendiente y cuánto pagas en cuotas al mes.') },
    { target: ADD, title: tr('Registra una deuda o un abono'), text: tr('Con el botón + sale primero "Nueva deuda o abono". Por voz di "le presté cien mil a Juan" o "aboné cincuenta mil al préstamo".') },
    { title: tr('Intereses y cuotas'), text: tr('Si la deuda tiene intereses o cuotas, agrégalos: te digo cuánto te falta y la cuota aparece en tus pagos del mes.') },
    { title: tr('Tarjetas de crédito'), text: tr('Si agregas tus tarjetas en Cuentas, aquí ves lo que debes en cada una y sus últimas compras, y puedes abonarles.') },
    { title: tr('Gastos compartidos'), text: tr('Lo que divides con amigos también aparece aquí: quién te debe y a quién le debes.') },
  ],
  cuentas: [
    { title: tr('Cuentas y patrimonio'), text: tr('Registra dónde está tu plata: cuentas de banco, Nequi, efectivo y tarjetas de crédito. Así "Dinero disponible" en Inicio es la plata real que tienes.') },
    { target: ADD, title: tr('Crea una cuenta'), text: tr('Con el botón + en esta página sale primero "Nueva cuenta". Elige el banco, ponle nombre y escribe el saldo que tiene hoy.') },
    { title: tr('Cada movimiento mueve su saldo'), text: tr('Cuando registras un gasto o un ingreso y eliges la cuenta, su saldo se actualiza solo. Si mueves plata entre tus cuentas, usa Transferir para no contarla como gasto.') },
    { title: tr('¿Cuadra con el banco?'), text: tr('De vez en cuando te pregunto si el saldo coincide con la app del banco. Si no, lo ajustas en un toque.') },
    { title: tr('Tu patrimonio neto'), text: tr('Arriba sumo lo que tienes en cuentas, ahorros e inversiones y le resto lo que debes. Toca el ícono de información para ver cómo se calcula.') },
  ],
  inversiones: [
    { title: tr('Ahorro e inversiones'), text: tr('Donde tu plata crece: un CDT, una Cajita de Nu, Lulo, Trii, un fondo o tu pensión voluntaria.') },
    { target: ADD, title: tr('Regístralo'), text: tr('Con el botón + en esta página sale primero "Nueva inversión o ahorro". Elige el tipo y escribe el valor, la tasa y la fecha.') },
    { title: tr('Lo que vas ganando'), text: tr('Con la tasa calculo los intereses día a día. Para un CDT te muestro lo que recibes al vencer, después de retención, y te aviso antes de que venza.') },
    { title: tr('Fondos y acciones'), text: tr('No crecen con una tasa fija: anota su valor de vez en cuando y verás tu ganancia real. Te recuerdo si pasa mucho tiempo.') },
    { title: tr('Ahorro, no gasto'), text: tr('Lo que pones aquí no cuenta como gasto: se aparta de lo que puedes gastar y suma a tu patrimonio.') },
  ],
  metas: [
    { title: tr('Metas'), text: tr('¿Para qué ahorras? Una moto, un viaje, la prima del apartamento o un fondo para emergencias.') },
    { title: tr('Crea una meta'), text: tr('Ponle nombre, valor y si quieres una fecha. Con tu ritmo real de ahorro te digo cuándo la lograrías.') },
    { title: tr('Abona a tu meta'), text: tr('Cada vez que apartes plata, toca "Registrar ahorro" en la meta y verás la barra avanzar. Si al final del mes te sobra, te sugiero guardarlo.') },
    { title: tr('Empieza por emergencias'), text: tr('La primera meta que conviene tener es un fondo de unos 3 meses de tus gastos fijos para cualquier imprevisto.') },
  ],
  presupuestos: [
    { title: tr('Presupuestos'), text: tr('Decide cuánto quieres gastar en el mes y por categoría, y mira cuánto llevas.') },
    { title: tr('La guía 50/30/20'), text: tr('Una regla sencilla: la mitad de tus ingresos para necesidades, 30 % para gustos y 20 % para ahorro. Úsala como punto de partida y ajústala a tu vida.') },
    { title: tr('Antes de pasarte'), text: tr('Cuando una categoría se acerca a su límite, lo ves aquí y en Inicio, para que alcances a frenar a tiempo.') },
  ],
  amigos: [
    { title: tr('Amigos'), text: tr('Busca a tus amigos en FLOWI por nombre o @usuario y envíales una solicitud. Solo ven tu nombre y tu foto, nunca tus cuentas.') },
    { title: tr('Invita con un enlace'), text: tr('Si tu amigo aún no usa FLOWI, copia tu enlace y mándaselo. Al entrar quedan conectados.') },
    { open: 'expense', target: 'exp-shared', title: tr('Compartan gastos'), text: tr('Con amigos agregados, al registrar un gasto toca "Compartir este gasto" y elige con quién. A ellos les llega a su FLOWI y cada uno ve lo que debe.') },
  ],
  compartidos: [
    { title: tr('Gastos compartidos'), text: tr('Quién te debe, a quién le debes y cuánto, por persona.') },
    { open: 'expense', target: 'exp-shared', title: tr('Divide al registrar'), text: tr('En el formulario de gasto toca "Compartir este gasto": por partes iguales o con valores distintos. Si la otra persona usa FLOWI, le llega para aceptarlo.') },
    { title: tr('Cobra y registra abonos'), text: tr('Envía un mensaje de cobro por WhatsApp con el detalle. Cuando te paguen, registra el abono o marca "Ya me pagó todo". Si se deben los dos, se cruzan y quedan a paz y salvo.') },
  ],
  hormiga: [
    { title: tr('Suscripciones y gastos hormiga'), text: tr('Lo pequeño que se repite y, sumado, pesa: suscripciones como Netflix o Spotify, y compras pequeñas como el tinto o el snack.') },
    { title: tr('Cuánto te cuestan al año'), text: tr('Te muestro cuánto suman al mes y al año. Toca uno para ver su historial.') },
    { title: tr('Solo con registrar'), text: tr('No tienes que hacer nada especial: los encuentro en los gastos que ya registras. Mientras más registres, más exacto.') },
  ],
  recordatorios: [
    { title: tr('Recordatorios'), text: tr('Tus pagos del mes, pero también citas, fechas importantes y tareas.') },
    { target: ADD, title: tr('Crea uno'), text: tr('Con el botón + en esta página sale primero "Nuevo recordatorio". Ponle fecha y, si es un pago, el valor.') },
    { title: tr('Te aviso a tiempo'), text: tr('Activa las notificaciones y te aviso antes, aunque FLOWI esté cerrada. Los pagos con valor se apartan de lo que puedes gastar.') },
  ],
  recibos: [
    { target: 'search', title: tr('Mis recibos'), text: tr('Tus compras escaneadas con todos sus productos. Busca por tienda o por producto.') },
    { open: 'quick', target: 'quick-foto', title: tr('Cómo llegan aquí'), text: tr('Escanea un recibo con el botón + y "Foto del recibo", o comparte la foto desde otra app. Necesitas la IA conectada, que es gratis.'), cta: { label: tr('Activar la IA'), href: '/configuracion#ia' } },
    { title: tr('Edita la compra'), text: tr('Toca una compra para ver el detalle, corregir un producto o cambiar su categoría.') },
  ],
  productos: [
    { target: 'search', title: tr('¿Cuánto gasto en…?'), text: tr('Busca un producto, como huevos, cerveza o gasolina, y mira cuánto se te va al mes.') },
    { title: tr('¿Subió el precio?'), text: tr('Con tus recibos escaneados te muestro cómo cambia el precio de lo que más compras.') },
    { title: tr('De dónde salen los datos'), text: tr('Busco en los productos de tus recibos escaneados y en la descripción de tus otros gastos. Escanear recibos lo hace más exacto.') },
  ],
  importar: [
    { title: tr('Importar extracto'), text: tr('Registra de una vez todos los movimientos de tu banco.') },
    { title: tr('Qué archivos sirven'), text: tr('El PDF del extracto (como el de Nequi), o un CSV o Excel descargado de tu banco. Si el PDF tiene clave, te la pido.') },
    { title: tr('Revisa antes de guardar'), text: tr('Ves todos los movimientos antes de guardar. Los que ya tenías registrados se marcan para no duplicarlos.') },
  ],
  negocio: [
    { title: tr('Mi negocio'), text: tr('Tus ventas, costos y ganancia, aparte de tu plata personal.') },
    { title: tr('Registra tus ventas'), text: tr('Registra cada venta como ingreso con la categoría de negocio. Agrégale el costo del producto y el envío para saber cuánto te quedó.') },
    { title: tr('Ganancia del mes'), text: tr('Aquí ves cuánto vendiste, cuánto te costó y la ganancia de cada mes. Cambia de mes con las flechas.') },
  ],
  resumen: [
    { title: tr('Resumen y estadísticas'), text: tr('Qué pasó en el mes: cuánto entró, cuánto salió y en qué se fue tu plata.') },
    { title: tr('Compara'), text: tr('Te muestro cómo vas frente al mes anterior y lo que más llama la atención.') },
    { title: tr('Al empezar el mes'), text: tr('Del 1 al 10 te invito en Inicio a revisar el resumen del mes pasado.') },
  ],
  configuracion: [
    { title: tr('Configuración'), text: tr('Aquí ajustas FLOWI a tu gusto. Toca el nombre de cada sección para abrirla o cerrarla. Te muestro qué hay en cada una.') },
    { target: 'cfg-plan', title: tr('Tu plan'), text: tr('Si usas el plan gratis o Premium, y hasta cuándo. Tócalo para ver los planes y lo que incluye cada uno.') },
    { target: 'cfg-cuenta', title: tr('Cuenta y perfil'), text: tr('Tu nombre, foto y teléfono. Aquí también está "Ver tutorial" para repetir el recorrido de Inicio.') },
    { target: 'cfg-notificaciones', title: tr('Notificaciones'), text: tr('Actívalas para que te avise de tus pagos y recordatorios, aunque FLOWI esté cerrada. Puedes escoger el tono de la alerta.') },
    { target: 'cfg-seguridad', title: tr('Seguridad'), text: tr('Bloquea FLOWI con un PIN de 4 números y, si tu celular lo permite, con huella o rostro. Así nadie ve tu plata si toma tu celular.') },
    { target: 'cfg-sonidos', title: tr('Sonidos y animaciones'), text: tr('Escoge el sonido de cada acción (gastos, ingresos, ediciones) o apágalos.') },
    { target: 'cfg-gestion', title: tr('Categorías'), text: tr('Cambia los colores e íconos de tus categorías, crea las tuyas o recupera las que ocultaste.') },
    { target: 'cfg-apariencia', title: tr('Apariencia e idioma'), text: tr('Elige el tema de colores y cuáles salen en el menú rápido de tu foto. También cambias el idioma entre español e inglés.') },
    { target: '#ia', title: tr('Asistente con IA'), text: tr('Conecta la IA gratis para leer recibos con una foto y entender mejor lo que dictas. El botón "Ver paso a paso con voz" te guía en cada pantalla.') },
    { target: 'cfg-apoyar', title: tr('Apoyar a FLOWI'), text: tr('Si FLOWI te sirve, aquí ves cómo apoyar el proyecto. Es opcional.') },
    { target: 'cfg-finanzas', title: tr('Finanzas'), text: tr('Tu presupuesto mensual y la moneda en la que ves tus cifras.') },
    { target: 'cfg-privacidad', title: tr('Datos y privacidad'), text: tr('Descarga tus datos en Excel, borra lo registrado para empezar de cero o elimina tu cuenta. También están la política de privacidad y los términos.') },
  ],
  temas: [
    { title: tr('Temas'), text: tr('Cambia los colores de toda la app. Prueba varios: el cambio se ve al instante.') },
    { target: 'th-grid', title: tr('Elige tu tema'), text: tr('Toca un tema para usarlo. Día y Nova son claros, para usar con mucha luz; Original (Noche), Carbón y los demás son oscuros y cansan menos la vista de noche.') },
    { target: 'th-menu', title: tr('Tu menú rápido'), text: tr('Escoge qué temas salen al tocar tu foto, en el orden en que los toques. Así cambias de tema en un toque sin entrar aquí.') },
    { target: 'th-save', title: tr('Guarda'), text: tr('Toca Guardar cambios para que el menú rápido quede como lo dejaste.') },
  ],
  compartir: [
    { title: tr('Comparte desde tu banco'), text: tr('No tienes que escribir lo que pagaste: compártelo. Funciona con FLOWI instalada en tu celular.') },
    { title: tr('Cómo se hace'), text: tr('En la app de tu banco o de Nequi abre el comprobante del pago, toca Compartir y elige FLOWI en la lista.') },
    { title: tr('Imagen o texto'), text: tr('Si compartes la imagen del comprobante, la IA la lee: conéctala gratis una vez. Si compartes el texto, lo convierto en gasto o ingreso sin IA. Revisas y guardas.'), cta: { label: tr('Activar la IA'), href: '/configuracion#ia' } },
  ],
  notas: [
    { title: tr('Notas'), text: tr('Datos que no quieres olvidar: un número de cuenta para transferir, una contraseña de wifi, una lista.') },
    { target: ADD, title: tr('Crea una nota'), text: tr('Con el botón + en esta página sale primero "Nueva nota".') },
  ],
}));
