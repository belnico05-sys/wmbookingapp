import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import it from './locales/it.json'
import en from './locales/en.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    fallbackLng: 'it',
    supportedLngs: ['it', 'en'],
    interpolation: {
      // React already escapes rendered strings.
      escapeValue: false,
    },
  })

export default i18n
