// ============================================================================
// I18N-001 §4, §8 & §9: Language Context & Resolution Pipeline
// Explicitly separates:
//   - query_language
//   - response_language
//   - ui_language
//   - knowledge_languages
// ============================================================================

import { SupportedLanguage } from '../types';
import { normalizeLocaleAndLanguage, isSupportedLanguage } from './i18n.registry';
import { detectTextLanguage } from './i18n.detector';

export interface LanguageContext {
  query_language: SupportedLanguage;
  response_language: SupportedLanguage;
  ui_language: SupportedLanguage;
  user_language_preference?: SupportedLanguage | 'auto';
  host_language?: SupportedLanguage;
  locale: string;
  knowledge_languages: SupportedLanguage[];
  fell_back_from_unsupported: boolean;
}

export function resolveLanguageContext(params: {
  question?: string;
  explicitResponseLanguage?: string | null;
  userLanguagePreference?: string | null;
  hostLanguage?: string | null;
  uiLanguage?: string | null;
  browserLocale?: string | null;
  knowledgeLanguages?: SupportedLanguage[];
}): LanguageContext {
  const {
    question = '',
    explicitResponseLanguage,
    userLanguagePreference,
    hostLanguage,
    uiLanguage,
    browserLocale,
    knowledgeLanguages = ['en', 'es'],
  } = params;

  // 1. Resolve UI Language: Explicit UI -> User preference -> Host -> Browser locale -> 'en'
  const rawUiCandidate =
    (uiLanguage && uiLanguage !== 'auto' ? uiLanguage : undefined) ||
    (userLanguagePreference && userLanguagePreference !== 'auto'
      ? userLanguagePreference
      : undefined) ||
    hostLanguage ||
    browserLocale ||
    'en';

  const normalizedUi = normalizeLocaleAndLanguage(rawUiCandidate, 'en');
  const resolvedUiLang = normalizedUi.language;

  // 2. Resolve Query Language independently from UI language (I18N-001 §7 & §8)
  const detectedQuery = question.trim()
    ? detectTextLanguage(question)
    : { language: resolvedUiLang, confidence: 0.8, method: 'automatic' as const };
  const queryLanguage: SupportedLanguage = detectedQuery.language;

  // 3. Resolve Response Language (I18N-001 §8 & §49):
  // Explicit response preference -> query_language -> UI/host language -> 'en'
  let responseLanguage: SupportedLanguage = queryLanguage;
  let fellBack = normalizedUi.fellBackFromUnsupported;

  const explicitPref =
    explicitResponseLanguage && explicitResponseLanguage !== 'auto'
      ? explicitResponseLanguage
      : userLanguagePreference && userLanguagePreference !== 'auto'
      ? userLanguagePreference
      : null;

  if (explicitPref) {
    const normResp = normalizeLocaleAndLanguage(explicitPref, 'en');
    responseLanguage = normResp.language;
    if (normResp.fellBackFromUnsupported) {
      fellBack = true;
    }
  } else if (hostLanguage && isSupportedLanguage(hostLanguage) && !question.trim()) {
    responseLanguage = hostLanguage;
  }

  const normalizedHost = hostLanguage
    ? normalizeLocaleAndLanguage(hostLanguage, 'en').language
    : undefined;

  return {
    query_language: queryLanguage,
    response_language: responseLanguage,
    ui_language: resolvedUiLang,
    user_language_preference: isSupportedLanguage(userLanguagePreference)
      ? userLanguagePreference
      : 'auto',
    host_language: normalizedHost,
    locale:
      responseLanguage === 'es' && !normalizedUi.locale.startsWith('es')
        ? 'es-ES'
        : normalizedUi.locale,
    knowledge_languages: knowledgeLanguages,
    fell_back_from_unsupported: fellBack,
  };
}
