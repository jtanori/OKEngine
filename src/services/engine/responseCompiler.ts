// ============================================================================
// ENGINE-01 §5 & I18N-001 §16–29: Multilingual Deterministic Response Compiler
// Integrates LanguageContext + LanguageAdapter (en/es) + Translation Availability Matrix
// ============================================================================

import {
  KnowledgeDocument,
  SourceCitation,
  DocumentNextStep,
  SupportedLanguage,
} from '../../types';
import { retrieveAndRankAuthorizedDocs } from './bm25Retriever';
import {
  LanguageContext,
  resolveLanguageContext,
} from '../../i18n/i18n.resolver';
import { getLanguageAdapter } from '../../i18n/i18n.adapter';

export type AnswerMode = 'deterministic' | 'extractive' | 'generative';

export type DeterministicAnswerType =
  | 'procedure'
  | 'location'
  | 'definition'
  | 'troubleshooting'
  | 'comparison'
  | 'faq'
  | 'unknown';

export type TranslationResolutionMode =
  | 'native'
  | 'structured-translation'
  | 'llm-adapter'
  | 'deterministic-fallback'
  | 'none';

export interface CompiledRetrievedChunk {
  chunkId: string;
  documentId: string;
  collectionId: string;
  documentTitle: string;
  filename: string;
  sectionHeading: string;
  similarity: number;
  bm25Score: number;
  routeBoost: number;
  routeBoostApplied: boolean;
  lineStart: number;
  lineEnd: number;
  matchedTokens: string[];
  preview: string;
}

export interface CompiledAnswerPlan {
  answerMode: AnswerMode;
  answerType: DeterministicAnswerType;
  document?: string;
  title?: string;
  section?: string;
  summary: string;
  steps: string[];
  bullets: string[];
  warnings: string[];
  codeBlocks: { language: string; code: string }[];
  matchedTokens: string[];
  matchedSynonyms: string[];
  routeBoostApplied: boolean;
  // I18N-001 §29 Explicit Multilingual Answer Plan Fields
  languageContext: LanguageContext;
  sourceLanguages: SupportedLanguage[];
  retrievalMode: 'same-language' | 'cross-language' | 'none';
  translationMode: TranslationResolutionMode;
  cta?: DocumentNextStep;
  sources: SourceCitation[];
  retrievedChunks: CompiledRetrievedChunk[];
  compiledMarkdown: string;
  latencyMs: number;
}

export function classifyQuestionIntent(question: string): DeterministicAnswerType {
  const q = question.toLowerCase().trim();

  if (
    /\b(why|error|fail|failed|issue|problem|401|403|404|expired|troubleshoot|broken|por que|por qué|fallo|expirado)\b/.test(
      q
    )
  ) {
    return 'troubleshooting';
  }
  if (/\b(where|find|locate|path|navigate|url|screen|menu|donde|dónde|encontrar|ruta)\b/.test(q)) {
    return 'location';
  }
  if (/\b(vs|versus|difference|compare|comparison|between|diferencia|comparar|entre)\b/.test(q)) {
    return 'comparison';
  }
  if (
    /\b(how|steps|configure|setup|set up|create|enable|install|rotate|restrict|add|como|cómo|pasos|configurar|configuro|crear|instalar|restringir|rotan)\b/.test(
      q
    )
  ) {
    return 'procedure';
  }
  if (/\b(can i|does|is it possible|do you|support|allowed|puedo|puede|permite|soporta)\b/.test(q)) {
    return 'faq';
  }
  return 'definition';
}

