import React from 'react';
import {
  ExternalLink,
  Files,
  Trash2,
  Globe,
  PanelRight,
  Maximize2,
  SquareTerminal,
  BookOpen,
  Compass,
  ChevronRight,
  Code2,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { Collection, EmbedInstance, EmbedPresentationMode } from '../types';
import { Card, Text, Badge, Button, InfoPopover } from './ui';
import { useI18n } from '../i18n/I18nContext';
import { validateCssWidthToken, validatePlainText } from '../services/formSecurity';

// ============================================================================
// EMBED-02, 02_component_catalog.md & 04_top_screens_audit:
//   - CO-EMBED-CARD: Readiness-aware Embed collection row/card
//   - CO-EMBED-STATUS: Derived lifecycle & installation readiness badge
//   - evaluateEmbedReadiness: Canonical readiness gate (readyForInstallation)
//   - normalizeAccentHex: Canonical hex representation for appearance tokens
// ============================================================================

export const EMBED_MODE_METADATA: {
  id: EmbedPresentationMode;
  label: string;
  surfaceId: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    id: 'widget',
    label: 'Chat widget',
    surfaceId: 'SU-EMBED-CHAT',
    description: 'Floating launcher button that opens an anchored conversational window.',
    icon: Globe,
  },
  {
    id: 'panel',
    label: 'Slide-in panel',
    surfaceId: 'SU-EMBED-PANEL',
    description: 'Persistent left or right drawer alongside SaaS application screens.',
    icon: PanelRight,
  },
  {
    id: 'fullscreen',
    label: 'Fullscreen chat',
    surfaceId: 'SU-EMBED-FULLSCREEN',
    description: 'Dedicated full-viewport knowledge interface for portals and help centers.',
    icon: Maximize2,
  },
  {
    id: 'inline',
    label: 'Inline assistant',
    surfaceId: 'SU-EMBED-INLINE',
    description: 'Knowledge prompt and answer component placed directly inside a page.',
    icon: SquareTerminal,
  },
  {
    id: 'documentation',
    label: 'Documentation',
    surfaceId: 'SU-EMBED-DOCUMENTATION',
    description: '3-column interactive documentation with navigation, viewer, and assistant.',
    icon: BookOpen,
  },
  {
    id: 'contextual',
    label: 'Contextual help',
    surfaceId: 'SU-EMBED-CONTEXTUAL-HELP',
    description: 'Route-aware sidebar surfacing related documents and page-specific prompts.',
    icon: Compass,
  },
];

export const ACCENT_PRESETS = [
  { id: '#1D4ED8', label: 'Signal Blue (#1D4ED8)', swatchClass: 'bg-accent' },
  { id: '#171717', label: 'Primary Ink (#171717)', swatchClass: 'bg-ink' },
  { id: '#15803D', label: 'Operational Green (#15803D)', swatchClass: 'bg-success' },
  { id: '#B45309', label: 'Amber Warning (#B45309)', swatchClass: 'bg-warning' },
] as const;

export function normalizeAccentHex(raw?: string): string {
  if (!raw) return '#1D4ED8';
  const trimmed = raw.trim();
  if (trimmed === 'var(--color-accent)' || trimmed.toLowerCase() === '#1d4ed8') {
    return '#1D4ED8';
  }
  if (trimmed === 'var(--color-ink)' || trimmed.toLowerCase() === '#171717') {
    return '#171717';
  }
  if (trimmed === 'var(--color-success)' || trimmed.toLowerCase() === '#15803d') {
    return '#15803D';
  }
  if (trimmed === 'var(--color-warning)' || trimmed.toLowerCase() === '#b45309') {
    return '#B45309';
  }
  return trimmed.toUpperCase();
}

export type EmbedReadinessState = 'incomplete' | 'draft' | 'ready';

export interface EmbedReadinessEvaluation {
  state: EmbedReadinessState;
  readyForInstallation: boolean;
  missingReasons: string[];
  label: string;
}

/**
 * INV-EMBED-06: Ready means installable.
 * Evaluates whether an Embed has valid configuration for its selected presentation mode
 * before exposing the Installation Guide.
 */
