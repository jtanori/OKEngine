// ============================================================================
// SECURITY-001 & RENDER-001 §9/§19: Universal Form & Input Security Layer
// Enforces strict XSS/script/protocol sanitization and field-level validation
// across all public, authentication, workspace, and embedded surfaces.
// ============================================================================

import { validateContentUrl } from '../content/sanitizer/url-policy';

export interface FieldValidationResult {
  valid: boolean;
  sanitizedValue: string;
  sanitized?: string;
  errorKey?: string;
  errorMessage?: string;
  error?: string | null;
}

export interface LegacyCompatValidationResult extends FieldValidationResult {
  sanitized: string;
  error: string | null;
}

const UNSAFE_PAYLOAD_REGEX =
  /<\s*\/?\s*(script|iframe|object|embed|svg|style|link|meta|base|applet|form)\b|\bon[a-z]+\s*=|(?:javascript|vbscript|data)\s*:/i;

const HTML_TAG_DETECT_REGEX = /<\/?[a-zA-Z][^>]*>/;

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

const EMAIL_FORMAT_REGEX = /^[^\s@<>()[\]\\.,;:"']+(\.[^\s@<>()[\]\\.,;:"']+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;

const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;

const SAFE_ROUTE_PATH_REGEX = /^\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*$/;

const SAFE_CSS_DIMENSION_REGEX = /^\d{1,4}(px|rem|em|%|vw)$/;

/**
 * Checks whether a string contains XSS payloads, script tags, inline event handlers,
 * or executable URI schemes (javascript:, data:, vbscript:).
 */
export function containsUnsafePayload(raw: string): boolean {
  if (!raw) return false;
  const compact = raw.replace(/[\u0000-\u0020]+/g, ' ');
  return UNSAFE_PAYLOAD_REGEX.test(compact) || HTML_TAG_DETECT_REGEX.test(compact);
}

/**
 * Checks whether Markdown body content contains dangerous executable HTML/scripts
 * while allowing legitimate Markdown prose and code blocks.
 */
export function containsUnsafeMarkdownScript(raw: string): boolean {
  if (!raw) return false;
  return /<\s*\/?\s*(script|iframe|object|embed|applet)\b|\bon[a-z]+\s*=|javascript\s*:/i.test(
    raw
  );
}

/**
 * Strips non-printable control characters and neutralizes dangerous HTML/script fragments.
 */
export function sanitizePlainText(raw: string, maxLength = 2000): string {
  if (!raw) return '';
  return raw
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:javascript|vbscript|data)\s*:/gi, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes general plain-text inputs (names, titles, descriptions, messages, queries).
 */
export function validatePlainText(
  raw: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    fieldLabel?: string;
  } = {}
): LegacyCompatValidationResult {
  const { required = true, minLength = 1, maxLength = 2000, fieldLabel = 'This field' } = options;
  const cleanedControl = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!cleanedControl) {
    if (required) {
      const errorMessage = `${fieldLabel} is required.`;
      return {
        valid: false,
        sanitizedValue: '',
        sanitized: '',
        errorKey: 'validation.required',
        errorMessage,
        error: errorMessage,
      };
    }
    return { valid: true, sanitizedValue: '', sanitized: '', error: null };
  }

  if (containsUnsafePayload(cleanedControl)) {
    const sanitized = sanitizePlainText(cleanedControl, maxLength);
    const errorMessage =
      'HTML tags, scripts, and executable protocols (javascript:/data:) are not allowed.';
    return {
      valid: false,
      sanitizedValue: sanitized,
      sanitized,
      errorKey: 'validation.unsafe_input',
      errorMessage,
      error: errorMessage,
    };
  }

  if (cleanedControl.length < minLength) {
    const errorMessage = `${fieldLabel} must be at least ${minLength} characters.`;
    return {
      valid: false,
      sanitizedValue: cleanedControl,
      sanitized: cleanedControl,
      errorKey: 'validation.too_short',
      errorMessage,
      error: errorMessage,
    };
  }

  if (cleanedControl.length > maxLength) {
    const sliced = cleanedControl.slice(0, maxLength);
    const errorMessage = `${fieldLabel} cannot exceed ${maxLength} characters.`;
    return {
      valid: false,
      sanitizedValue: sliced,
      sanitized: sliced,
      errorKey: 'validation.too_long',
      errorMessage,
      error: errorMessage,
    };
  }

  return {
    valid: true,
    sanitizedValue: cleanedControl,
    sanitized: cleanedControl,
    error: null,
  };
}