export function compileKnowledgeResponse(options: {
  question: string;
  authorizedDocs: KnowledgeDocument[];
  currentUrl?: string;
  answerMode?: AnswerMode;
  isEmbedMode?: boolean;
  effectiveRole?: string;
  blockedCollectionsCount?: number;
  explicitResponseLanguage?: string | null;
  userLanguagePreference?: string | null;
  hostLanguage?: string | null;
  uiLanguage?: string | null;
}): CompiledAnswerPlan {
  const start = Date.now();
  const {
    question,
    authorizedDocs,
    currentUrl = '/dashboard',
    answerMode = 'deterministic',
    isEmbedMode = false,
    effectiveRole = 'everyone',
    blockedCollectionsCount = 0,
    explicitResponseLanguage,
    userLanguagePreference,
    hostLanguage,
    uiLanguage,
  } = options;

  const langCtx = resolveLanguageContext({
    question,
    explicitResponseLanguage,
    userLanguagePreference,
    hostLanguage,
    uiLanguage,
  });

  const adapter = getLanguageAdapter(langCtx.response_language);
  const ranked = retrieveAndRankAuthorizedDocs(
    question,
    authorizedDocs,
    currentUrl,
    langCtx.response_language
  );
  const topMatches = ranked
    .filter((r) => r.normalizedConfidence >= 0.25 && r.score > 0)
    .slice(0, 3);

  // Conservative Fallback ("Nothing Shown" Rule in embed mode, localized via adapter)
  if (topMatches.length === 0) {
    const fallbackText = isEmbedMode
      ? adapter.noAnswerEmbed
      : adapter.noAnswerWorkspace(effectiveRole, blockedCollectionsCount);

    return {
      answerMode,
      answerType: 'unknown',
      summary: fallbackText,
      steps: [],
      bullets: [],
      warnings: [],
      codeBlocks: [],
      matchedTokens: [],
      matchedSynonyms: [],
      routeBoostApplied: false,
      languageContext: langCtx,
      sourceLanguages: [],
      retrievalMode: 'none',
      translationMode: 'none',
      sources: [],
      retrievedChunks: [],
      compiledMarkdown: fallbackText,
      latencyMs: Math.max(1, Date.now() - start),
    };
  }

  const primary = topMatches[0];
  const doc = primary.compiledDoc;
  const sec = primary.bestSection;
  const detectedType = classifyQuestionIntent(question);

  // Citations ALWAYS preserve original source language identity (I18N-001 §30–31)
  const sources: SourceCitation[] = topMatches.map((m) => ({
    docId: m.compiledDoc.id,
    title: m.compiledDoc.title,
    filename: m.compiledDoc.filename,
    collectionId: m.compiledDoc.collectionId,
    snippet:
      (m.bestSection.paragraphs[0] || m.compiledDoc.summary).substring(0, 200) + '...',
    similarity: m.normalizedConfidence,
    language: m.compiledDoc.language,
    nextStep: m.compiledDoc.nextStep,
  }));

  const retrievedChunks: CompiledRetrievedChunk[] = topMatches.map((m, idx) => ({
    chunkId: `${m.compiledDoc.id}#chunk-${idx + 1}`,
    documentId: m.compiledDoc.id,
    collectionId: m.compiledDoc.collectionId,
    documentTitle: m.compiledDoc.title,
    filename: m.compiledDoc.filename,
    sectionHeading: m.bestSection.heading,
    similarity: m.normalizedConfidence,
    bm25Score: m.bm25Score,
    routeBoost: m.routeBoost,
    routeBoostApplied: m.routeBoostApplied,
    lineStart: m.lineStart,
    lineEnd: m.lineEnd,
    matchedTokens: m.matchedTokens,
    preview:
      (m.bestSection.paragraphs[0] || m.compiledDoc.summary).substring(0, 180) + '...',
  }));

  const sourceLanguages = Array.from(
    new Set(topMatches.map((m) => m.compiledDoc.language))
  );
  const topCta = topMatches.find((m) => m.compiledDoc.nextStep)?.compiledDoc.nextStep;

  // ==========================================================================
  // I18N-001 §21, §27 & §39: Resolve Translation / Cross-Language Behavior
  // ==========================================================================
  const targetLang = langCtx.response_language;
  const isNativeMatch = doc.language === targetLang;
  const availableTranslation =
    !isNativeMatch && doc.translations?.[targetLang]?.status === 'AVAILABLE'
      ? doc.translations[targetLang]
      : undefined;

  let translationMode: TranslationResolutionMode = isNativeMatch
    ? 'native'
    : availableTranslation
    ? 'structured-translation'
    : answerMode === 'generative'
    ? 'llm-adapter'
    : 'deterministic-fallback';

  // Case C (I18N-001 §21 & §39): LLM-less mode, source language != response language,
  // and NO structured translation is available -> Do NOT fabricate translation; return localized fallback!
  if (
    !isNativeMatch &&
    !availableTranslation &&
    answerMode !== 'generative'
  ) {
    const fallbackMd = adapter.crossLanguageMissingTranslationFallback(
      doc.title,
      doc.filename,
      doc.language
    );
    return {
      answerMode,
      answerType: detectedType,
      document: doc.filename,
      title: doc.title,
      section: sec.heading,
      summary: fallbackMd,
      steps: [],
      bullets: [],
      warnings: [],
      codeBlocks: [],
      matchedTokens: primary.matchedTokens,
      matchedSynonyms: primary.matchedSynonyms,
      routeBoostApplied: primary.routeBoostApplied,
      languageContext: langCtx,
      sourceLanguages,
      retrievalMode: primary.retrievalMode,
      translationMode: 'deterministic-fallback',
      cta: topCta,
      sources,
      retrievedChunks,
      compiledMarkdown: fallbackMd,
      latencyMs: Math.max(1, Date.now() - start),
    };
  }

  // Select content from either native AST or verified structured translation (Case A or Case B)
  const stripLeadingQuestionPrompt = (text: string): string => {
    const trimmed = text.trim();
    const match = trimmed.match(
      /^(?:what|how|why|where|which|when|who|can|does|is|are|do|¿)[^?]*\?\s+(.+)$/i
    );
    return match && match[1].trim().length > 0 ? match[1].trim() : trimmed;
  };

  const displayTitle = availableTranslation ? availableTranslation.title : doc.title;
  const displaySection = availableTranslation
    ? availableTranslation.title
    : sec.heading;
  const rawLeadParagraph = availableTranslation
    ? availableTranslation.summary
    : sec.paragraphs[0] || doc.summary || `See ${doc.title} (${doc.filename}).`;
  const leadParagraph = stripLeadingQuestionPrompt(rawLeadParagraph);
  const sectionHasOwnList = sec.steps.length > 0 || sec.bullets.length > 0;
  const steps = availableTranslation?.steps?.length
    ? availableTranslation.steps
    : sectionHasOwnList
    ? sec.steps
    : doc.steps.slice(0, 5);
  const bullets = availableTranslation?.bullets?.length
    ? availableTranslation.bullets
    : sectionHasOwnList
    ? sec.bullets
    : doc.bullets.slice(0, 4);
  const warnings = sec.warnings.length > 0 ? sec.warnings : [];
  const codeBlocks = sec.codeBlocks.length > 0 ? sec.codeBlocks.slice(0, 1) : [];

  const answerType: DeterministicAnswerType =
    detectedType === 'procedure' && steps.length === 0 ? 'definition' : detectedType;

  // ==========================================================================
  // MODE 2: EXTRACTIVE (Zero LLM)
  // ==========================================================================
  if (answerMode === 'extractive') {
    const extractiveParts: string[] = [
      adapter.extractiveIntro(displayTitle),
      '',
      `> "${leadParagraph}"`,
    ];

    if (!availableTranslation && sec.paragraphs[1]) {
      extractiveParts.push('', `> "${sec.paragraphs[1]}"`);
    }

    if (steps.length > 0) {
      extractiveParts.push('', adapter.extractiveStepsHeading(displaySection));
      steps.forEach((s, i) => extractiveParts.push(`${i + 1}. ${s}`));
    } else if (bullets.length > 0) {
      extractiveParts.push('', adapter.extractivePointsHeading(displaySection));
      bullets.forEach((b) => extractiveParts.push(`- ${b}`));
    }

    return {
      answerMode: 'extractive',
      answerType,
      document: doc.filename,
      title: displayTitle,
      section: displaySection,
      summary: leadParagraph,
      steps,
      bullets,
      warnings,
      codeBlocks,
      matchedTokens: primary.matchedTokens,
      matchedSynonyms: primary.matchedSynonyms,
      routeBoostApplied: primary.routeBoostApplied,
      languageContext: langCtx,
      sourceLanguages,
      retrievalMode: primary.retrievalMode,
      translationMode,
      cta: topCta,
      sources,
      retrievedChunks,
      compiledMarkdown: extractiveParts.join('\n'),
      latencyMs: Math.max(1, Date.now() - start),
    };
  }

  // ==========================================================================
  // MODE 1: DETERMINISTIC RESPONSE COMPILER (Default — Zero LLM)
  // ==========================================================================
  const out: string[] = [];
  const headerTitle =
    displaySection && displaySection !== displayTitle
      ? displaySection
      : displayTitle;

  out.push(`### ${headerTitle}`);
  out.push('');
  out.push(leadParagraph);

  if (!availableTranslation && sec.paragraphs.length > 1 && steps.length === 0) {
    out.push('');
    out.push(sec.paragraphs[1]);
  }

  if (steps.length > 0) {
    out.push('');
    out.push(`**${adapter.stepsHeading}**`);
    steps.forEach((step, idx) => {
      out.push(`${idx + 1}. ${step}`);
    });
  }

  if (bullets.length > 0 && (steps.length === 0 || answerType !== 'procedure')) {
    out.push('');
    out.push(`**${adapter.keyDetailsHeading}**`);
    bullets.forEach((b) => {
      out.push(`- ${b}`);
    });
  }

  if (warnings.length > 0) {
    out.push('');
    warnings.forEach((w) => {
      out.push(`> **${adapter.notePrefix}** ${w}`);
    });
  }

  if (codeBlocks.length > 0) {
    out.push('');
    out.push(`\`\`\`${codeBlocks[0].language}\n${codeBlocks[0].code}\n\`\`\``);
  }

  return {
    answerMode: 'deterministic',
    answerType,
    document: doc.filename,
    title: displayTitle,
    section: displaySection,
    summary: leadParagraph,
    steps,
    bullets,
    warnings,
    codeBlocks,
    matchedTokens: primary.matchedTokens,
    matchedSynonyms: primary.matchedSynonyms,
    routeBoostApplied: primary.routeBoostApplied,
    languageContext: langCtx,
    sourceLanguages,
    retrievalMode: primary.retrievalMode,
    translationMode,
    cta: topCta,
    sources,
    retrievedChunks,
    compiledMarkdown: out.join('\n'),
    latencyMs: Math.max(1, Date.now() - start),
  };
}
