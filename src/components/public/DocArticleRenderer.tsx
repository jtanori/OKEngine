import React from 'react';
import { FileText } from 'lucide-react';
import { KnowledgeDocument } from '../../types';
import { ContentRenderer, CallerRoleKind, RenderContext } from '../../content';
import { authService } from '../../services/auth';
import { store } from '../../services/store';
import { useI18n } from '../../i18n/I18nContext';
import { Card, Text, InfoPopover } from '../ui';

// ============================================================================
// UI-01 §2.2 & RENDER-001 §22: Document Article Viewer (CO-DOCUMENT-VIEWER)
// Displays friendly collection & filename labels in the header with a '?'
// InfoPopover for technical Document ID, Collection ID, and indexing metadata.
// ============================================================================

export interface DocArticleRendererProps {
  document?: KnowledgeDocument;
  rawMarkdown?: string;
  sourceLabel?: string;
  context?: RenderContext;
  roleKindOverride?: CallerRoleKind;
  onEditInWorkspace?: (docId: string) => void;
}

export const DocArticleRenderer: React.FC<DocArticleRendererProps> = ({
  document,
  rawMarkdown,
  sourceLabel,
  context = 'DOCUMENT_FULL',
  roleKindOverride,
  onEditInWorkspace,
}) => {
  const { language: uiLanguage, t } = useI18n();
  const rawContent = document ? document.content : rawMarkdown || '';

  // RENDER-027 & RENDER-001 §30: Evaluate whether current caller holds workspace edit permission
  const resolvedRoleKind: CallerRoleKind = React.useMemo(() => {
    if (roleKindOverride) return roleKindOverride;
    const sessionCheck = authService.enforceWorkspaceAccess('okeng');
    if (!sessionCheck.authorized) return 'anonymous';
    const editCheck = authService.enforceWorkspaceAccess('okeng', 'content.write');
    return editCheck.authorized ? 'authenticated_editor' : 'authenticated_reader';
  }, [roleKindOverride]);

  const collectionObj = document ? store.getCollection(document.collectionId) : undefined;
  const friendlyCollectionName =
    collectionObj?.name || (document ? document.collectionId : 'Engineering Specifications');

  const isPublicDoc =
    !document ||
    document.collectionId === 'COL-PUBLIC' ||
    document.collectionId === 'COL-DOCS' ||
    document.collectionId === 'COL-LEGAL';

  return (
    <Card variant="surface" padding="none">
      {/* Deterministic Source Metadata Header (Separated from Markdown body per RENDER-001 §22) */}
      <div
        data-document-metadata="true"
        className="px-6 py-3 bg-elevated border-b border-line rounded-t-sm flex flex-wrap items-center justify-between gap-2 print:hidden"
      >
        <div className="flex items-center gap-2 text-xs text-ink">
          <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="font-semibold">
            {document ? document.title : sourceLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <InfoPopover
            title={t('info.document_details', 'Document & Collection Metadata')}
            description={t(
              'info.document_desc',
              'Authoritative source file indexed in the OKEng workspace.'
            )}
            items={
              document
                ? [
                    {
                      label: t('common.collection', 'Collection'),
                      value: friendlyCollectionName,
                      mono: false,
                    },
                    {
                      label: t('info.collection_ids', 'Collection ID'),
                      value: document.collectionId,
                    },
                    {
                      label: t('info.document_id', 'Document ID'),
                      value: document.id,
                    },
                    {
                      label: t('info.filename', 'Source Filename'),
                      value: document.filename,
                    },
                    {
                      label: t('files.col_updated', 'Updated'),
                      value: new Date(document.updatedAt).toISOString().split('T')[0],
                    },
                    {
                      label: t('info.chunks', 'Indexed Chunks'),
                      value: `${document.chunkCount} (${document.fileSize})`,
                    },
                    {
                      label: t('info.access_level', 'Access Clearance'),
                      value: collectionObj?.visibility || 'everyone',
                    },
                  ]
                : [
                    {
                      label: t('common.collection', 'Collection'),
                      value: 'Engineering Specifications',
                      mono: false,
                    },
                    {
                      label: t('info.filename', 'Source Filename'),
                      value: sourceLabel || 'specification.md',
                    },
                    {
                      label: t('info.access_level', 'Access Clearance'),
                      value: 'Authenticated Session',
                      mono: false,
                    },
                  ]
            }
          />
        </div>
      </div>

      {/* Canonical CO-CONTENT-RENDERER Body & Progressive-Disclosure Toolbar */}
      <div className="p-6">
        <ContentRenderer
          content={rawContent}
          context={context}
          locale={uiLanguage}
          roleKind={resolvedRoleKind}
          documentId={document?.id}
          documentTitle={document?.title || sourceLabel || 'okeng-document'}
          collectionId={document?.collectionId || 'COL-DOCS'}
          isPublicDocument={isPublicDoc}
          onEditSource={
            document && onEditInWorkspace
              ? (docId) => onEditInWorkspace(docId)
              : undefined
          }
        />
      </div>
    </Card>
  );
};
