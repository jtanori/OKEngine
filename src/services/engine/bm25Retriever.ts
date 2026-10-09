// ============================================================================
// ENGINE-01 §4 & I18N-001 §13–15: Bilingual Information Retrieval Engine
// Supports Same-Language Preference + Cross-Language Concept Bridging (EN <-> ES)
// ============================================================================

import { KnowledgeDocument, SupportedLanguage } from '../../types';
import {
  CompiledKnowledgeDocument,
  KnowledgeSection,
  parseKnowledgeDocument,
} from './knowledgeParser';

const STOP_WORDS = new Set([
  // English stop words
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'from',
  'what',
  'where',
  'when',
  'why',
  'how',
  'can',
  'does',
  'are',
  'is',
  'in',
  'on',
  'to',
  'of',
  'a',
  'an',
  'do',
  'i',
  'my',
  'we',
  'our',
  'you',
  'your',
  // Spanish stop words
  'como',
  'cómo',
  'donde',
  'dónde',
  'que',
  'qué',
  'cual',
  'cuál',
  'por',
  'para',
  'puedo',
  'puede',
  'con',
  'sin',
  'del',
  'las',
  'los',
  'una',
  'uno',
  'unos',
  'unas',
  'sobre',
  'entre',
  'esta',
  'este',
  'estos',
  'en',
  'de',
  'se',
  'al',
  'el',
  'la',
  'lo',
  'le',
  'su',
  'sus',
  'mi',
  'mis',
  'tu',
  'tus',
  'un',
  'es',
  'son',
  'no',
  'si',
  'sí',
]);

// Bilingual (EN <-> ES) lexical & concept translation equivalence table (I18N-001 §14)
const SYNONYM_GROUPS: string[][] = [
  ['sso', 'saml', 'oidc', 'okta', 'idp'],
  ['authentication', 'autenticacion', 'autenticación', 'auth'],
  ['kms', 'hsm', 'vault', 'boveda', 'bóveda'],
  ['key', 'keys', 'clave', 'claves'],
  ['rotate', 'rotated', 'rotation', 'rotar', 'rotan', 'rotacion', 'rotación'],
  ['invite', 'invitar', 'invito'],
  ['team', 'teammate', 'teammates', 'equipo', 'member', 'members', 'miembro', 'miembros', 'colleague'],
  ['billing', 'facturacion', 'facturación', 'invoice', 'invoices', 'factura', 'facturas', 'mensuales', 'monthly'],
  ['download', 'descargar', 'descargo'],
  ['plan', 'plans', 'planes', 'subscription', 'suscripcion', 'suscripción'],
  ['restrict', 'restringir', 'access', 'acceso', 'permission', 'permissions', 'permiso', 'permisos'],
  ['employee', 'employees', 'empleado', 'empleados', 'member', 'members'],
  ['start', 'started', 'quickstart', 'empezar', 'comenzar', 'inicio', 'pasos', 'steps'],
  ['configure', 'configurar', 'configuro', 'setup'],
  ['acceptable', 'aceptable', 'prohibited', 'prohibe', 'prohíbe', 'prohibido', 'policy', 'politica', 'política'],
  ['privacy', 'privacidad', 'terms', 'terminos', 'términos'],
];

/**
 * Normalize diacritics and apply lightweight EN/ES stemming.
 */
export function stemWord(word: string): string {
  const w = word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (w.length <= 3) return w;
  return w
    .replace(/aciones$/, 'acion')
    .replace(/ations?$/, 'ate')
    .replace(/ition$/, 'it')
    .replace(/ings?$/, '')
    .replace(/edly$/, '')
    .replace(/ed$/, '')
    .replace(/ies$/, 'y')
    .replace(/es$/, 'e')
    .replace(/s$/, '');
}

export function tokenizeAndStem(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    .map(stemWord);
}

export function expandWithSynonyms(stemmedTokens: string[]): Set<string> {
  const expanded = new Set<string>();
  for (const token of stemmedTokens) {
    for (const group of SYNONYM_GROUPS) {
      const stemmedGroup = group.map(stemWord);
      if (stemmedGroup.includes(token)) {
        for (const syn of stemmedGroup) {
          if (syn !== token) expanded.add(syn);
        }
      }
    }
  }
  return expanded;
}

