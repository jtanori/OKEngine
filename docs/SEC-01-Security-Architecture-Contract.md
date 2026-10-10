# SEC-01 — Security Architecture & Trust Boundary Contract

| Field | Value |
| :--- | :--- |
| **Document ID** | `SEC-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Platform Security Engineering |
| **Authority** | Blocking Gate — Phase 01 & Phase 02 |
| **Dependencies** | `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04`, `AUTH-05`, `EMBED-01`, `DB-01` |
| **Source of Truth** | `server.ts`, `src/services/auth.ts`, `src/services/embedAuthorization.ts` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Executive Security Posture & Defense-in-Depth Model

OKEng enforces a **Zero-Trust Multi-Tenant Security Architecture** across its SaaS dashboard and embedded knowledge runtime. No single layer is trusted in isolation:

1. **Server-Mediated Access Only**: All authentication, database persistence, file storage, and AI model invocations execute strictly through the Express API gateway. Browser bundles never initialize `@supabase/supabase-js` or communicate directly with Supabase Auth, PostgREST, or Storage endpoints.
2. **Note on Public vs. Secret Keys**: While hiding the Supabase project URL and publishable `anon` key from the browser reduces direct client discovery, those values are not cryptographic secrets by themselves. The actual security boundary is enforced by (a) server-side 5-Link authorization, (b) request-scoped PostgreSQL `FORCE ROW LEVEL SECURITY` (`auth.uid()`), (c) composite cross-tenant foreign keys, and (d) narrow `service_role` isolation.
3. **Pre-Retrieval Authorization Invariant (`SECURITY-001`)**: Collection scope and caller identity are verified **before** any document or chunk query executes. Unauthorized documents never enter the BM25 retrieval index, the response compiler, the cache lookup key, or the Gemini LLM prompt context.

---

## 2. Three-Domain Identity & Session Separation

OKEng separates authentication and session management into three non-overlapping trust domains. A credential from one domain is never accepted on routes belonging to another domain.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DOMAIN A: OKENG DASHBOARD SESSION (First-Party Workspace Operators)                    │
│  Browser ──► [HttpOnly; Secure; SameSite=Lax Cookie + Session-Bound X-CSRF-Token]      │
│          ──► Express Auth Guard ──► 5-Link Workspace Guard ──► User-Scoped RLS Client  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ DOMAIN B: HOST APPLICATION IDENTITY (Customer Backend Assertions)                      │
│  Customer Server ──► [Short-Lived Signed HS256 Assertion (`iss`,`aud`,`sub`,`jti`)]    │
│                  ──► `/api/embed/session` Verification ──► Clearance Tier Mapping      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ DOMAIN C: EMBED RUNTIME SESSION (Narrowly Scoped Widget Credential)                    │
│  Embed Widget ──► [`Authorization: Bearer <scoped_embed_session_token>`]               │
│               ──► Bound to `(workspaceId, embedId, authorizedCollectionIds, exp)`      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Domain A — OKEng Dashboard Session Contract

- **Purpose**: Authenticates human workspace owners, editors, read-only members, and platform administrators operating the OKEng web application.
- **Opaque / Encrypted `HttpOnly` Cookie Transport**:
  - Upon successful `/api/auth/login`, `/api/auth/signup`, or `/api/auth/refresh`, the Express server sets cookie `__Host-okeng_session` (in HTTPS staging/production; `okeng_session` in localhost HTTP dev) with attributes:
    - `HttpOnly` (prevents `document.cookie` access by JavaScript)
    - `Secure` (mandatory in `staging` and `production`)
    - `SameSite=Lax`
    - `Path=/api`
    - `Max-Age=3600` (1 hour access lifetime; paired with rotating refresh token stored server-side or in `/api/auth/refresh`-scoped cookie)
  - Raw Supabase `access_token` and `refresh_token` values are **never** written to `localStorage`, `sessionStorage`, or non-`HttpOnly` cookies.
- **Precise Cookie, CSRF & XSS Security Guarantees**:
  - **What `HttpOnly` Guarantees**: Prevents an injected script from reading the raw session cookie value and exfiltrating it to an external server for offline replay.
  - **What `HttpOnly` Does NOT Guarantee Alone**: An active in-page XSS payload running inside the origin can still trigger authenticated `fetch()` requests that automatically attach cookies. Therefore, OKEng enforces six mandatory controls alongside `HttpOnly`:
    1. **Exact-Origin Validation**: Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) on Domain A routes validates that the `Origin` header (or `Referer` origin if `Origin` is absent) matches an exact entry in `OKENG_ALLOWED_ORIGINS`. Requests with missing or mismatched origins are rejected with `403 CSRF_ORIGIN_MISMATCH` before body parsing completes.
    2. **Session-Bound HMAC Synchronizer CSRF Token**:
       - `GET /api/auth/session` returns a CSRF token constructed as:
         $$\text{csrfToken} = \text{nonce} \mathbin{\Vert} \text{"."} \mathbin{\Vert} \text{HMAC-SHA256}(\text{OKENG\_CSRF\_SECRET}, \text{sessionId} \mathbin{\Vert} \text{":"} \mathbin{\Vert} \text{csrfEpoch} \mathbin{\Vert} \text{":"} \mathbin{\Vert} \text{nonce})$$
       - Every state-changing Domain A request must supply this token in the `X-CSRF-Token` header, verified in constant time (`crypto.timingSafeEqual`).
    3. **CSRF Rotation & Concurrent Tab Grace Window**: The `csrfEpoch` rotates upon login, privilege change, password reset, and session refresh. To prevent false-positive failures across concurrent browser requests during a refresh transition, the verifier accepts `csrfEpoch` and `csrfEpoch - 1` for a bounded 30-second grace window.
    4. **Zero State Mutation on `GET`/`HEAD`/`OPTIONS`**: Read methods are strictly side-effect-free.
    5. **Strict Content-Security-Policy (CSP) & Output Encoding**: The Express gateway emits `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'`, and all Markdown/HTML output passes through the deterministic AST sanitizer (`src/content/sanitizer`).
    6. **Strict CORS Separation**: CORS (`Access-Control-Allow-Origin`) is never set to `*` with `Access-Control-Allow-Credentials: true`, and never reflects arbitrary caller `Origin` values.

