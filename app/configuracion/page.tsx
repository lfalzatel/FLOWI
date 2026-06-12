'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sun, Moon, Terminal, Layers } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { BottomNav } from '@/components/layout/BottomNav';

export default function ConfigPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <main className="min-h-screen bg-deep text-text-primary p-6 pb-24 animate-fade-in">
      <header className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-syne font-bold">Configuración</h1>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4 text-text-secondary">Apariencia (Modo)</h2>
          <div className="grid grid-cols-1 gap-4">
            
            {/* Modo Día */}
            <button 
              onClick={() => setTheme('light')}
              className={`flex items-center p-4 rounded-xl border text-left transition-all ${
                theme === 'light' 
                  ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,229,160,0.1)]' 
                  : 'border-glass-border bg-glass hover:bg-glass-hover'
              }`}
            >
              <div className={`p-3 rounded-full mr-4 ${theme === 'light' ? 'bg-accent/20 text-accent' : 'bg-glass-strong text-text-secondary'}`}>
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold font-syne text-lg">Modo Día</h3>
                <p className="text-sm text-text-secondary mt-1">Claro, relajado y optimizado para la luz del sol.</p>
              </div>
            </button>

            {/* Modo Glassmorphism */}
            <button 
              onClick={() => setTheme('glassmorphism')}
              className={`flex items-center p-4 rounded-xl border text-left transition-all ${
                theme === 'glassmorphism' 
                  ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,229,160,0.1)]' 
                  : 'border-glass-border bg-glass hover:bg-glass-hover'
              }`}
            >
              <div className={`p-3 rounded-full mr-4 ${theme === 'glassmorphism' ? 'bg-accent/20 text-accent' : 'bg-glass-strong text-text-secondary'}`}>
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold font-syne text-lg">Glassmorphism</h3>
                <p className="text-sm text-text-secondary mt-1">Oscuro con transparencias y desenfoques elegantes.</p>
              </div>
            </button>

            {/* Modo Cyberpunk */}
            <button 
              onClick={() => setTheme('cyberpunk')}
              className={`flex items-center p-4 rounded-xl border text-left transition-all ${
                theme === 'cyberpunk' 
                  ? 'border-accent bg-accent/10 shadow-[0_0_15px_rgba(0,229,160,0.1)]' 
                  : 'border-glass-border bg-glass hover:bg-glass-hover'
              }`}
            >
              <div className={`p-3 rounded-full mr-4 ${theme === 'cyberpunk' ? 'bg-accent/20 text-accent' : 'bg-glass-strong text-text-secondary'}`}>
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold font-syne text-lg">Cyberpunk</h3>
                <p className="text-sm text-text-secondary mt-1">Estética neón, consola terminal y máximo contraste.</p>
              </div>
            </button>

          </div>
        </section>
      </div>
      
      <BottomNav />
    </main>
  );
}

