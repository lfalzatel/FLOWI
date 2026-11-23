'use client';
import { tr, lazyT } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { GlitterParticles, GLITTER_THEMES } from '@/components/effects/GlitterParticles';

/** Fondo animado del tema (como el splash) mientras la IA lee: más cosas en movimiento durante la espera. */
export function ReadingBackdrop() {
  const { theme } = useTheme();
  const c = GLITTER_THEMES[theme] || GLITTER_THEMES.glassmorphism;
  return <GlitterParticles density={1.2} background={c.bg} colors={c.colors} light={!!c.light} className="animate-fade-in" />;
}

// Mientras la IA lee un recibo o unas capturas (puede tardar unos segundos): una barra animada y
// tarjetas que cuentan funciones de FLOWI. Pasan solas, y con las flechas se puede ir y volver.
const TIPS: { title: string; text: string }[] = lazyT(() => ([
  { title: tr('Mantén presionado el +'), text: tr('Y dicta: "gasté 20 mil en almuerzo y 8 mil en tinto". Registra varias cosas a la vez.') },
  { title: tr('Corrige con la voz'), text: tr('Después de leer un recibo, toca "Corregir con la voz" y di: "eran 25 mil" o "ponlo en Nequi".') },
  { title: tr('Hoy puedes gastar'), text: tr('Te dice cuánto puedes gastar hoy sin quedarte corto antes de fin de mes.') },
  { title: tr('Recordatorios con aviso'), text: tr('Te aviso tus pagos aunque FLOWI esté cerrada, y los marcas con "Ya lo pagué".') },
  { title: tr('Gastos hormiga'), text: tr('En Servicios ves cuánto se te va en tintos, domicilios o suscripciones al año.') },
  { title: tr('Tus CDT y fondos'), text: tr('Registra tus inversiones y te digo cuánto vas ganando y cuándo vencen.') },
  { title: tr('Créditos como en el banco'), text: tr('Pon la tasa, el seguro y el día de pago: FLOWI calcula intereses y seguro igual que el banco.') },
  { title: tr('Me deben'), text: tr('¿Prestaste plata? Regístrala como "Me deben" y cada abono te entra como ingreso.') },
  { title: tr('Próximos compromisos'), text: tr('Los pagos fijos que te faltan este mes, y los que ya pagaste.') },
  { title: tr('Tus cuentas'), text: tr('Nequi, banco, efectivo: cada movimiento sabe de qué cuenta salió y ves el saldo de cada una.') },
  { title: tr('Metas de ahorro'), text: tr('Ponle nombre y fecha a lo que quieres lograr y mira cuánto te falta cada mes.') },
  { title: tr('Importa tu extracto'), text: tr('Sube el extracto del banco y FLOWI registra los movimientos por ti.') },
  { title: tr('Filtra por fechas'), text: tr('Arriba en Gastos e Ingresos eliges día, semana, mes o todo, y te mueves con las flechas.') },
  { title: tr('Mi negocio'), text: tr('Separa las ventas de tu negocio de tu plata personal y mira tu ganancia.') },
  { title: tr('Exporta tus datos'), text: tr('Descarga tus movimientos en Excel cuando quieras, desde el botón de descarga.') },
  { title: tr('Bloqueo con huella'), text: tr('En Configuración → Seguridad proteges FLOWI con PIN o huella.') },
  { title: tr('Temas'), text: tr('Cambia los colores de FLOWI desde tu perfil: claro, oscuro y otros estilos.') },
]));

/**
 * Pantalla limpia mientras se leen capturas: tapa el formulario con solo el título, la barra y las
 * tarjetas; al terminar desaparece y queda el formulario ya lleno.
 */
