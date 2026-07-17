'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Check, Palette, Trash2, Copy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import { addNote, updateNote, deleteNote, Note } from '@/lib/firestore';

interface Props {
  note: Note | null; // null if creating a new note
  onClose: () => void;
  onSuccess: () => void;
}

const PREDEFINED_COLORS = [
  'bg-glass', // Default
  'bg-red-500/20',
  'bg-orange-500/20',
  'bg-yellow-500/20',
  'bg-green-500/20',
  'bg-blue-500/20',
  'bg-purple-500/20',
  'bg-pink-500/20',
];

export function NoteModal({ note, onClose, onSuccess }: Props) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [color, setColor] = useState(note?.color || 'bg-glass');
  const [loading, setLoading] = useState(false);
  const [showPalette, setShowPalette] = useState(false);

  // Auto-resize textarea
  const contentRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = 'auto';
      contentRef.current.style.height = contentRef.current.scrollHeight + 'px';
    }
  }, [content]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    if (!user || (!title.trim() && !content.trim())) {
      onClose();
      return;
    }
    
    setLoading(true);
    try {
      if (note?.id) {
        await updateNote(note.id, { title, content, color });
      } else {
        await addNote({
          userId: user.uid,
          title,
          content,
          color,
        });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note?.id) return;
    const confirmDelete = window.confirm('¿Seguro que deseas eliminar esta nota?');
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await deleteNote(note.id);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${title}\n\n${content}`.trim());
    alert('Nota copiada al portapapeles');
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 ${isTechTheme ? 'font-mono' : ''}`}>
      {/* Backdrop */}
      <div className={`absolute inset-0 ${theme === 'light' ? 'bg-black/10 backdrop-blur-[2px]' : 'bg-black/40 backdrop-blur-sm'}`} onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div 
        className={`w-full max-w-md relative z-10 flex flex-col max-h-[95vh] overflow-hidden animate-fade-in-up glass-dropdown
                    ${isTechTheme ? 'rounded-none border border-accent/50' : 'rounded-3xl'} 
                    ${color !== 'bg-glass' ? color : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex flex-col flex-1 overflow-hidden ${isTechTheme ? 'rounded-none' : 'rounded-3xl'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 transition-colors">
              <X className="w-6 h-6 text-text-secondary" />
            </button>
            <div className="flex items-center gap-1">
              {note?.id && (
                <>
                  <button onClick={handleCopy} className="p-2 rounded-full hover:bg-black/10 transition-colors text-text-secondary">
                    <Copy className="w-5 h-5" />
                  </button>
                  <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
              <div className="relative">
                <button onClick={() => setShowPalette(!showPalette)} className="p-2 rounded-full hover:bg-black/10 transition-colors text-text-secondary">
                  <Palette className="w-5 h-5" />
                </button>
                {/* Palette Dropdown */}
                {showPalette && (
                  <div className={`absolute right-0 top-full mt-2 p-2 flex flex-wrap gap-2 w-48 z-10 glass-dropdown ${isTechTheme ? 'rounded-none' : 'rounded-2xl'}`}>
                    {PREDEFINED_COLORS.map(c => (
                      <button 
                        key={c}
                        onClick={() => { setColor(c); setShowPalette(false); }}
                        className={`w-8 h-8 rounded-full border border-white/20 hover:scale-110 transition-transform ${c === 'bg-glass' ? 'bg-white/10' : c}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={handleSave} 
                disabled={loading}
                className={`ml-2 px-4 py-1.5 font-bold text-sm ${isTechTheme ? 'bg-accent text-black uppercase rounded-none' : 'bg-text-primary text-deep rounded-full'} hover:opacity-90 disabled:opacity-50`}
              >
                {loading ? '...' : note ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
            <input
              type="text"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full bg-transparent border-none outline-none text-xl font-bold placeholder-text-muted
                          ${isTechTheme ? 'text-accent font-mono' : 'text-text-primary font-syne'}`}
            />
            <textarea
              ref={contentRef}
              placeholder="Escribe tu nota aquí..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={`w-full bg-transparent border-none outline-none resize-none min-h-[200px] text-base placeholder-text-muted
                          ${isTechTheme ? 'text-white font-mono' : 'text-text-secondary'} leading-relaxed`}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
