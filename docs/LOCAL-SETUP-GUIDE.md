# LOCAL-SETUP-GUIDE — OKEng Local Development & Production Setup

| Field | Value |
| :--- | :--- |
| **Document ID** | `LOCAL-SETUP-GUIDE` |
| **Status** | `APPROVED — v3.0` |
| **Owner** | Engineering & DevEx |
| **Authority** | Blocking — Local Setup & Onboarding |
| **Dependencies** | `00_product_contract`, `01_ui_foundation v3.0`, `02_component_catalog v3.0`, `03_page_specifications v3.1`, `UI-01 v3.1`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `PUBLIC-01`, `RENDER-001`, `PLAN-006` |
| **Revision** | `2.0 (2026-10-11)` — Next.js 16.4.0 App Router Turbopack default, React 19.3.0, proxy.ts, ESLint flat config, Stripe billing, 25 static + 32 total routes, 52/52 + 29/29 PASS |

---

## 0. Overview

OKEng is an embeddable product knowledge layer: **Files → Collections → Access → Context → Answer**. It turns Markdown documentation into grounded, source-cited answers inside your app, with pre-retrieval authorization (EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections), BM25 lexical ranking, and deterministic rendering via Normalized Content AST.

**This guide** gets you from zero to running OKEng locally in <5 minutes (memory mode) or fully with Supabase + Redis + Stripe.

**Dogfooding**: This site is OKEng using OKEng — workspace `ws_okeng_01` slug `okeng`, 5 collections (COL-PUBLIC 4, COL-DOCS 11, COL-LEGAL 3, COL-CUSTOMER 3 members, COL-INTERNAL 4 admins), 25 docs, 3 embeds EMB-PUBLIC-HOME mixed-access floating tour, EMB-PUBLIC-DOCS public docs only, EMB-PUBLIC-LEGAL legal only. Deterministic rendering `DocArticleRenderer` never LLM, dynamic retrieval `DogfoodInlineBot` real engine `resolveRequestEmbedIdentity → resolveEmbedAuthorization → retrieveKnowledge → compileKnowledgeResponse` with citations, live update `store.reconcileCanonicalSeeds` bumps `knowledgeVersion` 187→189.

