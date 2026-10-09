import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  RotateCw,
  Search,
  Globe,
} from 'lucide-react';
import { KnowledgeDocument, Collection } from '../types';
import { store } from '../services/store';
import {
  AccessBadge,
  StatusIndicator,
  Badge,
  Button,
  Input,
  Select,
  FilterBar,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
  EmptyState,
  Text,
} from './ui';
import { useI18n } from '../i18n/I18nContext';
import { containsUnsafePayload, sanitizePlainText } from '../services/formSecurity';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md §3.2:
// High-Density Document Table (CO-FILE-ROW)
//
// Normative Contract Invariant (scopedCollectionName Filter Model Invariant):
//   "When scopedCollectionName is provided, the table operates against the
//    already collection-scoped dataset supplied by the parent. It MUST NOT
//    render or maintain a competing collection filter."
//
// Enforces:
//   - One dataset -> one filter model -> one filter region (PR-FILTER-BAR)
//   - Interaction Affordance Invariant: Clicking row opens File Editor;
//     nested Re-index / Delete buttons isolate click events via stopPropagation()
// ============================================================================

export type FileStatusFilter = 'all' | 'ready' | 'processing' | 'failed';

interface FileTableProps {
  documents: KnowledgeDocument[];
  onEditDocument: (docId: string) => void;
  showCollectionColumn?: boolean;
  /**
   * When provided, signals that the parent page (e.g. PAGE-APP-02 Collection Detail)
   * has already scoped `documents` to a single collection. FileTable bounds its
   * search placeholder to this collection name and never renders or evaluates
   * a competing collection filter or Collection column.
   */
  scopedCollectionName?: string;
  collections?: Collection[];
  selectedCollectionId?: string;
  onCollectionChange?: (collectionId: string) => void;
  selectedStatus?: FileStatusFilter;
  onStatusChange?: (status: FileStatusFilter) => void;
  onAfterMutate?: () => void;
}

