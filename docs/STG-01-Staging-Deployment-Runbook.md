# STG-01 — Staging Deployment, Migration Rehearsal & Cutover Runbook

| Field | Value |
| :--- | :--- |
| **Document ID** | `STG-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Platform & Release Engineering |
| **Authority** | Blocking Gate — Phase 06 (Staging Cutover & Release Verification) |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `TEST-01`, `ENG-DOD-STG-01` |
| **Source of Truth** | `.env.example`, `server.ts`, `supabase/migrations/` |
| **Database Engine** | **PostgreSQL 15.0+** (`SHOW server_version_num;` must be `>= 150000`) |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Staging Deployment Principle & Environment Contract

> **Staging Configuration Principle**: Once the approved server routes, repository layer, and database migrations are deployed, staging-specific configuration is supplied exclusively through environment configuration and secret provisioning, without requiring environment-specific application code changes.

Staging and production deployments strictly forbid silent fallback to seeded in-memory storage. If required credentials or persistent dependencies are missing at startup, the server fails closed immediately (`process.exit(1)`).

### 1.1 Environment Mode Matrix

| `OKENG_ENV` | Permitted `OKENG_DATA_MODE` | Permitted `CACHE_BACKEND` | Startup Validation Behavior | Runtime Dependency Outage Behavior |
| :--- | :--- | :--- | :--- | :--- |
| `development` | `memory` \| `supabase` | `memory` \| `redis` \| `auto` | Allows `memory` seed store; logs `[DEV] Local fallback active`. | Controlled error or explicit dev fallback. |
| `test` | `memory` \| `supabase` | `memory` \| `redis` | Uses deterministic per-test repository fixtures. | Fails the active test assertion deterministically. |
| `staging` | `supabase` **only** | `redis` **only** | **Fails startup (`exit(1)`)** if `OKENG_DATA_MODE !== 'supabase'` or any required secret is missing. | Fails closed (`503 Service Unavailable`); **never** switches to in-memory seed data. |
| `production` | `supabase` **only** | `redis` **only** | **Fails startup (`exit(1)`)** if `OKENG_DATA_MODE !== 'supabase'` or any required secret is missing. | Fails closed (`503 Service Unavailable`); **never** switches to in-memory seed data. |

---

## 2. Mandatory Staging Environment Variables & Secret Inventory

All secrets are provisioned in the staging secret manager (e.g., Google Secret Manager / Cloud Run encrypted environment secrets) and never committed to source control:

| Variable Name | Classification | Required in `staging`? | Purpose & Validation Rule |
| :--- | :--- | :--- | :--- |
| `OKENG_ENV` | Config | **Yes** (`staging`) | Selects environment posture (`development`, `test`, `staging`, `production`). |
| `OKENG_DATA_MODE` | Config | **Yes** (`supabase`) | Must equal `supabase` in `staging` and `production`. |
| `SUPABASE_URL` | Config | **Yes** | HTTPS URL of the staging Supabase project (`https://<project-ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | Public Key | **Yes** | Used by the server to initialize request-scoped user RLS clients with caller JWTs. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret (P0)** | **Yes** | Restricted strictly to `SystemPrivilegedRepository` (`SRV-PRIV-01..04`). Never exposed to client bundles. |
| `OKENG_SESSION_SECRET` | **Secret (P0)** | **Yes** | 32+ byte hex/base64 secret for encrypting/signing Domain A `HttpOnly` dashboard session cookies. |
| `OKENG_CSRF_SECRET` | **Secret (P0)** | **Yes** | 32+ byte hex/base64 secret for signing session-bound `X-CSRF-Token` tokens. |
| `OKENG_KMS_MASTER_KEY` | **Secret (P0)** | **Yes** | 32-byte key used for AES-256-GCM envelope encryption of per-workspace host signing secrets. |
| `OKENG_SIGNING_SECRET` | **Secret (P0)** | **Yes** | Default workspace signing secret for OKEng's first-party dogfood embeds (`>= 32` chars). |
| `OKENG_ALLOWED_ORIGINS` | Config | **Yes** | Comma-separated exact origins allowed for Domain A state-changing requests (e.g., `https://staging.okeng.io`). |
| `TRUST_PROXY_HOPS` | Config | **Yes** (`1`) | Number of trusted reverse-proxy hops for extracting verified client IP (`req.ip`) for rate limiting. |
| `REDIS_URL` | **Secret (P1)** | **Yes** | TLS Redis connection string (`rediss://...`) for distributed rate limiting, token replay (`jti`), and answer caching. |
| `GEMINI_API_KEY` | **Secret (P1)** | **Yes** | Server-side Google GenAI API key for `/api/embed` and optional Mode 3 (`generative`) answers. |
| `OKENG_DAILY_GEMINI_TOKEN_BUDGET` | Config | **Yes** (`250000`) | Default per-workspace daily combined (input + reserved output) Gemini token ceiling per UTC day. |

---

## 3. Step-by-Step Staging Cutover Runbook

### Phase A — Preflight & Migration Rehearsal (T-60 Minutes)

