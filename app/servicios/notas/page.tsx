'use client';
import { useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import { StickyNote, Plus, ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { useNotes } from '@/hooks/useNotes';
import { NoteModal } from '@/components/notes/NoteModal';
import { Note } from '@/lib/firestore';

export default function NotasPage() {
  const { theme } = useTheme();
  const isTechTheme = theme === 'cyberpunk' || theme === 'kiloCode';
  const { notes, loading } = useNotes();
  
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [search, setSearch] = useState('');

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    setEditingNote(null);
    setShowModal(true);
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-deep">
      <Header />
      <main className={`flex-1 pb-32 p-4 pt-6 max-w-5xl mx-auto w-full ${isTechTheme ? 'font-mono' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/servicios" className={`p-2 -ml-2 bg-glass border hover:bg-white/[0.05] transition-colors ${isTechTheme ? 'border-accent/30 rounded-none text-accent' : 'border-glass-border rounded-full text-text-primary'}`}>
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className={`text-xl font-bold ${isTechTheme ? 'text-accent uppercase tracking-wider' : 'text-text-primary'}`}>
              Mis Notas
            </h1>
          </div>
          <button
            onClick={handleCreate}
            className={`p-2 shadow-lg transition-transform hover:scale-105 active:scale-95
                        ${isTechTheme ? 'bg-transparent text-accent border border-accent rounded-none shadow-[0_0_15px_rgba(0,229,160,0.2)]' : 'bg-glass-strong text-text-primary border border-glass-border rounded-full'}`}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        {notes.length > 0 && (
          <div className={`flex items-center gap-3 px-4 py-3 mb-6 bg-glass border ${isTechTheme ? 'border-accent/30 rounded-none' : 'border-glass-border rounded-2xl'}`}>
            <Search className="w-5 h-5 text-text-muted" />
            <input 
              type="text" 
              placeholder="Buscar en tus notas..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-text-primary placeholder-text-muted"
            />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className={`w-8 h-8 rounded-full animate-spin border-t-2 ${isTechTheme ? 'border-accent' : 'border-text-primary'}`} />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className={`w-16 h-16 flex items-center justify-center mb-4 ${isTechTheme ? 'border border-accent/40 bg-black' : 'bg-black/5 dark:bg-white/5 rounded-2xl'}`}>
              <StickyNote className={`w-8 h-8 ${isTechTheme ? 'text-accent' : 'text-text-secondary'}`} />
            </div>
            <h2 className={`text-lg font-bold mb-2 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>Aún no tienes notas</h2>
            <p className={`text-sm mb-8 ${isTechTheme ? 'text-text-secondary/70' : 'text-text-secondary'}`}>
              Guarda aquí números de cuenta, direcciones importantes o ideas.
            </p>
            <button
              onClick={handleCreate}
              className={`flex items-center justify-center gap-2 px-6 py-3 font-semibold transition-all shadow-xl active:scale-95
                         ${isTechTheme ? 'bg-transparent text-accent border border-accent rounded-none hover:bg-accent/10 shadow-[0_0_15px_rgba(0,229,160,0.2)]' : 'bg-text-primary text-deep rounded-xl hover:opacity-90'}`}
            >
              <Plus className="w-5 h-5" />
              <span>Crear mi primera nota</span>
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-20 text-text-muted">No se encontraron notas con esa búsqueda.</div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {filteredNotes.map((note) => (
              <div 
                key={note.id}
                onClick={() => handleEdit(note)}
                className={`break-inside-avoid relative p-4 bg-glass border cursor-pointer group transition-all
                            hover:-translate-y-1 hover:shadow-xl
                            ${isTechTheme ? 'border-accent/20 rounded-none hover:border-accent/50' : 'border-glass-border rounded-2xl hover:border-glass-border/80'}
                            ${note.color !== 'bg-glass' ? note.color : ''}`}
              >
                {note.title && (
                  <h3 className={`font-bold mb-2 line-clamp-2 ${isTechTheme ? 'text-accent' : 'text-text-primary'}`}>
                    {note.title}
                  </h3>
                )}
                <p className={`text-sm whitespace-pre-wrap line-clamp-6 ${isTechTheme ? 'text-white' : 'text-text-secondary'}`}>
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />

      {showModal && (
        <NoteModal 
          note={editingNote} 
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
