// ============================================================================
// RENDER-001 §19, §51 & RENDER-TEST-001 (RENDER-017, RENDER-018, RENDER-025):
// Canonical Content AST & Raw HTML Sanitizer
// Neutralizes <script>, <iframe>, <object>, <embed>, SVG scripts, event handlers,
// and dangerous URLs across all blocks, inline nodes, and citation excerpts.
// ============================================================================

import {
  ContentBlockNode,
  ContentDocumentAst,
  InlineNode,
  ListItemNode,
} from '../content.types';
import { validateContentUrl } from './url-policy';
import { validateMediaSource } from './media-policy';
import { blocksToPlainText } from '../ast/content-node';

const DANGEROUS_TAG_REGEX =
  /<\s*(script|iframe|object|embed|style|link|meta|base|form|input|button|textarea|applet|svg)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_SELF_CLOSING_REGEX =
  /<\s*(script|iframe|object|embed|link|meta|base|input|img|svg|video|audio|source|body|marquee)[^>]*\/?>/gi;
const EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

export function sanitizeRawHtmlFragment(
  raw: string,
  events: string[]
): { sanitizedText: string; hadDangerousHtml: boolean } {
  let working = raw;
  let hadDangerousHtml = false;

  if (DANGEROUS_TAG_REGEX.test(working)) {
    hadDangerousHtml = true;
    events.push('STRIPPED_DANGEROUS_CONTAINER_TAG');
    working = working.replace(DANGEROUS_TAG_REGEX, '');
  }

  if (EVENT_HANDLER_REGEX.test(working)) {
    hadDangerousHtml = true;
    events.push('STRIPPED_INLINE_EVENT_HANDLER');
    working = working.replace(EVENT_HANDLER_REGEX, '');
  }

  if (DANGEROUS_SELF_CLOSING_REGEX.test(working)) {
    hadDangerousHtml = true;
    events.push('STRIPPED_DANGEROUS_VOID_TAG');
    working = working.replace(DANGEROUS_SELF_CLOSING_REGEX, '');
  }

  // Strip remaining HTML tags while preserving safe inner text (e.g., <div>Safe text</div> -> Safe text)
  const stripped = working.replace(/<\/?[a-zA-Z][^>]*>/g, '').trim();
  return { sanitizedText: stripped, hadDangerousHtml };
}

function sanitizeInlineNodes(nodes: InlineNode[], events: string[]): InlineNode[] {
  const result: InlineNode[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case 'text': {
        if (/<[a-zA-Z!/]/.test(node.value)) {
          const { sanitizedText } = sanitizeRawHtmlFragment(node.value, events);
          if (sanitizedText) {
            result.push({ type: 'text', value: sanitizedText });
          }
        } else {
          result.push(node);
        }
        break;
      }
      case 'inline_code': {
        // Inline code is never executed as HTML, keep literal text
        result.push(node);
        break;
      }
      case 'bold':
      case 'italic':
      case 'bold_italic':
      case 'strikethrough': {
        const cleanChildren = sanitizeInlineNodes(node.children, events);
        if (cleanChildren.length > 0) {
          result.push({ ...node, children: cleanChildren });
        }
        break;
      }
      case 'link': {
        const cleanChildren = sanitizeInlineNodes(node.children, events);
        const urlCheck = validateContentUrl(node.href);
        if (!urlCheck.safe) {
          events.push(`NEUTRALIZED_UNSAFE_LINK:${urlCheck.reason || node.href}`);
          // Convert dangerous link into harmless plain text children (RENDER-004, RENDER-018)
          result.push(...cleanChildren);
        } else {
          result.push({
            type: 'link',
            href: urlCheck.normalizedUrl,
            title: node.title,
            isExternal: urlCheck.isExternal,
            children: cleanChildren,
          });
        }
        break;
      }
      case 'image': {
        const urlCheck = validateContentUrl(node.src);
        const safeAlt = (node.alt || '').trim() || 'Document illustration';
        if (!urlCheck.safe) {
          events.push(`BLOCKED_UNSAFE_INLINE_IMAGE:${urlCheck.reason || node.src}`);
          result.push({ type: 'text', value: `[Image: ${safeAlt}]` });
        } else {
          result.push({
            type: 'image',
            src: urlCheck.normalizedUrl,
            alt: safeAlt,
            title: node.title,
          });
        }
        break;
      }
      case 'hard_break':
      case 'soft_break':
        result.push(node);
        break;
    }
  }

  return result;
}

