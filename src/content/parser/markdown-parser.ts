// ============================================================================
// RENDER-001 & RENDER-TEST-001: Canonical Markdown-to-Normalized-AST Parser
// Deterministic block + inline parser powering all 10 OKEng surfaces.
// Guarantees heading isolation (RENDER-001 / RENDER-023), nested list hierarchy
// (RENDER-006), GFM table alignment (RENDER-011/012), inline spans (RENDER-003),
// and strict sanitization (RENDER-017/018).
// ============================================================================

import {
  ContentBlockNode,
  ContentDocumentAst,
  InlineNode,
  ListItemNode,
  OrderedListBlock,
  TableCellNode,
  TableColumnAlignment,
  TaskListBlock,
  UnorderedListBlock,
} from '../content.types';
import { generateDeterministicHeadingId } from '../ast/content-node';
import { inlineNodesToPlainText } from '../ast/inline-node';
import { buildContentDocumentAst } from '../ast/content-document';
import { sanitizeContentAst, sanitizeRawHtmlFragment } from '../sanitizer/html-sanitizer';
import { validateContentUrl } from '../sanitizer/url-policy';
import { validateMediaSource } from '../sanitizer/media-policy';
import { MarkdownParserOptions } from './parser-types';

/**
 * Unescapes Markdown backslash escapes (\., \", \*, \_, \`, \[) so literal
 * backslashes never leak into rendered text (enforces RENDER-023).
 */
function unescapeMarkdownText(raw: string): string {
  return raw.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1');
}

/**
 * Parses inline Markdown text into structured InlineNode AST elements.
 * Supports: inline code (`code`), images (![alt](url)), links ([text](url)),
 * bare URLs (https://...), bold+italic (***text***), bold (**text** / __text__),
 * italic (*text* / _text_), strikethrough (~~text~~), hard breaks, and soft breaks.
 */
