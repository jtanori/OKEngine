# DB-01 — PostgreSQL Security Migration & Storage Isolation Specification

| Field | Value |
| :--- | :--- |
| **Document ID** | `DB-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Data & Security Engineering |
| **Authority** | Blocking Gate — Phase 02 (Database & Identity Foundations) |
| **Dependencies** | `AUTH-02`, `SEC-01`, `DATA-01`, `supabase/migrations/20261003000001_okeng_schema.sql`, `supabase/migrations/20261003000002_okeng_rls_and_storage.sql`, `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` |
| **Engine Baseline** | **PostgreSQL 15.0+** (Required for column-specific `ON DELETE SET NULL (file_id)` / `(embed_id)` on composite foreign keys) |
| **Source of Truth** | `supabase/migrations/` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Verified Baseline Audit of Existing Migrations

Direct inspection of `20261003000001_okeng_schema.sql` (201 lines) and `20261003000002_okeng_rls_and_storage.sql` (128 lines) established the following factual baseline prior to authoring `20261009000003_okeng_staging_security_hardening.sql`:

1. **7 Tables With `ENABLE ROW LEVEL SECURITY` and Zero Policies**:
   - `public.users`, `public.workspace_memberships`, `public.document_versions`, `public.conversation_messages`, `public.admin_grants`, `public.critical_approvals`, and `public.security_audit_logs` have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` in `20261003000002_okeng_rls_and_storage.sql` (lines 7–20), but **no `CREATE POLICY` statements** were defined for them. Under PostgreSQL default-deny semantics, any query executed via a request-scoped authenticated client (`auth.uid()`) against those 7 tables fails or returns zero rows.
2. **Overly Broad `FOR ALL` Policies Missing Granular Permission Checks**:
   - `collections_owner_write` and `documents_owner_write` used `FOR ALL USING (public.is_workspace_owner(workspace_id))`, which blocked legitimate `WORKSPACE_USER` editors holding `collection.write` or `content.write` permissions from creating or editing documents under RLS.
   - `files_tenant_isolation`, `embeds_tenant_isolation`, `conversations_tenant_isolation`, and `usage_tenant_isolation` used `FOR ALL USING (public.has_active_workspace_membership(workspace_id))`, allowing any read-only workspace member (`usr_elena_309`) to mutate or delete files, embeds, conversations, and usage metering records if queried via a user-scoped client.
3. **Missing `FORCE ROW LEVEL SECURITY`**:
   - None of the 15 existing tables specified `FORCE ROW LEVEL SECURITY`, meaning table owners bypassed RLS even when testing non-service roles.
4. **Missing `search_path` Hardening on `SECURITY DEFINER` Functions**:
   - `public.has_active_workspace_membership(TEXT)` and `public.is_workspace_owner(TEXT)` (lines 23–57 of `20261003000002_okeng_rls_and_storage.sql`) were declared `SECURITY DEFINER` without `SET search_path = public, pg_temp` and without `REVOKE ALL ON FUNCTION ... FROM PUBLIC`.
5. **Relational & Cross-Tenant Foreign Key Gaps**:
   - `collections` (`UNIQUE (workspace_id, id)`) and `documents` (`UNIQUE (workspace_id, id)`) already supported composite foreign keys on `files(workspace_id, collection_id)`, `documents(workspace_id, collection_id)`, `document_versions(workspace_id, document_id)`, and `document_chunks(workspace_id, document_id)`.
   - However, `documents.file_id`, `conversations.embed_id`, and `conversation_messages.conversation_id` used single-column foreign keys (`REFERENCES public.files(id)`, `REFERENCES public.embeds(id)`, `REFERENCES public.conversations(id)`), and `document_chunks` did not constrain `(workspace_id, collection_id, document_id)` together against `documents(workspace_id, collection_id, id)`.
6. **Two Unpersisted Server Memory Stores**:
   - `SHARE_STORE` (`server.ts` line 902) and `ISSUE_REPORTS` (`server.ts` line 915) existed only as in-memory JavaScript data structures with no backing PostgreSQL tables.

---

## 2. Per-Table, Per-Operation RLS Authorization Matrix

Every table in `public` is governed by `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`. Rather than applying blanket CRUD policies, `20261009000003_okeng_staging_security_hardening.sql` implements only the operations permitted by each table's domain contract:

