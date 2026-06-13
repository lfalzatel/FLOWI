'use client';
import { useEffect } from 'react';
import { X, Sun, Moon, Terminal, Layers, Zap, Palette } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  onClose: () => void;
}

type ThemeType = 'light' | 'dark' | 'glassmorphism' | 'cyberpunk' | 'kiloCode';

export function ManageThemesModal({ onClose }: Props) {
  const { theme, setTheme, allowedThemes, setAllowedThemes } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const toggleAllowedTheme = (t: ThemeType) => {
    if (!allowedThemes || !setAllowedThemes) return;
    if (allowedThemes.includes(t)) {
      setAllowedThemes(allowedThemes.filter(th => th !== t));
    } else {
      setAllowedThemes([...allowedThemes, t]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`${isTechTheme ? 'bg-black border border-accent rounded-none shadow-[0_0_30px_rgba(0,229,160,0.15)]' : 'bg-[#0A0A0F] border border-white/10 rounded-3xl'} p-6 w-full max-w-md relative animate-fade-in-up max-h-[90vh] overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 ${isTechTheme ? 'rounded-none bg-accent/10 border border-accent/30' : 'rounded-xl bg-accent/10'} flex items-center justify-center`}>
            <Palette className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-accent uppercase tracking-widest text-lg' : 'font-syne font-bold text-white text-xl'}`}>
              {isTechTheme ? '>_ GESTION_TEMAS' : 'Gestión de Temas'}
            </h2>
            <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>Personaliza la apariencia</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Temas Activo */}
          <div>
            <p className={`text-sm font-medium text-white mb-3 ${isTechTheme ? 'font-mono' : ''}`}>Tema Visual Activo</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button onClick={() => setTheme('light')} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${theme === 'light' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Sun className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Día</span>
              </button>
              <button onClick={() => setTheme('dark')} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${theme === 'dark' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Moon className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Original</span>
              </button>
              <button onClick={() => setTheme('glassmorphism')} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${theme === 'glassmorphism' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Layers className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Glass</span>
              </button>
              <button onClick={() => setTheme('cyberpunk')} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${theme === 'cyberpunk' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Terminal className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Cyber</span>
              </button>
              <button onClick={() => setTheme('kiloCode')} className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${theme === 'kiloCode' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Zap className="w-5 h-5 mb-1.5" />
                <span className="text-xs font-medium">Kilo</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-glass-border w-full" />

          {/* Selector rápido en menú */}
          <div>
            <p className={`text-sm font-medium text-white mb-3 ${isTechTheme ? 'font-mono' : ''}`}>Modos en Menú Desplegable</p>
            <div className="space-y-2">
              {(['light', 'dark', 'glassmorphism', 'kiloCode', 'cyberpunk'] as ThemeType[]).map(t => (
                <label key={t} className="flex items-center justify-between p-3 rounded-xl border border-glass-border bg-glass cursor-pointer hover:bg-glass-hover transition-all">
                  <span className={`text-sm font-medium capitalize text-white ${isTechTheme ? 'font-mono' : 'font-syne'}`}>{t === 'light' ? 'Día' : t === 'dark' ? 'Noche (Original)' : t}</span>
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-glass-strong text-accent focus:ring-accent focus:ring-offset-deep bg-deep"
                    checked={allowedThemes?.includes(t) || false}
                    onChange={() => toggleAllowedTheme(t)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