export function parseInlineMarkdown(input: string): InlineNode[] {
  if (!input) return [];

  const nodes: InlineNode[] = [];
  let remaining = input;

  // Master regex matching earliest inline token across lines ([\s\S] for multiline spans per RENDER-022)
  const tokenRegex =
    /(`[^`]+`)|(!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\))|(\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\))|(\*\*\*([\s\S]+?)\*\*\*|___([\s\S]+?)___)|(\*\*([\s\S]+?)\*\*|__([\s\S]+?)__)|(~~([\s\S]+?)~~)|(\*([^\s*][\s\S]*?)\*|_([^\s_][\s\S]*?)_)|(https?:\/\/[^\s<>()]+)|(\s{2,}\n|\\\n)|(\n)/;

  while (remaining.length > 0) {
    const match = tokenRegex.exec(remaining);
    if (!match) {
      nodes.push({ type: 'text', value: unescapeMarkdownText(remaining) });
      break;
    }

    if (match.index > 0) {
      const before = remaining.slice(0, match.index);
      nodes.push({ type: 'text', value: unescapeMarkdownText(before) });
    }

    const fullMatch = match[0];

    if (match[1]) {
      // 1. Inline code: `code` (never parse Markdown inside code — RENDER-010)
      const codeVal = match[1].slice(1, -1);
      nodes.push({ type: 'inline_code', value: codeVal });
    } else if (match[2]) {
      // 2. Inline image: ![alt](src "title")
      const alt = (match[3] || '').trim() || 'Illustration';
      const src = match[4] || '';
      const title = match[5];
      nodes.push({ type: 'image', src, alt, title });
    } else if (match[6]) {
      // 3. Link: [label](href "title")
      const label = match[7] || '';
      const href = match[8] || '';
      const title = match[9];
      const urlCheck = validateContentUrl(href);
      nodes.push({
        type: 'link',
        href,
        title,
        isExternal: urlCheck.isExternal,
        children: parseInlineMarkdown(label),
      });
    } else if (match[10]) {
      // 4. Bold + Italic: ***text*** or ___text___
      const inner = match[11] ?? match[12] ?? '';
      nodes.push({
        type: 'bold_italic',
        children: parseInlineMarkdown(inner.replace(/\n+/g, ' ')),
      });
    } else if (match[13]) {
      // 5. Bold: **text** or __text__ (supports multiline chunk boundary formatting per RENDER-022)
      const inner = match[14] ?? match[15] ?? '';
      nodes.push({
        type: 'bold',
        children: parseInlineMarkdown(inner.replace(/\n+/g, ' ')),
      });
    } else if (match[16]) {
      // 6. Strikethrough: ~~text~~
      const inner = match[17] ?? '';
      nodes.push({
        type: 'strikethrough',
        children: parseInlineMarkdown(inner.replace(/\n+/g, ' ')),
      });
    } else if (match[18]) {
      // 7. Italic: *text* or _text_
      const inner = match[19] ?? match[20] ?? '';
      nodes.push({
        type: 'italic',
        children: parseInlineMarkdown(inner.replace(/\n+/g, ' ')),
      });
    } else if (match[21]) {
      // 8. Bare URL: https://... (RENDER-020)
      const rawUrl = match[21];
      const urlCheck = validateContentUrl(rawUrl);
      nodes.push({
        type: 'link',
        href: rawUrl,
        isExternal: urlCheck.isExternal,
        children: [{ type: 'text', value: rawUrl }],
      });
    } else if (match[22]) {
      // 9. Hard line break (two spaces + \n or \\\n — RENDER-016)
      nodes.push({ type: 'hard_break' });
    } else if (match[23]) {
      // 10. Soft line break (\n inside a single paragraph — RENDER-016)
      nodes.push({ type: 'soft_break' });
    }

    remaining = remaining.slice(match.index + fullMatch.length);
  }

  return nodes;
}

function extractFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: {}, body: normalized };
  }
  const endIdx = normalized.indexOf('\n---\n', 4);
  if (endIdx === -1) {
    return { frontmatter: {}, body: normalized };
  }
  const fmSection = normalized.slice(4, endIdx);
  // Only treat as YAML frontmatter if lines look like key: value pairs
  const fmLines = fmSection.split('\n').filter((l) => l.trim().length > 0);
  const isFrontmatter =
    fmLines.length > 0 && fmLines.every((l) => /^[a-zA-Z0-9_-]+\s*:|^-\s+/.test(l.trim()));
  if (!isFrontmatter) {
    return { frontmatter: {}, body: normalized };
  }

  const frontmatter: Record<string, unknown> = {};
  for (const line of fmLines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      frontmatter[key] = val;
    }
  }
  return { frontmatter, body: normalized.slice(endIdx + 5) };
}

function isTableDividerLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('|') || !trimmed.includes('-')) return false;
  const cells = trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  return cells.length >= 1 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function parseTableAlignments(dividerLine: string): TableColumnAlignment[] {
  return dividerLine
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => {
      const c = cell.trim();
      if (c.startsWith(':') && c.endsWith(':')) return 'center';
      if (c.endsWith(':')) return 'right';
      if (c.startsWith(':')) return 'left';
      return null;
    });
}

function parseTableRowCells(
  rowLine: string,
  alignments: TableColumnAlignment[],
  colCount: number
): TableCellNode[] {
  const rawCells = rowLine
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

  const cells: TableCellNode[] = [];
  for (let i = 0; i < colCount; i++) {
    const cellText = rawCells[i] ?? '';
    cells.push({
      children: parseInlineMarkdown(cellText),
      align: alignments[i] ?? null,
    });
  }
  return cells;
}

interface RawListLine {
  indent: number;
  kind: 'unordered' | 'ordered' | 'task';
  checked?: boolean;
  orderNum?: number;
  content: string;
}

function matchListLine(line: string): RawListLine | null {
  const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
  if (taskMatch) {
    return {
      indent: taskMatch[1].length,
      kind: 'task',
      checked: taskMatch[2].toLowerCase() === 'x',
      content: taskMatch[3],
    };
  }
  const ulMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
  if (ulMatch) {
    return {
      indent: ulMatch[1].length,
      kind: 'unordered',
      content: ulMatch[2],
    };
  }
  const olMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (olMatch) {
    return {
      indent: olMatch[1].length,
      kind: 'ordered',
      orderNum: Number(olMatch[2]),
      content: olMatch[3],
    };
  }
  return null;
}

function buildListAst(
  lines: RawListLine[],
  startIndex = 0,
  baseIndent = lines[0]?.indent ?? 0
): {
  listBlock: UnorderedListBlock | OrderedListBlock | TaskListBlock;
  nextIndex: number;
} {
  const firstKind = lines[startIndex]?.kind || 'unordered';
  const items: ListItemNode[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const current = lines[i];
    if (current.indent < baseIndent) {
      break;
    }

    if (current.indent > baseIndent) {
      // Nested list attached to the previous item (RENDER-006)
      const nestedResult = buildListAst(lines, i, current.indent);
      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        lastItem.nestedLists = lastItem.nestedLists || [];
        lastItem.nestedLists.push(nestedResult.listBlock);
      } else {
        items.push({
          type: 'list_item',
          children: [],
          nestedLists: [nestedResult.listBlock],
        });
      }
      i = nestedResult.nextIndex;
      continue;
    }

    // Same indentation level, but if list type changes at root, break to start new list block
    if (current.kind !== firstKind && current.indent === baseIndent && items.length > 0) {
      break;
    }

    items.push({
      type: 'list_item',
      checked: current.kind === 'task' ? current.checked : undefined,
      children: parseInlineMarkdown(current.content),
    });
    i++;
  }

  if (firstKind === 'ordered') {
    return {
      listBlock: {
        type: 'ordered_list',
        start: lines[startIndex]?.orderNum ?? 1,
        items,
      },
      nextIndex: i,
    };
  }

  if (firstKind === 'task') {
    return {
      listBlock: {
        type: 'task_list',
        items,
      },
      nextIndex: i,
    };
  }

  return {
    listBlock: {
      type: 'unordered_list',
      items,
    },
    nextIndex: i,
  };
}

function parseLinesToBlocks(
  lines: string[],
  seenHeadingIds: Map<string, number>,
  sanitizationEvents: string[]
): ContentBlockNode[] {
  const blocks: ContentBlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Blank line -> skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block (```lang ... ```) — RENDER-009
    const fenceMatch = /^```([a-zA-Z0-9_-]*)\s*$/.exec(trimmed);
    if (fenceMatch) {
      const language = fenceMatch[1] || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({
        type: 'code_block',
        language,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 3. ATX Heading (# .. ######) — RENDER-001 & RENDER-023
    // Heading strictly terminates at the end of this single line!
    const headingMatch = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const rawHeadingText = headingMatch[2];
      const children = parseInlineMarkdown(rawHeadingText);
      const plainHeadingText = inlineNodesToPlainText(children);
      const id = generateDeterministicHeadingId(plainHeadingText, seenHeadingIds);
      blocks.push({
        type: 'heading',
        level,
        id,
        text: plainHeadingText,
        children,
      });
      i++;
      continue;
    }

    // 4. Horizontal Rule (---, ***, ___) — RENDER-015
    if (/^(-\s*){3,}$|^(\*\s*){3,}$|^(_\s*){3,}$/.test(trimmed)) {
      blocks.push({ type: 'horizontal_rule' });
      i++;
      continue;
    }

    // 5. GFM Table (Header row + |---|---| divider row) — RENDER-011 & RENDER-012
    if (
      trimmed.includes('|') &&
      i + 1 < lines.length &&
      isTableDividerLine(lines[i + 1])
    ) {
      const headerLine = lines[i];
      const dividerLine = lines[i + 1];
      const alignments = parseTableAlignments(dividerLine);
      const colCount = alignments.length;
      const headers = parseTableRowCells(headerLine, alignments, colCount);
      i += 2;

      const rows: TableCellNode[][] = [];
      while (
        i < lines.length &&
        lines[i].trim().includes('|') &&
        lines[i].trim().length > 0
      ) {
        rows.push(parseTableRowCells(lines[i], alignments, colCount));
        i++;
      }

      blocks.push({
        type: 'table',
        headers,
        alignments,
        rows,
      });
      continue;
    }

    // 6. Blockquote (> ...) — RENDER-008
    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const innerBlocks = parseLinesToBlocks(quoteLines, seenHeadingIds, sanitizationEvents);
      blocks.push({
        type: 'blockquote',
        blocks: innerBlocks,
      });
      continue;
    }

    // 7. Lists (-, *, 1., - [ ]) — RENDER-005, RENDER-006, RENDER-007
    if (matchListLine(line)) {
      const rawListLines: RawListLine[] = [];
      while (i < lines.length) {
        const m = matchListLine(lines[i]);
        if (!m) break;
        rawListLines.push(m);
        i++;
      }
      let cursor = 0;
      while (cursor < rawListLines.length) {
        const { listBlock, nextIndex } = buildListAst(
          rawListLines,
          cursor,
          rawListLines[cursor].indent
        );
        blocks.push(listBlock);
        cursor = nextIndex;
      }
      continue;
    }

    // 8. Standalone Image Block (![alt](src "title")) — RENDER-013
    const imageBlockMatch = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/.exec(trimmed);
    if (imageBlockMatch) {
      const alt = (imageBlockMatch[1] || '').trim() || 'Document illustration';
      const src = imageBlockMatch[2] || '';
      const title = imageBlockMatch[3];
      blocks.push({
        type: 'image',
        src,
        alt,
        title,
      });
      i++;
      continue;
    }

    // 9. Standalone Media Block (@[video|youtube|vimeo|media](url "title")) — RENDER-014
    const mediaBlockMatch =
      /^@\[(video|youtube|vimeo|audio|media)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/i.exec(trimmed);
    if (mediaBlockMatch) {
      const kindLabel = mediaBlockMatch[1];
      const src = mediaBlockMatch[2];
      const title = mediaBlockMatch[3] || `${kindLabel} media`;
      const check = validateMediaSource(src);
      blocks.push({
        type: 'media',
        provider: check.provider,
        src: check.safe ? check.normalizedSrc : src,
        title,
        safe: check.safe,
      });
      i++;
      continue;
    }

    // 10. Raw HTML Block (<div...>, <script...>, <iframe...>, <img...>) — RENDER-017 & RENDER-018
    if (/^<[a-zA-Z!/]/.test(trimmed)) {
      const { sanitizedText } = sanitizeRawHtmlFragment(trimmed, sanitizationEvents);
      if (sanitizedText) {
        blocks.push({
          type: 'html_block',
          rawHtml: trimmed,
          sanitizedText,
        });
      }
      i++;
      continue;
    }

    // 11. Paragraph Block (collect consecutive non-special lines) — RENDER-002, RENDER-016, RENDER-022
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const nextLine = lines[i];
      const nextTrimmed = nextLine.trim();
      if (
        !nextTrimmed ||
        /^```/.test(nextTrimmed) ||
        /^(#{1,6})\s+/.test(nextTrimmed) ||
        /^(-\s*){3,}$|^(\*\s*){3,}$|^(_\s*){3,}$/.test(nextTrimmed) ||
        /^>\s?/.test(nextTrimmed) ||
        matchListLine(nextLine) !== null ||
        /^!\[([^\]]*)\]\(([^)]+)\)$/.test(nextTrimmed) ||
        /^@\[(video|youtube|vimeo|audio|media)\]\(/i.test(nextTrimmed) ||
        /^<[a-zA-Z!/]/.test(nextTrimmed) ||
        (nextTrimmed.includes('|') &&
          i + 1 < lines.length &&
          isTableDividerLine(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(nextLine);
      i++;
    }

    const joinedParagraph = paraLines.join('\n');
    const children = parseInlineMarkdown(joinedParagraph);
    if (children.length > 0) {
      blocks.push({
        type: 'paragraph',
        children,
      });
    }
  }

  return blocks;
}

/**
 * Canonical entry point: Parses raw Markdown into a Normalized, Sanitized ContentDocumentAst.
 */
export function parseMarkdownToAst(
  rawMarkdown: string,
  options: MarkdownParserOptions = {}
): ContentDocumentAst {
  const { sanitize = true } = options;
  const safeInput = typeof rawMarkdown === 'string' ? rawMarkdown : '';
  const { frontmatter, body } = extractFrontmatter(safeInput);

  const lines = body.split('\n');
  const seenHeadingIds = new Map<string, number>();
  const sanitizationEvents: string[] = [];

  const blocks = parseLinesToBlocks(lines, seenHeadingIds, sanitizationEvents);
  const rawAst = buildContentDocumentAst(blocks, frontmatter, sanitizationEvents);

  return sanitize ? sanitizeContentAst(rawAst) : rawAst;
}
