# PLAN-009 — Production Integration of Supabase Auth, PostgreSQL, and Storage

| Field | Value |
| :--- | :--- |
| **Status** | Partial local implementation present; live Supabase/runtime acceptance remains pending |
| **Date** | 2026-10-11 |
| **Scope** | OKEngine Next.js app, Supabase Auth, Supabase PostgreSQL/RLS, private Supabase Storage, local/staging/production deployment |
| **Related contracts** | `DATA-01-Repository-and-Persistence-Contract.md`, `DB-01-PostgreSQL-Security-Migration-Specification.md`, `AUTH-01-Authentication-Authorization-Architecture.md`, `AUTH-02-Data-Model-Database-Security.md`, `PLAN-008-Security-Billing-Hardening.md`, `LOCAL-SUPABASE-WINDOWS.md` |
| **Prerequisite** | Reconcile the current implementation with the approved Auth/RLS/data contracts before production use |

---

## 1. Goal

Make the Next.js application use real Supabase services end to end, with the same application code able to target the local Supabase stack on Windows, a separate staging project, and production through environment configuration.

The target is **not** merely “the app has Supabase keys.” A production-ready result must demonstrate that:

- Supabase Auth owns credential verification and reset flows.
- Postgres is the persistent source of truth, and tenant access is authorized by verified identity plus database constraints/RLS.
- Storage objects remain private and follow the same workspace/collection authorization model as their database metadata.
- Service-role credentials cannot leak to a browser or be used for ordinary user-scoped queries.
- Migrations, failure behavior, backups, monitoring, and security tests work against a real local Supabase stack before staging rollout.

The existing local Windows stack setup in `LOCAL-SUPABASE-WINDOWS.md` is the development target. A plain PostgreSQL process by itself does **not** provide Supabase Auth, Storage, PostgREST, or Edge Runtime; use the local Supabase stack when testing those services.

## 2. Recommended architecture

```text
Browser
  │ same-origin HTTPS, HttpOnly auth cookies, CSRF + exact-origin checks
  ▼
OKEngine Next.js server / API routes
  ├── Supabase Auth SSR client ── signup, login, logout, refresh, reset
  ├── request-scoped Supabase client + verified Auth JWT
  │      └── PostgREST / RPC ── Postgres with authenticated role + RLS
  ├── private Storage API ── authorized upload/download/delete
  └── isolated privileged adapter ── only audited server operations

Supabase project
  ├── auth.users: credential identity
  ├── public.users: OKEngine profile + account state, linked to Auth identity
  ├── public workspace/resource tables: durable application data
  └── private workspace-files bucket: source files
```

**Identity recommendation:** Supabase Auth becomes the source of truth for passwords, sign-in, email confirmation, and password recovery. `public.users` remains the OKEngine profile/authorization record; it must not store a second password hash. Each request resolves a verified Supabase user and then loads the current profile and active workspace membership. Never authorize from caller-supplied `workspaceId`, unverified JWT metadata, or stale role data in a custom cookie.

**Database recommendation:** Tenant-facing reads and writes use request-scoped clients authenticated with the user's Supabase access token, so Postgres sees the correct `auth.uid()` and RLS applies. Keep multi-row/transactional work in narrowly scoped Postgres RPCs or explicitly reviewed privileged operations. Do not use a `postgres`/owner connection for ordinary tenant traffic: table-owner/superuser connections can bypass RLS.

**Storage recommendation:** Keep `workspace-files` private. Authorize every operation before issuing a signed URL or handling bytes; store only server-generated object paths in `public.files`; never expose a service-role key. Maintain the file metadata/object/document lifecycle as a compensating workflow because a Postgres transaction cannot atomically include a Storage object write.

## 3. Implementation status and remaining blockers

The following source changes are present in this branch; none of the live behavior is verified against the local Supabase stack yet:

