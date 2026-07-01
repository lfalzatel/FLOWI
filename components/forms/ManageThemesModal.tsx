'use client';
import { useState, useEffect } from 'react';
import { X, Sun, Moon, Terminal, Layers, Zap, Palette, Check } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
  onClose: () => void;
}

type ThemeType = 'light' | 'dark' | 'glassmorphism' | 'cyberpunk' | 'kiloCode';

export function ManageThemesModal({ onClose }: Props) {
  const { theme, setTheme, allowedThemes, setAllowedThemes } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  // Usamos un estado local para no mutar el tema global hasta hacer clic en "Guardar"
  const [localAllowed, setLocalAllowed] = useState<ThemeType[]>([]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    if (allowedThemes) {
      setLocalAllowed([...allowedThemes] as ThemeType[]);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [allowedThemes]);

  const toggleAllowedTheme = (t: ThemeType) => {
    if (localAllowed.includes(t)) {
      // Remover y reordenar
      const filtered = localAllowed.filter(th => th !== t);
      setLocalAllowed(filtered);
    } else {
      // Agregar al final si no excede el límite razonable para interacción (por ejemplo 3)
      if (localAllowed.length >= 3) {
        // Opcional: no permitir agregar más de 3
        return;
      }
      setLocalAllowed([...localAllowed, t]);
    }
  };

  const handleSave = () => {
    if (localAllowed.length < 2 || localAllowed.length > 3) return;
    if (setAllowedThemes) {
      setAllowedThemes(localAllowed);
    }
    onClose();
  };

  const getThemeIcon = (t: ThemeType) => {
    switch (t) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'glassmorphism': return <Layers className="w-4 h-4" />;
      case 'cyberpunk': return <Terminal className="w-4 h-4" />;
      case 'kiloCode': return <Zap className="w-4 h-4" />;
    }
  };

  const getThemeLabel = (t: ThemeType) => {
    switch (t) {
      case 'light': return isTechTheme ? 'DIA' : 'Día';
      case 'dark': return isTechTheme ? 'NOCHE (ORIGINAL)' : 'Noche (Original)';
      case 'glassmorphism': return isTechTheme ? 'GLASSMORPHISM' : 'Glassmorphism';
      case 'cyberpunk': return isTechTheme ? 'CYBERPUNK' : 'Cyberpunk';
      case 'kiloCode': return isTechTheme ? 'KILOCODE' : 'KiloCode';
    }
  };

  const isValidCount = localAllowed.length >= 2 && localAllowed.length <= 3;

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
            <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>
              {isTechTheme ? 'PERSONALIZA_LA_APARIENCIA' : 'Personaliza la apariencia'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tema Activo */}
          <div>
            <p className={`text-sm font-medium text-white mb-3 ${isTechTheme ? 'font-mono text-accent/70 uppercase' : ''}`}>
              {isTechTheme ? 'TEMA_VISUAL_ACTIVO' : 'Tema Visual Activo'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button onClick={() => setTheme('light')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'light' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Sun className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? 'DIA' : 'Día'}</span>
              </button>
              <button onClick={() => setTheme('dark')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'dark' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Moon className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? 'ORIG' : 'Original'}</span>
              </button>
              <button onClick={() => setTheme('glassmorphism')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'glassmorphism' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Layers className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? 'GLASS' : 'Glass'}</span>
              </button>
              <button onClick={() => setTheme('cyberpunk')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'cyberpunk' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Terminal className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? 'CYBER' : 'Cyber'}</span>
              </button>
              <button onClick={() => setTheme('kiloCode')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'kiloCode' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Zap className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? 'KILO' : 'Kilo'}</span>
              </button>
            </div>
          </div>

          <div className={`h-px w-full ${isTechTheme ? 'bg-accent/20' : 'bg-glass-border'}`} />

          {/* Selector rápido en menú */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className={`text-sm font-medium text-white ${isTechTheme ? 'font-mono text-accent/70 uppercase' : ''}`}>
                {isTechTheme ? 'MODOS_EN_MENU' : 'Modos en Menú Desplegable'}
              </p>
              <span className={`text-[10px] px-2 py-0.5 ${isTechTheme ? 'font-mono border border-accent/20 rounded-none' : 'rounded'} ${isValidCount ? 'text-accent bg-accent/10' : 'text-red-400 bg-red-500/10'}`}>
                {localAllowed.length} {isTechTheme ? 'SEL' : 'seleccionados'} (Mín 2, Máx 3)
              </span>
            </div>
            <p className={`text-[11px] mb-3 ${isTechTheme ? 'font-mono text-accent/40' : 'text-text-muted'}`}>
              {isTechTheme ? 'TOCA_LOS_TEMAS_PARA_MODIFICAR_EL_MENU_RAPIDO' : 'Toca los temas en el orden que quieres que aparezcan en el menú rápido.'}
            </p>
            
            <div className="space-y-2">
              {(['light', 'dark', 'glassmorphism', 'cyberpunk', 'kiloCode'] as ThemeType[]).map(t => {
                const selectedIndex = localAllowed.indexOf(t);
                const isSelected = selectedIndex !== -1;
                
                return (
                  <button 
                    key={t} 
                    onClick={() => toggleAllowedTheme(t)}
                    className={`w-full flex items-center justify-between p-3.5 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${
                      isSelected 
                        ? isTechTheme 
                          ? 'border-accent bg-accent/5 text-white'
                          : 'border-accent/40 bg-accent/5 text-white'
                        : isTechTheme
                          ? 'border-accent/20 bg-black text-accent/60 hover:border-accent/45'
                          : 'border-glass-border bg-glass text-white/60 hover:bg-glass-hover'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center ${isTechTheme ? 'rounded-none' : 'rounded-lg'} ${isSelected ? 'bg-accent/10 text-accent' : 'bg-white/5 text-white/40'}`}>
                        {getThemeIcon(t)}
                      </div>
                      <span className={`text-sm font-semibold ${isTechTheme ? 'font-mono' : 'font-syne'}`}>
                        {getThemeLabel(t)}
                      </span>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold bg-accent text-black w-5 h-5 flex items-center justify-center ${isTechTheme ? 'rounded-none' : 'rounded-full'}`}>
                          {selectedIndex + 1}
                        </span>
                      </div>
                    ) : (
                      <div className={`w-5 h-5 border ${isTechTheme ? 'border-accent/20 rounded-none' : 'border-white/20 rounded-full'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Botón de Guardar */}
        <div className={`mt-6 pt-4 flex gap-3 border-t ${isTechTheme ? 'border-accent/20' : 'border-glass-border'}`}>
          <button
            onClick={onClose}
            className={`flex-1 py-3 text-xs font-bold transition-all border ${isTechTheme ? 'border-accent/30 hover:border-accent text-accent rounded-none font-mono uppercase' : 'border-white/10 hover:bg-white/5 text-text-secondary rounded-xl'}`}
          >
            {isTechTheme ? 'CANCELAR' : 'Cancelar'}
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidCount}
            className={`flex-[2] py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              isTechTheme 
                ? 'bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-black rounded-none font-mono uppercase' 
                : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl hover:opacity-90'
            }`}
          >
            <Check className="w-4 h-4" />
            {isTechTheme ? 'GUARDAR_CAMBIOS' : 'Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