/**
 * Validates and normalizes an email address.
 */
export function validateEmailInput(raw: string): FieldValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim().toLowerCase();

  if (!trimmed) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.email_required',
      errorMessage: 'Email address is required.',
    };
  }

  if (containsUnsafePayload(trimmed)) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.unsafe_input',
      errorMessage: 'Invalid characters or script payload detected in email address.',
    };
  }

  if (trimmed.length > 254 || !EMAIL_FORMAT_REGEX.test(trimmed)) {
    return {
      valid: false,
      sanitizedValue: trimmed,
      errorKey: 'validation.email_invalid',
      errorMessage: 'Enter a valid corporate or personal email address (e.g., you@company.com).',
    };
  }

  return {
    valid: true,
    sanitizedValue: trimmed,
  };
}

/**
 * Validates password inputs for login or signup flows.
 */
export function validatePasswordInput(
  raw: string,
  mode: 'login' | 'signup'
): FieldValidationResult {
  const val = raw || '';

  if (!val.trim()) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.password_required',
      errorMessage: 'Password is required.',
    };
  }

  if (containsUnsafePayload(val)) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.unsafe_input',
      errorMessage: 'Password contains disallowed HTML or script tags.',
    };
  }

  const minLen = mode === 'signup' ? 8 : 6;
  if (val.length < minLen) {
    return {
      valid: false,
      sanitizedValue: val,
      errorKey: 'validation.password_short',
      errorMessage:
        mode === 'signup'
          ? 'Password must be at least 8 characters long.'
          : 'Password must be at least 6 characters long.',
    };
  }

  if (val.length > 128) {
    return {
      valid: false,
      sanitizedValue: val.slice(0, 128),
      errorKey: 'validation.too_long',
      errorMessage: 'Password cannot exceed 128 characters.',
    };
  }

  return {
    valid: true,
    sanitizedValue: val,
  };
}

/**
 * Validates and normalizes a document filename (.md, .txt, .json, .csv),
 * blocking path traversal (..) and directory slashes.
 */
export function validateFilenameInput(raw: string): FieldValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!trimmed) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.filename_required',
      errorMessage: 'Document filename is required (e.g., getting-started.md).',
    };
  }

  if (
    containsUnsafePayload(trimmed) ||
    trimmed.includes('..') ||
    trimmed.includes('/') ||
    trimmed.includes('\\')
  ) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.filename_invalid',
      errorMessage:
        'Filename cannot contain path traversal (..), slashes (/), or HTML/script characters.',
    };
  }

  const normalized = /\.(md|txt|json|csv)$/i.test(trimmed) ? trimmed : `${trimmed}.md`;

  if (!SAFE_FILENAME_REGEX.test(normalized)) {
    return {
      valid: false,
      sanitizedValue: normalized,
      errorKey: 'validation.filename_invalid',
      errorMessage:
        'Use only letters, numbers, hyphens, underscores, and a .md or .txt extension.',
    };
  }

  return {
    valid: true,
    sanitizedValue: normalized,
  };
}

/**
 * Validates Next-Step CTA URLs and external links using the canonical URL Policy Validator.
 * Strictly blocks javascript:, data:, vbscript:, file:, and blob: schemes.
 */
export function validateActionUrlInput(
  raw: string,
  required = false
): FieldValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!trimmed) {
    if (required) {
      return {
        valid: false,
        sanitizedValue: '',
        errorKey: 'validation.url_required',
        errorMessage: 'Target URL or host path is required when a CTA label is specified.',
      };
    }
    return { valid: true, sanitizedValue: '' };
  }

  if (containsUnsafePayload(trimmed)) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.url_unsafe',
      errorMessage:
        'Blocked unsafe URL scheme. Only https://, http://, mailto:, or relative /paths are allowed.',
    };
  }

  const check = validateContentUrl(trimmed);
  if (!check.safe) {
    return {
      valid: false,
      sanitizedValue: '',
      errorKey: 'validation.url_unsafe',
      errorMessage:
        'Invalid or disallowed URL. Use a relative host path (e.g., /settings/sso) or https:// URL.',
    };
  }

  return {
    valid: true,
    sanitizedValue: check.normalizedUrl,
  };
}

