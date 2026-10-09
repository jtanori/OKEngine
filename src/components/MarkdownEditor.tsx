import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Save,
  Link2,
  Check,
  AlertCircle,
  Pencil,
  Wand2,
  PanelLeftClose,
  PanelRightClose,
  Columns2,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Code,
  FileCode,
  Quote,
  List,
  ListOrdered,
  Minus,
  ShieldCheck,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { KnowledgeDocument, DocumentNextStep } from '../types';
import { store } from '../services/store';
import { useI18n } from '../i18n/I18nContext';
import { useAppShell } from './AppShell';
import { ChildContextNavbar, ChildBreadcrumbItem } from './ChildContextNavbar';
import { NextStepButton } from './NextStepButton';
import {
  Button,
  StatusIndicator,
  AccessBadge,
  Badge,
  Input,
  Textarea,
  Select,
  Divider,
  Text,
  Box,
  Drawer,
  Modal,
} from './ui';
import { ContentRenderer } from '../content';
import {
  validatePlainText,
  validateFilenameInput,
  containsUnsafeMarkdownScript,
  generateFilenameFromTitle,
  CANONICAL_INTERNAL_ROUTES,
  validateCtaTarget,
} from '../services/formSecurity';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Markdown Editor (CO-MARKDOWN-EDITOR)
// Two-Surface Header + Dedicated Slide-In Panels + Synchronized Editor | Preview:
//   - Surface 1 (CO-CHILD-NAVBAR): Back + Breadcrumb on left;
//       [PÚBLICO / PUBLIC] + Solid-Background Status Badge on right (no divider)
//   - Surface 2 (Stationary Document Identity + Actions):
//       Left: Title [✎] + "filename.md · Collection · N chunks · Size"
//       Right: Inline side-by-side [Next step: <Label> ✎] + [Save & Index]
//   - Dedicated Slide-In Panel (PR-DRAWER) for [✎] Document Details (Title, Filename, Collection)
//   - Dedicated Slide-In Panel (PR-DRAWER) for Next-Step CTA + / Route Autocomplete
// ============================================================================

export type EditorLifecycleState = 'CLEAN' | 'DIRTY' | 'SAVING' | 'INDEXING';
export type EditorPaneMode = 'split' | 'source' | 'preview';

export interface MarkdownEditorProps {
  documentId?: string;
  initialCollectionId?: string;
  parentContext?: 'collection' | 'files';
  onBack: () => void;
  onNavigateToCollections?: () => void;
  onNavigateToCollection?: (collectionId: string) => void;
  onNavigateToFiles?: () => void;
  onSaved: (doc: KnowledgeDocument) => void;
}

interface SavedSnapshot {
  title: string;
  filename: string;
  collectionId: string;
  content: string;
  ctaLabel: string;
  ctaUrl: string;
}

