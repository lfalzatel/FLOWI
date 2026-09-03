'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Check, Music, Volume2, Sparkles, Zap, Radio } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { playSoundPreview } from '@/lib/audioPlayer';

export type SoundActionType = 'ingreso' | 'gasto' | 'edicion' | 'eliminacion' | 'ui_nav' | 'particles' | 'notification';

interface SoundOption {
  value: string;
  label: string;
  desc: string;
  icon?: string;
}

const SOUND_DICTIONARY: Record<SoundActionType, { title: string; subtitle: string; options: SoundOption[] }> = {
  ingreso: {
    title: 'Sonido para Ingresos y Abonos',
    subtitle: 'Elige el efecto sonoro al añadir dinero a tus cuentas',
    options: [
      { value: 'mario_1up', label: '🍄 Mario Bros 1-UP', desc: 'Vida Extra 8-Bit NES' },
      { value: 'mario_coin', label: '🪙 Mario Bros Coin', desc: 'Moneda 8-Bit NES' },
      { value: 'synth', label: '🎵 Arpegio Celestial', desc: 'Sintetizador armónico suave (Web Audio)' },
      { value: 'bass', label: '🔊 Bajo Ciberpunk', desc: 'Acorde electrónico moderno' },
      { value: 'bell', label: '🔔 Campanada Clásica', desc: 'Campana cristalina tradicional' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Sin sonido de confirmación' }
    ]
  },
  gasto: {
    title: 'Sonido para Gastos',
    subtitle: 'Efecto al registrar una salida de dinero',
    options: [
      { value: 'mario_coin', label: '🪙 Mario Bros Coin', desc: 'Moneda 8-Bit NES' },
      { value: 'synth', label: '💥 Acorde Resonante', desc: 'Tono synth descendente' },
      { value: 'rover', label: '🚀 Rover Landing', desc: 'Impulso suave de despegue' },
      { value: 'soft', label: '🔔 Campanada Suave', desc: 'Efecto acústico sutil' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Sin sonido de confirmación' }
    ]
  },
  edicion: {
    title: 'Sonido para Ediciones',
    subtitle: 'Efecto al modificar o actualizar transacciones',
    options: [
      { value: 'mario_jump', label: '🍄 Mario Bros Jump', desc: 'Salto 8-Bit NES' },
      { value: 'synth', label: '🔮 Doble Repique Cristalino', desc: 'Micro-arpegio armónico' },
      { value: 'bell', label: '🔔 Campanada Clásica', desc: 'Efecto metálico limpio' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Sin sonido de confirmación' }
    ]
  },
  eliminacion: {
    title: 'Sonido para Eliminaciones',
    subtitle: 'Efecto al borrar datos o transacciones',
    options: [
      { value: 'mario_pipe', label: '🍄 Mario Bros Pipe', desc: 'Entrada a tubo 8-Bit NES' },
      { value: 'synth', label: '⚡ Barrido Descendente De-Rez', desc: 'Disolución ciberpunk' },
      { value: 'synth_laser', label: '💥 Láser Ciberpunk Descendente', desc: 'Efecto retro sci-fi' },
      { value: 'synth_dissolve', label: '🌌 Disolución Armónica', desc: 'Acorde descendente espacio' },
      { value: 'boomstick', label: '💣 Boomstick Ciberpunk', desc: 'Golpe grave de desintegración' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Sin sonido de confirmación' }
    ]
  },
  ui_nav: {
    title: 'Sonido de Navegación (PAE)',
    subtitle: 'Micro-feedback al tocar el menú inferior y pestañas',
    options: [
      { value: 'pop', label: '🍿 Pop / Burbuja', desc: 'Feedback suave estilo iOS' },
      { value: 'click', label: '⚡ Click Digital', desc: 'Sensación mecánica de interruptor' },
      { value: 'chime', label: '🎵 Campana Armónica', desc: 'Micro-acorde musical' },
      { value: 'haptic', label: '📳 Toque Háptico', desc: 'Pulso grave sutil' },
      { value: 'arcade', label: '✨ Chime Brillos', desc: 'Secuencia ascendente retro' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Desactivar feedback de navegación' }
    ]
  },
  particles: {
    title: 'Sonido de Partículas Voladoras',
    subtitle: 'Efecto auditivo durante la animación de partículas',
    options: [
      { value: 'crystal', label: '🔮 Cristalino Pentatónico', desc: 'Cascada de tonos armónicos' },
      { value: 'arcade', label: '✨ Arcade 8-Bit', desc: 'Ráfaga vintage NES' },
      { value: 'marimba', label: '🪵 Marimba Acústica', desc: 'Toques de madera cálida' },
      { value: 'synth_laser', label: '⚡ Neón Ciberpunk', desc: 'Onda sintetizada retro' },
      { value: 'silent', label: '🔇 Silencioso', desc: 'Desactivar sonido en partículas' }
    ]
  },
  notification: {
    title: 'Tono de Alerta de Notificaciones',
    subtitle: 'Sonido predeterminado para avisos y recordatorios',
    options: [
      { value: 'notification.mp3', label: '🫧 Suave (Burbuja)', desc: 'Tono ligero e inofensivo' },
      { value: 'notification-sound.mp3', label: '🔔 Clásico (Campana)', desc: 'Campanada clara de atención' }
    ]
  }
};

interface Props {
  actionType: SoundActionType;
  currentValue: string;
  onClose: () => void;
  onSelect: (val: string) => void;
}

export function ManageSoundModal({ actionType, currentValue, onClose, onSelect }: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const config = SOUND_DICTIONARY[actionType] || SOUND_DICTIONARY.ingreso;

  const [selected, setSelected] = useState(currentValue);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePlayPreview = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlayingId(val);
    playSoundPreview(val);
    setTimeout(() => setPlayingId(null), 1200);
  };

  const handleSave = () => {
    onSelect(selected);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 ${isTechTheme ? 'font-mono uppercase text-sm' : ''}`}>
      <div 
        className={`absolute inset-0 transition-opacity ${theme === 'light' ? 'bg-black/20 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-md'}`} 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Modal Container con ancho del 90% */}
      <div 
        className={`w-[92vw] max-w-3xl h-[80vh] max-h-[700px] relative z-10 animate-fade-in-up flex flex-col glass-dropdown overflow-hidden ${
          isTechTheme ? 'rounded-none border border-accent/50 bg-black/95' : 'rounded-3xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isTechTheme ? 'border-accent/30 bg-accent/5' : 'border-white/10 bg-white/5'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center ${isTechTheme ? 'border border-accent/30 bg-accent/10' : 'rounded-xl bg-accent/20'}`}>
              <Volume2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className={`font-bold text-lg sm:text-xl ${isTechTheme ? 'text-accent font-mono' : 'font-syne text-text-primary'}`}>
                {config.title}
              </h2>
              <p className={`text-xs ${isTechTheme ? 'text-accent/60' : 'text-text-muted'}`}>
                {config.subtitle}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className={`p-2 rounded-xl transition-all ${
              isTechTheme ? 'text-accent hover:bg-accent/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Listado de Opciones con Reproducción de Prueba */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-thin">
          {config.options.map((opt) => {
            const isSelected = selected === opt.value;
            const isPlaying = playingId === opt.value;

            return (
              <div
                key={opt.value}
                onClick={() => {
                  setSelected(opt.value);
                  playSoundPreview(opt.value);
                }}
                className={`p-3.5 sm:p-4 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? isTechTheme
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-accent/10 border-accent rounded-2xl shadow-lg shadow-accent/10'
                    : isTechTheme
                      ? 'bg-black/60 border-accent/20 hover:border-accent/50'
                      : 'bg-glass/80 border-glass-border hover:border-white/20 rounded-2xl'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? isTechTheme
                        ? 'border-accent bg-accent text-black'
                        : 'border-accent bg-accent text-white'
                      : isTechTheme
                        ? 'border-accent/40 bg-transparent'
                        : 'border-white/20 bg-transparent'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-sm leading-tight ${
                      isTechTheme ? 'font-mono text-accent uppercase' : 'text-text-primary'
                    }`}>
                      {opt.label}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      isTechTheme ? 'font-mono text-accent/60' : 'text-text-muted'
                    }`}>
                      {opt.desc}
                    </p>
                  </div>
                </div>

                {/* Botón Escuchar / Vista Previa */}
                <button
                  type="button"
                  onClick={(e) => handlePlayPreview(opt.value, e)}
                  title="Escuchar vista previa"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                    isPlaying
                      ? 'bg-accent text-black scale-105 animate-pulse'
                      : isTechTheme
                        ? 'border border-accent/40 text-accent hover:bg-accent/20'
                        : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-black' : 'fill-current'}`} />
                  <span>{isPlaying ? 'Sonando...' : 'Escuchar'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer con Botones de Acción */}
        <div className={`p-4 sm:px-6 border-t flex items-center justify-end gap-3 ${
          isTechTheme ? 'border-accent/30 bg-accent/5' : 'border-white/10 bg-white/5'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold transition ${
              isTechTheme
                ? 'border border-accent/40 text-accent hover:bg-accent/20 uppercase'
                : 'bg-white/10 text-white rounded-xl hover:bg-white/20'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className={`px-6 py-2.5 text-xs sm:text-sm font-bold transition shadow-lg ${
              isTechTheme
                ? 'bg-accent text-black hover:bg-accent/80 uppercase'
                : 'bg-[#D10074] text-white rounded-xl hover:bg-[#D10074]/90 shadow-[#D10074]/30'
            }`}
          >
            Guardar Tono
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
