'use client';
import { tr, trTech } from '@/lib/i18n';
import { useState, useEffect } from 'react';
import { X, Sun, Moon, Terminal, Layers, Zap, Palette, Check, Sparkles, Star, Flame } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { PageTourButton } from '@/components/tour/PageTourButton';

interface Props {
  onClose: () => void;
}

type ThemeType = 'light' | 'dark' | 'glassmorphism' | 'nebula' | 'cyberpunk' | 'kiloCode' | 'nova' | 'carbon';

export function ManageThemesModal({ onClose }: Props) {
  const { theme, setTheme, allowedThemes, setAllowedThemes } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';

  // Usamos un estado local para no mutar el tema global hasta hacer clic en "Guardar"
  const [localAllowed, setLocalAllowed] = useState<ThemeType[]>([]);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    if (allowedThemes) {
      setLocalAllowed([...allowedThemes] as ThemeType[]);
    }
    return () => { document.documentElement.style.overflow = 'auto'; };
  }, [allowedThemes]);

  const toggleAllowedTheme = (t: ThemeType) => {
    if (localAllowed.includes(t)) {
      // Remover y reordenar
      const filtered = localAllowed.filter(th => th !== t);
      setLocalAllowed(filtered);
    } else {
      // Agregar al final si no excede el límite razonable para interacción (por ejemplo 3)
      if (localAllowed.length >= 5) {
        // No permitir más de 5
        return;
      }
      setLocalAllowed([...localAllowed, t]);
    }
  };

  const handleSave = () => {
    if (localAllowed.length < 2 || localAllowed.length > 5) return;
    if (setAllowedThemes) {
      setAllowedThemes(localAllowed);
    }
    onClose();
  };

  const getThemeIcon = (t: ThemeType) => {
    switch (t) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'nova': return <Star className="w-4 h-4" />;
      case 'carbon': return <Flame className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'glassmorphism': return <Layers className="w-4 h-4" />;
      case 'nebula': return <Sparkles className="w-4 h-4" />;
      case 'cyberpunk': return <Terminal className="w-4 h-4" />;
      case 'kiloCode': return <Zap className="w-4 h-4" />;
    }
  };

  const getThemeLabel = (t: ThemeType) => {
    switch (t) {
      case 'light': return isTechTheme ? trTech('DIA', 'Día') : tr('Día');
      case 'nova': return isTechTheme ? trTech('NOVA', 'Nova') : tr('Nova');
      case 'carbon': return isTechTheme ? trTech('CARBON_Y_ORO', 'Carbón y oro') : tr('Carbón y oro');
      case 'dark': return isTechTheme ? trTech('NOCHE (ORIGINAL)', 'Noche (Original)') : tr('Noche (Original)');
      case 'glassmorphism': return isTechTheme ? trTech('GLASSMORPHISM', 'Glassmorphism') : tr('Glassmorphism');
      case 'nebula': return isTechTheme ? trTech('NEBULOSA', 'Nebulosa') : tr('Nebulosa');
      case 'cyberpunk': return isTechTheme ? trTech('CYBERPUNK', 'Cyberpunk') : tr('Cyberpunk');
      case 'kiloCode': return isTechTheme ? trTech('KILOCODE', 'KiloCode') : tr('KiloCode');
    }
  };

  const isValidCount = localAllowed.length >= 2 && localAllowed.length <= 5;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div className={`absolute inset-0 ${(theme === 'light' || theme === 'nova') ? 'bg-black/10 backdrop-blur-[2px]' : 'bg-black/40 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />
      <div 
        className={`w-full max-w-md relative z-10 animate-fade-in-up max-h-[95vh] overflow-y-auto p-6 glass-dropdown ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${isTechTheme ? 'text-accent hover:text-accent/70' : 'text-text-secondary hover:text-text-primary'}`}>
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 ${isTechTheme ? 'rounded-none bg-accent/10 border border-accent/30' : 'rounded-xl bg-accent/10'} flex items-center justify-center`}>
            <Palette className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className={`${isTechTheme ? 'font-mono font-bold text-accent uppercase tracking-widest text-lg' : 'font-syne font-bold text-text-primary text-xl'}`}>
              {isTechTheme ? trTech('>_ GESTION_TEMAS', 'Gestión de Temas') : tr('Gestión de Temas')}
            </h2>
            <p className={`text-xs ${isTechTheme ? 'font-mono text-accent/50' : 'text-text-muted'}`}>
              {isTechTheme ? trTech('PERSONALIZA_LA_APARIENCIA', 'Personaliza la apariencia') : tr('Personaliza la apariencia')}
            </p>
          </div>
          <PageTourButton id="temas" className="ml-auto mr-8" />
        </div>

        <div className="space-y-6">
          {/* Tema Activo */}
          <div>
            <p className={`text-sm font-medium text-text-primary mb-3 ${isTechTheme ? 'font-mono text-accent/70 uppercase' : ''}`}>
              {isTechTheme ? trTech('TEMA_VISUAL_ACTIVO', 'Tema Visual Activo') : tr('Tema Visual Activo')}
            </p>
            <div className="grid grid-cols-4 gap-2" data-tour="th-grid">
              <button onClick={() => setTheme('light')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'light' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Sun className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('DIA', 'Día') : tr('Día')}</span>
              </button>
              <button onClick={() => setTheme('nova')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'nova' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Star className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('NOVA', 'Nova') : tr('Nova')}</span>
              </button>
              <button onClick={() => setTheme('dark')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'dark' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Moon className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('ORIG', 'Original') : tr('Original')}</span>
              </button>
              <button onClick={() => setTheme('carbon')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'carbon' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Flame className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('CARBON', 'Carbón') : tr('Carbón')}</span>
              </button>
              <button onClick={() => setTheme('glassmorphism')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'glassmorphism' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Layers className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('GLASS', 'Glass') : tr('Glass')}</span>
              </button>
              <button onClick={() => setTheme('nebula')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'nebula' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Sparkles className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('NEBULA', 'Nebulosa') : tr('Nebulosa')}</span>
              </button>
              <button onClick={() => setTheme('cyberpunk')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'cyberpunk' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Terminal className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('CYBER', 'Cyber') : tr('Cyber')}</span>
              </button>
              <button onClick={() => setTheme('kiloCode')} className={`flex flex-col items-center justify-center py-3 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${theme === 'kiloCode' ? 'bg-accent/10 border-accent text-accent' : 'border-glass-border hover:bg-glass text-text-secondary'}`}>
                <Zap className="w-5 h-5 mb-1.5" />
                <span className={`text-xs font-medium ${isTechTheme ? 'font-mono' : ''}`}>{isTechTheme ? trTech('KILO', 'Kilo') : tr('Kilo')}</span>
              </button>
            </div>
          </div>

          <div className={`h-px w-full ${isTechTheme ? 'bg-accent/20' : 'bg-glass-border'}`} />

          {/* Selector rápido en menú */}
          <div data-tour="th-menu">
            <div className="flex justify-between items-center mb-1">
              <p className={`text-sm font-medium text-text-primary ${isTechTheme ? 'font-mono text-accent/70 uppercase' : ''}`}>
                {isTechTheme ? trTech('MODOS_EN_MENU', 'Modos en Menú Desplegable') : tr('Modos en Menú Desplegable')}
              </p>
              <span className={`text-[10px] px-2 py-0.5 ${isTechTheme ? 'font-mono border border-accent/20 rounded-none' : 'rounded'} ${isValidCount ? 'text-accent bg-accent/10' : 'text-red-400 bg-red-500/10'}`}>
                {localAllowed.length} {isTechTheme ? 'SEL' : 'seleccionados'} (Mín 2, Máx 5)
              </span>
            </div>
            <p className={`text-[11px] mb-3 ${isTechTheme ? 'font-mono text-accent/40' : 'text-text-muted'}`}>
              {isTechTheme ? trTech('TOCA_LOS_TEMAS_PARA_MODIFICAR_EL_MENU_RAPIDO', 'Toca los temas en el orden que quieres que aparezcan en el menú rápido.') : tr('Toca los temas en el orden que quieres que aparezcan en el menú rápido.')}
            </p>
            
            <div className="space-y-2">
              {(['light', 'nova', 'dark', 'carbon', 'glassmorphism', 'nebula', 'cyberpunk', 'kiloCode'] as ThemeType[]).map(t => {
                const selectedIndex = localAllowed.indexOf(t);
                const isSelected = selectedIndex !== -1;
                
                return (
                  <button 
                    key={t} 
                    onClick={() => toggleAllowedTheme(t)}
                    className={`w-full flex items-center justify-between p-3.5 border transition-all ${isTechTheme ? 'rounded-none' : 'rounded-xl'} ${
                      isSelected 
                        ? isTechTheme 
                          ? 'border-accent bg-accent/5 text-text-primary'
                          : 'border-accent/40 bg-accent/5 text-text-primary'
                        : isTechTheme
                          ? 'border-accent/20 bg-black text-accent/60 hover:border-accent/45'
                          : 'border-glass-border bg-glass text-text-secondary hover:bg-glass-hover'
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
            {isTechTheme ? trTech('CANCELAR', 'Cancelar') : tr('Cancelar')}
          </button>
          <button data-tour="th-save"
            onClick={handleSave}
            disabled={!isValidCount}
            className={`flex-[2] py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
              isTechTheme 
                ? 'bg-accent/20 border border-accent text-accent hover:bg-accent hover:text-black rounded-none font-mono uppercase' 
                : 'bg-gradient-to-r from-accent to-accent-dim text-black rounded-xl hover:opacity-90'
            }`}
          >
            <Check className="w-4 h-4" />
            {isTechTheme ? trTech('GUARDAR_CAMBIOS', 'Guardar Cambios') : tr('Guardar Cambios')}
          </button>
        </div>

      </div>
    </div>
  );
}
