// ============================================================================
// RENDER-001: Inline Node Utilities & Plain-Text Extraction
// ============================================================================

import { InlineNode } from '../content.types';

/**
 * Extracts clean semantic text from inline AST nodes without Markdown syntax.
 */
export function inlineNodesToPlainText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'inline_code':
          return node.value;
        case 'bold':
        case 'italic':
        case 'bold_italic':
        case 'strikethrough':
        case 'link':
          return inlineNodesToPlainText(node.children);
        case 'image':
          return node.alt || '';
        case 'hard_break':
          return '\n';
        case 'soft_break':
          return ' ';
      }
    })
    .join('');
}
