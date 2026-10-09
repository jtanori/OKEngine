// ============================================================================
// RENDER-001 §9 & RENDER-TEST-001 (RENDER-004, RENDER-019): URL Policy Validator
// Allows http:, https:, mailto:, relative /, and # anchors.
// Blocks javascript:, data:, vbscript:, file:, and unknown executable schemes.
// ============================================================================

export interface UrlValidationResult {
  safe: boolean;
  normalizedUrl: string;
  isExternal: boolean;
  reason?: string;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function validateContentUrl(rawUrl: string): UrlValidationResult {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { safe: false, normalizedUrl: '', isExternal: false, reason: 'EMPTY_URL' };
  }

  // Normalize control characters and HTML entity encodings for protocol check
  const compact = trimmed.replace(/[\u0000-\u0020\s]+/g, '').toLowerCase();
  if (
    compact.startsWith('javascript:') ||
    compact.startsWith('data:') ||
    compact.startsWith('vbscript:') ||
    compact.startsWith('file:') ||
    compact.startsWith('blob:')
  ) {
    return {
      safe: false,
      normalizedUrl: '',
      isExternal: false,
      reason: `DANGEROUS_SCHEME:${compact.split(':')[0]}`,
    };
  }

  // Relative paths or hash anchors are internal and safe
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { safe: true, normalizedUrl: trimmed, isExternal: false };
  }
  if (trimmed.startsWith('#')) {
    return { safe: true, normalizedUrl: trimmed, isExternal: false };
  }

  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
      return {
        safe: false,
        normalizedUrl: '',
        isExternal: false,
        reason: `DISALLOWED_PROTOCOL:${parsed.protocol}`,
      };
    }
    return {
      safe: true,
      normalizedUrl: trimmed,
      isExternal: parsed.protocol === 'http:' || parsed.protocol === 'https:',
    };
  } catch {
    // Allow clean relative document paths like "security/authentication.md"
    if (/^[a-zA-Z0-9._/-]+(#[a-zA-Z0-9_-]+)?$/.test(trimmed) && !trimmed.includes('..')) {
      return { safe: true, normalizedUrl: trimmed, isExternal: false };
    }
    return { safe: false, normalizedUrl: '', isExternal: false, reason: 'INVALID_URL_FORMAT' };
  }
}
