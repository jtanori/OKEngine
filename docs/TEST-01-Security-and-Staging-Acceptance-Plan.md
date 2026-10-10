# TEST-01 — Security, Isolation & Staging Acceptance Test Plan

| Field | Value |
| :--- | :--- |
| **Document ID** | `TEST-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Quality & Security Engineering |
| **Authority** | Blocking Gate — Phase 02, Phase 04 & Phase 06 |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `ENG-DOD-STG-01` |
| **Source of Truth** | `tests/` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Verification Philosophy

In accordance with `ENG-DOD-001` and `ENG-DOD-STG-01`, **code presence is never treated as proof of completion**. Every staging security control must be verified by automated positive and negative tests covering:
1. Database-level PostgreSQL RLS and composite constraint enforcement.
2. Express gateway authentication, CSRF, 5-Link authorization, and Layer 1–4 validation.
3. Pre-retrieval collection scope isolation (`SECURITY-001`).
4. Distributed rate-limiting concurrency and Gemini token reservation bounds.

---

## 2. Database RLS & Composite Constraint Test Matrix (`tests/security/db-rls-isolation.test.ts`)

Tests execute against a staging-like PostgreSQL 15+ instance with `20261003000001`, `20261003000002`, and `20261009000003` applied, using two seeded tenants (`ws_okeng_01` and `ws_globex_02`) and four user roles (`owner`, `editor`, `viewer`, `outsider`):

| Test ID | Target Table / Constraint | Test Scenario (Positive & Negative) | Expected Result |
| :--- | :--- | :--- | :--- |
| `DB-RLS-01` | `public.workspaces` | **Pos**: `ws_okeng_01` viewer `SELECT`s `ws_okeng_01`.<br>**Neg**: `ws_okeng_01` owner `SELECT`s or `UPDATE`s `ws_globex_02`. | Pos: `1` row.<br>Neg: `0` rows affected. |
| `DB-RLS-02` | `public.users` | **Pos**: User updates own `name`.<br>**Neg**: User attempts `UPDATE public.users SET platform_role = 'PLATFORM_OWNER' WHERE id = auth.uid()`. | Pos: Succeeds.<br>Neg: Rejected by `WITH CHECK` policy (`42501`). |
| `DB-RLS-03` | `public.workspace_memberships` + `trg_protect_last_workspace_owner` | **Pos**: Owner adds `WORKSPACE_USER` member.<br>**Neg**: Owner attempts to `DELETE` or demote the sole `ACTIVE` `WORKSPACE_OWNER` of `ws_okeng_01`. | Pos: Succeeds.<br>Neg: Raises SQLSTATE `23514` (`LAST_WORKSPACE_OWNER_PROTECTED`). |
| `DB-RLS-04` | `public.collections` & `public.documents` | **Pos**: Editor (`content.write`, `collection.write`) inserts/updates collection and document.<br>**Neg**: Viewer (`content.read` only) attempts `INSERT` or `UPDATE` on `documents`. | Pos: Succeeds.<br>Neg: Rejected by RLS (`42501`). |
| `DB-RLS-05` | `public.document_versions` & `public.conversation_messages` | **Pos**: Authorized writer inserts new version / message.<br>**Neg**: Workspace Owner attempts `UPDATE` on an existing row in `document_versions` or `conversation_messages`. | Pos: Succeeds.<br>Neg: `0` rows updated (immutable history). |
| `DB-RLS-06` | `public.security_audit_logs` & `public.usage_records` | **Pos**: `service_role` inserts audit log and usage record; Workspace Owner `SELECT`s workspace rows.<br>**Neg**: Authenticated Workspace Owner attempts `INSERT`, `UPDATE`, or `DELETE` on `security_audit_logs`. | Pos: Succeeds.<br>Neg: Rejected by RLS (`42501`). |
| `DB-FK-01` | `fk_chunks_workspace_col_document` | Attempt to `INSERT` a row into `public.document_chunks` with `workspace_id = 'ws_okeng_01'`, `collection_id = 'COL-PUBLIC'`, referencing a `document_id` that belongs to `'COL-INTERNAL'` or `'ws_globex_02'`. | Rejected by PostgreSQL composite FK constraint (`23503`). |
| `DB-FK-02` | `fk_conversations_workspace_embed` & `fk_messages_workspace_conversation` | Attempt to link a `ws_okeng_01` conversation to a `ws_globex_02` `embed_id`, or insert a `ws_okeng_01` message referencing a `ws_globex_02` `conversation_id`. | Rejected by PostgreSQL composite FK constraint (`23503`). |
| `DB-STG-01` | `storage.objects` (`workspace-files`) | **Pos**: Editor with `content.write` in `ws_okeng_01` uploads to `workspace-files/ws_okeng_01/COL-DOCS/file_01_guide.md`.<br>**Neg**: Same user attempts upload to `workspace-files/ws_globex_02/...` or non-existent collection `workspace-files/ws_okeng_01/COL-FAKE/...`. | Pos: Succeeds.<br>Neg: Rejected by `storage_workspace_files_insert` policy. |

---

## 3. API Gateway, Auth, CSRF & Validation Test Matrix (`tests/security/api-gateway-security.test.ts`)

| Test ID | Target Control | Attack / Verification Vector | Expected HTTP Response |
| :--- | :--- | :--- | :--- |
| `API-SEC-01` | Domain A Cookie & CSRF | Submit `PATCH /api/workspaces/okeng` with valid session cookie but (a) missing `X-CSRF-Token`, (b) CSRF token signed for a different `sessionId`, or (c) `Origin: https://evil.example.com`. | `403 Forbidden` (`CSRF_TOKEN_INVALID` or `CSRF_ORIGIN_MISMATCH`); state unchanged. |
| `API-SEC-02` | Domain B Host Token Protocol | Submit `POST /api/embed/session` with (a) `alg: "none"`, (b) `jwk` header injection, (c) `aud: "wrong-aud"`, (d) `exp - iat > 300`, or (e) replayed `jti` nonce used 2 seconds earlier. | `401 Unauthorized` with deterministic error code (`UNSUPPORTED_JWT_ALGORITHM`, `FORBIDDEN_KEY_INJECTION_HEADER`, `INVALID_TOKEN_AUDIENCE`, `TOKEN_TTL_EXCEEDED`, `TOKEN_REPLAY_DETECTED`). |
| `API-SEC-03` | Domain C Embed Session Isolation | Call `POST /api/chat/stream` in `embed` mode with `role: "admins"` in body but an anonymous Domain C `embedSessionToken`. | `401 UNVERIFIED_ROLE_ASSERTION` or scoped strictly to `everyone` collections; zero `admins` documents retrieved. |
| `API-SEC-04` | Layer 1 Unknown-Key Rejection (`.strict()`) | Send `POST /api/chat/stream` or `POST /api/embed/session` in `staging` mode including client-supplied `documents: [...]`, `collections: [...]`, or `signingSecret: "..."`. | `400 Bad Request` (`SCHEMA_UNKNOWN_FIELD`); client corpus and secret overrides rejected. |
| `API-SEC-05` | Link 5 Cross-Resource Forgery (IDOR) | Authenticated `ws_okeng_01` editor sends `PATCH /api/workspaces/okeng/documents/doc_globex_99` or `POST /api/workspaces/okeng/files` with `collectionId: "col_globex_private"`. | Uniform `404 Not Found` (`RESOURCE_NOT_FOUND`) + `DENY` entry written to `public.security_audit_logs`. |
| `API-SEC-06` | Share Snapshot Privilege Escalation (`RTE-ACT-03`) | Authenticated user calls `POST /api/embed/share` for a document in `COL-INTERNAL` (`visibility = 'admins'`) while passing `isPublicDocument: true` in request body, then fetches `/api/embed/share/:shareId` unauthenticated. | `POST` rejects `isPublicDocument` field (or derives `is_public_document = false` from DB); unauthenticated `GET` returns `403 SHARE_ACCESS_DENIED`. |
| `API-SEC-07` | Route-Specific Payload Caps | Send a `100 KB` JSON payload to `POST /api/auth/login` (`16 KB` cap) or `PATCH /api/workspaces/okeng` (`64 KB` cap). | `413 Payload Too Large` before schema or auth evaluation. |