| # | Table | `SELECT` (`USING`) | `INSERT` (`WITH CHECK`) | `UPDATE` (`USING` & `WITH CHECK`) | `DELETE` (`USING`) | Positive & Negative DB Test IDs |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `workspaces` | `has_workspace_permission(id, 'workspace.read')` | *Denied to client roles* (`service_role` provisioning only) | `has_workspace_permission(id, 'workspace.settings.manage')` | *Denied to client roles* (requires dual-operator approval) | `DB-RLS-01` (Pos: Member select; Neg: Non-member select / Member update) |
| 2 | `users` | `id = auth.uid()::text` OR co-member in shared `ACTIVE` workspace | *Denied to client roles* (provisioned via server auth sync) | `id = auth.uid()::text AND account_status = 'ACTIVE'` (`platform_role` locked via `IS NOT DISTINCT FROM`) | *Denied to client roles* | `DB-RLS-02` (Pos: Self update name; Neg: Self escalate `platform_role`) |
| 3 | `workspace_memberships` | `user_id = auth.uid()::text` OR `has_workspace_permission(workspace_id, 'workspace.read')` | `has_workspace_permission(workspace_id, 'workspace.users.manage')` | `has_workspace_permission(workspace_id, 'workspace.users.manage')` + Trigger `trg_protect_last_workspace_owner` | `has_workspace_permission(workspace_id, 'workspace.users.manage')` + Trigger `trg_protect_last_workspace_owner` | `DB-RLS-03` (Pos: Owner invite; Neg: Demote/delete last owner `23514`) |
| 4 | `collections` | `visibility = 'everyone'` OR `has_workspace_permission(workspace_id, 'collection.read')` | `has_workspace_permission(workspace_id, 'collection.write')` | `has_workspace_permission(workspace_id, 'collection.write')` | `has_workspace_permission(workspace_id, 'collection.delete')` | `DB-RLS-04` (Pos: Editor insert; Neg: Read-only user insert/delete) |
| 5 | `files` | `has_workspace_permission(workspace_id, 'content.read')` | `has_workspace_permission(workspace_id, 'content.write')` + collection existence check | *Denied (Immutable file record)* | `has_workspace_permission(workspace_id, 'content.delete')` | `DB-RLS-05` (Pos: Editor upload; Neg: Any user update file metadata) |
| 6 | `documents` | `deleted_at IS NULL AND status <> 'deleted'` AND (collection `everyone` OR `has_workspace_permission(workspace_id, 'content.read')`) | `has_workspace_permission(workspace_id, 'content.write')` + collection in same workspace | `has_workspace_permission(workspace_id, 'content.write')` (setting `status = 'deleted'` requires `content.delete`) | *Denied to client roles* (soft-delete lifecycle enforced) | `DB-RLS-06` (Pos: Editor update; Neg: Read-only update / soft-deleted row select) |
| 7 | `document_versions` | `has_workspace_permission(workspace_id, 'content.read')` | `has_workspace_permission(workspace_id, 'content.write')` | *Denied (Immutable version snapshot)* | *Denied (Cascades only on parent hard purge)* | `DB-RLS-07` (Pos: Editor insert version; Neg: Owner/Editor mutate version) |
| 8 | `document_chunks` | Collection `everyone` OR `has_workspace_permission(workspace_id, 'content.read')` | `has_workspace_permission(workspace_id, 'content.write')` | *Denied (Atomic delete + re-insert on re-index)* | `has_workspace_permission(workspace_id, 'content.write')` | `DB-RLS-08` (Pos: Re-index replace; Neg: Cross-tenant chunk insert) |
| 9 | `embeds` | `has_workspace_permission(workspace_id, 'embed.read')` | `has_workspace_permission(workspace_id, 'embed.manage')` | `has_workspace_permission(workspace_id, 'embed.manage')` | `has_workspace_permission(workspace_id, 'embed.manage')` | `DB-RLS-09` (Pos: Owner manage embed; Neg: Editor without `embed.manage` mutate) |
| 10 | `conversations` | `has_workspace_permission(workspace_id, 'conversations.read')` | `has_workspace_permission(workspace_id, 'test.execute')` (or `service_role` runtime writer) | `has_workspace_permission(workspace_id, 'conversations.read')` (feedback rating) | `is_workspace_owner(workspace_id)` | `DB-RLS-10` (Pos: Member read/rate; Neg: Non-owner delete transcript) |
| 11 | `conversation_messages` | `has_workspace_permission(workspace_id, 'conversations.read')` | `has_workspace_permission(workspace_id, 'test.execute')` (or `service_role` runtime writer) | *Denied (Immutable transcript message)* | *Denied (Cascades from parent conversation delete)* | `DB-RLS-11` (Pos: Append message; Neg: Mutate or delete individual message) |
| 12 | `usage_records` | `is_workspace_owner(workspace_id)` | *Denied to client roles* (`service_role` metering writer only) | *Denied (Immutable billing/usage ledger)* | *Denied (Immutable billing/usage ledger)* | `DB-RLS-12` (Pos: Owner select usage; Neg: Client insert/update/delete usage) |
| 13 | `admin_grants` | `is_workspace_owner(workspace_id)` OR `is_active_platform_admin()` | `is_active_platform_admin() AND admin_user_id <> approved_by` | `is_workspace_owner(workspace_id) OR is_active_platform_admin()` (`revoked_at IS NOT NULL`) | *Denied (Immutable governance record)* | `DB-RLS-13` (Pos: Dual-operator grant; Neg: Self-approval `23514`) |
| 14 | `critical_approvals` | `is_workspace_owner(workspace_id)` OR `is_active_platform_admin()` | `requested_by = auth.uid()::text` AND (`is_workspace_owner` OR `is_active_platform_admin`) | `status = 'PENDING' AND approved_by = auth.uid()::text AND requested_by <> approved_by` | *Denied (Immutable governance record)* | `DB-RLS-14` (Pos: Second operator approve; Neg: Requester self-approve) |
| 15 | `security_audit_logs` | `is_workspace_owner(workspace_id)` OR `is_active_platform_admin()` | *Denied to client roles* (`service_role` audit writer only) | *Denied (Append-only immutable audit trail)* | *Denied (Append-only immutable audit trail)* | `DB-RLS-15` (Pos: Owner read workspace logs; Neg: Any user update/delete log) |
| 16 | `shared_snapshots` | `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())` AND (`is_public_document = true` OR `has_workspace_permission(workspace_id, 'content.read')`) | `has_workspace_permission(workspace_id, 'content.read')` (public flag requires `visibility = 'everyone'`) | `has_workspace_permission(workspace_id, 'content.write')` (`revoked_at IS NOT NULL`) | `is_workspace_owner(workspace_id)` | `DB-RLS-16` (Pos: Public share read; Neg: Mark restricted doc as `is_public_document = true`) |
| 17 | `issue_reports` | `has_workspace_permission(workspace_id, 'workspace.read')` | `has_workspace_permission(workspace_id, 'workspace.read')` (or `service_role` embed feedback) | `has_workspace_permission(workspace_id, 'content.write')` | `is_workspace_owner(workspace_id)` | `DB-RLS-17` (Pos: Member submit report; Neg: Cross-tenant report read) |

