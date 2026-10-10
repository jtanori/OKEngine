# DATA-01 — Repository, Persistence & Storage Lifecycle Contract

| Field | Value |
| :--- | :--- |
| **Document ID** | `DATA-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Data & Backend Engineering |
| **Authority** | Blocking Gate — Phase 03 (Server Boundary & Repositories) |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `STG-01` |
| **Source of Truth** | `src/repositories/index.ts`, `src/lib/supabase/server.ts`, `src/services/store.ts` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Explicit Backend Selection & Zero Silent Fallback Contract

In early prototyping, `src/repositories/index.ts` silently fell back to in-memory seed arrays (`fallbackCollections`, `fallbackDocuments`, `fallbackEmbeds`) whenever `getSupabaseServerClient()` returned `null` or when a Supabase query returned an `error` (e.g., lines 84–89 and 118–126 of `src/repositories/index.ts`).

**Why Silent Fallback Is Prohibited in Staging and Production**:
If a Supabase network timeout, RLS policy rejection, or credential misconfiguration occurs in staging, falling back to `INITIAL_DOCUMENTS` causes writes to vanish on restart and serves synthetic seed data as if it were live customer data.

### 1.1 `OKENG_DATA_MODE` Startup & Runtime Enforcement

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SERVER STARTUP INITIALIZATION                         │
│                                                                              │
│   Read `OKENG_ENV` (`development` | `test` | `staging` | `production`)       │
│   Read `OKENG_DATA_MODE` (`memory` | `supabase`)                             │
└───────────────────┬──────────────────────────────────────┬───────────────────┘
                    │                                      │
        [OKENG_ENV in staging/prod]            [OKENG_ENV in dev/test]
                    │                                      │
                    ▼                                      ▼
┌───────────────────────────────────────┐  ┌───────────────────────────────────┐
│ • Require `OKENG_DATA_MODE=supabase`  │  │ • Allow `memory` or `supabase`    │
│ • Verify `SUPABASE_URL`, `ANON_KEY`,  │  │ • If `memory`, initialize         │
│   `SERVICE_ROLE_KEY`, `SESSION_SECRET`│  │   `InMemorySeedRepositoryAdapter` │
│ • If missing/invalid -> `exit(1)`     │  │   and badge UI `Local Demo Mode`  │
│ • Runtime DB error -> Throw           │  └───────────────────────────────────┘
│   `RepositoryUnavailableError (503)`  │
│ • NEVER read/write `fallback*` arrays │
└───────────────────────────────────────┘
```

---

## 2. Dual-Client Supabase Factory Specification (`src/lib/supabase/server.ts`)

The server persistence layer separates database access into two strictly typed client factories:

### 2.1 Request-Scoped User RLS Client (`createUserScopedSupabaseClient`)
- **Initialization**:
  ```typescript
  export function createUserScopedSupabaseClient(userAccessToken: string): SupabaseClient {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new RepositoryConfigurationError('SUPABASE_URL and SUPABASE_ANON_KEY are required.');
    }
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      },
    });
  }
  ```
- **Security Guarantee**: Every query executed on this client runs under the PostgreSQL `authenticated` role with `auth.uid()` set to the verified user ID and `FORCE ROW LEVEL SECURITY` active across all 17 tables (`DB-01 §2`). Even if an application route omitted a `WHERE workspace_id = ...` filter, PostgreSQL RLS blocks cross-tenant access.

### 2.2 Isolated System Privileged Client (`src/repositories/systemPrivileged.ts`)
- **Initialization**: Uses `SUPABASE_SERVICE_ROLE_KEY` inside a module that is **not** exported to route handlers directly.
- **Permitted Methods Only (`SEC-01 §4`)**:
  1. `appendSecurityAuditLog(entry: NewSecurityAuditLog): Promise<void>`
  2. `recordUsageEvent(event: NewUsageRecord): Promise<void>`
  3. `loadVerifiedEmbedCorpus(scope: VerifiedEmbedCorpusRequest): Promise<{ documents: KnowledgeDocument[]; chunks: DocumentChunk[] }>`
  4. `syncAuthenticatedUserAccount(user: VerifiedAuthUser): Promise<User>`

---

## 3. Mock-to-Repository Translation Matrix

Every mocked data structure across `server.ts`, `src/services/auth.ts`, and `src/services/store.ts` maps to a canonical repository interface backed by PostgreSQL in `staging`/`production`:

