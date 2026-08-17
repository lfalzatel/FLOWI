'use client';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '@/components/ThemeProvider';
import { AlertTriangle, Terminal, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const isLight = theme === 'light';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      {/* Backdrop overlay closer */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div
        className={`
          w-full max-w-sm relative z-10 p-6 animate-scale-in overflow-hidden shadow-2xl
          ${isTechTheme
            ? 'bg-[#05050A] border-2 border-red-500/50 rounded-none font-mono uppercase text-xs text-white'
            : isLight
              ? 'bg-white border border-gray-200 rounded-3xl text-gray-900'
              : 'bg-[#0D1527] border border-white/10 rounded-3xl text-white'
          }
        `}
      >
        {/* Cyberpunk Grid Background */}
        {isTechTheme && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500/5 via-transparent to-transparent opacity-40" />
        )}

        {/* Close Button */}
        <button
          onClick={onCancel}
          className={`absolute top-4 right-4 transition-colors p-1 ${
            isTechTheme
              ? 'text-red-400 hover:text-red-300'
              : isLight
                ? 'text-gray-400 hover:text-gray-600'
                : 'text-white/40 hover:text-white'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`
              w-10 h-10 flex items-center justify-center flex-shrink-0
              ${isTechTheme
                ? 'bg-red-500/10 border border-red-500/40 text-red-500 rounded-none'
                : isLight
                  ? 'bg-red-50 text-red-600 border border-red-100 rounded-2xl'
                  : 'bg-red-500/15 text-red-400 border border-red-500/20 rounded-2xl'
              }
            `}
          >
            {isTechTheme ? <Terminal className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <span className={`block text-[10px] tracking-widest font-bold ${
              isTechTheme
                ? 'text-red-500'
                : isLight
                  ? 'text-red-600 font-syne'
                  : 'text-red-400 font-syne'
            }`}>
              {isTechTheme ? 'SYS_WARN :: CRITICAL' : 'Acción Crítica'}
            </span>
            <h3 className={`text-base font-bold leading-tight ${
              isTechTheme
                ? 'text-red-400'
                : isLight
                  ? 'text-gray-900 font-syne'
                  : 'text-white font-syne'
            }`}>
              {title}
            </h3>
          </div>
        </div>

        {/* Message */}
        <p className={`mb-6 leading-relaxed ${
          isTechTheme
            ? 'text-red-200/80 font-mono text-[10px]'
            : isLight
              ? 'text-gray-600 text-sm'
              : 'text-gray-300 text-sm'
        }`}>
          {message}
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            className={`
              flex-1 py-3 text-center transition-all font-semibold active:scale-[0.98]
              ${isTechTheme
                ? 'bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-none'
                : isLight
                  ? 'bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-xl text-sm'
                  : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm'
              }
            `}
          >
            {isTechTheme ? `[ ESC // ${cancelText.toUpperCase()} ]` : cancelText}
          </button>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={onConfirm}
            className={`
              flex-1 py-3 text-center transition-all font-bold active:scale-[0.98]
              ${isTechTheme
                ? 'bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 rounded-none shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                : isLight
                  ? 'bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm shadow-md shadow-red-500/20'
                  : 'bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm shadow-lg shadow-red-500/25'
              }
            `}
          >
            {isTechTheme ? `[ EXEC // ${confirmText.toUpperCase()} ]` : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
