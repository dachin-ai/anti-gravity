import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import id from '../locales/id.json';

const STORAGE_KEY = 'fm_lang';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zh: { translation: zh },
    id: { translation: id },
  },
  lng: typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || 'en' : 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'zh', 'id'],
  interpolation: { escapeValue: false },
});

export const FM_LANG_STORAGE_KEY = STORAGE_KEY;
export default i18n;
