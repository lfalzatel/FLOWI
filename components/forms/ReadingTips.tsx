'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

// Mientras la IA lee un recibo o unas capturas (puede tardar unos segundos): una barra animada y
// tarjetas que cuentan funciones de FLOWI. Pasan solas, y con las flechas se puede ir y volver.
const TIPS: { title: string; text: string }[] = [
  { title: 'Mantén presionado el +', text: 'Y dicta: "gasté 20 mil en almuerzo y 8 mil en tinto". Registra varias cosas a la vez.' },
  { title: 'Corrige con la voz', text: 'Después de leer un recibo, toca "Corregir con la voz" y di: "eran 25 mil" o "ponlo en Nequi".' },
  { title: 'Hoy puedes gastar', text: 'Te dice cuánto puedes gastar hoy sin quedarte corto antes de fin de mes.' },
  { title: 'Recordatorios con aviso', text: 'Te aviso tus pagos aunque FLOWI esté cerrada, y los marcas con "Ya lo pagué".' },
  { title: 'Gastos hormiga', text: 'En Servicios ves cuánto se te va en tintos, domicilios o suscripciones al año.' },
  { title: 'Tus CDT y fondos', text: 'Registra tus inversiones y te digo cuánto vas ganando y cuándo vencen.' },
  { title: 'Créditos como en el banco', text: 'Pon la tasa, el seguro y el día de pago: FLOWI calcula intereses y seguro igual que el banco.' },
  { title: 'Me deben', text: '¿Prestaste plata? Regístrala como "Me deben" y cada abono te entra como ingreso.' },
  { title: 'Próximos compromisos', text: 'Los pagos fijos que te faltan este mes, y los que ya pagaste.' },
  { title: 'Tus cuentas', text: 'Nequi, banco, efectivo: cada movimiento sabe de qué cuenta salió y ves el saldo de cada una.' },
  { title: 'Metas de ahorro', text: 'Ponle nombre y fecha a lo que quieres lograr y mira cuánto te falta cada mes.' },
  { title: 'Importa tu extracto', text: 'Sube el extracto del banco y FLOWI registra los movimientos por ti.' },
  { title: 'Filtra por fechas', text: 'Arriba en Gastos e Ingresos eliges día, semana, mes o todo, y te mueves con las flechas.' },
  { title: 'Mi negocio', text: 'Separa las ventas de tu negocio de tu plata personal y mira tu ganancia.' },
  { title: 'Exporta tus datos', text: 'Descarga tus movimientos en Excel cuando quieras, desde el botón de descarga.' },
  { title: 'Bloqueo con huella', text: 'En Configuración → Seguridad proteges FLOWI con PIN o huella.' },
  { title: 'Temas', text: 'Cambia los colores de FLOWI desde tu perfil: claro, oscuro y otros estilos.' },
];

export function ReadingTips({ isTech, label = 'Leyendo el recibo…' }: { isTech: boolean; label?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [dir, setDir] = useState<1 | -1>(1);
  const [seconds, setSeconds] = useState(0);
  // Si la persona usa las flechas, las tarjetas dejan de pasar solas un rato para que alcance a leer
  const pausedUntil = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setDir(1);
      setI(n => (n + 1) % TIPS.length);
    }, 4000);
    const s = setInterval(() => setSeconds(n => n + 1), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);
  const go = (d: 1 | -1) => {
    pausedUntil.current = Date.now() + 10000;
    setDir(d);
    setI(n => (n + d + TIPS.length) % TIPS.length);
  };
  const tip = TIPS[i];
  const arrow = `shrink-0 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors ${isTech ? 'rounded-none' : 'rounded-full'}`;
  return (
    <div className="w-full space-y-3 my-2" role="status" aria-live="polite">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-accent text-center normal-case">
          {label}{seconds >= 12 ? ' Ya casi…' : ''}
        </p>
        <div className={`h-1.5 w-full overflow-hidden bg-glass ${isTech ? 'rounded-none' : 'rounded-full'}`}>
          <div className={`h-full w-1/3 bg-accent ${isTech ? '' : 'rounded-full'}`} style={{ animation: 'flowi-reading 1.4s ease-in-out infinite' }} />
        </div>
      </div>
      <div className={`flex items-center gap-1 p-2 border border-accent/20 bg-accent/5 ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
        <button type="button" onClick={() => go(-1)} aria-label="Consejo anterior" className={arrow}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div key={i} className="flex-1 min-w-0 text-left py-1" style={{ animation: `${dir === 1 ? 'flowi-tip-next' : 'flowi-tip-prev'} .3s ease-out` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent" /> ¿Sabías que…? <span className="ml-auto font-normal normal-case tracking-normal">{i + 1}/{TIPS.length}</span>
          </p>
          <p className="text-sm font-semibold text-text-primary normal-case mt-0.5">{tip.title}</p>
          <p className="text-xs text-text-secondary normal-case leading-snug min-h-[2.5em]">{tip.text}</p>
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Siguiente consejo" className={arrow}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <style>{`@keyframes flowi-reading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
@keyframes flowi-tip-next{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
@keyframes flowi-tip-prev{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
