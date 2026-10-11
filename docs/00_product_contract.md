# 00 — Product Contract: OKEng

| Field | Value |
| :--- | :--- |
| **Document ID** | `00_product_contract` |
| **Status** | `APPROVED — v1.1` |
| **Owner** | Product |
| **Authority** | Blocking — Product Invariant |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `ANALYSIS-001` |
| **Revision** | `1.1 (2026-10-11)` — Added CAP-18..21 from staging hardening and monetization |

**Product:** Embedded, file-based product knowledge layer  
**Principle:** **Files → Collections → Access → Context → Answer**  

---

## 1. Product Invariant

> **Authorization happens strictly before retrieval and context assembly.**  
> Chunks from unauthorized collections are excluded before vector similarity computation.

---

## 2. Core Capabilities

1. **Workspace**: Multi-tenant isolation with unique slug and signing secrets.
2. **Collections**: Logical groupings of documentation with 3-tier access control (`everyone`, `members`, `admins`).
3. **Files**: Ingested Markdown documents and plain-text files.
4. **Markdown Editor**: Integrated syntax editing with real-time preview and document frontmatter metadata.
5. **Document Ingestion/Indexing**: Automatic text normalization, chunking, embedding generation, and status lifecycle (`uploading` → `processing` → `ready` | `failed`).
6. **Access Control**: Dynamic role resolution ensuring users only retrieve content matching their privileges.
7. **AI Retrieval + Answers**: Vector retrieval with top-k cosine similarity and grounded answer generation with sources.
8. **Embedded Chat Client**: Standalone lightweight widget embeddable via a single `<script>` tag.
9. **Host User Context**: Signed host-app parameters (`userId`, `role`, `currentUrl`) injected into query sessions.
10. **Citations**: Direct references to source documents and chunk excerpts.
11. **Test/Debug Console**: Simulation console displaying retrieved chunks, blocked collections, and similarity scores.
12. **Embed Configuration & 6 Composable Surfaces**: Widget placement (`widget`), slide-in panel (`panel` — default `360px`, max-width `min(380px, 40%)`), fullscreen portal (`fullscreen`), inline assistant (`inline`), 3-column documentation experience (`documentation`), and route-aware contextual sidebar (`contextual`).
13. **Document Next-Step CTA**: Optional actionable button (`CO-NEXT-STEP`) rendered below answers to deep-link to verified `https://` or `/path` destinations.
14. **Conversation History**: Operational audit log of questions, answers, and citations.
15. **Answer Feedback**: Simple 👍 / 👎 submission for continuous knowledge quality monitoring.
16. **Usage Metering**: Query counts and token tracking, monthly reset, enforcement by plan (Starter 1k, Pro 10k, Escala unlimited) — from `ANALYSIS-001`.
17. **Universal Form Security & State Contract (`FORM-SEC-01`)**: Strict XSS/script/protocol sanitization, localized placeholders, helper hints, accessible field-level validation errors (`aria-invalid`, `role="alert"`), and `isLoading` submit spinners across all public, authentication (`/login`, `/signup`, `/forgot-password`), workspace, and embedded surfaces.
18. **System Privilege & RBAC (`CAP-18`)**: 4-tier system roles (`super_admin`, `admin`, `member`, `viewer`) with server-only enforcement, no client trust, workspace membership and collection visibility filtered before retrieval (from `SEC-01` SEC-PRIVILEGE-01, `systemPrivileged.ts`).
19. **Rate Limiting & Abuse Protection (`CAP-19`)**: 4-tier rate limiting (`TIER_GLOBAL_100_PER_MIN`, `TIER_AUTH_5_PER_15M`, `TIER_WRITE_20_PER_MIN`, `TIER_READ_60_PER_MIN`) with Redis + in-memory fallback, composite key IP+session, 429 + Retry-After (from `SEC-01` SEC-RATE-LIMIT-01, `rateLimiter.ts`).
20. **Session & CSRF Protection (`CAP-20`)**: Secure session (httpOnly, secure prod, sameSite=strict, 12h expiry, Redis store + fallback, regeneration on login, rolling disabled) and double-submit CSRF (cookie + header, constant-time compare, safe methods exempt, `/api/csrf-token`) (from `SEC-01` SEC-SESSION-01, SEC-CSRF-01, `sessionAndCsrf.ts`).
21. **Marketing & Monetization (`CAP-21`)**: Pricing tiers (Starter 0€ 1k queries 1 collection 100 files, Pro 31€/mo 10k 10 1k, Escala custom), feature matrix (widget/panel Starter, fullscreen/analytics/SSO/webhooks/BYOK Pro+, on-premise/EU hosting/SLA Escala), usage metering (queries/mo, collections, files, storage), billing integration (Stripe checkout/portal/webhooks), upgrade CTAs (from `ANALYSIS-001`, `PLAN-001` landing pricing).

---

## 3. Data Schema

- `Workspace(id, name, slug, public_key, signing_secret, plan, plan_interval, stripe_customer_id, stripe_subscription_id, created_at, updated_at)`
- `Collection(id, workspace_id, name, description, visibility, created_at, updated_at)`
- `Document(id, workspace_id, collection_id, title, filename, content, status, next_step, created_at, indexed_at)`
- `DocumentChunk(id, document_id, collection_id, content, embedding, metadata)`
- `ChatSession(id, workspace_id, user_id, role, current_url, created_at)`
- `Message(id, chat_session_id, role, content, sources, cta, feedback, created_at)`
- `Usage(id, workspace_id, period_start, period_end, queries_count, files_count, collections_count, storage_bytes)`

---

## 4. Definition of Done (16 Invariants)

1. Create workspace
2. Create collection
3. Set collection = Members
4. Upload Markdown/file
5. Files become Ready
6. Create embed
7. Install widget
8. Pass signed user role
9. Ask question
10. Receive grounded answer
11. See citations
12. Change role to Everyone
13. Verify protected collection is inaccessible
14. Test same behavior in Test Chat
15. Inspect resulting conversation
16. Submit feedback

---

## 5. Monetization Invariant (from ANALYSIS-001)

> Pricing tiers enforce limits before processing, with upgrade CTAs, real metrics only (≥98% cited, -73% tickets, 1k free queries, 3 lines code), no fabricated data.

- Starter 0€: 1k queries/mo, 1 collection, 100 files, widget+panel, community support
- Pro 31€/mo (24€ annual -20%): 10k queries, 10 collections, 1k files, all Starter + fullscreen, permissions, SSO, analytics, priority support, badge "Más popular"
- Escala custom: unlimited, all Pro + on-premise, SLA, dedicated support, BYOK, EU hosting, webhooks
