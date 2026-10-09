import React, { useState, useEffect } from 'react';
import { FolderKanban, ShieldCheck } from 'lucide-react';
import { Collection } from '../types';
import { Drawer, Select, AccessBadge, Button, Divider } from './ui';
import { UploadDropzone } from './UploadDropzone';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md §3.1:
// Contextual File Upload Drawer (CO-UPLOAD-DRAWER)
//
// Normative Contract Invariant (lockedCollectionId Semantic Scope Lock):
//   "lockedCollectionId is a semantic scope lock, not merely a UI convenience.
//    When present, the upload mutation MUST resolve its destination exclusively
//    from that ID; the component MUST NOT derive the destination from selected
//    UI state or collection ordering."
//
// Abstraction Boundary:
//   - The drawer owns ingestion mechanics; the page owns semantic scope.
//   - In PAGE-APP-02 (CollectionDetailView), lockedCollectionId={collection.id}
//     locks destination to collection.id and omits the Target Collection selector.
//   - In PAGE-APP-04 (GlobalFilesView), lockedCollectionId is absent and the
//     user must explicitly select a Target Collection (zero collections[0] fallback).
// ============================================================================

export interface UploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  initialCollectionId?: string;
  lockedCollectionId?: string;
  onUploadComplete: () => void;
}

export const UploadDrawer: React.FC<UploadDrawerProps> = ({
  isOpen,
  onClose,
  collections,
  initialCollectionId,
  lockedCollectionId,
  onUploadComplete,
}) => {
  const { t } = useI18n();
  const isScopeLocked = Boolean(lockedCollectionId);

  const [targetCollectionId, setTargetCollectionId] = useState<string>(
    !isScopeLocked && initialCollectionId && initialCollectionId !== 'all'
      ? initialCollectionId
      : ''
  );

  useEffect(() => {
    if (isOpen && !isScopeLocked) {
      setTargetCollectionId(
        initialCollectionId && initialCollectionId !== 'all'
          ? initialCollectionId
          : ''
      );
    }
  }, [isOpen, isScopeLocked, initialCollectionId]);

  // Semantic Scope Lock Invariant:
  // When lockedCollectionId is present, resolve destination exclusively from lockedCollectionId.
  // Never derive destination from selected UI state or collection ordering.
  const selectedCollection = isScopeLocked
    ? collections.find((c) => c.id === lockedCollectionId)
    : collections.find((c) => c.id === targetCollectionId);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      position="right"
      title={t('files.upload_drawer_title', 'Upload Document to Collection')}
      subtitle={
        isScopeLocked
          ? t(
              'files.upload_drawer_locked_desc',
              'Drop or browse Markdown (.md) or text (.txt) files to index directly into this collection.'
            )
          : t(
              'files.upload_drawer_desc',
              'Select the destination collection boundary before dropping or browsing Markdown (.md) or text (.txt) files.'
            )
      }
      scopeBanner={
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider text-ink-muted">Mutation Scope</span>
            <span className="text-ink font-medium">Document Ingestion</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-wider text-ink-muted">Destination</span>
            <span className={selectedCollection ? 'text-accent font-medium' : 'text-warning'}>
              {selectedCollection
                ? selectedCollection.name
                : t('files.select_collection_prompt', 'Select Target Collection (Required)')}
            </span>
          </div>
          {selectedCollection && (
            <div className="flex items-center justify-between pt-0.5">
              <span className="uppercase tracking-wider text-ink-muted">
                {t('common.visibility', 'Pre-Retrieval Visibility')}
              </span>
              <AccessBadge visibility={selectedCollection.visibility} />
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Only render Target Collection selector when semantic scope is NOT locked by parent resource page */}
        {!isScopeLocked && (
          <>
            <div className="space-y-2">
              <Select
                label={t('editor.target_collection', 'Target Collection')}
                required
                value={targetCollectionId}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                options={[
                  {
                    value: '',
                    label: t(
                      'files.select_collection_placeholder',
                      'Select a destination collection...'
                    ),
                  },
                  ...collections.map((col) => ({
                    value: col.id,
                    label: col.name,
                  })),
                ]}
              />

              {selectedCollection && (
                <div className="p-2.5 bg-elevated border border-line rounded-sm flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-ink-secondary">
                    <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                    <span>{t('common.visibility', 'Pre-Retrieval Visibility')}</span>
                  </div>
                  <AccessBadge visibility={selectedCollection.visibility} />
                </div>
              )}
            </div>

            <Divider />
          </>
        )}

        {selectedCollection ? (
          <UploadDropzone
            collectionId={selectedCollection.id}
            onUploadComplete={() => {
              onUploadComplete();
            }}
          />
        ) : (
          <div className="p-6 border border-dashed border-line rounded-sm bg-elevated text-center space-y-2">
            <FolderKanban className="w-6 h-6 text-ink-muted mx-auto" />
            <p className="text-xs font-medium text-ink">
              {t(
                'files.choose_collection_first',
                'Choose a Target Collection above to enable file upload.'
              )}
            </p>
            <p className="text-2xs text-ink-secondary">
              {t(
                'files.choose_collection_hint',
                'Every ingested document inherits its pre-retrieval access boundary from its parent collection.'
              )}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-line">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel', 'Close')}
          </Button>
        </div>
      </div>
    </Drawer>
  );
};