---

## 3. Hardened `SECURITY DEFINER` Helper Specification

All four authorization helpers (`has_active_workspace_membership`, `is_workspace_owner`, `has_workspace_permission`, `is_active_platform_admin`) enforce the following security invariants:

1. **Authoritative Identity Source**: Resolves the caller strictly from PostgreSQL session context `auth.uid()::text` populated by Supabase PostgREST from the verified request JWT. If `auth.uid()` is `NULL`, all four functions immediately return `false`.
2. **Active Account & Membership Requirement**: Joins `public.workspace_memberships wm` with `public.users u ON u.id = wm.user_id` and requires both `wm.status = 'ACTIVE'` and `u.account_status = 'ACTIVE'`. Suspended or revoked members lose database access immediately on the next query without waiting for JWT expiry.
3. **Owner & Granular Permission Evaluation**:
   - `WORKSPACE_OWNER` automatically satisfies all workspace-scoped permission checks (`wm.role = 'WORKSPACE_OWNER'`).
   - `WORKSPACE_USER` satisfies `required_perm` only if `jsonb_typeof(wm.permissions) = 'array'` and `wm.permissions ? required_perm` evaluates to `true`. Missing, null, or non-array JSONB values fail closed (`false`).
4. **Search-Path & Execution Privilege Lockdown**:
   - Declared with `SET search_path = public, pg_temp` so malicious objects in user-writable schemas can never shadow `public.workspace_memberships` or `public.users`.
   - `REVOKE ALL ON FUNCTION ... FROM PUBLIC` followed by explicit `GRANT EXECUTE ON FUNCTION ... TO authenticated, service_role`.

