'use client';
import { tr } from '@/lib/i18n';
import { usePlayStore } from '@/hooks/usePlayStore';
import { useState } from 'react';
import { Heart, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DONATION_KEYS } from '@/lib/donations';
import { PlanCard } from '@/components/plans/PlanCard';
import { PageTourButton } from '@/components/tour/PageTourButton';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para navegadores sin acceso al portapapeles
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

// Sección de Configuración para que quien quiera apoye el proyecto con una donación por llave Bre-B
export function SupportProject({ isTechTheme, open = true, onToggle }: { isTechTheme: boolean; open?: boolean; onToggle?: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  const mono = isTechTheme ? 'font-mono' : '';
  const playStore = usePlayStore();

  const handleCopy = async (key: string) => {
    if (await copyText(key)) {
      setCopied(key);
      setTimeout(() => setCopied(prev => (prev === key ? null : prev)), 2000);
    }
  };

  if (playStore) return null;

  return (
    <section id="apoyar" className="space-y-3 scroll-mt-24" data-tour="cfg-apoyar">
      {onToggle ? (
        <button onClick={onToggle} className={`w-full flex items-center justify-between ${isTechTheme ? 'border-b border-accent/20 pb-1' : 'ml-2 pr-2'}`}>
          <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide' : 'font-syne font-semibold text-sm text-text-secondary'}`}>{tr('Apoyar a FLOWI')}</h2>
          {open ? <ChevronUp className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} /> : <ChevronDown className={`w-4 h-4 ${isTechTheme ? 'text-accent' : 'text-text-muted'}`} />}
        </button>
      ) : (
      <div className="flex items-center gap-2 pr-8">
        <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>
          {tr('Apoyar a FLOWI')}
        </h2>
        <PageTourButton id="apoyar" className="ml-auto" />
      </div>
      )}
      {(!onToggle || open) && (
      <div className={`p-4 space-y-4 ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
        {/* En Configuración (sección que se abre y cierra) el botón del tutorial va aquí adentro */}
        {onToggle && <div className="flex justify-end -mb-2"><PageTourButton id="apoyar" /></div>}
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 shrink-0 flex items-center justify-center ${isTechTheme ? 'border border-pink-500/30 rounded-none bg-pink-500/10' : 'rounded-xl bg-pink-500/15'}`}>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div className={mono}>
            <p className="text-sm font-medium text-text-primary normal-case">{tr('¿Te sirve FLOWI? Puedes apoyar el proyecto')}</p>
            <p className="text-[11px] text-text-muted normal-case leading-relaxed mt-0.5">
              {tr('FLOWI es gratis y sin publicidad. Si quieres ayudar a que siga creciendo, envía el aporte que quieras desde')}
              {' '}{tr('Nequi, Bancolombia, BBVA o cualquier banco: en tu app elige Transferir → a una llave (Bre-B) y pega una de estas llaves.')}
            </p>
          </div>
        </div>

        <div className="space-y-3" data-tour="sup-keys">
          {DONATION_KEYS.map(group => (
            <div key={group.bank} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <CategoryIcon icon={group.icon} label={group.bank} className="w-5 h-5 flex items-center justify-center" />
                <span className={`text-xs font-semibold text-text-primary ${mono}`}>{group.bank}</span>
              </div>
              {group.keys.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCopy(key)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 border border-glass-border bg-glass hover:border-accent/50 transition-colors text-left ${isTechTheme ? 'rounded-none' : 'rounded-xl'}`}
                >
                  <span className={`text-sm text-text-primary normal-case break-all ${mono}`}>{key}</span>
                  <span className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold ${copied === key ? 'text-emerald-400' : 'text-accent'} ${mono}`}>
                    {copied === key ? <><Check className="w-3.5 h-3.5" /> {tr('Copiada')}</> : <><Copy className="w-3.5 h-3.5" /> {tr('Copiar')}</>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className={`text-[10px] text-text-muted normal-case ${mono}`}>
          {tr('Antes de confirmar, tu banco te mostrará el nombre del titular para que verifiques. ¡Gracias por tu apoyo!')}
        </p>

        <p className={`text-[11px] text-text-secondary normal-case ${mono}`}>{tr('¿Prefieres apoyar con una suscripción y tener más funciones?')}</p>
        <div data-tour="sup-plan"><PlanCard isTechTheme={isTechTheme} /></div>
      </div>
      )}
    </section>
  );
}
