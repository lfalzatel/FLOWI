'use client';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

// Mientras la IA lee un recibo (puede tardar unos segundos): una barra animada y tarjetas que van
// contando funciones de FLOWI, para que la espera no se sienta vacía.
const TIPS: { title: string; text: string }[] = [
  { title: 'Mantén presionado el +', text: 'Y dicta: "gasté 20 mil en almuerzo y 8 mil en tinto". Registra varias cosas a la vez.' },
  { title: 'Hoy puedes gastar', text: 'Te dice cuánto puedes gastar hoy sin quedarte corto antes de fin de mes.' },
  { title: 'Recordatorios con aviso', text: 'Te aviso tus pagos aunque FLOWI esté cerrada, y los marcas con "Ya lo pagué".' },
  { title: 'Gastos hormiga', text: 'En Servicios ves cuánto se te va en tintos, domicilios o suscripciones al año.' },
  { title: 'Tus CDT y fondos', text: 'Registra tus inversiones y te digo cuánto vas ganando y cuándo vencen.' },
  { title: 'Próximos compromisos', text: 'Los pagos fijos que te faltan este mes, y los que ya pagaste.' },
  { title: 'Mi negocio', text: 'Separa las ventas de tu negocio de tu plata personal y mira tu ganancia.' },
  { title: 'Bloqueo con huella', text: 'En Configuración → Seguridad proteges FLOWI con PIN o huella.' },
];

export function ReadingTips({ isTech, label = 'Leyendo el recibo…' }: { isTech: boolean; label?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % TIPS.length), 3500);
    const s = setInterval(() => setSeconds(n => n + 1), 1000);
    return () => { clearInterval(t); clearInterval(s); };
  }, []);
  const tip = TIPS[i];
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
      <div key={i} className={`p-3 text-left border border-accent/20 bg-accent/5 animate-fade-in ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1"><Sparkles className="w-3 h-3 text-accent" /> ¿Sabías que…?</p>
        <p className="text-sm font-semibold text-text-primary normal-case mt-0.5">{tip.title}</p>
        <p className="text-xs text-text-secondary normal-case leading-snug">{tip.text}</p>
      </div>
      <style>{`@keyframes flowi-reading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
    </div>
  );
}
