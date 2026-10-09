'use client';

// ============================================================================
// I18N-001 §4, §5 & §32: Application Language Provider & Selector Hook
// Detection Priority:
//   Explicit user selection -> Persisted preference -> Browser locale -> 'en'
// Updates document.documentElement.lang automatically (I18N-001 §37).
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage } from '../types';
import { normalizeLocaleAndLanguage } from './i18n.registry';
import { EN_DICTIONARY } from './locales/en';
import { ES_DICTIONARY } from './locales/es';

interface I18nContextValue {
  language: SupportedLanguage;
  locale: string;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  locale: 'en-US',
  setLanguage: () => {},
  t: (key, fallback) => EN_DICTIONARY[key] || fallback || key,
});

let memoryLanguagePreference: SupportedLanguage | null = null;

export const I18nProvider: React.FC<{
  children: React.ReactNode;
  initialLanguage?: SupportedLanguage;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    if (memoryLanguagePreference) return memoryLanguagePreference;
    if (typeof navigator !== 'undefined' && navigator.language) {
      return normalizeLocaleAndLanguage(navigator.language, 'en').language;
    }
    return 'en';
  });

  const locale = language === 'es' ? 'es-ES' : 'en-US';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    memoryLanguagePreference = lang;
    setLanguageState(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  };

  const t = (key: string, fallback?: string): string => {
    const dict = language === 'es' ? ES_DICTIONARY : EN_DICTIONARY;
    return dict[key] || EN_DICTIONARY[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