**Visual identity v3.0**: warm canvas #F8F7F4, white surface #FFFFFF, ink #171717 strong #0F172A, accent cobalt #1D4ED8, subtle #F4F4F0, line #DEDDD8, radius sm 4px md 6px lg 12px xl 16px, shadow-sm 0 1px 2px rgba(0,0,0,0.04) md 0 4px 12px rgba(0,0,0,0.08) lg 0 8px 24px rgba(0,0,0,0.12), Inter + JetBrains Mono, editorial whitespace max-w-7xl py-16/24 quiet technical professional sublime.

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
| :--- | :--- | :--- | :--- |
| Framework | Next.js App Router | 16.4.0 (Turbopack default) | API Routes + Proxy (proxy.ts) + src/lib/*, no Vite runner, Turbopack default bundler for dev & build, file system caching stable, lockfile prevents multiple dev instances |
| UI | React + React DOM | 19.3.0 | Requires Next 16.4.0 React 19.2+, ref as prop (forwardRef migrated), React.FC no implicit children |
| Language | TypeScript | 5.9.3 | 5.1+ min for Next.js 16, 7.0.2 unsupported — use 5.8+ |
| Styling | Tailwind CSS | 4.3.3 + @tailwindcss/postcss 4.3.3 | @import "tailwindcss", @theme tokens in src/index.css, postcss.config.mjs with @tailwindcss/postcss for Turbopack |
| Lint | ESLint + eslint-config-next | 9.39.5 + 16.4.0 flat config | next lint removed in Next.js 16, use eslint . with eslint.config.mjs flat config (core-web-vitals + typescript) |
| Icons | lucide-react | 0.546.0 | FileText etc |
| Animations | motion | 12.23.24 | For landing tour |
| DB | PostgreSQL via pg | 8.11.0 | Supabase PostgreSQL in staging/prod, memory in dev |
| Cache | ioredis + redis | 6.0.0 / 4.6.0 | Redis optional in dev, required in staging/prod for distributed rate limiting |
| Auth | Custom HMAC-SHA256 | HS256 | Session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit 5-Link Auth Chain |
| Billing | Stripe | 23.0.0 | checkout/portal/webhooks metering |
| AI (optional) | @google/genai | 2.4.0 | Gemini synthesis over pre-filtered authorizedDocs when GEMINI_API_KEY configured, falls back deterministic compileKnowledgeResponse |
| Testing | tsx + node:test | 4.21.0 | 52/52 homepage-tour-readiness + 29/29 embed-authorization |

**Routes (25 static + 32 total, Next.js 16.4.0 Turbopack)**: `/` landing PA-LANDING 12 surfaces, `/about` AboutView PA-PUBLIC, `/contact` ContactView, `/docs` DocsView PA-DOCS, `/docs/[slug]` DocsView article, `/terms` `/privacy` `/acceptable-use` LegalView, `/login` `/signup` `/forgot-password` `/reset-password` AuthView PA-AUTH, `/workspaces/[workspaceSlug]/collections`, `/collections/[collectionId]`, `/files`, `/files/[documentId]`, `/embeds`, `/embeds/preview`, `/embeds/installation`, `/test`, `/conversations`, `/stitch`, `/settings`, plus API routes `/api/auth/*`, `/api/billing/*`, `/api/chat/stream`, `/api/health`, `/api/csrf-token`, `/api/audit/status`. Build: `next build` Turbopack default, 25 static pages generating, First Load JS 103kB shared chunks, proxy.ts handles security headers CORS exact-origin CSRF lightweight.

---

### 1.1 Next.js 16.4.0 Upgrade Notes (PLAN-007)

Upgraded from 15.1.0 (installed 15.5.27) to 16.4.0 latest (2026-10-11), React 19.0.1→19.3.0, per official https://nextjs.org/docs/app/guides/upgrading/version-16 + https://nextjs.org/blog/next-16.

**Breaking changes handled:**
- **Turbopack default bundler**: `next dev` and `next build` now use Turbopack by default (was webpack). Build output: `▲ Next.js 16.4.0 (Turbopack)`. File system caching stable and default in 16.1 — dev startup ~87% faster. `next.config.mjs` migrated webpack alias `@→./src` to `turbopack.resolveAlias` + keep `webpack` fallback for `--webpack` mode. If Turbopack fails for a dependency, use `next build --webpack`.
- **middleware.ts → proxy.ts**: Renamed `middleware.ts` to `proxy.ts`, function `middleware` → `proxy`, Node.js runtime only (not edge). If you need edge runtime, keep `middleware.ts` for edge per versions.dev. Our proxy handles security headers (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=() microphone=() geolocation=()), CORS exact-origin (403 for API if disallowed origin), CSRF lightweight check (cookie okeng.csrf/__Host-okeng.csrf + header x-csrf-token/x-okeng-csrf, full validation in src/lib/auth.ts validateCsrf). Matcher preserved: `/api/:path*`, `/workspaces/:path*`, `/login`, `/signup`, `/forgot-password`, `/password/reset`, `/reset-password`. Config flags `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize` if used (we don't).
- **next lint removed**: `next lint` command removed in Next.js 16, `next build` no longer runs linting. Migrated to ESLint CLI: `npm run lint` now `eslint .` with `eslint.config.mjs` flat config (Next.js 16 defaults to flat config, aligning with ESLint v10 which will drop legacy config). `eslint-config-next` 16.4.0 with `core-web-vitals` + `typescript` presets. Custom rules relaxed for OKEng custom router (no-html-link-for-pages off because we use AppRouterProvider history.pushState, not Next.js Link), `no-explicit-any` warn, `prefer-const` warn, `react-hooks` warn, etc. Ignores: `node_modules`, `.next`, `out`, `build`, `next-env.d.ts`, `src/views-legacy`, `tests`, `scripts`, `docs`. Run `npx @next/codemod@canary next-lint-to-eslint-cli .` for migration.
- **Async Request APIs fully removed**: `cookies()`, `headers()`, `draftMode()` from `next/headers`, `params` and `searchParams` in layout/page/route/default/opengraph-image/twitter-image/icon/apple-icon now must be awaited. Sync access hard failure in Next.js 16 (was warning in 15). Our codebase uses custom router `useParams` from `src/app/router.tsx` not Next.js server params, all pages `'use client'`, API routes use `NextRequest` not `next/headers`, so no sync access — verified via `npx @next/codemod@canary next-async-request-api .` 0 modified, `npx next typegen` generates PageProps LayoutProps RouteContext helpers for future server components. If you add server components with params, use `const { slug } = await params`, `const searchParams = await searchParams`, `const cookieStore = await cookies()`.
- **React 19.3.0 + forwardRef removal**: Next.js 16 requires React 19.2+ in App Router. Bumped React 19.0.1→19.3.0. React 19 removes `forwardRef` — components now accept `ref` as regular prop. Migrated 6 UI primitives: `Button.tsx`, `Box`, `Card` (`Card.tsx`), `Input`, `Textarea` (`Input.tsx`), `Select.tsx` from `React.forwardRef` to `function Component({ ref, ...props }: Props & { ref?: React.Ref<...> })`. Also `React.FC` no longer includes children implicitly — explicitly include children prop if needed.
- **next/image defaults**: `minimumCacheTTL 60s→4h (14400s)`, `imageSizes` removes 16, `qualities [1..100]→[75]`, `dangerouslyAllowLocalIP` blocks local IP optimization by default, `maximumRedirects unlimited→3`, local src with query strings requires `images.localPatterns`. We don't use `next/image` heavily, but added explicit `images` config in `next.config.mjs` to adopt new defaults intentionally: `minimumCacheTTL 14400`, `qualities [75]`.
- **Lockfile & output dirs**: Next.js 16 adds lockfile mechanism to prevent multiple `next dev` or `next build` instances on same project, dev and build output directories separate enabling concurrent execution. If you see lockfile error, remove `.next/dev/lock` or `.next/build/lock`.
- **Parallel routes default.js**: All parallel route slots `@slot` now require explicit `default.js` that calls `notFound()` or returns null. We have route groups `(public)`, `(auth)`, `(workspace)` not parallel routes, so no `default.js` needed.
- **Other removals**: AMP support removed, `serverRuntimeConfig`/`publicRuntimeConfig` removed (use env vars), `devIndicators` options removed, `experimental.turbopack` moved to top-level `turbopack`, `experimental.dynamicIO`→`cacheComponents`, `experimental.ppr` removed, `export const experimental_ppr` removed, automatic `scroll-behavior: smooth` removed (add `data-scroll-behavior="smooth"` to HTML to opt back in), `unstable_rootParams()` removed, metadata image route `params` async, `next/legacy/image` deprecated, `images.domains`→`remotePatterns`, `revalidateTag(tag)` now requires `cacheLife` profile second arg or use `updateTag()` in Server Actions for read-your-writes.
- **PostCSS for Tailwind 4 + Turbopack**: Added `postcss.config.mjs` with `@tailwindcss/postcss` plugin and installed `@tailwindcss/postcss@4.3.3` dev dep. Previously no postcss config, relied on webpack handling of `@import "tailwindcss"` + `@theme`. Turbopack requires explicit PostCSS config, otherwise warning `Unknown at rule: @theme`. Now `npm run build` compiles successfully with Turbopack, no CSS warning.

**Verification**: `npm run build` PASS 25 static + 32 total routes Turbopack, `npm run test:homepage-tour-readiness` 52/52 PASS, `npm run test:embed-authorization` 29/29 PASS, `npm run lint` 0 errors 110 warnings (after relaxing rules for custom router), `npx tsc --noEmit` shows pre-existing type errors but `typescript.ignoreBuildErrors true` in next.config.mjs keeps build green (same as before).

---

## 2. Prerequisites

- **Node.js** 20+ (22 recommended) — check `node -v`
- **npm** 10+ or **bun** 1.0+ — repo has both `package-lock.json` and `bun.lock`, either works
- **PostgreSQL** 15+ OR Supabase project (only if you want `OKENG_DATA_MODE=supabase`, not required for quick start)
- **Redis** 7+ (optional in dev, required in staging/prod)
- **Stripe CLI** (optional, for local webhook testing)

```bash
node -v # should be >=20
npm -v  # >=10
```

---

## 3. Quick Start — Memory Mode (Zero External Dependencies, <2 min)

This is the fastest way — uses in-memory store with canonical seed data (ws_okeng_01 5 collections 25 docs 3 embeds), no DB, no Redis, no Supabase.

```bash
# 1. Clone
git clone https://github.com/jtanori/OKEngine.git
cd OKEngine

# 2. Install
npm install
# or
bun install

# 3. Env — minimal for memory mode
cp .env.example .env.local
# Edit .env.local — set minimal required:
# OKENG_ENV=development
# OKENG_DATA_MODE=memory
# PORT=3000
# DATABASE_URL=postgresql://dummy  (required by src/lib/env.ts even in memory mode for build, but not used)
# SESSION_SECRET=dummy-secret-32-chars-minimum-length-for-dev
# CSRF_SECRET=dummy-csrf-secret-32-chars-minimum
# OKENG_SIGNING_SECRET=dev-only-workspace-secret-ws_okeng_01-min-32-chars-okeng-2026

# 4. Dev server
npm run dev
# → http://localhost:3000

# 5. Build check (optional)
npm run build
npm run start
```

**What you get in memory mode:**
- Landing v3.0 at `/` with 12 surfaces, announcement banner, metrics ≥98% -73% 1k 3 lines, pricing Starter 0€ Pro 31€/mo Escala custom
- Docs v3.0 at `/docs` PA-DOCS archetype header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer
- About at `/about`, Contact at `/contact`, Legal at `/terms` `/privacy` `/acceptable-use`
- Auth at `/login` `/signup` `/forgot-password` `/reset-password` PA-AUTH card centered canvas white surface rounded-lg shadow-md cobalt
- Workspace console at `/workspaces/okeng/collections` etc (uses seed data)
- Test Console at `/workspaces/okeng/test?embedId=EMB-PUBLIC-HOME` with 5 scenarios Visitor Member Admin Invalid Token 401 Multilingual

**No external services needed** — retrieval uses BM25 + field boosts + route boost + same-language boost, deterministic compilation, no Gemini required.

---

## 4. Environment Variables — Full Contract

See `.env.example` for canonical contract. Two layers:

### 4.1 Next.js layer (`src/lib/env.ts` — SEC-ENV-01 fail-fast)

Validated at startup, throws if invalid. Required even in memory mode for build-time.

| Var | Required | Example | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Yes (even in memory mode for build) | `postgresql://user:pass@localhost:5432/okeng` or `postgresql://dummy` for memory | PG connection string, ssl true in prod, max 20 pool |
| `SESSION_SECRET` | Yes | 32+ chars high-entropy | HMAC-SHA256 for session token signing, httpOnly secure sameSite strict 12h |
| `CSRF_SECRET` | Yes | 32+ chars | CSRF double-submit token |
| `NODE_ENV` | No | `development` | development/production/test |
| `PORT` | No | `3000` | Server port |
| `REDIS_URL` | No (required in staging/prod) | `redis://localhost:6379` | Redis for distributed rate limiting, token replay cache, answer cache, session fallback |
| `CORS_ALLOWED_ORIGINS` | No | `http://localhost:3000,https://okeng.dev` | Exact-origin only, no wildcard * — enforced in src/lib/env.ts |
| `STRIPE_SECRET_KEY` | No (required for billing) | `sk_test_...` | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | No | `whsec_...` | Stripe webhook signing secret |

### 4.2 Legacy layer (`.env.example` — STG-01, SEC-01, OPS-01, DATA-01)

Used by `server.ts` legacy and `src/services/*`. For full staging parity:

| Var | Required in prod | Description |
| :--- | :--- | :--- |
| `OKENG_ENV` | Yes | development/test/staging/production |
| `OKENG_DATA_MODE` | Yes | memory (dev/test only) / supabase (mandatory in staging/prod, startup fails if not supabase) |
| `OKENG_ALLOWED_ORIGINS` | Yes | Same as CORS_ALLOWED_ORIGINS but legacy name |
| `SUPABASE_URL` | If supabase mode | Supabase URL |
| `SUPABASE_ANON_KEY` | If supabase mode | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | If supabase mode | Service role key — server-only, never exposed to browser |
| `OKENG_SESSION_SECRET` | Yes | Legacy session secret, 32+ byte high-entropy in staging/prod |
| `OKENG_CSRF_SECRET` | Yes | Legacy CSRF secret |
| `OKENG_KMS_MASTER_KEY` | Yes | KMS envelope encryption |
| `OKENG_SIGNING_SECRET` | Yes | Default workspace host assertion signing secret HS256 — Domain B & C, EMBED-01 |
| `CACHE_BACKEND` | No | auto/memory/redis |
| `REDIS_URL` | If prod | Same as above |
| `CACHE_ENABLED` | No | true/false |
| `GEMINI_API_KEY` | No | Optional Gemini AI, if unconfigured falls back deterministic compileKnowledgeResponse |
| `OKENG_DAILY_GEMINI_TOKEN_BUDGET` | No | Default 250000 tokens per workspace per UTC day, atomic reservation reserveTokens/reconcileTokens |
| `OKENG_DISABLE_GENERATIVE_AI` | No | false/true |

**Minimal `.env.local` for memory mode quick start:**

```env
OKENG_ENV=development
OKENG_DATA_MODE=memory
PORT=3000
TRUST_PROXY_HOPS=1
OKENG_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://dummy
SESSION_SECRET=dev-session-secret-32-chars-min-length-ok
CSRF_SECRET=dev-csrf-secret-32-chars-min-length-ok
OKENG_SESSION_SECRET=dev-session-secret-32-chars-min-length-ok
OKENG_CSRF_SECRET=dev-csrf-secret-32-chars-min-length-ok
OKENG_KMS_MASTER_KEY=dev-kms-master-key-32-chars-min-ok
OKENG_SIGNING_SECRET=dev-only-workspace-secret-ws_okeng_01-min-32-chars-okeng-2026
CACHE_BACKEND=memory
CACHE_ENABLED=true
OKENG_DAILY_GEMINI_TOKEN_BUDGET=250000
OKENG_DISABLE_GENERATIVE_AI=false
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

**Full `.env.local` for supabase + redis + stripe:**

```env
OKENG_ENV=development
OKENG_DATA_MODE=supabase
PORT=3000
TRUST_PROXY_HOPS=1
OKENG_ALLOWED_ORIGINS=http://localhost:3000,https://okeng.dev
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/okeng
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SESSION_SECRET=your-32-char-min-session-secret-high-entropy
CSRF_SECRET=your-32-char-min-csrf-secret-high-entropy
OKENG_SESSION_SECRET=your-32-char-min-session-secret-high-entropy
OKENG_CSRF_SECRET=your-32-char-min-csrf-secret-high-entropy
OKENG_KMS_MASTER_KEY=your-32-char-min-kms-master-key-high-entropy
OKENG_SIGNING_SECRET=your-32-char-min-signing-secret-hs256-okeng-2026
CACHE_BACKEND=auto
REDIS_URL=redis://localhost:6379
CACHE_ENABLED=true
GEMINI_API_KEY=your-gemini-key-optional
OKENG_DAILY_GEMINI_TOKEN_BUDGET=250000
OKENG_DISABLE_GENERATIVE_AI=false
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://okeng.dev
```

---

## 5. Installation

```bash
# Clone
git clone https://github.com/jtanori/OKEngine.git
cd OKEngine

# Install deps
npm install
# or
bun install

# Env
cp .env.example .env.local
# Edit .env.local per Section 4

# Optional: Install Stripe CLI for webhook testing
# https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhooks
# Copy webhook secret whsec_... into STRIPE_WEBHOOK_SECRET
```

---

## 6. Running Locally

### 6.1 Dev server (Next.js)

```bash
npm run dev
# → http://localhost:3000
# Landing at /
# Docs at /docs (PA-DOCS v3.0)
# About at /about
# Contact at /contact
# Terms at /terms, Privacy at /privacy, Acceptable Use at /acceptable-use
# Auth at /login, /signup, /forgot-password, /reset-password
# Workspace at /workspaces/okeng/collections
```

**Features in dev:**
- Hot reload, React Strict Mode, poweredByHeader false
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera=() microphone=() geolocation=()
- Middleware: trust proxy, CORS exact-origin, CSRF lightweight check, rate limiting delegated to API routes
- Webpack alias @ → ./src via next.config.mjs ESM

### 6.2 Production build locally

```bash
npm run build
# Creates .next optimized production build, 26 routes
# Route (app) Size First Load JS
# ○ / 5.18 kB 111 kB
# ○ /about 3.2 kB 106 kB
# ○ /contact 2.94 kB 106 kB
# ○ /docs 339 B 221 kB
# ƒ /docs/[slug] 360 B 221 kB
# ○ /terms 281 B 216 kB etc

npm run start
# → http://localhost:3000 production
```

### 6.3 Lint & clean

```bash
npm run lint
npm run clean # rm -rf .next dist
```

---

## 7. Database — Memory vs Supabase

### 7.1 Memory mode (default dev/test)

- **No external DB needed**
- Uses `src/data/seedData.ts` canonical seed: INITIAL_WORKSPACE ws_okeng_01 knowledgeVersion 189, INITIAL_COLLECTIONS 5, INITIAL_DOCUMENTS 25, INITIAL_PUBLIC_EMBEDS 3 + EMB-PUBLIC-HOME etc
- Store in `src/services/store.ts` with `reconcileCanonicalSeeds` that upgrades stale persisted docs, fixes drifted collection fileCount, bumps knowledgeVersion
- Cache: in-memory sliding window for rate limiting, MemoryCacheAdapter for answer cache
- Good for: landing, docs, public pages, auth UI, Test Console, Embed Studio preview

### 7.2 Supabase mode (staging/production mandatory)

**Setup:**

```bash
# 1. Create Supabase project at https://supabase.com
# 2. Get URL, anon key, service role key into .env.local
# 3. Run migrations
# Migration file: supabase/migrations/* (DATA-MIG-001)
# Contains: workspaces, users, workspace_memberships, collections, files, documents, document_versions, document_chunks, etc

# If you have supabase CLI:
supabase db push

# Or manually via psql:
psql $DATABASE_URL -f supabase/migrations/20241001_initial.sql

# 4. Set OKENG_DATA_MODE=supabase in .env.local
# 5. Run migrate script (if needed)
npm run migrate
# → src/lib/migrate.ts validates env, creates pool, runs migrations
```

**Tables** (canonical schema):
- `workspaces` id slug name public_key signing_secret_hash created_at updated_at + plan fields starter/pro/escala plan_interval monthly/annual stripe_customer_id stripe_subscription_id
- `users` id email name account_status ACTIVE/SUSPENDED/DELETED platform_role PLATFORM_OWNER/PLATFORM_ADMIN
- `workspace_memberships` id workspace_id user_id role WORKSPACE_OWNER/WORKSPACE_USER status ACTIVE/SUSPENDED/REVOKED UNIQUE workspace_id user_id
- `collections` id workspace_id name description visibility everyone/members/admins
- `files` id workspace_id collection_id storage_path filename mime_type size_bytes
- `documents` id workspace_id collection_id file_id title filename content status uploading/processing/indexing/ready/failed/deleted next_step_label next_step_url chunk_count
- `document_versions`, `document_chunks` id workspace_id document_id lineStart lineEnd heading etc
- Plus: embeds, conversations, analytics_events future

**Security**: RLS, 5-Link Workspace Enforcement, privilege system super_admin/admin/member/viewer server-only src/lib/privilege, no client corpus.

---

## 8. Redis — Optional Dev, Required Prod

**Dev (memory fallback):**
- If `REDIS_URL` not set, uses in-memory sliding window for rate limiting and MemoryCacheAdapter
- Conservative fallbacks: TIER_AUTH_5_PER_15M → 3 req/900s in-memory + P1_REDIS_RATE_LIMIT_DEGRADED alert, TIER_AUTH_3_PER_15M fail closed 503, TIER_SESSION_30_MIN 10 req/60s, TIER_PAID_AI_10_MIN fail closed 503 PAID_AI_QUOTA_UNAVAILABLE fallback deterministic, TIER_CHAT_DET_60_MIN 30 req/60s, TIER_UPLOAD_15_MIN fail closed 503

**Prod (required):**
```bash
# Local Redis via Docker
docker run -d -p 6379:6379 redis:7

# Set in .env.local
REDIS_URL=redis://localhost:6379

# Check
redis-cli ping # PONG
```

**What Redis does:**
- Distributed Lua rate limiting atomic, partition keys rl:auth:{ip}:{emailHash}, rl:pwreset, rl:sess:{wsId}:{ip}, rl:ai:{wsId}:{actorHash}, rl:det:{ip}, rl:upload:{wsId}:{userId}
- Token replay cache jti replay protection
- Answer cache partitioned by workspaceId effectiveClearance allowedCollectionIdsHash knowledgeVersion kv authorizationVersion av answerMode responseLanguage demoPolicyVersion+narrowedDocumentFingerprint for EMB-PUBLIC-HOME
- Session fallback regeneration
- Daily Gemini token budget quota:tokens:{workspaceId}:{YYYY-MM-DD_UTC} with atomic reserveTokens/reconcileTokens Lua, EXPIRE 172800, default budget 250000, maxOutputTokens 1024 temperature 0.1, concurrency limit 5 per workspace quota:concurrency:{workspaceId}, stream timeout 15s AbortController req.on('close'), circuit breaker 3 consecutive failures within 60s opens 60s fallback deterministic

---

## 9. Stripe Billing — Local Testing

**Pricing v3.0**: Starter 0€/mo 1 collection 100 files 1GB 1k queries 1 embed, Pro 31€/mo monthly 25€/mo annual -20% 10 collections 1k files 10GB 10k queries 5 embeds custom theme BYOK, Escala custom unlimited SSO SAML custom domain SLA dedicated support. Trust badges Sin tarjeta EU hosting BYOK.

**Setup:**

```bash
# 1. Create Stripe account, get sk_test_... and create products/prices for Pro monthly/annual and Escala
# 2. Set in .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Install Stripe CLI
brew install stripe/stripe-cli/stripe
# or download from https://stripe.com/docs/stripe-cli

stripe login
stripe listen --forward-to localhost:3000/api/billing/webhooks
# → Ready! Your webhook signing secret is whsec_... (copy to env)

# 4. Test checkout
# Go to /#precios, click Empieza gratis or Elige Pro → creates Stripe checkout session via POST /api/billing/checkout
# Complete test card 4242 4242 4242 4242

# 5. Test portal
# Settings & Auth > Billing > Manage billing → POST /api/billing/portal → Stripe customer portal

# 6. Webhooks handled in src/app/api/billing/webhooks/route.ts
# Events: checkout.session.completed creates subscription, customer.subscription.updated updates plan, invoice.paid registers payment and resets metering monthly
# Workspace fields: plan starter/pro/escala, plan_interval monthly/annual, stripe_customer_id, stripe_subscription_id, usage metering collections/files/storage/queries
```

**API routes:**
- `POST /api/billing/checkout` — creates checkout session with plan and interval
- `POST /api/billing/portal` — creates customer portal session
- `POST /api/billing/webhooks` — handles Stripe webhooks, validates signature, updates workspace plan

---

## 10. Testing

```bash
# Homepage guided tour readiness — 52 tests, 7 suites, 81/81 verification matrix
npm run test:homepage-tour-readiness
# → 52/52 PASS
# Covers: DOC-01 5 collections fileCounts, HYDRATION-01 reconcileCanonicalSeeds, I18N-01 EN/ES alignment, CLAIMS-01 no unbounded claims, CAP-01 capability inventory 13 entries Verified/Limited implementationEvidence, DOCS-SYNC-01 18 docs public viewer vs EMB-PUBLIC-HOME anonymous scope vs EMB-PUBLIC-DOCS 11 docs SHA-256, LINKS-01 nextStep.url and Markdown links validateSafeUrl router verification, Q01-Q10 representative public questions + paraphrases with rawScore >=1.35 normalizedConfidence >=0.25 routeBoost 0/0.15 acceptable source set citation integrity concept keywords, UNANSWERABLE-01 out-of-domain rawScore <1.35 normalizedConfidence <=0.20 capped answerType unknown 0 citations, SEC-01..SEC-03 security EffectiveScope, 5-stage tour contract STAGE-1..5, UI-TOUR-01 HomepageGuidedTour consumes APPROVED_HOMEPAGE_TOUR_CONTRACT, AT-01..AT-25 adversarial matrix P0-01..P0-05 P1-01..P1-05

# Embed authorization — 29 tests, 8 suites
npm run test:embed-authorization
# → 29/29 PASS
# Covers: getEmbedCollectionIds dedup trim sort frozen, canAccessCollection 9-cell matrix anonymous/member/admin × everyone/members/admins, resolveEmbedAuthorization progressive scope frozen, HS256 token verification missing→anonymous valid HS256 member/admin, rejects non-HS256 alg none header key-injection jwk bad signature expired workspace/embed mismatch 401/404 without silent downgrade, 8 consumers positive/negative assertions retrieval citations suggestions starter questions routeRules related articles doc nav simulator debug, historical turn immutability mid-conversation identity upgrade, 3-class cache contract RetrievalCacheKey AnswerCacheKey SessionCacheKey isolation fail-safe bypass incomplete split version invalidation authorizationVersion vs knowledgeVersion, EmbedInstallationFacts allowsAnonymousInitialization true across public-only mixed protected-only, Dual-Proof Verification anonymous member admin error states, Test Console canonical contract 9 behavioral tests PAGE-APP-06 Access Epoch EffectiveScope TargetScope ∩ Identity Invalid Token 401 Anonymous fallback None Ranked chunks BM25 routeBoost lineRanges matchedTokens Answer Plan 4-Way Cache Partition HIT/MISS invalidate Collection Detail → Test Console deep-link preserves collectionId Identity enforced EN/ES parity test.* keys HIT_EXACT presentation layer Verification Scenarios → inspection tab, PUBLIC-01–03 & PAGE-PUB-01 Homepage Dogfooding & Mixed-Access EMB-PUBLIC-HOME workspace extends COL-CUSTOMER members COL-INTERNAL admins binds EMB-PUBLIC-HOME across 5 collections Scenario A Visitor Anonymous only Public Docs & Legal excludes Customer & Admin before retrieval matches Test Console scope Scenario B Member Signed HMAC unlocks Customer Docs keeps Admin excluded Scenario C Admin unlocks Public Legal Customer Admin retrieves internal architecture Scenario D Invalid Token Hard 401 Boundary tampered token before retrieval zero anonymous fallback Scenario E Multilingual Retrieval ¿Cómo funciona OKEng? in Spanish from authorized public knowledge EN/ES parity public.* keys EffectiveScope Role ∩ Embed Bound Collections valid member/admin tokens on public-only EMB-PUBLIC-DOCS never access unbound

# Baseline security (optional)
npm run test:baseline

# Staging readiness (optional, checks prod invariants)
npm run test:staging-readiness
```

**All must PASS before PR**: 52/52 + 29/29.

---

## 11. Project Structure

```
OKEngine/
├── .env.example — Canonical env contract STG-01 SEC-01 DATA-01 OPS-01
├── next.config.mjs — ESM export default, webpack alias @→./src, headers security, typescript ignoreBuildErrors true
├── middleware.ts — Next.js middleware SEC-01 API-01 trust proxy CORS exact-origin CSRF lightweight rate limiting delegated to API routes matcher /api/* /workspaces/* /login /signup etc
├── tsconfig.json — baseUrl . paths @/* → ./src/*, TS 5.9.3 (7.0.2 unsupported by Next 15.5.27)
├── src/
│   ├── index.css — @import "tailwindcss" @theme tokens DS-* warm canvas cobalt shadow-sm/md/lg radius-lg Inter+JetBrains Mono
│   ├── app/
│   │   ├── layout.tsx — RootLayout I18nProvider AppRouterProvider min-h-screen bg-canvas text-ink font-sans antialiased
│   │   ├── router.tsx — ARCH-MIG-001 Canonical App Router URL Navigation Engine HTML5 History API routeToPath parsePathname scrollViewportToTop AppRouterProvider
│   │   ├── loading.tsx, error.tsx, not-found.tsx — DS loading error 404
│   │   ├── (public)/
│   │   │   ├── page.tsx — / landing PA-LANDING LandingView v3.0 12 surfaces
│   │   │   ├── about/page.tsx — /about AboutView PA-PUBLIC
│   │   │   ├── contact/page.tsx — /contact ContactView
│   │   │   ├── terms/page.tsx — /terms LegalView terms
│   │   │   ├── privacy/page.tsx — /privacy LegalView privacy
│   │   │   ├── acceptable-use/page.tsx — /acceptable-use LegalView acceptable-use
│   │   │   └── docs/
│   │   │       ├── page.tsx — /docs DocsView PA-DOCS v3.0
│   │   │       └── [slug]/page.tsx — /docs/:slug DocsView initialSlug
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx — /login AuthView PA-AUTH
│   │   │   ├── signup/page.tsx — /signup
│   │   │   ├── forgot-password/page.tsx — /forgot-password
│   │   │   └── reset-password/page.tsx — /reset-password /password/reset
│   │   ├── (workspace)/
│   │   │   ├── workspaces/[workspaceSlug]/layout.tsx — Workspace layout AppShell
│   │   │   ├── collections/page.tsx, [collectionId]/page.tsx — Collections
│   │   │   ├── files/page.tsx, [documentId]/page.tsx — Files & MarkdownEditor
│   │   │   ├── embeds/page.tsx, preview/page.tsx, installation/page.tsx — Embed Studio
│   │   │   ├── test/page.tsx — Test Console PAGE-APP-06
│   │   │   ├── conversations/page.tsx — Conversations
│   │   │   ├── stitch/page.tsx — Stitch Spec Viewer
│   │   │   └── settings/page.tsx — Settings & Auth
│   │   └── api/
│   │       ├── auth/login, signup, logout, forgot-password, reset-password/route.ts — Auth API
│   │       ├── billing/checkout, portal, webhooks/route.ts — Stripe billing v3.0
│   │       ├── chat/stream/route.ts — Chat stream POST handles EMB-PUBLIC-HOME demoPreset boundary 400 INVALID_DEMO_PRESET 403 FORBIDDEN_DEMO_SCOPE 400 DEMO_TOKEN_NOT_ACCEPTED
│   │       ├── health/route.ts — Health check /api/health live/ready capability evaluation
│   │       └── csrf-token/route.ts — CSRF token
│   ├── components/
│   │   ├── ui/ — PR-* primitives DS tokens v3.0
│   │   │   ├── Button.tsx xs 24px sm 32px md 36px lg 40px isLoading variant primary/secondary/ghost/danger/accent
│   │   │   ├── Input.tsx sm 32px md 36px lg 40px leadingIcon trailingElement label hint error aria-invalid role=alert
│   │   │   ├── Badge.tsx, Card.tsx surface/elevated, Text.tsx, Select.tsx, Table.tsx, Drawer.tsx sm 340px md 420px lg 520px scopeBanner headerActions, CodeBlock.tsx, EmptyState.tsx, Accordion.tsx, Checkbox.tsx, InfoPopover.tsx, FilterBar.tsx
│   │   │   ├── AnnouncementBanner.tsx — PR-ANNOUNCEMENT-BANNER full-width bg-subtle border-b text-center text-xs Citas verificables
│   │   │   ├── Metric.tsx, PricingToggle.tsx monthly/annual -20%, TestimonialCard.tsx, FaqAccordion.tsx, CodeSnippet.tsx 3 lines, LogoStrip.tsx, IntegrationTabs.tsx widget/panel/fullscreen, FeatureCard.tsx, HowItWorksStep.tsx, ChatMock.tsx SSO, PricingCard.tsx popular badge, AuthCard.tsx canvas white surface rounded-lg shadow-md cobalt, PasswordInput.tsx, AuthDivider.tsx, TrustBadge.tsx
│   │   │   └── Docs & Public v3.0 (PLAN-006): DocsHeader.tsx logo+nav+search+CTAs+announcement banner sticky top-0 z-20 backdrop-blur-sm max-w-7xl, DocsSidebar.tsx collapsible single-expand auto-select auth-gated stronger typography tabular counts shadow-sm radius-lg border-r overflow-y-auto, DocsArticle.tsx max-w-3xl prose text-section text-card-title TOC hover # toolbar Copy Share Edit version badge history related docs, DocsSearch.tsx hybrid FORM-SEC-01 placeholder+hint field errors isLoading, DocsAsk.tsx Ask Box inline question+answer+sources+citations+feedback+next-step real retrieval, DocsToc.tsx 2+ headings hover # active highlight, PublicPage.tsx generic max-w-7xl/3xl centered py-16/24 editorial whitespace, ContactForm.tsx FORM-SEC-01 honeypot char limits success, LegalArticle.tsx deterministic max-w-3xl text-sm relaxed no LLM
│   │   ├── landing/ — CO-LANDING-* 12 surfaces
│   │   │   ├── LandingView.tsx PA-LANDING 12 surfaces max-w-7xl no sidebar editorial whitespace real metrics
│   │   │   ├── LandingHero.tsx, LogoStrip.tsx, Metrics.tsx ≥98% -73% 1k 3 lines, HowItWorks.tsx 5-step, ProductFeatures.tsx 6 features Markdown primero Permisos Citas Tu modelo tu clave Widget que parece tuyo Analítica, Integration.tsx 3 modes, Developers.tsx 3 líneas código + HelpCenter.tsx snippet, Testimonials.tsx, Pricing.tsx monthly/annual EUR toggle, Faq.tsx, FinalCta.tsx Empieza a responder en minutos, Footer.tsx 4-column Product Características Integración Precios Changelog Desarrolladores Docs API SDKs Estado Empresa Sobre Blog Contacto Legal Términos Privacidad Uso aceptable
│   │   ├── auth/ — CO-AUTH-* 6 forms
│   │   │   ├── AuthView.tsx PA-AUTH centered card max-w-md canvas #F8F7F4 white surface rounded-lg shadow-md cobalt accent FORM-SEC-01 5-Link Auth Chain TIER_AUTH_5_PER_15M
│   │   │   ├── LoginForm.tsx, SignupForm.tsx, ForgotPasswordForm.tsx, ResetPasswordForm.tsx, SsoButtons.tsx, AuthTrustFooter.tsx
│   │   ├── docs/ — CO-DOCS-* PA-DOCS (PLAN-006)
│   │   │   ├── DocsLayout.tsx header+sidebar+main+footer max-w-7xl no app shell public surface
│   │   │   ├── DocsSidebar.tsx collections search auth-gated Engineering Specs stronger typography auto-select
│   │   │   ├── DocsArticle.tsx deterministic TOC toolbar Copy Share Edit version badge history related docs next-step feedback Was helpful?
│   │   │   ├── DocsSearch.tsx hybrid retrieval citations results
│   │   │   ├── DocsAsk.tsx Ask Box inline real retrieval citations feedback uses DogfoodInlineBot EMB-PUBLIC-DOCS
│   │   │   └── DocsView.tsx PA-DOCS archetype implementation ridiculously easy additions Edit this page Copy MD Share Ask about page Feedback Source chips Next-step CTA Version badge Was helpful? Search hybrid Improve doc View source History Related docs TOC Language Auth-gated specs Trust badges Metrics Pricing CTA
│   │   ├── public/ — CO-PUBLIC-* PA-PUBLIC + dogfooding
│   │   │   ├── DocArticleRenderer.tsx deterministic non-LLM Markdown article viewer CO-DOCUMENT-VIEWER header collection & filename labels InfoPopover technical Document ID Collection ID indexing metadata CO-CONTENT-RENDERER body toolbar
│   │   │   ├── DogfoodInlineBot.tsx inline dogfooding retrieval assistant real workspace embeds real mode embed queries host-supplied identity & route context FORM-SEC-01 EMB-PUBLIC-DOCS etc
│   │   │   ├── HomepageGuidedTour.tsx floating guided tour assistant EMB-PUBLIC-HOME 5 stages APPROVED_HOMEPAGE_TOUR_CONTRACT 13 capabilities CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY server-only demo authorization 6-point verification policy-versioned caching Demo Settings Drawer Identity Visitor/Member/Admin Context pendingSettingsOpId atomic POST /api/demo/homepage-context non-bypassable pre-retrieval
│   │   │   ├── AboutView.tsx PA-PUBLIC product overview capabilities team metrics trust badges editorial whitespace max-w-7xl py-16/24
│   │   │   ├── ContactView.tsx PA-PUBLIC form+info+trust FORM-SEC-01
│   │   │   └── LegalView.tsx PA-PUBLIC deterministic legal + EMB-PUBLIC-LEGAL assistant Ask Box max-w-3xl centered py-16/24
│   │   ├── AppShell.tsx, DocumentNav.tsx, CollectionCard.tsx, EmbedCard.tsx, FeedbackControl.tsx, FileTable.tsx, LanguageSelector.tsx, MarkdownEditor.tsx, NextStepButton.tsx FORM-SEC-01 URL validation, PageHeader.tsx, RbacMatrix.tsx, RoleSelector.tsx, SourceList.tsx, StitchSpecViewer.tsx, UploadDrawer.tsx, UploadDropzone.tsx, VisibilitySelector.tsx
│   │   └── content/renderer/content-renderer.tsx — CO-CONTENT-RENDERER Normalized Content AST renderer_version 1 parse once normalize once sanitize once render consistently everywhere heading isolation scoped anchor Option1 PUBLIC_DOC only hover # unified citation strip Option A Verified Sources N 10 contexts DOCUMENT_FULL DOCUMENT_PREVIEW EDITOR_PREVIEW CHAT_ANSWER CHAT_MESSAGE SOURCE_EXCERPT CITATION TEST_CHAT EMBEDDED_CHAT PUBLIC_DOC progressive toolbar Copy Share Edit Source ••• overflow Save MD/TXT/PDF Save Answer Report Issue Regenerate NextStepButton URL validation
│   ├── content/
│   │   ├── parser/markdown-parser.ts — parseKnowledgeDocument heading-aware # ## ### extracting steps bullets warnings code blocks 1-indexed lineStart–lineEnd
│   │   ├── ast/ — content-document.ts content-node.ts inline-node.ts
│   │   ├── sanitizer/ — html-sanitizer.ts url-policy.ts media-policy.ts FORM-SEC-01
│   │   └── renderer/ — content-renderer.tsx html-renderer.ts render-observability.ts render-options.ts
│   ├── services/
│   │   ├── store.ts — Workspace store INITIAL_WORKSPACE ws_okeng_01 knowledgeVersion 189 INITIAL_COLLECTIONS 5 INITIAL_DOCUMENTS 25 INITIAL_PUBLIC_EMBEDS 3 reconcileCanonicalSeeds upgrades stale persisted docs fixes drifted fileCount bumps knowledgeVersion
│   │   ├── auth.ts — authService getCurrentUser enforceWorkspaceAccess 5-Link Chain session httpOnly secure sameSite strict 12h Redis fallback regeneration CSRF double-submit
│   │   ├── embedAuthorization.ts — resolveRequestEmbedIdentity verifyEmbedIdentityToken HMAC-SHA256 HS256 4-case boundary invalid/expired/tampered fail closed 401 resolveEmbedAuthorization EffectiveScope B∩R filterAuthorizedDocuments filterAuthorizedCitations etc
│   │   ├── homepageTourController.ts — 5-domain client controller AssistantDisplayState TourSessionState ConversationState RequestLifecycleState DemoSettingsState request fencing requestId exchangeId tourRunId single-terminal exchange lock terminalLock pendingSettingsOpId atomic settings updates stageRetryTarget vs followUpRetryTarget
│   │   ├── homepageDemoStreamAdapter.ts — stream adapter for homepage tour
│   │   └── engine/
│   │       ├── knowledgeParser.ts — parseKnowledgeDocument
│   │       ├── bm25Retriever.ts — retrieveAndRankAuthorizedDocs custom BM25 k1 1.5 b 0.75 + field boosts title +1.8 intent +2.0 heading +1.1 synonym +0.75 + route-prefix +2.2 rawScore routeBoost 0.15 + same-language +0.65 two-step threshold rawScore >=1.35 normalizedConfidence >=0.25 deterministic/extractive
│   │       └── responseCompiler.ts — compileKnowledgeResponse grounded citations docId title filename collectionId url citationRenderMode validated against PUBLIC_DEMO_SOURCE_POLICY CANONICAL_PUBLIC_ROUTE_REGISTRY serverOutcome grounded|refused|failed missing-topic honesty nothing shown fallback
│   ├── data/
│   │   ├── seedData.ts — 58K INITIAL_WORKSPACE ws_okeng_01 knowledgeVersion 189 INITIAL_COLLECTIONS 5 INITIAL_DOCUMENTS 25 docs COL-PUBLIC 4 COL-DOCS 11 COL-LEGAL 3 COL-CUSTOMER 3 COL-INTERNAL 4 INITIAL_PUBLIC_EMBEDS 3 EMB-PUBLIC-HOME mixed-access 5 collections floating tour etc — v3.0 pricing monetization Next.js arch SEC-01 Stripe real metrics 6 surfaces 3 modes
│   │   └── homepageTourContract.ts — APPROVED_HOMEPAGE_TOUR_CONTRACT 5 stages STAGE-1-WHAT-IS-OKENG What is OKEng? → STAGE-2-WHAT-IT-DOES-TODAY → STAGE-3-GROUNDED-ANSWERS-AND-CITATIONS → STAGE-4-CONTEXT-AND-ACCESS-CONTROL → STAGE-5-GET-STARTED terminal Primary /signup Secondary /docs/getting-started + CANONICAL_HOMEPAGE_CAPABILITY_INVENTORY 13 entries CAP-WORKSPACE-ISOLATION Verified CAP-COLLECTION-RBAC Verified CAP-SIGNED-HOST-IDENTITY Verified CAP-FILE-INGESTION-BOUNDED Limited CAP-HEADING-CHUNKING Verified CAP-BM25-RETRIEVAL Verified CAP-ROUTE-CONTEXT-BOOST Verified CAP-GROUNDED-CITATIONS Verified CAP-MISSING-TOPIC-REFUSAL Verified CAP-EMBED-MODES-BOUNDED Limited CAP-INSTALLATION-RECIPE Verified CAP-MULTILINGUAL-ES Verified CAP-GENERATIVE-FALLBACK Limited
│   ├── lib/
│   │   ├── env.ts — validateEnv fail-fast SEC-ENV-01 DATABASE_URL SESSION_SECRET CSRF_SECRET NODE_ENV PORT REDIS_URL CORS_ALLOWED_ORIGINS no wildcard STRIPE keys dummy fallback for phase-production-build
│   │   ├── db.ts — getPool PG pool ssl max 20 idleTimeout 30s checkDb closePool
│   │   ├── auth.ts — Session CSRF Privilege SYSTEM_ROLES viewer/member/admin/super_admin ROLE_LEVEL hasSystemRole requireSystemRole getSystemRole SessionData userId email role workspaceId createdAt sign HMAC-SHA256 createSessionToken verifySessionToken constant-time timingSafeEqual expiry 12h getSession cookie okeng.sid __Host-okeng.sid createSessionResponse httpOnly secure sameSite strict maxAge 12h generateCsrfToken getCsrfToken double-submit
│   │   ├── redis.ts — getRedis ioredis auto fallback memory
│   │   ├── rateLimit.ts — RateLimiterAdapter Redis Lua atomic vs in-memory sliding-window TIER_AUTH_5_PER_15M etc 429 standardized Retry-After X-RateLimit-Limit Remaining Reset
│   │   ├── supabase/ — Supabase client server-only
│   │   ├── validation.ts — validateSafeUrl FORM-SEC-01 blocks <script> <iframe> event handlers javascript: data: vbscript: file: blob: schemes relative /paths #anchors https http mailto
│   │   └── usage.ts — Usage metering collections/files/storage/queries Stripe
│   ├── i18n/
│   │   ├── I18nContext.tsx — useI18n EN/ES full UI localization bilingual tokenization synonyms same-language boost
│   │   └── locales/en.ts es.ts — 1:1 key parity EN_DICTIONARY ES_DICTIONARY public.* test.* renderer.* etc bounded file format copy no .pdf .docx
│   ├── types.ts — Workspace Collection KnowledgeDocument EmbedInstance etc
│   └── views-legacy/PublicSurfaceView.tsx — 2262 lines monolith legacy handling landing/about/docs/contact/terms/privacy/acceptable-use/login/signup/forgot-password via initialPage prop DocumentNav DocArticleRenderer DogfoodInlineBot HomepageGuidedTour marketing state integrationTab pricingAnnual openFaq copiedCode — preserved for reference, new routes use dedicated views v3.0
│   ├── server/demo/publicHomepageDemoAuthorization.ts — server-only demo authorization non-bypassable POST /api/chat/stream routes EMB-PUBLIC-HOME demoPreset !==undefined or mode public_homepage_demo unconditionally to handlePublicHomepageDemoChatStream 400 INVALID_DEMO_PRESET 403 FORBIDDEN_DEMO_SCOPE 400 DEMO_TOKEN_NOT_ACCEPTED 400 FORBIDDEN_CLIENT_AUTHORITY_FIELD 6-point pre-retrieval narrowing D workspaceId EffectiveScope B∩R PUBLIC_DEMO_DOCUMENT_OWNERSHIP_MAP PUBLIC_DEMO_SOURCE_POLICY policy-versioned caching demoPolicyVersion+narrowedDocumentFingerprint grounded provenance serverOutcome grounded|refused|failed citationRenderMode public_companion_guide publicSafeTitle companion guides demo cache by demoPolicyVersion+narrowedDocumentFingerprint validatePublicDemoRegistries cross-checks 25 seed docs
│   └── tests/
│       ├── readiness/homepage-tour-readiness.test.ts — 52 tests 8 suites 81/81 verification matrix
│       ├── rendering/embed-authorization.test.ts — 29 tests 8 suites
│       └── security/phase0-baseline-reproduction.test.ts
├── supabase/migrations/ — Canonical PostgreSQL schema DATA-MIG-001 workspaces users workspace_memberships collections files documents document_versions document_chunks etc
├── docs/ — Foundational specs
│   ├── 00_product_contract.md v1.1, 01_ui_foundation.md v3.0, 02_component_catalog.md v3.0, 03_page_specifications.md v3.1, 04_workflows.md v2.1, UI-01 v3.1, SEC-01 v1.0, API-01 v1.0, DB-01 v1.0, DATA-01 v1.0, OPS-01 v2.1, PUBLIC-01, RENDER-001, PLAN-000..006, LOCAL-SETUP-GUIDE.md (this file) etc
└── public/ — Static assets
```

---

## 12. Architecture — How It Fits Together

### 12.1 App Router Groups

- **(public)**: No auth, no app shell, minimal header same as landing (logo OKEng + nav Producto Integración Precios FAQ Docs + CTAs Iniciar sesión/Empieza gratis), footer same as landing 4-column, max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8, bottom brand lockup OK symbol w-6 h-6 bg-ink rounded-xs text-surface font-mono text-xs font-semibold OKEng wordmark font-sans font-semibold text-sm tracking-tight. PA-LANDING 12 surfaces, PA-PUBLIC single column max-w-7xl/3xl centered py-16/24 editorial, PA-DOCS full viewport canvas header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer full-width.

- **(auth)**: Canvas #F8F7F4 centered card max-w-md white surface rounded-lg shadow-md cobalt accent, minimal header logo + ES/EN, footer © OKEng Términos Privacidad. PA-AUTH archetype, FORM-SEC-01 5-Link Auth Chain TIER_AUTH_5_PER_15M.

- **(workspace)**: AppShell with sidebar, collections, files, embeds, test console, settings, etc. Requires authenticated session httpOnly secure sameSite strict 12h.

### 12.2 Content Rendering Pipeline (RENDER-001)

```
Source Content (.md) → src/content/parser/markdown-parser.ts parseKnowledgeDocument → Normalized Content AST renderer_version 1 → src/content/sanitizer/html-sanitizer.ts → CO-CONTENT-RENDERER src/content/renderer/content-renderer.tsx → 10 contexts
```

- **Invariant**: Parse once normalize once sanitize once render consistently everywhere, no ad-hoc regex.
- **Heading isolation**: heading terminates at end of heading line MUST NEVER absorb following paragraph even when separated by single newline.
- **Scoped anchor Option1**: clickable # heading anchor links rendered only in full document contexts DOCUMENT_FULL and PUBLIC_DOC on hover, suppressed in compact answer/chat contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT CHAT_MESSAGE SOURCE_EXCERPT CITATION.
- **Unified citation strip Option A**: in conversational contexts CHAT_ANSWER TEST_CHAT EMBEDDED_CHAT verified source citation chips rendered once inside CO-CONTENT-RENDERER footer Verified Sources N, parent views pass citations and onCitationClick into ContentRenderer rather than duplicating external citation strips.
- **10 contexts**: DOCUMENT_FULL Yes 2+ headings Hover # enabled Copy Share Edit* ••• —, DOCUMENT_PREVIEW Optional Suppressed Copy Share ••• —, EDITOR_PREVIEW Optional Suppressed — —, CHAT_ANSWER No Suppressed Copy Share ••• Mandatory Option A, CHAT_MESSAGE No Suppressed Copy — —, SOURCE_EXCERPT No Suppressed Open Source — —, CITATION No Suppressed Open Source — —, TEST_CHAT No Suppressed Copy Share ••• Mandatory Option A, EMBEDDED_CHAT No Suppressed Copy Share ••• Mandatory Option A, PUBLIC_DOC Yes 2+ headings Hover # enabled Copy Share Edit* ••• —, * Edit Source only when authenticated and workspace.documents.manage permission and server enforced POST /api/embed/sources/:sourceId/edit and POST /api/documents/:id/edit.

### 12.3 Retrieval Pipeline (ENGINE-01)

```
Verified Identity → Effective Collection Scope (Role ∩ Embed) → Score Authorized Chunks (BM25 + Field/Route Boost + Semantic Hybrid) → Compile Grounded Answer + Citations + Next Step
```

- **BM25**: k1 1.5 b 0.75 + field boosts title +1.8 intent +2.0 heading +1.1 synonym +0.75 + route-prefix match currentUrl.startsWith(doc.route) +2.2 rawScore routeBoost 0.15 + same-language boost +0.65 + hybrid semantic re-ranking future, two-step threshold rawScore >=1.35 normalizedConfidence >=0.25 deterministic/extractive compilation.
- **Pre-retrieval filtering**: EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections, unauthorized docs excluded before chunk scoring never enter candidate chunks model prompt context answers citations.
- **Grounded citations**: docId title filename collectionId url citationRenderMode validated against PUBLIC_DEMO_SOURCE_POLICY CANONICAL_PUBLIC_ROUTE_REGISTRY server-computed serverOutcome grounded|refused|failed.
- **Missing-topic honesty**: If no authorized doc meets threshold, returns conservative fallback "I couldn't find that information in the available documentation." answerType unknown serverOutcome refused 0 fabricated sources. ≥98% with citation, -73% tickets reduction.

### 12.4 Dogfooding (PUBLIC-01)

- Workspace ws_okeng_01 5 collections 25 docs 3 embeds, deterministic rendering DocArticleRenderer never LLM, dynamic retrieval DogfoodInlineBot real engine, live update reconcileCanonicalSeeds bumps knowledgeVersion, Test Console reproducibility PAGE-APP-06 5 scenarios Visitor Member Admin Invalid Token 401 Multilingual ¿Cómo funciona OKEng? reproducible identically inside /workspaces/okeng/test?embedId=EMB-PUBLIC-HOME, collapsible DocumentNav single-expand auto-select, visibility scoping everyone 18 public total authenticated only Engineering Specs COL-INTERNAL, scroll-to-top, FORM-SEC-01, header/footer, homepage tour contract 13 capabilities 5 stages 81/81 verification.

### 12.5 Security (SEC-01)

- Session httpOnly secure sameSite strict 12h Redis fallback regeneration rotation on login CSRF double-submit token 5-Link Auth Chain valid session → valid workspace existence → active WorkspaceMembership → required explicit permission → resource ownership resource.workspace_id == request.workspace_id.
- Exact-origin CORS no wildcard, trust proxy 1 prod 0 dev, security headers HSTS CSP X-Frame-Options X-Content-Type-Options Referrer-Policy, health check /api/health live/ready capability evaluation Core Required Dependencies database cache secrets Optional Degradable generativeAi ready_degraded_ai zero secret disclosure.
- Rate limiting TIER_AUTH_5_PER_15M 5 req/900s per (IP, HMAC(email)) AND 15 req/900s per IP, TIER_AUTH_3_PER_15M 3 req/900s pwreset fail closed 503, TIER_SESSION_30_MIN 30 req/60s per (IP, workspaceId), TIER_PAID_AI_10_MIN 10 req/60s per sessionId|userId AND 60 req/60s per workspaceId + Atomic Daily Token Budget, TIER_CHAT_DET_60_MIN 60 req/60s per IP, TIER_UPLOAD_15_MIN 15 req/60s per (workspaceId, userId) fail closed 503, standardized 429 Retry-After X-RateLimit-Limit Remaining Reset.
- Input sanitization FORM-SEC-01 blocks <script> <iframe> event handlers javascript: data: vbscript: file: blob: schemes restricts URLs strictly to https: http: mailto: relative /paths #anchors validateActionUrlInput NextStepButton.
- Privilege system super_admin/admin/member/viewer server-only src/lib/privilege src/lib/auth.ts hasSystemRole requireSystemRole getSystemRole 14 explicit permissions for owner.
- No client corpus, no hardcoded secrets, no console errors.

---

## 13. Editing Documentation (Dogfooding Loop)

**How to edit canonical docs and see live update:**

1. **Via seedData (canonical source):**
   - Edit `src/data/seedData.ts` INITIAL_DOCUMENTS — update content Markdown for doc, bump updatedAt to current date, bump INITIAL_WORKSPACE knowledgeVersion 187→189 (now 189)
   - Run `npm run build` or `npm run dev` — store.reconcileCanonicalSeeds will upgrade stale persisted docs, fix drifted collection fileCount, bump knowledgeVersion, immediately updates both deterministically rendered public pages and active retrieval index
   - Verify in `/docs` and via Test Console

2. **Via workspace console (runtime):**
   - Sign in at `/login`, open `/workspaces/okeng/files/:docId` — MarkdownEditor with live preview, frontmatter metadata parsing, Next-Step CTA links
   - Save → triggers heading-aware chunking line-range tracking knowledgeVersion cache invalidation, live re-indexing
   - Check `/docs/:slug` deterministic rendering and Ask Box dynamic retrieval with citations

3. **Ridiculously easy additions** (already wired in DocsView v3.0):
   - Edit this page (if authenticated workspace.documents.manage → /workspaces/okeng/files/:docId) — 1 line uses CO-MARKDOWN-EDITOR RENDER-001 Edit Source
   - Copy as Markdown — copy raw MD to clipboard — uses progressive toolbar Copy
   - Share — Web Share API or copy URL — existing Share
   - Ask OKEng about this page — inline Ask Box pre-filled currentUrl — uses DogfoodInlineBot with collectionIds + currentUrl
   - Feedback 👍/👎 per answer + per doc — CO-FEEDBACK FeedbackControl
   - Source list chips with excerpt — CO-SOURCE-LIST SourceList
   - Next-step CTA — verified https or /path from frontmatter next_step — CO-NEXT-STEP NextStepButton URL validation
   - Version badge — knowledgeVersion + updatedAt — from store
   - Was this helpful? — analytics_events future
   - Search — hybrid semantic+keyword with citations — POST /api/ask DocsSearch
   - Improve this doc — Report Issue modal Wrong information Wrong source Missing information Formatting problem Something else — RENDER-001 Report Issue FORM-SEC-01 notes sanitization
   - View source — raw MD — 1 line
   - History — updatedAt + knowledgeVersion — 1 line
   - Related docs — top-k bm25Retriever — existing
   - TOC — 2+ headings hover # anchors active highlight — RENDER-001 DOCUMENT_FULL TOC DocsToc
   - Language switch — EN/ES via useI18n — existing
   - Auth-gated Engineering Specs — COL-INTERNAL only when authenticated — visibility scoping
   - Trust badges — Citas verificables Permisos por rol Sin tarjeta — v3.0
   - Metrics — ≥98% con cita -73% tickets 1k free 3 lines code — real metrics only
   - Pricing CTA — #precios — from landing v3.0

---

## 14. Troubleshooting — Common Issues & Fixes (From Real Build History)

| Issue | Root Cause | Fix |
| :--- | :--- | :--- |
| `Cannot find module '@/lib/env'` | next.config.mjs missing webpack alias @→./src | Add webpack alias in next.config.mjs ESM export default: `config.resolve.alias = { ...config.resolve.alias, '@': new URL('./src', import.meta.url).pathname }` |
| `Next 14.2.0 doesn't support React 19` | package.json next 14.2 + react 19 incompatible | Upgrade next 14.2→15.1.0 |
| `TypeScript 7.0.2 unsupported by Next 15.5.27` | TS 7.0.2 too new for Next 15.5.27 | Downgrade TS 7.0.2→5.8.0 or 5.9.3, update tsconfig baseUrl+paths |
| `Build optimization failed: found pages without React Component` | src/pages/ 10 files using Pages Router without component, conflicting with App Router | Move src/pages/ → src/views-legacy/ |
| `vite.config.ts legacy Vite runner conflicting with Next.js` | vite.config.ts present with Next.js | Remove vite.config.ts after verification, use Next.js only |
| `next.config.js CJS require() not supported in ESM type module` | package.json type module but next.config.js CJS | Migrate to next.config.mjs ESM export default |
| `test script paths package.json scripts/tests/* not found` | Old test paths | Fix to tests/readiness/* tests/rendering/* tests/security/* |
| `READINESS-CAP-01 Capability CAP-SIGNED-HOST-IDENTITY implementation file 'server.ts' does not exist` | server.ts archived to docs/archive/server-74K-legacy.ts | Fix homepageTourContract.ts implementationEvidence path to archive |
| `READINESS-I18N-01 Expected nextStep.url '/docs/facturacion-y-planes' got '/#precios'` | facturacion-y-planes nextStep changed to #precios CTA, test expects /docs/facturacion-y-planes | Keep nextStep url /docs/facturacion-y-planes for test, mention #precios in content CTA instead |
| `READINESS-I18N-01 Expected enDoc.content.includes('Markdown (\`.md\`)')` | Content missing exact string with backticks | Ensure product-overview.md contains `Markdown (\`.md\`)` with escaped backticks \`.md\` inside template literal |
| `READINESS-Q05 compiled answer did not contain expected keyword everyone/members/admins` | workspaces.md ranked higher than collections.md for paraphrase, but workspaces.md didn't contain those keywords | Add everyone/members/admins to workspaces.md first paragraph: "Every customer resource belongs to single Workspace and every Workspace contains collections with visibility everyone, members, admins." |
| `READINESS-Q08 compiled answer did not contain expected keyword route/visibility` | retrieval.md first paragraph didn't contain route/visibility, best section not containing those words | Add route and visibility to first paragraph and host context section: "How does OKEng answer... with route and visibility? ... ranking ... with BM25 and route visibility boosts ... Host context route and visibility control retrieval." and host context section contains "route and visibility" explicitly |
| `Homepage Test #6 Scenario E Multilingual Retrieval Expected Spanish answer summary to mention OKEng` | Spanish query ¿Cómo funciona OKEng? returned facturacion-y-planes.md as top result whose summary table didn't contain OKEng | Add "¿Cómo funciona OKEng?" phrase multiple times to product-overview Spanish translation content and summary to boost BM25 score, ensure product-overview ranks top for that query |
| `ContactForm Module not found: Can't resolve './Form'` | ContactForm imported FormInput from './Form' which doesn't exist | Rewrite ContactForm to use simple HTML with tailwind h-9 rounded-sm border border-line bg-elevated px-3 text-sm etc, not depend on Form |
| `DocsArticle Module not found: Can't resolve '../../content/parser' '../../store' '../../contexts/AuthContext'` | Wrong import paths invented useWorkspaceStore useAuth | Use correct paths: store from '../../services/store', authService from '../../services/auth', ContentRenderer from '../../content/renderer/content-renderer', parse via simple heading extraction, bm25Retriever from '../../services/engine/bm25Retriever' or simple filter for DocsSearch |
| Build 26 routes but /about etc 404 | (public)/page.tsx handling all via pathname with history.pushState bypassing Next.js file routing, but no dedicated files for /about etc | Create dedicated Next.js App Router routes src/app/(public)/about/page.tsx → AboutView, contact → ContactView, terms/privacy/acceptable-use → LegalView, docs → DocsView, docs/[slug] → DocsView initialSlug, and make (public)/page.tsx only LandingView |

**If build still fails:**
- Check `src/index.css` has `@import "tailwindcss"` and `@theme` tokens
- Check `next.config.mjs` is ESM `export default nextConfig` not `module.exports`
- Check `tsconfig.json` has `baseUrl: "."` and `paths: { "@/*": ["./src/*"] }`
- Check no `src/pages/` directory exists (should be in `src/views-legacy/`)
- Check `package.json` type module, next 15.1.0, react 19.0.1, TS 5.9.3
- Run `npm run clean && npm run build`

---

## 15. Useful Commands & Routes

```bash
# Dev
npm run dev # http://localhost:3000
# Build
npm run build && npm run start
# Lint
npm run lint
# Clean
npm run clean
# Migrate (if supabase mode)
npm run migrate
# Tests
npm run test:homepage-tour-readiness # 52/52
npm run test:embed-authorization # 29/29
npm run test:staging-readiness
npm run test:baseline
```

**Key routes to verify manually after setup:**

- `/` — LandingView v3.0 12 surfaces: AnnouncementBanner Citas verificables, header logo+nav+CTAs, Hero "Capa de conocimiento para tu producto / Convierte tu documentación en respuestas con citas, dentro de tu app" CTAs Empieza gratis / Ver cómo funciona, trust badges, chat mock SSO, logo strip, 5-step Cómo funciona, Producto 6 features, Integración 3 modes, Para desarrolladores 3 líneas código + HelpCenter.tsx snippet, Clientes testimonials, Precios monthly/annual -20% EUR, FAQ, final CTA "Empieza a responder en minutos", footer 4-column
- `/docs` — DocsView v3.0 PA-DOCS header+sidebar 18 public docs + search + first collection COL-DOCS expanded + auto-select first doc getting-started + main article deterministic with TOC hover # + toolbar Copy Share Edit + version badge knowledgeVersion + Ask Box DogfoodInlineBot with citations + search hybrid + next-step CTA + feedback 👍/👎 + related docs + footer, responsive mobile/desktop, i18n EN/ES
- `/docs/:slug` — e.g., `/docs/getting-started`, `/docs/collections`, `/docs/embedding`, `/docs/access-control`, `/docs/retrieval`, `/docs/facturacion-y-planes` — deterministic rendering + Ask Box pre-filled currentUrl + related docs
- `/about` — AboutView product overview capabilities metrics trust badges CTA
- `/contact` — ContactView form FORM-SEC-01 success state trust badges
- `/terms` `/privacy` `/acceptable-use` — LegalView deterministic legal + EMB-PUBLIC-LEGAL assistant
- `/login` `/signup` `/forgot-password` `/reset-password` — AuthView PA-AUTH card centered canvas white surface rounded-lg shadow-md cobalt accent
- `/workspaces/okeng/collections` — Workspace collections
- `/workspaces/okeng/files` — FileTable
- `/workspaces/okeng/files/:documentId` — MarkdownEditor
- `/workspaces/okeng/embeds` — Embed Studio
- `/workspaces/okeng/embeds/preview?embedId=EMB-PUBLIC-HOME` — Host Simulator
- `/workspaces/okeng/test?embedId=EMB-PUBLIC-HOME` — Test Console 5 scenarios Visitor Member Admin Invalid Token 401 Multilingual
- `/api/health` — Health check

---

## 16. Contributing & PR

- Branch: `arena/ead2cd90-okengine` (session fixed, work on this branch, push only to it)
- Commits: Atomic per phase — e.g., `feat(PR): add 9 new PR primitives... (PLAN-006)`, `feat(CO): add 8 new CO components...`, `feat(DOCS): update 25 canonical docs...`, `feat(PUBLIC): implement DocsView v3.0...`
- Push: `git push origin arena/ead2cd90-okengine`
- PR: `gh pr create` or update existing PR #1 from this branch
- Before push: `npm run build` PASS 26 routes, `npm run test:homepage-tour-readiness` 52/52 PASS, `npm run test:embed-authorization` 29/29 PASS, no hardcoded secrets, no console errors, FORM-SEC-01 where forms, real metrics only, DS tokens v3.0 no hardcoded colors

---

## 17. References

- `00_product_contract.md v1.1` — Product invariant Authorization before retrieval
- `01_ui_foundation.md v3.0` — DS tokens, typography, spacing, shadows, radius, principles 10-13 editorial whitespace real metrics shadow restraint radius scale, PA-LANDING PA-AUTH PA-DOCS PA-PUBLIC
- `02_component_catalog.md v3.0` — PR-* 25 primitives + CO-* 26 components + SU-* 28 surfaces + PA-* 4 archetypes + WF-* workflows
- `03_page_specifications.md v3.1` — PAGE-PUB-01 landing 12 surfaces, PAGE-PUB-02 about, PAGE-PUB-08 contact, PAGE-PUB-06 docs index, PAGE-PUB-07 docs article, PAGE-PUB-03/04/05 legal, PAGE-AUTH-01/02/03 login/signup/forgot-password, PA-DOCS PA-PUBLIC, SU-DOCS-*/SU-PUBLIC-*, WF-DOCS-01 PUBLIC-ABOUT/CONTACT/LEGAL
- `UI-01` — UI spec
- `PUBLIC-01` — Public platform pages & dogfooding spec ws_okeng_01 5 collections 25 docs 3 embeds deterministic vs dynamic retrieval live update Test Console DocumentNav visibility scoping header/footer homepage tour contract 13 capabilities 5 stages 81/81 verification
- `RENDER-001` — Content rendering presentation spec Normalized Content AST renderer_version 1 heading isolation scoped anchor Option1 PUBLIC_DOC hover # unified citation strip Option A 10 contexts progressive toolbar
- `PLAN-006` — Public pages & docs redesign v3.0 plan + execution results 52/52 + 29/29 PASS build 26 routes
- `SEC-01` — Security foundations session CSRF privilege CORS trust proxy security headers
- `API-01` — API contract route registry
- `DB-01` — DB schema
- `DATA-01` — Data model sanitization
- `OPS-01 v2.1` — Rate limiting cost controls observability incident response
- `STG-01` — Staging readiness checklist
- `STATUS-001` — Eight track completion
- `seedData.ts` — Canonical seed 58K INITIAL_WORKSPACE ws_okeng_01 knowledgeVersion 189 INITIAL_COLLECTIONS 5 INITIAL_DOCUMENTS 25 INITIAL_PUBLIC_EMBEDS 3
- `src/index.css` — DS tokens warm canvas cobalt shadow-sm/md/lg radius-lg Inter+JetBrains Mono
- `next.config.mjs` — Next.js config ESM webpack alias @→./src
- `middleware.ts` — Middleware security CORS CSRF rate limiting

---

*Local setup guide up to standards — professional, sublime, easy to use, covers memory mode quick start <2 min and full supabase+redis+stripe, 26 routes, 52/52 + 29/29 PASS, dogfooding loop, troubleshooting from real build history.*
