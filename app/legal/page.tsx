'use client';
import Link from 'next/link';
import { ChevronLeft, FileText, ShieldCheck } from 'lucide-react';
import { FREE_LIMITS, PLANS } from '@/lib/plans';
import { formatCurrency } from '@/lib/format';

// Política de tratamiento de datos (Ley 1581 de 2012 y Decreto 1377 de 2013) y términos de uso.
// Página pública: se puede leer sin iniciar sesión (la enlaza la portada antes de entrar).

const UPDATED = '9 de noviembre de 2026';
const WHATSAPP = 'https://wa.me/573104604592';

type Block = { title: string; body: (string | string[])[] };

const PRIVACY: Block[] = [
  {
    title: '1. Quién trata tus datos',
    body: [
      'FLOWI es una aplicación de finanzas personales hecha en Colombia por un desarrollador independiente, que es el responsable del tratamiento de tus datos.',
      'Para cualquier consulta, reclamo o solicitud sobre tus datos escríbenos por WhatsApp al +57 310 460 4592 (también desde el botón de WhatsApp en la parte de arriba de la app).',
    ],
  },
  {
    title: '2. Qué datos guardamos',
    body: [[
      'De tu cuenta de Google: nombre, correo y foto de perfil. No conocemos tu contraseña de Google.',
      'Lo que tú registras: gastos, ingresos, deudas, cuentas (nombre del banco y saldo, nunca números de cuenta), inversiones y ahorros, metas, presupuestos, recordatorios, notas y ventas de tu negocio.',
      'Datos de uso: los días en que abres la app y tu racha, para mostrártelos y entender cómo se usa FLOWI.',
      'Notificaciones: un identificador de tu celular para enviarte recordatorios, si los activas.',
      'Pagos: referencia, plan, valor, fecha y estado. FLOWI no ve ni guarda los datos de tu tarjeta o de tu cuenta bancaria; esos los maneja Wompi.',
      'Comprobantes de transferencia: si pagas por transferencia, guardamos la imagen que subes para poder verificar el pago.',
    ]],
  },
  {
    title: '3. Para qué los usamos',
    body: [[
      'Mostrarte tus finanzas, cálculos, resúmenes y recordatorios.',
      'Enviarte notificaciones que tú activaste (pagos próximos, resumen del día, vencimiento de tu plan).',
      'Activar y administrar tu plan Premium.',
      'Darte soporte, corregir errores y mejorar la app.',
    ], 'No vendemos, alquilamos ni compartimos tus datos con fines publicitarios. FLOWI no tiene publicidad.'],
  },
  {
    title: '4. Quién más puede verlos',
    body: [
      'Cada cuenta ve únicamente su propia información. El administrador de FLOWI puede consultar la información de las cuentas solo para dar soporte, revisar pagos y corregir errores, y la trata con total confidencialidad.',
      'Usamos estos proveedores, que tratan los datos por encargo nuestro:',
      [
        'Google Firebase: inicio de sesión, almacenamiento de los datos y notificaciones. Sus servidores pueden estar fuera de Colombia (por ejemplo, en Estados Unidos), lo que implica una transferencia internacional de datos que autorizas al usar FLOWI.',
        'Wompi (Bancolombia): procesa los pagos con tarjeta, Nequi, PSE o Bancolombia.',
        'OpenRouter: solo si conectas el asistente con IA. La frase que dictas o la foto del recibo se envía al modelo gratuito para entenderla; esas fotos no se guardan en FLOWI. La clave de conexión queda solo en tu celular.',
      ],
    ],
  },
  {
    title: '5. Tus derechos',
    body: [
      'Como titular de tus datos puedes, en cualquier momento:',
      [
        'Conocer, actualizar y corregir tus datos.',
        'Pedir prueba de la autorización que nos diste.',
        'Saber qué uso le hemos dado a tus datos.',
        'Revocar la autorización y pedir que borremos tus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) si consideras que no se respetaron tus derechos.',
      ],
      'Escríbenos por WhatsApp. Respondemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, como indica la ley.',
    ],
  },
  {
    title: '6. Cuánto tiempo los guardamos',
    body: [
      'Mientras tengas tu cuenta en FLOWI. Si pides borrarla, eliminamos tus datos en máximo 15 días hábiles, salvo el registro de los pagos realizados, que se conserva el tiempo que exige la ley.',
    ],
  },
  {
    title: '7. Seguridad',
    body: [
      'La conexión con FLOWI va cifrada, el acceso es con tu cuenta de Google y la base de datos tiene reglas que impiden que una cuenta lea la información de otra. Aun así, ningún sistema es 100 % seguro: cuida el acceso a tu celular y a tu cuenta de Google.',
    ],
  },
  {
    title: '8. Menores de edad',
    body: ['FLOWI está pensada para mayores de 18 años. Si eres menor, úsala con la autorización de tu madre, padre o representante.'],
  },
  {
    title: '9. Cambios a esta política',
    body: ['Si cambiamos algo importante te avisaremos dentro de la app. Esta política rige desde el ' + UPDATED + '.'],
  },
];

const plansText = PLANS.map(p => `${p.label}: ${formatCurrency(p.price, 'COP')}`).join(' · ');