---

## 4. Rate Limiting, Concurrency & Paid AI Quota Tests (`tests/security/rate-limit-and-quota.test.ts`)

1. **`TEST-RL-01` (Auth Brute-Force Protection)**: Fire `6` consecutive `POST /api/auth/login` requests for the same `(IP, email)` within 60 seconds → Requests 1–5 return `401`; Request 6 returns `429 Too Many Requests` with `Retry-After`, `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: 0`.
2. **`TEST-RL-02` (Concurrent Token Budget Reservation)**: Set workspace remaining daily Gemini token budget to `1,500` tokens and launch `5` parallel `POST /api/chat` (`generative`) requests each requiring a `1,200`-token reservation → Exactly `1` request succeeds in reserving tokens; the other `4` concurrent requests fail closed with `429 WORKSPACE_TOKEN_BUDGET_EXCEEDED` (proving zero race-condition overspend).
3. **`TEST-RL-03` (SSE Disconnect Stream Cancellation & Token Refund)**: Start a `generative` `/api/chat/stream` request (reserving `1,250` tokens), abort the client HTTP connection after the first chunk (`50` tokens), and verify `AbortController.abort()` fires within `< 50ms` and unused reserved tokens are refunded to the workspace's daily Redis counter.
4. **`TEST-RL-04` (Redis Failure Fail-Closed Mode)**: Simulate Redis connection refusal in `staging` mode → Verify `POST /api/chat` (paid AI) fails closed (`503 PAID_AI_QUOTA_UNAVAILABLE`) while `GET /api/health/live` remains `200 OK` and `GET /api/health/ready` reports `503` (`cache: "unhealthy"`).
