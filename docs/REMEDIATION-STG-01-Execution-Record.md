# REMEDIATION-STG-01 — Staging Hardening Remediation Execution & Acceptance Record

| Field | Value |
| :--- | :--- |
| **Document ID** | `REMEDIATION-STG-01` |
| **Status** | `PHASE 1 (SQL DDL REMEDIATION & VALIDATION PREPARATION) COMPLETE IN SOURCE — LIVE DB EXECUTION BLOCKED_INFRA — APPLICATION REMEDIATION (PHASES 2–5) PENDING — STAGING CUTOVER: FAIL` |
| **Immutable Baseline** | `docs/AUDIT-STG-01-Implementation-Audit.md` (`Rev 2.1 — FROZEN BASELINE`, `2026-10-09`, Commit `6a151ca`) |
| **Database Engine Baseline** | **PostgreSQL 15.0+** (`server_version_num >= 150000`) |
| **Active Remediation Phase** | **Phase 1: SQL Migration Remediation & Validation Preparation (`P0-SQL-01` .. `P2-SQL-05`)** |
| **Revision** | `1.0 (2026-10-09)` |

---

## 1. Governing Remediation Rules

1. **Immutable Audit Baseline**: `docs/AUDIT-STG-01-Implementation-Audit.md` (`Rev 2.1`) is frozen as the read-only pre-remediation record (`12/12` baseline defects reproduced at `2026-10-09T19:35:00-07:00`). All subsequent SQL and application remediation work is tracked in this document (`REMEDIATION-STG-01`).
2. **Three-Condition Closure Rule**: No finding is marked **Closed** until:
   - **Condition 1 (Baseline Post-Fix Guard Triggered)**: Its baseline defect assertion in `tests/security/phase0-baseline-reproduction.test.ts` triggers `POST_FIX_GUARD_TRIGGERED`.
   - **Condition 2 (Post-Fix Security Regression Verified)**: The paired post-fix regression test confirms the attack or invalid DDL/runtime state fails safely.
   - **Condition 3 (Legitimate Behavior & Runtime Evidence Verified)**: Valid user and public flows continue to work per the approved authorization contract, and the required runtime evidence (`LOCAL_HTTP_VERIFIED` and ultimately `STAGING_RUNTIME_VERIFIED`) is captured.
3. **Strict Hold on Shared Staging Database Application**: Even though `P0-SQL-01`..`P2-SQL-05` are remediated in `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` and `supabase/migrations/20261009000004_okeng_staging_validate_constraints.sql` (`UNIT_TEST_VERIFIED`), both migrations remain strictly **HELD** (`UNVERIFIED: Reason = BLOCKED_INFRA`) until executed and verified against a real disposable PostgreSQL 15.0+ database across both clean-install (`00001` → `00002` → `00003` → `00004`) and seeded-upgrade paths.

---

## 2. Master Finding-to-Remediation Traceability Matrix (`REPRO-01` .. `REPRO-12`)

