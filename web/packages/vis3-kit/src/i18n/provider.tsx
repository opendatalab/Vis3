import React, { useCallback, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';

import { DEFAULT_NAMESPACE, FALLBACK_LANGUAGE, type SupportedLanguage, i18n } from './i18n';
import { resources } from './locales';
import { useLocalStorage } from './useLocalStorage';
import { merge } from './utils';

const LANG_CHANGE_EVENT = 'labelu-lang-change';

export type I18nProviderProps = React.PropsWithChildren<{
  locales?: Partial<Record<SupportedLanguage, { translation: Record<string, unknown> }>>;
  locale?: SupportedLanguage;
}>;

export function I18nProvider(props: I18nProviderProps) {
  const { locales, children, locale } = props;
  const [, setLang] = useLocalStorage('lang', () => {
    return (i18n.resolvedLanguage ?? FALLBACK_LANGUAGE) as SupportedLanguage;
  });

  useEffect(() => {
    if (locale) {
      i18n.changeLanguage(locale);
      setLang(locale);
    }
  }, [locale, setLang]);

  const handleLangChange = useCallback(
    (event: Event) => {
      const { detail } = event as CustomEvent<SupportedLanguage>;
      const nextLang = detail;
      if (nextLang && nextLang !== i18n.resolvedLanguage) {
        void i18n.changeLanguage(nextLang);
      }
    },
    [],
  );

  useEffect(() => {
    document.addEventListener(LANG_CHANGE_EVENT, handleLangChange);

    return () => {
      document.removeEventListener(LANG_CHANGE_EVENT, handleLangChange);
    };
  }, [handleLangChange]);

  useEffect(() => {
    const handleLanguageChanged = (next: string) => {
      setLang(next as SupportedLanguage);
    };
    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [setLang]);

  useEffect(() => {
    if (locales) {
      Object.keys(locales || {}).forEach((lang) => {
        const language = lang as SupportedLanguage;
        const baseBundle = resources[language] ?? resources[FALLBACK_LANGUAGE];
        const overrides = locales[language] ?? {};
        i18n.addResourceBundle(
          language,
          DEFAULT_NAMESPACE,
          merge({}, baseBundle, overrides),
          true,
          true,
        );
      });
    }
  }, [locales]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/** 用于外部改变语言 */
export const changeLanguage = (lang: SupportedLanguage) => {
  void i18n.changeLanguage(lang);
  localStorage.setItem('lang', lang);
  document.dispatchEvent(
    new CustomEvent<SupportedLanguage>(LANG_CHANGE_EVENT, {
      detail: lang,
    }),
  );
};
