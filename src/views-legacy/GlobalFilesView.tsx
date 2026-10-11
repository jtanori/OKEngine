import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { KnowledgeDocument } from '../types';
import { store } from '../services/store';
import { PageHeader } from '../components/PageHeader';
import { FileTable, FileStatusFilter } from '../components/FileTable';
import { UploadDrawer } from '../components/UploadDrawer';
import { Button } from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// PAGE-APP-04: Global Files Data Directory (PA-DATA-DIRECTORY / SU-FILE-DIRECTORY)
//   - Level 2 Context: CO-PAGE-HEADER ([Upload File] + [Create Markdown])
//   - One Dataset → One Filter Model → One Filter Region (PR-FILTER-BAR inside FileTable)
//   - Contextual Upload: CO-UPLOAD-DRAWER requiring explicit Target Collection
// ============================================================================

interface GlobalFilesViewProps {
  onEditDocument: (docId: string) => void;
  onCreateMarkdown: () => void;
}

export const GlobalFilesView: React.FC<GlobalFilesViewProps> = ({
  onEditDocument,
  onCreateMarkdown,
}) => {
  const { t } = useI18n();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(store.getDocuments());
  const collections = store.getCollections();
  const [selectedColFilter, setSelectedColFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<FileStatusFilter>('all');
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  const refreshDocs = () => {
    setDocuments([...store.getDocuments()]);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title={t('files.title', 'All Workspace Files')}
        description={t(
          'files.desc',
          'Central directory of all ingested Markdown documents across every collection.'
        )}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              onClick={() => setIsUploadDrawerOpen(true)}
            >
              <Upload className="w-4 h-4" />
              <span>{t('files.upload_button', 'Upload File')}</span>
            </Button>
            <Button variant="primary" onClick={onCreateMarkdown}>
              <Plus className="w-4 h-4" />
              <span>{t('collections.create_markdown', 'Create Markdown')}</span>
            </Button>
          </div>
        }
      />

      <div className="p-8 w-full space-y-6">
        {/* Global Files Data Table with Unified Canonical Filter Region */}
        <FileTable
          documents={documents}
          onEditDocument={onEditDocument}
          showCollectionColumn={true}
          collections={collections}
          selectedCollectionId={selectedColFilter}
          onCollectionChange={setSelectedColFilter}
          selectedStatus={selectedStatusFilter}
          onStatusChange={setSelectedStatusFilter}
          onAfterMutate={refreshDocs}
        />
      </div>

      {/* Explicit-Scope Upload Slide-In Panel (CO-UPLOAD-DRAWER / PR-DRAWER-MD) */}
      <UploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        collections={collections}
        initialCollectionId={selectedColFilter !== 'all' ? selectedColFilter : undefined}
        onUploadComplete={refreshDocs}
      />
    </div>
  );
};