export function evaluateEmbedReadiness(
  embed: EmbedInstance,
  collections?: Collection[]
): EmbedReadinessEvaluation {
  const missingReasons: string[] = [];

  const nameCheck = validatePlainText(embed.name || '', {
    required: true,
    minLength: 2,
    maxLength: 80,
    fieldLabel: 'Embed Name',
  });
  if (!nameCheck.valid) {
    missingReasons.push('Valid Embed name (min 2 characters)');
  }

  const mode = embed.mode || 'widget';
  const validMode = EMBED_MODE_METADATA.some((m) => m.id === mode);
  if (!validMode) {
    missingReasons.push('Valid presentation mode');
  }

  const rawColIds = embed.knowledgeScope?.collectionIds || embed.allowedCollectionIds || [];
  const validColIds = collections
    ? rawColIds.filter((id) => collections.some((c) => c.id === id))
    : rawColIds;
  if (validColIds.length === 0) {
    missingReasons.push('At least one knowledge collection in scope');
  }

  const greetingCheck = validatePlainText(embed.greetingText || '', {
    required: true,
    minLength: 2,
    maxLength: 200,
    fieldLabel: 'Greeting',
  });
  if (!greetingCheck.valid) {
    missingReasons.push('Initial prompt / greeting text');
  }

  const placeholderCheck = validatePlainText(embed.placeholderText || '', {
    required: true,
    minLength: 2,
    maxLength: 140,
    fieldLabel: 'Input Placeholder',
  });
  if (!placeholderCheck.valid) {
    missingReasons.push('Input placeholder text');
  }

  if (mode === 'widget' || mode === 'panel' || mode === 'contextual') {
    const rawWidth = embed.appearanceConfig?.width || '360px';
    const widthCheck = validateCssWidthToken(rawWidth);
    if (!widthCheck.valid) {
      missingReasons.push('Valid CSS width token (e.g. 360px)');
    }
  }

  const readyForInstallation = missingReasons.length === 0;
  if (!readyForInstallation) {
    return {
      state: 'incomplete',
      readyForInstallation: false,
      missingReasons,
      label: 'Incomplete',
    };
  }

  if (embed.status === 'draft') {
    return {
      state: 'draft',
      readyForInstallation: true,
      missingReasons: [],
      label: 'Draft · Ready',
    };
  }

  return {
    state: 'ready',
    readyForInstallation: true,
    missingReasons: [],
    label: 'Ready · Active',
  };
}

export type EmbedSigningState = 'none' | 'optional' | 'required';

export interface EmbedInstallationContract {
  // Pure EmbedInstallationFacts (Normative Contract)
  hasPublicCollections: boolean;
  hasProtectedCollections: boolean;
  allowsAnonymousInitialization: true;
  hasAnonymousAccessibleContent: boolean; // === hasPublicCollections
  supportsAuthenticatedAccess: boolean; // === hasProtectedCollections
  requiresVerifiedIdentityForProtectedContent: boolean; // === hasProtectedCollections
  expectsCurrentUrl: boolean;
  expectsRouteRules: boolean;
  routeRuleCount: number;
  // Presentation & UX Metadata derived from facts
  visibilityProfile: 'public-only' | 'mixed' | 'protected-only';
  mode: EmbedPresentationMode;
  modeLabel: string;
  surfaceId: string;
  scopedCollections: Collection[];
  publicCollections: Collection[];
  protectedCollections: Collection[];
  pinnedDocIds: string[];
  useHostUserContext: boolean;
  signingState: EmbedSigningState;
  accessLabel: string;
  signingLabel: string;
  statusHeadline: string;
  statusSubline: string;
  accessDescription: string;
  recommendedStack: string;
}

/**
 * Pure `EmbedInstallationFacts` evaluator (`evaluateEmbedInstallationContract`).
 * Derives `EmbedInstallationFacts` and installation UX copy strictly from the
 * Embed's attached collections (`everyone`, `members`, `admins`) and context config.
 * Normative Invariants:
 * - `allowsAnonymousInitialization` is ALWAYS `true` (even for `protected-only`, where
 *   anonymous initializes with an empty scope `collectionIds: []`).
 * - `hasAnonymousAccessibleContent === hasPublicCollections`
 * - `supportsAuthenticatedAccess === hasProtectedCollections`
 * - `requiresVerifiedIdentityForProtectedContent === hasProtectedCollections`
 */
