# PLAN-010 — Auth Completion and Google/GitHub OAuth Integration

| Field | Value |
|---|---|
| Status | Auth/OAuth feature and verification harness implemented. Latest Arena fast suite 66/66 passed on 2026-10-12. Windows local Supabase runtime started and ran 13 tests (5 passed, 8 failed); fixes are in the Arena working tree and a Windows rerun is pending. |
| Date | 2026-10-11 |
| Scope | Complete the current email-auth/session surface with optional Google and GitHub OAuth; prepare the existing session/workspace guard as the handoff for a later dashboard initiative |
| Out of scope | Dashboard UI, MFA, SAML, a new passwordless flow, account-settings UI, and custom social-account-linking UI |

## Objective

Complete the existing OKEngine authentication feature set without replacing the request-scoped Supabase Auth architecture. Add Google/GitHub OAuth only when each provider has a complete server-side client-ID/secret pair. Preserve the current same-origin APIs, CSRF protection, HttpOnly session cookies, safe callback behavior, workspace provisioning, and verified workspace authorization.

The browser must not instantiate a Supabase client or send Supabase Auth API calls from application JavaScript. OAuth necessarily includes a top-level browser redirect to the authorization URL returned by the same-origin server endpoint; provider secrets and the PKCE verifier remain server-side/HttpOnly, while Supabase Auth manages protocol state and callback validation.

## Auth feature set and acceptance criteria

1. Email/password sign-in, sign-up/confirmation, password recovery/reset, logout, session retrieval, and Remember me continue to work through the existing server-side routes.
2. Google and GitHub are configured through Supabase Auth and server-only environment variables. Local development uses `supabase/config.toml` and ignored `.env.local`; hosted Supabase also requires dashboard provider setup and the matching app-server pair. A provider is advertised only when both its client ID and secret are present.
3. The provider-list response contains only provider names. Empty or failed configuration produces no provider buttons and no SSO divider.
4. OAuth initiation is same-origin, CSRF-protected, rate-limited, provider-allowlisted, and uses a fixed same-origin callback. The route returns only a server-generated authorization URL and applies the required PKCE/cookie updates.
5. OAuth callback handling exchanges the code, verifies the user with Supabase Auth, provisions/loads the user's workspace under the Auth UUID/RLS model, and fails closed without a usable profile/workspace. It never derives roles from OAuth metadata or joins application users by email.
6. Remember me applies to password and OAuth login: the default Auth cookie is browser-session-only, while an explicit Remember me choice is capped at 30 days. Normalize Supabase SSR's emitted cookie attributes at the response boundary; on any post-auth verification/provisioning failure, apply queued SDK changes and then expire the issued Auth cookie chunks. OAuth initiation requires explicit Terms/Privacy consent because it may create a first-time account from either auth page; the existing sign-up terms checkbox is reused for sign-up, and login exposes a consent control only when an OAuth provider is configured.
7. `/api/auth/session` remains a safe user/workspace projection with no access or refresh tokens. Existing workspace protection remains the authorization boundary for the future dashboard.
8. The local stack keeps Auth, PostgreSQL, Storage, and required API/PostgREST plumbing. Edge Runtime is disabled because no application-owned Edge Function exists; OAuth remains optional, and no provider secrets are requested in chat or committed.

## File catalog

### Application configuration and server flow

