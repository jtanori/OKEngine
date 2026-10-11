import React, { useState } from 'react';
import { Plus, Upload, FlaskConical } from 'lucide-react';
import { Collection, AccessVisibility, KnowledgeDocument } from '../types';
import { store } from '../services/store';
import { ChildContextNavbar } from '../components/ChildContextNavbar';
import { UploadDrawer } from '../components/UploadDrawer';
import { FileTable, FileStatusFilter } from '../components/FileTable';
import { VisibilitySelector } from '../components/VisibilitySelector';
import { Button, EmptyState, Text } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// PAGE-APP-02: Collection Detail Workspace (PA-RESOURCE-DETAIL / SU-COLLECTION-DETAIL)
//
// Normative Architecture:
//   PAGE-APP-02 Collection Detail
//   └── PA-RESOURCE-DETAIL
//       ├── CO-APP-SHELL (56px resource rail)
//       ├── CO-CHILD-NAVBAR
//       │   ├── Surface 1: Back | Collections > {name} | VisibilitySelector | Test Retrieval
//       │   └── Surface 2: {name} + {description} | Upload File | Create Markdown
//       ├── FileTable (scopedCollectionName={collection.name}, showCollectionColumn=false)
//       │   └── PR-FILTER-BAR (Collection-scoped Search + Status)
//       └── CO-UPLOAD-DRAWER (lockedCollectionId={collection.id} -> NO Target Collection selector)
// ============================================================================

interface CollectionDetailViewProps {
  collectionId: string;
  onBack: () => void;
  onEditDocument: (docId: string) => void;
  onCreateMarkdown: (collectionId: string) => void;
  onTestCollection: (collectionId: string) => void;
}

export const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collectionId,
  onBack,
  onEditDocument,
  onCreateMarkdown,
  onTestCollection,
}) => {
  const { t } = useI18n();
  const [collection, setCollection] = useState<Collection | undefined>(
    store.getCollection(collectionId)
  );
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(
    store.getDocuments(collectionId)
  );
  const [statusFilter, setStatusFilter] = useState<FileStatusFilter>('all');
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  if (!collection) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <EmptyState
          title={t('collections.empty', 'Collection not found')}
          action={
            <Button variant="secondary" size="sm" onClick={onBack}>
              {t('common.back', 'Back')}
            </Button>
          }
        />
      </div>
    );
  }

  const handleVisibilityChange = (visibility: AccessVisibility) => {
    store.updateCollection(collection.id, { visibility });
    setCollection(store.getCollection(collection.id));
  };

  const refreshDocuments = () => {
    setDocuments([...store.getDocuments(collection.id)]);
    setCollection(store.getCollection(collection.id));
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Two-Surface Canonical Child Context Navbar (CO-CHILD-NAVBAR) */}
      <ChildContextNavbar
        onBack={onBack}
        breadcrumb={[
          { label: t('nav.collections', 'Collections'), onClick: onBack },
          { label: collection.name },
        ]}
        contextMetadata={
          <div className="flex items-center gap-1.5 text-xs">
            <Text variant="caption" tone="secondary">
              {t('common.visibility', 'Visibility')}:
            </Text>
            <VisibilitySelector
              layout="inline"
              value={collection.visibility}
              onChange={handleVisibilityChange}
            />
          </div>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onTestCollection(collection.id)}
          >
            <FlaskConical className="w-3.5 h-3.5 text-accent" />
            <span>{t('collections.test_retrieval', 'Test Retrieval')}</span>
          </Button>
        }
      >
        {/* Surface 2: Resource Identity & File Actions (24px resource axis: px-6) */}
        <div className="px-6 py-4 border-t border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <Text variant="h1" tone="primary">
              {collection.name}
            </Text>
            <Text variant="body" tone="secondary" className="mt-1">
              {collection.description}
            </Text>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              onClick={() => setIsUploadDrawerOpen(true)}
            >
              <Upload className="w-4 h-4" />
              <span>{t('files.upload_button', 'Upload File')}</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => onCreateMarkdown(collection.id)}
            >
              <Plus className="w-4 h-4" />
              <span>{t('collections.create_markdown', 'Create Markdown')}</span>
            </Button>
          </div>
        </div>
      </ChildContextNavbar>

      {/* Content Configuration Matching GlobalFilesView (24px resource axis: p-6 w-full fluid FileTable) */}
      <div className="p-6 w-full space-y-6">
        <FileTable
          documents={documents}
          onEditDocument={onEditDocument}
          showCollectionColumn={false}
          scopedCollectionName={collection.name}
          selectedStatus={statusFilter}
          onStatusChange={setStatusFilter}
          onAfterMutate={refreshDocuments}
        />
      </div>

      {/* Collection-Locked Upload Drawer (lockedCollectionId = semantic scope lock, no Target Collection selector) */}
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        collections={[collection]}
        lockedCollectionId={collection.id}
        onUploadComplete={refreshDocuments}
      />
    </div>
  );
};
