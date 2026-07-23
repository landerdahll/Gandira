'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pago-theme';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => undefined });

function updateFavicon(theme: Theme) {
  const href = theme === 'dark' ? '/icon-blue.svg' : '/icon-black.svg';
  let favicon = document.querySelector<HTMLLinkElement>("link[rel='icon']");

  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }

  favicon.href = href;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark';
    setTheme(initialTheme);
    updateFavicon(initialTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
      document.documentElement.style.colorScheme = nextTheme;
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      updateFavicon(nextTheme);
      return nextTheme;
    });
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