1. `/api/auth/signup`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/auth/callback`, and `/api/auth/session` use Supabase Auth SSR and an HttpOnly cookie. The browser session projection contains no access or refresh token. Password recovery email delivery still needs a configured SMTP provider outside the local no-mail-catcher setup.
2. Migration `20261011000008_supabase_auth_storage_integration.sql` adds an Auth UUID profile link, profile-sync trigger, and `auth.uid()`-bound initial-workspace provisioning. It intentionally does not auto-link old custom-password rows by email.
3. Tenant repositories can be constructed from a request-scoped Supabase client. The legacy process-global repository throws in enforced Supabase mode rather than running a tenant query without the caller's JWT. Startup checks require URL, public key, and server key for Supabase mode.
4. Chat verifies Supabase Auth and active membership, applies visibility filtering before retrieval, allows anonymous `everyone` collections only, and rejects legacy caller-provided HMAC/bearer identities. Embed-specific scope for protected external widgets is not implemented.
5. Private upload/download/delete API routes reserve metadata, upload with the user JWT, finalize/abort through narrow RPCs, create 60-second signed URLs, and delete Storage plus metadata. Supabase-mode users can list/upload/download private files in the tenant-backed overview; the legacy dashboard `UploadDropzone` is not connected.
6. `SystemPrivilegedRepository` has separate operation IDs for audit append, usage append, verified corpus read, and Auth UUID profile lookup; it does not expose a user-query service-role fallback. Audit/usage payloads and grants were reconciled with the current SQL columns.
7. The existing browser dashboard views and `src/services/store.ts` still use local demo/seed data. Supabase-mode workspace routes are deliberately gated away from those views and show a new RLS-backed overview for the verified workspace, collections, documents, and private files. Workspace/collection CRUD, embed/settings/conversation screens, document parsing/indexing, and their legacy views are not yet migrated. Successful Auth login is not a claim that the whole dashboard is database-backed.
8. `supabase/config.toml` and the PowerShell setup keep the local stack narrow. Supabase CLI migrations remain authoritative; `npm run migrate` still points to missing `src/lib/migrate.ts` and should not be used.
9. Verification is split into `npm run test:auth-fast` (contract and mocked route tests; Node/npm only) and `npm run test:auth-local` (fail-closed local-stack reset plus clean-schema, real Auth/session, tenant RLS, and private Storage runtime suites). The latest Arena fast suite passed **63/63** on 2026-10-12; lint has 0 errors and 113 warnings. The local runner checks dependencies and every suite file, validates the CLI-reported API/PostgreSQL loopback targets before reset, rejects PostgreSQL URL query overrides, and uses explicit `--local` for reset/migration commands. For live confirmation coverage it temporarily enables only Auth email confirmations at local startup, uses Auth Admin-generated one-time links, starts no SMTP container, and restarts with checked-in defaults after successful tests. It does not silently skip or require `.env.local` or OAuth credentials. A Windows local attempt reached startup but the Storage container was marked unhealthy; the CLI applied migrations, then pruned local containers/volumes and the live suite did not start or reach its explicit reset. `supabase start --debug` showed the Storage API process reporting successful startup, but the Docker health-check result is still needed to diagnose the mismatch. No migration/RLS/Auth-session/Storage integration result is claimed. A PostgreSQL parser accepting migration files does not validate PL/pgSQL execution, catalog grants, RLS behavior, Auth cookies, or Storage policy runtime.
10. A real local migration apply, empty/current-head upgrade, object lifecycle failure injection, Auth email flow, TLS behavior, and staging rehearsal remain release gates.

## 4. Implementation phases

### Phase 0 — Freeze the design decisions and audit the live contract

**Work**

- Adopt or amend the related AUTH/DATA/DB/PLAN-008 documents to state that Supabase Auth is the app's credential provider and describe how its verified identity reaches RLS.
- Inventory every route and repository that touches users, memberships, workspace data, billing, conversations, document content, files, and service-role operations.
- Compare each repository query and route SQL statement with actual migration columns, constraints, policies, and grants. Record the exact mismatches; remove compatibility fallbacks that hide a schema failure in production.
- Decide migration deployment ownership. Recommended for this Supabase-backed application: keep `supabase/migrations/` authoritative; use `supabase migration up --local` locally and a protected CI/deployment step for linked staging/production projects. Amend the old custom-runner requirement rather than maintaining two independent ledgers. Never run a remote migration from an unreviewed developer shell.
- Document the production account migration case before changing auth: whether there are real custom-auth accounts/password hashes to preserve, and how users will re-establish credentials. Bcrypt hashes must not be copied into `auth.users` by hand.

**Exit gate**

- One documented auth/session/RLS design, one migration ledger/deployment path, a table-to-repository compatibility matrix, and an approved existing-account cutover strategy.

### Phase 1 — Repair the data and identity model additively

**Work**

- Add a typed `auth_user_id UUID UNIQUE REFERENCES auth.users(id)` link to `public.users`; preserve the existing internal text `public.users.id` and resource foreign keys initially to avoid a risky all-table ID rewrite.
- Add a migration-safe profile-sync path for Auth user creation and permitted email/name changes. It may use a narrowly scoped `SECURITY DEFINER` trigger/function or equivalent controlled server operation. Fix its `search_path`, revoke public execution, and never copy role/status privileges from user-editable Auth metadata.
- Update the RLS helper functions and policies to map `auth.uid()` through `public.users.auth_user_id` before evaluating internal `user_id`/membership IDs. Keep profile, active-account, active-membership, role, and workspace checks in the database contract. Test `FORCE ROW LEVEL SECURITY` as a non-owner role.
- Define a safe, idempotent initial-workspace provisioning operation. It must create the profile/workspace/owner membership consistently, cannot grant platform admin, handles slug collisions, and cannot be requested for a different user. Prefer an authenticated RPC or a carefully reviewed Auth-trigger path.
- Reconcile all current SQL references, profile fields, IDs, and repository payloads. Do not add `password_hash` as a bridge to the new auth design.
- Keep migrations additive where possible. Before any destructive/renaming operation, test against a disposable copy and define backup/restore steps.

**Exit gate**

- Local migration applies from an empty database and from a database at the current migration head; catalog assertions confirm required tables, FK/unique/check constraints, function privileges, RLS enabled and forced, and no unintended grants.

### Phase 2 — Replace custom credential handling with Supabase Auth

**Work**

- Add and pin the Next.js server-side Supabase integration dependency (`@supabase/ssr`) after checking compatibility with the repository's Next.js version.
- Implement a request-scoped server client using Next.js cookies. Verify identity using Supabase Auth's server-verified user API (`getUser`), not only the locally decoded session (`getSession`). Keep tokens server-side and never place the service key in client bundles.
- Rewrite `/api/auth/signup`, `/login`, `/logout`, `/forgot-password`, and `/reset-password` to call Supabase Auth. Use `public.users` only for profile/account status and workspace authorization. Remove bcrypt password reads/writes and stop issuing the old custom identity cookie as the source of truth.
- Preserve and test current security requirements: generic login/reset responses, signup validation/rate limits, CSRF and exact-origin checks, secure cookie flags, session refresh/revocation behavior, suspended-account rejection, and no role escalation through metadata.
- Configure production email confirmation, verified redirect URLs, SMTP/email provider, and password-reset templates. Keep the local confirmation behavior suited to local testing; local email delivery being disabled is not production email verification.
- Replace the custom password-reset token flow with Auth's recovery flow. Retire its application use of `password_reset_tokens`; retain/remove its migration only through a reviewed migration policy.
- Add an authenticated callback/confirmation route and handle expired/used recovery links without exposing account existence.

**Exit gate**

- Signup → confirmation → sign-in → refresh → sign-out and password recovery/reset pass in local Supabase and staging; no application credential is stored in `public.users`; cookie and CSRF tests pass.

### Phase 3 — Make Postgres access request-scoped and fail closed

**Work**

- Replace general `getSupabaseServerClient()` singleton use with explicit factories: a request-scoped user client bound to the verified Supabase session, and a separate server-only privileged client reachable only through audited repository methods.
- Refactor repository APIs to require verified request context for user operations. Apply workspace scope in application code as defense in depth and RLS as the database boundary. Do not accept an `Authorization` header from the caller and forward it blindly; derive the session from the app's trusted cookie flow.
- Remove the general service-role fallback from `getSupabaseServerClient()` and `isSupabaseConfigured()`. Treat missing public key, missing server credential for a privileged operation, Auth failures, RLS errors, and database timeouts as explicit errors; never return seed data in staging/production.
- Replace direct `pg` usage in auth and workspace authorization with the new Auth + request-scoped repository/RPC flow. For remaining transactional routes (e.g. Stripe webhooks), define a narrow privileged API with allowlisted SQL/RPC operations, a dedicated non-owner DB role if direct PG is necessary, strict input validation, and auditable workspace resolution.
- Fix runtime database TLS. Use the deployment's trusted CA/required TLS mode and reject invalid certificates; do not ship `rejectUnauthorized: false` as the production default.
- Reconcile `DATABASE_URL` use: it is only required for explicitly retained direct-Postgres operations/health checks; ordinary user CRUD should use the request-scoped Supabase API/RPC path. Document connection type (local/direct/session/transaction pooler) and verify transaction semantics per environment.
- Centralize mapping between Supabase Auth user, OKEngine profile, platform role, workspace role, and legacy session model. A role from the browser or arbitrary user metadata is never authoritative.

**Exit gate**

- Each tenant-facing repository operation passes tests with a real Auth JWT under `authenticated`; a forged/missing/expired token is denied; service-role operations have a short allowlist and are not importable by ordinary route handlers; production mode has no memory fallback.

### Phase 4 — Ship private Storage routes and lifecycle

**Work**

- Add server-side upload, download, and delete routes backed by the existing private `workspace-files` bucket. Authenticate and authorize `content.write/read/delete` before any object operation.
- Generate object paths on the server using the documented workspace/collection/file-ID convention. Normalize/reject unsafe filenames, enforce 10 MiB and allowlisted MIME types from actual bytes where feasible, and use `upsert: false` for new object keys.
- Start with server-proxied uploads for the current 10 MiB limit. If throughput requires browser-to-Storage uploads later, issue short-lived, single-object signed upload URLs only after authorization and metadata reservation; do not expose general service-role credentials.
- Implement an idempotent lifecycle: reserve file metadata, write private object, parse/index, mark ready; on errors mark failed/orphaned and compensate; periodically reconcile stale pending/orphaned rows and missing objects. Make retries safe.
- Use short-lived signed download URLs or a server proxy, and ensure deleted/revoked files cannot be fetched through previously issued long-lived URLs. Never make the bucket public.
- Audit and test Storage policies separately from `public` table policies. A passing database RLS test does not prove object-level authorization.

**Exit gate**

- Authorized user can upload/download/delete within their workspace; a second tenant, unauthenticated caller, read-only member, wrong collection, path traversal, invalid MIME, oversized file, and deleted document are all denied. Failure injection leaves no permanent orphan.

### Phase 5 — Edge Runtime and remaining service usage

**Work**

- The local config already starts Edge Runtime, but the repository has no Edge Function code. Do not claim it is “integrated” merely because the container runs.
- Keep existing Next.js API routes as the default application boundary. Only add a production Edge Function for a concrete latency/deployment need, with an explicit API contract, verified user JWT, least-privilege database/storage operations, Deno-compatible dependencies, tests, and observability. Do not duplicate Auth or bypass Next.js authorization.
- If Edge Runtime is required for the first production milestone, include one small, non-sensitive smoke function and test it in local and staging. It must not return secrets, user data, database URLs, or environment contents.

**Exit gate**

- Either a documented decision that Edge Runtime is enabled but unused pending a business use case, or one concrete Edge Function with positive and negative auth/RLS tests and a staging deployment check.

### Phase 6 — Release readiness, migration rehearsal, and cutover

**Work**

- Add local Supabase integration tests to CI where Docker is available. A CI job should start a disposable local stack, reset/apply migrations, run Auth/RLS/Storage tests, and destroy its disposable data afterward.
- Run existing readiness/security suites and add tests for real RLS, request-scoped identity, role changes, session revocation, and storage isolation. Keep local demo fixtures separate from production account/data imports.
- Rehearse migrations and account cutover on a sanitized staging clone; take a restorable backup/PITR checkpoint; compare row counts, Auth/profile mappings, memberships, buckets, policies, and object counts before/after.
- Configure separate local, staging, and production URLs/keys. Require staging smoke tests and explicit approval before production migration. Rotate any credentials used in a test environment before release.
- Add readiness checks for Postgres, Auth, and Storage that report availability without returning keys or customer data; add actionable alerts for database unavailability, migration drift, failed uploads, and orphan cleanup.
- Define rollback as code rollback plus a forward-fix/restore plan. Do not assume a destructive schema migration can be rolled back automatically.

**Release gate**

- Build/lint and existing test suites pass; new integration suites pass against local Supabase and staging; migration rehearsal is clean; no service-role leak; no cross-tenant read/write; backup restore is demonstrated; production secrets are configured outside Git and chat.

## 5. Minimum acceptance-test matrix

| Area | Required positive tests | Required negative/failure tests |
| :--- | :--- | :--- |
| Auth | Confirmed signup, login, refresh, logout, reset, profile sync | Wrong password, expired/reused reset link, suspended account, forged metadata role, missing/expired cookie, generic response/no enumeration |
| Tenant data | Owner/editor can perform permitted operations in own workspace | Cross-workspace IDs, altered workspace slug/ID, read-only mutation, missing membership, revoked membership, service-key fallback all denied |
| RLS | Authenticated JWT maps to exactly one OKEngine user; helpers and `FORCE RLS` work | Anonymous and wrong-tenant sessions cannot select/insert/update/delete; tests run as non-owner role, not only `postgres` |
| Storage | Private upload/download/delete with server-generated path | Anonymous/public access, second-tenant access, wrong collection, traversal, MIME/size violation, expired signed URL, DB/Storage partial failure |
| Migrations | Empty DB and current-head upgrade apply in order on PostgreSQL 15+ | Re-run/idempotency, constraint/data conflict, partial failure, drift detection, backup/restore rehearsal |
| Runtime | Health/readiness for dependencies; no fallback | Auth/API outage, DB timeout, Storage outage, missing secrets fail closed and do not fabricate success |

## 6. Running and testing locally

- Start the existing Windows local stack with `scripts/supabase-local.ps1 -Action up`; use local CLI-generated credentials only.
- Run the app against `http://127.0.0.1:54321` and local Postgres `127.0.0.1:54322`. Do not link this local workflow to production.
- Use a fresh local database reset for migration and integration tests, and seed only synthetic users/workspaces/files. Local service keys are generated locally and never need to be pasted into chat.
- `supabase/config.toml` currently disables Studio and the mail catcher to keep the stack lean. Turn on local mail only when verifying confirmation/recovery email delivery; production must have a real configured email provider.

