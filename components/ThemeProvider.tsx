'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'glassmorphism' | 'nebula' | 'cyberpunk' | 'kiloCode' | 'nova' | 'carbon';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  allowedThemes: Theme[];
  setAllowedThemes: (themes: Theme[]) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'glassmorphism',
  setTheme: () => null,
  allowedThemes: ['glassmorphism', 'nebula', 'dark', 'light', 'cyberpunk'],
  setAllowedThemes: () => null,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('glassmorphism');
  const [allowedThemes, setAllowedThemesState] = useState<Theme[]>(['glassmorphism', 'nebula', 'dark', 'light', 'cyberpunk']);

  useEffect(() => {
    const savedTheme = localStorage.getItem('flowi-theme') as Theme;
    if (savedTheme && ['light', 'dark', 'glassmorphism', 'nebula', 'cyberpunk', 'kiloCode', 'nova', 'carbon'].includes(savedTheme)) {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'glassmorphism');
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


