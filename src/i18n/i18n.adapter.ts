// ============================================================================
// I18N-001 §16–21 & §39–40: Language Adapters (English & Spanish)
// Converts structured knowledge or cross-language fallbacks into the target
// response_language without fabricating unauthorized or unverified translations.
// ============================================================================

import { SupportedLanguage } from '../types';

export interface LanguageAdapter {
  code: SupportedLanguage;
  stepsHeading: string;
  keyDetailsHeading: string;
  notePrefix: string;
  sourcesLabel: string;
  extractiveIntro: (title: string) => string;
  extractiveStepsHeading: (section: string) => string;
  extractivePointsHeading: (section: string) => string;
  noAnswerEmbed: string;
  noAnswerWorkspace: (role: string, blockedCount: number) => string;
  crossLanguageMissingTranslationFallback: (
    docTitle: string,
    filename: string,
    sourceLang: SupportedLanguage
  ) => string;
  llmSystemInstruction: (sourceLanguages: SupportedLanguage[]) => string;
}

export const ENGLISH_ADAPTER: LanguageAdapter = {
  code: 'en',
  stepsHeading: 'Steps',
  keyDetailsHeading: 'Key Details',
  notePrefix: 'Note:',
  sourcesLabel: 'Sources',
  extractiveIntro: (title) => `**According to your documentation (${title}):**`,
  extractiveStepsHeading: (section) => `**Extracted Steps (${section}):**`,
  extractivePointsHeading: (section) => `**Extracted Points (${section}):**`,
  noAnswerEmbed: "I couldn't find that information in the available documentation.",
  noAnswerWorkspace: (role, blockedCount) => {
    let msg = `I could not find documentation to answer this question in your accessible collections (Role: ${role}).`;
    if (blockedCount > 0) {
      msg += ` Note that ${blockedCount} restricted collection(s) were excluded from retrieval based on your permissions.`;
    }
    return msg;
  },
  crossLanguageMissingTranslationFallback: (docTitle, filename) =>
    `### ${docTitle}\n\nThe relevant documentation is available in Spanish (\`${filename}\`). No verified English translation is currently indexed for deterministic rendering.\n\nSources: ${docTitle} (\`${filename}\` [es])`,
  llmSystemInstruction: () =>
    'Answer in English strictly using the provided authorized sources. Do not invent unsupported information.',
};

export const SPANISH_ADAPTER: LanguageAdapter = {
  code: 'es',
  stepsHeading: 'Pasos',
  keyDetailsHeading: 'Detalles clave',
  notePrefix: 'Nota:',
  sourcesLabel: 'Fuentes',
  extractiveIntro: (title) => `**Según su documentación (${title}):**`,
  extractiveStepsHeading: (section) => `**Pasos extraídos (${section}):**`,
  extractivePointsHeading: (section) => `**Puntos extraídos (${section}):**`,
  noAnswerEmbed:
    'No pude encontrar esta información en la documentación disponible.',
  noAnswerWorkspace: (role, blockedCount) => {
    let msg = `No pude encontrar esta información en la documentación disponible para su nivel de acceso (Rol: ${role}).`;
    if (blockedCount > 0) {
      msg += ` Se excluyeron ${blockedCount} colección(es) restringida(s) antes de la búsqueda.`;
    }
    return msg;
  },
  crossLanguageMissingTranslationFallback: (docTitle, filename) =>
    `### ${docTitle}\n\nLa documentación relevante está disponible en inglés (\`${filename}\`). Para preservar la fidelidad de la fuente sin utilizar un modelo generativo, consulte directamente el documento original citado a continuación.\n\nFuentes: ${docTitle} (\`${filename}\` [en])`,
  llmSystemInstruction: () =>
    'Responda en español utilizando únicamente las fuentes autorizadas proporcionadas. Conserve los nombres técnicos y rutas exactas del producto.',
};

export function getLanguageAdapter(lang: SupportedLanguage): LanguageAdapter {
  return lang === 'es' ? SPANISH_ADAPTER : ENGLISH_ADAPTER;
}
