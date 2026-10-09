// ============================================================================
// RENDER-001 & RENDER-021/022: Content Document & Chunk Boundary Normalizer
// Ensures retrieval chunk boundaries never corrupt document presentation or
// split inline formatting tokens (**important\nsecurity information**).
// ============================================================================

import { ContentDocumentAst, RENDERER_VERSION, TocEntry } from '../content.types';
import { blocksToPlainText } from './content-node';

/**
 * Reconstructs or normalizes chunked Markdown fragments so that split inline
 * markers or list sequences across retrieval boundaries are healed before parsing.
 * Enforces RENDER-021 and RENDER-022.
 */
export function normalizeChunkBoundaries(chunks: string[]): string {
  if (chunks.length === 0) return '';
  if (chunks.length === 1) return chunks[0];

  const merged: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const current = chunks[i];
    if (merged.length === 0) {
      merged.push(current);
      continue;
    }

    const prev = merged[merged.length - 1];
    // Check if previous chunk has unclosed bold (**), italic (*), or inline code (`)
    const unclosedBold = (prev.match(/\*\*/g) || []).length % 2 === 1;
    const unclosedCode = (prev.match(/`/g) || []).length % 2 === 1;

    if (unclosedBold || unclosedCode) {
      // Join with a single space/newline so inline span remains within the same paragraph block
      merged[merged.length - 1] = `${prev.trimEnd()} ${current.trimStart()}`;
    } else if (
      prev.trimEnd().endsWith(':') &&
      /^\s*([-*]|\d+\.)\s+/.test(current)
    ) {
      // Preserve paragraph-to-list relationship across chunk boundary
      merged[merged.length - 1] = `${prev.trimEnd()}\n\n${current.trimStart()}`;
    } else {
      merged.push(current.trim());
    }
  }

  return merged.join('\n\n');
}

export function buildContentDocumentAst(
  blocks: ContentDocumentAst['blocks'],
  frontmatter: Record<string, unknown> = {},
  sanitizationEvents: string[] = []
): ContentDocumentAst {
  const toc: TocEntry[] = [];
  for (const block of blocks) {
    if (block.type === 'heading') {
      toc.push({
        id: block.id,
        text: block.text,
        level: block.level,
      });
    }
  }

  return {
    rendererVersion: RENDERER_VERSION,
    frontmatter,
    blocks,
    toc,
    plainText: blocksToPlainText(blocks),
    sanitizationEvents,
  };
}
