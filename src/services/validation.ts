// ============================================================================
// OKEng Canonical Input Validation, XSS Sanitization & File Safety Service
// Implements ENG-DOD-001: SECURITY-002, SECURITY-003, SECURITY-008, STORAGE-001
// ============================================================================

export const VALIDATION_LIMITS = {
  MAX_CHAT_QUESTION_LENGTH: 2000,
  MAX_COLLECTION_NAME_LENGTH: 120,
  MAX_DOCUMENT_TITLE_LENGTH: 200,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  ALLOWED_EXTENSIONS: ['.md', '.txt', '.pdf', '.docx'],
};

const DANGEROUS_URL_SCHEMES = /^\s*(javascript|data|vbscript|file):/i;
const PATH_TRAVERSAL_PATTERN = /(\.\.[/\\]|[/\\]\.\.|^\.\.$|\0)/;
const SCRIPT_TAG_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const DANGEROUS_TAG_PATTERN = /<\/?(script|iframe|object|embed|applet|meta|base)\b[^>]*>/gi;
const EVENT_HANDLER_ATTR_PATTERN = /\son[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * SECURITY-003 & SECURITY-002: Validate and sanitize URLs (including CTA URLs and Markdown links).
 * Rejects javascript:, data:, vbscript:, and file: schemes.
 */
export function validateSafeUrl(url: string | undefined | null): ValidationResult {
  if (!url) return { valid: true, sanitized: '' };
  const trimmed = url.trim();
  if (DANGEROUS_URL_SCHEMES.test(trimmed)) {
    return {
      valid: false,
      error: 'DANGEROUS_URL_SCHEME_REJECTED',
    };
  }
  if (!trimmed.startsWith('/') && !trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
    return {
      valid: false,
      error: 'INVALID_URL_FORMAT',
    };
  }
  return { valid: true, sanitized: trimmed };
}

/**
 * SECURITY-003: Sanitize Markdown / user-controlled text against XSS payloads
 * (<script>, <img onerror=...>, javascript: links, SVG script injection).
 */
export function sanitizeMarkdownContent(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(SCRIPT_TAG_PATTERN, '')
    .replace(DANGEROUS_TAG_PATTERN, '')
    .replace(EVENT_HANDLER_ATTR_PATTERN, '')
    .replace(/\[([^\]]*)\]\(\s*(javascript|data|vbscript):[^)]*\)/gi, '[$1](#blocked-unsafe-url)');
}

/**
 * SECURITY-003: Detect if raw input contains active XSS / script injection payloads
 * for strict API boundary rejection when required.
 */
export function containsXssPayload(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return (
    /<script\b/i.test(input) ||
    /\son(error|load|click|mouseover|focus)\s*=/i.test(input) ||
    /javascript:/i.test(input) ||
    /<svg\b[^>]*>[\s\S]*?<script/i.test(input)
  );
}

/**
 * STORAGE-001 & TEST-005: Validate and normalize filenames against path traversal
 * (e.g., ../../etc/passwd, ..\windows\system32, null bytes, or disallowed extensions).
 */
export function validateSafeFilename(filename: string): ValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'EMPTY_FILENAME' };
  }
  const trimmed = filename.trim();
  if (
    PATH_TRAVERSAL_PATTERN.test(trimmed) ||
    trimmed.includes('/') ||
    trimmed.includes('\\') ||
    trimmed.startsWith('.')
  ) {
    return { valid: false, error: 'PATH_TRAVERSAL_REJECTED' };
  }

  const lower = trimmed.toLowerCase();
  const hasAllowedExt = VALIDATION_LIMITS.ALLOWED_EXTENSIONS.some((ext) =>
    lower.endsWith(ext)
  );
  if (!hasAllowedExt) {
    return { valid: false, error: 'UNSUPPORTED_FILE_EXTENSION' };
  }

  const normalized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '-');
  return { valid: true, sanitized: normalized };
}

/**
 * SECURITY-002 & SECURITY-008: Validate chat question bounds and non-empty payload.
 */
export function validateChatQuestion(question: unknown): ValidationResult {
  if (typeof question !== 'string' || !question.trim()) {
    return { valid: false, error: 'QUESTION_REQUIRED' };
  }
  if (question.length > VALIDATION_LIMITS.MAX_CHAT_QUESTION_LENGTH) {
    return { valid: false, error: 'QUESTION_EXCEEDS_MAX_LENGTH' };
  }
  return {
    valid: true,
    sanitized: sanitizeMarkdownContent(question.trim()),
  };
}
