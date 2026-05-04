import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18n, { FM_LANG_STORAGE_KEY } from '../i18n/config';

const SUPPORTED = ['en', 'zh', 'id'];

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(FM_LANG_STORAGE_KEY) : null;
    return SUPPORTED.includes(stored) ? stored : 'en';
  });

  const setLanguage = useCallback((next) => {
    if (!SUPPORTED.includes(next)) return;
    setLangState(next);
    localStorage.setItem(FM_LANG_STORAGE_KEY, next);
    void i18n.changeLanguage(next);
  }, []);

  useEffect(() => {
    if (i18n.language !== lang) {
      void i18n.changeLanguage(lang);
    }
  }, [lang]);

  const value = useMemo(() => ({ lang, setLanguage, supportedLangs: SUPPORTED }), [lang, setLanguage]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
};