const TERMS: Block[] = [
  {
    title: '1. Qué es FLOWI',
    body: [
      'FLOWI es una herramienta para organizar tu plata. No es un banco, no mueve tu dinero, no se conecta a tus cuentas bancarias y no da asesoría financiera ni de inversión.',
      'Los cálculos (“Hoy puedes gastar”, intereses de CDT y deudas, proyecciones, resúmenes) son estimaciones a partir de lo que tú registras. Confirma siempre los valores oficiales con tu banco o entidad.',
    ],
  },
  {
    title: '2. Tu cuenta',
    body: ['Entras con tu cuenta de Google. Eres responsable de la información que registras y del acceso a tu celular y a tu cuenta.'],
  },
  {
    title: '3. Plan gratis',
    body: [
      'FLOWI es gratis para siempre, con estos límites:',
      [
        'Gastos, ingresos, deudas, cuentas, recordatorios y notas: ilimitados.',
        `Inversiones y ahorros activos: ${FREE_LIMITS.investments}.`,
        `Metas activas: ${FREE_LIMITS.goals}.`,
        `Recibos leídos con foto: ${FREE_LIMITS.receiptsPerMonth} al mes.`,
        'Mi negocio: solo el mes actual.',
      ],
      'Si algún día cambiamos estos límites te avisaremos antes, y nunca borraremos lo que ya registraste.',
    ],
  },
  {
    title: '4. FLOWI Premium',
    body: [
      `Premium quita los límites del plan gratis. Precios: ${plansText}.`,
      [
        'Es un pago único por el periodo que eliges. No es un cobro automático: no guardamos tu tarjeta y el plan no se renueva solo.',
        'Si renuevas antes de que termine, el nuevo periodo se suma al tiempo que te queda.',
        'Puedes pagar con Wompi (tarjeta, Nequi, PSE o Bancolombia), y Premium se activa apenas Wompi aprueba el pago. También puedes pagar por transferencia y subir el comprobante; en ese caso se activa cuando verificamos que llegó el dinero.',
        'Quienes ya usaban FLOWI antes del 9 de noviembre de 2026 reciben Premium de regalo hasta el 9 de diciembre de 2026.',
      ],
    ],
  },
  {
    title: '5. Cuando vence Premium',
    body: ['Te avisamos unos días antes. Si no renuevas, vuelves al plan gratis: tus datos siguen ahí y puedes verlos, solo no podrás agregar más de lo que permite el plan gratis.'],
  },
  {
    title: '6. Devoluciones',
    body: ['Si pagaste por error, se te cobró dos veces o el pago no activó Premium, escríbenos por WhatsApp dentro de los 5 días hábiles siguientes al pago. Revisamos tu caso y, si corresponde, te devolvemos el dinero por el mismo medio o por transferencia. Esto no limita los derechos que te da el Estatuto del Consumidor (Ley 1480 de 2011).'],
  },
  {
    title: '7. Asistente con IA',
    body: ['Es opcional y gratuito, usa los modelos gratuitos de OpenRouter y está sujeto a sus condiciones. La IA puede equivocarse: revisa siempre lo que llena antes de guardar.'],
  },
  {
    title: '8. Disponibilidad y responsabilidad',
    body: ['Hacemos lo posible para que FLOWI funcione siempre, pero puede haber fallas o pausas por mantenimiento. FLOWI no responde por decisiones financieras tomadas con base en la app ni por pérdidas causadas por datos mal registrados o por fallas de terceros (Google, Wompi, OpenRouter, tu operador o tu banco).'],
  },
  {
    title: '9. Uso adecuado',
    body: ['No uses FLOWI para actividades ilegales ni intentes acceder a información de otras personas o afectar el funcionamiento de la app. Si pasa, podemos suspender la cuenta.'],
  },
  {
    title: '10. Cambios y ley aplicable',
    body: ['Si cambiamos estos términos te avisaremos dentro de la app. Se rigen por las leyes de Colombia. Vigentes desde el ' + UPDATED + '.'],
  },
];

function Section({ id, icon: Icon, title, intro, blocks }: { id: string; icon: typeof ShieldCheck; title: string; intro: string; blocks: Block[] }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-3xl bg-[#0D1527] border border-white/5 p-5 md:p-7 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-syne">{title}</h2>
          <p className="text-xs text-white/45">Actualizada el {UPDATED}</p>
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{intro}</p>
      {blocks.map(b => (
        <div key={b.title} className="space-y-2">
          <h3 className="font-semibold text-emerald-300">{b.title}</h3>
          {b.body.map((p, i) => Array.isArray(p) ? (
            <ul key={i} className="list-disc pl-5 space-y-1 text-sm text-white/65 leading-relaxed marker:text-emerald-400/60">
              {p.map(li => <li key={li}>{li}</li>)}
            </ul>
          ) : (
            <p key={i} className="text-sm text-white/65 leading-relaxed">{p}</p>
          ))}
        </div>
      ))}
    </section>
  );
}

export default function LegalPage() {
  const back = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#050B14] text-white">
      <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={back} aria-label="Volver"
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold font-syne">Privacidad y términos</h1>
        </div>

        <nav className="grid grid-cols-2 gap-2 text-sm">
          <a href="#privacidad" className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> Política de privacidad
          </a>
          <a href="#terminos" className="rounded-2xl bg-white/5 hover:bg-white/10 px-4 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" /> Términos de uso
          </a>
        </nav>

        <Section id="privacidad" icon={ShieldCheck} title="Política de privacidad"
                 intro="Así cuidamos tus datos personales, según la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia. Al crear tu cuenta en FLOWI autorizas el tratamiento de tus datos para lo que se explica aquí."
                 blocks={PRIVACY} />

        <Section id="terminos" icon={FileText} title="Términos de uso"
                 intro="Las reglas para usar FLOWI y su plan Premium. Al usar la app aceptas estos términos."
                 blocks={TERMS} />

        <footer className="text-center text-xs text-white/40 space-y-2 pb-6">
          <p>
            ¿Preguntas sobre tus datos o tu plan?{' '}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-emerald-400/80 hover:text-emerald-300">Escríbenos por WhatsApp</a>
          </p>
          <p><Link href="/" className="hover:text-white/70">Volver a FLOWI</Link></p>
        </footer>
      </main>
    </div>
  );
}
