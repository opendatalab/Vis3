
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { resources, SUPPORTED_LANGUAGES, type SupportedLanguage } from './locales';

const DEFAULT_NAMESPACE = 'translation';
const FALLBACK_LANGUAGE: SupportedLanguage = 'en-US';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    defaultNS: DEFAULT_NAMESPACE,
    ns: [DEFAULT_NAMESPACE],
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'querystring'],
      caches: ['localStorage'],
      lookupLocalStorage: 'lang',
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

export * from 'react-i18next';
export type { SupportedLanguage } from './locales';
export { DEFAULT_NAMESPACE, FALLBACK_LANGUAGE, i18n, SUPPORTED_LANGUAGES };