### 2.2 Domain B — Host Application Identity Protocol

- **Purpose**: Proves who an end-user is inside a customer's host application and which clearance tier (`everyone`, `members`, `admins`) the customer's backend asserts.
- **Formal Host Assertion Token Specification (`EMBED-01` Hardened)**:
  - **Allowed Algorithms**: Fixed server allowlist `['HS256']` (with optional per-workspace `RS256` / `ES256` public key verification). The server **never** trusts the token header's `alg` value to select verification primitives and immediately rejects `alg: "none"` or tokens containing `jku`, `x5u`, or `jwk` headers (`401 FORBIDDEN_KEY_INJECTION_HEADER`).
  - **Mandatory Claims Contract**:

| Claim | Type | Requirement & Validation Rule |
| :--- | :--- | :--- |
| `iss` | `string` | Customer host issuer identifier (`https://...` or registered host ID). |
| `aud` | `string` | Must equal `"okeng-embed-runtime"`. Wrong audience rejected (`401 INVALID_TOKEN_AUDIENCE`). |
| `sub` | `string` | Non-empty stable host user identifier (`1..128` chars). |
| `workspace_id` | `string` | Must match the target workspace ID exactly (`404 RESOURCE_NOT_FOUND` on cross-workspace mismatch). |
| `embed_id` | `string` | Must match the target embed installation ID (`403 EMBED_SCOPE_MISMATCH`). |
| `role` | `string` | Customer role vocabulary mapped deterministically to `everyone`, `members`, or `admins`. |
| `iat` | `number` | Issued-at Unix timestamp (seconds). Rejected if `iat > now + 60`. |
| `exp` | `number` | Expiration Unix timestamp (seconds). Maximum lifetime `exp - iat <= 300` (5 minutes); clock-skew tolerance `±60s`. |
| `jti` | `string` | Unique token nonce (`16..64` chars). Stored in Redis replay cache (`SET NX EX 360`) on session exchange to block token replay (`401 TOKEN_REPLAY_DETECTED`). |
| `kid` | `string` | Key identifier matching either `workspaces.signing_secret_kid` or active `secondary_signing_secret_kid`. |

- **Signing Secret Protection & Rotation**:
  - Workspace signing secrets are encrypted at rest in `public.workspaces.signing_secret_ciphertext` using AES-256-GCM envelope encryption under `OKENG_KMS_MASTER_KEY`.
  - When an owner rotates a signing secret (`POST /api/workspaces/:workspaceId/secrets/rotate`), the previous key moves to `secondary_signing_secret_kid` with a configurable rollover window (default 24 hours) before automatic purge, and an emergency `revokeImmediate: true` flag allows instant invalidation during a suspected key leak.
- **Elimination of Public Verification Oracle**:
  - `/api/auth/token/sign` and `/api/auth/token/verify` are restricted to authenticated Domain A callers holding `embed.manage` or `test.execute` on the target workspace, and always load the signing secret from the server repository (never from `req.body.signingSecret`).

### 2.3 Domain C — Embed Runtime Session Contract

- **Purpose**: Authorizes an embedded widget instance to execute scoped retrieval, streaming chat, and issue reporting without exposing workspace-wide credentials.
- **Public `embedId` Is a Locator, Never a Credential**:
  - Presenting `embedId: "EMB-PUBLIC-DOCS"` identifies which embed configuration to load, but grants zero access to `members` or `admins` collections without a verified Domain B host assertion.
