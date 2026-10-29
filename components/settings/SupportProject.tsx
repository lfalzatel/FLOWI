'use client';
import { useState } from 'react';
import { Heart, Copy, Check } from 'lucide-react';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DONATION_KEYS } from '@/lib/donations';

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
export function SupportProject({ isTechTheme }: { isTechTheme: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  const mono = isTechTheme ? 'font-mono' : '';

  const handleCopy = async (key: string) => {
    if (await copyText(key)) {
      setCopied(key);
      setTimeout(() => setCopied(prev => (prev === key ? null : prev)), 2000);
    }
  };

  return (
    <section id="apoyar" className="space-y-3 scroll-mt-24">
      <h2 className={`${isTechTheme ? 'font-mono font-bold text-sm text-accent uppercase tracking-wide border-b border-accent/20 pb-1' : 'font-syne font-semibold text-sm text-text-secondary ml-2'}`}>
        Apoyar a FLOWI
      </h2>
      <div className={`p-4 space-y-4 ${isTechTheme ? 'border border-accent/20 rounded-none bg-deep' : 'glass-card rounded-2xl'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 shrink-0 flex items-center justify-center ${isTechTheme ? 'border border-pink-500/30 rounded-none bg-pink-500/10' : 'rounded-xl bg-pink-500/15'}`}>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div className={mono}>
            <p className="text-sm font-medium text-text-primary normal-case">¿Te sirve FLOWI? Puedes apoyar el proyecto</p>
            <p className="text-[11px] text-text-muted normal-case leading-relaxed mt-0.5">
              FLOWI es gratis y sin publicidad. Si quieres ayudar a que siga creciendo, envía el aporte que quieras desde
              Nequi, Bancolombia, BBVA o cualquier banco: en tu app elige Transferir → a una llave (Bre-B) y pega una de estas llaves.
            </p>
          </div>
        </div>

        <div className="space-y-3">
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
                    {copied === key ? <><Check className="w-3.5 h-3.5" /> Copiada</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className={`text-[10px] text-text-muted normal-case ${mono}`}>
          Antes de confirmar, tu banco te mostrará el nombre del titular para que verifiques. ¡Gracias por tu apoyo!
        </p>
      </div>
    </section>
  );
}