export function ReadingOverlay({ isTech, title, label, onCancel }: { isTech: boolean; title: string; label: string; onCancel?: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={`fixed inset-0 z-[150] flex items-center justify-center p-4 ${isTech ? 'font-mono' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
      <ReadingBackdrop />
      <div className={`relative w-full max-w-md p-6 glass-dropdown animate-fade-in-up flex flex-col items-center text-center ${isTech ? 'rounded-none border border-accent uppercase' : 'rounded-3xl shadow-2xl'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
          <h2 className={`font-bold text-lg ${isTech ? 'text-accent' : 'text-text-primary font-syne'}`}>{title}</h2>
        </div>
        <ReadingTips isTech={isTech} label={label} />
        {onCancel && (
          <button type="button" onClick={onCancel} className="mt-1 text-xs text-text-muted hover:text-text-primary underline normal-case">
            {tr('Cancelar y llenarlo a mano')}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ReadingTips({ isTech, label = 'Leyendo el recibo…' }: { isTech: boolean; label?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [dir, setDir] = useState<1 | -1>(1);
  // Avance estimado: la IA no dice cuánto lleva, así que se estima con lo que se demoraron las
  // últimas lecturas de este tipo en este celular (se llena rápido al inicio y luego más despacio, sin llegar sola al 100 %)
  const timeKey = `flowi_read_ms_${label}`;
  const expected = useRef(12000);
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  // Si la persona usa las flechas, las tarjetas dejan de pasar solas un rato para que alcance a leer
  const pausedUntil = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setDir(1);
      setI(n => (n + 1) % TIPS.length);
    }, 4000);
    try { const v = Number(localStorage.getItem(timeKey)); if (v > 2000 && v < 90000) expected.current = v; } catch { /* nada */ }
    startedAt.current = Date.now();
    const s = setInterval(() => setElapsed(Date.now() - startedAt.current), 200);
    return () => {
      clearInterval(t); clearInterval(s);
      // Se aprende el tiempo real (promedio que pesa más lo reciente)
      const took = Date.now() - startedAt.current;
      if (took > 2000 && took < 90000) {
        try { localStorage.setItem(timeKey, String(Math.round(expected.current * 0.6 + took * 0.4))); } catch { /* nada */ }
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (d: 1 | -1) => {
    pausedUntil.current = Date.now() + 10000;
    setDir(d);
    setI(n => (n + d + TIPS.length) % TIPS.length);
  };
  const tip = TIPS[i];
  const pct = Math.min(95, Math.round(95 * (1 - Math.exp(-2.3 * elapsed / expected.current))));
  const slow = elapsed > expected.current * 2.5 ? ' Está tardando más de lo normal…' : elapsed > expected.current * 1.3 ? ' Ya casi…' : '';
  const arrow = `shrink-0 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors ${isTech ? 'rounded-none' : 'rounded-full'}`;
  return (
    <div className="w-full space-y-3 my-2" role="status" aria-live="polite">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-accent text-left normal-case">{label}{slow}</p>
          <span className="text-[11px] font-bold text-accent tabular-nums shrink-0">≈ {pct} %</span>
        </div>
        {/* La barra crece con el avance y por dentro sigue pasando un brillo: avanza y sigue trabajando */}
        <div className={`h-2 w-full overflow-hidden bg-glass ${isTech ? 'rounded-none' : 'rounded-full'}`}>
          <div className={`relative h-full overflow-hidden bg-gradient-to-r from-accent-dim to-accent ${isTech ? '' : 'rounded-full'}`}
               style={{ width: `${Math.max(6, pct)}%`, transition: 'width .4s ease-out' }}>
            <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                 style={{ animation: 'flowi-reading 1.3s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
      <div className={`flex items-center gap-1 p-2 border border-accent/20 bg-accent/5 ${isTech ? 'rounded-none' : 'rounded-2xl'}`}>
        <button type="button" onClick={() => go(-1)} aria-label={tr('Consejo anterior')} className={arrow}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div key={i} className="flex-1 min-w-0 text-left py-1" style={{ animation: `${dir === 1 ? 'flowi-tip-next' : 'flowi-tip-prev'} .3s ease-out` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent" /> {tr('¿Sabías que…?')} <span className="ml-auto font-normal normal-case tracking-normal">{i + 1}/{TIPS.length}</span>
          </p>
          <p className="text-sm font-semibold text-text-primary normal-case mt-0.5">{tip.title}</p>
          <p className="text-xs text-text-secondary normal-case leading-snug min-h-[2.5em]">{tip.text}</p>
        </div>
        <button type="button" onClick={() => go(1)} aria-label={tr('Siguiente consejo')} className={arrow}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <style>{`@keyframes flowi-reading{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
@keyframes flowi-tip-next{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
@keyframes flowi-tip-prev{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
