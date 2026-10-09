'use client';

// ============================================================================
// RENDER-001 §58–60: Canonical Content Renderer Component (CO-CONTENT-RENDERER)
// Powers all 10 presentation contexts from a single Normalized Content AST.
// Consumes 100% DS-* Design System Tokens (--bg-surface, --bg-elevated,
// --text-primary, --text-secondary, --border-default, --accent-primary).
// ============================================================================

import React, { useMemo, useState } from 'react';
import {
  Copy,
  Check,
  Share2,
  MoreHorizontal,
  Edit3,
  Download,
  FilePlus2,
  Flag,
  RefreshCw,
  FileText,
  ExternalLink,
  ArrowUpRight,
  ImageOff,
  VideoOff,
  ListTree,
  X,
} from 'lucide-react';
import {
  AuthorizedCitationItem,
  ContentBlockNode,
  ContentDocumentAst,
  ContentPermissions,
  InlineNode,
  IssueReportCategory,
  ListItemNode,
  RENDERER_VERSION,
  RenderContext,
  RenderOptions,
} from '../content.types';
import { parseMarkdownToAst } from '../parser/markdown-parser';
import {
  CallerRoleKind,
  resolveActionPermissions,
  resolveContextOptions,
} from './render-options';
import { renderObservability } from './render-observability';
import { Input, Select, Button } from '../../components/ui';
import { validatePlainText } from '../../services/formSecurity';

export interface ContentRendererProps {
  content: string;
  context?: RenderContext;
  locale?: 'en' | 'es';
  roleKind?: CallerRoleKind;
  permissions?: ContentPermissions;
  options?: RenderOptions;
  documentId?: string;
  documentTitle?: string;
  collectionId?: string;
  isPublicDocument?: boolean;
  citations?: AuthorizedCitationItem[];
  onEditSource?: (documentId: string) => void;
  onOpenSource?: (citation: AuthorizedCitationItem) => void;
  onRegenerate?: () => void;
  onSavedToWorkspace?: (newDocId: string, collectionId: string) => void;
  className?: string;
}

const UI_STRINGS = {
  en: {
    onThisPage: 'On this page',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share',
    shared: 'Link Copied',
    editSource: 'Edit Source',
    moreActions: 'More actions',
    saveAsMd: 'Save as Markdown (.md)',
    saveAsTxt: 'Save as TXT (.txt)',
    saveAsPdf: 'Save as PDF / Print',
    saveToWorkspace: 'Save Answer to Workspace',
    reportIssue: 'Report Issue',
    regenerate: 'Regenerate',
    sources: 'Sources',
    copyCode: 'Copy',
    imageUnavailable: 'Image unavailable',
    mediaUnavailable: 'Media unavailable',
    emptyContent: 'No content available in this document.',
    reportModalTitle: 'Report Content or Formatting Issue',
    reportSubmit: 'Submit Report',
    reportSubmitted: 'Issue reported — thank you.',
    reportNotesLabel: 'Additional Context (Optional)',
    reportNotesPlaceholder: 'Describe what was inaccurate or broken...',
    reportNotesHint: 'Do not include passwords, tokens, or HTML/script tags.',
    saveModalTitle: 'Save Answer as Workspace Markdown Document',
    saveModalBtn: 'Create Markdown Document',
    saveTitleLabel: 'Document Title',
    saveTitlePlaceholder: 'e.g., SSO Setup & Verification Guide',
    saveTitleHint: '2–120 characters. Saved directly into the selected collection.',
    saveColLabel: 'Target Collection',
    saveColHint: 'Pre-retrieval visibility rules apply immediately.',
    savedToWorkspaceNotice: 'Saved to workspace knowledge base',
  },
  es: {
    onThisPage: 'En esta página',
    copy: 'Copiar',
    copied: 'Copiado',
    share: 'Compartir',
    shared: 'Enlace copiado',
    editSource: 'Editar fuente',
    moreActions: 'Más acciones',
    saveAsMd: 'Guardar como Markdown (.md)',
    saveAsTxt: 'Guardar como TXT (.txt)',
    saveAsPdf: 'Guardar como PDF / Imprimir',
    saveToWorkspace: 'Guardar respuesta en el Workspace',
    reportIssue: 'Reportar problema',
    regenerate: 'Regenerar',
    sources: 'Fuentes',
    copyCode: 'Copiar',
    imageUnavailable: 'Imagen no disponible',
    mediaUnavailable: 'Contenido multimedia no disponible',
    emptyContent: 'No hay contenido disponible en este documento.',
    reportModalTitle: 'Reportar problema de contenido o formato',
    reportSubmit: 'Enviar reporte',
    reportSubmitted: 'Reporte enviado — gracias.',
    reportNotesLabel: 'Contexto adicional (Opcional)',
    reportNotesPlaceholder: 'Describa qué fue inexacto o apresentou error...',
    reportNotesHint: 'No incluya contraseñas, tokens ni etiquetas HTML/script.',
    saveModalTitle: 'Guardar respuesta como documento Markdown',
    saveModalBtn: 'Crear documento Markdown',
    saveTitleLabel: 'Título del Documento',
    saveTitlePlaceholder: 'ej. Guía de Configuración y Verificación SSO',
    saveTitleHint: '2–120 caracteres. Se guarda directamente en la colección seleccionada.',
    saveColLabel: 'Colección Destino',
    saveColHint: 'Las reglas de visibilidad pre-recuperación se aplican de inmediato.',
    savedToWorkspaceNotice: 'Guardado en la base de conocimiento',
  },
};