export const FileTable: React.FC<FileTableProps> = ({
  documents,
  onEditDocument,
  showCollectionColumn = true,
  scopedCollectionName,
  collections,
  selectedCollectionId,
  onCollectionChange,
  selectedStatus: controlledStatus,
  onStatusChange,
  onAfterMutate,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [internalStatus, setInternalStatus] = useState<FileStatusFilter>('all');
  const [reindexingDocId, setReindexingDocId] = useState<string | null>(null);

  // Scoped Filter Model Invariant:
  // When scopedCollectionName is provided, the table operates strictly against
  // the already collection-scoped dataset supplied by the parent.
  const isCollectionScoped = Boolean(scopedCollectionName);
  const effectiveShowCollectionColumn = isCollectionScoped ? false : showCollectionColumn;

  const activeStatus = controlledStatus ?? internalStatus;
  const handleStatusChange = (nextStatus: FileStatusFilter) => {
    if (onStatusChange) {
      onStatusChange(nextStatus);
    } else {
      setInternalStatus(nextStatus);
    }
  };

  const allCollections = collections || store.getCollections();
  const collectionsMap = new Map(allCollections.map((c) => [c.id, c]));

  const searchPlaceholder = isCollectionScoped
    ? t(
        'files.search_in_collection_placeholder',
        'Filter files in {collection} by title or filename...'
      ).replace('{collection}', scopedCollectionName || '')
    : t('files.search_placeholder', 'Filter files by title or filename...');

  const filteredDocs = documents.filter((doc) => {
    if (
      !isCollectionScoped &&
      selectedCollectionId &&
      selectedCollectionId !== 'all' &&
      doc.collectionId !== selectedCollectionId
    ) {
      return false;
    }
    if (activeStatus !== 'all' && doc.status !== activeStatus) {
      return false;
    }
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.filename.toLowerCase().includes(q) ||
      doc.content.toLowerCase().includes(q)
    );
  });

  const handleReindex = (docId: string) => {
    setReindexingDocId(docId);
    store.reindexDocument(docId);
    setTimeout(() => {
      setReindexingDocId(null);
      onAfterMutate?.();
    }, 650);
  };

  const handleDelete = (docId: string) => {
    store.deleteDocument(docId);
    onAfterMutate?.();
  };

  return (
    <TableContainer>
      {/* Canonical Filter Region (PR-FILTER-BAR) */}
      <FilterBar
        variant="table"
        searchSlot={
          <Input
            type="text"
            sizeVariant="sm"
            leadingIcon={<Search className="w-3.5 h-3.5" />}
            placeholder={searchPlaceholder}
            value={searchQuery}
            error={searchError || undefined}
            aria-label={searchPlaceholder}
            onChange={(e) => {
              const val = e.target.value;
              if (containsUnsafePayload(val)) {
                setSearchError(t('validation.unsafe_input'));
                setSearchQuery(sanitizePlainText(val, 120));
              } else {
                setSearchError(null);
                setSearchQuery(val.slice(0, 120));
              }
            }}
          />
        }
        filtersSlot={
          <>
            {!isCollectionScoped && effectiveShowCollectionColumn && onCollectionChange && (
              <Select
                sizeVariant="sm"
                aria-label={t('common.collection', 'Collection')}
                value={selectedCollectionId || 'all'}
                onChange={(e) => onCollectionChange(e.target.value)}
                options={[
                  {
                    value: 'all',
                    label: `${t('files.all_collections', 'All Collections')} (${documents.length})`,
                  },
                  ...allCollections.map((col) => ({
                    value: col.id,
                    label: col.name,
                  })),
                ]}
                className="w-52"
              />
            )}

            <Select
              sizeVariant="sm"
              aria-label={t('common.status', 'Status')}
              value={activeStatus}
              onChange={(e) => handleStatusChange(e.target.value as FileStatusFilter)}
              options={[
                { value: 'all', label: t('files.all_statuses', 'All Statuses') },
                { value: 'ready', label: t('common.ready', 'Ready') },
                { value: 'processing', label: t('common.processing', 'Processing') },
                { value: 'failed', label: t('common.failed', 'Failed') },
              ]}
              className="w-40"
            />
          </>
        }
        summarySlot={
          <Text variant="mono" tone="secondary" className="tabular-nums">
            {filteredDocs.length} / {documents.length}{' '}
            {t('common.documents', 'documents').toLowerCase()}
          </Text>
        }
      />

      {/* Table Structure */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-7 h-7" />}
          title={t('files.empty', 'No documents match your current filter.')}
          className="border-0 rounded-none"
        />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>{t('files.col_document', 'Document')}</TableHeaderCell>
              {effectiveShowCollectionColumn && (
                <TableHeaderCell>{t('files.col_collection', 'Collection')}</TableHeaderCell>
              )}
              <TableHeaderCell>{t('files.col_visibility', 'Visibility')}</TableHeaderCell>
              <TableHeaderCell>{t('files.col_status', 'Status')}</TableHeaderCell>
              <TableHeaderCell>{t('files.col_chunks', 'Chunks')}</TableHeaderCell>
              <TableHeaderCell>{t('files.col_updated', 'Updated')}</TableHeaderCell>
              <TableHeaderCell align="right">
                {t('files.col_actions', 'Actions')}
              </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {filteredDocs.map((doc) => {
              const col = collectionsMap.get(doc.collectionId);
              const isReindexingThis =
                reindexingDocId === doc.id || doc.status === 'processing';
              return (
                <TableRow
                  key={doc.id}
                  onClick={() => onEditDocument(doc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onEditDocument(doc.id);
                    }
                  }}
                  className="group cursor-pointer focus:outline-none focus:bg-subtle/60"
                >
                  <TableCell>
                    <div className="flex items-start gap-2.5">
                      <FileText className="w-4 h-4 text-ink-muted mt-0.5 shrink-0 group-hover:text-ink transition-colors" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-ink group-hover:text-accent transition-colors">
                            {doc.title}
                          </span>
                          <Badge tone="neutral" mono uppercase>
                            <Globe className="w-2.5 h-2.5" />
                            {doc.language || 'en'}
                          </Badge>
                        </div>
                        <div className="text-2xs font-mono text-ink-muted mt-0.5 flex items-center gap-2">
                          <span>{doc.filename}</span>
                          <span>·</span>
                          <span>{doc.fileSize}</span>
                          {doc.nextStep && (
                            <Badge tone="accent" mono>
                              CTA: {doc.nextStep.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {effectiveShowCollectionColumn && (
                    <TableCell>
                      <span className="text-ink-secondary">
                        {col ? col.name : 'Unknown'}
                      </span>
                    </TableCell>
                  )}

                  <TableCell>
                    {col && <AccessBadge visibility={col.visibility} />}
                  </TableCell>

                  <TableCell>
                    <StatusIndicator status={doc.status} />
                  </TableCell>

                  <TableCell className="font-mono tabular-nums">
                    <span className="text-ink-secondary">{doc.chunkCount}</span>
                  </TableCell>

                  <TableCell className="font-mono tabular-nums">
                    <span className="text-ink-muted">{doc.updatedAt}</span>
                  </TableCell>

                  <TableCell
                    align="right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        isLoading={isReindexingThis}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReindex(doc.id);
                        }}
                        title={t('files.reindex', 'Re-index document')}
                        aria-label={t('files.reindex', 'Re-index document')}
                      >
                        {!isReindexingThis && <RotateCw className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        title={t('common.delete', 'Delete')}
                        aria-label={t('common.delete', 'Delete')}
                        className="hover:text-danger hover:bg-danger-subtle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </TableContainer>
  );
};
