'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Hand, RotateCcw } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  bgColor: string;
  group: string;
  isNew?: boolean;
  soon?: boolean;
}

// Tarjetas de Servicios: agrupadas por defecto; manteniendo presionada una tarjeta se arrastra a
// otra posición (las demás se corren), como los íconos del celular. El orden y el aviso de ayuda
// se guardan en el perfil (users/{uid}.servicesOrder y servicesTipSeen).
const LONG_PRESS_MS = 450;

export function ServiceGrid({ services, groups, query, onProfile }: {
  services: ServiceItem[]; groups: string[]; query: string; onProfile: () => void;
}) {
  const { theme } = useTheme();
  const isTech = theme === 'cyberpunk' || theme === 'kiloCode';
  const { user, profile } = useAuth();
  const saved = profile?.servicesOrder;

  // Orden actual: el de la persona (con lo nuevo al final) o el de los grupos
  const baseOrder = useMemo(() => {
    const ids = services.map(s => s.id);
    if (!saved?.length) return ids;
    return [...saved.filter(id => ids.includes(id)), ...ids.filter(id => !saved.includes(id))];
  }, [services, saved]);
  const [order, setOrder] = useState<string[]>(baseOrder);
  useEffect(() => { setOrder(baseOrder); }, [baseOrder]);

  const custom = !!saved?.length;
  const byId = useMemo(() => new Map(services.map(s => [s.id, s])), [services]);

  // ── Arrastrar ──
  const [dragId, setDragId] = useState<string | null>(null);
  // Copia flotante pegada al dedo: tamaño de la tarjeta y el punto exacto donde se agarró
  const [ghost, setGhost] = useState<{ w: number; h: number; grabX: number; grabY: number } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const press = useRef<{ id: string; x: number; y: number; timer: ReturnType<typeof setTimeout> | null; started: boolean } | null>(null);
  const justDragged = useRef(false);
  const orderRef = useRef(order);
  orderRef.current = order;

  // Mientras se arrastra, la página no hace scroll. El listener está siempre puesto y no es pasivo:
  // así el primer movimiento del dedo ya se bloquea y el navegador no cancela el arrastre.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (!press.current?.started) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) moveRef.current(t.clientX, t.clientY);
    };
    const end = () => { if (press.current?.started) endRef.current(); };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    const noSelect = (e: Event) => { if (press.current) e.preventDefault(); };
    el.addEventListener('touchmove', stop, { passive: false });
    document.addEventListener('selectstart', noSelect);
    return () => {
      el.removeEventListener('touchmove', stop); el.removeEventListener('touchend', end); el.removeEventListener('touchcancel', end);
      document.removeEventListener('selectstart', noSelect);
    };
  }, []);

  const saveOrder = (ids: string[] | null) => {
    if (!user) return;
    updateDoc(doc(db, 'users', user.uid), { servicesOrder: ids }).catch(e => console.warn('No se pudo guardar el orden:', e));
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (query) return; // con búsqueda no se reordena
    const el = e.currentTarget as HTMLElement;
    const pointerId = e.pointerId;
    press.current = {
      id, x: e.clientX, y: e.clientY, started: false,
      timer: setTimeout(() => {
        if (!press.current) return;
        press.current.started = true;
        try { el.setPointerCapture(pointerId); } catch { /* sin captura */ }
        try { navigator.vibrate?.(25); } catch { /* sin vibración */ }
        const rect = el.getBoundingClientRect();
        const p = press.current;
        setGhost({ w: rect.width, h: rect.height, grabX: p.x - rect.left, grabY: p.y - rect.top });
        setPos({ x: p.x, y: p.y });
        setDragId(id);
      }, LONG_PRESS_MS),
    };
  };

  const onPointerMove = (e: React.PointerEvent) => moveTo(e.clientX, e.clientY);

  // Mover a (x, y): sirve tanto para eventos de puntero como de toque
  const moveTo = (clientX: number, clientY: number) => {
    const p = press.current;
    if (!p) return;
    if (!p.started) {
      // Si se mueve antes de tiempo, es scroll: se cancela
      if (Math.hypot(clientX - p.x, clientY - p.y) > 10) { if (p.timer) clearTimeout(p.timer); press.current = null; }
      return;
    }
    setPos({ x: clientX, y: clientY });
    // ¿Sobre qué tarjeta está el dedo? (la copia flotante no recibe eventos)
    const under = document.elementFromPoint(clientX, clientY)?.closest('[data-svc]') as HTMLElement | null;
    const target = under?.dataset.svc;
    if (target && target !== p.id) {
      const cur = orderRef.current;
      const from = cur.indexOf(p.id), to = cur.indexOf(target);
      if (from >= 0 && to >= 0) {
        const next = [...cur];
        next.splice(from, 1);
        next.splice(to, 0, p.id);
        setOrder(next);
      }
    }
  };

  const endPress = () => {
    const p = press.current;
    if (p?.timer) clearTimeout(p.timer);
    if (p?.started) {
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 300);
      saveOrder(orderRef.current);
    }
    press.current = null;
    setDragId(null);
    setGhost(null);
  };

  const moveRef = useRef(moveTo);
  moveRef.current = moveTo;
  const endRef = useRef(endPress);
  endRef.current = endPress;

  const q = query.toLowerCase();
  const visible = order.map(id => byId.get(id)!).filter(s => s && `${s.title} ${s.description}`.toLowerCase().includes(q));

  const cardContent = (service: ServiceItem) => (
      <>
        {service.isNew && (
          <span className={`absolute top-2 right-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-accent text-black ${isTech ? 'rounded-none' : 'rounded-full'}`}>Nuevo</span>
        )}
        {service.soon && (
          <span className={`absolute top-2 right-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider bg-text-muted/20 text-text-secondary ${isTech ? 'rounded-none' : 'rounded-full'}`}>Pronto</span>
        )}
        <div className={`w-10 h-10 flex items-center justify-center mb-3 ${isTech ? 'bg-transparent border border-accent/40' : service.bgColor + ' rounded-xl'}`}>
          <service.icon className={`w-5 h-5 ${isTech ? 'text-accent' : service.color}`} />
        </div>
        <span className={`text-sm font-medium ${isTech ? 'text-accent/90' : 'text-text-primary'} leading-tight`}>{service.title}</span>
        <span className="mt-1 text-[11px] leading-snug text-text-muted">{service.description}</span>
      </>
  );

  const renderCard = (service: ServiceItem) => {
    const dragging = dragId === service.id;
    const content = cardContent(service);
    const cls = `relative flex flex-col justify-start p-4 glass-card select-none [-webkit-touch-callout:none] ${
      dragging ? 'opacity-25 border-dashed border-accent' : 'transition-all'} ${
      isTech ? 'border-accent/20 rounded-none hover:border-accent/50' : 'hover:border-glass-border/80'} ${
      service.soon ? 'opacity-60' : ''} ${dragId && !dragging ? 'animate-[pulse_1.2s_ease-in-out_infinite]' : ''}`;
    const common = {
      'data-svc': service.id,
      onPointerDown: (e: React.PointerEvent) => onPointerDown(e, service.id),
      onPointerMove,
      onPointerUp: endPress,
      onPointerCancel: () => { if (!press.current?.started) endPress(); },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onClickCapture: (e: React.MouseEvent) => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } },
      style: dragging ? { touchAction: 'none' as const } : undefined,
      className: cls,
    };
    if (service.id === 'perfil') {
      return <button key={service.id} type="button" onClick={onProfile} {...common} className={`${cls} text-left`}>{content}</button>;
    }
    return (
      <Link key={service.id} href={service.soon ? '#' : service.href} draggable={false}
            onClick={(e) => { if (service.soon) e.preventDefault(); }} {...common}>
        {content}
      </Link>
    );
  };

  const tipSeen = profile?.servicesTipSeen;
  const header = (text: string) => (
    <h2 key={`h-${text}`} className={`col-span-2 mt-2 first:mt-0 text-[11px] font-bold uppercase tracking-wider ${isTech ? 'text-accent/70' : 'text-text-muted'}`}>{text}</h2>
  );

  return (
    <>
      {profile && !tipSeen && !query && (
        <div className={`mb-4 p-4 border flex items-start gap-3 ${isTech ? 'rounded-none border-accent/40 bg-accent/5' : 'rounded-2xl border-accent/30 bg-accent/10'}`}>
          <Hand className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isTech ? 'text-accent' : 'text-text-primary'}`}>Organiza las tarjetas a tu gusto</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              Mantén presionada una tarjeta hasta que se levante y arrástrala a donde quieras; las demás se corren. Tu orden queda guardado en tu cuenta.
            </p>
            <button type="button" onClick={() => user && updateDoc(doc(db, 'users', user.uid), { servicesTipSeen: true }).catch(() => {})}
                    className={`mt-2 px-4 py-1.5 text-xs font-bold ${isTech ? 'rounded-none border border-accent text-accent' : 'rounded-lg bg-accent text-black'}`}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {custom && !query && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={() => saveOrder(null)} className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-accent">
            <RotateCcw className="w-3 h-3" /> Volver al orden original
          </button>
        </div>
      )}

      <div ref={gridRef} className="grid grid-cols-2 gap-3 sm:gap-4 select-none [&_*]:select-none"
           style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties}>
        {/* Siempre una sola lista con claves estables (títulos intercalados): así las tarjetas no se
            vuelven a crear al empezar a arrastrar y la que se agarró sigue recibiendo el movimiento */}
        {custom || query || dragId
          ? visible.map(renderCard)
          : groups.flatMap(g => {
              const items = visible.filter(s => s.group === g);
              return items.length ? [header(g), ...items.map(renderCard)] : [];
            })}
      </div>

      {dragId && ghost && byId.get(dragId) && typeof document !== 'undefined' && createPortal(
        <div aria-hidden="true" data-ghost
             className={`fixed z-[200] pointer-events-none flex flex-col justify-start p-4 glass-card border-accent shadow-2xl shadow-accent/40 ${isTech ? 'rounded-none' : 'rounded-3xl'}`}
             style={{ left: pos.x - ghost.grabX, top: pos.y - ghost.grabY, width: ghost.w, height: ghost.h, transform: 'scale(1.05) rotate(-1.5deg)', transformOrigin: `${ghost.grabX}px ${ghost.grabY}px` }}>
          {cardContent(byId.get(dragId)!)}
        </div>,
        document.body,
      )}
    </>
  );
}
