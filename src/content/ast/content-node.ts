// ============================================================================
// RENDER-001: Block Node Utilities, Heading Slugifier & Plain-Text Extraction
// ============================================================================

import { ContentBlockNode, ListItemNode } from '../content.types';
import { inlineNodesToPlainText } from './inline-node';

/**
 * Generates a deterministic, URL-safe anchor slug for headings.
 * Tracks seen slugs to guarantee unique IDs (#security, #security-1) per RENDER-044.
 */
export function generateDeterministicHeadingId(
  text: string,
  seenCounts: Map<string, number>
): string {
  const baseSlug =
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Strip diacritics for clean anchor URLs while keeping text intact
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'section';

  const count = seenCounts.get(baseSlug) ?? 0;
  seenCounts.set(baseSlug, count + 1);
  return count === 0 ? baseSlug : `${baseSlug}-${count}`;
}

function listItemsToPlainText(items: ListItemNode[], ordered = false, depth = 0): string {
  const indent = '  '.repeat(depth);
  return items
    .map((item, idx) => {
      const prefix =
        typeof item.checked === 'boolean'
          ? item.checked
            ? '[x] '
            : '[ ] '
          : ordered
            ? `${idx + 1}. `
            : '• ';
      const mainText = `${indent}${prefix}${inlineNodesToPlainText(item.children)}`;
      const nestedText =
        item.nestedLists && item.nestedLists.length > 0
          ? '\n' +
            item.nestedLists
              .map((nl) =>
                listItemsToPlainText(nl.items, nl.type === 'ordered_list', depth + 1)
              )
              .join('\n')
          : '';
      return mainText + nestedText;
    })
    .join('\n');
}

/**
 * Converts a normalized block AST into clean semantic plain text for the Copy action
 * without leaking UI chrome ("3 chunks • Updated..."). Enforces RENDER-029.
 */
export function blocksToPlainText(blocks: ContentBlockNode[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return block.text;
        case 'paragraph':
          return inlineNodesToPlainText(block.children);
        case 'blockquote':
          return blocksToPlainText(block.blocks)
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n');
        case 'unordered_list':
        case 'task_list':
          return listItemsToPlainText(block.items, false, 0);
        case 'ordered_list':
          return listItemsToPlainText(block.items, true, 0);
        case 'code_block':
          return block.code;
        case 'horizontal_rule':
          return '---';
        case 'table': {
          const headerLine = block.headers
            .map((h) => inlineNodesToPlainText(h.children))
            .join(' | ');
          const rowLines = block.rows.map((row) =>
            row.map((cell) => inlineNodesToPlainText(cell.children)).join(' | ')
          );
          return [headerLine, ...rowLines].join('\n');
        }
        case 'image':
          return block.alt ? `[Image: ${block.alt}]` : '';
        case 'media':
          return block.title ? `[Media: ${block.title}]` : '';
        case 'html_block':
          return block.sanitizedText;
      }
    })
    .filter(Boolean)
    .join('\n\n');
}