export interface RankedRetrievalResult {
  compiledDoc: CompiledKnowledgeDocument;
  bestSection: KnowledgeSection;
  score: number;
  bm25Score: number;
  routeBoost: number;
  lineStart: number;
  lineEnd: number;
  normalizedConfidence: number;
  matchedTokens: string[];
  matchedSynonyms: string[];
  routeBoostApplied: boolean;
  retrievalMode: 'same-language' | 'cross-language';
}

export function retrieveAndRankAuthorizedDocs(
  question: string,
  authorizedDocs: KnowledgeDocument[],
  currentUrl?: string,
  preferredLanguage: SupportedLanguage = 'en'
): RankedRetrievalResult[] {
  if (!authorizedDocs.length || !question.trim()) return [];

  const compiledCorpus = authorizedDocs.map(parseKnowledgeDocument);
  const queryTokens = tokenizeAndStem(question);
  const synonymTokens = expandWithSynonyms(queryTokens);

  const routeTokens = currentUrl ? tokenizeAndStem(currentUrl.replace(/\//g, ' ')) : [];
  const effectiveQueryTokens = queryTokens.length > 0 ? queryTokens : routeTokens;

  const N = compiledCorpus.length;
  const docTokenSets: Map<string, string[]> = new Map();
  const dfMap: Map<string, number> = new Map();
  let totalDocLen = 0;

  for (const doc of compiledCorpus) {
    const transText = doc.translations?.es
      ? `${doc.translations.es.title} ${doc.translations.es.summary} ${doc.translations.es.content}`
      : '';
    const allTokens = tokenizeAndStem(
      `${doc.title} ${doc.headings.join(' ')} ${doc.rawContent} ${transText}`
    );
    docTokenSets.set(doc.id, allTokens);
    totalDocLen += allTokens.length;

    const unique = new Set(allTokens);
    for (const t of unique) {
      dfMap.set(t, (dfMap.get(t) || 0) + 1);
    }
  }

  const avgdl = N > 0 ? totalDocLen / N : 100;
  const k1 = 1.5;
  const b = 0.75;

  const results: RankedRetrievalResult[] = [];

  for (const doc of compiledCorpus) {
    const docTokens = docTokenSets.get(doc.id) || [];
    const dl = docTokens.length || 1;
    const tfMap = new Map<string, number>();
    for (const t of docTokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
    }

    const titleTokens = new Set(
      tokenizeAndStem(`${doc.title} ${doc.translations?.es?.title || ''}`)
    );
    const headingTokens = new Set(tokenizeAndStem(doc.headings.join(' ')));
    const intentTokens = new Set(
      tokenizeAndStem(`${doc.intents.join(' ')} ${doc.synonyms.join(' ')}`)
    );

    let bm25Score = 0;
    let fieldBoost = 0;
    const matchedTokens: string[] = [];
    const matchedSynonyms: string[] = [];

    for (const qToken of effectiveQueryTokens) {
      const tf = tfMap.get(qToken) || 0;
      const df = dfMap.get(qToken) || 0;

      if (tf > 0) {
        matchedTokens.push(qToken);
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const num = tf * (k1 + 1);
        const denom = tf + k1 * (1 - b + b * (dl / avgdl));
        bm25Score += idf * (num / denom);
      } else if (qToken.length >= 4) {
        const fuzzyHit = docTokens.some(
          (dt) => dt.length >= 4 && (dt.startsWith(qToken) || qToken.startsWith(dt))
        );
        if (fuzzyHit) {
          matchedTokens.push(qToken);
          bm25Score += 0.45;
        }
      }

      if (titleTokens.has(qToken)) fieldBoost += 1.8;
      if (intentTokens.has(qToken)) fieldBoost += 2.0;
      if (headingTokens.has(qToken)) fieldBoost += 1.1;
    }

    // Cross-language & synonym matching
    for (const synToken of synonymTokens) {
      if ((tfMap.get(synToken) || 0) > 0 || titleTokens.has(synToken)) {
        matchedSynonyms.push(synToken);
        fieldBoost += 0.75;
        if (titleTokens.has(synToken)) fieldBoost += 1.1;
      }
    }

    // Host Route Context Boost (ENGINE-01 §4)
    let routeBoostApplied = false;
    if (currentUrl && currentUrl !== '/dashboard' && currentUrl !== '/') {
      if (doc.route && currentUrl.startsWith(doc.route)) {
        routeBoostApplied = true;
        const isContextualPronoun =
          /\b(this|here|page|current|setting|settings|esto|aqui|aquí|pagina|página)\b/i.test(
            question
          );
        if (matchedTokens.length > 0 || matchedSynonyms.length > 0 || isContextualPronoun) {
          fieldBoost += 2.2;
        }
      }
    }

    // I18N-001 §14 Level 1 vs Level 2: Same-language preference boost when relevant
    const isSameLang =
      doc.language === preferredLanguage ||
      doc.translations?.[preferredLanguage]?.status === 'AVAILABLE';
    const retrievalMode: 'same-language' | 'cross-language' =
      doc.language === preferredLanguage ? 'same-language' : 'cross-language';

    if ((matchedTokens.length > 0 || matchedSynonyms.length > 0) && isSameLang) {
      fieldBoost += 0.65;
    }

    const rawScore = bm25Score + fieldBoost;

    let bestSection = doc.sections[0];
    let bestSecScore = -1;
    for (const sec of doc.sections) {
      const secText = `${sec.heading} ${sec.paragraphs.join(' ')} ${sec.steps.join(' ')} ${sec.bullets.join(' ')}`;
      const secTokens = new Set(tokenizeAndStem(secText));
      let sScore = 0;
      for (const qt of effectiveQueryTokens) {
        if (secTokens.has(qt)) sScore += 2;
      }
      for (const st of synonymTokens) {
        if (secTokens.has(st)) sScore += 0.9;
      }
      if (
        sec.steps.length > 0 &&
        /\b(how|step|configure|setup|enable|rotate|create|como|cómo|pasos|configurar|crear)\b/i.test(
          question
        )
      ) {
        sScore += 1.5;
      }
      if (sScore > bestSecScore) {
        bestSecScore = sScore;
        bestSection = sec;
      }
    }

    // Require meaningful lexical or cross-language concept overlap (rawScore >= 1.35)
    // so queries about restricted topics (e.g. KMS vault keys) do not match public docs on a single incidental word.
    const computedConf = Number(
      (rawScore / (Math.max(1, effectiveQueryTokens.length) * 1.6 + 1.2)).toFixed(2)
    );
    const normalizedConfidence =
      (matchedTokens.length === 0 && matchedSynonyms.length < 2 && !routeBoostApplied) ||
      rawScore < 1.35
        ? Math.min(0.2, computedConf)
        : Math.min(0.98, Math.max(0.26, computedConf));

    const rawLines = (doc.rawContent || '').split('\n');
    const headingIdx = rawLines.findIndex(
      (l) => l.replace(/^#+\s*/, '').trim() === bestSection.heading.trim()
    );
    const lineStart = headingIdx >= 0 ? headingIdx + 1 : 1;
    const sectionLineSpan = Math.max(
      6,
      bestSection.paragraphs.length * 3 +
        bestSection.steps.length * 2 +
        bestSection.bullets.length * 2
    );
    const lineEnd = Math.min(
      Math.max(lineStart + 4, rawLines.length),
      lineStart + sectionLineSpan
    );

    const normalizedBm25 = Number(
      Math.max(
        0.1,
        routeBoostApplied ? normalizedConfidence - 0.15 : normalizedConfidence
      ).toFixed(2)
    );
    const normalizedRouteBoost = routeBoostApplied ? 0.15 : 0;

    results.push({
      compiledDoc: doc,
      bestSection,
      score: Number(rawScore.toFixed(2)),
      bm25Score: normalizedBm25,
      routeBoost: normalizedRouteBoost,
      lineStart,
      lineEnd,
      normalizedConfidence,
      matchedTokens: Array.from(new Set(matchedTokens)),
      matchedSynonyms: Array.from(new Set(matchedSynonyms)).slice(0, 5),
      routeBoostApplied,
      retrievalMode,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