---

## 4. Complete Composite Tenant Constraint Inventory

To prevent cross-workspace relational linking (e.g., attaching a `Workspace A` document chunk to a `Workspace B` collection, or linking a `Workspace A` conversation message to a `Workspace B` conversation), the schema enforces composite unique constraints and composite foreign keys across every parent/child relationship:

| Child Table | Child Foreign Key Columns | Parent Table | Referenced Unique Constraint | Optional? | `ON DELETE` / `ON UPDATE` | Validation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `workspace_memberships` | `(workspace_id)` | `workspaces` | `workspaces_pkey (id)` | Required | `CASCADE` / `NO ACTION` | Validated in `00001` |
| `collections` | `(workspace_id)` | `workspaces` | `workspaces_pkey (id)` | Required | `CASCADE` / `NO ACTION` | Validated in `00001` |
| `files` | `(workspace_id, collection_id)` | `collections` | `UNIQUE (workspace_id, id)` | Required | `CASCADE` / `NO ACTION` | Validated in `00001` |
| `documents` | `(workspace_id, collection_id)` | `collections` | `UNIQUE (workspace_id, id)` | Required | `CASCADE` / `NO ACTION` | Validated in `00001` |
| `documents` | `(workspace_id, file_id)` | `files` | `uq_files_workspace_id (workspace_id, id)` | Optional (`file_id NULL`) | `SET NULL (file_id)` / `NO ACTION` (PostgreSQL 15+) | Added `NOT VALID` + `VALIDATE` in `00003` |
| `document_versions` | `(workspace_id, document_id)` | `documents` | `UNIQUE (workspace_id, id)` | Required | `CASCADE` / `NO ACTION` | Validated in `00001` |
| `document_chunks` | `(workspace_id, collection_id, document_id)` | `documents` | `uq_documents_workspace_col_id (workspace_id, collection_id, id)` | Required | `CASCADE` / `CASCADE` | Added `NOT VALID` + `VALIDATE` in `00003` |
| `conversations` | `(workspace_id, embed_id)` | `embeds` | `uq_embeds_workspace_id (workspace_id, id)` | Optional (`embed_id NULL`) | `SET NULL (embed_id)` / `NO ACTION` (PostgreSQL 15+) | Added `NOT VALID` + `VALIDATE` in `00003` |
| `conversation_messages` | `(workspace_id, conversation_id)` | `conversations` | `uq_conversations_workspace_id (workspace_id, id)` | Required | `CASCADE` / `NO ACTION` | Added `NOT VALID` + `VALIDATE` in `00003` |
| `shared_snapshots` | `(workspace_id, collection_id)` | `collections` | `UNIQUE (workspace_id, id)` | Required | `CASCADE` / `NO ACTION` | Added `NOT VALID` + `VALIDATE` in `00003` |
| `shared_snapshots` | `(workspace_id, document_id)` | `documents` | `UNIQUE (workspace_id, id)` | Optional (`document_id NULL`) | `CASCADE` / `NO ACTION` | Added `NOT VALID` + `VALIDATE` in `00003` |
| `issue_reports` | `(workspace_id, document_id)` | `documents` | `UNIQUE (workspace_id, id)` | Optional (`document_id NULL`) | `SET NULL (document_id)` / `NO ACTION` (PostgreSQL 15+) | Added `NOT VALID` + `VALIDATE` in `00003` |

---

## 5. Supabase Storage Threat Model & Object Policy Contract

1. **Private Bucket Enforcement**:
   - Bucket `workspace-files` is strictly private (`public = false`), capped at `10,485,760` bytes (10 MB), and restricted to `['text/markdown', 'text/plain', 'application/pdf']`.
