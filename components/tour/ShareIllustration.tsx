'use client';
import { Check, Mail, MessageCircle, MoreHorizontal, Share2, Sparkles } from 'lucide-react';
import { tr } from '@/lib/i18n';

// Dibujos de ejemplo para el tutorial "Comparte desde tu banco" (datos inventados, sin marcas reales):
// 1. el comprobante en la app del banco con el botón Compartir, 2. la lista de apps con FLOWI,
// 3. FLOWI leyendo el comprobante. La parte que hay que tocar late para que se note.

function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect x="0" y="0" width="100" height="100" rx="24" fill="#0F1729" />
      <g transform="translate(50 50) scale(0.62) translate(-50 -50)" strokeLinecap="round" strokeWidth="14">
        <line x1="28" y1="25" x2="28" y2="75" stroke="#06B6D4" />
        <line x1="28" y1="25" x2="60" y2="25" stroke="#10B981" />
        <line x1="28" y1="50" x2="48" y2="50" stroke="#2DD4BF" />
        <circle cx="72" cy="50" r="7" fill="#F97316" stroke="none" />
      </g>
    </svg>
  );
}

const Pulse = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-flex">
    <span className="absolute -inset-1.5 rounded-2xl border-2 border-accent animate-ping opacity-60" />
    <span className="relative">{children}</span>
  </span>
);

export function ShareIllustration({ frame }: { frame: 'share-1' | 'share-2' | 'share-3' }) {
  // "Pantalla" de otra app: siempre clara, como se ve la app del banco
  const phone = 'mx-auto w-full max-w-[260px] rounded-2xl border border-black/10 bg-[#F4F5F7] text-[#14213D] p-3 shadow-inner select-none';
  if (frame === 'share-1') {
    return (
      <div className={phone} aria-hidden="true">
        <p className="text-[10px] text-center text-[#14213D]/60 mb-1.5">{tr('App de tu banco')}</p>
        <div className="rounded-xl bg-white p-2.5 text-center">
          <p className="text-[11px] font-bold leading-tight">{tr('Pago con tarjeta')}</p>
          <p className="text-[9px] text-[#14213D]/60">{tr('19 nov, 4:55 p. m.')}</p>
          <p className="text-lg font-semibold mt-0.5">$ -50.480</p>
        </div>
        <div className="flex flex-col items-center mt-2.5">
          <Pulse><span className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#1E3A8A]"><Share2 className="w-4 h-4" /></span></Pulse>
          <span className="text-[10px] font-semibold text-[#1E3A8A] mt-1">{tr('Compartir')}</span>
        </div>
      </div>
    );
  }
  if (frame === 'share-2') {
    const App = ({ icon, label, hot }: { icon: React.ReactNode; label: string; hot?: boolean }) => (
      <div className="flex flex-col items-center gap-1 w-14">
        {hot ? <Pulse>{icon}</Pulse> : icon}
        <span className={`text-[9px] text-center leading-tight ${hot ? 'font-bold' : 'text-[#14213D]/70'}`}>{label}</span>
      </div>
    );
    const grey = (Icon: any) => <span className="w-8 h-8 rounded-xl bg-[#C9B37E] text-white flex items-center justify-center"><Icon className="w-4 h-4" /></span>;
    return (
      <div className={phone} aria-hidden="true">
        <p className="text-[11px] font-bold mb-2">{tr('Compartir 1 imagen')}</p>
        <div className="rounded-xl bg-white px-1 py-2.5 flex justify-around">
          <App icon={grey(MessageCircle)} label={tr('Mensajes')} />
          <App icon={<Logo size={32} />} label="FLOWI" hot />
          <App icon={grey(Mail)} label={tr('Correo')} />
          <App icon={grey(MoreHorizontal)} label={tr('Más')} />
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-glass-border bg-glass p-3 select-none" aria-hidden="true">
      <div className="flex items-center gap-1.5 mb-2">
        <Logo size={18} />
        <span className="text-[11px] font-bold text-text-primary">FLOWI</span>
        <span className="ml-auto flex items-center gap-1 text-[9px] font-semibold text-accent"><Sparkles className="w-3 h-3" /> {tr('Leído con IA')}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <div className="rounded-lg border border-glass-border px-2 py-1.5"><span className="block text-text-muted">{tr('Valor')}</span><b className="text-accent">$ 50.480</b></div>
        <div className="rounded-lg border border-glass-border px-2 py-1.5"><span className="block text-text-muted">{tr('Fecha')}</span><b className="text-text-primary">19/11 · 4:55</b></div>
        <div className="col-span-2 rounded-lg border border-glass-border px-2 py-1.5 text-text-primary">{tr('Pago con tarjeta')}</div>
      </div>
      <div className="mt-2 flex justify-center">
        <Pulse><span className="px-4 py-1.5 rounded-xl bg-accent text-black text-[11px] font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {tr('Guardar')}</span></Pulse>
      </div>
    </div>
  );
}
