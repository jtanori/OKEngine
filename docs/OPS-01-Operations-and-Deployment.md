# OPS-01 — Operations and Deployment

| Field | Value |
| :--- | :--- |
| **Document ID** | `OPS-01` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | Operations & Deployment |
| **Authority** | Blocking — Deployment & Runtime |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `STG-01`, `ENG-DOD-STG-01`, `STAGING-READINESS-CHECKLIST` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Purpose

Canonical operations and deployment specification, from staging hardening and Next.js migration.

---

## 1. Environment Variables (OPS-ENV-01)

**Validation**: Fail-fast on boot (SEC-ENV-01)

**Required**:

| Var | Format | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | postgres URL | `postgresql://user:pass@host:5432/db?sslmode=require` | PG15+ connection |
| `SESSION_SECRET` | string >=32 chars | random 64 hex | Session signing |
| `CSRF_SECRET` | string >=32 chars | random 64 hex | CSRF signing |
| `NODE_ENV` | enum development/production/test | `production` | Env |
| `PORT` | number | `3000` | Port |

**Optional**:

| Var | Format | Example | Purpose |
| :--- | :--- | :--- | :--- |
| `REDIS_URL` | redis URL | `redis://:pass@host:6379/0` or `rediss://` | Redis for session + rate limiting, optional with in-memory fallback warning |
| `CORS_ALLOWED_ORIGINS` | comma-separated exact origins | `https://app.okeng.com,https://okeng.com,http://localhost:3000` | CORS allowed, no wildcard |
| `STRIPE_SECRET_KEY` | stripe sk_... | `sk_test_...` | Billing |
| `STRIPE_WEBHOOK_SECRET` | stripe whsec_... | `whsec_...` | Billing webhooks |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | price_... | `price_...` | Pro monthly |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | price_... | `price_...` | Pro annual |
| `OPENAI_API_KEY` | sk-... | `sk-...` | BYOK or default LLM |
| `ANTHROPIC_API_KEY` | sk-ant-... | `sk-ant-...` | BYOK |
| `LOG_LEVEL` | debug/info/warn/error | `info` | Logging |

**No Hardcoded Secrets**: All secrets via env, never in code, never in client bundle

---

## 2. Health Check (OPS-HEALTH-01)

**Endpoint**: `GET /api/health`

**Auth**: None

**Rate Limit**: GLOBAL 100/min

**Response**:

- **200 OK** if all up: `{ status: "ok", db: "up", redis: "up" or "fallback", version: "1.0.0", uptime: 12345, timestamp: "2026-10-11T00:00:00Z" }`
- **503 Service Unavailable** if any down or shutting down: `{ status: "down", db: "down", redis: "down", version, uptime, timestamp }`

**Checks**:
- DB: `SELECT 1` via pool, timeout 2s
- Redis: `PING` if REDIS_URL present, else "fallback" if in-memory, "down" if Redis URL present but connection failed

**Use**: Load balancer health check, Kubernetes liveness/readiness, monitoring

---

## 3. Graceful Shutdown (OPS-GRACEFUL-01)

**Signals**: SIGTERM, SIGINT

**Behavior**:
- Log "Received SIGTERM, shutting down..."
- Stop accepting new connections (server.close())
- Health check returns 503 during shutdown
- Wait for existing connections to drain, timeout 30s
- Close DB pool (`pool.end()`)
- Close Redis client (`redis.quit()`)
- Log "Shutdown complete"
- Exit 0

**Express**: Implemented in `server.ts` via `process.on('SIGTERM', ...)`

**Next.js**: Implemented via `src/instrumentation.ts` `register()` or custom server? Actually Next.js `next start` handles graceful, but we add instrumentation for DB/Redis cleanup

---

## 4. Redis — Optional with Fallback (OPS-REDIS-01)

**Requirement**: Optional but recommended for prod multi-instance (STG-01)

**If REDIS_URL present**:
- Use Redis for session store and rate limiting
- Connect on boot, handle errors, reconnect
- Log "Redis connected"
- If Redis fails after boot, fallback to in-memory with warning and log, but try reconnect

**If REDIS_URL missing**:
- Warn "REDIS_URL not set, using in-memory session store and rate limiting — not suitable for production multi-instance"
- Use in-memory `Map` for session and rate limiting
- Works for dev single-instance, not for prod multi-instance (sessions not shared, rate limiting not shared)

**Staging/Prod**: Must have REDIS_URL, else checklist gate STG-01 fails? Actually STG-01 says Redis optional, but for staging with live PG15+ & Redis, runtime verification needs Redis. So for staging checklist 21/21 PASS source, 0/21 runtime pending infra — Redis is part of runtime verification.

---

## 5. Trust Proxy (OPS-TRUST-PROXY-01)

**Prod**: Trust proxy 1 (trust first proxy, e.g., Vercel, Nginx, Cloudflare, load balancer) — for correct IP (X-Forwarded-For) for rate limiting and secure cookies