2. **Server-Generated Normalized Storage Path**:
   - Object keys follow the immutable pattern: `workspace-files/{workspace_id}/{collection_id}/{file_id}_{sanitized_filename}`.
   - The server constructs the path after verifying (1) caller `content.write` permission in `workspace_id`, (2) `collection_id` belongs to `workspace_id`, and (3) `validateSafeFilename(filename)` passes with zero path-traversal tokens (`..`, `/`, `\`, null bytes).
3. **Collision & Overwrite Prevention**:
   - Every upload generates a fresh unique `file_id` (`file_<ulid>`), writes to a new storage key with `upsert: false`, and disables `UPDATE` policies on `storage.objects`. Re-uploading a file with the same human filename creates a new `files` record and increments `document_versions` without silently overwriting historical storage objects.
4. **Short-Lived Authorized Download Contract**:
   - Clients never receive permanent direct storage URLs. `GET /api/workspaces/:workspaceId/files/:fileId/download` verifies `content.read` permission on `:workspaceId`, confirms `file.workspace_id === :workspaceId`, and either streams the object with `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` or mints a 60-second single-use signed URL via Supabase Storage.
5. **Two-Phase Upload & Orphan Reconciliation**:
   - Step 1: Insert row into `public.files` with `upload_status = 'pending_upload'`.
   - Step 2: Upload binary/text payload to `storage.objects`.
   - Step 3: Parse chunks, insert `public.documents` + `public.document_chunks`, and mark `public.files.upload_status = 'ready'`.
   - If Step 2 or Step 3 fails, the error handler immediately deletes the storage object and marks or deletes the `pending_upload` row. A scheduled reconciliation job purges any `pending_upload` records older than 15 minutes.

---

## 6. Operational Migration Sequence, Preflight Audit & Rollback Contract

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 1] Inventory Deployed Schema & Capture Pre-Migration Row Counts        │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 2] Run Preflight Constraint Violation Query (Orphans & Cross-Tenant)   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 3] Rehearse Migration on Disposable Staging Clone Database             │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 4] Take Pre-Cutover Snapshot Backup & Verify Point-in-Time Restore     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 5] Apply `20261009000003_okeng_staging_security_hardening.sql`         │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 6] Verify 17 Tables Have `relrowsecurity=t` AND `relforcerowsecurity=t`│
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 7] Execute Automated Cross-Tenant Negative & Positive RLS Test Suite   │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Step 8] Release Gate Evaluation: Pass -> Enable Traffic │ Fail -> Rollback  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Preflight Data Integrity Audit Query (Run Before Step 5)
Before applying composite constraints on an existing staging database, operators execute the following read-only audit query to confirm zero orphaned or cross-tenant rows exist:

```sql
-- Preflight check: must return 0 rows across all 4 checks before applying migration 00003
SELECT 'chunk_collection_mismatch' AS violation, dc.id, dc.workspace_id
FROM public.document_chunks dc
LEFT JOIN public.documents d
  ON d.workspace_id = dc.workspace_id AND d.collection_id = dc.collection_id AND d.id = dc.document_id
WHERE d.id IS NULL
UNION ALL
SELECT 'document_file_mismatch' AS violation, d.id, d.workspace_id
FROM public.documents d
LEFT JOIN public.files f
  ON f.workspace_id = d.workspace_id AND f.id = d.file_id
WHERE d.file_id IS NOT NULL AND f.id IS NULL
UNION ALL
SELECT 'conversation_embed_mismatch' AS violation, c.id, c.workspace_id
FROM public.conversations c
LEFT JOIN public.embeds e
  ON e.workspace_id = c.workspace_id AND e.id = c.embed_id
WHERE c.embed_id IS NOT NULL AND e.id IS NULL
UNION ALL
SELECT 'message_conversation_mismatch' AS violation, cm.id, cm.workspace_id
FROM public.conversation_messages cm
LEFT JOIN public.conversations c
  ON c.workspace_id = cm.workspace_id AND c.id = cm.conversation_id
WHERE c.id IS NULL;
```

### 6.2 Post-Migration RLS & Policy Verification Query (Step 6)

```sql
-- Verify all 17 public tables have BOTH RLS enabled and FORCE RLS enabled
SELECT c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls_enabled,
       COUNT(p.polname) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relname;
```

### 6.3 Three-Part Rollback & Recovery Procedure
1. **Procedure A — Application Rollback**: Revert the Cloud Run / container revision to the previous immutable build tag if application-layer regressions occur while database schema additions remain backward-compatible.
2. **Procedure B — Database Recovery**: Because security constraints and RLS policies cannot be safely "rolled back" by opening tables to unauthenticated access, if a migration leaves schema state inconsistent, halt staging traffic at the ingress load balancer and restore from the verified Step 4 pre-cutover snapshot.
3. **Procedure C — Security Containment**: If a cross-tenant policy defect is detected post-cutover, immediately revoke active session cookies by rotating `OKENG_SESSION_SECRET`, set `OKENG_MAINTENANCE_LOCKDOWN=true` to return `503` on all non-health routes, and preserve `public.security_audit_logs` for forensic review.
