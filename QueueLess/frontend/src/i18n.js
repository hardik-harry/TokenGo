import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import gu from './locales/gu.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      English: { translation: en },
      Gujarati: { translation: gu },
    },
    lng: localStorage.getItem('language') || 'English',
    fallbackLng: 'English',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
