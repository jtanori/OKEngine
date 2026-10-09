// ============================================================================
// ENGINE-01 §3 & I18N-001 §10–11: Machine-Readable Markdown, Frontmatter &
// Document Language Metadata Parser
// ============================================================================

import {
  KnowledgeDocument,
  DocumentNextStep,
  SupportedLanguage,
  DocumentTranslation,
} from '../../types';
import { detectTextLanguage } from '../../i18n/i18n.detector';

export interface KnowledgeSection {
  heading: string;
  level: number;
  paragraphs: string[];
  steps: string[];
  bullets: string[];
  warnings: string[];
  codeBlocks: { language: string; code: string }[];
}

export interface CompiledKnowledgeDocument {
  id: string;
  collectionId: string;
  workspaceId?: string;
  filename: string;
  title: string;
  summary: string;
  language: SupportedLanguage;
  languageConfidence: number;
  languageDetectionMethod: 'automatic' | 'explicit';
  translations?: Partial<Record<SupportedLanguage, DocumentTranslation>>;
  intents: string[];
  synonyms: string[];
  route?: string;
  nextStep?: DocumentNextStep;
  headings: string[];
  paragraphs: string[];
  steps: string[];
  bullets: string[];
  warnings: string[];
  codeBlocks: { language: string; code: string }[];
  sections: KnowledgeSection[];
  rawContent: string;
}

export function parseKnowledgeDocument(doc: KnowledgeDocument): CompiledKnowledgeDocument {
  let body = doc.content || '';
  let fmTitle = doc.title;
  let fmSummary = '';
  let fmLanguage: SupportedLanguage | undefined = doc.language;
  const intents: string[] = [];
  const synonyms: string[] = [];
  let route: string | undefined;
  let nextStep: DocumentNextStep | undefined = doc.nextStep;

  // 1. Parse optional YAML frontmatter block
  if (body.startsWith('---\n')) {
    const endIdx = body.indexOf('\n---\n', 4);
    if (endIdx !== -1) {
      const yamlBlock = body.slice(4, endIdx);
      body = body.slice(endIdx + 5);

      const lines = yamlBlock.split('\n');
      let currentListKey: 'intent' | 'synonyms' | null = null;
      let inNextStep = false;
      let nsLabel = '';
      let nsUrl = '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        if (line.startsWith('- ') && currentListKey) {
          const item = line.slice(2).trim().replace(/^['"]|['"]$/g, '');
          if (currentListKey === 'intent') intents.push(item);
          if (currentListKey === 'synonyms') synonyms.push(item);
          continue;
        }

        if (inNextStep && (rawLine.startsWith('  ') || rawLine.startsWith('\t'))) {
          if (line.startsWith('label:')) {
            nsLabel = line.slice(6).trim().replace(/^['"]|['"]$/g, '');
          } else if (line.startsWith('url:')) {
            nsUrl = line.slice(4).trim().replace(/^['"]|['"]$/g, '');
          }
          if (nsLabel && nsUrl) {
            nextStep = { label: nsLabel, url: nsUrl };
          }
          continue;
        }

        currentListKey = null;
        inNextStep = false;

        if (line.startsWith('title:')) {
          fmTitle = line.slice(6).trim().replace(/^['"]|['"]$/g, '') || fmTitle;
        } else if (line.startsWith('summary:')) {
          fmSummary = line.slice(8).trim().replace(/^>\s*/, '').replace(/^['"]|['"]$/g, '');
        } else if (line.startsWith('language:')) {
          const l = line.slice(9).trim().replace(/^['"]|['"]$/g, '');
          if (l === 'en' || l === 'es') fmLanguage = l;
        } else if (line.startsWith('route:')) {
          route = line.slice(6).trim().replace(/^['"]|['"]$/g, '');
        } else if (line.startsWith('intent:')) {
          currentListKey = 'intent';
        } else if (line.startsWith('synonyms:')) {
          currentListKey = 'synonyms';
        } else if (line.startsWith('next_step:')) {
          inNextStep = true;
        }
      }
    }
  }

  // 2. Infer default route from filename if not explicitly set
  const lowerFn = doc.filename.toLowerCase();
  if (!route) {
    if (lowerFn.includes('internal-operations') || lowerFn.includes('sso') || lowerFn.includes('access-control')) {
      route = '/settings/security/sso';
    } else if (lowerFn.includes('getting-started') || lowerFn.includes('quickstart')) {
      route = '/docs/getting-started';
    } else if (lowerFn.includes('workspace') || lowerFn.includes('billing') || lowerFn.includes('facturacion')) {
      route = '/billing/invoices';
    } else if (lowerFn.includes('embedding') || lowerFn.includes('troubleshooting')) {
      route = '/api/authentication';
    }
  }

  // 3. Detect document language automatically if not explicitly provided (I18N-001 §10–11)
  const detected = fmLanguage
    ? {
        language: fmLanguage,
        confidence: doc.languageConfidence ?? 0.99,
        method: doc.languageDetectionMethod ?? ('explicit' as const),
      }
    : detectTextLanguage(`${fmTitle} ${body}`);

  // 4. Parse Markdown AST
  const headings: string[] = [];
  const paragraphs: string[] = [];
  const steps: string[] = [];
  const bullets: string[] = [];
  const warnings: string[] = [];
  const codeBlocks: { language: string; code: string }[] = [];
  const sections: KnowledgeSection[] = [];

  let currentSection: KnowledgeSection = {
    heading: fmTitle,
    level: 1,
    paragraphs: [],
    steps: [],
    bullets: [],
    warnings: [],
    codeBlocks: [],
  };
  sections.push(currentSection);

  const rawLines = body.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim() || 'text';
        codeLines = [];
      } else {
        inCodeBlock = false;
        const block = { language: codeLang, code: codeLines.join('\n') };
        codeBlocks.push(block);
        currentSection.codeBlocks.push(block);
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      headings.push(text);
      currentSection = {
        heading: text,
        level,
        paragraphs: [],
        steps: [],
        bullets: [],
        warnings: [],
        codeBlocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    const stepMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (stepMatch) {
      const stepText = stepMatch[1].trim();
      steps.push(stepText);
      currentSection.steps.push(stepText);
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const bulletText = bulletMatch[1].trim();
      bullets.push(bulletText);
      currentSection.bullets.push(bulletText);
      continue;
    }

    if (trimmed.startsWith('>')) {
      const warnText = trimmed.replace(/^>\s*/, '').trim();
      if (warnText) {
        warnings.push(warnText);
        currentSection.warnings.push(warnText);
      }
      continue;
    }

    paragraphs.push(trimmed);
    currentSection.paragraphs.push(trimmed);
  }

  const resolvedSummary =
    fmSummary ||
    paragraphs.find((p) => !p.startsWith('*Visibility:') && !p.startsWith('*Last updated:')) ||
    paragraphs[0] ||
    fmTitle;

  return {
    id: doc.id,
    collectionId: doc.collectionId,
    workspaceId: doc.workspaceId,
    filename: doc.filename,
    title: fmTitle,
    summary: resolvedSummary,
    language: detected.language,
    languageConfidence: detected.confidence,
    languageDetectionMethod: detected.method,
    translations: doc.translations,
    intents,
    synonyms,
    route,
    nextStep,
    headings,
    paragraphs,
    steps,
    bullets,
    warnings,
    codeBlocks,
    sections,
    rawContent: doc.content,
  };
}
