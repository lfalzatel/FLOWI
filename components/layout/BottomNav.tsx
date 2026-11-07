'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, TrendingDown, TrendingUp,
  Plus, Bell, CreditCard, Grid, Mic
} from 'lucide-react';
import { AddExpenseModal } from '@/components/forms/AddExpenseModal';
import { AddDebtModal } from '@/components/forms/AddDebtModal';
import { ReminderFormModal } from '@/components/forms/ReminderFormModal';
import { VoiceAssistantModal } from '@/components/forms/VoiceAssistantModal';
import { ParsedVoiceResult } from '@/lib/voiceParser';
import { useTheme } from '@/components/ThemeProvider';
import { useAuth } from '@/hooks/useAuth';
import { NoteModal } from '@/components/notes/NoteModal';
import { InvestmentFormModal } from '@/components/investments/InvestmentFormModal';
import { QuickAction, QuickActionsSheet } from '@/components/layout/QuickActionsSheet';

const navItems = [
  { icon: LayoutDashboard, label: 'Inicio',        href: '/',          id: 'nav-inicio' },
  { icon: TrendingDown,    label: 'Gastos',        href: '/gastos',    id: 'nav-gastos' },
  { icon: TrendingUp,      label: 'Ingresos',      href: '/ingresos',  id: 'nav-ingresos' },
  { icon: CreditCard,      label: 'Deudas',        href: '/deudas',    id: 'nav-deudas' },
  { icon: Grid,            label: 'Servicios',     href: '/servicios', id: 'nav-servicios' },
];