const DEFAULT_NEW_CONTENT = `# Document Title\n\nWrite documentation here. Use headings to structure topics into retrieval chunks.\n\n## Section 1\nDetails regarding setup and operations...\n`;

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  documentId,
  initialCollectionId,
  parentContext = 'files',
  onBack,
  onNavigateToCollections,
  onNavigateToCollection,
  onNavigateToFiles,
  onSaved,
}) => {
  const { t, language } = useI18n();
  const { registerNavigationGuard } = useAppShell();
  const collections = store.getCollections();

  const [currentDocId, setCurrentDocId] = useState<string | undefined>(documentId);
  const existingDoc = currentDocId ? store.getDocument(currentDocId) : undefined;
  const isNewDocument = !existingDoc;

  const initialTitle = existingDoc?.title || '';
  const initialFilename = existingDoc?.filename || '';
  const initialColId =
    existingDoc?.collectionId || initialCollectionId || collections[0]?.id || '';
  const initialContent = existingDoc?.content || DEFAULT_NEW_CONTENT;
  const initialCtaLabel = existingDoc?.nextStep?.label || '';
  const initialCtaUrl = existingDoc?.nextStep?.url || '';

  const [title, setTitle] = useState(initialTitle);
  const [filename, setFilename] = useState(initialFilename);
  const [collectionId, setCollectionId] = useState(initialColId);
  const [content, setContent] = useState(initialContent);
  const [ctaLabel, setCtaLabel] = useState(initialCtaLabel);
  const [ctaUrl, setCtaUrl] = useState(initialCtaUrl);

  // Track saved baseline for CLEAN / DIRTY detection
  const [savedSnapshot, setSavedSnapshot] = useState<SavedSnapshot>({
    title: initialTitle,
    filename: initialFilename,
    collectionId: initialColId,
    content: initialContent,
    ctaLabel: initialCtaLabel,
    ctaUrl: initialCtaUrl,
  });

  // Non-bidirectional filename rule:
  // New documents auto-generate filename from title until the user manually edits the filename.
  // Existing documents keep title and filename independent.
  const [hasManuallyEditedFilename, setHasManuallyEditedFilename] = useState<boolean>(
    !isNewDocument && Boolean(initialFilename)
  );

  // Dedicated Slide-In Panel for Document Details (Title, Filename, Target Collection)
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState<boolean>(isNewDocument);
  const [draftTitle, setDraftTitle] = useState(initialTitle);
  const [draftFilename, setDraftFilename] = useState(initialFilename);
  const [draftCollectionId, setDraftCollectionId] = useState(initialColId);

  // Per-pane expand/restore mode ('split' | 'source' | 'preview')
  const [paneMode, setPaneMode] = useState<EditorPaneMode>('split');

  // Lifecycle state ('CLEAN' | 'DIRTY' | 'SAVING' | 'INDEXING')
  const [savePhase, setSavePhase] = useState<'IDLE' | 'SAVING' | 'INDEXING'>('IDLE');
  const [justSavedBadge, setJustSavedBadge] = useState(false);

  // CTA Slide-over drawer state
  const [isCtaDrawerOpen, setIsCtaDrawerOpen] = useState(false);
  const [draftCtaLabel, setDraftCtaLabel] = useState(initialCtaLabel);
  const [draftCtaUrl, setDraftCtaUrl] = useState(initialCtaUrl);
  const [isRouteSuggestOpen, setIsRouteSuggestOpen] = useState(false);

  // Unsaved-changes guard modal state
  const [pendingNavigationAction, setPendingNavigationAction] = useState<(() => void) | null>(
    null
  );

  const [errors, setErrors] = useState<{
    title?: string;
    filename?: string;
    content?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  }>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = useMemo(() => {
    return (
      title !== savedSnapshot.title ||
      filename !== savedSnapshot.filename ||
      collectionId !== savedSnapshot.collectionId ||
      content !== savedSnapshot.content ||
      ctaLabel !== savedSnapshot.ctaLabel ||
      ctaUrl !== savedSnapshot.ctaUrl
    );
  }, [title, filename, collectionId, content, ctaLabel, ctaUrl, savedSnapshot]);

  const lifecycleState: EditorLifecycleState =
    savePhase === 'SAVING'
      ? 'SAVING'
      : savePhase === 'INDEXING'
      ? 'INDEXING'
      : isDirty
      ? 'DIRTY'
      : 'CLEAN';

  const isBusy = savePhase !== 'IDLE';

  // Register navigation guard with AppShell so sidebar links also respect DIRTY state
  useEffect(() => {
    registerNavigationGuard((proceed) => {
      if (isDirty) {
        setPendingNavigationAction(() => proceed);
        return false;
      }
      return true;
    });
    return () => registerNavigationGuard(null);
  }, [isDirty, registerNavigationGuard]);

  const guardNavigation = useCallback(
    (action: () => void) => {
      if (isDirty) {
        setPendingNavigationAction(() => action);
      } else {
        action();
      }
    },
    [isDirty]
  );

  const selectedCol = collections.find((c) => c.id === collectionId);
  const draftSelectedCol = collections.find((c) => c.id === draftCollectionId);

  // Estimate retrieval chunk count from headings
  const estimatedChunks = useMemo(() => {
    const headings = content
      .split('\n')
      .filter((line) => /^#{1,3}\s+/.test(line.trim())).length;
    return Math.max(1, headings);
  }, [content]);

  // Open Document Identity Slide-In Panel
  const openIdentityDrawer = () => {
    setDraftTitle(title);
    setDraftFilename(filename || (title.trim() ? generateFilenameFromTitle(title) : ''));
    setDraftCollectionId(collectionId);
    setErrors((prev) => ({ ...prev, title: undefined, filename: undefined }));
    setIsIdentityDrawerOpen(true);
  };

  // Handle Title input change inside the Document Details Slide-In Panel
  const handleDraftTitleChange = (nextTitle: string) => {
    setDraftTitle(nextTitle);
    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));

    if (isNewDocument && !hasManuallyEditedFilename) {
      setDraftFilename(nextTitle.trim() ? generateFilenameFromTitle(nextTitle) : '');
      if (errors.filename) setErrors((prev) => ({ ...prev, filename: undefined }));
    }
  };

  const handleGenerateDraftFilenameFromTitle = () => {
    const baseTitle = draftTitle.trim() || 'untitled-document';
    const generated = generateFilenameFromTitle(baseTitle);
    setDraftFilename(generated);
    setHasManuallyEditedFilename(true);
    if (errors.filename) setErrors((prev) => ({ ...prev, filename: undefined }));
  };

  const handleApplyIdentityDrawer = () => {
    const effectiveFilename =
      !draftFilename.trim() && draftTitle.trim()
        ? generateFilenameFromTitle(draftTitle)
        : draftFilename;

    const titleCheck = validatePlainText(draftTitle, {
      required: true,
      minLength: 2,
      maxLength: 120,
      fieldLabel: t('editor.doc_title', 'Document Title'),
    });
    const filenameCheck = validateFilenameInput(effectiveFilename);

    const nextErrs: typeof errors = { ...errors };
    if (!titleCheck.valid) {
      nextErrs.title = t(titleCheck.errorKey || 'validation.required', titleCheck.errorMessage);
    } else {
      delete nextErrs.title;
    }

    if (!filenameCheck.valid) {
      nextErrs.filename = t(
        filenameCheck.errorKey || 'validation.filename_invalid',
        filenameCheck.errorMessage
      );
    } else {
      delete nextErrs.filename;
    }

    setErrors(nextErrs);
    if (!titleCheck.valid || !filenameCheck.valid) return;

    setTitle(titleCheck.sanitizedValue);
    setFilename(filenameCheck.sanitizedValue);
    setCollectionId(draftCollectionId);
    setIsIdentityDrawerOpen(false);
  };

  // Cursor-aware Markdown syntax insertion
  const applyMarkdownSyntax = (
    type:
      | 'h1'
      | 'h2'
      | 'h3'
      | 'bold'
      | 'italic'
      | 'code'
      | 'codeblock'
      | 'quote'
      | 'bullet'
      | 'number'
      | 'link'
      | 'divider'
  ) => {
    const el = textareaRef.current;
    if (!el || isBusy) return;

    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const selected = content.slice(start, end);
    const before = content.slice(0, start);
    const after = content.slice(end);

    let insert = '';
    let selectionOffsetStart = 0;
    let selectionOffsetEnd = 0;

    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
    const linePrefix = needsLeadingNewline ? '\n' : '';

    switch (type) {
      case 'h1': {
        const text = selected || 'Heading 1';
        insert = `${linePrefix}# ${text}`;
        selectionOffsetStart = linePrefix.length + 2;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'h2': {
        const text = selected || 'Section Heading';
        insert = `${linePrefix}## ${text}`;
        selectionOffsetStart = linePrefix.length + 3;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'h3': {
        const text = selected || 'Subsection';
        insert = `${linePrefix}### ${text}`;
        selectionOffsetStart = linePrefix.length + 4;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'bold': {
        const text = selected || 'bold text';
        insert = `**${text}**`;
        selectionOffsetStart = 2;
        selectionOffsetEnd = 2 + text.length;
        break;
      }
      case 'italic': {
        const text = selected || 'italic text';
        insert = `*${text}*`;
        selectionOffsetStart = 1;
        selectionOffsetEnd = 1 + text.length;
        break;
      }
      case 'code': {
        const text = selected || 'code';
        insert = `\`${text}\``;
        selectionOffsetStart = 1;
        selectionOffsetEnd = 1 + text.length;
        break;
      }
      case 'codeblock': {
        const text = selected || '// code example';
        insert = `${linePrefix}\`\`\`ts\n${text}\n\`\`\`\n`;
        selectionOffsetStart = linePrefix.length + 6;
        selectionOffsetEnd = linePrefix.length + 6 + text.length;
        break;
      }
      case 'quote': {
        const text = selected || 'Key takeaway or note';
        insert = `${linePrefix}> ${text}`;
        selectionOffsetStart = linePrefix.length + 2;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'bullet': {
        const text = selected || 'List item';
        insert = `${linePrefix}- ${text}`;
        selectionOffsetStart = linePrefix.length + 2;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'number': {
        const text = selected || 'First step';
        insert = `${linePrefix}1. ${text}`;
        selectionOffsetStart = linePrefix.length + 3;
        selectionOffsetEnd = insert.length;
        break;
      }
      case 'link': {
        const text = selected || 'Link text';
        insert = `[${text}](/docs)`;
        selectionOffsetStart = 1;
        selectionOffsetEnd = 1 + text.length;
        break;
      }
      case 'divider': {
        insert = `${linePrefix}\n---\n`;
        selectionOffsetStart = insert.length;
        selectionOffsetEnd = insert.length;
        break;
      }
    }

    const nextContent = `${before}${insert}${after}`;
    setContent(nextContent);
    if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + selectionOffsetStart, start + selectionOffsetEnd);
    });
  };

  // Open CTA slide-over drawer initialized with current CTA values
  const openCtaDrawer = () => {
    setDraftCtaLabel(ctaLabel);
    setDraftCtaUrl(ctaUrl);
    setErrors((prev) => ({ ...prev, ctaLabel: undefined, ctaUrl: undefined }));
    setIsCtaDrawerOpen(true);
  };

  // Validate and apply CTA inside the Slide-Over Drawer
  const handleApplyCtaDrawer = () => {
    const hasLabel = Boolean(draftCtaLabel.trim());
    const hasUrl = Boolean(draftCtaUrl.trim());

    if (!hasLabel && !hasUrl) {
      setCtaLabel('');
      setCtaUrl('');
      setIsCtaDrawerOpen(false);
      return;
    }

    const nextErrs: typeof errors = { ...errors, ctaLabel: undefined, ctaUrl: undefined };

    if (!hasLabel || !hasUrl) {
      if (!hasLabel) {
        nextErrs.ctaLabel = t(
          'validation.cta_pair_required',
          'Both a button label and target URL/route are required.'
        );
      }
      if (!hasUrl) {
        nextErrs.ctaUrl = t(
          'validation.cta_pair_required',
          'Both a button label and target URL/route are required.'
        );
      }
      setErrors(nextErrs);
      return;
    }

    const labelCheck = validatePlainText(draftCtaLabel, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('editor.cta_label', 'Button Label'),
    });
    const targetCheck = validateCtaTarget(draftCtaUrl, true);

    if (!labelCheck.valid) {
      nextErrs.ctaLabel = t(
        labelCheck.errorKey || 'validation.unsafe_input',
        labelCheck.errorMessage
      );
    }
    if (!targetCheck.valid) {
      nextErrs.ctaUrl = t(
        targetCheck.errorKey || 'validation.url_unsafe',
        targetCheck.errorMessage
      );
    }

    setErrors(nextErrs);
    if (!labelCheck.valid || !targetCheck.valid) return;

    setCtaLabel(labelCheck.sanitizedValue);
    setCtaUrl(targetCheck.sanitizedValue);
    setIsCtaDrawerOpen(false);
  };

  const handleClearCta = () => {
    setDraftCtaLabel('');
    setDraftCtaUrl('');
    setCtaLabel('');
    setCtaUrl('');
    setErrors((prev) => ({ ...prev, ctaLabel: undefined, ctaUrl: undefined }));
    setIsCtaDrawerOpen(false);
  };

  // Save & Index state machine: CLEAN/DIRTY -> SAVING -> INDEXING -> CLEAN
  const handleSave = () => {
    if (isBusy) return;

    const effectiveFilename =
      !filename.trim() && title.trim() ? generateFilenameFromTitle(title) : filename;

    const titleCheck = validatePlainText(title, {
      required: true,
      minLength: 2,
      maxLength: 120,
      fieldLabel: t('editor.doc_title', 'Document Title'),
    });
    const filenameCheck = validateFilenameInput(effectiveFilename);

    const nextErrors: {
      title?: string;
      filename?: string;
      content?: string;
      ctaLabel?: string;
      ctaUrl?: string;
    } = {};

    if (!titleCheck.valid) {
      nextErrors.title = t(titleCheck.errorKey || 'validation.required', titleCheck.errorMessage);
    }
    if (!filenameCheck.valid) {
      nextErrors.filename = t(
        filenameCheck.errorKey || 'validation.filename_invalid',
        filenameCheck.errorMessage
      );
    }

    if (!content.trim()) {
      nextErrors.content = t('validation.required', 'Markdown content cannot be empty.');
    } else if (containsUnsafeMarkdownScript(content)) {
      nextErrors.content = t(
        'validation.unsafe_input',
        'HTML script tags, inline event handlers, and javascript: links are prohibited in Markdown.'
      );
    }

    const hasLabel = Boolean(ctaLabel.trim());
    const hasUrl = Boolean(ctaUrl.trim());
    let nextStep: DocumentNextStep | undefined = undefined;

    if (hasLabel || hasUrl) {
      const labelCheck = validatePlainText(ctaLabel, {
        required: true,
        minLength: 2,
        maxLength: 80,
        fieldLabel: t('editor.cta_label', 'Button Label'),
      });
      const urlCheck = validateCtaTarget(ctaUrl, true);
      if (!labelCheck.valid) {
        nextErrors.ctaLabel = t(
          labelCheck.errorKey || 'validation.unsafe_input',
          labelCheck.errorMessage
        );
      }
      if (!urlCheck.valid) {
        nextErrors.ctaUrl = t(
          urlCheck.errorKey || 'validation.url_unsafe',
          urlCheck.errorMessage
        );
      }
      if (labelCheck.valid && urlCheck.valid) {
        nextStep = {
          label: labelCheck.sanitizedValue,
          url: urlCheck.sanitizedValue,
        };
      }
    }

    setErrors(nextErrors);
    if (nextErrors.title || nextErrors.filename) {
      setDraftTitle(title);
      setDraftFilename(effectiveFilename);
      setDraftCollectionId(collectionId);
      setIsIdentityDrawerOpen(true);
    }
    if (nextErrors.ctaLabel || nextErrors.ctaUrl) {
      setIsCtaDrawerOpen(true);
    }
    if (Object.keys(nextErrors).length > 0) return;

    // Transition: SAVING -> INDEXING -> CLEAN
    setSavePhase('SAVING');
    setTimeout(() => {
      setSavePhase('INDEXING');
      setTimeout(() => {
        const sanitizedTitle = titleCheck.sanitizedValue;
        const sanitizedFilename = filenameCheck.sanitizedValue;

        setTitle(sanitizedTitle);
        setFilename(sanitizedFilename);
        setHasManuallyEditedFilename(true);

        const saved = store.saveDocument({
          id: existingDoc?.id,
          title: sanitizedTitle,
          filename: sanitizedFilename,
          collectionId,
          content,
          nextStep,
        });

        setCurrentDocId(saved.id);
        setSavedSnapshot({
          title: sanitizedTitle,
          filename: sanitizedFilename,
          collectionId,
          content,
          ctaLabel: nextStep?.label || '',
          ctaUrl: nextStep?.url || '',
        });
        setIsIdentityDrawerOpen(false);
        setSavePhase('IDLE');
        setJustSavedBadge(true);
        setTimeout(() => setJustSavedBadge(false), 2500);
        onSaved(saved);
      }, 200);
    }, 140);
  };

  // RENDER-030: Editor preview uses the exact same CO-CONTENT-RENDERER AST contract as the Document Viewer
  const renderMarkdown = (text: string) => (
    <ContentRenderer
      content={text}
      context="EDITOR_PREVIEW"
      locale={language}
      documentTitle={title || t('editor.new_title', 'New Document')}
      collectionId={collectionId}
    />
  );

  // Build deterministic logical-parent breadcrumb trail
  const breadcrumbItems: ChildBreadcrumbItem[] = useMemo(() => {
    const docLabel = title.trim() || t('editor.new_title', 'Untitled Document');
    if (parentContext === 'collection' && selectedCol) {
      return [
        {
          label: t('nav.collections', 'Collections'),
          onClick: onNavigateToCollections
            ? () => guardNavigation(onNavigateToCollections)
            : () => guardNavigation(onBack),
        },
        {
          label: selectedCol.name,
          onClick: onNavigateToCollection
            ? () => guardNavigation(() => onNavigateToCollection(selectedCol.id))
            : () => guardNavigation(onBack),
        },
        { label: docLabel },
      ];
    }
    return [
      {
        label: t('nav.files', 'Files'),
        onClick: onNavigateToFiles
          ? () => guardNavigation(onNavigateToFiles)
          : () => guardNavigation(onBack),
      },
      { label: docLabel },
    ];
  }, [
    title,
    parentContext,
    selectedCol,
    t,
    onNavigateToCollections,
    onNavigateToCollection,
    onNavigateToFiles,
    onBack,
    guardNavigation,
  ]);

  // Live validation & autocomplete inside the CTA Slide-Over Drawer
  const draftTargetValidation = useMemo(
    () => validateCtaTarget(draftCtaUrl, Boolean(draftCtaLabel.trim())),
    [draftCtaUrl, draftCtaLabel]
  );

  const filteredRouteSuggestions = useMemo(() => {
    const q = draftCtaUrl.trim().toLowerCase();
    if (!q.startsWith('/')) return CANONICAL_INTERNAL_ROUTES;
    return CANONICAL_INTERNAL_ROUTES.filter(
      (r) =>
        r.path.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q)
    );
  }, [draftCtaUrl]);

  const hasActiveCta = Boolean(ctaLabel.trim() && ctaUrl.trim());

  const restoreSplitLabel = t('editor.restore_split', 'Restore split view');
  const expandEditorLabel = t('editor.expand_editor', 'Expand editor panel');
  const expandPreviewLabel = t('editor.expand_preview', 'Expand preview panel');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-canvas">
      {/* Surface 1: Context / Workspace Bar (CO-CHILD-NAVBAR)
          Right side displays Visibility Badge (PÚBLICO/PUBLIC) + Solid Status Badge with NO dot divider */}
      <ChildContextNavbar
        onBack={() => guardNavigation(onBack)}
        breadcrumb={breadcrumbItems}
        disabled={isBusy}
        contextMetadata={
          <>
            {selectedCol && <AccessBadge visibility={selectedCol.visibility} />}
            {lifecycleState === 'SAVING' && (
              <Badge tone="solid-accent" mono>
                <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
                <span>{t('editor.state_saving', 'Saving...')}</span>
              </Badge>
            )}
            {lifecycleState === 'INDEXING' && (
              <Badge tone="solid-accent" mono>
                <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
                <span>{t('editor.state_indexing', 'Indexing...')}</span>
              </Badge>
            )}
            {lifecycleState === 'DIRTY' && (
              <Badge tone="solid-warning" mono>
                <span className="w-1.5 h-1.5 rounded-full bg-surface" />
                <span>{t('editor.state_unsaved', 'Unsaved changes')}</span>
              </Badge>
            )}
            {lifecycleState === 'CLEAN' && (
              <StatusIndicator status={existingDoc?.status || 'ready'} variant="solid" />
            )}
          </>
        }
      >
        {/* Surface 2: Stationary Document Identity + Actions Surface */}
        <div className="px-6 py-3.5 border-t border-line bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Human Identity (Title) + Technical Identity (filename · collection · chunks · size) */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-ink truncate">
                  {title || t('editor.new_title', 'Untitled Document')}
                </h1>
                <button
                  type="button"
                  onClick={openIdentityDrawer}
                  aria-label={t(
                    'editor.edit_identity',
                    'Edit document title, filename, and collection'
                  )}
                  title={t(
                    'editor.edit_identity',
                    'Edit document title, filename, and collection'
                  )}
                  className="p-1 rounded-xs text-ink-muted hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs font-mono text-ink-secondary tabular-nums">
                <span className="text-ink font-medium">
                  {filename || generateFilenameFromTitle(title)}
                </span>
                {selectedCol && (
                  <>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={openIdentityDrawer}
                      title={t('editor.target_collection', 'Collection')}
                      className="hover:text-ink hover:underline transition-colors cursor-pointer"
                    >
                      {selectedCol.name}
                    </button>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>
                  {existingDoc?.chunkCount ?? estimatedChunks}{' '}
                  {t('files.col_chunks', 'chunks').toLowerCase()}
                </span>
                {existingDoc?.fileSize && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{existingDoc.fileSize}</span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Inline Side-by-Side [Next step ... ✎] + [Save & Index] */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Single Compact Contextual CTA Control */}
              <button
                type="button"
                onClick={openCtaDrawer}
                disabled={isBusy}
                title={t('editor.next_step_heading', 'Next-Step Action (CTA)')}
                className="h-8 px-2.5 bg-elevated hover:bg-subtle border border-line rounded-sm inline-flex items-center gap-2 text-xs transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-ink-secondary">
                  {t('editor.next_step_field_label', 'Next step')}
                </span>
                <span
                  className={
                    hasActiveCta
                      ? 'font-medium text-ink truncate max-w-[180px]'
                      : 'text-ink-muted'
                  }
                >
                  {hasActiveCta
                    ? ctaLabel
                    : t('editor.next_step_add', 'Add action')}
                </span>
                <Pencil className="w-3 h-3 text-ink-muted shrink-0" />
              </button>

              {/* Primary Save & Index Action */}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isBusy}
              >
                {justSavedBadge && lifecycleState === 'CLEAN' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span>{t('common.saved', 'Saved')}</span>
                  </>
                ) : (
                  <>
                    {!isBusy && <Save className="w-3.5 h-3.5" />}
                    <span>
                      {lifecycleState === 'SAVING'
                        ? t('editor.state_saving', 'Saving...')
                        : lifecycleState === 'INDEXING'
                        ? t('editor.state_indexing', 'Indexing...')
                        : t('editor.save_index', 'Save & Index')}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {errors.content && (
            <Box
              surface="danger"
              padding="xs"
              radius="sm"
              role="alert"
              className="mt-2 flex items-center gap-2 text-xs text-danger"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.content}</span>
            </Box>
          )}
        </div>
      </ChildContextNavbar>

      {/* Synchronized Editor | Preview Workspace (flex-1 min-h-0 overflow-hidden) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Pane: Editor */}
        {(paneMode === 'split' || paneMode === 'source') && (
          <section
            aria-label={t('editor.write_tab', 'Editor')}
            className={`flex flex-col min-h-0 overflow-hidden ${
              paneMode === 'split' ? 'w-1/2 border-r border-line' : 'w-full'
            } bg-surface`}
          >
            {/* Synchronized h-10 Editor Pane Header */}
            <div className="h-10 px-4 bg-elevated border-b border-line flex items-center justify-between gap-2 select-none shrink-0">
              <div className="flex items-center gap-2 min-w-0 overflow-x-auto">
                <span className="text-xs font-semibold text-ink shrink-0">
                  {t('editor.write_tab', 'Editor')}
                </span>

                <span className="w-px h-3.5 bg-line shrink-0" aria-hidden="true" />

                {/* Focused Markdown Formatting Toolbar */}
                <div
                  role="toolbar"
                  aria-label="Formatting tools"
                  className="flex items-center gap-0.5 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('h1')}
                    title="Heading 1 (# )"
                    aria-label="Heading 1"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('h2')}
                    title="Heading 2 (## )"
                    aria-label="Heading 2"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('h3')}
                    title="Heading 3 (### )"
                    aria-label="Heading 3"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-line mx-0.5" aria-hidden="true" />

                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('bold')}
                    title="Bold (**text**)"
                    aria-label="Bold"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('italic')}
                    title="Italic (*text*)"
                    aria-label="Italic"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-line mx-0.5" aria-hidden="true" />

                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('code')}
                    title="Inline Code (`code`)"
                    aria-label="Inline Code"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('codeblock')}
                    title="Code Block (```)"
                    aria-label="Code Block"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('quote')}
                    title="Blockquote (> )"
                    aria-label="Blockquote"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-line mx-0.5" aria-hidden="true" />

                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('bullet')}
                    title="Bulleted List (- )"
                    aria-label="Bulleted List"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('number')}
                    title="Numbered List (1. )"
                    aria-label="Numbered List"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-px h-3.5 bg-line mx-0.5" aria-hidden="true" />

                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('link')}
                    title="Insert Link ([text](url))"
                    aria-label="Insert Link"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdownSyntax('divider')}
                    title="Horizontal Divider (---)"
                    aria-label="Horizontal Divider"
                    className="p-1 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-2xs font-mono text-ink-secondary shrink-0">
                <span className="tabular-nums hidden xl:inline">
                  {content.split('\n').length} ln
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPaneMode(paneMode === 'source' ? 'split' : 'source')
                  }
                  aria-label={
                    paneMode === 'source' ? restoreSplitLabel : expandEditorLabel
                  }
                  title={
                    paneMode === 'source' ? restoreSplitLabel : expandEditorLabel
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-sm text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {paneMode === 'source' ? (
                    <Columns2 className="w-3.5 h-3.5" />
                  ) : (
                    <PanelRightClose className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* P0 Full-Height Scrollable Source Textarea */}
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errors.content) setErrors((prev) => ({ ...prev, content: undefined }));
              }}
              disabled={isBusy}
              aria-label="Document source"
              containerClassName="flex-1 flex flex-col min-h-0 !space-y-0"
              className="flex-1 w-full h-full min-h-0 p-5 font-mono text-xs text-ink bg-surface border-0 rounded-none resize-none focus:ring-0 leading-relaxed overflow-y-auto"
              placeholder="# Write your documentation here..."
            />
          </section>
        )}

        {/* Right Pane: Preview */}
        {(paneMode === 'split' || paneMode === 'preview') && (
          <section
            aria-label={t('editor.preview_tab', 'Preview')}
            className={`flex flex-col min-h-0 overflow-hidden ${
              paneMode === 'split' ? 'w-1/2' : 'w-full'
            } bg-elevated`}
          >
            {/* Synchronized h-10 Preview Pane Header */}
            <div className="h-10 px-4 bg-elevated border-b border-line flex items-center justify-between gap-2 select-none shrink-0">
              <span className="text-xs font-semibold text-ink">
                {t('editor.preview_tab', 'Preview')}
              </span>
              <div className="flex items-center gap-2 text-2xs font-mono text-ink-secondary">
                <button
                  type="button"
                  onClick={() =>
                    setPaneMode(paneMode === 'preview' ? 'split' : 'preview')
                  }
                  aria-label={
                    paneMode === 'preview' ? restoreSplitLabel : expandPreviewLabel
                  }
                  title={
                    paneMode === 'preview' ? restoreSplitLabel : expandPreviewLabel
                  }
                  className="w-7 h-7 flex items-center justify-center rounded-sm text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {paneMode === 'preview' ? (
                    <Columns2 className="w-3.5 h-3.5" />
                  ) : (
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-6 overflow-y-auto bg-surface">
              <div className="max-w-xl mx-auto space-y-6">
                {renderMarkdown(content)}
                {hasActiveCta && (
                  <div className="pt-4 border-t border-line">
                    <NextStepButton label={ctaLabel} url={ctaUrl} />
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Dedicated Slide-In Panel (PR-DRAWER) for [✎] Document Details (Title, Filename, Target Collection) */}
      <Drawer
        isOpen={isIdentityDrawerOpen}
        onClose={() => setIsIdentityDrawerOpen(false)}
        position="right"
        width="400px"
        maxWidth="min(420px, 92vw)"
        title={t('editor.identity_drawer_title', 'Document Details & Collection')}
        subtitle={t(
          'editor.identity_drawer_desc',
          'Configure the human-readable title, technical filename (.md), and assigned collection.'
        )}
      >
        <div className="space-y-4">
          <Input
            label={t('editor.doc_title', 'Document Title')}
            placeholder="e.g. OKEng Product Overview"
            hint={t(
              'editor.title_hint',
              'Human-readable title displayed in headings and citations.'
            )}
            error={errors.title}
            value={draftTitle}
            onChange={(e) => handleDraftTitleChange(e.target.value)}
            disabled={isBusy}
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="drawer-filename-input"
                className="block text-xs font-medium text-ink"
              >
                <span>{t('editor.filename', 'Filename (.md)')}</span>
                <span className="text-danger ml-0.5" aria-hidden="true">
                  *
                </span>
              </label>
              <button
                type="button"
                onClick={handleGenerateDraftFilenameFromTitle}
                disabled={isBusy || !draftTitle.trim()}
                className="inline-flex items-center gap-1 text-2xs font-mono text-accent hover:underline disabled:text-ink-muted disabled:no-underline cursor-pointer"
              >
                <Wand2 className="w-3 h-3" />
                <span>
                  {t('editor.generate_filename', 'Generate from title')}
                </span>
              </button>
            </div>
            <Input
              id="drawer-filename-input"
              placeholder="e.g. product-overview.md"
              hint={t(
                'editor.filename_hint',
                'Technical identifier (.md). Independent once saved.'
              )}
              error={errors.filename}
              value={draftFilename}
              onChange={(e) => {
                setDraftFilename(e.target.value);
                setHasManuallyEditedFilename(true);
                if (errors.filename) {
                  setErrors((prev) => ({ ...prev, filename: undefined }));
                }
              }}
              disabled={isBusy}
              required
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Select
              label={t('editor.target_collection', 'Collection')}
              value={draftCollectionId}
              onChange={(e) => setDraftCollectionId(e.target.value)}
              disabled={isBusy}
              options={collections.map((col) => ({
                value: col.id,
                label: col.name,
              }))}
            />
            {draftSelectedCol && (
              <div className="p-2.5 bg-elevated border border-line rounded-sm flex items-center justify-between text-xs">
                <span className="text-ink-secondary">
                  {t('common.visibility', 'Visibility')}
                </span>
                <AccessBadge visibility={draftSelectedCol.visibility} />
              </div>
            )}
          </div>

          <Divider />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsIdentityDrawerOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyIdentityDrawer}
              disabled={isBusy}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t('editor.apply_identity', 'Apply Details')}</span>
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Dedicated Slide-In Panel (PR-DRAWER) for Next-Step CTA */}
      <Drawer
        isOpen={isCtaDrawerOpen}
        onClose={() => setIsCtaDrawerOpen(false)}
        position="right"
        width="400px"
        maxWidth="min(420px, 92vw)"
        title={t('editor.next_step_heading', 'Next-Step Action (CTA)')}
        subtitle={t(
          'editor.next_step_desc',
          'Surface a verified action button below answers when this document is cited.'
        )}
      >
        <div className="space-y-4">
          <Input
            type="text"
            label={t('editor.cta_label', 'Button Label')}
            placeholder="e.g. Explore Documentation"
            hint={t(
              'editor.cta_label_hint',
              'Short action-oriented call to action (2–80 characters).'
            )}
            error={errors.ctaLabel}
            value={draftCtaLabel}
            onChange={(e) => {
              setDraftCtaLabel(e.target.value);
              if (errors.ctaLabel) setErrors((prev) => ({ ...prev, ctaLabel: undefined }));
            }}
          />

          {/* Target Route or URL with / Autocomplete */}
          <div className="relative space-y-1.5">
            <Input
              type="text"
              label={t('editor.cta_url', 'Target Route or URL')}
              placeholder="e.g. /docs/getting-started or https://..."
              hint={t(
                'editor.cta_url_hint',
                'Type / to autocomplete internal routes, or use https://, mailto:, or tel:.'
              )}
              error={errors.ctaUrl}
              value={draftCtaUrl}
              onFocus={() => setIsRouteSuggestOpen(true)}
              onBlur={() => {
                setTimeout(() => setIsRouteSuggestOpen(false), 160);
              }}
              onChange={(e) => {
                setDraftCtaUrl(e.target.value);
                setIsRouteSuggestOpen(true);
                if (errors.ctaUrl) setErrors((prev) => ({ ...prev, ctaUrl: undefined }));
              }}
              className="font-mono"
            />

            {/* Internal / Route Autocomplete Dropdown */}
            {isRouteSuggestOpen &&
              (draftCtaUrl.trim() === '' || draftCtaUrl.trim().startsWith('/')) &&
              filteredRouteSuggestions.length > 0 && (
                <div className="border border-line rounded-sm bg-surface shadow-md max-h-48 overflow-y-auto divide-y divide-line">
                  <div className="px-2.5 py-1 bg-elevated text-2xs font-mono uppercase tracking-wider text-ink-secondary flex items-center justify-between">
                    <span>Internal Routes (/)</span>
                    <span>Click to select</span>
                  </div>
                  {filteredRouteSuggestions.map((route) => {
                    const isSelected = draftCtaUrl.trim() === route.path;
                    return (
                      <button
                        key={route.path}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setDraftCtaUrl(route.path);
                          if (!draftCtaLabel.trim()) {
                            setDraftCtaLabel(route.label);
                          }
                          setIsRouteSuggestOpen(false);
                          if (errors.ctaUrl) {
                            setErrors((prev) => ({ ...prev, ctaUrl: undefined }));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 text-xs hover:bg-subtle transition-colors cursor-pointer ${
                          isSelected ? 'bg-subtle font-medium text-ink' : 'text-ink-secondary'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-ink truncate">
                            {route.path}
                          </div>
                          <div className="text-2xs text-ink-muted truncate">
                            {route.label} · {route.category}
                          </div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>

          {/* Protocol & Target Classification Status */}
          <div className="p-3 bg-elevated border border-line rounded-sm space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-mono">
              <span className="text-ink-secondary uppercase">Target Classification</span>
              <span
                className={`font-semibold ${
                  draftTargetValidation.kind === 'Blocked'
                    ? 'text-danger'
                    : draftTargetValidation.kind === 'Empty'
                    ? 'text-ink-muted'
                    : 'text-success'
                }`}
              >
                {draftTargetValidation.kind === 'Empty'
                  ? 'None'
                  : draftTargetValidation.protocolLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-ink-secondary">
              <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>Allowed targets: internal `/path`, `https://`, `mailto:`, `tel:`</span>
            </div>
            {draftTargetValidation.kind === 'Blocked' &&
              draftTargetValidation.errorMessage && (
                <p className="text-2xs text-danger font-medium pt-1">
                  {draftTargetValidation.errorMessage}
                </p>
              )}
          </div>

          {/* Live CTA Preview */}
          {draftCtaLabel.trim() && draftTargetValidation.valid && draftCtaUrl.trim() && (
            <div className="space-y-1.5">
              <Text variant="mono-label" tone="secondary">
                Live Citation CTA Preview
              </Text>
              <div className="p-3 bg-surface border border-line rounded-sm">
                <NextStepButton
                  label={draftCtaLabel.trim()}
                  url={draftTargetValidation.sanitizedValue}
                />
              </div>
            </div>
          )}

          <Divider />

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearCta}
              disabled={!draftCtaLabel && !draftCtaUrl && !hasActiveCta}
              className="text-danger hover:bg-danger-subtle"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('editor.clear_cta', 'Clear CTA')}</span>
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsCtaDrawerOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplyCtaDrawer}>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('editor.apply_cta', 'Apply CTA')}</span>
              </Button>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Unsaved Changes Confirmation Modal (Navigation Guard) */}
      <Modal
        isOpen={Boolean(pendingNavigationAction)}
        onClose={() => setPendingNavigationAction(null)}
        title={t('editor.unsaved_modal_title', 'Unsaved Changes')}
        description={t(
          'editor.unsaved_modal_desc',
          'You have unsaved edits in this document. Leaving now will discard your changes.'
        )}
      >
        <div className="space-y-4">
          <div className="text-xs text-ink-secondary leading-relaxed">
            <p>
              Document:{' '}
              <span className="font-semibold text-ink">
                {title.trim() || t('editor.new_title', 'Untitled Document')}
              </span>{' '}
              (<span className="font-mono">{filename || generateFilenameFromTitle(title)}</span>)
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPendingNavigationAction(null)}
            >
              {t('editor.stay_in_editor', 'Stay in Editor')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                const proceed = pendingNavigationAction;
                setPendingNavigationAction(null);
                if (proceed) proceed();
              }}
            >
              {t('editor.discard_changes', 'Discard Changes')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