| Finding ID | Severity | Remediation Phase | Baseline Reproduction ID (`AUDIT-STG-01 Rev 2.1`) | Implementation Change (Files & Lines) | Post-Fix Security Regression Test | Legitimate Behavior Preservation Test | Current Primary Evidence Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`P0-SQL-01`** | **P0** | **Phase 1 (SQL)** | `REPRO-08` (`POST_FIX_GUARD_TRIGGERED`) | `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` (`L134, 157, 197`): Updated composite FKs to PostgreSQL 15.0+ `ON DELETE SET NULL (file_id)`, `(embed_id)`, and `(document_id)`; added `server_version_num >= 150000` guard in `20261009000004` (`L20–29`). | `tests/security/sql-migration-remediation.test.ts` (`P0-SQL-01`: `0` unscoped `ON DELETE SET NULL` composite FKs). | Deleting a parent `files`, `embeds`, or `documents` row sets only `file_id`, `embed_id`, or `document_id` to `NULL` while preserving `workspace_id NOT NULL`. | `UNIT_TEST_VERIFIED` *(SQL DDL)* / `UNVERIFIED (Reason: BLOCKED_INFRA)` *(Live PostgreSQL 15+ execution)* |
| **`P1-SQL-02`** | **P1** | **Phase 1 (SQL)** | `REPRO-09` (`POST_FIX_GUARD_TRIGGERED`) | `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` (`L117–125`): Added `DROP CONSTRAINT IF EXISTS` for `documents_file_id_fkey`, `document_chunks_workspace_id_document_id_fkey`, `conversations_embed_id_fkey`, and `conversation_messages_conversation_id_fkey`. | `tests/security/sql-migration-remediation.test.ts` (`P1-SQL-02`: all 4 legacy inline FKs from `00001` explicitly dropped). | Same-workspace parent-child inserts and cascading deletes operate via the single canonical composite FK per table. | `UNIT_TEST_VERIFIED` *(SQL DDL)* / `UNVERIFIED (Reason: BLOCKED_INFRA)` *(Live PostgreSQL 15+ execution)* |
| **`P1-SQL-03`** | **P1** | **Phase 1 (SQL)** | `REPRO-10` (`POST_FIX_GUARD_TRIGGERED`) | `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` (`L331–364, 452–457`): Added `public.shares_active_workspace_with(TEXT)`, rewrote `users_select_self_or_comember`, and added `ALTER FUNCTION ... OWNER TO postgres` on all 5 `SECURITY DEFINER` helpers. | `tests/security/sql-migration-remediation.test.ts` (`P1-SQL-03`: all 5 helpers set `search_path = public, pg_temp` and `OWNER TO postgres`). | Authenticated users can `SELECT` their own profile, co-member profiles in shared active workspaces, and `workspace_memberships` under `FORCE RLS` without recursion. | `UNIT_TEST_VERIFIED` *(SQL DDL)* / `UNVERIFIED (Reason: BLOCKED_INFRA)` *(Live PostgreSQL 15+ execution)* |
| **`P2-SQL-04`** | **P2** | **Phase 1 (SQL)** | `REPRO-11` (`POST_FIX_GUARD_TRIGGERED`) | `supabase/migrations/20261009000003_okeng_staging_security_hardening.sql` (`L904–919`): Added `REVOKE ALL ON TABLE public.shared_snapshots, public.issue_reports FROM PUBLIC, anon;`, `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated, service_role;`, and `GRANT SELECT ON TABLE public.shared_snapshots TO anon;`. | `tests/security/sql-migration-remediation.test.ts` (`P2-SQL-04`: explicit `REVOKE` and `GRANT` statements verified). | `authenticated` members can create/read snapshots and issue reports under RLS, and `anon` can `SELECT` public non-expired `shared_snapshots` (`is_public_document = true`). | `UNIT_TEST_VERIFIED` *(SQL DDL)* / `UNVERIFIED (Reason: BLOCKED_INFRA)` *(Live PostgreSQL 15+ execution)* |
| **`P2-SQL-05`** | **P2** | **Phase 1 (SQL)** | `REPRO-12` (`POST_FIX_GUARD_TRIGGERED`) | Removed all 7 `VALIDATE CONSTRAINT` statements from `20261009000003` (`BEGIN...COMMIT` metadata transaction) and created `supabase/migrations/20261009000004_okeng_staging_validate_constraints.sql` (`L31–95`). | `tests/security/sql-migration-remediation.test.ts` (`P2-SQL-05`: `0` `VALIDATE CONSTRAINT` in `00003`; `7` in `00004` with catalog assertions). | Metadata transaction in `00003` commits rapidly without holding `AccessExclusiveLock` across table scans; `00004` validates constraints under `ShareUpdateExclusiveLock`. | `UNIT_TEST_VERIFIED` *(SQL DDL)* / `UNVERIFIED (Reason: BLOCKED_INFRA)` *(Live PostgreSQL 15+ execution)* |
| **`P0-AUTH-01`** | **P0** | **Phase 2 (Auth/Scope)** | `REPRO-01` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 2*: Strip `x-okeng-session-user`, `x-okeng-session`, `x-okeng-admin-grant`, and `req.query.sessionUser` in `server.ts`; enforce `__Host-okeng_session` + `X-CSRF-Token`. | *Pending*: `API-SEC-01` (`401`/`403` on spoofed headers & cross-origin mutations). | *Pending*: Valid `__Host-okeng_session` + `X-CSRF-Token` requests succeed (`200 OK`). | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL, MISSING_TEST)` |
| **`P0-AUTH-02`** | **P0** | **Phase 2 (Auth/Scope)** | `REPRO-02` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 2*: Reject client-supplied `documents[]`, `collections[]`, `embeds[]`, and `contextChunks[]`; resolve scope strictly from `repositories`. | *Pending*: `API-SEC-04` (`400 SCHEMA_UNKNOWN_FIELD` on client corpus injection; `0` foreign citations). | *Pending*: `EMB-PUBLIC-HOME` and authenticated workspace queries stream server-resolved citations (`homepage-tour-readiness.test.ts` `52/52`). | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL, MISSING_TEST)` |
| **`P0-AUTH-03`** | **P0** | **Phase 2 (Auth/Scope)** | `REPRO-03` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 2*: Gate `/api/auth/token/sign`, `/api/auth/token/verify`, `/api/embed/verify`, `/api/embed/answers/save`, `/api/cache/invalidate`, `/api/embed`, and `/api/chat` behind Domain A permissions. | *Pending*: Unauthenticated requests and `verificationMode="admin"` elevation return `401`/`403`. | *Pending*: Authorized operators succeed; anonymous `POST /api/embed/session` for `EMB-PUBLIC-HOME` succeeds with `role="anonymous"` and `visibility="everyone"`. | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL, MISSING_TEST)` |
| **`P0-AUTH-04`** | **P0** | **Phase 2 (Auth/Scope)** | `REPRO-04` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 2*: Remove `INITIAL_WORKSPACE.signingSecret` from `src/data/seedData.ts:8` and strip all 7 hardcoded fallback secrets from `server.ts`. | *Pending*: Forged tokens using compromised synthetic secrets return `401`; `/api/health` is replaced by `/api/health/live` & `/ready`. | *Pending*: `RedactedWorkspaceDTO` returns `signingSecretKid` + masked `sk_live_••••`; KMS-decrypted workspace secrets verify valid tokens. | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL, MISSING_TEST)` |
| **`P0-AUTH-05`** | **P0** | **Phase 2 (Auth/Scope)** | `REPRO-05` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 2*: Enforce `iss`, `aud="okeng-embed-runtime"`, `sub`, `workspace_id`, `embed_id`, `role`, `kid`, `iat`, `exp` (`exp - iat <= 300s`, skew `±30s`), and single-use `jti` replay cache in `src/services/embedAuthorization.ts`. | *Pending*: `API-SEC-02` rejects missing `iss`/`aud`/`jti`/`kid`, `TTL > 300s`, and replayed `jti`. | *Pending*: Valid single-use Host Assertions within `±30s` skew verify on first presentation (`embed-authorization.test.ts` `29/29`). | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL)` |
| **`P0-DATA-01`** | **P0** | **Phase 3 (Persistence)** | `REPRO-06` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 3*: Implement `validateStartupDataMode()`, `createUserScopedSupabaseClient`, and `SystemPrivilegedRepository`; disable silent seed fallback in `staging`/`production`. | *Pending*: `OKENG_ENV=staging` without Supabase fails closed (`503 DATABASE_UNAVAILABLE`). | *Pending*: `OKENG_ENV=development` (`memory` mode) serves local developer seeds; `staging` with Supabase executes user-scoped RLS queries. | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL)` |
| **`P0-OPS-01`** | **P0** | **Phase 5 (Redis/Ops)** | `REPRO-07` (`VULNERABILITY_REPRODUCED`) | *Pending Phase 4–5*: Replace global `10mb` JSON parser with route-specific caps (`16KB`/`64KB`/`256KB`/`10MB`); install `ioredis` and implement real `RedisCacheAdapter` + Lua rate limiter. | *Pending*: Oversized payloads return `413`; unreachable Redis fails closed (`503`) for paid AI & password reset. | *Pending*: Valid requests within byte caps and rate limits succeed with atomic Redis quota accounting. | `UNVERIFIED (Reason: UNIMPLEMENTED_CONTROL, BLOCKED_INFRA, MISSING_TEST)` |

