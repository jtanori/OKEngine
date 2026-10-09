// ============================================================================
// I18N-001 §3 & §6: MVP Language Registry & Locale Normalizer
// Supports 'en' (English) and 'es' (Spanish).
// Unsupported requested languages (e.g. 'fr') deterministically fall back to 'en'.
// ============================================================================

import { SupportedLanguage } from '../types';

export interface LanguageDefinition {
  code: SupportedLanguage;
  displayName: string;
  nativeName: string;
  defaultLocale: string;
  direction: 'ltr';
  supported: true;
}

export const LANGUAGE_REGISTRY: Record<SupportedLanguage, LanguageDefinition> = {
  en: {
    code: 'en',
    displayName: 'English',
    nativeName: 'English',
    defaultLocale: 'en-US',
    direction: 'ltr',
    supported: true,
  },
  es: {
    code: 'es',
    displayName: 'Spanish',
    nativeName: 'Español',
    defaultLocale: 'es-ES',
    direction: 'ltr',
    supported: true,
  },
};

export function isSupportedLanguage(code?: string | null): code is SupportedLanguage {
  return code === 'en' || code === 'es';
}

/**
 * Normalize a raw locale or language string (e.g., 'es-MX', 'es_ES', 'EN-GB', 'fr')
 * into `{ language: SupportedLanguage, locale: string, fellBackFromUnsupported: boolean }`.
 */
export function normalizeLocaleAndLanguage(
  rawInput?: string | null,
  fallbackLanguage: SupportedLanguage = 'en'
): {
  language: SupportedLanguage;
  locale: string;
  fellBackFromUnsupported: boolean;
} {
  if (!rawInput || !rawInput.trim()) {
    return {
      language: fallbackLanguage,
      locale: LANGUAGE_REGISTRY[fallbackLanguage].defaultLocale,
      fellBackFromUnsupported: false,
    };
  }

  const cleaned = rawInput.trim().replace('_', '-');
  const primary = cleaned.split('-')[0].toLowerCase();

  if (primary === 'es') {
    return {
      language: 'es',
      locale: cleaned.includes('-') ? cleaned : 'es-ES',
      fellBackFromUnsupported: false,
    };
  }
  if (primary === 'en') {
    return {
      language: 'en',
      locale: cleaned.includes('-') ? cleaned : 'en-US',
      fellBackFromUnsupported: false,
    };
  }

  // I18N-001 §38: Unsupported language (e.g., 'fr') deterministically falls back to 'en'
  return {
    language: fallbackLanguage,
    locale: LANGUAGE_REGISTRY[fallbackLanguage].defaultLocale,
    fellBackFromUnsupported: true,
  };
}