| Legacy Mocked Location | Legacy Symbol | Canonical Repository Class | Backing PostgreSQL Table / Bucket | Ownership & Isolation Invariant |
| :--- | :--- | :--- | :--- | :--- |
| `src/data/seedData.ts` | `INITIAL_WORKSPACE` | `WorkspaceRepository` | `public.workspaces` | PK `id`, `slug`; `signing_secret_ciphertext` decrypted only inside server token verifier. |
| `src/services/auth.ts` (line 110) | `DEMO_USERS` | `UserRepository` + Supabase Auth | `auth.users` + `public.users` | Synced on login/signup (`SRV-PRIV-04`); `account_status = 'ACTIVE'` required. |
| `server.ts` (line 220) & `src/services/auth.ts` (line 149) | `SERVER_MEMBERSHIPS`, `DEFAULT_MEMBERSHIPS` | `MembershipRepository` | `public.workspace_memberships` | Composite `UNIQUE (workspace_id, user_id)`; protected by `trg_protect_last_workspace_owner`. |
| `src/data/seedData.ts` | `INITIAL_COLLECTIONS` | `CollectionRepository` | `public.collections` | Composite `UNIQUE (workspace_id, id)`; visibility in `('everyone', 'members', 'admins')`. |
| `src/data/seedData.ts` | `INITIAL_DOCUMENTS` | `DocumentRepository` | `public.documents`, `public.document_versions`, `public.document_chunks` | Composite `UNIQUE (workspace_id, collection_id, id)`; soft-deleted rows (`deleted_at IS NOT NULL`) excluded pre-retrieval. |
| `src/repositories/index.ts` (line 51) | `fallbackStorageObjects` | `FileRepository` & `StorageRepository` | `public.files` + `storage.objects` (`workspace-files`) | Composite FK `(workspace_id, collection_id)`; server-normalized path `workspace-files/{wsId}/{colId}/{fileId}_{name}`. |
| `src/data/seedData.ts` | `INITIAL_PUBLIC_EMBEDS` | `EmbedRepository` | `public.embeds` | Composite `UNIQUE (workspace_id, id)`; `knowledge_scope` validated against workspace collections. |
| `src/services/store.ts` (line 162) | `conversationHistory` | `ConversationRepository` | `public.conversations`, `public.conversation_messages` | Composite FK `(workspace_id, conversation_id)`; messages are append-only immutable. |
| `server.ts` (line 902) | `SHARE_STORE` | `ShareRepository` | `public.shared_snapshots` | `is_public_document` derived from source collection `visibility = 'everyone'`; supports `expires_at` and `revoked_at`. |
| `server.ts` (line 915) | `ISSUE_REPORTS` | `FeedbackRepository` | `public.issue_reports` | Composite FK `(workspace_id, document_id)`; bounded notes (`<= 500` chars). |
| `src/services/auth.ts` (line 197) | `DEFAULT_AUDIT_LOGS` | `AuditRepository` | `public.security_audit_logs` | Append-only via `SRV-PRIV-01`; `UPDATE` and `DELETE` forbidden by RLS. |

---

## 4. Two-Phase File Upload, Indexing & Orphan Reconciliation Contract

Uploading and indexing a knowledge document touches three storage layers (`public.files`, Supabase Storage `storage.objects`, and `public.documents` + `public.document_chunks`). To guarantee consistency without leaving orphaned files in Supabase Storage or unindexed zombie documents in PostgreSQL:

1. **Phase 1 — Metadata Reservation (`upload_status = 'pending_upload'`)**:
   - Verify caller holds `content.write` on `workspaceId` and that `collectionId` belongs to `workspaceId`.
   - Validate filename (`validateSafeFilename`), MIME type (`text/markdown`, `text/plain`, `application/pdf`), and byte size (`<= 10,485,760` bytes).
   - Insert `public.files` record with `id = file_<ulid>`, `storage_path = workspace-files/${workspaceId}/${collectionId}/${fileId}_${sanitizedFilename}`, and `upload_status = 'pending_upload'`.
2. **Phase 2 — Private Storage Object Write**:
   - Upload file bytes to `storage.from('workspace-files').upload(storagePath, buffer, { contentType, upsert: false })`.
   - If the storage upload fails, delete the `pending_upload` row from `public.files` and return `502 STORAGE_UPLOAD_FAILED`.
3. **Phase 3 — Deterministic Parsing, Chunking & Activation**:
   - Create or update the `public.documents` record with `status = 'indexing'`, append a new snapshot to `public.document_versions`, and atomically replace rows in `public.document_chunks` for `(workspace_id, collection_id, document_id)`.
   - Transition `public.documents.status = 'ready'`, `public.files.upload_status = 'ready'`, and increment `public.workspaces.knowledge_version`.
   - If parsing or chunk insertion fails, mark `public.documents.status = 'failed'`, delete the uploaded storage object, and mark `public.files.upload_status = 'orphaned'`.
4. **Orphan Cleanup Sweep**:
   - Any `public.files` row remaining in `upload_status = 'pending_upload'` or `'orphaned'` for `> 15 minutes` has its corresponding `storage.objects` path purged and its status transitioned to `'deleted'`.