/**
 * Validates a simulated host route path (must start with `/` and contain no `..` or script schemes).
 */
export function validateRoutePathInput(raw: string): LegacyCompatValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!trimmed) {
    const errorMessage = 'Route path is required and must start with / (e.g., /settings/security/sso).';
    return {
      valid: false,
      sanitizedValue: '/',
      sanitized: '/',
      errorKey: 'validation.route_invalid',
      errorMessage,
      error: errorMessage,
    };
  }

  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('..') ||
    containsUnsafePayload(trimmed) ||
    !SAFE_ROUTE_PATH_REGEX.test(trimmed)
  ) {
    const errorMessage =
      'Route must be a clean relative path starting with / (no //, .., or script tokens).';
    return {
      valid: false,
      sanitizedValue: trimmed,
      sanitized: trimmed,
      errorKey: 'validation.route_invalid',
      errorMessage,
      error: errorMessage,
    };
  }

  return {
    valid: true,
    sanitizedValue: trimmed,
    sanitized: trimmed,
    error: null,
  };
}

/**
 * Validates a CSS dimension token (e.g. 420px, 28rem, 100%, 40vw) to prevent CSS injection.
 */
export function validateCssWidthToken(raw: string): LegacyCompatValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!trimmed || !SAFE_CSS_DIMENSION_REGEX.test(trimmed)) {
    const errorMessage = 'Enter a valid CSS width unit (e.g., 380px, 420px, 28rem, or 100%).';
    return {
      valid: false,
      sanitizedValue: '420px',
      sanitized: '420px',
      errorKey: 'validation.css_width_invalid',
      errorMessage,
      error: errorMessage,
    };
  }

  return {
    valid: true,
    sanitizedValue: trimmed,
    sanitized: trimmed,
    error: null,
  };
}

/**
 * Generates a clean lowercase .md filename slug from a human-readable document title.
 * Non-bidirectional helper used for new documents or explicit on-demand generation.
 */