export function evaluateEmbedInstallationContract(
  embed: EmbedInstance,
  collections: Collection[] = []
): EmbedInstallationContract {
  const mode = embed.mode || 'widget';
  const modeMeta =
    EMBED_MODE_METADATA.find((m) => m.id === mode) || EMBED_MODE_METADATA[0];
  const rawColIds =
    embed.knowledgeScope?.collectionIds && embed.knowledgeScope.collectionIds.length > 0
      ? embed.knowledgeScope.collectionIds
      : embed.allowedCollectionIds || [];
  const normalizedColIds = Array.from(
    new Set(rawColIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  ).sort();

  const scopedCollections = normalizedColIds
    .map((id) => collections.find((c) => c.id === id))
    .filter(Boolean) as Collection[];
  const publicCollections = scopedCollections.filter((c) => c.visibility === 'everyone');
  const protectedCollections = scopedCollections.filter(
    (c) => c.visibility === 'members' || c.visibility === 'admins'
  );
  const pinnedDocIds = embed.knowledgeScope?.documentIds || [];

  const hasPublicCollections = publicCollections.length > 0;
  const hasProtectedCollections = protectedCollections.length > 0;
  const allowsAnonymousInitialization: true = true;
  const hasAnonymousAccessibleContent = hasPublicCollections;
  const supportsAuthenticatedAccess = hasProtectedCollections;
  const requiresVerifiedIdentityForProtectedContent = hasProtectedCollections;

  const visibilityProfile: 'public-only' | 'mixed' | 'protected-only' =
    hasPublicCollections && !hasProtectedCollections
      ? 'public-only'
      : hasPublicCollections && hasProtectedCollections
      ? 'mixed'
      : 'protected-only';

  const useHostUserContext = hasProtectedCollections
    ? true
    : embed.contextConfig?.useHostUserContext ?? false;

  let signingState: EmbedSigningState = 'none';
  let accessLabel = 'Public';
  let signingLabel = 'No signing required';
  let statusHeadline = 'Frontend-only installation';
  let statusSubline = 'This Embed does not require a backend.';
  let accessDescription = 'This Embed does not require a backend.';
  let recommendedStack = 'React, Vue, or JavaScript';

  if (visibilityProfile === 'protected-only') {
    signingState = 'required';
    accessLabel = 'Protected-only';
    signingLabel = 'Required for protected content';
    statusHeadline = 'Backend + frontend installation';
    statusSubline =
      'Your server needs to identify signed-in users to access protected collections.';
    accessDescription =
      'Your server needs to identify signed-in users to access protected collections.';
    recommendedStack = 'React, Vue, or JavaScript + server endpoint';
  } else if (visibilityProfile === 'mixed') {
    signingState = 'optional';
    accessLabel = 'Public + Authenticated';
    signingLabel = 'Optional for public · Required for protected content';
    statusHeadline = 'Frontend installation';
    statusSubline =
      'Works immediately for public content. Add server signing to unlock protected collections for signed-in users.';
    accessDescription =
      'Works immediately for public content. Add server signing to unlock protected collections for signed-in users.';
    recommendedStack = 'React, Vue, or JavaScript';
  } else if (useHostUserContext) {
    signingState = 'optional';
    accessLabel = 'Public by default';
    signingLabel = 'Optional';
    statusHeadline = 'Frontend installation';
    statusSubline =
      'This Embed works without a backend. You can optionally add user signing for signed-in users.';
    accessDescription =
      'This Embed works without a backend. You can optionally add user signing for signed-in users.';
    recommendedStack = 'React, Vue, or JavaScript';
  }

  const expectsCurrentUrl = embed.contextConfig?.useCurrentPage ?? true;
  const routeRuleCount = embed.contextConfig?.routeRules?.length || 0;
  const expectsRouteRules = expectsCurrentUrl && routeRuleCount > 0;

  return {
    hasPublicCollections,
    hasProtectedCollections,
    allowsAnonymousInitialization,
    hasAnonymousAccessibleContent,
    supportsAuthenticatedAccess,
    requiresVerifiedIdentityForProtectedContent,
    expectsCurrentUrl,
    expectsRouteRules,
    routeRuleCount,
    visibilityProfile,
    mode,
    modeLabel: modeMeta.label,
    surfaceId: modeMeta.surfaceId,
    scopedCollections,
    publicCollections,
    protectedCollections,
    pinnedDocIds,
    useHostUserContext,
    signingState,
    accessLabel,
    signingLabel,
    statusHeadline,
    statusSubline,
    accessDescription,
    recommendedStack,
  };
}

/**
 * CO-EMBED-STATUS: Canonical Lifecycle & Readiness Status Badge
 */
export const EmbedStatusBadge: React.FC<{
  embed: EmbedInstance;
  collections?: Collection[];
}> = ({ embed, collections }) => {
  const readiness = evaluateEmbedReadiness(embed, collections);

  if (readiness.state === 'incomplete') {
    return (
      <Badge tone="solid-danger" mono uppercase>
        <span className="w-1.5 h-1.5 rounded-full bg-surface" />
        <span>Incomplete</span>
      </Badge>
    );
  }

  if (readiness.state === 'draft') {
    return (
      <Badge tone="solid-warning" mono uppercase>
        <span className="w-1.5 h-1.5 rounded-full bg-surface" />
        <span>Draft</span>
      </Badge>
    );
  }

  return (
    <Badge tone="solid-success" mono uppercase>
      <span className="w-1.5 h-1.5 rounded-full bg-surface" />
      <span>Ready</span>
    </Badge>
  );
};

export interface EmbedCardProps {
  embed: EmbedInstance;
  collections: Collection[];
  canDelete?: boolean;
  onSelect: (embedId: string) => void;
  onOpenInstallGuide: (embedId: string) => void;
  onLaunchSimulator: (embedId: string) => void;
  onDuplicate: (embedId: string) => void;
  onDelete?: (embedId: string) => void;
}

export const EmbedCard: React.FC<EmbedCardProps> = ({
  embed,
  collections,
  canDelete = false,
  onSelect,
  onOpenInstallGuide,
  onLaunchSimulator,
  onDuplicate,
  onDelete,
}) => {
  const { t } = useI18n();
  const modeMeta =
    EMBED_MODE_METADATA.find((m) => m.id === (embed.mode || 'widget')) ||
    EMBED_MODE_METADATA[0];
  const ModeIcon = modeMeta.icon;
  const colIds = embed.knowledgeScope?.collectionIds || embed.allowedCollectionIds || [];
  const colNames =
    colIds.map((id) => collections.find((c) => c.id === id)?.name || id).join(', ') ||
    'No collections selected';
  const docCount = embed.knowledgeScope?.documentIds?.length || 0;
  const routeRuleCount = embed.contextConfig?.routeRules?.length || 0;
  const readiness = evaluateEmbedReadiness(embed, collections);

  return (
    <Card
      variant="surface"
      padding="sm"
      interactive
      onClick={() => onSelect(embed.id)}
      aria-label={`${t('common.edit', 'Edit')} ${embed.name}`}
      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <ModeIcon className="w-4 h-4 text-accent shrink-0" />
          <Text
            variant="h2"
            tone="primary"
            className="group-hover:text-accent transition-colors truncate"
          >
            {embed.name}
          </Text>
          <EmbedStatusBadge embed={embed} collections={collections} />
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <InfoPopover
              title={t('info.assistant_details', 'Assistant & Knowledge Scope Details')}
              items={[
                {
                  label: t('info.embed_name', 'Assistant Name'),
                  value: embed.name,
                  mono: false,
                },
                {
                  label: t('info.embed_id', 'System Embed ID'),
                  value: embed.id,
                },
                {
                  label: t('info.surface_mode', 'Presentation Mode'),
                  value: modeMeta.label,
                  mono: false,
                },
                {
                  label: t('info.surface_id', 'Surface Contract ID'),
                  value: modeMeta.surfaceId,
                },
                {
                  label: 'Readiness State',
                  value: readiness.label,
                  mono: false,
                },
                {
                  label: t('info.collection_ids', 'Collection IDs'),
                  value: colIds.join(', ') || 'NONE',
                },
              ]}
            />
          </div>
        </div>

        {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
        <div className="text-xs text-ink-secondary flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{modeMeta.label}</span>
          <span aria-hidden="true">·</span>
          <span>Scope: {colNames}</span>
          {docCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-2xs text-accent">
                {docCount} pinned doc(s)
              </span>
            </>
          )}
          {embed.contextConfig?.useCurrentPage && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-2xs text-ink-muted">
                Route-aware{routeRuleCount > 0 ? ` (${routeRuleCount} rules)` : ''}
              </span>
            </>
          )}
        </div>

        {!readiness.readyForInstallation && (
          <div className="flex items-center gap-1.5 text-2xs font-mono text-danger pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Not ready — Complete configuration ({readiness.missingReasons[0]}) to generate
              installation instructions.
            </span>
          </div>
        )}
      </div>

      {/* Readiness-Aware Collection Actions */}
      <div
        className="flex flex-wrap items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {readiness.readyForInstallation ? (
          <>
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onOpenInstallGuide(embed.id);
              }}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Installation Guide</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(embed.id);
              }}
            >
              <Pencil className="w-3 h-3" />
              <span>
                {readiness.state === 'draft'
                  ? 'Continue'
                  : t('common.edit', 'Edit')}
              </span>
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(embed.id);
            }}
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Continue Configuration</span>
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          title="Test in Host Simulator"
          onClick={(e) => {
            e.stopPropagation();
            onLaunchSimulator(embed.id);
          }}
        >
          <span>{t('embed.launch_simulator', 'Simulator')}</span>
          <ExternalLink className="w-3 h-3" />
        </Button>

        <Button
          size="sm"
          variant="secondary"
          title={t('common.duplicate', 'Duplicate')}
          aria-label={t('common.duplicate', 'Duplicate')}
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(embed.id);
          }}
        >
          <Files className="w-3.5 h-3.5" />
        </Button>

        {canDelete && onDelete && (
          <Button
            size="sm"
            variant="danger"
            title={t('common.delete', 'Delete')}
            aria-label={t('common.delete', 'Delete')}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(embed.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}

        <ChevronRight className="w-4 h-4 text-ink-muted group-hover:text-ink transition-colors ml-0.5" />
      </div>
    </Card>
  );
};
