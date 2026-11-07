'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { BellRing, CheckCircle2, BellOff, Smartphone, X } from 'lucide-react';

export type NotificationDialogKind = 'ask' | 'enabled' | 'blocked' | 'ios-install';

interface Props {
  kind: NotificationDialogKind;
  context?: string;       // por qué se pide ahora (p. ej. "Internet hogar")
  onConfirm: () => void;  // "Sí, avísame" / "Entendido"
  onCancel: () => void;   // "Ahora no" / cerrar
}

const COPY: Record<NotificationDialogKind, { badge: string; title: string; confirm: string; cancel?: string }> = {
  ask: { badge: 'Avisos de pagos', title: '¿Te avisamos de tus pagos?', confirm: 'Sí, avísame', cancel: 'Ahora no' },
  enabled: { badge: 'Notificaciones activas', title: '¡Listo! Te avisaremos a tiempo', confirm: 'Entendido' },
  blocked: { badge: 'Notificaciones bloqueadas', title: 'Tu celular tiene bloqueados los avisos', confirm: 'Entendido' },
  'ios-install': { badge: 'Primero instala FLOWI', title: 'En iPhone, instala FLOWI para recibir avisos', confirm: 'Entendido' },
};

// Mismo diseño del diálogo de eliminar (ConfirmDialog), en el color de la app
export function NotificationDialog({ kind, context, onConfirm, onCancel }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';
  const copy = COPY[kind];
  const Icon = kind === 'enabled' ? CheckCircle2 : kind === 'blocked' ? BellOff : kind === 'ios-install' ? Smartphone : BellRing;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (typeof document === 'undefined') return null;

  const message = (() => {
    if (kind === 'ask') {
      return (
        <>
          {context
            ? <>Te avisamos de <b>{context}</b> antes de que se te pase, aunque FLOWI esté cerrada.</>
            : <>Te avisamos de tus pagos y recordatorios antes de que se te pasen, aunque FLOWI esté cerrada.</>}
          {' '}Solo lo importante: un resumen a las 7 a. m. cuando hay algo que pagar.
        </>
      );
    }
    if (kind === 'enabled') {
      return <>Todos los días a las <b>7 a. m.</b> te contamos qué pagos tienes hoy y mañana, y tus recordatorios llegan a su hora. Puedes apagarlos cuando quieras tocando tu foto → Notificaciones.</>;
    }
    if (kind === 'blocked') {
      return (
        <>
          Para activarlos: toca el <b>candado</b> (o los tres puntos ⋮) junto a la dirección de FLOWI → <b>Configuración del sitio</b> → <b>Notificaciones</b> → <b>Permitir</b>.
          {' '}Si instalaste FLOWI como app: mantén presionado su ícono → <b>Información de la app</b> → <b>Notificaciones</b>.
        </>
      );
    }
    return <>Abre FLOWI en Safari, toca <b>Compartir</b> (el cuadro con la flecha) → <b>Agregar a pantalla de inicio</b>. Luego abre FLOWI desde ese ícono y activa los avisos.</>;
  })();

  const accent = kind === 'blocked' ? 'amber' : 'accent';
  const iconBox = isTechTheme
    ? 'bg-accent/10 border border-accent/40 text-accent rounded-none'
    : accent === 'amber'
      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-2xl'
      : 'bg-accent/15 text-accent border border-accent/20 rounded-2xl';

  return createPortal(
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className={`w-full max-w-sm relative z-10 p-6 animate-scale-in overflow-hidden shadow-2xl ${
        isTechTheme
          ? 'bg-[#05050A] border-2 border-accent/50 rounded-none font-mono text-xs text-white'
          : isLight ? 'bg-white border border-gray-200 rounded-3xl text-gray-900' : 'bg-[#0D1527] border border-white/10 rounded-3xl text-white'
      }`}>
        <button onClick={onCancel} aria-label="Cerrar"
                className={`absolute top-4 right-4 transition-colors p-1 ${isTechTheme ? 'text-accent/70 hover:text-accent' : isLight ? 'text-gray-400 hover:text-gray-600' : 'text-white/40 hover:text-white'}`}>
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-6">
          <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${iconBox}`}>
            <Icon className={`w-5 h-5 ${kind === 'ask' ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <span className={`block text-[10px] tracking-widest font-bold uppercase ${accent === 'amber' ? 'text-amber-400' : 'text-accent'} ${isTechTheme ? '' : 'font-syne'}`}>{copy.badge}</span>
            <h3 className={`text-base font-bold leading-tight ${isTechTheme ? 'text-accent uppercase' : isLight ? 'text-gray-900 font-syne' : 'text-white font-syne'}`}>{copy.title}</h3>
          </div>
        </div>

        <p className={`mb-6 leading-relaxed ${isTechTheme ? 'text-white/75 text-[11px]' : isLight ? 'text-gray-600 text-sm' : 'text-gray-300 text-sm'}`}>{message}</p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          {copy.cancel && (
            <button type="button" onClick={onCancel}
                    className={`flex-1 py-3 text-center transition-all font-semibold active:scale-[0.98] ${
                      isTechTheme ? 'bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-none uppercase'
                        : isLight ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl text-sm'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm'}`}>
              {copy.cancel}
            </button>
          )}
          <button type="button" onClick={onConfirm}
                  className={`flex-1 py-3 text-center transition-all font-bold active:scale-[0.98] ${
                    isTechTheme ? 'bg-accent/20 border border-accent text-accent hover:bg-accent/30 rounded-none uppercase'
                      : `bg-accent hover:opacity-90 ${isLight ? 'text-white' : 'text-black'} rounded-xl text-sm shadow-lg shadow-accent/25`}`}>
            {copy.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