export function BottomNav({ onSuccess }: { onSuccess?: () => void }) {
  const pathname        = usePathname();
  const [showAdd, setShowAdd] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [parsedVoiceData, setParsedVoiceData] = useState<ParsedVoiceResult | null>(null);
  // Menú del botón flotante y el formulario que se abrió desde él
  const [showSheet, setShowSheet] = useState(false);
  const [quick, setQuick] = useState<Exclude<QuickAction, 'voz' | 'extracto'> | null>(null);
  const [receipt, setReceipt] = useState<File | 'no-key' | null>(null);
  const router = useRouter();
  const { profile } = useAuth();
  // Mantener presionado = hablar directo (como antes)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const openVoice = (withReceipt: File | 'no-key' | null = null) => {
    setParsedVoiceData(null);
    setReceipt(withReceipt);
    setShowVoice(true);
  };
  const onQuickAction = (a: QuickAction) => {
    setShowSheet(false);
    if (a === 'voz') openVoice();
    else if (a === 'extracto') router.push('/servicios/importar');
    else setQuick(a);
  };
  const closeQuick = () => setQuick(null);

  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';

  return (
    <>
      <style>{`
        @keyframes push-and-settle {
          0% { transform: scale(1) translateY(0); }
          40% { transform: scale(0.8) translateY(2px); }
          70% { transform: scale(1.2) translateY(-10px) rotate(-4deg); }
          100% { transform: scale(1.1) translateY(-8px) rotate(-2deg); }
        }
        @keyframes micro-bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-3px); }
        }
        @keyframes float-bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          30%       { transform: translateY(-10px) scale(1.05); }
          60%       { transform: translateY(-5px) scale(1.02); }
        }
      `}</style>

      {/* Main Container for Nav and FAB (Side by Side) */}
      <div className="md:hidden fixed bottom-5 left-0 right-0 z-50 flex items-center justify-between pointer-events-none px-2 w-full max-w-[100vw]">
        
        {/* Navigation Menu */}
        <nav
          className={`pointer-events-auto flex-1 flex items-center justify-between px-1 py-1.5 mr-2
                     shadow-2xl shadow-black/10
                     glass-dropdown
                     ${isTechTheme ? 'rounded-none border-accent/30' : 'rounded-[28px]'}`}
        >
          {/* Inner highlight */}
          <div className={`absolute inset-0 pointer-events-none overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-[28px]'}`}>
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r
                            from-transparent via-white/20 to-transparent" />
          </div>

          {navItems.map(item => (
            <NavItem 
              key={item.href} 
              {...item} 
              active={pathname === item.href} 
              isTechTheme={isTechTheme} 
              isLight={isLight} 
            />
          ))}
        </nav>

        {/* Floating FAB con Micrófono 🎙️ */}
        <button
          onPointerDown={() => {
            longPressed.current = false;
            pressTimer.current = setTimeout(() => {
              longPressed.current = true;
              try { navigator.vibrate?.(20); } catch { /* sin vibración */ }
              openVoice();
            }, 450);
          }}
          onPointerUp={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
          onPointerLeave={() => { if (pressTimer.current) clearTimeout(pressTimer.current); }}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            if (longPressed.current) { longPressed.current = false; return; }
            setShowSheet(true);
          }}
          aria-label="Registrar: toca para ver opciones, mantén presionado para hablar"
          data-tour="voice"
          title="Registrar (mantén presionado para hablar)"
          className={`pointer-events-auto flex-shrink-0 flex items-center justify-center
                      w-14 h-14
                      bg-gradient-to-br from-accent to-accent-dim
                      shadow-xl shadow-accent/50 transition-all active:scale-95
                      ${isTechTheme ? 'rounded-none border-2 border-black' : 'rounded-full'}
                      ${isLight ? 'text-white' : 'text-black'}`}
          style={{
            animation: 'float-bounce 2.2s ease-in-out infinite',
          }}
        >
          <span className="relative">
            <Plus className="w-7 h-7 stroke-[2.5]" />
            <Mic className={`absolute -bottom-1.5 -right-2 w-3.5 h-3.5 stroke-[3] p-[1px] ${isTechTheme ? 'rounded-none' : 'rounded-full'} ${isLight ? 'bg-accent-dim text-white' : 'bg-accent-dim text-black'}`} />
          </span>
        </button>

      </div>

      {/* Modal de Asistente de Voz */}
      {showVoice && (
        <VoiceAssistantModal
          receipt={receipt}
          onClose={() => { setShowVoice(false); setReceipt(null); }}
          onSuccessBulk={onSuccess}
          onSelectParsed={(result) => {
            setShowVoice(false);
            setParsedVoiceData(result);
            setShowAdd(true);
          }}
          onOpenManual={() => {
            setShowVoice(false);
            setParsedVoiceData(null);
            setShowAdd(true);
          }}
        />
      )}

      {showSheet && (
        <QuickActionsSheet
          onClose={() => setShowSheet(false)}
          onAction={onQuickAction}
          onReceipt={(file) => { setShowSheet(false); openVoice(file); }}
        />
      )}

      {/* Formularios abiertos desde el menú del botón */}
      {(quick === 'gasto' || quick === 'ingreso') && (
        <AddExpenseModal initialType={quick} onClose={closeQuick} onSuccess={onSuccess} />
      )}
      {quick === 'deuda' && <AddDebtModal onClose={closeQuick} onSuccess={onSuccess || (() => {})} />}
      {quick === 'recordatorio' && <ReminderFormModal onClose={closeQuick} onSuccess={onSuccess || (() => {})} />}
      {quick === 'nota' && <NoteModal note={null} onClose={closeQuick} onSuccess={closeQuick} />}
      {quick === 'cdt' && <InvestmentFormModal currency={profile?.currency || 'COP'} onClose={closeQuick} />}

      {/* Modal Tradicional o Pre-llenado por Voz */}
      {showAdd && (
        pathname === '/deudas' || parsedVoiceData?.type === 'deuda' ? (
          <AddDebtModal 
            onClose={() => {
              setShowAdd(false);
              setParsedVoiceData(null);
            }} 
            onSuccess={onSuccess || (() => {})} 
          />
        ) : pathname.startsWith('/servicios') ? (
          <ReminderFormModal 
            onClose={() => {
              setShowAdd(false);
              setParsedVoiceData(null);
            }} 
            onSuccess={onSuccess || (() => {})} 
          />
        ) : (
          <AddExpenseModal 
            onClose={() => {
              setShowAdd(false);
              setParsedVoiceData(null);
            }} 
            onSuccess={onSuccess} 
            initialType={parsedVoiceData?.type === 'ingreso' ? 'ingreso' : pathname === '/ingresos' ? 'ingreso' : 'gasto'}
            initialVoiceParsed={parsedVoiceData || undefined}
          />
        )
      )}
    </>
  );
}

function NavItem({ icon: Icon, label, href, id, active, isTechTheme, isLight }: any) {
  return (
    <Link 
      id={id}
      href={href}
      className={`relative flex flex-col items-center justify-center flex-1 gap-0.5 py-1.5
                  transition-all duration-200 ${isTechTheme ? 'rounded-none' : 'rounded-[20px]'}
                  ${active
                    ? `bg-accent ${isLight ? 'text-white' : 'text-black'} shadow-lg shadow-accent/35 animate-[push-and-settle_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards] ${isTechTheme ? 'border border-black' : ''}`
                    : `text-accent hover:opacity-80 ${isLight ? 'active:text-accent-dim' : 'active:text-white'}`
                  }`}
    >
      <Icon className={`w-[18px] h-[18px] relative z-10 ${active ? 'animate-[micro-bounce_0.4s_infinite_alternate] [animation-delay:0.45s]' : ''}`} />
      <span className={`text-[8px] relative z-10 leading-none nav-label text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap px-0.5 ${isTechTheme ? 'font-mono font-bold uppercase tracking-wide' : 'font-medium'}`}>{label}</span>
    </Link>
  );
}
