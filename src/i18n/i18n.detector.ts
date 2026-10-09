// ============================================================================
// I18N-001 §7, §10 & §11: Deterministic Query & Document Language Detector
// Detects 'en' vs 'es' from lexical, diacritic, and interrogative markers.
// ============================================================================

import { SupportedLanguage } from '../types';

const SPANISH_MARKERS = new Set([
  'como',
  'cómo',
  'donde',
  'dónde',
  'que',
  'qué',
  'cual',
  'cuál',
  'cuales',
  'por',
  'para',
  'puedo',
  'puede',
  'configurar',
  'configuro',
  'invitar',
  'invito',
  'miembros',
  'miembro',
  'equipo',
  'facturacion',
  'facturación',
  'planes',
  'seguridad',
  'acceso',
  'permisos',
  'documentacion',
  'documentación',
  'archivos',
  'coleccion',
  'colección',
  'colecciones',
  'claves',
  'rotan',
  'rotacion',
  'rotación',
  'ajustes',
  'usuarios',
  'usuario',
  'disponible',
  'informacion',
  'información',
  'pasos',
  'español',
  'espanol',
  'el',
  'la',
  'los',
  'las',
  'del',
  'una',
  'con',
  'sin',
]);

const ENGLISH_MARKERS = new Set([
  'how',
  'where',
  'what',
  'when',
  'why',
  'who',
  'which',
  'can',
  'does',
  'do',
  'is',
  'are',
  'the',
  'and',
  'with',
  'from',
  'for',
  'configure',
  'invite',
  'team',
  'members',
  'settings',
  'security',
  'access',
  'collection',
  'collections',
  'document',
  'documents',
  'keys',
  'rotated',
  'billing',
  'workspace',
  'steps',
  'started',
]);

export interface DetectedLanguageResult {
  language: SupportedLanguage;
  confidence: number;
  method: 'automatic' | 'explicit';
}

export function detectTextLanguage(text: string): DetectedLanguageResult {
  if (!text || !text.trim()) {
    return { language: 'en', confidence: 0.5, method: 'automatic' };
  }

  const trimmed = text.trim();
  let esScore = 0;
  let enScore = 0;

  // Inverted punctuation or Spanish diacritics are strong indicators
  if (/[¿¡ñÑáéíóúÁÉÍÓÚ]/.test(trimmed)) {
    esScore += 3.5;
  }

  const words = trimmed
    .toLowerCase()
    .replace(/[^\w\sáéíóúñü]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  for (const w of words) {
    if (SPANISH_MARKERS.has(w)) esScore += 1.5;
    if (ENGLISH_MARKERS.has(w)) enScore += 1.5;
  }

  if (esScore > enScore && esScore >= 1.5) {
    const confidence = Math.min(0.99, Number((0.75 + esScore / (esScore + enScore + 2) * 0.24).toFixed(2)));
    return { language: 'es', confidence, method: 'automatic' };
  }

  const confidence = Math.min(0.99, Number((0.78 + enScore / (esScore + enScore + 2) * 0.2).toFixed(2)));
  return { language: 'en', confidence, method: 'automatic' };
}
