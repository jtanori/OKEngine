# OPS-01 — Distributed Rate Limiting, Cost Controls, Observability & Incident Response

| Field | Value |
| :--- | :--- |
| **Document ID** | `OPS-01` |
| **Status** | `APPROVED FOR STAGING` |
| **Owner** | Site Reliability & Security Operations |
| **Authority** | Blocking Gate — Phase 04 (Runtime & Cost Protection) |
| **Dependencies** | `SEC-01`, `API-01`, `DATA-01`, `STG-01` |
| **Source of Truth** | `server.ts`, `src/cache/cache.module.ts` |
| **Revision** | `2.1 (2026-10-09)` |

---

## 1. Distributed Rate Limiting Architecture (`RateLimiterAdapter`)

To protect authentication flows against credential stuffing and paid Gemini AI routes against quota/wallet exhaustion across horizontally scaled staging and production instances, OKEng enforces a pluggable `RateLimiterAdapter` with atomic Redis Lua execution in `staging`/`production` and an in-memory sliding-window implementation for single-process `development`/`test`.

### 1.1 Rate-Limit Tiers & Identity Keys

Client IP addresses are extracted strictly from `req.ip` with Express `app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1))`—never from unverified client-supplied `X-Forwarded-For` headers when not behind a configured proxy. Account identifiers are normalized (`trim().toLowerCase()`) and hashed with HMAC-SHA256 (`SHA256(email)`) before being written to Redis keys or logs so raw PII never appears in Redis keyspaces.

| Tier ID | Protected Routes | Sliding Window & Limit | Partition Key | Redis Outage Behavior (`staging`/`prod`) |
| :--- | :--- | :--- | :--- | :--- |
| `TIER_AUTH_5_PER_15M` | `POST /api/auth/login`, `POST /api/auth/signup` | `5 req / 900s` per `(IP, HMAC(email))` AND `15 req / 900s` per `IP` | `rl:auth:{ip}:{emailHash}` | **Conservative Per-Instance Fallback** (`3 req / 900s` in-memory) + emits `P1_REDIS_RATE_LIMIT_DEGRADED` alert. |
| `TIER_AUTH_3_PER_15M` | `POST /api/auth/password-reset` | `3 req / 900s` per `(IP, HMAC(email))` AND `10 req / 900s` per `IP` | `rl:pwreset:{ip}:{emailHash}` | **Fail Closed (`503 Service Unavailable`)** to prevent email flood abuse. |
| `TIER_SESSION_30_MIN` | `POST /api/embed/session`, `POST /api/embed/session/upgrade`, `POST /api/auth/token/*` | `30 req / 60s` per `(IP, workspaceId)` | `rl:sess:{wsId}:{ip}` | **Conservative Per-Instance Fallback** (`10 req / 60s`). |
| `TIER_PAID_AI_10_MIN` | `POST /api/chat`, `POST /api/embed`, `POST /api/chat/stream` (`answerMode === 'generative'`) | `10 req / 60s` per `sessionId\|userId` AND `60 req / 60s` per `workspaceId` + **Atomic Daily Token Budget** | `rl:ai:{wsId}:{actorHash}` | **Fail Closed (`503 PAID_AI_QUOTA_UNAVAILABLE`)**; falls back to zero-cost deterministic compiler (`ENGINE-01`) where supported. |
| `TIER_CHAT_DET_60_MIN` | `POST /api/chat/stream` (`deterministic` / `extractive`), `POST /api/demo/homepage-context` | `60 req / 60s` per `IP` | `rl:det:{ip}` | **Bounded Per-Instance Fallback** (`30 req / 60s` in-memory). |
| `TIER_UPLOAD_15_MIN` | `POST /api/workspaces/:workspaceId/files` | `15 req / 60s` per `(workspaceId, userId)` | `rl:upload:{wsId}:{userId}` | **Fail Closed (`503 Service Unavailable`)**. |

### 1.2 Standardized `429 Too Many Requests` Response Contract
Every rate-limited response sets standard HTTP headers:
- `Retry-After: <seconds>`
- `X-RateLimit-Limit: <window_max>`
- `X-RateLimit-Remaining: <remaining>`
- `X-RateLimit-Reset: <unix_epoch_seconds>`
- Body: `{ "error": "RATE_LIMIT_EXCEEDED", "retryAfterSeconds": 42, "requestId": "req_..." }`

---

## 2. Paid Gemini AI Cost Controls & Atomic Token Reservation

Request-count limits alone cannot bound AI spend if prompts or outputs vary wildly in token size. Every route that invokes `@google/genai` (`/api/embed`, `/api/chat`, and `/api/chat/stream` when `answerMode === 'generative'`) enforces the following 6 cost controls:

1. **Hard Input & Context Bounds**:
   - Max question length: `1,000` characters (`~250` tokens).
   - Max retrieved context chunks passed to Gemini: top `6` authorized chunks, capped at `12,000` total characters (`~3,000` input tokens).
   - Max embedding input text (`/api/embed`): `8,000` characters (`~2,000` tokens).
2. **Hard Output Token Ceiling**:
   - All `ai.models.generateContent` and `ai.models.generateContentStream` calls explicitly pass `config: { maxOutputTokens: 1024, temperature: 0.1 }`.
