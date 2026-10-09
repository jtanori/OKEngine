// ============================================================================
// RENDER-001 & RENDER-TEST-001: Semantic HTML Renderer
// Converts a sanitized ContentDocumentAst into semantic, accessible HTML.
// Used for deterministic verification (RENDER-001–045) and HTML/PDF export.
// ============================================================================

import {
  ContentBlockNode,
  ContentDocumentAst,
  InlineNode,
  ListItemNode,
  RENDERER_VERSION,
  RenderContext,
  RenderOptions,
} from '../content.types';
import { parseMarkdownToAst } from '../parser/markdown-parser';
import { resolveContextOptions } from './render-options';

function escapeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineNodesToHtml(nodes: InlineNode[], options: Required<RenderOptions>): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return escapeHtmlEntities(node.value);
        case 'inline_code':
          return `<code>${escapeHtmlEntities(node.value)}</code>`;
        case 'bold':
          return `<strong>${renderInlineNodesToHtml(node.children, options)}</strong>`;
        case 'italic':
          return `<em>${renderInlineNodesToHtml(node.children, options)}</em>`;
        case 'bold_italic':
          return `<strong><em>${renderInlineNodesToHtml(node.children, options)}</em></strong>`;
        case 'strikethrough':
          return `<del>${renderInlineNodesToHtml(node.children, options)}</del>`;
        case 'link': {
          const hrefAttr = escapeHtmlEntities(node.href);
          const relAttrs = node.isExternal
            ? ' target="_blank" rel="noopener noreferrer"'
            : '';
          const longUrlClass = node.href.length > 60 ? ' class="break-all"' : '';
          return `<a href="${hrefAttr}"${relAttrs}${longUrlClass}>${renderInlineNodesToHtml(node.children, options)}</a>`;
        }
        case 'image': {
          if (!options.allowImages) {
            return escapeHtmlEntities(`[Image: ${node.alt}]`);
          }
          return `<img src="${escapeHtmlEntities(node.src)}" alt="${escapeHtmlEntities(node.alt)}" loading="lazy" />`;
        }
        case 'hard_break':
          return '<br />';
        case 'soft_break':
          return '\n';
      }
    })
    .join('');
}

function renderListItemsToHtml(
  items: ListItemNode[],
  options: Required<RenderOptions>
): string {
  return items
    .map((item) => {
      const taskPrefix =
        typeof item.checked === 'boolean'
          ? `<input type="checkbox" disabled ${item.checked ? 'checked' : ''} aria-label="${item.checked ? 'Completed task' : 'Pending task'}" /> `
          : '';
      const bodyHtml = renderInlineNodesToHtml(item.children, options);
      const nestedHtml =
        item.nestedLists && item.nestedLists.length > 0
          ? item.nestedLists
              .map((nl) => renderBlockToHtml(nl, options))
              .join('')
          : '';
      return `<li>${taskPrefix}${bodyHtml}${nestedHtml}</li>`;
    })
    .join('');
}

function renderBlockToHtml(
  block: ContentBlockNode,
  options: Required<RenderOptions>
): string {
  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level}`;
      const idAttr = ` id="${escapeHtmlEntities(block.id)}"`;
      return `<${tag}${idAttr}>${renderInlineNodesToHtml(block.children, options)}</${tag}>`;
    }
    case 'paragraph':
      return `<p>${renderInlineNodesToHtml(block.children, options)}</p>`;
    case 'blockquote':
      return `<blockquote>${block.blocks.map((b) => renderBlockToHtml(b, options)).join('')}</blockquote>`;
    case 'unordered_list':
      return `<ul>${renderListItemsToHtml(block.items, options)}</ul>`;
    case 'ordered_list': {
      const startAttr = block.start && block.start !== 1 ? ` start="${block.start}"` : '';
      return `<ol${startAttr}>${renderListItemsToHtml(block.items, options)}</ol>`;
    }
    case 'task_list':
      return `<ul data-task-list="true">${renderListItemsToHtml(block.items, options)}</ul>`;
    case 'code_block':
      return `<pre data-language="${escapeHtmlEntities(block.language)}"><code class="language-${escapeHtmlEntities(block.language)}">${escapeHtmlEntities(block.code)}</code></pre>`;
    case 'horizontal_rule':
      return '<hr />';
    case 'table': {
      const ths = block.headers
        .map((h) => {
          const alignAttr = h.align ? ` style="text-align:${h.align}" data-align="${h.align}"` : '';
          return `<th scope="col"${alignAttr}>${renderInlineNodesToHtml(h.children, options)}</th>`;
        })
        .join('');
      const trs = block.rows
        .map((row) => {
          const tds = row
            .map((cell) => {
              const alignAttr = cell.align
                ? ` style="text-align:${cell.align}" data-align="${cell.align}"`
                : '';
              return `<td${alignAttr}>${renderInlineNodesToHtml(cell.children, options)}</td>`;
            })
            .join('');
          return `<tr>${tds}</tr>`;
        })
        .join('');
      return `<div class="overflow-x-auto"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }
    case 'image': {
      if (!options.allowImages) {
        return `<p>${escapeHtmlEntities(`[Image: ${block.alt}]`)}</p>`;
      }
      const figCaption = block.title
        ? `<figcaption>${escapeHtmlEntities(block.title)}</figcaption>`
        : '';
      return `<figure><img src="${escapeHtmlEntities(block.src)}" alt="${escapeHtmlEntities(block.alt)}" loading="lazy" />${figCaption}</figure>`;
    }
    case 'media': {
      if (!options.allowMedia || !block.safe) {
        return `<div data-media-fallback="true" role="status">Media unavailable: ${escapeHtmlEntities(block.title)}</div>`;
      }
      return `<figure data-media-provider="${escapeHtmlEntities(block.provider)}" data-media-src="${escapeHtmlEntities(block.src)}"><figcaption>${escapeHtmlEntities(block.title)}</figcaption></figure>`;
    }
    case 'html_block':
      return `<div data-sanitized-html="true">${escapeHtmlEntities(block.sanitizedText)}</div>`;
  }
}

export function renderAstToHtml(
  ast: ContentDocumentAst,
  context: RenderContext = 'DOCUMENT_FULL',
  options: RenderOptions = {}
): string {
  const resolved = resolveContextOptions(context, options);
  if (ast.blocks.length === 0) {
    return `<div data-renderer-version="${RENDERER_VERSION}" data-context="${context}" data-empty="true">No content available.</div>`;
  }

  const tocHtml =
    resolved.showTableOfContents && ast.toc.length >= 2
      ? `<nav aria-label="Table of contents" data-toc="true"><ul>${ast.toc
          .map(
            (entry) =>
              `<li data-level="${entry.level}"><a href="#${escapeHtmlEntities(entry.id)}">${escapeHtmlEntities(entry.text)}</a></li>`
          )
          .join('')}</ul></nav>`
      : '';

  const bodyHtml = ast.blocks.map((b) => renderBlockToHtml(b, resolved)).join('\n');
  return `<div data-renderer-version="${RENDERER_VERSION}" data-context="${context}" dir="auto">${tocHtml}${bodyHtml}</div>`;
}

export function renderContentToHtml(params: {
  content: string;
  context?: RenderContext;
  options?: RenderOptions;
}): { ast: ContentDocumentAst; html: string } {
  const { content, context = 'DOCUMENT_FULL', options = {} } = params;
  const ast = parseMarkdownToAst(content, { sanitize: true });
  const html = renderAstToHtml(ast, context, options);
  return { ast, html };
}