| File | Change |
|---|---|
| `.env.example` | Add blank `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, `SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID`, and `SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET` entries. Explain server-only use; preserve existing Supabase settings. |
| `supabase/config.toml` | Add local Google/GitHub external-provider configuration using supported environment interpolation and provider scopes that return email (GitHub: `user:email`). Confirm the stack starts with no credentials. |
| `scripts/supabase-local.ps1` | Verify how the installed Supabase CLI consumes env interpolation. If needed, load only the four allow-listed keys from ignored `.env.local` before `supabase start`; never echo or overwrite secret values. |
| `src/lib/supabase/oauthProviders.ts` (new) | Server-only provider allowlist, paired credential checks, and safe configured-provider projection. |
| `src/lib/validation.ts` | Add a strict OAuth-start schema; allow only Google/GitHub, `remember`, and an explicit consent boolean. |
| `src/app/api/auth/providers/route.ts` (new) | Dynamic `GET`, `Cache-Control: private, no-store`; return only configured provider names. |
| `src/app/api/auth/oauth/start/route.ts` (new) | CSRF-protected and rate-limited `POST`; verify complete provider config and Terms/Privacy consent; use a request-scoped Supabase SSR client; use a fixed same-origin callback; preserve Remember me; return the generated authorization URL with PKCE/cookie updates applied. |
| `src/lib/supabase/server.ts` (conditional) | Explicitly configure PKCE only if the verified SSR behavior requires it; preserve per-request client/cookie isolation and existing persistence options. |
| `src/app/auth/callback/route.ts` | Test the existing code exchange and workspace path against social OAuth. Make only necessary narrow changes for verified-user/email/profile failures or safe internal post-auth redirects; preserve password-recovery behavior. |
| `supabase/migrations/20261011000009_auth_oauth_profile_sync.sql` (conditional) | No schema migration is expected. If tests demonstrate a profile-sync gap, add a forward-only migration; do not rewrite a migration that may already have been applied. |

### Auth client and interface

| File | Change |
|---|---|
| `src/services/authApi.ts` | Add no-store provider discovery and a CSRF-backed OAuth-start helper; validate response shape before redirecting. |
| `src/components/auth/SsoButtons.tsx` | Replace disabled placeholders with configured provider actions. Hide the complete section while loading/when empty; render the divider only alongside at least one provider; provide accessible loading/errors and consent state. |
| `src/components/auth/LoginForm.tsx` | Wire provider start to the login Remember me state and OAuth-specific Terms/Privacy consent. Keep email/password submission and existing error/redirect handling. |
| `src/components/auth/SignupForm.tsx` | Reuse the existing terms state for OAuth consent; ensure social sign-up cannot bypass it. Keep the existing email/password sign-up flow. |
| `src/i18n/locales/en.ts` and `src/i18n/locales/es.ts` | Add localized provider labels, divider, consent, loading, and failure strings; avoid new hard-coded UI copy. |

### Tests and scripts

| File | Change |
|---|---|
| `tests/security/auth-oauth.test.ts` (new) | Test paired credentials, empty/partial config, allowlisting, consent, CSRF/rate-limit behavior, callback origin, PKCE/cookie response, and no secret leakage. |
| `tests/security/auth-ui-conditional.test.ts` (new) | Test provider-specific visibility and absence of both buttons and divider for the empty state. |
| `tests/security/auth-api-client.test.ts` | Extend same-origin/CSRF tests to provider discovery and OAuth start. |
| `tests/security/supabase-auth-storage-integration.test.ts` | Assert that OAuth uses the existing Auth UUID/profile/workspace model and that browser direct-Supabase and service-role boundaries remain intact. |
| `tests/security/session-workspace.test.ts` | Add regression coverage for OAuth-created users receiving the same verified session and active-membership checks. |
| `package.json` | Add the new security tests to the Supabase/auth integration test command. No test framework or dependency is planned. |

### Normative documentation and local setup

| File | Change |
|---|---|
| `AGENTS.md` | Add a universal test-first/red-green-regression rule. Replace the stale hard-coded branch name with session-assigned-branch guidance. |
| `docs/01_ui_foundation.md`, `docs/02_component_catalog.md`, `docs/03_page_specifications.md`, `docs/04_workflows.md`, `docs/UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md` | Update the auth UI/workflow contract from “Pronto/future” to optional configured Google/GitHub buttons, no empty divider, consent, and Remember me behavior. No design tokens are added. |
| `docs/AUTH-01-Authentication-Authorization-Architecture.md`, `docs/AUTH-02-Data-Model-Database-Security.md` | Document the Auth UUID identity mapping, verified-user callback, workspace provisioning, and no application-level email matching/role trust. |
| `docs/SEC-01-Security-Architecture-Contract.md`, `docs/SEC-01-Security-Foundations.md` | Update the auth-specific contracts to match the current Next.js same-origin server flow: secrets stay server-only, PKCE/state and HttpOnly cookies are preserved, redirects are constrained, and no client token storage is introduced. Do not rewrite unrelated security sections. |
| `docs/LOCAL-SUPABASE-OAUTH-WINDOWS.md` (new) | Actionable Windows guide for Google/GitHub console setup, Supabase provider callback `http://127.0.0.1:54321/auth/v1/callback`, app callback `http://localhost:3000/auth/callback`, local env, restart, verification, and common failures. |
| `docs/LOCAL-SUPABASE-WINDOWS.md` | Cross-link the OAuth guide and note that OAuth credentials are optional. Preserve the minimal local service set. |
| `docs/UI-ALIGNMENT-STATUS.md` | Update the auth status only if required by its tracking conventions. |

## Existing auth contracts to retain

The existing login, signup, forgot-password, reset-password, logout, session, cookie, proxy refresh, and workspace authorization code is regression-tested and reused. Unless a new test exposes a defect, it is not rewritten in this initiative. In particular, `src/lib/supabase/client.ts` remains disabled for direct browser Supabase use, and the future dashboard is not part of this change.

## TDD and verification

1. Add/extend tests before production-code changes and run them against the current code to observe the expected failures.
2. Implement only after the red result; keep each provider independently configurable and test the no-credentials state.
3. Run the auth/Supabase integration suite, targeted ESLint and TypeScript checks, and production build. Run live local Supabase checks only when the opt-in local stack is available; document that actual Google/GitHub provider round-trips need user-owned local credentials and are manually verified.