export function generateFilenameFromTitle(title: string): string {
  const cleaned = (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned ? `${cleaned}.md` : 'untitled-document.md';
}

export interface InternalRouteSuggestion {
  path: string;
  label: string;
  category: 'Public' | 'Documentation' | 'Legal' | 'Workspace';
}

export const CANONICAL_INTERNAL_ROUTES: InternalRouteSuggestion[] = [
  { path: '/', label: 'Public Home', category: 'Public' },
  { path: '/about', label: 'About OKEng', category: 'Public' },
  { path: '/contact', label: 'Contact & Support', category: 'Public' },
  { path: '/docs', label: 'Documentation Index', category: 'Documentation' },
  { path: '/docs/getting-started', label: 'Quickstart & Setup Guide', category: 'Documentation' },
  { path: '/docs/access-control', label: 'Access Control & Clearance Mapping', category: 'Documentation' },
  { path: '/docs/embedding-guide', label: 'Embed Integration Guide', category: 'Documentation' },
  { path: '/docs/security-architecture', label: 'Security Architecture', category: 'Documentation' },
  { path: '/terms', label: 'Terms of Service', category: 'Legal' },
  { path: '/privacy', label: 'Privacy Policy', category: 'Legal' },
  { path: '/acceptable-use', label: 'Acceptable Use Policy', category: 'Legal' },
  { path: '/workspaces/okeng/collections', label: 'Workspace Collections', category: 'Workspace' },
  { path: '/workspaces/okeng/files', label: 'Workspace Files Directory', category: 'Workspace' },
  { path: '/workspaces/okeng/embeds', label: 'Embed Configuration Studio', category: 'Workspace' },
  { path: '/workspaces/okeng/test', label: 'Retrieval Test Console', category: 'Workspace' },
  { path: '/workspaces/okeng/settings', label: 'Workspace Settings & Auth', category: 'Workspace' },
];

export type CtaTargetKind =
  | 'Empty'
  | 'InternalRoute'
  | 'HTTPS'
  | 'Mailto'
  | 'Tel'
  | 'Blocked';

export interface CtaTargetValidationResult extends FieldValidationResult {
  kind: CtaTargetKind;
  protocolLabel: string;
}

const EXTENSIBLE_SAFE_PROTOCOLS: Record<string, { kind: CtaTargetKind; label: string }> = {
  'https:': { kind: 'HTTPS', label: 'Verified HTTPS URL' },
  'mailto:': { kind: 'Mailto', label: 'Verified Mailto Address' },
  'tel:': { kind: 'Tel', label: 'Verified Telephone Link' },
};

/**
 * Extensible internal CTA target validator classifying InternalRoute (/), HTTPS, Mailto, Tel, and Blocked schemes.
 */
export function validateCtaTarget(
  raw: string,
  required = false
): CtaTargetValidationResult {
  const trimmed = (raw || '').replace(CONTROL_CHARS_REGEX, '').trim();

  if (!trimmed) {
    if (required) {
      return {
        valid: false,
        sanitizedValue: '',
        kind: 'Empty',
        protocolLabel: 'Required',
        errorKey: 'validation.url_required',
        errorMessage: 'Target route or URL is required when a CTA label is specified.',
      };
    }
    return {
      valid: true,
      sanitizedValue: '',
      kind: 'Empty',
      protocolLabel: 'No target set',
    };
  }

  if (containsUnsafePayload(trimmed)) {
    return {
      valid: false,
      sanitizedValue: '',
      kind: 'Blocked',
      protocolLabel: 'Blocked Unsafe Payload',
      errorKey: 'validation.url_unsafe',
      errorMessage:
        'Blocked executable script or unsafe URI scheme. Use /path, https://, mailto:, or tel:.',
    };
  }

  // 1. Internal Route starting with /
  if (trimmed.startsWith('/')) {
    const routeCheck = validateRoutePathInput(trimmed);
    if (!routeCheck.valid) {
      return {
        ...routeCheck,
        kind: 'Blocked',
        protocolLabel: 'Invalid Internal Route',
      };
    }
    return {
      valid: true,
      sanitizedValue: routeCheck.sanitizedValue,
      kind: 'InternalRoute',
      protocolLabel: 'Internal Route (/)',
    };
  }

  // 2. Protocol-based URL classification
  try {
    const parsed = new URL(trimmed);
    const proto = parsed.protocol.toLowerCase();
    const spec = EXTENSIBLE_SAFE_PROTOCOLS[proto];

    if (!spec) {
      return {
        valid: false,
        sanitizedValue: trimmed,
        kind: 'Blocked',
        protocolLabel: `Blocked Scheme (${proto})`,
        errorKey: 'validation.url_unsafe',
        errorMessage:
          proto === 'http:'
            ? 'Insecure http:// is not allowed for CTAs. Use https:// or an internal /path.'
            : `Unsupported or unsafe protocol "${proto}". Allowed: /path, https://, mailto:, tel:.`,
      };
    }

    if (proto === 'mailto:') {
      const emailPart = parsed.pathname.trim();
      if (!emailPart || !EMAIL_FORMAT_REGEX.test(emailPart)) {
        return {
          valid: false,
          sanitizedValue: trimmed,
          kind: 'Blocked',
          protocolLabel: 'Invalid Mailto Address',
          errorKey: 'validation.email_invalid',
          errorMessage: 'Enter a valid email address after mailto: (e.g., mailto:support@okeng.io).',
        };
      }
    }

    if (proto === 'tel:') {
      const phonePart = parsed.pathname.trim();
      if (!phonePart || !/^[+0-9()-.\s]{5,28}$/.test(phonePart)) {
        return {
          valid: false,
          sanitizedValue: trimmed,
          kind: 'Blocked',
          protocolLabel: 'Invalid Tel Number',
          errorKey: 'validation.url_unsafe',
          errorMessage: 'Enter a valid phone number after tel: (e.g., tel:+18005550199).',
        };
      }
    }

    return {
      valid: true,
      sanitizedValue: trimmed,
      kind: spec.kind,
      protocolLabel: spec.label,
    };
  } catch {
    return {
      valid: false,
      sanitizedValue: trimmed,
      kind: 'Blocked',
      protocolLabel: 'Invalid Target Format',
      errorKey: 'validation.url_unsafe',
      errorMessage:
        'Start internal routes with / (e.g., /docs/getting-started) or specify https://, mailto:, or tel:.',
    };
  }
}

