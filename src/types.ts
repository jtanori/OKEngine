export type AccessVisibility = 'everyone' | 'members' | 'admins';
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed';
export type SupportedLanguage = 'en' | 'es';
export type TranslationStatus = 'AVAILABLE' | 'NOT_AVAILABLE' | 'OUTDATED';

export interface DocumentTranslation {
  language: SupportedLanguage;
  status: TranslationStatus;
  sourceVersion?: number;
  title: string;
  summary: string;
  steps?: string[];
  bullets?: string[];
  content: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  publicKey: string;
  signingSecret: string;
  defaultLanguage?: SupportedLanguage;
  knowledgeVersion?: number;
  createdAt: string;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  visibility: AccessVisibility;
  fileCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface DocumentNextStep {
  label: string;
  url: string;
}

export interface KnowledgeDocument {
  id: string;
  workspaceId: string;
  collectionId: string;
  title: string;
  filename: string;
  content: string;
  type: 'markdown' | 'text' | 'pdf';
  status: DocumentStatus;
  fileSize: string;
  nextStep?: DocumentNextStep;
  createdAt: string;
  updatedAt: string;
  indexedAt: string;
  chunkCount: number;
  deletedAt?: string;
  // I18N-001 Document Language & Translation Metadata
  language?: SupportedLanguage;
  languageConfidence?: number;
  languageDetectionMethod?: 'automatic' | 'explicit';
  translations?: Partial<Record<SupportedLanguage, DocumentTranslation>>;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  collectionId: string;
  collectionVisibility: AccessVisibility;
  documentTitle: string;
  filename: string;
  content: string;
  embedding?: number[];
  lineRange?: string;
}

export interface SourceCitation {
  docId: string;
  title: string;
  filename: string;
  collectionId: string;
  collectionName?: string;
  snippet: string;
  similarity: number;
  language?: SupportedLanguage;
  nextStep?: DocumentNextStep;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  cta?: DocumentNextStep;
  feedback?: 'up' | 'down';
  createdAt: string;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  userId: string;
  role: AccessVisibility;
  currentUrl: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TestQueryDiagnosis {
  question: string;
  role: AccessVisibility;
  currentUrl: string;
  authorizedCollections: { id: string; name: string; visibility: AccessVisibility }[];
  blockedCollections: { id: string; name: string; visibility: AccessVisibility }[];
  retrievedChunks: {
    chunkId: string;
    documentId?: string;
    collectionId?: string;
    documentTitle: string;
    filename: string;
    sectionHeading?: string;
    similarity: number;
    bm25Score?: number;
    routeBoost?: number;
    routeBoostApplied?: boolean;
    lineStart?: number;
    lineEnd?: number;
    matchedTokens?: string[];
    preview: string;
  }[];
  answer: string;
  sources: SourceCitation[];
  cta?: DocumentNextStep;
  latencyMs: number;
  tokens: number;
}

export interface EmbedConfig {
  collectionId: string; // 'all' or specific collection id
  position: 'bottom-right' | 'bottom-left';
  accentColor: string;
  greetingText: string;
  placeholderText: string;
}

export type EmbedPresentationMode =
  | 'widget'         // SU-EMBED-CHAT
  | 'panel'          // SU-EMBED-PANEL
  | 'fullscreen'     // SU-EMBED-FULLSCREEN
  | 'inline'         // SU-EMBED-INLINE
  | 'documentation'  // SU-EMBED-DOCUMENTATION
  | 'contextual';    // SU-EMBED-CONTEXTUAL-HELP

export interface EmbedKnowledgeScope {
  collectionIds: string[];
  documentIds?: string[]; // Optional document-level narrowing within authorized collections
}

export interface EmbedRouteRule {
  id?: string;
  routePattern: string;
  promptTitle: string;
  suggestedQuestions: string[];
  pinnedDocumentIds?: string[];
  documentIds?: string[];
  collectionIds?: string[];
}

export interface EmbedContextConfig {
  useCurrentPage: boolean;
  useHostUserContext: boolean;
  routeRules?: EmbedRouteRule[];
}

export interface EmbedBehaviorConfig {
  initialState: 'closed' | 'open';
  suggestedQuestions: string[];
  showNavigation: boolean;
  ctaBehavior: 'inline-link' | 'new-tab' | 'hidden';
}

export interface EmbedAppearanceConfig {
  theme: 'light' | 'system' | 'high-contrast';
  width: string;
  position: 'right' | 'left' | 'bottom-right' | 'bottom-left';
  radius: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

export interface EmbedInstance {
  id: string;
  workspaceId: string;
  name: string;
  status?: 'active' | 'draft';
  mode?: EmbedPresentationMode;
  knowledgeScope?: EmbedKnowledgeScope;
  contextConfig?: EmbedContextConfig;
  behaviorConfig?: EmbedBehaviorConfig;
  appearanceConfig?: EmbedAppearanceConfig;
  // Backward-compatible flat fields
  position: 'bottom-right' | 'bottom-left';
  accentColor: string;
  greetingText: string;
  placeholderText: string;
  allowedCollectionIds: string[];
  language?: SupportedLanguage;
  locale?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// AUTH-01, AUTH-02 & AUTH-03 Security Types
// ==========================================

export type PlatformRole = 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | null;
export type WorkspaceRole = 'WORKSPACE_OWNER' | 'WORKSPACE_USER';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export type WorkspacePermission =
  | 'workspace.read'
  | 'workspace.settings.manage'
  | 'workspace.users.manage'
  | 'collection.read'
  | 'collection.write'
  | 'collection.delete'
  | 'collection.access.manage'
  | 'content.read'
  | 'content.write'
  | 'content.delete'
  | 'embed.read'
  | 'embed.manage'
  | 'test.execute'
  | 'conversations.read';

export type PlatformPermission =
  | 'platform.users.manage'
  | 'platform.admin.manage'
  | 'platform.workspace.inspect'
  | 'platform.customer_data.access'
  | 'platform.settings.manage'
  | 'platform.approvals.manage';

export interface User {
  id: string;
  email: string;
  name: string;
  status: AccountStatus;
  platformRole: PlatformRole;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  role: WorkspaceRole;
  permissions: WorkspacePermission[];
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminGrant {
  id: string;
  userId: string;
  permission: PlatformPermission | 'customer_data.exceptional_access';
  grantedBy: string;
  reason: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  requestedBy: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  approvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  actorPlatformRole?: PlatformRole;
  workspaceId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface RequestContext {
  userId: string;
  platformRole: PlatformRole;
  workspaceId: string;
  workspaceRole: WorkspaceRole;
  permissions: WorkspacePermission[];
  authMethod: 'session' | 'signed_embed_token';
  sessionId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  permission?: string;
  resource?: string;
  requires_approval?: boolean;
}

export interface EmbeddedTokenClaims {
  iss: string;
  aud: string;
  sub?: string;
  user_id?: string;
  workspace_id: string;
  embed_id?: string;
  role: 'everyone' | 'members' | 'admins' | 'member' | 'admin' | 'visitor' | 'customer' | 'employee' | 'manager';
  iat: number;
  exp: number;
  jti?: string;
  current_url?: string;
}

export type CollectionVisibility = 'everyone' | 'members' | 'admins';

export type EmbedIdentityClaims = {
  sub: string;
  role: 'member' | 'admin';
  workspace_id: string;
  embed_id?: string;
  iat: number;
  exp: number;
};

export type EmbedIdentity =
  | {
      kind: 'anonymous';
    }
  | {
      kind: 'authenticated';
      userId: string;
      role: 'member' | 'admin';
    };

export type AuthorizationScope = {
  identity: EmbedIdentity;
  collectionIds: readonly string[];
};

export type EmbedVisibilityProfile = 'public-only' | 'mixed' | 'protected-only';

export type EmbedInstallationFacts = {
  hasPublicCollections: boolean;
  hasProtectedCollections: boolean;
  allowsAnonymousInitialization: true;
  hasAnonymousAccessibleContent: boolean;
  supportsAuthenticatedAccess: boolean;
  requiresVerifiedIdentityForProtectedContent: boolean;
  expectsCurrentUrl: boolean;
  expectsRouteRules: boolean;
  routeRuleCount: number;
};

export interface EnforcementResult {
  authorized: boolean;
  status: 200 | 401 | 403 | 404;
  error?: string;
  context?: RequestContext;
}