## Implementation and verification status — 2026-10-11

Implemented: conditional server-discovered Google/GitHub UI and safe no-provider state; CSRF/rate-limited PKCE OAuth start; configured fixed callback URL and validated authorization URL; callback Auth UUID/workspace provisioning with fail-closed email/profile handling; Remember me and Terms/Privacy consent gates; Windows local provider guide; UI, auth, database, and security contract updates. No dashboard UI was added, no additional OAuth-only schema migration was needed beyond the existing Auth UUID/profile/workspace migration, and no provider credentials were committed.

Offline verification:

- `npm run test:auth-fast` — PASS, 62/62 tests in the verification-harness follow-up (includes OAuth/client/UI/Auth UUID/session/workspace/Storage checks; supersedes the earlier 44/44 baseline).
- `npm run build` — PASS, 27 routes including the provider manifest, OAuth-start API, and callback.
- `npm run lint` — PASS, 0 errors and 113 repository warnings; targeted lint on changed application source also passes.
- `python3` TOML parse of `supabase/config.toml` — PASS; required local services are Auth, PostgreSQL, Storage, and API/PostgREST plumbing; Edge Runtime is disabled because no local Edge Function is used.
- No-credential UI smoke preview — `/login` returned HTTP 200 and `/api/auth/providers` returned `{ "providers": [] }`.
- `npx tsc --noEmit --pretty false` — still reports pre-existing failures in the Redis cache adapter/module, docs/public page component types, and `src/services/store.ts`; it reports no errors in the changed auth/OAuth files.

Limitations: Docker and the Supabase CLI are absent in this environment, so local Auth startup with blank provider credentials, migrations/RLS against live Postgres, and real Google/GitHub provider round-trips could not be exercised. The local Google provider retains `skip_nonce_check = true` as a documented local-only Supabase tradeoff; do not carry that setting to a hosted environment without security review.

## Verification-harness follow-up — 2026-10-11

- **Fast suite:** `npm run test:auth-fast` — **PASS, 62/62**. The confirmation-pending signup branch, OAuth validation, session-cookie propagation, and local-target guard were exercised without external services.
- **Authored local runtime suite:** `npm run test:auth-local` is one Windows-friendly command for clean migration/catalog assertions, real local Auth signup/confirmation and callback/retry flows, session refresh/cookie rotation, multi-tenant RLS/RPC escalation attempts, private Storage routes/abort/orphan cleanup, and unconfigured OAuth routes. The runner temporarily enables Auth email confirmations only for the disposable local test stack; tests use Auth Admin-generated one-time links and no SMTP container/provider credentials. It restores the checked-in config and restarts the stack with its manual-development defaults afterward.
- **Local run status:** The command was attempted and exited 2 with `[NOT RUN]` because Docker was not found. It stopped at prerequisite checks before `supabase start`, status lookup, or database reset. Therefore **none** of the new migration, Auth, session, RLS, Storage, or local OAuth suites is claimed as executed.
- **Focused type-check:** the shared local helper, all six local integration files, and auth-route runtime tests passed a temporary TypeScript project check; the temporary config was removed.

## Windows validation update — 2026-10-12

- The Windows checkout's fast suite passed after commit `f531cb9`; that run exposed an LF-only config fixture, which has since been made CRLF-safe. After the latest runtime-failure regressions were added and fixed, the Arena fast suite is **66/66**.
- Latest Windows `npm run test:auth-local` reached a healthy stack, completed its guarded local reset, and ran 13 runtime tests: **5 passed, 8 failed**. Failures exposed mismatched cache-header expectations, Supabase SSR's 400-day cookie lifetime overriding the intended session/30-day policy, auth-cookie cleanup on failed provisioning, missing workspace tracking during teardown, an RLS-filtered DELETE RETURNING assertion, and an incorrect in-container PostgreSQL port expectation. Fixes are in the Arena working tree; the Windows suite must be rerun before this gate can pass. This is a partial live run, not a green result.
- The runner now avoids an automatic second `supabase start` after the test-config startup itself fails. A failed Supabase CLI health check may still prune local volumes; treat the local test project as disposable.
- **Lint:** `npm run lint` — **PASS**, 0 errors and 113 repository warnings.
- **Repository TypeScript check:** `npx tsc --noEmit --pretty false` still reports 25 unrelated existing errors in the Redis cache adapter, docs/public component types, and `src/services/store.ts`; it reports no errors in the auth/OAuth application sources. The focused harness check above passes.
- The earlier initial-feature production build result (`npm run build`, 27 routes) predates this harness-only follow-up and was not rerun here. Run the local stack from [LOCAL-SUPABASE-WINDOWS.md](./LOCAL-SUPABASE-WINDOWS.md) on Windows to execute the live runtime gates; the optional real-provider smoke checklist remains non-gating.
