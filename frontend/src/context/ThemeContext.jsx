import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('fm_theme') !== 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('fm_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Apply on first mount without waiting for state change
  useEffect(() => {
    const saved = localStorage.getItem('fm_theme') ?? 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => setIsDark(v => !v);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