---

## 3. Phase 1 Execution Record: SQL Migration Remediation & Validation Preparation

### 3.1 Summary of Phase 1 SQL Changes

1. **`supabase/migrations/20261009000003_okeng_staging_security_hardening.sql`**:
   - **Section 2.0 (`P1-SQL-02`)**: Added `ALTER TABLE ... DROP CONSTRAINT IF EXISTS` for `documents_file_id_fkey`, `document_chunks_workspace_id_document_id_fkey`, `conversations_embed_id_fkey`, and `conversation_messages_conversation_id_fkey`.
   - **Sections 2.1, 2.3, 2.5 (`P0-SQL-01`)**: Updated `fk_documents_workspace_file` to `ON DELETE SET NULL (file_id)`, `fk_conversations_workspace_embed` to `ON DELETE SET NULL (embed_id)`, and `fk_issue_reports_workspace_document` to `ON DELETE SET NULL (document_id)`.
   - **Section 4 & Section 6.2 (`P1-SQL-03`)**: Created `public.shares_active_workspace_with(target_user_id TEXT)` (`SECURITY DEFINER STABLE SET search_path = public, pg_temp`), updated policy `users_select_self_or_comember` to call `public.shares_active_workspace_with(id)`, and bound all 5 `SECURITY DEFINER` helpers to `OWNER TO postgres` (`BYPASSRLS`).
   - **Section 9 (`P2-SQL-04`)**: Added `REVOKE ALL ON TABLE public.shared_snapshots, public.issue_reports FROM PUBLIC, anon;`, `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated, service_role;`, and `GRANT SELECT ON TABLE public.shared_snapshots TO anon;`.
   - **Transaction Separation (`P2-SQL-05`)**: Removed all 7 `VALIDATE CONSTRAINT` statements from inside the `BEGIN ... COMMIT` block of `20261009000003`.
