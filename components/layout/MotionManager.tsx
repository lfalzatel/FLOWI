'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { tr } from '@/lib/i18n';
import { applyMotion, currentMotion, getSavedMotion, isSlowDevice, markMotionNoticeSeen, motionNoticeSeen } from '@/lib/motion';
import { usePopupBusy, usePopupHold } from '@/lib/tourGate';

// Animaciones de toda la app:
// 1. Aplica el nivel guardado (o "suaves" en un celular sencillo, avisándolo una vez).
// 2. Los modales nacen del punto que se tocó: cuando aparece una ventana (.animate-fade-in-up o
//    .animate-scale-in dentro de una capa fija), se reemplaza su entrada por un "resorte" que crece
//    desde ese punto. No hay que tocar cada modal: todos lo heredan.

const TAP_WINDOW_MS = 900; // el modal tiene que aparecer poco después del toque

export function MotionManager() {
  const [notice, setNotice] = useState(false);

  // Nivel inicial
  useEffect(() => {
    const saved = getSavedMotion();
    if (saved) { applyMotion(saved); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { applyMotion('off'); return; }
    if (isSlowDevice()) {
      applyMotion('soft');
      if (!motionNoticeSeen()) setTimeout(() => setNotice(true), 4000);
    } else {
      applyMotion('full');
    }
  }, []);

  // Batería baja (menos de 20 % y sin cargar): animaciones suaves mientras tanto, sin cambiar lo que la
  // persona eligió; al conectar el cargador (o subir la carga) vuelve a su nivel. Solo navegadores que
  // dan el estado de la batería (Chrome en Android).
  useEffect(() => {
    const nav = navigator as any;
    if (typeof nav.getBattery !== 'function') return;
    let battery: any = null;
    let saving = false;
    const check = () => {
      if (!battery) return;
      const low = !battery.charging && battery.level < 0.2;
      if (low && !saving && currentMotion() === 'full') { saving = true; applyMotion('soft'); }
      else if (!low && saving) { saving = false; applyMotion(getSavedMotion() || (isSlowDevice() ? 'soft' : 'full')); }
    };
    // Algunos celulares entregan un objeto de batería incompleto (sin addEventListener o sin
    // removeEventListener): antes eso tumbaba toda la app al cambiar de pantalla. Si falta, se ignora.
    nav.getBattery().then((b: any) => {
      if (!b || typeof b.addEventListener !== 'function' || typeof b.removeEventListener !== 'function') return;
      battery = b;
      check();
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
    }).catch(() => {});
    return () => {
      try { battery?.removeEventListener('levelchange', check); battery?.removeEventListener('chargingchange', check); } catch { /* batería incompleta */ }
    };
  }, []);

  // Modales que nacen del toque
  useEffect(() => {
    let tap = { x: 0, y: 0, t: 0 };
    const onDown = (e: PointerEvent) => { tap = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    window.addEventListener('pointerdown', onDown, true);

    const animate = (el: HTMLElement) => {
      if (el.dataset.popped) return;
      el.dataset.popped = '1';
      if (currentMotion() !== 'full' || Date.now() - tap.t > TAP_WINDOW_MS) return;
      if (!el.closest('.fixed.inset-0')) return; // solo ventanas encima de la pantalla, no páginas
      if (/(^|\s)-?translate-/.test(el.className)) return; // ya se posiciona con transform: no tocarlo
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Punto de origen relativo a la ventana (limitado a su caja para que no salga volando)
      const ox = Math.min(Math.max(tap.x - r.left, 0), r.width);
      const oy = Math.min(Math.max(tap.y - r.top, 0), r.height);
      el.style.animation = 'none';
      el.style.transformOrigin = `${ox}px ${oy}px`;
      el.animate(
        [
          // Sin filter: blur(): en algunos Android, animar un filtro sobre una ventana de vidrio
          // (backdrop-filter) la dejaba invisible y la pantalla quedaba bloqueada
          { transform: 'scale(0.55)', opacity: 0 },
          { transform: 'scale(1.025)', opacity: 1, offset: 0.65 },
          { transform: 'scale(0.995)', offset: 0.85 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { duration: 460, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
    };

    // Brillo que cruza cada tarjeta una vez al aparecer, en todos los temas. Se pone una capa encima
    // (.flowi-sheen) y se quita al terminar: no pisa la animación de entrada de la tarjeta.
    const CARD = '.glass-card, .glass-card-strong, .animate-card-mix, #balance-card, [data-sheen]';
    let queued = 0;
    const sheen = (el: HTMLElement) => {
      if (el.dataset.sheened) return;
      el.dataset.sheened = '1';
      if (currentMotion() !== 'full' || el.closest('.flowi-sheen, [data-no-sheen]')) return;
      const delay = 650 + Math.min(queued++, 6) * 90; // después de que la tarjeta aparezca, de arriba abajo
      setTimeout(() => { queued = Math.max(0, queued - 1); }, delay);
      setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        // Si está fuera de la pantalla, brilla cuando la persona llega a ella; y se vigila para que
        // brille de nuevo cada vez que vuelva a entrar en pantalla (bajando o subiendo)
        const visible = !(r.top > window.innerHeight || r.bottom < 0);
        if (visible) play(el); else el.dataset.sheenPending = '1';
        io.observe(el);
      }, delay);
    };
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      const el = en.target as HTMLElement;
      if (!el.isConnected) { io.unobserve(el); return; }
      if (!en.isIntersecting) { el.dataset.sheenOut = '1'; return; }
      if (el.dataset.sheenPending) { delete el.dataset.sheenPending; delete el.dataset.sheenOut; play(el); return; }
      // Cada vez que vuelve a entrar en pantalla (bajando o subiendo) brilla otra vez
      if (el.dataset.sheenOut) { delete el.dataset.sheenOut; play(el); }
    }), { threshold: 0.35 });
    const play = (el: HTMLElement) => {
        if (!el.isConnected || currentMotion() !== 'full') return;
        if (el.querySelector(':scope > .flowi-sheen')) return; // ya está brillando
        const now = Date.now();
        if (now - Number(el.dataset.sheenAt || 0) < 2000) return; // no titilar al subir y bajar rápido
        el.dataset.sheenAt = String(now);
        const pos = getComputedStyle(el).position;
        const fixPos = pos === 'static';
        if (fixPos) el.style.position = 'relative';
        const layer = document.createElement('span');
        layer.className = 'flowi-sheen';
        layer.setAttribute('aria-hidden', 'true');
        el.appendChild(layer);
        const a = layer.animate([{ backgroundPosition: '160% 0' }, { backgroundPosition: '-60% 0' }],
          { duration: 1400, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
        const done = () => { layer.remove(); if (fixPos) el.style.position = ''; };
        a.onfinish = done; a.oncancel = done;
    };
    setTimeout(() => document.querySelectorAll<HTMLElement>(CARD).forEach(sheen), 300);

    const scan = (node: Node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.matches(CARD)) sheen(node);
      node.querySelectorAll<HTMLElement>(CARD).forEach(sheen);
      if (node.matches('.animate-fade-in-up, .animate-scale-in')) animate(node);
      node.querySelectorAll<HTMLElement>('.animate-fade-in-up, .animate-scale-in').forEach(animate);
    };
    const obs = new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(scan)));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { window.removeEventListener('pointerdown', onDown, true); obs.disconnect(); io.disconnect(); };
  }, []);

  // Menús de abajo (marcados con data-drag-close): se cierran arrastrándolos hacia abajo con el dedo.
  // Al soltar lejos, se deslizan fuera y se "toca" su fondo, que es lo que ya los cierra.
  useEffect(() => {
    let drag: { sheet: HTMLElement; y0: number; t0: number; dy: number } | null = null;
    const start = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      const sheet = target?.closest<HTMLElement>('[data-drag-close]');
      if (!sheet || e.touches.length !== 1) return;
      // Si se toca algo que tiene su propio scroll y no está arriba del todo, se respeta ese scroll
      for (let n: HTMLElement | null = target; n && n !== sheet.parentElement; n = n.parentElement) {
        if (n.scrollTop > 0) return;
      }
      drag = { sheet, y0: e.touches[0].clientY, t0: Date.now(), dy: 0 };
    };
    const move = (e: TouchEvent) => {
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.y0;
      drag.dy = dy;
      if (dy <= 0) { drag.sheet.style.transform = ''; return; }
      drag.sheet.style.transition = 'none';
      drag.sheet.style.transform = `translateY(${dy}px)`;
    };
    const end = () => {
      if (!drag) return;
      const { sheet, dy, t0 } = drag;
      drag = null;
      const speed = dy / Math.max(1, Date.now() - t0);
      const snapBack = () => {
        sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        sheet.style.transform = '';
      };
      const backdrop = sheet.parentElement?.querySelector<HTMLElement>(':scope > .absolute.inset-0, :scope > .ui-backdrop');
      if ((dy > 110 || (dy > 40 && speed > 0.6)) && backdrop) {
        sheet.style.transition = 'transform 200ms ease-in';
        sheet.style.transform = 'translateY(110%)';
        setTimeout(() => backdrop.click(), 180);
        // Si la ventana no se cerró al tocar su fondo, vuelve a su lugar (antes quedaba corrida fuera de la pantalla)
        setTimeout(() => { if (sheet.isConnected) snapBack(); }, 450);
      } else if (dy > 0) {
        sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
        sheet.style.transform = '';
      }
    };
    window.addEventListener('touchstart', start, { capture: true, passive: true });
    window.addEventListener('touchmove', move, { capture: true, passive: true });
    window.addEventListener('touchend', end, true);
    window.addEventListener('touchcancel', end, true);
    return () => {
      window.removeEventListener('touchstart', start, true);
      window.removeEventListener('touchmove', move, true);
      window.removeEventListener('touchend', end, true);
      window.removeEventListener('touchcancel', end, true);
    };
  }, []);

  return notice ? <SlowNotice onClose={() => { markMotionNoticeSeen(); setNotice(false); }} /> : null;
}

