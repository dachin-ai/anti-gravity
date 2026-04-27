import React, { createContext, useContext, useState } from 'react';

const LangContext = createContext();

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState('en'); // 'en' or 'zh'
  const toggleLang = () => setLang(l => (l === 'en' ? 'zh' : 'en'));
  const setLanguage = (l) => setLang(l);
  return (
    <LangContext.Provider value={{ lang, toggleLang, setLanguage }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
