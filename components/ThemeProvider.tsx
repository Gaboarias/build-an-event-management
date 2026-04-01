'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'colorblind';

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} });

export function useTheme() { return useContext(Ctx); }

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('wem-theme') as Theme) ?? 'dark';
    setThemeState(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('wem-theme', t);
    document.documentElement.dataset.theme = t;
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