- **Scoped Session Credential Lifecycle**:
  1. The widget calls `POST /api/embed/session` with `{ workspaceId, embedId, identityToken? }`.
  2. The server loads the canonical `EmbedInstance` and `Collection[]` strictly from `repositories.embeds` and `repositories.collections`, verifies `embed.status === 'active'`, validates `identityToken` (if provided), and computes the intersection:
     $$\text{authorizedCollectionIds} = \{ c.\text{id} \in \text{embed.knowledgeScope.collectionIds} \mid \text{canAccess}(c.\text{visibility}, \text{verifiedIdentity}) \}$$
  3. The server issues a short-lived (`TTL = 900s`) signed `embedSessionToken` binding `(sessionId, workspaceId, embedId, authorizedCollectionIds, authorizationVersion, identityTier, exp)`.
  4. Every runtime call (`POST /api/chat/stream`, `POST /api/embed/session/upgrade`, `POST /api/embed/feedback`) verifies `embedSessionToken` and recomputes `authorizationVersion` against the current embed and collection state. If an administrator disables the embed, deletes a collection, or tightens collection visibility, the `authorizationVersion` mismatch immediately invalidates or re-scopes the session before retrieval.

---

## 3. Canonical 5-Link Workspace Authorization Guard

Every Domain A workspace endpoint enforces all five links in strict sequence before invoking any repository or AI operation:

1. **Link 1 — Verified Authentication**: Valid, non-expired Domain A session cookie mapped to an `ACTIVE` user in `public.users`.
2. **Link 2 — Active Workspace Target**: Target `:workspaceId` exists in `public.workspaces`.
3. **Link 3 — Active Workspace Membership (or Dual-Operator Admin Grant)**: Caller holds an `ACTIVE` row in `public.workspace_memberships` for `:workspaceId` (or presents a non-expired, dual-operator approved `AdminGrant` from `public.admin_grants` for read-only support inspection). Platform admins (`PLATFORM_ADMIN`) hold **zero** implicit workspace membership (`INV-05`).
4. **Link 4 — Explicit Granular Permission**: Caller's membership role is `WORKSPACE_OWNER` or `membership.permissions` explicitly contains `requiredPermission`.
5. **Link 5 — Composite Resource Ownership Verification (Cross-Resource Forgery / IDOR Prevention)**:
   - Every child resource identifier (`:collectionId`, `:documentId`, `:fileId`, `:embedId`, `:memberId`, `:shareId`) is queried using the composite key `(workspaceId, resourceId)`.
   - When a request references a secondary resource in its body (e.g., creating or moving a document into `req.body.collectionId`, or saving an answer citing `documentId`), the server verifies that `collection.workspaceId === req.params.workspaceId` before executing the write.
   - Any cross-workspace resource reference returns a uniform `404 { error: "RESOURCE_NOT_FOUND" }` (never `403`) to prevent cross-tenant resource ID enumeration, and writes an immutable `DENY` entry to `public.security_audit_logs`.

---

## 4. Narrow Service-Role Isolation Contract

To preserve PostgreSQL Row-Level Security as an active defense layer, `SUPABASE_SERVICE_ROLE_KEY` is never used by general repository methods. Instead:

| Operation ID | Permitted `service_role` Method | Calling Surface | Mandatory Guardrails & Audit |
| :--- | :--- | :--- | :--- |
| `SRV-PRIV-01` | `SystemPrivilegedRepository.appendSecurityAuditLog()` | Auth, 5-Link Guard, Secret Rotation, Admin Grant | Append-only insert into `public.security_audit_logs`; sanitizes PII/secrets before write. |
| `SRV-PRIV-02` | `SystemPrivilegedRepository.recordUsageEvent()` | `/api/chat/stream`, `/api/embed`, `/api/workspaces/:id/files` | Append-only insert into `public.usage_records` after workspace/session verification. |
| `SRV-PRIV-03` | `SystemPrivilegedRepository.loadVerifiedEmbedCorpus()` | `/api/embed/session`, `/api/chat/stream` (Domain C), `/api/demo/homepage-context` | Accepts only a server-verified `EmbedAuthorizationContext`; queries `documents` and `document_chunks` strictly filtered by `.eq('workspace_id', verifiedWsId).in('collection_id', verifiedCollectionIds).is('deleted_at', null)`. |
| `SRV-PRIV-04` | `SystemPrivilegedRepository.syncAuthenticatedUserAccount()` | `/api/auth/login`, `/api/auth/signup` | Syncs verified `auth.users` identity to `public.users` and initial workspace provisioning inside a server transaction. |

All other database and storage operations execute via `getUserScopedSupabaseClient(req.session.supabaseAccessToken)`, which runs under the `authenticated` PostgreSQL role with `FORCE ROW LEVEL SECURITY` active.