## 7. Ngrok / connecting this agent to your local database

**Do not expose your local Postgres port with ngrok for this session.** The Arena coding sandbox is isolated from your Windows machine and has restricted outbound networking; Supabase and ngrok tunnel hosts are not reachable from it. An ngrok URL or real Supabase key would not change that, and no credentials should be sent here.

A public TCP tunnel to Postgres also creates unnecessary risk: anyone who obtains the tunnel address can attempt to reach the database, and a leaked database credential can expose every tenant. It may also bypass the intended application authorization/RLS path if the tunnel connects as a database owner. Keep Docker/Supabase bound to local interfaces and run integration tests on your Windows machine or in trusted CI/staging.

If you need to share test evidence, use synthetic fixtures and provide redacted logs, SQL schema/catalog output, or test results. If an external environment must connect, use a disposable staging project or a deliberately designed authenticated, network-restricted, least-privilege service—not a public production database tunnel. Do not share ngrok tokens, database passwords, Supabase secret/service-role keys, or production data.

## 8. Decisions recorded and pre-rollout follow-ups

1. **Identity provider:** Supabase Auth is canonical for application credentials; the old custom bcrypt flow is not a fallback. Existing custom-password accounts are not linked automatically by email. Any real legacy-account cutover requires a separately verified import/invitation and password-reset plan.
2. **Migration authority:** `supabase/migrations/` and the Supabase CLI are authoritative for this integration. The absent `src/lib/migrate.ts` runner is stale and must not be used; do not maintain a second migration ledger.
3. **Edge Runtime:** it remains enabled in local config but has no application-owned function and is not part of the current application request path.
4. **Storage uploads:** server-proxied uploads are the initial approach at a 10 MiB cap. Browser signed uploads require a separate threat/performance review.
5. **Before rollout:** execute the live Windows integration test, migrate an empty local database, rehearse upgrade from the current head, verify SMTP/recovery, catalog grants and RLS, verify the Supabase-mode overview and legacy-view gate, and run failure-injection/cleanup tests. These gates are still open.

No Supabase secrets are needed to review the code or plan. Local/staging secrets should remain in the machine's ignored `.env.local` or deployment secret store; never share a service-role key in chat.