const ResilientImage: React.FC<{
  src: string;
  alt: string;
  title?: string;
  fallbackLabel: string;
}> = ({ src, alt, title, fallbackLabel }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel}
        className="my-2 px-4 py-3 bg-elevated border border-line rounded-sm flex items-center gap-2.5 text-xs text-ink-secondary"
      >
        <ImageOff className="w-4 h-4 text-ink-secondary shrink-0" />
        <span>
          [{fallbackLabel}: <span className="font-medium text-ink">{alt}</span>]
        </span>
      </div>
    );
  }

  return (
    <figure className="my-3">
      <img
        src={src}
        alt={alt}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => {
          renderObservability.record('image_failure');
          setHasError(true);
        }}
        className="max-w-full h-auto rounded-sm border border-line"
      />
      {title && (
        <figcaption className="mt-1.5 text-2xs text-ink-secondary font-mono">
          {title}
        </figcaption>
      )}
    </figure>
  );
};

const CodeBlockWithCopy: React.FC<{
  language: string;
  code: string;
  showCopy: boolean;
  copyLabel: string;
  copiedLabel: string;
}> = ({ language, code, showCopy, copyLabel, copiedLabel }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    renderObservability.record('copy_action');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 border border-line rounded-sm bg-elevated overflow-hidden">
      <div className="px-3 py-1.5 border-b border-line bg-surface flex items-center justify-between text-2xs font-mono text-ink-secondary">
        <span>{language || 'text'}</span>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={`${copyLabel} code`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs text-2xs font-mono text-ink hover:bg-subtle transition-colors cursor-pointer print:hidden"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-success" />
                <span className="text-success">{copiedLabel}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{copyLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
      <pre
        data-language={language || 'text'}
        className="p-3.5 font-mono text-2xs text-ink overflow-x-auto leading-relaxed whitespace-pre"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({
  content,
  context = 'DOCUMENT_FULL',
  locale = 'en',
  roleKind = 'anonymous',
  permissions: permissionOverrides,
  options: optionOverrides,
  documentId,
  documentTitle = 'okeng-content',
  collectionId = 'COL-DOCS',
  isPublicDocument = true,
  citations = [],
  onEditSource,
  onOpenSource,
  onRegenerate,
  onSavedToWorkspace,
  className = '',
}) => {
  const labels = UI_STRINGS[locale] || UI_STRINGS.en;
  const isAnswerContext =
    context === 'CHAT_ANSWER' ||
    context === 'TEST_CHAT' ||
    context === 'EMBEDDED_CHAT';

  const resolvedOptions = useMemo(
    () => resolveContextOptions(context, optionOverrides),
    [context, optionOverrides]
  );

  const resolvedPermissions = useMemo(
    () =>
      resolveActionPermissions(roleKind, {
        isPublicDocument,
        isAnswerContext,
        overrides: permissionOverrides,
      }),
    [roleKind, isPublicDocument, isAnswerContext, permissionOverrides]
  );

  const ast: ContentDocumentAst = useMemo(() => {
    try {
      const parsed = parseMarkdownToAst(content, { sanitize: true });
      renderObservability.record('render_success', { context, language: locale });
      if (parsed.sanitizationEvents.length > 0) {
        renderObservability.record('sanitization_event', {
          context,
          language: locale,
          count: parsed.sanitizationEvents.length,
        });
      }
      return parsed;
    } catch {
      renderObservability.record('render_failure', { context, language: locale });
      return {
        rendererVersion: RENDERER_VERSION,
        frontmatter: {},
        blocks: [],
        toc: [],
        plainText: '',
        sanitizationEvents: ['PARSE_ERROR_FALLBACK'],
      };
    }
  }, [content, context, locale]);

  const [copiedContent, setCopiedContent] = useState(false);
  const [sharedLinkNotice, setSharedLinkNotice] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportCategory, setReportCategory] =
    useState<IssueReportCategory>('formatting_problem');
  const [reportNotes, setReportNotes] = useState('');
  const [reportNotesError, setReportNotesError] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const [saveWorkspaceOpen, setSaveWorkspaceOpen] = useState(false);
  const [saveTargetCollection, setSaveTargetCollection] = useState(collectionId || 'COL-DOCS');
  const [saveDocTitle, setSaveDocTitle] = useState(
    documentTitle !== 'okeng-content' ? documentTitle : ''
  );
  const [saveTitleError, setSaveTitleError] = useState<string | null>(null);
  const [isSavingWorkspaceDoc, setIsSavingWorkspaceDoc] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // 1. Copy semantic plain text (never includes UI chrome per RENDER-029; appends structured citations)
  const handleCopyContent = () => {
    const cleanText =
      citations.length > 0
        ? `${ast.plainText}\n\nSources:\n${citations
            .map((c, idx) =>
              `[${idx + 1}] ${c.title} (${
                c.collectionId ? `${c.collectionId}/` : ''
              }${c.filename})`
            )
            .join('\n')}`
        : ast.plainText;

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(cleanText).catch(() => {});
    }
    renderObservability.record('copy_action', { context, language: locale });
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 1800);
  };

  // 2. Share safe reference link (never bypasses workspace authorization per RENDER-041)
  const handleShare = async () => {
    renderObservability.record('share_action', { context, language: locale });
    try {
      const res = await fetch('/api/embed/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          collectionId,
          isPublicDocument,
          context,
          locale,
        }),
      });
      const data = await res.json();
      const shareUrl = data.shareUrl || window.location.href;
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl).catch(() => {});
      }
      setSharedLinkNotice(labels.shared);
      setTimeout(() => setSharedLinkNotice(null), 2200);
    } catch {
      setSharedLinkNotice(labels.shared);
      setTimeout(() => setSharedLinkNotice(null), 2200);
    }
  };

  // 3. Export as Markdown / TXT / PDF (RENDER-040 & RENDER-042)
  const handleExport = async (format: 'md' | 'txt' | 'pdf') => {
    setOverflowOpen(false);
    renderObservability.record('save_action', { context, language: locale });

    if (format === 'pdf') {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
      return;
    }

    const slug =
      documentTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'okeng-document';
    const filename = `${slug}.${format}`;
    const bodyText =
      format === 'md'
        ? citations.length > 0
          ? `${content.trim()}\n\n## Sources\n${citations
              .map(
                (c) =>
                  `- **${c.title}** (\`${
                    c.collectionId ? `${c.collectionId}/` : ''
                  }${c.filename}\`)`
              )
              .join('\n')}\n`
          : content
        : ast.plainText;

    const blob = new Blob([bodyText], {
      type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 4. Save Answer to Workspace as a persistent Markdown document (RENDER-001 §36)
  const handleSaveAnswerToWorkspace = async () => {
    if (isSavingWorkspaceDoc) return;

    const titleCheck = validatePlainText(saveDocTitle, {
      required: true,
      minLength: 2,
      maxLength: 120,
      fieldLabel: labels.saveTitleLabel,
    });
    if (!titleCheck.valid) {
      setSaveTitleError(titleCheck.errorMessage || 'Valid document title is required.');
      return;
    }

    setSaveTitleError(null);
    setIsSavingWorkspaceDoc(true);
    renderObservability.record('save_action', { context, language: locale });
    try {
      const res = await fetch('/api/embed/answers/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'okeng',
          collectionId: saveTargetCollection,
          title: titleCheck.sanitizedValue,
          answerMarkdown: content,
          citations,
          roleKind,
        }),
      });
      const data = await res.json();
      if (res.ok && data.document) {
        setSaveWorkspaceOpen(false);
        setSavedNotice(`${labels.savedToWorkspaceNotice}: ${data.document.filename}`);
        setTimeout(() => setSavedNotice(null), 3000);
        onSavedToWorkspace?.(data.document.id, saveTargetCollection);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingWorkspaceDoc(false);
    }
  };

  // 5. Submit structured Issue Report (RENDER-001 §39)
  const handleSubmitIssueReport = async () => {
    if (isReporting) return;

    const notesCheck = validatePlainText(reportNotes, {
      required: false,
      maxLength: 500,
      fieldLabel: labels.reportNotesLabel,
    });
    if (!notesCheck.valid) {
      setReportNotesError(notesCheck.errorMessage || 'Unsafe characters are not permitted.');
      return;
    }

    setReportNotesError(null);
    setIsReporting(true);
    renderObservability.record('report_issue_action', { context, language: locale });
    try {
      await fetch('/api/embed/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: 'okeng',
          documentId,
          surface: context,
          rendererVersion: RENDERER_VERSION,
          language: locale,
          category: reportCategory,
          notes: notesCheck.sanitizedValue,
        }),
      });
    } catch {
      // Non-blocking telemetry
    } finally {
      setIsReporting(false);
    }
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setReportModalOpen(false);
      setReportNotes('');
    }, 1400);
  };

  const renderInlineNodes = (nodes: InlineNode[], keyPrefix: string): React.ReactNode => {
    return nodes.map((node, idx) => {
      const key = `${keyPrefix}-inl-${idx}`;
      switch (node.type) {
        case 'text':
          return <React.Fragment key={key}>{node.value}</React.Fragment>;
        case 'inline_code':
          return (
            <code
              key={key}
              className="px-1.5 py-0.5 bg-subtle border border-line rounded-xs font-mono text-2xs text-ink"
            >
              {node.value}
            </code>
          );
        case 'bold':
          return (
            <strong key={key} className="font-semibold text-ink">
              {renderInlineNodes(node.children, key)}
            </strong>
          );
        case 'italic':
          return (
            <em key={key} className="italic">
              {renderInlineNodes(node.children, key)}
            </em>
          );
        case 'bold_italic':
          return (
            <strong key={key} className="font-semibold text-ink">
              <em className="italic">{renderInlineNodes(node.children, key)}</em>
            </strong>
          );
        case 'strikethrough':
          return (
            <del key={key} className="line-through text-ink-secondary">
              {renderInlineNodes(node.children, key)}
            </del>
          );
        case 'link': {
          const isLongUrl = node.href.length > 60;
          return (
            <a
              key={key}
              href={node.href}
              title={node.title}
              target={node.isExternal ? '_blank' : undefined}
              rel={node.isExternal ? 'noopener noreferrer' : undefined}
              className={`text-accent underline underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent rounded-xs ${
                isLongUrl ? 'break-all' : ''
              }`}
            >
              {renderInlineNodes(node.children, key)}
            </a>
          );
        }
        case 'image':
          if (!resolvedOptions.allowImages) {
            return <span key={key}>[Image: {node.alt}]</span>;
          }
          return (
            <ResilientImage
              key={key}
              src={node.src}
              alt={node.alt}
              title={node.title}
              fallbackLabel={labels.imageUnavailable}
            />
          );
        case 'hard_break':
          return <br key={key} />;
        case 'soft_break':
          return <React.Fragment key={key}>{' '}</React.Fragment>;
      }
    });
  };

  const renderListItems = (items: ListItemNode[], keyPrefix: string): React.ReactNode => {
    return items.map((item, idx) => {
      const itemKey = `${keyPrefix}-li-${idx}`;
      return (
        <li key={itemKey} className="text-xs text-ink leading-relaxed">
          <div className="inline">
            {typeof item.checked === 'boolean' && (
              <input
                type="checkbox"
                disabled
                checked={item.checked}
                aria-label={item.checked ? 'Completed task' : 'Pending task'}
                className="mr-2 align-middle accent-accent"
              />
            )}
            {renderInlineNodes(item.children, itemKey)}
          </div>
          {item.nestedLists && item.nestedLists.length > 0 && (
            <div className="mt-1.5 pl-4 space-y-1">
              {item.nestedLists.map((nl, nIdx) =>
                renderBlock(nl, `${itemKey}-nested-${nIdx}`)
              )}
            </div>
          )}
        </li>
      );
    });
  };

  const renderBlock = (block: ContentBlockNode, key: string): React.ReactNode => {
    switch (block.type) {
      case 'heading': {
        const contentNodes = renderInlineNodes(block.children, key);
        // Option 1: Show hover # anchors ONLY in Full Document views, never in Chat answers
        const anchorLink = resolvedOptions.showHeadingAnchors ? (
          <a
            href={`#${block.id}`}
            aria-label={`Link to ${block.text}`}
            className="ml-1.5 opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-secondary hover:text-accent text-xs font-mono transition-opacity select-none print:hidden"
          >
            #
          </a>
        ) : null;

        if (block.level === 1) {
          return (
            <h1
              key={key}
              id={block.id}
              className="group text-xl font-semibold text-ink tracking-tight border-b border-line pb-2 pt-1 text-start"
            >
              {contentNodes}
              {anchorLink}
            </h1>
          );
        }
        if (block.level === 2) {
          return (
            <h2
              key={key}
              id={block.id}
              className="group text-sm font-semibold text-ink pt-3 tracking-tight text-start"
            >
              {contentNodes}
              {anchorLink}
            </h2>
          );
        }
        if (block.level === 3) {
          return (
            <h3
              key={key}
              id={block.id}
              className="group text-xs font-semibold text-ink pt-1 text-start"
            >
              {contentNodes}
              {anchorLink}
            </h3>
          );
        }
        const Tag = `h${block.level}` as 'h4' | 'h5' | 'h6';
        return (
          <Tag
            key={key}
            id={block.id}
            className="group text-xs font-semibold text-ink-secondary pt-1.5 text-start"
          >
            {contentNodes}
            {anchorLink}
          </Tag>
        );
      }

      case 'paragraph':
        return (
          <p
            key={key}
            className="text-xs text-ink leading-relaxed text-start max-w-[72ch]"
          >
            {renderInlineNodes(block.children, key)}
          </p>
        );

      case 'blockquote':
        return (
          <blockquote
            key={key}
            className="my-2.5 pl-3.5 py-1 border-l-2 border-accent bg-elevated text-xs text-ink space-y-2 rounded-r-sm"
          >
            {block.blocks.map((inner, idx) => renderBlock(inner, `${key}-bq-${idx}`))}
          </blockquote>
        );

      case 'unordered_list':
        return (
          <ul key={key} className="space-y-1.5 pl-5 list-disc text-ink text-start">
            {renderListItems(block.items, key)}
          </ul>
        );

      case 'ordered_list':
        return (
          <ol
            key={key}
            start={block.start ?? 1}
            className="space-y-1.5 pl-5 list-decimal text-ink text-start"
          >
            {renderListItems(block.items, key)}
          </ol>
        );

      case 'task_list':
        return (
          <ul key={key} className="space-y-1.5 pl-1 list-none text-ink text-start">
            {renderListItems(block.items, key)}
          </ul>
        );

      case 'code_block':
        return (
          <CodeBlockWithCopy
            key={key}
            language={block.language}
            code={block.code}
            showCopy={resolvedOptions.showCodeCopy}
            copyLabel={labels.copyCode}
            copiedLabel={labels.copied}
          />
        );

      case 'horizontal_rule':
        return <hr key={key} className="my-4 border-t border-line" />;

      case 'table':
        return (
          <div
            key={key}
            className="my-3 w-full overflow-x-auto border border-line rounded-sm"
          >
            <table className="w-full border-collapse text-xs text-ink tabular-nums">
              <thead className="bg-elevated border-b border-line">
                <tr>
                  {block.headers.map((header, hIdx) => {
                    const alignClass =
                      header.align === 'center'
                        ? 'text-center'
                        : header.align === 'right'
                          ? 'text-right'
                          : 'text-left';
                    return (
                      <th
                        key={`${key}-th-${hIdx}`}
                        scope="col"
                        data-align={header.align || undefined}
                        className={`px-3 py-2 font-semibold text-ink border-r last:border-r-0 border-line ${alignClass}`}
                      >
                        {renderInlineNodes(header.children, `${key}-th-${hIdx}`)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {block.rows.map((row, rIdx) => (
                  <tr key={`${key}-tr-${rIdx}`} className="hover:bg-elevated/60">
                    {row.map((cell, cIdx) => {
                      const alignClass =
                        cell.align === 'center'
                          ? 'text-center'
                          : cell.align === 'right'
                            ? 'text-right'
                            : 'text-left';
                      return (
                        <td
                          key={`${key}-td-${rIdx}-${cIdx}`}
                          data-align={cell.align || undefined}
                          className={`px-3 py-2 border-r last:border-r-0 border-line ${alignClass}`}
                        >
                          {renderInlineNodes(cell.children, `${key}-td-${rIdx}-${cIdx}`)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'image':
        if (!resolvedOptions.allowImages) {
          return (
            <p key={key} className="text-xs text-ink-secondary font-mono">
              [Image: {block.alt}]
            </p>
          );
        }
        return (
          <ResilientImage
            key={key}
            src={block.src}
            alt={block.alt}
            title={block.title}
            fallbackLabel={labels.imageUnavailable}
          />
        );

      case 'media':
        if (!resolvedOptions.allowMedia || !block.safe) {
          return (
            <div
              key={key}
              role="status"
              data-media-fallback="true"
              className="my-2 px-4 py-3 bg-elevated border border-line rounded-sm flex items-center gap-2.5 text-xs text-ink-secondary"
            >
              <VideoOff className="w-4 h-4 text-ink-secondary shrink-0" />
              <span>
                {labels.mediaUnavailable}:{' '}
                <span className="font-medium text-ink">{block.title}</span>
              </span>
            </div>
          );
        }
        return (
          <figure
            key={key}
            data-media-provider={block.provider}
            className="my-3 p-3.5 bg-elevated border border-line rounded-sm flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <div className="text-2xs font-mono uppercase text-ink-secondary">
                Approved Media · {block.provider}
              </div>
              <figcaption className="text-xs font-medium text-ink">
                {block.title}
              </figcaption>
            </div>
            <a
              href={block.src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-surface border border-line rounded-sm text-xs font-medium text-accent hover:bg-subtle"
            >
              <span>Open Media</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </figure>
        );

      case 'html_block':
        return (
          <div
            key={key}
            data-sanitized-html="true"
            className="text-xs text-ink leading-relaxed"
          >
            {block.sanitizedText}
          </div>
        );
    }
  };

  if (ast.blocks.length === 0) {
    return (
      <div
        data-renderer-version={RENDERER_VERSION}
        data-context={context}
        data-empty="true"
        className={`py-4 text-xs text-ink-secondary italic ${className}`}
      >
        {labels.emptyContent}
      </div>
    );
  }

  return (
    <div
      data-renderer-version={RENDERER_VERSION}
      data-context={context}
      dir="auto"
      className={`space-y-3 select-text ${className}`}
    >
      {/* 1. Table of Contents ("On this page" — RENDER-043) */}
      {resolvedOptions.showTableOfContents && ast.toc.length >= 2 && (
        <nav
          aria-label="Table of contents"
          data-toc="true"
          className="mb-4 p-3.5 bg-elevated border border-line rounded-sm print:hidden"
        >
          <div className="flex items-center gap-1.5 text-2xs font-mono font-semibold text-ink-secondary mb-2">
            <ListTree className="w-3.5 h-3.5 text-accent" />
            <span>{labels.onThisPage}</span>
          </div>
          <ul className="space-y-1">
            {ast.toc.map((entry) => (
              <li
                key={entry.id}
                className={
                  entry.level === 1
                    ? 'pl-0'
                    : entry.level === 2
                      ? 'pl-3'
                      : 'pl-6'
                }
              >
                <a
                  href={`#${entry.id}`}
                  className="text-xs text-ink hover:text-accent hover:underline transition-colors"
                >
                  {entry.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* 2. Canonical Normalized AST Block Stream */}
      <div className="space-y-3">
        {ast.blocks.map((block, idx) => renderBlock(block, `blk-${idx}`))}
      </div>

      {/* 3. Option A: Single Unified Citation Strip Inside CO-CONTENT-RENDERER (RENDER-024/025) */}
      {resolvedOptions.showCitations && citations.length > 0 && (
        <div
          data-citations="true"
          className="mt-4 pt-3 border-t border-line space-y-2"
        >
          <div className="text-2xs font-mono font-semibold text-ink-secondary tabular-nums">
            {labels.sources} ({citations.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {citations.map((cit, idx) => (
              <button
                key={`${cit.collectionId || 'doc'}-${cit.filename}-${idx}`}
                type="button"
                onClick={() => onOpenSource?.(cit)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-subtle border border-line rounded-sm text-2xs font-mono text-ink transition-colors cursor-pointer whitespace-nowrap"
              >
                <FileText className="w-3 h-3 text-accent shrink-0" />
                <span className="font-semibold text-accent tabular-nums">
                  [{idx + 1}]
                </span>
                <span>{cit.filename}</span>
                {cit.section && (
                  <span className="text-ink-secondary">· {cit.section}</span>
                )}
                {onOpenSource && (
                  <ArrowUpRight className="w-3 h-3 text-ink-secondary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Progressive-Disclosure Content Toolbar ([Copy] [Share] [Edit Source*] [•••]) */}
      {resolvedOptions.showActions && (
        <div
          data-content-toolbar="true"
          className="pt-3 mt-3 border-t border-line flex flex-wrap items-center justify-between gap-2 print:hidden"
        >
          <div className="flex items-center gap-1.5">
            {/* Primary 1: Copy */}
            {resolvedPermissions.canCopy && (
              <button
                type="button"
                onClick={handleCopyContent}
                aria-label={labels.copy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-elevated border border-line rounded-sm text-2xs font-medium text-ink transition-colors cursor-pointer whitespace-nowrap"
              >
                {copiedContent ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    <span className="text-success">{labels.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-ink-secondary" />
                    <span>{labels.copy}</span>
                  </>
                )}
              </button>
            )}

            {/* Primary 2: Share */}
            {resolvedPermissions.canShare && (
              <button
                type="button"
                onClick={handleShare}
                aria-label={labels.share}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-elevated border border-line rounded-sm text-2xs font-medium text-ink transition-colors cursor-pointer whitespace-nowrap"
              >
                <Share2 className="w-3 h-3 text-ink-secondary" />
                <span>{sharedLinkNotice || labels.share}</span>
              </button>
            )}

            {/* Permission-Gated Primary/Contextual: Edit Source (Only visible when canEdit=true — RENDER-027) */}
            {resolvedPermissions.canEdit && documentId && onEditSource && (
              <button
                type="button"
                data-action="edit-source"
                onClick={() => {
                  renderObservability.record('edit_source_action', {
                    context,
                    language: locale,
                  });
                  onEditSource(documentId);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface hover:bg-elevated border border-line rounded-sm text-2xs font-medium text-accent transition-colors cursor-pointer whitespace-nowrap"
              >
                <Edit3 className="w-3 h-3" />
                <span>{labels.editSource}</span>
              </button>
            )}

            {/* Overflow Menu Trigger: [•••] */}
            <div className="relative">
              <button
                type="button"
                aria-label={labels.moreActions}
                aria-expanded={overflowOpen}
                onClick={() => setOverflowOpen((prev) => !prev)}
                className="inline-flex items-center justify-center px-2 py-1 bg-surface hover:bg-elevated border border-line rounded-sm text-2xs text-ink transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {overflowOpen && (
                <div
                  role="menu"
                  className="absolute left-0 bottom-full mb-1.5 w-56 bg-surface border border-line rounded-sm shadow-sm py-1 z-30 text-xs"
                >
                  {resolvedPermissions.canSave && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExport('md')}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-ink-secondary" />
                        <span>{labels.saveAsMd}</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExport('txt')}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-ink-secondary" />
                        <span>{labels.saveAsTxt}</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleExport('pdf')}
                        className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-ink-secondary" />
                        <span>{labels.saveAsPdf}</span>
                      </button>
                    </>
                  )}

                  {resolvedPermissions.canSaveToWorkspace && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOverflowOpen(false);
                        setSaveWorkspaceOpen(true);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-accent font-medium hover:bg-elevated cursor-pointer border-t border-line"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>{labels.saveToWorkspace}</span>
                    </button>
                  )}

                  {resolvedPermissions.canRegenerate && onRegenerate && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOverflowOpen(false);
                        onRegenerate();
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-ink-secondary" />
                      <span>{labels.regenerate}</span>
                    </button>
                  )}

                  {resolvedPermissions.canEdit && documentId && onEditSource && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOverflowOpen(false);
                        onEditSource(documentId);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-ink-secondary" />
                      <span>{labels.editSource}</span>
                    </button>
                  )}

                  {resolvedPermissions.canReport && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOverflowOpen(false);
                        setReportModalOpen(true);
                      }}
                      className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-ink hover:bg-elevated cursor-pointer border-t border-line"
                    >
                      <Flag className="w-3.5 h-3.5 text-ink-secondary" />
                      <span>{labels.reportIssue}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {savedNotice && (
            <span className="text-2xs font-mono text-success">
              {savedNotice}
            </span>
          )}
        </div>
      )}

      {/* 5. Save Answer to Workspace Modal (RENDER-001 §36) */}
      {saveWorkspaceOpen && (
        <div className="mt-3 p-4 bg-elevated border border-line rounded-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">
              {labels.saveModalTitle}
            </span>
            <button
              type="button"
              disabled={isSavingWorkspaceDoc}
              onClick={() => setSaveWorkspaceOpen(false)}
              className="text-ink-secondary hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={labels.saveTitleLabel}
              placeholder={labels.saveTitlePlaceholder}
              hint={labels.saveTitleHint}
              error={saveTitleError || undefined}
              value={saveDocTitle}
              onChange={(e) => {
                setSaveDocTitle(e.target.value);
                if (saveTitleError) setSaveTitleError(null);
              }}
              disabled={isSavingWorkspaceDoc}
              required
            />
            <Select
              label={labels.saveColLabel}
              hint={labels.saveColHint}
              value={saveTargetCollection}
              onChange={(e) => setSaveTargetCollection(e.target.value)}
              disabled={isSavingWorkspaceDoc}
              options={[
                { value: 'COL-PUBLIC', label: 'COL-PUBLIC (Everyone)' },
                { value: 'COL-DOCS', label: 'COL-DOCS (Customer & Developer)' },
                { value: 'COL-INTERNAL', label: 'COL-INTERNAL (Admins Only)' },
              ]}
              className="font-mono"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSavingWorkspaceDoc}
              onClick={handleSaveAnswerToWorkspace}
            >
              {labels.saveModalBtn}
            </Button>
          </div>
        </div>
      )}

      {/* 6. Report Issue Taxonomy Modal (RENDER-001 §39) */}
      {reportModalOpen && (
        <div className="mt-3 p-4 bg-elevated border border-line rounded-sm space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">
              {labels.reportModalTitle}
            </span>
            <button
              type="button"
              disabled={isReporting}
              onClick={() => setReportModalOpen(false)}
              className="text-ink-secondary hover:text-ink cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {reportSubmitted ? (
            <div className="text-xs text-success font-medium py-1">
              {labels.reportSubmitted}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {(
                  [
                    ['wrong_information', 'Wrong information'],
                    ['wrong_source', 'Wrong source'],
                    ['missing_information', 'Missing information'],
                    ['formatting_problem', 'Formatting problem'],
                    ['something_else', 'Something else'],
                  ] as [IssueReportCategory, string][]
                ).map(([val, label]) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 text-xs text-ink cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="issue_category"
                      disabled={isReporting}
                      checked={reportCategory === val}
                      onChange={() => setReportCategory(val)}
                      className="accent-accent"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <Input
                type="text"
                label={labels.reportNotesLabel}
                placeholder={labels.reportNotesPlaceholder}
                hint={labels.reportNotesHint}
                error={reportNotesError || undefined}
                value={reportNotes}
                onChange={(e) => {
                  setReportNotes(e.target.value);
                  if (reportNotesError) setReportNotesError(null);
                }}
                disabled={isReporting}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isReporting}
                  onClick={handleSubmitIssueReport}
                >
                  {labels.reportSubmit}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
