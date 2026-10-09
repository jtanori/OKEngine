// ============================================================================
// RENDER-001 §20–21 & RENDER-014: External Media Provider Allowlist Policy
// Allows youtube.com, youtu.be, vimeo.com, or safe internal media files.
// Blocks arbitrary iframe embeds and untrusted external hosts.
// ============================================================================

import { validateContentUrl } from './url-policy';

export interface MediaValidationResult {
  safe: boolean;
  provider: 'youtube' | 'vimeo' | 'audio' | 'video' | 'unsupported';
  normalizedSrc: string;
  reason?: string;
}

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

export function validateMediaSource(rawUrl: string): MediaValidationResult {
  const urlCheck = validateContentUrl(rawUrl);
  if (!urlCheck.safe) {
    return {
      safe: false,
      provider: 'unsupported',
      normalizedSrc: '',
      reason: urlCheck.reason || 'UNSAFE_MEDIA_URL',
    };
  }

  const trimmed = urlCheck.normalizedUrl;

  if (trimmed.startsWith('/')) {
    if (/\.(mp4|webm)(\?.*)?$/i.test(trimmed)) {
      return { safe: true, provider: 'video', normalizedSrc: trimmed };
    }
    if (/\.(mp3|wav|ogg)(\?.*)?$/i.test(trimmed)) {
      return { safe: true, provider: 'audio', normalizedSrc: trimmed };
    }
    return {
      safe: false,
      provider: 'unsupported',
      normalizedSrc: '',
      reason: 'UNSUPPORTED_LOCAL_MEDIA_EXTENSION',
    };
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (YOUTUBE_HOSTS.has(host)) {
      return { safe: true, provider: 'youtube', normalizedSrc: trimmed };
    }
    if (VIMEO_HOSTS.has(host)) {
      return { safe: true, provider: 'vimeo', normalizedSrc: trimmed };
    }

    return {
      safe: false,
      provider: 'unsupported',
      normalizedSrc: '',
      reason: `UNAPPROVED_MEDIA_PROVIDER:${host}`,
    };
  } catch {
    return {
      safe: false,
      provider: 'unsupported',
      normalizedSrc: '',
      reason: 'INVALID_MEDIA_URL',
    };
  }
}