// Aviso de una sola vez en celulares sencillos
function SlowNotice({ onClose }: { onClose: () => void }) {
  // Espera su turno (tutorial u otras ventanas) y luego lo ocupa mientras se ve
  const busy = usePopupBusy();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!visible && !busy) setVisible(true); }, [busy, visible]);
  usePopupHold(visible);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-28 z-[95] flex justify-center px-4 pointer-events-none" role="status">
      <div className="pointer-events-auto w-full max-w-sm glass-dropdown tour-card rounded-2xl p-4 shadow-2xl animate-fade-in-up">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 shrink-0 rounded-xl bg-accent/15 flex items-center justify-center"><Sparkles className="w-5 h-5 text-accent" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary">{tr('Animaciones suaves activadas')}</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{tr('Para que FLOWI vaya rápido en tu celular, usamos animaciones más livianas. Puedes cambiarlo cuando quieras en Configuración.')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={tr('Cerrar')} className="p-1 -mr-1 -mt-1 text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href="/configuracion#animaciones" onClick={onClose} className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-accent/15 text-accent border border-accent/40">{tr('Ver cómo cambiarlo')}</Link>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-xs font-semibold rounded-xl border border-glass-border text-text-primary">{tr('Entendido')}</button>
        </div>
      </div>
    </div>
  );
}
