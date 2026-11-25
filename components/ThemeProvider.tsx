'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'glassmorphism' | 'nebula' | 'cyberpunk' | 'kiloCode' | 'nova' | 'carbon' | 'obsidiana';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  allowedThemes: Theme[];
  setAllowedThemes: (themes: Theme[]) => void;
}

// Menú rápido por defecto; cada quien lo cambia en Configuración → Temas
const DEFAULT_ALLOWED: Theme[] = ['glassmorphism', 'obsidiana', 'nova', 'light', 'carbon'];
// Sube este número cuando cambie el menú por defecto: la lista guardada antes se reemplaza una vez
const ALLOWED_VERSION = '3';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'glassmorphism',
  setTheme: () => null,
  allowedThemes: DEFAULT_ALLOWED,
  setAllowedThemes: () => null,
});

// Color que FLOWI le da al celular para la barra de arriba (hora, batería) y la de navegación: el del
// fondo de cada tema, para que se vean integradas (antes era el verde de la marca en todos los temas)
const BAR_COLOR: Record<Theme, string> = {
  glassmorphism: '#05202E', obsidiana: '#07080A', nova: '#F8F2E9', light: '#F8FAFC', carbon: '#121110',
  dark: '#0A0A0F', nebula: '#0A0618', cyberpunk: '#0A0A16', kiloCode: '#0A0A16',
};
function applyBarColor(t: Theme) {
  if (typeof document === 'undefined') return;
  const color = BAR_COLOR[t] || '#0A0A0F';
  let metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
  if (!metas.length) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
    metas = [m];
  }
  metas.forEach(m => { m.removeAttribute('media'); m.content = color; });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('glassmorphism');
  const [allowedThemes, setAllowedThemesState] = useState<Theme[]>(DEFAULT_ALLOWED);

  useEffect(() => {
    const savedTheme = localStorage.getItem('flowi-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'glassmorphism', 'nebula', 'cyberpunk', 'kiloCode', 'nova', 'carbon', 'obsidiana'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      applyBarColor(savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'glassmorphism');
      applyBarColor('glassmorphism');
    }

    // Con los temas nuevos (Nova y Carbón) el menú por defecto cambió: se aplica una vez a todos
    if (localStorage.getItem('flowi-allowed-themes-v') !== ALLOWED_VERSION) {
      localStorage.setItem('flowi-allowed-themes', JSON.stringify(DEFAULT_ALLOWED));
      localStorage.setItem('flowi-allowed-themes-v', ALLOWED_VERSION);
    }
    const savedAllowed = localStorage.getItem('flowi-allowed-themes');
    if (savedAllowed) {
      try {
        const parsed = JSON.parse(savedAllowed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllowedThemesState(parsed);
        }
      } catch(e) {}
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('flowi-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    applyBarColor(newTheme);
  };

  const setAllowedThemes = (themes: Theme[]) => {
    setAllowedThemesState(themes);
    localStorage.setItem('flowi-allowed-themes', JSON.stringify(themes));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, allowedThemes, setAllowedThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