3. **Atomic Pre-Stream Token Reservation (`reserveTokens` / `reconcileTokens`)**:
   - Partition key: `quota:tokens:{workspaceId}:{YYYY-MM-DD_UTC}` (24-hour UTC rollover with `EXPIRE 172800`).
   - Default provisional ceiling: `OKENG_DAILY_GEMINI_TOKEN_BUDGET = 250000` combined (input + output) tokens per workspace per UTC day.
   - **Step A (Before Calling Gemini)**: Estimate input tokens (`Math.ceil(promptChars / 3.5)`) and atomically reserve `reservedTokens = estimatedInputTokens + 1024` in Redis via Lua:
     ```lua
     local current = tonumber(redis.call('GET', KEYS[1]) or '0')
     local budget = tonumber(ARGV[1])
     local reserve = tonumber(ARGV[2])
     if current + reserve > budget then
       return {0, current, budget}
     end
     local updated = redis.call('INCRBY', KEYS[1], reserve)
     if updated == reserve then
       redis.call('EXPIRE', KEYS[1], 172800)
     end
     return {1, updated, budget}
     ```
   - **Step B (After Stream Completion or Client Disconnect)**: Compute actual tokens used (`actualInputTokens + actualOutputTokens`) and atomically refund the unused portion (`DECRBY KEYS[1], Math.max(0, reservedTokens - actualTokens)`).
4. **Per-Workspace Concurrency Limit**:
   - Maximum `5` concurrent in-flight Gemini requests per workspace (`quota:concurrency:{workspaceId}`).
5. **Stream Timeout & Client Disconnect Cancellation**:
   - Every Gemini call is wrapped in an `AbortController` with a `15,000 ms` hard timeout and bound to `req.on('close', () => abortController.abort())`. If the browser closes the SSE connection early, the upstream Gemini stream is aborted immediately and unused reserved tokens are refunded.
6. **Provider Outage Circuit Breaker**:
   - Zero automatic retries on `429` or `5xx` from Gemini; after `3` consecutive upstream failures within `60s`, the circuit breaker opens for `60s` and automatically serves deterministic compiled answers (`ENGINE-01` Mode 1) with `answerPlan.fallbackReason = 'UPSTREAM_AI_CIRCUIT_OPEN'`.

---

## 3. Capability-Scoped Health Probes (`/api/health/live` & `/api/health/ready`)

The legacy `/api/health` endpoint (`server.ts` lines 84–91) disclosed `hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)` to unauthenticated callers and did not verify database or cache connectivity. Staging splits health checks into two endpoints:

### 3.1 `GET /api/health/live` (Process Liveness)
- **Purpose**: Confirms the Node.js event loop is responsive. Used by container orchestrators to decide whether to restart the container.
- **Behavior**: Performs zero network or database I/O. Always returns within `< 5ms`:
  ```json
  { "status": "alive", "timestamp": "2026-10-09T18:00:00.000Z" }
  ```

### 3.2 `GET /api/health/ready` (Workload & Capability Readiness)
- **Purpose**: Determines whether the instance can accept staging traffic. Uses a cached 5-second probe result with a `1,500 ms` timeout so health probes never overload PostgreSQL or Redis.
- **Capability Evaluation**:
  - **Core Required Dependencies (`database`, `cache`, `secrets`)**: If `OKENG_DATA_MODE=supabase` and PostgreSQL connectivity, Redis connectivity, or required P0 secrets (`OKENG_SESSION_SECRET`, `OKENG_CSRF_SECRET`, `OKENG_KMS_MASTER_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) fail validation, returns `503 Service Unavailable`.
  - **Optional / Degradable Workload (`generativeAi`)**: Because OKEng's primary retrieval engine is the zero-LLM deterministic compiler (`ENGINE-01`), an upstream Gemini API outage marks `capabilities.generativeAi = "degraded"` while keeping overall readiness `200 OK` (`status: "ready_degraded_ai"`) so deterministic documentation search and embeds remain 100% online.
- **Zero Secret Disclosure**: Never returns environment variable names, connection strings, or exception stack traces to unauthenticated callers.

---

## 4. Structured Observability, Redaction & Security Alerting

1. **Structured JSON Request & Audit Logging**:
   - Every log entry includes `{ timestamp, level, requestId, method, path, statusCode, latencyMs, workspaceId, authDomain, actorIdHash }`.
   - **Mandatory Redaction Filter**: Never logs `Authorization` headers, `Cookie` / `Set-Cookie` headers, `password`, `identityToken`, `signingSecret`, `GEMINI_API_KEY`, raw user email addresses, or full document markdown bodies.
2. **Security Audit Events Persisted to `public.security_audit_logs` (`SRV-PRIV-01`)**:
   - `auth.login.allow` / `auth.login.deny`
   - `auth.token_replay_detected` (`jti` collision)
   - `authz.cross_tenant_access_denied` (Link 3 or Link 5 failure)
   - `authz.csrf_validation_failed`
   - `workspace.secret_rotated`
   - `membership.created` / `membership.updated` / `membership.deleted`
   - `governance.admin_grant_created` / `governance.approval_recorded`
   - `share.created` / `share.revoked`
3. **Operational Alert Thresholds**:
   - **`P0_CROSS_TENANT_DENY_SPIKE`**: `> 5` Link 5 cross-tenant resource ownership denials within `5 minutes` from any authenticated session.
   - **`P0_TOKEN_REPLAY_OR_BAD_SIG`**: `> 10` `INVALID_SIGNATURE` or `TOKEN_REPLAY_DETECTED` events on `/api/embed/session` within `5 minutes`.
   - **`P1_GEMINI_BUDGET_80_PCT`**: Workspace daily token usage exceeds `80%` of `OKENG_DAILY_GEMINI_TOKEN_BUDGET`.
   - **`P1_REDIS_RATE_LIMIT_DEGRADED`**: Redis connection failure detected by `RateLimiterAdapter`.
