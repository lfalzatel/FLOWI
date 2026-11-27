'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Fingerprint, Heart, LayoutGrid, Palette, Search, ShieldCheck, Sparkles, User, Volume2, Wallet, X,
  ChevronRight, ShieldAlert,
} from 'lucide-react';
import { tr } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { getLock, LOCK_EVENT } from '@/lib/appLock';
import { getAiKey } from '@/lib/aiAssist';
import { defaultCurrency } from '@/lib/format';
import { usePlayStore } from '@/hooks/usePlayStore';

// Inicio de Configuración: estado de seguridad, buscador y un mosaico por sección. Cada mosaico abre su
// sección sola, con su propio tutorial (la página la muestra con #clave en la dirección).

export type CfgKey = 'cuenta' | 'seguridad' | 'notificaciones' | 'apariencia' | 'sonidos' | 'ia' | 'finanzas' | 'gestion' | 'privacidad' | 'apoyar';

const THEME_NAME: Record<string, string> = {
  glassmorphism: 'Glass', obsidiana: 'Obsidiana', nova: 'Nova', light: 'Día', carbon: 'Carbón', dark: 'Noche',
  nebula: 'Nebulosa', cyberpunk: 'Cyber', kiloCode: 'Kilo',
};

export function SettingsHub({ onOpen, isTech }: { onOpen: (k: CfgKey) => void; isTech: boolean }) {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const playStore = usePlayStore();
  const [query, setQuery] = useState('');
  const [lockOn, setLockOn] = useState(false);
  const [notif, setNotif] = useState<'on' | 'off' | 'na'>('na');
  const [ai, setAi] = useState(false);

  useEffect(() => {
    const read = () => setLockOn(!!getLock(user?.uid));
    read();
    window.addEventListener(LOCK_EVENT, read);
    setAi(!!getAiKey());
    if (typeof Notification !== 'undefined') setNotif(Notification.permission === 'granted' ? 'on' : 'off');
    return () => window.removeEventListener(LOCK_EVENT, read);
  }, [user?.uid]);

  const tiles = useMemo(() => {
    const all: { key: CfgKey; icon: any; color: string; title: string; status: string; warn?: boolean; ok?: boolean; words: string }[] = [
      { key: 'seguridad', icon: Fingerprint, color: 'text-emerald-400 bg-emerald-500/10', title: tr('Seguridad'),
        status: lockOn ? tr('Bloqueo activo') : tr('Bloqueo apagado'), ok: lockOn, warn: !lockOn, words: 'huella pin bloqueo seguridad rostro clave fingerprint lock' },
      { key: 'apariencia', icon: Palette, color: 'text-sky-400 bg-sky-500/10', title: tr('Apariencia'),
        status: `${THEME_NAME[theme] ? tr(THEME_NAME[theme]) : theme} · ${tr('Idioma y animaciones')}`, words: 'tema temas colores idioma ingles language animaciones apariencia' },
      { key: 'notificaciones', icon: Bell, color: 'text-amber-400 bg-amber-500/10', title: tr('Notificaciones'),
        status: notif === 'on' ? tr('Activadas') : notif === 'off' ? tr('Apagadas') : tr('Avisos de pagos'), ok: notif === 'on', warn: notif === 'off', words: 'avisos notificaciones alertas recordatorios tono' },
      { key: 'ia', icon: Sparkles, color: 'text-violet-400 bg-violet-500/10', title: tr('Asistente con IA'),
        status: ai ? tr('Conectada') : tr('Sin conectar'), ok: ai, warn: !ai, words: 'ia inteligencia artificial recibos foto dictado openrouter' },
      { key: 'cuenta', icon: User, color: 'text-cyan-400 bg-cyan-500/10', title: tr('Cuenta y perfil'),
        status: profile?.name || user?.displayName || tr('Tu perfil'), words: 'cuenta perfil nombre foto telefono tutorial' },
      { key: 'finanzas', icon: Wallet, color: 'text-lime-400 bg-lime-500/10', title: tr('Finanzas'),
        status: `${tr('Moneda')}: ${profile?.currency || defaultCurrency()}`, words: 'moneda presupuesto finanzas mes' },
      { key: 'sonidos', icon: Volume2, color: 'text-pink-400 bg-pink-500/10', title: tr('Sonidos y animaciones'),
        status: tr('Sonidos de cada acción'), words: 'sonidos voz efectos confeti' },
      { key: 'gestion', icon: LayoutGrid, color: 'text-orange-400 bg-orange-500/10', title: tr('Categorías'),
        status: tr('Colores, íconos y tus categorías'), words: 'categorias iconos colores gestion usuarios' },
      { key: 'privacidad', icon: ShieldCheck, color: 'text-slate-300 bg-slate-500/10', title: tr('Datos y privacidad'),
        status: tr('Descargar, borrar, eliminar cuenta'), words: 'datos privacidad descargar borrar eliminar cuenta excel terminos' },
      { key: 'apoyar', icon: Heart, color: 'text-rose-400 bg-rose-500/10', title: tr('Apoyar a FLOWI'),
        status: tr('Opcional'), words: 'apoyar donar aporte' },
    ];
    const visible = all.filter(t => !(playStore && t.key === 'apoyar'));
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!q) return visible;
    return visible.filter(t => `${t.title} ${t.status} ${t.words}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
  }, [lockOn, notif, ai, theme, profile?.name, profile?.currency, user?.displayName, query, playStore]);

  const box = isTech ? 'rounded-none border border-accent/30 bg-deep' : 'glass-card';

  return (
    <div className="space-y-4">
      {/* Estado de seguridad: lo más importante en una app de plata */}
      <button type="button" onClick={() => onOpen('seguridad')} data-tour="cfg-security-status"
              className={`w-full flex items-center gap-3 p-4 text-left ${box} ${lockOn ? '' : 'border-amber-500/40'}`}>
        <span className={`w-11 h-11 shrink-0 flex items-center justify-center ${isTech ? 'rounded-none' : 'rounded-2xl'} ${lockOn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {lockOn ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-text-primary">{lockOn ? tr('Tu FLOWI está protegida') : tr('Protege tu plata con tu huella')}</span>
          <span className="block text-xs text-text-secondary">{lockOn ? tr('Se pide tu PIN o tu huella al abrir la app.') : tr('Si alguien toma tu celular, no podrá ver tu plata. Actívalo en un minuto.')}</span>
        </span>
        <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 ${isTech ? 'rounded-none' : 'rounded-full'} ${lockOn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {lockOn ? tr('Activo') : tr('Activar')}
        </span>
      </button>

      {/* Buscador */}
      <div className="relative" data-tour="cfg-search">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr('Buscar: huella, tema, moneda…')} autoComplete="off"
               aria-label={tr('Buscar en Configuración')}
               className={`w-full bg-glass border border-glass-border py-3 pl-10 pr-10 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent ${isTech ? 'rounded-none' : 'rounded-2xl'}`} />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label={tr('Borrar búsqueda')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"><X className="w-4 h-4" /></button>
        )}
      </div>

      {/* Mosaicos */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3" data-tour="cfg-tiles">
        {tiles.map(t => (
          <button key={t.key} type="button" onClick={() => onOpen(t.key)} data-tour={`cfg-tile-${t.key}`}
                  className={`relative text-left p-3.5 flex flex-col gap-2 transition-all active:scale-[0.97] ${box}`}>
            <span className="flex items-center justify-between">
              <span className={`w-9 h-9 flex items-center justify-center ${isTech ? 'rounded-none' : 'rounded-xl'} ${t.color}`}><t.icon className="w-5 h-5" /></span>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </span>
            <span className="text-sm font-semibold text-text-primary leading-tight">{t.title}</span>
            <span className={`text-[11px] leading-snug ${t.warn ? 'text-amber-400' : t.ok ? 'text-emerald-400' : 'text-text-muted'}`}>
              {t.warn ? '⚠ ' : t.ok ? '✓ ' : ''}{t.status}
            </span>
          </button>
        ))}
        {!tiles.length && <p className="col-span-2 text-sm text-text-muted text-center py-6">{tr('No encontré esa opción. Prueba con otra palabra.')}</p>}
      </div>
    </div>
  );
}