**Dev**: Trust proxy 0 (no proxy, direct)

**Express**: `app.set('trust proxy', 1)` prod, `0` dev

**Next.js**: Handled via `next.config.js` or Vercel automatically, but also check `x-forwarded-for` header in rate limiting

---

## 6. Logging (OPS-LOG-01)

**Level**: `LOG_LEVEL` env, default `info` prod, `debug` dev

**Format**: JSON in prod (for log aggregation), pretty in dev

**Fields**: timestamp, level, message, requestId, userId, workspaceId, ip, method, path, status, duration, error (if any)

**No Sensitive Logs**: Never log secrets, passwords, session tokens, PII (email ok but masked? Actually email is PII, log userId not email, or masked)

**Request Logging**: Log all API requests with method, path, status, duration, ip, userId (if session), but not body (may contain PII)

**Error Logging**: Log errors with stack in dev, without stack in prod but with error code, log to console and/or external service (e.g., Sentry)

---

## 7. Monitoring & Alerting (OPS-MONITOR-01)

**Metrics** (future, not in MVP but plan):

- Request rate, error rate, latency p50/p95/p99 per endpoint
- DB pool usage, query latency
- Redis connected, memory
- Usage metering: queries/mo per workspace, collections, files
- Rate limiting: 429 rate
- Auth: login success/failure, signup, 401 rate
- Health: uptime, db up/down, redis up/down

**Alerting**: If health down, error rate high, latency high, DB down, Redis down

**Tool**: Vercel analytics, or Prometheus + Grafana, or Datadog, or Sentry for errors

---

## 8. Deployment — Next.js Standard (OPS-DEPLOY-01)

**From PLAN-005**: Proper Next.js architecture, no Vite runner, no Express weirdness

**Build**:
- `npm run build` = `next build`
- Outputs `.next/` directory
- If `output: 'standalone'` in `next.config.js`, outputs `standalone` directory with minimal Node server for Docker

**Start**:
- `npm run start` = `next start`
- Listens on PORT env, default 3000
- Requires DATABASE_URL, SESSION_SECRET, CSRF_SECRET, etc

**Dev**:
- `npm run dev` = `next dev`
- HMR, no Express, no Vite

**Docker** (optional):

```dockerfile
FROM node:20-alpine AS base
# Install deps
# Build
# Run standalone
```

**Vercel**:
- Standard Next.js deployment, no custom server, env vars via Vercel dashboard, PG via Vercel Postgres or external, Redis via Upstash

**Env Validation on Boot**: Fail-fast if required env missing, log masked values

---

## 9. Staging Readiness Checklist — Runtime Verification (OPS-STAGING-01)

**File**: `docs/STAGING-READINESS-CHECKLIST.md`

**Status**: 21/21 PASS in source (52/52 homepage-tour, 29/29 embed-auth, 12/12 baseline guards, 12/12 vulnerabilities remediated), 0/21 STAGING_RUNTIME_VERIFIED pending live PG15+ & Redis infra

**Gates** (from checklist):

- P0-AUTH-01: Rate limiting TIER_AUTH_5_PER_15M enforced
- P0-AUTH-02: Env validation fail-fast
- P0-AUTH-03: CSRF double-submit
- P0-AUTH-04: Session httpOnly/secure/sameSite/12h/Redis/regeneration
- P1-SEC-01: CORS exact-origin no wildcard
- P1-SEC-02: Request validation Zod + FORM-SEC-01 + unknown field rejection
- P1-SEC-03: Privilege system server-only
- P1-SEC-04: Security headers HSTS/CSP/etc
- P2-OPS-01: Trust proxy 1 prod 0 dev
- P2-OPS-02: Graceful shutdown SIGTERM/SIGINT drain
- P2-OPS-03: Health check /api/health with DB & Redis
- P2-OPS-04: No hardcoded secrets, env validation

**Runtime Verification Needs**:
- Live PG15+ with `DATABASE_URL`
- Live Redis with `REDIS_URL` (optional but for runtime verification)
- Deploy to staging env (Vercel preview or Node server)
- Run `npm run test:staging-readiness` against staging URL with live DB/Redis
- Verify 21/21 PASS runtime

**After Next.js Migration**: Re-verify checklist, update to reflect Next.js architecture (middleware.ts, src/app/api/*, src/lib/*), ensure 21/21 still PASS

---

## 10. References

- `server.ts` 74K — Express + Vite hybrid legacy
- `src/lib/env.ts`, `db.ts`, `redis.ts`, `auth.ts`, `rateLimit.ts`, `validation.ts` (Next.js)
- `middleware.ts` (Next.js)
- `next.config.js`
- `STG-01`, `ENG-DOD-STG-01`, `STAGING-READINESS-CHECKLIST.md`
- `SEC-01`, `API-01`, `DB-01`, `DATA-01`
- `PLAN-005` Next.js architecture migration

---

*Operations and deployment spec for Next.js migration and staging.*