function sanitizeListItems(items: ListItemNode[], events: string[]): ListItemNode[] {
  return items.map((item) => ({
    ...item,
    children: sanitizeInlineNodes(item.children, events),
    nestedLists: item.nestedLists?.map((nl) => ({
      ...nl,
      items: sanitizeListItems(nl.items, events),
    })),
  }));
}

function sanitizeBlocks(blocks: ContentBlockNode[], events: string[]): ContentBlockNode[] {
  const sanitized: ContentBlockNode[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const cleanChildren = sanitizeInlineNodes(block.children, events);
        sanitized.push({
          ...block,
          children: cleanChildren,
        });
        break;
      }
      case 'paragraph': {
        const cleanChildren = sanitizeInlineNodes(block.children, events);
        if (cleanChildren.length > 0) {
          sanitized.push({
            type: 'paragraph',
            children: cleanChildren,
          });
        }
        break;
      }
      case 'blockquote': {
        const cleanInner = sanitizeBlocks(block.blocks, events);
        if (cleanInner.length > 0) {
          sanitized.push({
            type: 'blockquote',
            blocks: cleanInner,
          });
        }
        break;
      }
      case 'unordered_list':
      case 'ordered_list':
      case 'task_list': {
        sanitized.push({
          ...block,
          items: sanitizeListItems(block.items, events),
        });
        break;
      }
      case 'code_block':
      case 'horizontal_rule': {
        sanitized.push(block);
        break;
      }
      case 'table': {
        sanitized.push({
          ...block,
          headers: block.headers.map((h) => ({
            ...h,
            children: sanitizeInlineNodes(h.children, events),
          })),
          rows: block.rows.map((row) =>
            row.map((cell) => ({
              ...cell,
              children: sanitizeInlineNodes(cell.children, events),
            }))
          ),
        });
        break;
      }
      case 'image': {
        const urlCheck = validateContentUrl(block.src);
        const safeAlt = (block.alt || '').trim() || 'Document illustration';
        if (!urlCheck.safe) {
          events.push(`BLOCKED_UNSAFE_IMAGE_BLOCK:${urlCheck.reason || block.src}`);
        } else {
          sanitized.push({
            type: 'image',
            src: urlCheck.normalizedUrl,
            alt: safeAlt,
            title: block.title,
          });
        }
        break;
      }
      case 'media': {
        const mediaCheck = validateMediaSource(block.src);
        if (!mediaCheck.safe) {
          events.push(`REJECTED_UNAPPROVED_MEDIA:${mediaCheck.reason || block.src}`);
          sanitized.push({
            type: 'media',
            provider: 'unsupported',
            src: '',
            title: block.title || 'External media unavailable',
            safe: false,
          });
        } else {
          sanitized.push({
            type: 'media',
            provider: mediaCheck.provider,
            src: mediaCheck.normalizedSrc,
            title: block.title || `${mediaCheck.provider} media`,
            safe: true,
          });
        }
        break;
      }
      case 'html_block': {
        const { sanitizedText } = sanitizeRawHtmlFragment(block.rawHtml, events);
        if (sanitizedText) {
          sanitized.push({
            type: 'html_block',
            rawHtml: block.rawHtml,
            sanitizedText,
          });
        }
        break;
      }
    }
  }

  return sanitized;
}

export function sanitizeContentAst(ast: ContentDocumentAst): ContentDocumentAst {
  const events = [...ast.sanitizationEvents];
  const cleanBlocks = sanitizeBlocks(ast.blocks, events);
  return {
    ...ast,
    blocks: cleanBlocks,
    plainText: blocksToPlainText(cleanBlocks),
    sanitizationEvents: events,
  };
}
