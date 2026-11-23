'use client';
import Link from 'next/link';
import { GlitterParticles } from '@/components/effects/GlitterParticles';

// Página de prueba del fondo de partículas (no está en ningún menú): /prueba-fondo
export default function PruebaFondo() {
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <GlitterParticles />
      <div className="relative z-10 min-h-screen max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        {/* Celular de muestra */}
        <div className="mx-auto w-[230px] h-[470px] rounded-[2.6rem] border-[6px] border-white/15 bg-[#06141d]/80 backdrop-blur-sm shadow-[0_0_60px_rgba(56,189,248,0.25)] p-4 flex flex-col gap-3">
          <div className="mx-auto h-1.5 w-16 rounded-full bg-white/15" />
          <div className="rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-white/10 p-4">
            <p className="text-[10px] text-white/60">Hoy puedes gastar</p>
            <p className="text-2xl font-bold text-cyan-300">$ 64.378</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-[9px] text-white/50">Gastos</p><p className="text-sm font-bold text-rose-300">$ 1.321.000</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-[9px] text-white/50">Ingresos</p><p className="text-sm font-bold text-emerald-300">$ 3.500.000</p></div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
            {['Mercado · $ 45.300', 'Uber · $ 20.000', 'Internet · $ 89.900'].map(t => <p key={t} className="text-[10px] text-white/70">{t}</p>)}
          </div>
        </div>
        {/* Texto */}
        <div className="text-center md:text-left space-y-5">
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Tu plata clara,<br /><span className="text-cyan-300">todos los días.</span></h1>
          <p className="text-white/75 max-w-md mx-auto md:mx-0">Anota tus gastos con la voz, mira cuánto puedes gastar hoy y llega a fin de mes sin sustos.</p>
          <Link href="/" className="inline-block px-7 py-3 rounded-full bg-cyan-400 text-black font-bold shadow-[0_0_30px_rgba(34,211,238,0.5)]">Probar FLOWI gratis</Link>
          <p className="text-[11px] text-white/40">Fondo de prueba: partículas dibujadas con código, sin video.</p>
        </div>
      </div>
    </main>
  );
}