2. **`supabase/migrations/20261009000004_okeng_staging_validate_constraints.sql`**:
   - Created companion post-commit migration enforcing `server_version_num >= 150000`, executing all 7 `ALTER TABLE ... VALIDATE CONSTRAINT ...;` operations under `ShareUpdateExclusiveLock`, and asserting `convalidated = true` and `relforcerowsecurity = true` across all 17 public tables.

### 3.2 Captured Phase 1 Verification Output (`2026-10-09T19:47:00-07:00`)

```text
$ npx tsx tests/security/sql-migration-remediation.test.ts
================================================================================
OKEng Phase 1 — SQL Migration Remediation & Validation Preparation Suite
Target Files : 20261009000003_okeng_staging_security_hardening.sql
               20261009000004_okeng_staging_validate_constraints.sql
Live DB Probe: NO_PG_BINARIES (postgres, initdb, pg_ctl, docker, psql absent in container)
================================================================================

SQL_REMEDIATION_VERIFIED [P0-SQL-01] (Closes REPRO-08 DDL Defect | P0) PostgreSQL 15.0+ column-specific ON DELETE SET NULL (file_id | embed_id | document_id) enforced on composite FKs
  1. Baseline Defect Eliminated : 0 unscoped ON DELETE SET NULL composite constraints remain in 20261009000003.
  2. Post-Fix SQL Regression    : fk_documents_workspace_file uses ON DELETE SET NULL (file_id); fk_conversations_workspace_embed uses ON DELETE SET NULL (embed_id); fk_issue_reports_workspace_document uses ON DELETE SET NULL (document_id).
  3. Legitimate Behavior        : Deleting a parent file, embed, or document nulls only the child reference column while preserving child rows and NOT NULL workspace_id.
  4. Live PostgreSQL 15+ Gate   : UNVERIFIED (Reason: BLOCKED_INFRA)
SQL_REMEDIATION_VERIFIED [P1-SQL-02] (Closes REPRO-09 DDL Defect | P1) All 4 legacy single-column / inline foreign keys from 20261003000001 are explicitly dropped before composite FK creation
  1. Baseline Defect Eliminated : All 4 legacy constraint names from 00001 now have explicit DROP CONSTRAINT IF EXISTS statements in 20261009000003 Section 2.0.
  2. Post-Fix SQL Regression    : Drops documents_file_id_fkey, document_chunks_workspace_id_document_id_fkey, conversations_embed_id_fkey, and conversation_messages_conversation_id_fkey prior to composite FK creation.
  3. Legitimate Behavior        : Each child table is governed by a single canonical tenant-scoped composite foreign key without redundant trigger execution.
  4. Live PostgreSQL 15+ Gate   : UNVERIFIED (Reason: BLOCKED_INFRA)
SQL_REMEDIATION_VERIFIED [P1-SQL-03] (Closes REPRO-10 DDL Defect | P1) All 5 SECURITY DEFINER RLS helpers set search_path = public, pg_temp and explicit OWNER TO postgres (BYPASSRLS)
  1. Baseline Defect Eliminated : users_select_self_or_comember no longer queries workspace_memberships inline; all 5 SECURITY DEFINER functions set OWNER TO postgres.
  2. Post-Fix SQL Regression    : Mutual recursion between public.users (FORCE RLS) and public.workspace_memberships (FORCE RLS) is broken by BYPASSRLS function ownership and locked search_path.
  3. Legitimate Behavior        : Authenticated users can SELECT their own profile, active workspace co-member profiles, and workspace_memberships without recursion.
  4. Live PostgreSQL 15+ Gate   : UNVERIFIED (Reason: BLOCKED_INFRA)
SQL_REMEDIATION_VERIFIED [P2-SQL-04] (Closes REPRO-11 DDL Defect | P2) Explicit REVOKE ALL and role-scoped GRANT privileges configured on public.shared_snapshots and public.issue_reports
  1. Baseline Defect Eliminated : Both shared_snapshots and issue_reports now define explicit REVOKE and GRANT statements in Section 9 of 20261009000003.
  2. Post-Fix SQL Regression    : PUBLIC and anon write privileges are explicitly revoked on both tables; anon has zero privileges on issue_reports.
  3. Legitimate Behavior        : authenticated and service_role can perform RLS-governed CRUD on both tables, and anon can SELECT public non-expired shared_snapshots (is_public_document = true).
  4. Live PostgreSQL 15+ Gate   : UNVERIFIED (Reason: BLOCKED_INFRA)
SQL_REMEDIATION_VERIFIED [P2-SQL-05] (Closes REPRO-12 DDL Defect | P2) Fast metadata DDL transaction (20261009000003) separated from 7 VALIDATE CONSTRAINT scans (20261009000004)
  1. Baseline Defect Eliminated : 0 VALIDATE CONSTRAINT statements remain inside the 20261009000003 BEGIN...COMMIT block.
  2. Post-Fix SQL Regression    : All 7 VALIDATE CONSTRAINT statements execute in companion migration 20261009000004 outside a monolithic transaction, followed by pg_constraint.convalidated and pg_class.relforcerowsecurity catalog assertions.
  3. Legitimate Behavior        : All 17 public tables enforce ENABLE + FORCE ROW LEVEL SECURITY while avoiding prolonged AccessExclusiveLock contention during deployment.
  4. Live PostgreSQL 15+ Gate   : UNVERIFIED (Reason: BLOCKED_INFRA)
--------------------------------------------------------------------------------
Phase 1 SQL Remediation Summary: 5/5 SQL findings (P0-SQL-01..P2-SQL-05) remediated in migration files (UNIT_TEST_VERIFIED).
Live PostgreSQL 15.0+ Clean-Install & Seeded-Upgrade Gate: UNVERIFIED (Reason: BLOCKED_INFRA) (NO_PG_BINARIES (postgres, initdb, pg_ctl, docker, psql absent in container)).
HOLD POLICY: Migrations 20261009000003 and 20261009000004 remain HELD from shared staging until live PostgreSQL 15.0+ execution passes.
--------------------------------------------------------------------------------
```

And running `npx tsx tests/security/phase0-baseline-reproduction.test.ts` confirms that `REPRO-08`..`REPRO-12` triggered `POST_FIX_GUARD_TRIGGERED` (`5/12 post-fix guards triggered`), while `REPRO-01`..`REPRO-07` remain `VULNERABILITY_REPRODUCED` (`7/12 baseline defects reproduced`) prior to Phase 2 application-code remediation.
