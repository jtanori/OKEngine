import React, { useState, useMemo } from 'react';
import { Plus, FolderKanban, Search, Check } from 'lucide-react';
import { Collection, AccessVisibility } from '../types';
import { store } from '../services/store';
import { PageHeader } from '../components/PageHeader';
import { CollectionCard } from '../components/CollectionCard';
import { VisibilitySelector } from '../components/VisibilitySelector';
import {
  Button,
  Drawer,
  Input,
  Textarea,
  EmptyState,
  FilterBar,
  SegmentedTabs,
  AccessBadge,
  Text,
  Divider,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import {
  validatePlainText,
  containsUnsafePayload,
  sanitizePlainText,
} from '../services/formSecurity';

// ============================================================================
// PAGE-APP-01: Collections Directory (PA-DIRECTORY / SU-COLLECTION-DIRECTORY)
//   - Level 2 Context: CO-PAGE-HEADER
//   - Canonical Filter Region: PR-FILTER-BAR (Search + Visibility Filter Tabs)
//   - Resource Grid: 3-column CO-COLLECTION-CARD conceptual entities
//   - Contextual Creation: PR-DRAWER-MD with explicit Workspace + Visibility scope
// ============================================================================

export interface CollectionsViewProps {
  onSelectCollection: (collectionId: string) => void;
}

type VisibilityFilter = 'all' | AccessVisibility;

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  onSelectCollection,
}) => {
  const { t } = useI18n();
  const workspace = store.getWorkspace();
  const [collections, setCollections] = useState<Collection[]>(store.getCollections());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

  // PR-DRAWER-MD state for New Collection
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColVisibility, setNewColVisibility] = useState<AccessVisibility>('everyone');
  const [formErrors, setFormErrors] = useState<{ name?: string; desc?: string }>({});
  const [isCreating, setIsCreating] = useState(false);

  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      if (visibilityFilter !== 'all' && col.visibility !== visibilityFilter) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        col.name.toLowerCase().includes(q) ||
        col.description.toLowerCase().includes(q) ||
        col.id.toLowerCase().includes(q)
      );
    });
  }, [collections, visibilityFilter, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;

    const nameCheck = validatePlainText(newColName, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('collections.name_label', 'Collection Name'),
    });
    const descCheck = validatePlainText(newColDesc, {
      required: false,
      maxLength: 400,
      fieldLabel: t('collections.desc_label', 'Description'),
    });

    const nextErrors: { name?: string; desc?: string } = {};
    if (!nameCheck.valid) {
      nextErrors.name = t(
        nameCheck.errorKey || 'validation.required',
        nameCheck.errorMessage
      );
    }
    if (!descCheck.valid) {
      nextErrors.desc = t(
        descCheck.errorKey || 'validation.unsafe_input',
        descCheck.errorMessage
      );
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsCreating(true);
    setTimeout(() => {
      store.createCollection(
        nameCheck.sanitizedValue,
        descCheck.sanitizedValue,
        newColVisibility
      );
      setCollections(store.getCollections());
      setIsCreating(false);
      setIsCreateDrawerOpen(false);
      setNewColName('');
      setNewColDesc('');
      setNewColVisibility('everyone');
      setFormErrors({});
    }, 180);
  };

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title={t('collections.title', 'Knowledge Collections')}
        description={t(
          'collections.desc',
          'Group related documentation and set access boundaries. Visibility rules are enforced strictly before vector retrieval.'
        )}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setFormErrors({});
              setIsCreateDrawerOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>{t('collections.create', 'New Collection')}</span>
          </Button>
        }
      />

      <div className="p-8 w-full space-y-5">
        {/* Canonical Filter Region (PR-FILTER-BAR) */}
        <FilterBar
          variant="card"
          searchSlot={
            <Input
              type="text"
              sizeVariant="sm"
              leadingIcon={<Search className="w-3.5 h-3.5" />}
              placeholder={t(
                'collections.search_placeholder',
                'Filter collections by name or topic...'
              )}
              value={searchQuery}
              error={searchError || undefined}
              aria-label={t(
                'collections.search_placeholder',
                'Filter collections by name or topic...'
              )}
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
            <SegmentedTabs<VisibilityFilter>
              size="sm"
              activeId={visibilityFilter}
              onChange={setVisibilityFilter}
              options={[
                { id: 'all', label: `${t('common.all', 'All')} (${collections.length})` },
                { id: 'everyone', label: t('common.everyone', 'Public') },
                { id: 'members', label: t('common.members', 'Members') },
                { id: 'admins', label: t('common.admins', 'Admins') },
              ]}
            />
          }
          summarySlot={
            <Text variant="mono" tone="secondary" className="tabular-nums">
              {filteredCollections.length} / {collections.length}{' '}
              {t('nav.collections', 'collections').toLowerCase()}
            </Text>
          }
        />

        {/* Conceptual Entity Card Grid */}
        {filteredCollections.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="w-7 h-7" />}
            title={t(
              'collections.empty',
              'No collections match your current filter.'
            )}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCollections.map((col) => {
              const colDocs = store.getDocuments(col.id);
              const readyCount = colDocs.filter((d) => d.status === 'ready').length;
              const processingCount = colDocs.filter((d) => d.status !== 'ready').length;

              return (
                <CollectionCard
                  key={col.id}
                  collection={col}
                  totalCount={colDocs.length}
                  readyCount={readyCount}
                  processingCount={processingCount}
                  onSelect={onSelectCollection}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Contextual Creation Slide-In Panel (PR-DRAWER-MD) */}
      <Drawer
        isOpen={isCreateDrawerOpen}
        onClose={() => !isCreating && setIsCreateDrawerOpen(false)}
        size="md"
        position="right"
        title={t('collections.modal_title', 'Create Knowledge Collection')}
        subtitle={t(
          'collections.modal_desc',
          'Collections isolate documents by topic and user role clearance.'
        )}
        scopeBanner={
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">Workspace</span>
              <span className="text-ink font-medium">{workspace.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-wider text-ink-muted">
                Access Clearance
              </span>
              <AccessBadge visibility={newColVisibility} />
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <Input
            label={t('collections.name_label', 'Collection Name')}
            placeholder="e.g. Developer Guides, Internal SOPs"
            hint={t('collections.name_hint')}
            error={formErrors.name}
            value={newColName}
            onChange={(e) => {
              setNewColName(e.target.value);
              if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
            }}
            disabled={isCreating}
            required
            autoFocus
          />

          <Textarea
            label={t('collections.desc_label', 'Description')}
            placeholder="Briefly describe what documentation belongs here..."
            hint={t('collections.desc_hint')}
            error={formErrors.desc}
            value={newColDesc}
            onChange={(e) => {
              setNewColDesc(e.target.value);
              if (formErrors.desc) setFormErrors((prev) => ({ ...prev, desc: undefined }));
            }}
            disabled={isCreating}
            rows={3}
          />

          <VisibilitySelector
            label={t('collections.access_label', 'Access Visibility (Pre-Retrieval Filter)')}
            value={newColVisibility}
            onChange={setNewColVisibility}
          />

          <Divider />

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={isCreating}
              onClick={() => setIsCreateDrawerOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreating}>
              <Check className="w-3.5 h-3.5" />
              <span>{t('collections.create', 'New Collection')}</span>
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};