1. **Verify Secret Provisioning**:
   - Confirm all 14 variables in Section 2 are populated in the staging environment and that `OKENG_DATA_MODE=supabase` and `OKENG_ENV=staging`.
2. **Execute Preflight Data Audit on Staging Database**:
   - Run the preflight query in `DB-01 §6.1` against the staging PostgreSQL database to verify `0` orphaned or cross-tenant rows exist in `document_chunks`, `documents`, `conversations`, and `conversation_messages`.
3. **Rehearse Migration on Disposable Staging Branch/Clone (PostgreSQL 15.0+)**:
   - Confirm target engine version (`SELECT current_setting('server_version_num')::int >= 150000`) and execute on a disposable clone:
     ```bash
     psql "$STAGING_REHEARSAL_DB_URL" -v ON_ERROR_STOP=1 \
       -f supabase/migrations/20261003000001_okeng_schema.sql \
       -f supabase/migrations/20261003000002_okeng_rls_and_storage.sql \
       -f supabase/migrations/20261009000003_okeng_staging_security_hardening.sql
     ```
   - Verify the rehearsal completes with zero errors and passes the post-migration verification query (`DB-01 §6.2`).

### Phase B — Backup, Migration Execution & Verification (T-30 Minutes)

4. **Create & Verify Recoverable Snapshot Backup**:
   - Trigger an on-demand pre-cutover backup snapshot (`stg-pre-cutover-20261009`) and verify snapshot completion status and point-in-time recovery availability.
5. **Apply Versioned Migration to Staging Database**:
   - Execute `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` with `ON_ERROR_STOP=1`.
6. **Verify RLS, Force-RLS, Composite Constraints & Storage Policies**:
   - Run `DB-01 §6.2` verification SQL and confirm all **17 public tables** report `rls_enabled = true`, `force_rls_enabled = true`, and expected policy counts, and that `storage.objects` enforces `storage_workspace_files_select`, `storage_workspace_files_insert`, and `storage_workspace_files_delete`.

### Phase C — Immutable Application Rollout & Smoke Testing (T-0)

7. **Build & Deploy Immutable Application Artifact**:
   - Compile TypeScript and build frontend bundle (`npm run lint && npm run build`).
   - Deploy the immutable container revision with zero traffic initially routed (`--no-traffic`).
8. **Execute Readiness & Security Smoke Probes Against Revision URL**:
   - `GET /api/health/live` → Expect `200 OK` (`{ "status": "alive" }`).
   - `GET /api/health/ready` → Expect `200 OK` (`{ "status": "ready", "capabilities": { "database": "ready", "cache": "ready", "deterministicRetrieval": "ready", "generativeAi": "ready" } }`).
   - Execute automated negative tenant isolation, CSRF rejection, and rate-limit tests (`TEST-01`).
9. **Shift Staging Traffic & Monitor Operational Telemetry**:
   - Route 100% of staging traffic to the new revision and monitor structured logs, `401`/`403`/`429`/`5xx` rates, and Redis quota metrics for 30 minutes.

---

## 4. Rollback, Recovery & Containment Playbook

Not every database security hardening step can or should be reversed via a naive `DOWN` script (dropping RLS policies or foreign keys in response to an error would expose tenant data). Instead, operators follow three distinct procedures based on failure class:

### 4.1 Procedure 1 — Application Revision Rollback (Code Regression Only)
- **Trigger**: New Express revision exhibits elevated `5xx` errors or UI regression while database schema remains healthy (`20261009000003` additions are additive and backward-compatible with `00001`/`00002` columns).
- **Action**: Route 100% traffic back to the previous known-good container revision tag (`stg-prev-good`). Recovery time: `< 60 seconds`.

### 4.2 Procedure 2 — Database Snapshot Recovery (Data or Constraint Corruption)
- **Trigger**: Migration or backfill script fails mid-execution or reveals unexpected data corruption.
- **Action**:
  1. Enable ingress maintenance mode (`503 Service Unavailable`).
  2. Restore staging PostgreSQL to the verified Step 4 pre-cutover snapshot (`stg-pre-cutover-20261009`).
  3. Remediate the offending data in an isolated staging clone before rescheduling cutover.

### 4.3 Procedure 3 — Emergency Security Containment (Suspected Credential Leak or Policy Bypass)
- **Trigger**: Alert indicates cross-tenant access attempt, leaked host signing secret, or runaway Gemini API spend.
- **Action**:
  1. **Session & Token Revocation**: Rotate `OKENG_SESSION_SECRET` (invalidates all active Domain A dashboard cookies immediately) and/or trigger immediate key revocation on the affected workspace (`POST /api/workspaces/:id/secrets/rotate` with `{ "revokeImmediate": true }`).
  2. **Paid AI Circuit Breaker**: Set `OKENG_DISABLE_GENERATIVE_AI=true` (or zero the workspace token budget in Redis) so all chat queries run strictly through the zero-cost deterministic compiler (`ENGINE-01`) while preserving product availability.
  3. **Forensic Preservation**: Snapshot `public.security_audit_logs` and structured request logs by `requestId` before lifting containment.
