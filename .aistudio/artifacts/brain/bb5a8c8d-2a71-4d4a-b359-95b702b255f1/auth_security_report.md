# OKEng — Complete Security, Public Surface & Embedded Protocol Audit Report (AUTH-01–05 & EMBED-01)

- **Execution Date**: 2026-10-03T18:42:58.121Z
- **Overall Result**: ✓ ALL 20 SECURITY & EMBEDDING INVARIANTS SATISFIED
- **Total Invariants Tested**: 33
- **Passed**: 33 / 33
- **Failed**: 0
- **Execution Duration**: 683ms

---

## Archived Specification Contracts (`/docs`)

1. `docs/AUTH-01-Authentication-Authorization-Architecture.md`
2. `docs/AUTH-02-Data-Model-Database-Security.md`
3. `docs/AUTH-03-Authorization-Matrix-Permission-Contract.md`
4. `docs/AUTH-04-Public-Platform-Surface-Route-Classification.md`
5. `docs/AUTH-05-Auth-Gated-Workspace-Enforcement.md`
6. `docs/EMBED-01-Embedded-Identity-Authorization-Data-Protection-Protocol.md`

---

## Detailed Invariant Evaluation

| Test Code | Category | Contract Item | Result | Duration | Security Evaluation |
|---|---|---|---|---|---|
| SPEC-ARCH-001 | Specification Archival | All 15 AUTH-01–05, EMBED-01–02, ENGINE-01, CACHE-001, I18N-001, RENDER-001, RENDER-TEST-001, PUBLIC-01, UI-01 & ENG-DOD-001 specs in /docs | ✓ PASS | 1ms | Verified all 15 formal specification contracts in /docs |
| DOGFOOD-TEST-001 | Dogfood Architecture (PUBLIC-01) | OKEng workspace contains COL-PUBLIC, COL-DOCS, COL-LEGAL, COL-INTERNAL and 6 composable embeds | ✓ PASS | 4ms | Verified OKEng workspace (4 collections, 20 documents, 6 composable embeds) |
| EMBED-MOD-001 | Presentation Modes (EMBED-02) | All 6 canonical modes (widget, panel, fullscreen, inline, documentation, contextual) configured | ✓ PASS | 1ms | Verified all 6 canonical presentation surfaces (SU-EMBED-CHAT through SU-EMBED-CONTEXTUAL-HELP) |
| EMBED-MOD-002 | Knowledge Scope Narrowing (EMBED-02) | Embed narrowed to specific documents excludes unpinned docs and never bypasses clearance | ✓ PASS | 74ms | Knowledge Scope narrowing verified: intersected allowedCollectionIds & allowedDocumentIds with caller clearance |
| DOGFOOD-TEST-002 | Dogfood Retrieval (PUBLIC-01) | EMB-PUBLIC-HOME answers homepage question from COL-PUBLIC with real citations | ✓ PASS | 14ms | EMB-PUBLIC-HOME retrieved grounded answer and cited COL-PUBLIC source documents |
| SURF-TEST-001 | Public Surface (AUTH-04) | Anonymous visitor accesses public /api/docs without session | ✓ PASS | 5ms | Public /api/docs served 21 specifications without session |
| SURF-TEST-002 | Workspace Boundary (AUTH-05) | Anonymous request to /api/workspaces/acme-cloud rejected with 401 | ✓ PASS | 2ms | Unauthenticated workspace request stopped at Link 1 with 401 AUTHENTICATION_REQUIRED |
| SURF-TEST-003 | Workspace Boundary (AUTH-05) | User of Workspace A requesting Workspace B receives 404 | ✓ PASS | 3ms | Cross-workspace request concealed with 404 Not Found |
| SURF-TEST-004 | Dual RBAC Isolation (AUTH-04) | Platform Admin without customer workspace membership denied with 403 | ✓ PASS | 3ms | Platform Admin blocked from customer workspace without explicit membership or grant |
| SURF-TEST-005 | Admin Bypass Grant (AUTH-03) | Platform Admin with valid AdminGrant permitted scoped read access | ✓ PASS | 3ms | Explicit time-bounded AdminGrant honored for scoped workspace read |
| SURF-TEST-006 | Permission Matrix (AUTH-03) | Read-only Workspace User denied workspace.settings.manage with 403 | ✓ PASS | 4ms | Vertical privilege escalation prevented at Link 4 (403 MISSING_EXPLICIT_PERMISSION) |
| SURF-TEST-007 | Object-Level Ownership (AUTH-05) | Requesting foreign document ID inside authorized workspace returns 404 | ✓ PASS | 4ms | Object-level workspace ownership verified at Link 5 (404 Not Found) |
| EMBED-DOD-001 | Embed Protocol (EMBED-01) | Public widget works without identity and retrieves Everyone collection | ✓ PASS | 5ms | Anonymous public widget retrieved quickstart.md from Everyone collection |
| EMBED-DOD-002 | Embed Security (EMBED-01) | Browser-supplied role="admin" without signed assertion rejected with 401 | ✓ PASS | 4ms | Browser-spoofed role rejected server-side with 401 UNVERIFIED_ROLE_ASSERTION |
| EMBED-DOD-003 | Clearance Mapping (EMBED-01) | Signed employee assertion retrieves Everyone + Members but excludes Admins | ✓ PASS | 5ms | Verified employee assertion mapped to members clearance and retrieved billing-members.md |
| EMBED-DOD-004 | Clearance Mapping (EMBED-01) | Signed admin assertion retrieves Everyone + Members + Admins collections | ✓ PASS | 4ms | Verified manager assertion mapped to admins clearance and retrieved sso-internal.md |
| EMBED-DOD-005 | Nothing Shown Rule (EMBED-01) | Non-admin asking about restricted topic receives zero metadata or existence disclosure | ✓ PASS | 4ms | Nothing Shown rule verified: zero restricted titles, collection names, or restriction hints disclosed |
| AUTH-TEST-001 | Authentication (AUTH-01) | Missing or malformed token rejected with 401 | ✓ PASS | 4ms | Malformed token properly rejected with 401 Unauthorized |
| AUTH-TEST-002 | Token Lifecycle (EMBED-01) | Expired short-lived assertion rejected with 401 TOKEN_EXPIRED | ✓ PASS | 3ms | Expired assertion explicitly denied with 401 TOKEN_EXPIRED |
| AUTH-TEST-003 | Cryptographic Integrity | Tampered assertion payload rejected with 401 INVALID_SIGNATURE | ✓ PASS | 3ms | Cryptographic HMAC-SHA256 mismatch caught server-side with 401 Unauthorized |
| AUTH-TEST-004 | Workspace Binding (EMBED-01) | Assertion signed for Workspace B rejected on Workspace A with 404 | ✓ PASS | 3ms | Assertion workspace binding enforced: foreign workspace rejected with 404 |
| AUTH-TEST-005 | Data Deletion (AUTH-02) | Deleted document excluded from server-side retrieval immediately | ✓ PASS | 3ms | Document marked with deleted_at was immediately excluded before scoring |
| DB-TEST-001 | Critical Approvals (AUTH-02) | Self-approval prohibited (requested_by != approved_by) | ✓ PASS | 0ms | Self-approval constraint enforced: requested_by == approved_by rejected |
| DB-TEST-002 | Data Integrity (AUTH-02) | Document.workspace_id == Collection.workspace_id enforced | ✓ PASS | 0ms | Cross-workspace foreign key relationship rejected |
| SEC-XSS-001 | XSS & URL Safety (SECURITY-003) | Malicious <script>, onerror=, and javascript: URLs blocked at validation boundary | ✓ PASS | 5ms | Verified <script>, onerror=, and javascript: schemes are blocked and stripped |
| SEC-PATH-001 | File Safety (STORAGE-001) | Path traversal filenames (../../etc/passwd) and executable extensions rejected | ✓ PASS | 5ms | Verified path traversal (../) and disallowed file extensions are rejected with 400 |
| AUDIT-SCAN-001 | Self-Audit Scan (AUDIT-001) | Zero unapproved @ts-ignore, eslint-disable, or security bypasses in src/ and server.ts | ✓ PASS | 0ms | Verified clean static analysis and zero unapproved security suppressions |
| ARCH-AUDIT-001 | App Router Structure (ARCH-MIG-001) | App Router layout, loading, error, not-found, route groups, and API route handlers exist | ✓ PASS | 1ms | Verified 10 App Router files and route handlers |
| DATA-AUDIT-001 | Supabase & Fallback (DATA-MIG-001) | SQL migrations, RLS policies, 7 repositories, cross-tenant storage guard, and fallback adapter verified | ✓ PASS | 96ms | Verified SQL migrations, RLS policies, 7 repositories, and adapter mode (local-fallback-adapter) |
| ENGINE-001 | Response Compiler (ENGINE-01) | Deterministic (Procedure/Location/Troubleshooting/Unknown) & Extractive modes compile with 0 LLM tokens | ✓ PASS | 40ms | Verified ENGINE-01 deterministic (17ms, routeBoost=true) & extractive compiler with 0 LLM tokens |
| CACHE-SUITE-001 | Multi-Layer Cache (CACHE-001–012) | All 12 invariants (Exact, Miss, Invalidation, KnowledgeVersion, Role/Tenant/Route Isolation, Semantic, TTL, 100-req Stampede, Negative, Outage) verified on Memory & Redis adapters | ✓ PASS | 132ms | Verified CACHE-001 through CACHE-012 on both MemoryAdapter & RedisAdapter (100-req stampede = 1 compute) |
| I18N-MATRIX-001 | Multilingual Matrix (I18N-001) | All 11 EN/ES/FR native, translated, cross-language, missing-translation fallback, and unauthorized invariants pass | ✓ PASS | 29ms | Verified all 11 I18N-001 matrix scenarios (EN->EN, ES->ES, ES->EN translated, ES->EN-only fallback, FR->EN fallback, ES zero-leakage) |
| RENDER-SUITE-001 | Content Rendering & Regression (RENDER-TEST-001) | All 45 RENDER-001–045 invariants, 22 Golden Fixtures, security-overview.md regression, 10 contexts, and server Edit/Save/Share endpoints pass | ✓ PASS | 219ms | Verified 29/29 RENDER-TEST-001 test groups (RENDER-001–045 & security-overview.md regression) |
