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
const DEFAULT_ALLOWED: Theme[] = ['glassmorphism', 'nova', 'light', 'dark', 'carbon'];
// Sube este número cuando cambie el menú por defecto: la lista guardada antes se reemplaza una vez
const ALLOWED_VERSION = '2';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'glassmorphism',
  setTheme: () => null,
  allowedThemes: DEFAULT_ALLOWED,
  setAllowedThemes: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('glassmorphism');
  const [allowedThemes, setAllowedThemesState] = useState<Theme[]>(DEFAULT_ALLOWED);

  useEffect(() => {
    const savedTheme = localStorage.getItem('flowi-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'glassmorphism', 'nebula', 'cyberpunk', 'kiloCode', 'nova', 'carbon', 'obsidiana'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'glassmorphism');
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


