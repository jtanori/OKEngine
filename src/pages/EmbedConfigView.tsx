import React, { useState, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  Plus,
  Sliders,
  Layers,
  Code2,
  Sparkles,
  Search,
  Pencil,
  Check,
  ArrowLeft,
  ArrowRight,
  Files,
  Trash2,
  Route as RouteIcon,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { store } from '../services/store';
import {
  EmbedInstance,
  EmbedPresentationMode,
  EmbedRouteRule,
} from '../types';
import { PageHeader } from '../components/PageHeader';
import { ChildContextNavbar } from '../components/ChildContextNavbar';
import { useAppShell } from '../components/AppShell';
import {
  EmbedCard,
  EMBED_MODE_METADATA,
  ACCENT_PRESETS,
  normalizeAccentHex,
  evaluateEmbedReadiness,
  evaluateEmbedInstallationContract,
  EmbedStatusBadge,
} from '../components/EmbedCard';
import {
  Card,
  CardHeader,
  Box,
  Text,
  Button,
  Input,
  Select,
  Checkbox,
  SegmentedTabs,
  Badge,
  InfoPopover,
  FilterBar,
  Drawer,
  EmptyState,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';
import {
  validatePlainText,
  validateCssWidthToken,
  containsUnsafePayload,
  sanitizePlainText,
} from '../services/formSecurity';

// ============================================================================
// PAGE-APP-05 & EMBED-02: Embeds Directory & URL-Addressed Resource Studio
//   - Stage 1 (!selectedEmbed): PA-DIRECTORY (SU-EMBED-DIRECTORY)
//       Preserves sidebarPosture + CO-PAGE-HEADER + PR-FILTER-BAR + CO-EMBED-CARD
//   - Stage 2 (selectedEmbed): PA-RESOURCE-CONFIGURATION (SU-EMBED-RESOURCE-CONFIG)
//       Preserves sidebarPosture + Surface 1 (CO-CHILD-NAVBAR) + Surface 2 (Identity & Actions)
//       + Body-level PR-TABS (1. Mode & Knowledge | 2. Context & Behavior | 3. Installation)
//       + 1 of 3 Step Progression Footer -> Launches /workspaces/:slug/embeds/:embedId/installation
// ============================================================================

export type EmbedConfigSection = 'mode_scope' | 'context_theme' | 'installation';

function normalizeTabParam(raw?: string | null): EmbedConfigSection | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase();
  if (clean === 'mode_scope' || clean === 'mode' || clean === '1') return 'mode_scope';
  if (
    clean === 'context_theme' ||
    clean === 'context_behavior' ||
    clean === 'context' ||
    clean === 'behavior' ||
    clean === '2'
  ) {
    return 'context_theme';
  }
  if (clean === 'installation' || clean === 'integration' || clean === '3') {
    return 'installation';
  }
  return null;
}

export interface EmbedConfigViewProps {
  initialSelectedEmbedId?: string | null;
  initialTab?: string | null;
  onSelectEmbed?: (embedId: string | null, tab?: string) => void;
  onOpenInstallation?: (embedId: string) => void;
  onOpenWidgetPreview: (embedId?: string, fromEmbedDetail?: boolean) => void;
}

const DEFAULT_APPEARANCE = {
  theme: 'light' as const,
  width: '380px',
  position: 'bottom-right' as const,
  radius: '4px',
  accentColor: '#1D4ED8',
  surfaceColor: '#FFFFFF',
  textColor: '#171717',
  mutedColor: '#6B6B67',
  borderColor: '#DEDDD8',
};

export const EmbedConfigView: React.FC<EmbedConfigViewProps> = ({
  initialSelectedEmbedId = null,
  initialTab = null,
  onSelectEmbed,
  onOpenInstallation,
  onOpenWidgetPreview,
}) => {
  const { t } = useI18n();
  const { setNavigationContextOverride, routeReselectTick } = useAppShell();
  const workspace = store.getWorkspace();
  const collections = store.getCollections();
  const allDocuments = store.getDocuments();

  const [embeds, setEmbeds] = useState<EmbedInstance[]>(store.getEmbeds());
  const [selectedEmbedId, setSelectedEmbedId] = useState<string | null>(
    initialSelectedEmbedId
  );
  const initialTickRef = React.useRef(routeReselectTick);

  // Sync URL-addressed embedId prop when browser Back/Forward or route changes
  useEffect(() => {
    setSelectedEmbedId(initialSelectedEmbedId || null);
  }, [initialSelectedEmbedId]);

  // Stage 2 Configuration Navigation (Body-level PR-TABS)
  const [activeConfigSection, setActiveConfigSection] = useState<EmbedConfigSection>(
    () => normalizeTabParam(initialTab) || 'mode_scope'
  );

  useEffect(() => {
    const mapped = normalizeTabParam(initialTab);
    if (mapped) {
      setActiveConfigSection(mapped);
    }
  }, [initialTab]);

  const selectedEmbed = selectedEmbedId
    ? embeds.find((e) => e.id === selectedEmbedId)
    : undefined;

  // When the operator clicks the active "Embed" item in CO-SIDEBAR while inside Embed Detail,
  // deterministically exit 'resource' context back to the Stage 1 Embeds Directory.
  useEffect(() => {
    if (routeReselectTick !== initialTickRef.current) {
      initialTickRef.current = routeReselectTick;
      setSelectedEmbedId(null);
      onSelectEmbed?.(null);
    }
  }, [routeReselectTick, onSelectEmbed]);

  // Stage 1 Canonical Filter Model (PR-FILTER-BAR)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | EmbedPresentationMode>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');

  // Stage 1 Create Embed Drawer (PR-DRAWER-MD)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [newEmbedName, setNewEmbedName] = useState('');
  const [newEmbedError, setNewEmbedError] = useState<string | null>(null);
  const [newEmbedMode, setNewEmbedMode] = useState<EmbedPresentationMode>('widget');
  const [newEmbedCols, setNewEmbedCols] = useState<string[]>(['COL-PUBLIC']);

  // Stage 2 Identity Edit Drawer
  const [isIdentityDrawerOpen, setIsIdentityDrawerOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftStatus, setDraftStatus] = useState<'active' | 'draft'>('active');
  const [draftNameError, setDraftNameError] = useState<string | null>(null);

  // Stage 2 field-level validation state
  const [greetingError, setGreetingError] = useState<string | null>(null);
  const [placeholderError, setPlaceholderError] = useState<string | null>(null);
  const [widthInputValue, setWidthInputValue] = useState<string | null>(null);
  const [widthError, setWidthError] = useState<string | null>(null);

  // Stage 2 interactive Suggested Questions & Route Rules state
  const [newSuggestedQuestion, setNewSuggestedQuestion] = useState('');
  const [suggestedQuestionError, setSuggestedQuestionError] = useState<string | null>(null);

  const [isAddingRouteRule, setIsAddingRouteRule] = useState(false);
  const [rulePattern, setRulePattern] = useState('/settings/security/sso');
  const [ruleTitle, setRuleTitle] = useState('Need help configuring SSO?');
  const [ruleQuestionsRaw, setRuleQuestionsRaw] = useState(
    'How do I configure Okta SAML SSO?, How do I rotate signing keys?'
  );
  const [ruleDocIds, setRuleDocIds] = useState<string[]>([]);
  const [ruleError, setRuleError] = useState<string | null>(null);

  // Enforce Resource Context State Machine Invariant (§2.3 & DS-SIDEBAR-POSTURE-001):
  // Entering Embed Detail switches navigationContext to 'resource' (CO-CHILD-NAVBAR + 24px axis);
  // returning to All Embeds exits 'resource' context back to 'workspace' (CO-PAGE-HEADER + 32px axis),
  // without mutating the user's persistent sidebarPosture.
  useEffect(() => {
    setNavigationContextOverride(selectedEmbed ? 'resource' : null);
    return () => setNavigationContextOverride(null);
  }, [selectedEmbed, setNavigationContextOverride]);

  const refreshEmbeds = () => {
    setEmbeds([...store.getEmbeds()]);
  };

  const navigateToEmbed = (embedId: string | null, tab?: EmbedConfigSection) => {
    setSelectedEmbedId(embedId);
    if (tab) {
      setActiveConfigSection(tab);
    } else if (embedId) {
      setActiveConfigSection('mode_scope');
    }
    setWidthInputValue(null);
    setWidthError(null);
    setGreetingError(null);
    setPlaceholderError(null);
    onSelectEmbed?.(embedId, tab);
  };

  const handleSwitchSection = (nextSection: EmbedConfigSection) => {
    setActiveConfigSection(nextSection);
    if (selectedEmbed) {
      onSelectEmbed?.(selectedEmbed.id, nextSection);
    }
  };

  const handleOpenInstallGuide = (embedId: string) => {
    onOpenInstallation?.(embedId);
  };

  const filteredEmbeds = useMemo(() => {
    return embeds.filter((emb) => {
      const m = emb.mode || 'widget';
      const s = emb.status || 'active';
      if (modeFilter !== 'all' && m !== modeFilter) return false;
      if (statusFilter !== 'all' && s !== statusFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        emb.name.toLowerCase().includes(q) ||
        emb.id.toLowerCase().includes(q) ||
        m.toLowerCase().includes(q)
      );
    });
  }, [embeds, modeFilter, statusFilter, searchQuery]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value && containsUnsafePayload(value)) {
      setSearchError(
        t('security.unsafe_input', 'HTML tags and script patterns are not permitted.')
      );
    } else {
      setSearchError(null);
    }
  };

  const handleCreateEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingCreate) return;

    const validation = validatePlainText(newEmbedName, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('embed.assistant_name', 'Embed Name'),
    });
    if (!validation.valid) {
      setNewEmbedError(validation.error);
      return;
    }
    if (newEmbedCols.length === 0) {
      setNewEmbedError('Select at least one knowledge collection for this Embed.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const created = store.createEmbed({
        name: validation.sanitized,
        mode: newEmbedMode,
        collectionIds: newEmbedCols,
      });
      refreshEmbeds();
      setNewEmbedName('');
      setNewEmbedError(null);
      setIsCreateDrawerOpen(false);
      // WF-EMBED-01: Navigate directly to Tab 1 (?tab=mode_scope) so the operator can configure
      navigateToEmbed(created.id, 'mode_scope');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleDuplicateEmbed = (embedId: string) => {
    const copy = store.duplicateEmbed(embedId);
    if (copy) {
      refreshEmbeds();
      navigateToEmbed(copy.id, 'mode_scope');
    }
  };

  const handleDeleteEmbed = (embedId: string) => {
    if (embeds.length <= 1) return;
    store.deleteEmbed(embedId);
    const remaining = store.getEmbeds();
    setEmbeds([...remaining]);
    if (selectedEmbedId === embedId) {
      navigateToEmbed(null);
    }
  };

  const handleToggleEmbedStatus = () => {
    if (!selectedEmbed) return;
    const nextStatus = selectedEmbed.status === 'draft' ? 'active' : 'draft';
    store.updateEmbed(selectedEmbed.id, { status: nextStatus });
    refreshEmbeds();
  };

  const openIdentityDrawer = () => {
    if (!selectedEmbed) return;
    setDraftName(selectedEmbed.name);
    setDraftStatus(selectedEmbed.status || 'active');
    setDraftNameError(null);
    setIsIdentityDrawerOpen(true);
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmbed) return;
    const check = validatePlainText(draftName, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('embed.assistant_name', 'Embed Name'),
    });
    if (!check.valid) {
      setDraftNameError(check.error);
      return;
    }
    store.updateEmbed(selectedEmbed.id, {
      name: check.sanitized,
      status: draftStatus,
    });
    refreshEmbeds();
    setIsIdentityDrawerOpen(false);
  };

  const toggleNewEmbedCollection = (colId: string) => {
    if (newEmbedCols.includes(colId)) {
      if (newEmbedCols.length === 1) return;
      setNewEmbedCols(newEmbedCols.filter((c) => c !== colId));
    } else {
      setNewEmbedCols([...newEmbedCols, colId]);
    }
  };

  const updateSelectedEmbed = (updates: Partial<EmbedInstance>) => {
    if (!selectedEmbed) return;
    store.updateEmbed(selectedEmbed.id, updates);
    refreshEmbeds();
  };

  const toggleSelectedCollection = (colId: string) => {
    if (!selectedEmbed) return;
    const current =
      selectedEmbed.knowledgeScope?.collectionIds || selectedEmbed.allowedCollectionIds;
    const next = current.includes(colId)
      ? current.length > 1
        ? current.filter((c) => c !== colId)
        : current
      : [...current, colId];
    updateSelectedEmbed({
      allowedCollectionIds: next,
      knowledgeScope: {
        collectionIds: next,
        documentIds: selectedEmbed.knowledgeScope?.documentIds,
      },
    });
  };

  const toggleSelectedDocument = (docId: string) => {
    if (!selectedEmbed) return;
    const currentDocs = selectedEmbed.knowledgeScope?.documentIds || [];
    const nextDocs = currentDocs.includes(docId)
      ? currentDocs.filter((id) => id !== docId)
      : [...currentDocs, docId];
    updateSelectedEmbed({
      knowledgeScope: {
        collectionIds:
          selectedEmbed.knowledgeScope?.collectionIds || selectedEmbed.allowedCollectionIds,
        documentIds: nextDocs.length > 0 ? nextDocs : undefined,
      },
    });
  };

  const handleAddSuggestedQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmbed) return;
    const check = validatePlainText(newSuggestedQuestion, {
      required: true,
      minLength: 3,
      maxLength: 140,
      fieldLabel: 'Suggested Question',
    });
    if (!check.valid) {
      setSuggestedQuestionError(check.error);
      return;
    }
    const existing = selectedEmbed.behaviorConfig?.suggestedQuestions || [];
    updateSelectedEmbed({
      behaviorConfig: {
        initialState: selectedEmbed.behaviorConfig?.initialState || 'closed',
        suggestedQuestions: [...existing, check.sanitized],
        showNavigation: selectedEmbed.behaviorConfig?.showNavigation ?? true,
        ctaBehavior: selectedEmbed.behaviorConfig?.ctaBehavior || 'inline-link',
      },
    });
    setNewSuggestedQuestion('');
    setSuggestedQuestionError(null);
  };

  const handleRemoveSuggestedQuestion = (idx: number) => {
    if (!selectedEmbed) return;
    const existing = selectedEmbed.behaviorConfig?.suggestedQuestions || [];
    updateSelectedEmbed({
      behaviorConfig: {
        initialState: selectedEmbed.behaviorConfig?.initialState || 'closed',
        suggestedQuestions: existing.filter((_, i) => i !== idx),
        showNavigation: selectedEmbed.behaviorConfig?.showNavigation ?? true,
        ctaBehavior: selectedEmbed.behaviorConfig?.ctaBehavior || 'inline-link',
      },
    });
  };

  const handleAddRouteRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmbed) return;
    const patternTrimmed = rulePattern.trim();
    if (!patternTrimmed.startsWith('/') || containsUnsafePayload(patternTrimmed)) {
      setRuleError('Route pattern must start with "/" and contain no unsafe characters.');
      return;
    }
    const titleCheck = validatePlainText(ruleTitle, {
      required: true,
      minLength: 2,
      maxLength: 100,
      fieldLabel: 'Prompt Title',
    });
    if (!titleCheck.valid) {
      setRuleError(titleCheck.error);
      return;
    }
    const parsedQuestions = ruleQuestionsRaw
      .split(/[\n,]+/)
      .map((q) => sanitizePlainText(q).trim())
      .filter(Boolean);

    const newRule: EmbedRouteRule = {
      id: `rule_${Date.now().toString(36)}`,
      routePattern: patternTrimmed,
      promptTitle: titleCheck.sanitized,
      suggestedQuestions:
        parsedQuestions.length > 0
          ? parsedQuestions
          : ['How does this page work?'],
      collectionIds:
        selectedEmbed.knowledgeScope?.collectionIds || selectedEmbed.allowedCollectionIds,
      documentIds: ruleDocIds.length > 0 ? ruleDocIds : undefined,
    };

    const existingRules = selectedEmbed.contextConfig?.routeRules || [];
    updateSelectedEmbed({
      contextConfig: {
        useCurrentPage: selectedEmbed.contextConfig?.useCurrentPage ?? true,
        useHostUserContext: selectedEmbed.contextConfig?.useHostUserContext ?? true,
        routeRules: [...existingRules, newRule],
      },
    });
    setIsAddingRouteRule(false);
    setRuleError(null);
    setRuleDocIds([]);
  };

  const handleRemoveRouteRule = (ruleId: string) => {
    if (!selectedEmbed) return;
    const existingRules = selectedEmbed.contextConfig?.routeRules || [];
    updateSelectedEmbed({
      contextConfig: {
        useCurrentPage: selectedEmbed.contextConfig?.useCurrentPage ?? true,
        useHostUserContext: selectedEmbed.contextConfig?.useHostUserContext ?? true,
        routeRules: existingRules.filter((r) => r.id !== ruleId),
      },
    });
  };

  // ==========================================================================
  // STAGE 1: EMBEDS DIRECTORY (PA-DIRECTORY / SU-EMBED-DIRECTORY)
  // ==========================================================================
  if (!selectedEmbed) {
    return (
      <div className="p-8 w-full space-y-6">
        <PageHeader
          title={t('embed.header_title', 'Embeds & Presentation Surfaces')}
          subtitle={t(
            'embed.header_subtitle',
            'Manage independently deployable knowledge presentations across widgets, slide-in panels, inline assistants, and documentation.'
          )}
          actions={
            <>
              <Button
                variant="secondary"
                size="md"
                onClick={() => onOpenWidgetPreview(embeds[0]?.id, false)}
              >
                <span>{t('embed.launch_simulator', 'Launch Host Simulator')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setNewEmbedName('');
                  setNewEmbedError(null);
                  setIsCreateDrawerOpen(true);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('embed.new_embed', 'Create Embed')}</span>
              </Button>
            </>
          }
        />

        {/* Canonical Filter Model (PR-FILTER-BAR) */}
        <FilterBar
          resultCount={filteredEmbeds.length}
          totalCount={embeds.length}
          hasActiveFilters={
            Boolean(searchQuery.trim()) || modeFilter !== 'all' || statusFilter !== 'all'
          }
          onClearFilters={() => {
            setSearchQuery('');
            setSearchError(null);
            setModeFilter('all');
            setStatusFilter('all');
          }}
        >
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t(
                'embed.filter_placeholder',
                'Filter embeds by name, ID, or presentation mode...'
              )}
              maxLength={120}
              error={searchError}
              className="pl-8"
            />
          </div>
          <div className="w-44">
            <Select
              value={modeFilter}
              onChange={(e) =>
                setModeFilter(e.target.value as 'all' | EmbedPresentationMode)
              }
              aria-label="Filter by presentation mode"
            >
              <option value="all">{t('embed.all_modes', 'All Modes (6)')}</option>
              {EMBED_MODE_METADATA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'draft')
              }
              aria-label="Filter by status"
            >
              <option value="all">{t('embed.all_statuses', 'All Statuses')}</option>
              <option value="active">{t('embed.status_active', 'Active / Ready')}</option>
              <option value="draft">{t('embed.status_draft', 'Draft')}</option>
            </Select>
          </div>
        </FilterBar>

        {/* Embeds Collection List (CO-EMBED-CARD) */}
        {filteredEmbeds.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-5 h-5" />}
            title={t('embed.no_matching', 'No matching Embed instances')}
            description={t(
              'embed.no_matching_desc',
              'Clear your search filters or create a new Embed presentation surface.'
            )}
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setModeFilter('all');
                  setStatusFilter('all');
                }}
              >
                {t('common.reset_filters', 'Reset Filters')}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredEmbeds.map((emb) => (
              <EmbedCard
                key={emb.id}
                embed={emb}
                collections={collections}
                canDelete={embeds.length > 1}
                onSelect={(id) => navigateToEmbed(id)}
                onOpenInstallGuide={(id) => handleOpenInstallGuide(id)}
                onLaunchSimulator={(id) => onOpenWidgetPreview(id, false)}
                onDuplicate={(id) => handleDuplicateEmbed(id)}
                onDelete={(id) => handleDeleteEmbed(id)}
              />
            ))}
          </div>
        )}

        {/* WF-EMBED-01: Create Embed Drawer (PR-DRAWER-MD) */}
        <Drawer
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          size="md"
          title={t('embed.create_title', 'Create Embed Surface')}
          subtitle={t(
            'embed.create_subtitle',
            'Bind a new presentation surface to one or more workspace knowledge collections.'
          )}
          scopeBanner={
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-ink-muted">Workspace</span>
                <span className="text-ink font-medium">
                  {workspace.name} ({workspace.id})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-ink-muted">
                  Presentation Mode
                </span>
                <span className="text-accent font-medium">
                  {EMBED_MODE_METADATA.find((m) => m.id === newEmbedMode)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="uppercase tracking-wider text-ink-muted">
                  Collections Bound
                </span>
                <span className="text-ink">{newEmbedCols.length} selected</span>
              </div>
            </div>
          }
          footer={
            <>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setIsCreateDrawerOpen(false)}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                form="create-embed-form"
                variant="primary"
                size="md"
                disabled={!newEmbedName.trim() || isSubmittingCreate}
              >
                {t('embed.create_cta', 'Create & Configure')}
              </Button>
            </>
          }
        >
          <form id="create-embed-form" onSubmit={handleCreateEmbed} className="space-y-5">
            <Input
              label={t('embed.assistant_name', 'Embed Name')}
              required
              type="text"
              value={newEmbedName}
              onChange={(e) => {
                const val = e.target.value;
                setNewEmbedName(val);
                if (val && containsUnsafePayload(val)) {
                  setNewEmbedError(
                    t(
                      'security.unsafe_input',
                      'HTML tags and script patterns are not permitted.'
                    )
                  );
                } else {
                  setNewEmbedError(null);
                }
              }}
              placeholder={t(
                'embed.name_placeholder',
                'e.g., Product Help Widget or Docs Portal'
              )}
              maxLength={80}
              error={newEmbedError}
            />

            <Select
              label={t('embed.presentation_mode', 'Presentation Mode')}
              value={newEmbedMode}
              onChange={(e) =>
                setNewEmbedMode(e.target.value as EmbedPresentationMode)
              }
            >
              {EMBED_MODE_METADATA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.surfaceId})
                </option>
              ))}
            </Select>

            <div className="space-y-2">
              <Text variant="label" tone="secondary" as="label" className="block">
                {t('embed.knowledge_scope', 'Knowledge Scope (Collections)')}
              </Text>
              <div className="space-y-1.5">
                {collections.map((col) => {
                  const checked = newEmbedCols.includes(col.id);
                  return (
                    <Box
                      key={col.id}
                      surface={checked ? 'elevated' : 'default'}
                      padding="xs"
                      radius="sm"
                      className="p-2.5 flex items-center justify-between"
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleNewEmbedCollection(col.id)}
                        label={col.name}
                        description={`Visibility: ${col.visibility.toUpperCase()} · ${col.fileCount} files`}
                      />
                    </Box>
                  );
                })}
              </div>
            </div>
          </form>
        </Drawer>
      </div>
    );
  }

  // ==========================================================================
  // STAGE 2: EMBED RESOURCE CONFIGURATION (PA-RESOURCE-CONFIGURATION)
  // ==========================================================================
  const activeMode = selectedEmbed.mode || 'widget';
  const activeModeMeta =
    EMBED_MODE_METADATA.find((m) => m.id === activeMode) || EMBED_MODE_METADATA[0];
  const scopeColIds =
    selectedEmbed.knowledgeScope?.collectionIds || selectedEmbed.allowedCollectionIds;
  const scopeDocIds = selectedEmbed.knowledgeScope?.documentIds || [];
  const appearance = selectedEmbed.appearanceConfig || DEFAULT_APPEARANCE;
  const normalizedAccent = normalizeAccentHex(
    appearance.accentColor || selectedEmbed.accentColor
  );
  const useCurrentPage = selectedEmbed.contextConfig?.useCurrentPage ?? true;
  const useHostUserContext = selectedEmbed.contextConfig?.useHostUserContext ?? true;
  const routeRules = selectedEmbed.contextConfig?.routeRules || [];
  const suggestedQuestions = selectedEmbed.behaviorConfig?.suggestedQuestions || [];
  const initialState = selectedEmbed.behaviorConfig?.initialState || 'closed';
  const showNavigation = selectedEmbed.behaviorConfig?.showNavigation ?? true;
  const ctaBehavior = selectedEmbed.behaviorConfig?.ctaBehavior || 'inline-link';

  const scopedCollections = scopeColIds
    .map((id) => collections.find((c) => c.id === id))
    .filter(Boolean);
  const scopedDocuments = allDocuments.filter(
    (d) => scopeColIds.includes(d.collectionId) && !d.deletedAt && d.status === 'ready'
  );
  const requiresSignedAssertion = scopedCollections.some(
    (c) => c?.visibility === 'members' || c?.visibility === 'admins'
  );

  const readiness = evaluateEmbedReadiness(selectedEmbed, collections);
  const contract = evaluateEmbedInstallationContract(selectedEmbed, collections);

  const isDimensionalMode =
    activeMode === 'widget' || activeMode === 'panel' || activeMode === 'contextual';
  const isNavCapableMode =
    activeMode === 'documentation' || activeMode === 'contextual';

  return (
    <div className="w-full">
      {/* ====================================================================
          SURFACE 1: Child Context Navbar (CO-CHILD-NAVBAR — 24px Axis)
          Back | Embeds > <Name>   ...   [Readiness] [Installation Guide] [Simulator]
          ==================================================================== */}
      <ChildContextNavbar
        backLabel={t('nav.embed', 'Embeds')}
        onBack={() => navigateToEmbed(null)}
        breadcrumb={[
          { label: t('nav.embed', 'Embeds'), onClick: () => navigateToEmbed(null) },
          { label: selectedEmbed.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <EmbedStatusBadge embed={selectedEmbed} collections={collections} />

            {readiness.readyForInstallation && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenInstallGuide(selectedEmbed.id)}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Installation Guide</span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenWidgetPreview(selectedEmbed.id, true)}
            >
              <span>{t('embed.test_in_simulator', 'Test in Host Simulator')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />

      {/* ====================================================================
          SURFACE 2: Embed Identity & Resource Lifecycle Actions
          INV-EMBED-03 & INV-EMBED-04: Configuration tabs DO NOT live here.
          ==================================================================== */}
      <div className="bg-surface border-b border-line px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="h2" tone="primary" className="truncate">
              {selectedEmbed.name}
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={openIdentityDrawer}
              title={t('common.rename', 'Edit Name & Status')}
              aria-label={t('common.rename', 'Edit Name & Status')}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <InfoPopover
              title={t('info.assistant_details', 'Embed Resource Metadata')}
              items={[
                { label: 'Embed ID', value: selectedEmbed.id },
                {
                  label: 'Presentation Mode',
                  value: `${activeModeMeta.label} (${activeModeMeta.surfaceId})`,
                },
                {
                  label: 'Readiness Status',
                  value: readiness.label,
                  mono: false,
                },
                {
                  label: 'Collections Bound',
                  value: scopeColIds.join(', ') || 'None',
                },
                {
                  label: 'Updated At',
                  value: selectedEmbed.updatedAt,
                },
              ]}
            />
          </div>

          <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-2">
            <span>
              Mode: <strong className="text-ink">{activeModeMeta.label}</strong> (
              <span className="font-mono">{activeModeMeta.surfaceId}</span>)
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Scope:{' '}
              <strong className="text-ink">
                {scopedCollections.map((c) => c?.name).join(', ') || 'None'}
              </strong>
              {scopeDocIds.length > 0 ? ` (${scopeDocIds.length} pinned docs)` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Status: <strong className="text-ink">{readiness.label}</strong>
            </span>
          </div>

          {!readiness.readyForInstallation && (
            <div className="flex items-center gap-1.5 text-2xs font-mono text-danger pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Not ready for installation — Missing: {readiness.missingReasons.join(' · ')}
              </span>
            </div>
          )}
        </div>

        {/* CO-EMBED-ACTION-BAR: Resource Lifecycle Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant={selectedEmbed.status === 'draft' ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleToggleEmbedStatus}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>
              {selectedEmbed.status === 'draft' ? 'Publish Embed' : 'Set as Draft'}
            </span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleDuplicateEmbed(selectedEmbed.id)}
          >
            <Files className="w-3.5 h-3.5" />
            <span>{t('common.duplicate', 'Duplicate')}</span>
          </Button>

          {embeds.length > 1 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeleteEmbed(selectedEmbed.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('common.delete', 'Delete')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* ====================================================================
          FLUID RESOURCE WORKSPACE BODY (24px DS-LAYOUT-AXIS)
          ==================================================================== */}
      <div className="p-6 w-full space-y-6">
        {/* BODY-LEVEL CONFIGURATION NAVIGATION (PR-TABS — INV-EMBED-03) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <SegmentedTabs<EmbedConfigSection>
            ariaLabel="Embed configuration sections"
            value={activeConfigSection}
            onChange={handleSwitchSection}
            options={[
              {
                value: 'mode_scope',
                label: t('embed.section_mode_scope', '1. Mode & Knowledge'),
                icon: <Layers className="w-3.5 h-3.5" />,
              },
              {
                value: 'context_theme',
                label: t('embed.section_context_theme', '2. Context & Behavior'),
                icon: <Sliders className="w-3.5 h-3.5" />,
              },
              {
                value: 'installation',
                label: t('embed.section_installation', '3. Installation'),
                icon: <Code2 className="w-3.5 h-3.5" />,
              },
            ]}
          />

          <div className="text-2xs font-mono text-ink-muted">
            {activeConfigSection === 'mode_scope'
              ? 'Step 1 of 3 · Presentation Mode & Knowledge Scope'
              : activeConfigSection === 'context_theme'
              ? 'Step 2 of 3 · Host Context, Behavior & Theme'
              : 'Step 3 of 3 · Installation Readiness & Contract Summary'}
          </div>
        </div>

        {/* ==================================================================
            TAB 1: PRESENTATION MODE & KNOWLEDGE SCOPE
            ================================================================== */}
        {activeConfigSection === 'mode_scope' && (
          <div className="space-y-6">
            {/* 1A. PRESENTATION MODE */}
            <Card variant="surface" padding="md" className="space-y-4">
              <CardHeader
                icon={<Layers className="w-4 h-4 text-accent" />}
                title={t('embed.mode_title', '1. Presentation Mode')}
                subtitle={t(
                  'embed.mode_subtitle',
                  'Select how this Embed renders inside your host application. Options in Step 2 adapt automatically to this mode.'
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {EMBED_MODE_METADATA.map((m) => {
                  const Icon = m.icon;
                  const isSelected = activeMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        updateSelectedEmbed({
                          mode: m.id,
                          behaviorConfig: {
                            initialState:
                              m.id === 'widget'
                                ? 'closed'
                                : selectedEmbed.behaviorConfig?.initialState || 'open',
                            suggestedQuestions:
                              selectedEmbed.behaviorConfig?.suggestedQuestions || [],
                            showNavigation:
                              m.id === 'documentation' || m.id === 'contextual',
                            ctaBehavior:
                              selectedEmbed.behaviorConfig?.ctaBehavior || 'inline-link',
                          },
                        })
                      }
                      className={`text-left p-3.5 rounded-sm border transition-colors flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-accent/5 border-accent text-ink'
                          : 'bg-canvas border-line hover:bg-surface-hover text-ink'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`w-4 h-4 ${
                                isSelected ? 'text-accent' : 'text-ink-secondary'
                              }`}
                            />
                            <span className="text-xs font-semibold text-ink">
                              {m.label}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                          )}
                        </div>
                        <p className="text-2xs text-ink-secondary leading-relaxed">
                          {m.description}
                        </p>
                      </div>
                      <div className="text-2xs font-mono text-ink-muted pt-1 border-t border-line-subtle flex items-center justify-between">
                        <span>{m.surfaceId}</span>
                        {isSelected && (
                          <span className="text-accent font-semibold">ACTIVE</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* 1B. KNOWLEDGE SCOPE (COLLECTIONS + OPTIONAL DOCUMENT NARROWING) */}
            <Card variant="surface" padding="md" className="space-y-5">
              <CardHeader
                icon={<Sparkles className="w-4 h-4 text-accent" />}
                title={t('embed.scope_title', '2. Knowledge Scope')}
                subtitle={t(
                  'embed.scope_subtitle',
                  'Collections remain the authorization boundary. Narrow which collections and optional documents this Embed presents.'
                )}
                actions={
                  <Badge tone="neutral" mono>
                    {scopeColIds.length} Collection{scopeColIds.length === 1 ? '' : 's'}
                  </Badge>
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {collections.map((col) => {
                  const checked = scopeColIds.includes(col.id);
                  return (
                    <Box
                      key={col.id}
                      surface={checked ? 'elevated' : 'default'}
                      padding="sm"
                      radius="sm"
                      className={`p-3.5 transition-colors ${
                        checked ? 'border-accent bg-accent/5' : ''
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onChange={() => toggleSelectedCollection(col.id)}
                        label={col.name}
                        description={`${col.visibility.toUpperCase()} · ${col.fileCount} files`}
                      />
                    </Box>
                  );
                })}
              </div>

              {/* Derived Access Profile & Progressive Identity Summary */}
              <Box
                surface="canvas"
                padding="sm"
                radius="sm"
                className="p-3.5 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-mono uppercase tracking-wider text-ink-muted">
                      Access Profile:
                    </span>
                    <Badge
                      tone={
                        contract.visibilityProfile === 'public-only'
                          ? 'success'
                          : contract.visibilityProfile === 'mixed'
                          ? 'accent'
                          : 'warning'
                      }
                      mono
                    >
                      {contract.accessLabel}
                    </Badge>
                    <span className="text-2xs font-mono text-ink-secondary">
                      ({contract.signingLabel})
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {contract.accessDescription}
                  </p>
                </div>
                <div className="text-2xs font-mono text-ink-muted shrink-0 space-y-0.5 sm:text-right">
                  <div>
                    Public: <strong className="text-ink">{contract.publicCollections.length}</strong>
                  </div>
                  <div>
                    Protected:{' '}
                    <strong className="text-ink">{contract.protectedCollections.length}</strong>
                  </div>
                </div>
              </Box>

              {/* Optional Document Narrowing */}
              <div className="pt-3 border-t border-line space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <Text variant="label" tone="secondary">
                    {t(
                      'embed.optional_doc_pinning',
                      'Optional Document Narrowing / Pinning'
                    )}
                  </Text>
                  <span className="text-2xs font-mono text-ink-muted">
                    {scopeDocIds.length === 0
                      ? 'All ready documents in selected collections included'
                      : `${scopeDocIds.length} specific document(s) pinned`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {scopedDocuments.map((doc) => {
                    const isPinned = scopeDocIds.includes(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => toggleSelectedDocument(doc.id)}
                        className={`px-2.5 py-1 rounded-sm text-2xs font-mono border transition-colors flex items-center gap-1.5 ${
                          isPinned
                            ? 'bg-accent text-surface border-accent font-medium'
                            : 'bg-canvas text-ink-secondary border-line hover:text-ink hover:bg-surface-hover'
                        }`}
                      >
                        <span>{doc.title}</span>
                        {isPinned && <X className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ==================================================================
            TAB 2: HOST CONTEXT, BEHAVIOR & THEME
            ================================================================== */}
        {activeConfigSection === 'context_theme' && (
          <div className="space-y-6">
            {/* 2A. HOST CONTEXT & ROUTE RULES */}
            <Card variant="surface" padding="md" className="space-y-5">
              <CardHeader
                icon={<RouteIcon className="w-4 h-4 text-accent" />}
                title={t('embed.context_title', '1. Host Context & Route Rules')}
                subtitle={t(
                  'embed.context_subtitle',
                  'Define how the host application passes current page URL and signed user identity context into this Embed.'
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Box surface="elevated" padding="sm" radius="sm" className="p-3.5">
                  <Checkbox
                    checked={useCurrentPage}
                    onChange={() =>
                      updateSelectedEmbed({
                        contextConfig: {
                          useCurrentPage: !useCurrentPage,
                          useHostUserContext,
                          routeRules,
                        },
                      })
                    }
                    label={t(
                      'embed.use_current_page',
                      'Use current page URL context (currentUrl)'
                    )}
                    description={t(
                      'embed.use_current_page_desc',
                      'Automatically boosts documents and route rules matching the host page URL.'
                    )}
                  />
                </Box>

                <Box surface="elevated" padding="sm" radius="sm" className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <Checkbox
                      checked={requiresSignedAssertion ? true : useHostUserContext}
                      onChange={() => {
                        updateSelectedEmbed({
                          contextConfig: {
                            useCurrentPage,
                            useHostUserContext: !useHostUserContext,
                            routeRules,
                          },
                        });
                      }}
                      label={t(
                        'embed.use_host_identity',
                        'Use host user context (Signed identity assertions)'
                      )}
                      description={
                        contract.visibilityProfile === 'mixed'
                          ? 'Public collections work immediately without a token. Verified user identity assertions progressively unlock protected collections for signed-in users.'
                          : requiresSignedAssertion
                          ? 'This Embed uses protected collections only. Anonymous sessions initialize safely with an empty scope; signed assertions unlock protected content.'
                          : 'When enabled on public collections, signing is optional (Public + authenticated). Turn off for strictly anonymous public installation.'
                      }
                    />
                    {requiresSignedAssertion && (
                      <Badge tone="accent" mono>
                        {contract.visibilityProfile === 'mixed'
                          ? 'PROGRESSIVE'
                          : '[✓] PROTECTED'}
                      </Badge>
                    )}
                  </div>
                </Box>
              </div>

              {/* Interactive Route Rules Manager */}
              {useCurrentPage && (
                <div className="pt-4 border-t border-line space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Text variant="h3" tone="primary">
                        Route Rules ({routeRules.length})
                      </Text>
                      <Text variant="caption" tone="secondary">
                        Map host application routes (e.g. <code>/settings/security/sso</code>) to
                        tailored prompt titles, starter questions, and pinned documents.
                      </Text>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setIsAddingRouteRule(!isAddingRouteRule);
                        setRuleError(null);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddingRouteRule ? 'Cancel' : 'Add Route Rule'}</span>
                    </Button>
                  </div>

                  {routeRules.length === 0 && !isAddingRouteRule ? (
                    <Box
                      surface="default"
                      padding="sm"
                      radius="sm"
                      className="p-4 text-center text-xs text-ink-secondary"
                    >
                      No custom route rules configured. The Embed will use its default greeting and
                      starter questions across all routes.
                    </Box>
                  ) : (
                    <div className="space-y-2">
                      {routeRules.map((rule) => (
                        <Box
                          key={rule.id}
                          surface="default"
                          padding="sm"
                          radius="sm"
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-xs">
                                {rule.routePattern}
                              </span>
                              <span className="text-xs text-ink-muted">→</span>
                              <span className="text-xs font-semibold text-ink">
                                {rule.promptTitle || 'Contextual Help'}
                              </span>
                            </div>
                            {rule.suggestedQuestions && rule.suggestedQuestions.length > 0 && (
                              <div className="text-2xs text-ink-secondary">
                                Questions: {rule.suggestedQuestions.join(' · ')}
                              </div>
                            )}
                            {rule.documentIds && rule.documentIds.length > 0 && (
                              <div className="text-2xs font-mono text-ink-muted">
                                Pinned docs: {rule.documentIds.join(', ')}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRemoveRouteRule(rule.id || rule.routePattern)}
                            title="Remove route rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </Box>
                      ))}
                    </div>
                  )}

                  {isAddingRouteRule && (
                    <form
                      onSubmit={handleAddRouteRule}
                      className="p-4 bg-canvas border border-line rounded-sm space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          label="Host Route Pattern"
                          value={rulePattern}
                          onChange={(e) => setRulePattern(e.target.value)}
                          placeholder="e.g., /settings/security/sso or /billing/invoices"
                          required
                        />
                        <Input
                          label="Contextual Prompt Title"
                          value={ruleTitle}
                          onChange={(e) => setRuleTitle(e.target.value)}
                          placeholder="e.g., Need help configuring SSO?"
                          required
                        />
                      </div>
                      <Input
                        label="Route-Specific Suggested Questions (comma-separated)"
                        value={ruleQuestionsRaw}
                        onChange={(e) => setRuleQuestionsRaw(e.target.value)}
                        placeholder="How do I configure Okta SAML?, How do I rotate keys?"
                      />
                      <div className="space-y-1.5">
                        <Text variant="caption" tone="secondary">
                          Optional Pinned Documents for this Route:
                        </Text>
                        <div className="flex flex-wrap gap-1.5">
                          {scopedDocuments.map((doc) => {
                            const selected = ruleDocIds.includes(doc.id);
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() =>
                                  setRuleDocIds(
                                    selected
                                      ? ruleDocIds.filter((id) => id !== doc.id)
                                      : [...ruleDocIds, doc.id]
                                  )
                                }
                                className={`px-2 py-0.5 rounded-xs text-2xs font-mono border transition-colors ${
                                  selected
                                    ? 'bg-accent text-surface border-accent'
                                    : 'bg-surface text-ink-secondary border-line hover:text-ink'
                                }`}
                              >
                                {doc.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {ruleError && (
                        <p className="text-2xs font-mono text-danger">{ruleError}</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setIsAddingRouteRule(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" variant="primary">
                          Save Route Rule
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </Card>

            {/* 2B. CONVERSATIONAL BEHAVIOR (behaviorConfig) */}
            <Card variant="surface" padding="md" className="space-y-5">
              <CardHeader
                icon={<MessageSquare className="w-4 h-4 text-accent" />}
                title={t('embed.behavior_title', '2. Behavior & Prompts')}
                subtitle={t(
                  'embed.behavior_subtitle',
                  'Configure initial launch state, greeting prompts, starter questions, and call-to-action link behavior.'
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label={t('embed.greeting_label', 'Greeting / Prompt Header')}
                  type="text"
                  value={selectedEmbed.greetingText}
                  error={greetingError}
                  maxLength={200}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (containsUnsafePayload(val)) {
                      setGreetingError(
                        t(
                          'security.unsafe_input',
                          'HTML tags and script patterns are not permitted.'
                        )
                      );
                      return;
                    }
                    setGreetingError(null);
                    updateSelectedEmbed({ greetingText: sanitizePlainText(val) });
                  }}
                />
                <Input
                  label={t('embed.placeholder_label', 'Input Placeholder')}
                  type="text"
                  value={selectedEmbed.placeholderText}
                  error={placeholderError}
                  maxLength={140}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (containsUnsafePayload(val)) {
                      setPlaceholderError(
                        t(
                          'security.unsafe_input',
                          'HTML tags and script patterns are not permitted.'
                        )
                      );
                      return;
                    }
                    setPlaceholderError(null);
                    updateSelectedEmbed({ placeholderText: sanitizePlainText(val) });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Initial Launch State"
                  value={initialState}
                  onChange={(e) =>
                    updateSelectedEmbed({
                      behaviorConfig: {
                        initialState: e.target.value as 'closed' | 'open',
                        suggestedQuestions,
                        showNavigation,
                        ctaBehavior,
                      },
                    })
                  }
                >
                  <option value="closed">
                    Closed (Launcher visible; opens on click)
                  </option>
                  <option value="open">
                    Open (Expanded immediately on page load)
                  </option>
                </Select>

                <Select
                  label="Document Next-Step CTA Behavior"
                  value={ctaBehavior}
                  onChange={(e) =>
                    updateSelectedEmbed({
                      behaviorConfig: {
                        initialState,
                        suggestedQuestions,
                        showNavigation,
                        ctaBehavior: e.target.value as
                          | 'inline-link'
                          | 'new-tab'
                          | 'hidden',
                      },
                    })
                  }
                >
                  <option value="inline-link">
                    Inline Link (Render next-step button in answer)
                  </option>
                  <option value="new-tab">
                    New Tab (Open next-step action in a new tab)
                  </option>
                  <option value="hidden">
                    Hidden (Suppress document CTA buttons)
                  </option>
                </Select>
              </div>

              {isNavCapableMode && (
                <Box surface="elevated" padding="sm" radius="sm" className="p-3.5">
                  <Checkbox
                    checked={showNavigation}
                    onChange={() =>
                      updateSelectedEmbed({
                        behaviorConfig: {
                          initialState,
                          suggestedQuestions,
                          showNavigation: !showNavigation,
                          ctaBehavior,
                        },
                      })
                    }
                    label="Show Document Navigation Tree"
                    description="Displays the collection and document navigation sidebar inside Documentation and Contextual Help surfaces."
                  />
                </Box>
              )}

              {/* Suggested Starter Questions */}
              <div className="pt-3 border-t border-line space-y-2.5">
                <Text variant="label" tone="secondary" as="label" className="block">
                  Suggested Starter Questions ({suggestedQuestions.length})
                </Text>

                {suggestedQuestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, idx) => (
                      <div
                        key={`${q}-${idx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-canvas border border-line text-xs text-ink"
                      >
                        <span>{q}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSuggestedQuestion(idx)}
                          className="text-ink-muted hover:text-danger transition-colors"
                          aria-label={`Remove question ${q}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={handleAddSuggestedQuestion}
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-2"
                >
                  <div className="flex-1 w-full">
                    <Input
                      type="text"
                      value={newSuggestedQuestion}
                      onChange={(e) => {
                        setNewSuggestedQuestion(e.target.value);
                        setSuggestedQuestionError(null);
                      }}
                      placeholder="Add a suggested starter question..."
                      error={suggestedQuestionError}
                      maxLength={140}
                    />
                  </div>
                  <Button type="submit" size="md" variant="secondary">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </Button>
                </form>
              </div>
            </Card>

            {/* 2C. APPEARANCE & CONTROLLED THEME TOKENS (appearanceConfig) */}
            <Card variant="surface" padding="md" className="space-y-5">
              <CardHeader
                icon={<Sliders className="w-4 h-4 text-accent" />}
                title={t('embed.appearance_title', '3. Appearance & Controlled Theme')}
                subtitle={t(
                  'embed.appearance_subtitle',
                  'Customize controlled CSS variables (--okeng-*) while preserving readability and accessibility.'
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  label={t('embed.theme_preset', 'Theme Mode')}
                  value={appearance.theme}
                  onChange={(e) =>
                    updateSelectedEmbed({
                      appearanceConfig: {
                        ...appearance,
                        theme: e.target.value as 'light' | 'system' | 'high-contrast',
                      },
                    })
                  }
                >
                  <option value="light">Editorial Light (Default)</option>
                  <option value="system">Adapt to Host System</option>
                  <option value="high-contrast">High Contrast</option>
                </Select>

                {isDimensionalMode ? (
                  <Input
                    label={t('embed.panel_width', 'Surface Width')}
                    type="text"
                    value={widthInputValue ?? appearance.width}
                    error={widthError}
                    maxLength={16}
                    placeholder="e.g. 380px or 24rem"
                    onChange={(e) => {
                      const raw = e.target.value;
                      setWidthInputValue(raw);
                      const check = validateCssWidthToken(raw);
                      if (!check.valid) {
                        setWidthError(check.error);
                        return;
                      }
                      setWidthError(null);
                      updateSelectedEmbed({
                        appearanceConfig: {
                          ...appearance,
                          width: check.sanitized,
                        },
                      });
                    }}
                    onBlur={() => {
                      if (!widthError) {
                        setWidthInputValue(null);
                      }
                    }}
                  />
                ) : (
                  <Input
                    label="Surface Width"
                    type="text"
                    value="100% (Fluid Container)"
                    disabled
                  />
                )}

                <Select
                  label={t('embed.placement_position', 'Anchor Position')}
                  value={appearance.position}
                  onChange={(e) => {
                    const nextPos = e.target.value as
                      | 'bottom-right'
                      | 'bottom-left'
                      | 'right'
                      | 'left';
                    updateSelectedEmbed({
                      position:
                        nextPos === 'bottom-left' ? 'bottom-left' : 'bottom-right',
                      appearanceConfig: {
                        ...appearance,
                        position: nextPos,
                      },
                    });
                  }}
                >
                  {activeMode === 'widget' ? (
                    <>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </>
                  ) : (
                    <>
                      <option value="right">Right Edge</option>
                      <option value="left">Left Edge</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </>
                  )}
                </Select>

                <Select
                  label={t('embed.corner_radius', 'Corner Radius')}
                  value={appearance.radius}
                  onChange={(e) =>
                    updateSelectedEmbed({
                      appearanceConfig: {
                        ...appearance,
                        radius: e.target.value,
                      },
                    })
                  }
                >
                  <option value="0px">0px (Sharp Technical)</option>
                  <option value="2px">2px (Subtle)</option>
                  <option value="4px">4px (Canonical Default)</option>
                  <option value="6px">6px (Soft)</option>
                  <option value="8px">8px (Rounded)</option>
                </Select>
              </div>

              <div>
                <Text variant="label" tone="secondary" as="label" className="block mb-2">
                  {t('embed.accent_token', 'Accent Color Token (--okeng-accent)')}
                </Text>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_PRESETS.map((preset) => {
                    const isSelected = normalizedAccent === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          updateSelectedEmbed({
                            accentColor: preset.id,
                            appearanceConfig: {
                              ...appearance,
                              accentColor: preset.id,
                            },
                          })
                        }
                        className={`px-3 py-1.5 rounded-sm border text-xs font-medium flex items-center gap-2 transition-colors ${
                          isSelected
                            ? 'border-ink bg-surface-hover text-ink'
                            : 'border-line bg-canvas text-ink-secondary hover:text-ink'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-xs ${preset.swatchClass}`} />
                        <span>{preset.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ==================================================================
            TAB 3: COMPACT INSTALLATION LAUNCHER (APP-05 §23)
            ================================================================== */}
        {activeConfigSection === 'installation' && (
          <div className="max-w-2xl">
            <Card variant="surface" padding="lg" className="space-y-4">
              {readiness.readyForInstallation ? (
                <>
                  <div className="space-y-1.5">
                    <Text variant="h2" tone="primary">
                      Installation
                    </Text>
                    <Text variant="body" tone="secondary">
                      {contract.statusSubline}
                    </Text>
                    <Text variant="label" tone="primary" className="pt-1">
                      {contract.signingState === 'required'
                        ? 'Backend + frontend required'
                        : contract.visibilityProfile === 'mixed'
                        ? 'Frontend works immediately · Backend optional for protected collections'
                        : 'Frontend only'}
                    </Text>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleOpenInstallGuide(selectedEmbed.id)}
                    >
                      <span>Open installation guide</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Text variant="h2" tone="primary">
                      This Embed isn&apos;t ready to install yet.
                    </Text>
                    <Text variant="body" tone="secondary">
                      Complete the required Embed settings first.
                    </Text>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleSwitchSection('mode_scope')}
                    >
                      <span>Edit Embed</span>
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        )}

        {/* ==================================================================
            STEP PROGRESSION FOOTER (CO-EMBED-STEP-FOOTER — 1 of 3)
            ================================================================== */}
        <Card
          variant="surface"
          padding="sm"
          className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            {activeConfigSection === 'mode_scope' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigateToEmbed(null)}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Embeds</span>
              </Button>
            ) : activeConfigSection === 'context_theme' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSwitchSection('mode_scope')}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous: Mode &amp; Knowledge</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSwitchSection('context_theme')}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous: Context &amp; Behavior</span>
              </Button>
            )}
          </div>

          <div className="text-xs font-mono text-ink-secondary">
            {activeConfigSection === 'mode_scope'
              ? '1 of 3 · Mode & Knowledge Scope'
              : activeConfigSection === 'context_theme'
              ? '2 of 3 · Context, Behavior & Theme'
              : '3 of 3 · Installation Summary'}
          </div>

          <div className="flex items-center gap-2">
            {activeConfigSection === 'mode_scope' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSwitchSection('context_theme')}
              >
                <span>Next: Context &amp; Behavior</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {activeConfigSection === 'context_theme' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSwitchSection('installation')}
              >
                <span>Next: Installation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}

            {activeConfigSection === 'installation' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenWidgetPreview(selectedEmbed.id, true)}
                >
                  <span>Test in Host Simulator</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
                {readiness.readyForInstallation && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenInstallGuide(selectedEmbed.id)}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Open installation guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Stage 2 Edit Identity & Status Drawer (PR-DRAWER-SM) */}
      <Drawer
        isOpen={isIdentityDrawerOpen}
        onClose={() => setIsIdentityDrawerOpen(false)}
        size="sm"
        title={t('embed.edit_identity_title', 'Edit Embed Identity')}
        subtitle={`Resource ID: ${selectedEmbed.id}`}
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsIdentityDrawerOpen(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="edit-embed-identity-form"
              variant="primary"
              size="md"
            >
              {t('common.save', 'Save Changes')}
            </Button>
          </>
        }
      >
        <form
          id="edit-embed-identity-form"
          onSubmit={handleSaveIdentity}
          className="space-y-4"
        >
          <Input
            label={t('embed.assistant_name', 'Embed Name')}
            required
            type="text"
            value={draftName}
            error={draftNameError}
            maxLength={80}
            onChange={(e) => {
              const val = e.target.value;
              setDraftName(val);
              if (val && containsUnsafePayload(val)) {
                setDraftNameError(
                  t(
                    'security.unsafe_input',
                    'HTML tags and script patterns are not permitted.'
                  )
                );
              } else {
                setDraftNameError(null);
              }
            }}
          />

          <Select
            label={t('common.status', 'Lifecycle Status')}
            value={draftStatus}
            onChange={(e) =>
              setDraftStatus(e.target.value as 'active' | 'draft')
            }
          >
            <option value="active">Active (Live / Ready)</option>
            <option value="draft">Draft</option>
          </Select>
        </form>
      </Drawer>
    </div>
  );
};
