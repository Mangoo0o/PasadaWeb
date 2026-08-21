import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fil from './locales/fil.json';

const savedLang = localStorage.getItem('pasada_language') || 'fil';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fil: { translation: fil }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export const setAppLanguage = (lang: 'en' | 'fil') => {
  localStorage.setItem('pasada_language', lang);
  i18n.changeLanguage(lang);
};

export default i18n;
