# PLAN-007 — Upgrade to Latest Next.js 16.4.0: Review, Audit & Migration Plan

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-007` |
| **Status** | `DRAFT — FOR REVIEW — AWAITING SIGNAL` |
| **Owner** | Engineering & Architecture |
| **Authority** | Blocking — Framework Upgrade |
| **Dependencies** | `00_product_contract`, `01_ui_foundation v3.0`, `02_component_catalog v3.0`, `03_page_specifications v3.1`, `UI-01 v3.1`, `SEC-01`, `API-01`, `DB-01`, `DATA-01`, `OPS-01`, `STG-01`, `PUBLIC-01`, `RENDER-001`, `PLAN-006`, `LOCAL-SETUP-GUIDE` |
| **Revision** | `1.0 (2026-10-11)` — Audit against Next.js 16.4.0 latest, from 15.1.0 (installed 15.5.27) |

---

## 0. Goal

Review current Next.js setup (15.1.0 spec, 15.5.27 installed, React 19.0.1, TS 5.9.3, Node 22, ESM next.config.mjs with webpack alias @→./src, middleware.ts with security headers CORS exact-origin CSRF lightweight, 26 routes build PASS, 52/52 + 29/29 tests PASS, PA-LANDING 12 surfaces + PA-AUTH + PA-DOCS + PA-PUBLIC, 25 PR + 26 CO + 28 SU + 4 PA, ws_okeng_01 dogfooding), check latest Next.js version (16.4.0 as of 2026-10-11 per npm view next version), audit breaking changes from Next.js 15→16 official upgrade guide (https://nextjs.org/docs/app/guides/upgrading/version-16) and blog (https://nextjs.org/blog/next-16), assess impact on OKEng codebase, and create phased atomic migration plan to latest Next.js with minimal risk, preserving build 26 routes PASS, tests 52/52 + 29/29 PASS, security invariants, dogfooding, visual identity v3.0.

**User request**: "I would rather have latest Next.js, let's review and plan updating, show me the plan for review and wait for my signal." — So this doc is **plan only**, no code changes yet, waiting for signal to execute.

---

## 1. Current State Audit

### 1.1 Current Versions (package.json + installed)

| Package | Spec in package.json | Installed (node_modules) | Latest (npm view) | Meets Next.js 16 req? |
| :--- | :--- | :--- | :--- | :--- |
| next | ^15.1.0 | 15.5.27 | 16.4.0 | Needs bump major 15→16 |
| react | ^19.0.1 | 19.0.1 | 19.3.0 | Next.js 16 requires React 19.2+ — needs bump 19.0.1→19.3.0 |
| react-dom | ^19.0.1 | 19.0.1 | 19.3.0 | Same — needs bump |
| typescript | ^5.9.3 | 5.9.3 | 5.9.x | Meets Next.js 16 min 5.1+ ✅ |
| Node.js | — | 22.22.3 (sandbox) | 20.9+ min for Next.js 16 | Meets 20.9+ ✅ |
| @types/react | ^19.3.0 | — | — | OK |
| tailwindcss | ^4.3.3 | 4.3.3 | — | OK, Turbopack stable in 16.1 file system caching default |

**Build**: `npm run build` PASS — 26 routes ( / 5.18kB, /about 3.2kB, /contact 2.94kB, /docs 339B, /docs/[slug] 360B, /terms 281B, /privacy 285B, /acceptable-use 289B, /login 1.53kB, /signup 1.49kB, /forgot-password 1.49kB, /reset-password 1.49kB, /workspaces/* 1.43kB–12.1kB, /api/* 164B dynamic), First Load JS 103kB shared chunks 1255 46.5kB 4bd1b696 54.2kB other 1.9kB, static 0/26 generating 26/26 finalizing.

**Tests**: `test:homepage-tour-readiness` 52/52 PASS (8 suites, 81/81 verification matrix, AT-01..AT-25), `test:embed-authorization` 29/29 PASS (8 suites), after fixing I18N-01 Markdown (`.md`) + Markdown (.md) Spanish summary, Q05 everyone/members/admins in workspaces.md, Q08 route/visibility in retrieval.md, multilingual ¿Cómo funciona OKEng? product-overview ES translation.

**Config**: `next.config.mjs` ESM export default, reactStrictMode true, poweredByHeader false, typescript ignoreBuildErrors true, headers security X-Frame-Options DENY X-Content-Type-Options nosniff Referrer-Policy strict-origin-when-cross-origin Permissions-Policy camera=() microphone=() geolocation=(), webpack alias @→./src via `new URL('./src', import.meta.url).pathname`. No experimental.turbopack, no images config, no AMP, no runtimeConfig, no devIndicators, no PPR.

**Middleware**: `middleware.ts` exists — implements SEC-01 API-01: security headers, CORS exact-origin (allowedOrigins from CORS_ALLOWED_ORIGINS, exact match, 403 for API if disallowed), CSRF lightweight check (cookie okeng.csrf/__Host-okeng.csrf + header x-csrf-token/x-okeng-csrf, full validation in src/lib/auth.ts validateCsrf), rate limiting delegated to API routes via src/lib/rateLimit.ts, matcher /api/* /workspaces/* /login /signup /forgot-password /password/reset /reset-password.

**App Router**: `src/app/layout.tsx` RootLayout I18nProvider AppRouterProvider min-h-screen bg-canvas text-ink font-sans antialiased, `src/app/router.tsx` ARCH-MIG-001 Canonical App Router URL Navigation Engine HTML5 History API routeToPath parsePathname scrollViewportToTop AppRouterProvider custom client-side routing via history.pushState, `src/app/(public)/page.tsx` LandingView only, `about`, `contact`, `terms`, `privacy`, `acceptable-use`, `docs`, `docs/[slug]` dedicated routes v3.0, `(auth)` login/signup/forgot-password/reset-password AuthView PA-AUTH, `(workspace)` workspaces/[workspaceSlug]/collections etc client components using useParams from custom router, not Next.js server params. API routes `src/app/api/*` use NextRequest NextResponse, no next/headers cookies() headers().

**No breaking API usage currently**: No `cookies()` `headers()` `draftMode()` from `next/headers` sync, no `params` `searchParams` sync in server components (all client components), no `revalidateTag`, no `next/image` local src with query strings, no `images.domains`, no `next/legacy/image`, no `serverRuntimeConfig`/`publicRuntimeConfig`, no `devIndicators`, no `experimental.ppr`/`dynamicIO`, no `unstable_rootParams`, no `.babelrc`, no `pages/` directory (moved to `src/views-legacy/`), no AMP.

### 1.2 Latest Next.js Info (as of 2026-10-11)

- **Latest**: 16.4.0 (npm view next version), dist-tags latest 16.4.0, canary 16.5.0-canary.8, versions list shows 16.0→16.4.0 with many canaries
- **GA**: Next.js 16 GA October 21, 2025 per blog, LTS Active 16.2.x as of mid-2026, now 16.4.0
- **Node.js min**: 20.9+ (LTS), Node 18 no longer supported — we are on Node 22 ✅
- **TypeScript min**: 5.1+ — we are on 5.9.3 ✅
- **React min App Router**: 19.2 — we are on 19.0.1 ❌ needs bump to 19.3.0
- **Browsers**: Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+
- **Default bundler**: Turbopack now default for all apps (next dev and next build), opt out with `next build --webpack`, lockfile mechanism prevents multiple dev/build instances, dev and build output directories separate enabling concurrent execution
- **Codemods available**: `npx @next/codemod@canary upgrade latest` handles version bump, turbopack config move, next-lint-to-eslint-cli migration, middleware-to-proxy rename, unstable_ prefix removal, experimental_ppr drop; `npx next typegen` generates PageProps LayoutProps RouteContext type helpers for async params/searchParams

---

## 2. Breaking Changes Audit — Next.js 15→16 Official

Source: https://nextjs.org/docs/app/guides/upgrading/version-16 + https://nextjs.org/blog/next-16 + versions.dev + wisp.blog + salmanizhar.com + detartech.com + pkgpulse.com + thecodeforge.io

### 2.1 Async Request APIs (Breaking change) — **High Impact if used**

Version 15 introduced Async Request APIs as breaking change with temporary synchronous compatibility. Starting with Next.js 16, synchronous access fully removed. These APIs can only be accessed asynchronously.

- `cookies()` from `next/headers`
- `headers()` from `next/headers`
- `draftMode()` from `next/headers`
- `params` in `layout.js`, `page.js`, `route.js`, `default.js`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon`
- `searchParams` in `page.js`

**Migration**: `await cookies()`, `await headers()`, `await draftMode()`, `const { slug } = await params`, `const searchParams = await searchParams`, use codemod `npx @next/codemod@canary next-async-request-api .` and `npx next typegen` for PageProps LayoutProps RouteContext helpers.

**Our impact**: Currently **none** — all our pages are `'use client'` using custom router `useParams` from `src/app/router.tsx`, not Next.js server params. API routes use `NextRequest` not `next/headers`. `src/lib/auth.ts` uses `NextRequest.cookies` not `next/headers`. So low risk, but we should still audit and add typegen for future server components.

**Action**: Run codemod to be safe, add `npx next typegen`, ensure no sync access remains.

### 2.2 Async parameters for icon and open-graph Image (Breaking change) — Low Impact

Props passed to image generating functions in `opengraph-image`, `twitter-image`, `icon`, `apple-icon` are now Promises. In previous versions, both Image function and generateImageMetadata received params object, id returned by generateImageMetadata passed as string to image generation function. Starting with Next.js 16, image generating function now receives params and id as promises. generateImageMetadata continues receiving synchronous params.

**Our impact**: We don't have `opengraph-image`, `twitter-image`, `icon`, `apple-icon` files — none in src/app. Low risk.

**Action**: No action needed, but if we add OG images later, use async.

### 2.3 next/image changes — Medium Impact

- **minimumCacheTTL Default (Breaking)**: Changed from 60s to 4 hours (14400s). Reduces revalidation cost for images without cache-control headers.
- **Local IP Restriction (Breaking)**: New security restriction blocks local IP optimization by default. Set `images.dangerouslyAllowLocalIP: true` only for private networks.
- **imageSizes Default**: Removed 16 from default sizes (used by only 4.2% of projects), reduces srcset size and API variations.
- **qualities Default**: Changed from [1..100] to [75], quality prop coerced to closest value in images.qualities.
- **maximumRedirects Default**: Changed from unlimited to 3 redirects max, set to 0 to disable or increase for rare edge cases.
- **Local src with query strings**: Now requires `images.localPatterns` config to prevent enumeration attacks.

**Our impact**: We don't use `next/image` directly in landing (we use custom `ChatMock`, `FeatureCard`, etc with divs not next/image). We have no `next.config.mjs` images config, so defaults will change but no break. Low risk, but we should add explicit images config if we later use next/image, and set `dangerouslyAllowLocalIP` if needed for private network.

**Action**: Add explicit `images` config in next.config.mjs to preserve old behavior or adopt new defaults intentionally, document in LOCAL-SETUP-GUIDE.

### 2.4 Version Requirements — Already Met Except React

| Change | Details | Our Status |
| :--- | :--- | :--- |
| Node.js 20.9+ | Minimum now 20.9.0 LTS, Node 18 no longer supported | ✅ Node 22.22.3 |
| TypeScript 5+ | Minimum now 5.1.0 | ✅ 5.9.3 |
| Browsers | Chrome 111+, Edge 111+, Firefox 111+, Safari 16.4+ | ✅ Modern |
| React 19.2 | App Router requires React 19.2 | ❌ We have 19.0.1, need bump to 19.3.0 |

**Action**: Bump react 19.0.1→19.3.0, react-dom 19.0.1→19.3.0, @types/react 19.3.0→19.3.0 (already 19.3.0), @types/react-dom 19.3.0.

### 2.5 Removals — High Impact for Some

| Removed | Replacement | Our Usage | Impact |
| :--- | :--- | :--- | :--- |
| AMP support | All AMP APIs and configs removed (useAmp, export const config = { amp: true }) | None | None |
| next lint command | Use Biome or ESLint directly, next build no longer runs linting. Codemod: npx @next/codemod@canary next-lint-to-eslint-cli . | package.json has `lint: next lint` | **High** — need migrate to eslint CLI |
| devIndicators options | appIsrStatus, buildActivity, buildActivityPosition removed from config. Indicator remains. | None | None |
| serverRuntimeConfig, publicRuntimeConfig | Use env vars (.env files) | None | None |
| experimental.turbopack location | Config moved to top-level turbopack (no longer in experimental) | None currently, but we have webpack alias that needs turbopack migration | Medium |
| experimental.dynamicIO flag | Renamed to cacheComponents | None | None |
| experimental.ppr flag | PPR flag removed, evolving into Cache Components programming model | None | None |
| export const experimental_ppr | Route-level PPR export removed | None | None |
| Automatic scroll-behavior: smooth | Add data-scroll-behavior="smooth" to HTML document to opt back in | None, we use scrollViewportToTop instant behavior | None |
| unstable_rootParams() | Working on alternative API | None | None |
| Sync params, searchParams props access | Must use async await params await searchParams | None currently (client components) | Low |
| Sync cookies(), headers(), draftMode() | Must use async await cookies() await headers() await draftMode() | None | Low |
| Metadata image route params argument | Changed to async params, id from generateImageMetadata now Promise<string> | None | None |
| next/image local src with query strings | Now requires images.localPatterns config | None | None |

**Our high impact**: `next lint` removal. We need to replace with ESLint.

**Action**: Install eslint, create eslint.config.mjs flat config (Next.js 16 defaults to flat config), migrate lint script, ensure build no longer runs linting automatically (it didn't before anyway due to typescript ignoreBuildErrors true, but now next build won't run lint at all).

### 2.6 Behavior Changes — Medium Impact

| Changed Behavior | Details | Our Impact |
| :--- | :--- | :--- |
| Default bundler | Turbopack now default for all apps, opt out with next build --webpack | **High** — we have webpack alias in next.config.mjs that will fail under Turbopack unless migrated to turbopack.resolveAlias |
| images.minimumCacheTTL default | 60s→4h | Low |
| images.imageSizes default | Removed 16 | Low |
| images.qualities default | [1..100]→[75] | Low |
| images.dangerouslyAllowLocalIP | Blocks local IP optimization by default | Low, but if we use local IP images in private network, need true |
| images.maximumRedirects default | unlimited→3 | Low |
| @next/eslint-plugin-next default | Now defaults to ESLint Flat Config format, aligning with ESLint v10 which will drop legacy config support | Medium — need flat config |
| Prefetch cache behavior | Complete rewrite with layout deduplication and incremental prefetching | Low — may affect landing nav prefetch, but should improve |
| revalidateTag() signature | Now requires cacheLife profile as second argument for SWR behavior, or use updateTag() in Server Actions if need read-your-writes semantics | None currently |
| Babel configuration in Turbopack | Automatically enables Babel if babel config found (previously exited with hard error) | None — no .babelrc |
| Terminal output | Redesigned with clearer formatting, better error messages, improved performance metrics | None — just nicer |
| Dev and build output directories | next dev and next build now use separate output directories, enabling concurrent execution | Good — enables concurrent dev and build |
| Lockfile behavior | Added lockfile mechanism to prevent multiple next dev or next build instances on same project | Good — prevents duplicate dev servers |
| Parallel routes default.js | All parallel route slots now require explicit default.js files, builds fail without them. Create default.js that calls notFound() or returns null for previous behavior | We have route groups (public), (auth), (workspace) not parallel routes @slot, so no default.js needed unless we have @modal etc — we don't, so low risk |
| Modern Sass API | Bumped sass-loader to v16, supports modern Sass syntax | None — we use Tailwind 4.3 not Sass |

**Our high impact**: Turbopack default + webpack alias.

**Action**: Migrate webpack alias @→./src to turbopack config:

```js
// next.config.mjs for Next.js 16
const nextConfig = {
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
  webpack: (config) => { // fallback for --webpack mode
    config.resolve.alias = { ...config.resolve.alias, '@': new URL('./src', import.meta.url).pathname };
    return config;
  },
}
```

Or opt out with `next build --webpack` in package.json build scripts, but better to support Turbopack.

### 2.7 Deprecations — Medium Impact

| Deprecated | Details | Our Impact |
| :--- | :--- | :--- |
| middleware.ts filename | Rename to proxy.ts to clarify network boundary and routing focus, exported function renamed to proxy, Node.js runtime only, config flags skipMiddlewareUrlNormalize → skipProxyUrlNormalize | **High** — we have middleware.ts, need rename to proxy.ts and function to proxy |
| next/legacy/image component | Use next/image instead | None |
| images.domains config | Use images.remotePatterns config instead for improved security restriction | None |
| revalidateTag() single argument | Use revalidateTag(tag, profile) for SWR, or updateTag(tag) in Actions for read-your-writes | None |

**Our high impact**: middleware.ts → proxy.ts rename.

**Action**: Rename middleware.ts to proxy.ts, rename exported function middleware to proxy, update config matcher remains same, check runtime — proxy runs Node.js only, not edge. Our middleware uses NextRequest/NextResponse which are Node.js compatible, so OK. If we need edge runtime, keep middleware.ts for now, but official guide says proxy is Node.js-only today, keep middleware for edge for now. We use no edge-specific APIs, so we can rename to proxy.ts.

### 2.8 Additional Improvements — Positive

- Performance improvements: Significant performance optimizations for next dev and next start, Turbopack file system caching stable and default in 16.1 meaning compiler stores artifacts on disk for lightning-fast subsequent starts
- Node.js native TypeScript for next.config.ts: Run next dev, next build, next start commands with --experimental-next-config-strip-types flag to enable native TypeScript for next.config.ts
- Adapters API stable — platforms can customize build process without config hacks
- 200+ Turbopack fixes — Server Fast Refresh, SRI support, postcss.config.ts, tree shaking of dynamic imports
- New transitionTypes prop, ImageResponse 2x–20x faster, --inspect now works with next start

**Our benefit**: Faster dev startup ~87% faster in 16.2 vs 16.1, 25–60% faster HTML rendering RSC payload deserialization uses plain JSON.parse() + recursive walk instead of reviver callback eliminates V8 C++/JS boundary crossing per key-value pair.

---

## 3. Impact Assessment — OKEng Specific

### 3.1 High Risk (Must Fix Before Upgrade)

1. **Turbopack default + webpack alias**: next.config.mjs has webpack alias @→./src. In Next.js 16 Turbopack default, build fails if webpack config detected: "webpack is configured while Turbopack is not" / build fails on webpack config. Need migrate alias to turbopack.resolveAlias or opt out with --webpack. **Fix**: Add turbopack.resolveAlias and keep webpack for fallback, or add --webpack to build scripts temporarily.

2. **middleware.ts → proxy.ts**: File exists, must rename to proxy.ts and function to proxy per deprecation. Config flags skipMiddlewareUrlNormalize → skipProxyUrlNormalize (we don't use those flags, but need rename). **Fix**: Rename file, function, ensure matcher still works, test CORS exact-origin, security headers, CSRF lightweight.

3. **next lint removal**: package.json lint script uses `next lint`, which is removed in Next.js 16. Build no longer runs linting. CI will break. **Fix**: Install eslint, create eslint.config.mjs flat config, migrate lint script to `eslint .`, run codemod `npx @next/codemod@canary next-lint-to-eslint-cli .`, update LOCAL-SETUP-GUIDE.

4. **React 19.0.1 → 19.3.0**: Next.js 16 requires React 19.2+ in App Router. We are on 19.0.1, need bump to 19.3.0 latest. **Fix**: Bump react, react-dom, @types/react, @types/react-dom.

### 3.2 Medium Risk (Should Fix / Review)

5. **next/image defaults**: minimumCacheTTL 60s→4h, imageSizes removes 16, qualities [1..100]→[75], dangerouslyAllowLocalIP blocks local IP, maximumRedirects unlimited→3. We don't use next/image currently, but if we add later, need explicit images config. **Fix**: Add explicit images config in next.config.mjs to preserve old or adopt new intentionally.

6. **ESLint flat config**: @next/eslint-plugin-next now defaults to flat config format, aligning with ESLint v10 which will drop legacy config support. **Fix**: Create eslint.config.mjs flat config, not .eslintrc.

7. **Lockfile behavior**: Next.js 16 adds lockfile mechanism to prevent multiple dev/build instances on same project. **Fix**: Document in LOCAL-SETUP-GUIDE, ensure dev scripts handle lockfile.

8. **Dev and build output directories separate**: Enables concurrent execution — good, but need to ensure clean script removes both .next and .next/dev? Check.

### 3.3 Low Risk (No Action Needed Now, But Audit)

9. **Async Request APIs**: No current usage, but we should run `npx @next/codemod@canary next-async-request-api .` and `npx next typegen` to generate PageProps LayoutProps RouteContext helpers for future server components, ensure no sync access remains.

10. **Parallel routes default.js**: We have route groups (public), (auth), (workspace) not parallel routes @slot, so no default.js needed. But if we later add @modal etc, need explicit default.js that calls notFound() or returns null.

11. **revalidateTag signature**: Not used currently.

12. **AMP, runtimeConfig, devIndicators, PPR, dynamicIO, unstable_rootParams**: Not used.

13. **Babel**: No .babelrc, so no silent ignoring.

14. **Pages Router**: We have src/views-legacy/PublicSurfaceView.tsx but no src/pages/ directory, so safe. Next.js 16 does NOT remove Pages Router officially (some blogs claim removal, but official docs still support Pages Router with Turbopack default). So no action.

15. **Prefetch cache rewrite**: May affect landing nav prefetch, but should improve with layout deduplication and incremental prefetching. Test manually.

---

## 4. Migration Plan — Phased Atomic Commits (For Review, Awaiting Signal)

**Goal**: Upgrade from Next.js 15.1.0 (installed 15.5.27) to 16.4.0 latest, React 19.0.1→19.3.0, preserve build 26 routes PASS, tests 52/52 + 29/29 PASS, security invariants, dogfooding, visual identity v3.0.

**Approach**: One concern at a time, per official codemod order, pause for review after each, run typecheck, lint, build, tests, report results before continuing. Do not refactor unrelated code.

### Phase 0 — Pre-Migration Audit & Baseline (0.5 day) — **This doc**

- [x] Check latest Next.js version via `npm view next version` → 16.4.0
- [x] Review official upgrade guide https://nextjs.org/docs/app/guides/upgrading/version-16 and blog https://nextjs.org/blog/next-16
- [x] Audit current codebase for breaking APIs: middleware.ts, webpack alias, next lint, async params, next/image, revalidateTag, AMP, runtimeConfig, etc
- [x] Document impact assessment high/medium/low risk
- [x] Create this plan doc PLAN-007 v1.0 for review
- [ ] **Await user signal to proceed**

**Deliverable**: This doc, no code changes.

**Commit**: `docs(PLAN-007): add Next.js 16.4.0 upgrade audit and migration plan — review async Request APIs, Turbopack default, middleware→proxy, next lint removal, React 19.2+ req, image defaults, phased atomic commits`

### Phase 1 — Verify Node.js & TypeScript & Bump React (0.5 day) — **After Signal**

1. Confirm Node.js 20.9+ (we have 22.22.3) and TypeScript 5.1+ (we have 5.9.3) — meets req
2. Bump react 19.0.1→19.3.0, react-dom 19.0.1→19.3.0, @types/react 19.3.0 (already), @types/react-dom 19.3.0
3. Run `npm install`, `npm run build`, `npm run test:homepage-tour-readiness`, `npm run test:embed-authorization`
4. Report results

**Commit**: `feat(REACT): bump react 19.0.1→19.3.0 react-dom 19.0.1→19.3.0 for Next.js 16.4.0 React 19.2+ requirement (PLAN-007)`

### Phase 2 — Run Official Upgrade Codemod & Typegen (0.5 day)

1. Run official upgrade CLI: `npx @next/codemod@canary upgrade latest` — handles version bump next 15.5.27→16.4.0, turbopack config move experimental.turbopack→top-level turbopack, next-lint-to-eslint-cli migration, middleware-to-proxy rename, unstable_ prefix removal, experimental_ppr drop
2. Run `npx next typegen` to generate PageProps LayoutProps RouteContext type helpers for async params/searchParams
3. Check what codemod changed: next.config.mjs, middleware.ts→proxy.ts, package.json next version, eslint config, etc
4. Run `npm run build`, tests, report

**Commit**: `feat(NEXT): run @next/codemod upgrade latest — bump next 15.5.27→16.4.0, turbopack config move, next-lint-to-eslint migration, middleware→proxy rename, typegen (PLAN-007)`

### Phase 3 — Await Every Remaining Synchronous Request API (0.5 day)

1. Audit for any remaining sync request APIs: `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` — sync access fully removed in 16, hard failure not warning
2. Run codemod `npx @next/codemod@canary next-async-request-api .` — catches ~80% automatically
3. Manually fix any remaining: `const { slug } = await params`, `const searchParams = await searchParams`, `const cookieStore = await cookies()`, `const headersList = await headers()`, `const { isEnabled } = await draftMode()`
4. For our codebase, we use custom router useParams from src/app/router.tsx, not Next.js server params, so should be none, but check API routes and layout.tsx that might use params
5. Check icon, opengraph-image, twitter-image, apple-icon if we add later — params and id as Promises
6. Run build, tests

**Commit**: `feat(NEXT): await every sync Request API — cookies headers draftMode params searchParams fully async in Next.js 16, typegen helpers (PLAN-007)`

### Phase 4 — Finish Middleware to Proxy Rename (0.5 day)

1. Ensure middleware.ts renamed to proxy.ts (codemod may have done, but verify)
2. Rename exported function `middleware` → `proxy`
3. Update config flags `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize` if used (we don't use, but check)
4. Note: proxy runs Node.js runtime only, not edge — if we rely on edge runtime, keep middleware.ts for now per versions.dev guidance. We use no edge-specific APIs, so we can rename to proxy.ts
5. Test security headers, CORS exact-origin, CSRF lightweight, matcher /api/* /workspaces/* /login etc
6. Run build, tests

**Commit**: `feat(NEXT): finish middleware→proxy rename — proxy.ts Node.js runtime, security headers CORS exact-origin CSRF (PLAN-007)`

### Phase 5 — Handle Turbopack as Default (0.5 day)

1. Remove `--turbopack` from scripts if present (we don't have --turbopack flag currently, dev is `next dev` without flag)
2. Move `experimental.turbopack` to top-level `turbopack` if present (we don't have experimental.turbopack, but we have webpack alias)
3. Migrate webpack alias @→./src to turbopack config:
   ```js
   // next.config.mjs for Next.js 16
   const nextConfig = {
     turbopack: {
       resolveAlias: {
         '@': './src',
       },
     },
     webpack: (config) => { // fallback for --webpack mode
       config.resolve.alias = { ...config.resolve.alias, '@': new URL('./src', import.meta.url).pathname };
       return config;
     },
   }
   ```
4. Only add `--webpack` to build scripts if we must keep webpack build (e.g., if some dependency doesn't work under Turbopack). Try Turbopack first, fallback to --webpack if needed.
5. Test dev startup — should be ~87% faster in 16.2 vs 16.1 per blog, file system caching stable and default
6. Test build — Turbopack default, check for "webpack is configured while Turbopack is not" error, fix
7. Run build, tests

**Commit**: `feat(NEXT): handle Turbopack as default — migrate webpack alias @→./src to turbopack.resolveAlias, keep webpack fallback for --webpack mode, dev startup ~87% faster (PLAN-007)`

### Phase 6 — Add CacheLife Profiles & Review Image/Config Defaults (0.5 day)

1. Audit for `revalidateTag(tag)` single arg — should be `revalidateTag(tag, profile)` with cacheLife profile second arg e.g., `revalidateTag('posts', 'max')` for SWR, or `updateTag(tag)` in Server Actions for read-your-writes, `refresh()` for uncached refresh. We don't use revalidateTag currently, but check.
2. Review next/image config defaults: minimumCacheTTL 60s→4h, imageSizes removes 16, qualities [1..100]→[75], dangerouslyAllowLocalIP blocks local IP, maximumRedirects unlimited→3. Add explicit images config if needed to preserve old or adopt new intentionally:
   ```js
   images: {
     minimumCacheTTL: 14400, // new default 4h
     qualities: [75], // new default
     dangerouslyAllowLocalIP: false, // new security restriction
     maximumRedirects: 3,
     localPatterns: [], // if we use local src with query strings
     remotePatterns: [], // instead of domains
   }
   ```
3. Fix removed config: AMP, runtime config, devIndicators, ppr/dynamicIO, etc — none in our codebase, but verify.
4. Add default.js to parallel-route slots if we have @slot — we don't have parallel routes, only route groups (public), (auth), (workspace), so no default.js needed. But if we later add @modal, need explicit default.js that calls notFound() or returns null.
5. Review modern Sass API — we use Tailwind 4.3 not Sass, so no action.
6. Run build, tests

**Commit**: `feat(NEXT): add cacheLife profiles to revalidateTag, review image/config defaults — minimumCacheTTL 4h qualities [75] dangerouslyAllowLocalIP maximumRedirects 3 (PLAN-007)`

### Phase 7 — Fix Type Errors & ESLint Flat Config & Verify (0.5 day)

1. Fix any remaining type errors from async params, image config, etc — run `npx tsc --noEmit`
2. Handle next lint removal: Install eslint, create eslint.config.mjs flat config (Next.js 16 defaults to flat config, aligning with ESLint v10 which will drop legacy config support), migrate lint script:
   ```json
   // package.json
   "lint": "eslint .",
   // instead of "next lint"
   ```
   Run codemod `npx @next/codemod@canary next-lint-to-eslint-cli .` if not done in Phase 2.
3. Ensure next.config.mjs is ESM export default (we already have ESM) and supports native TypeScript via --experimental-next-config-strip-types flag if we want next.config.ts
4. Update LOCAL-SETUP-GUIDE.md with Next.js 16.4.0 info: Turbopack default, proxy.ts rename, async Request APIs, next lint removal, image defaults, lockfile behavior, dev/build output directories separate
5. Run final verification:
   - `npm run build` — 26 routes PASS, no webpack errors, Turbopack default
   - `npm run test:homepage-tour-readiness` — 52/52 PASS
   - `npm run test:embed-authorization` — 29/29 PASS
   - Manual verification: / landing v3.0 12 surfaces, /docs PA-DOCS header+sidebar+main+TOC+footer, /about, /contact, /terms, /privacy, /acceptable-use, /login, /signup, /forgot-password, /reset-password, /workspaces/okeng/* — all with new visual identity v3.0 warm canvas cobalt shadow-sm/md/lg radius-lg editorial whitespace, no console errors, no hardcoded secrets, FORM-SEC-01 where forms, real metrics only
   - Check lockfile behavior: try running two `npm run dev` instances, should be prevented by lockfile mechanism
   - Check dev and build output directories separate enabling concurrent execution

**Commit**: `feat(NEXT): fix type errors, migrate to ESLint flat config, update LOCAL-SETUP-GUIDE for Next.js 16.4.0 Turbopack default proxy async APIs (PLAN-007)`

### Phase 8 — Push & PR (0.5 day)

1. Push all commits to `arena/ead2cd90-okengine`
2. Update PR #1 with Next.js 16.4.0 upgrade
3. Update docs: 00_product_contract v1.1→v1.2 with Next.js 16.4.0, 01_ui_foundation v3.0→v3.1 with Turbopack default, 03_page_specifications v3.1→v3.2 with async params, etc if needed
4. Final report

**Commit**: `docs(PLAN-007): mark execution completed — Next.js 15.1.0→16.4.0, React 19.0.1→19.3.0, Turbopack default, proxy.ts, async Request APIs, ESLint flat config, 26 routes PASS 52/52+29/29 PASS`

---

## 5. Risk Mitigation & Rollback

### 5.1 Risks

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Turbopack + webpack alias breaks build | High | High | Migrate alias to turbopack.resolveAlias, keep webpack fallback, test build, opt out with --webpack if needed |
| middleware→proxy rename breaks CORS/security headers | Medium | High | Rename file and function, keep matcher same, test manually /api/health, /login, /workspaces/*, check CORS exact-origin 403 for disallowed origin, security headers X-Frame-Options etc |
| next lint removal breaks CI | High | Medium | Install eslint, create flat config, migrate lint script, run codemod next-lint-to-eslint-cli |
| Async Request APIs sync access hard failure | Low (no current usage) | High if missed | Run codemod next-async-request-api, run typegen, grep for cookies() headers() params searchParams sync access, test all dynamic routes |
| React 19.0.1→19.3.0 breaks components | Low | Medium | Bump react and react-dom together, test landing, docs, auth, workspace, check forwardRef removal (React 19 removes forwardRef, ref is regular prop) — we have some forwardRef? Check src/components/ui/Button.tsx uses forwardRef — need to migrate to ref as regular prop per React 19 |
| next/image defaults change breaks images | Low (no next/image usage) | Low | Add explicit images config if needed |
| Lockfile prevents multiple dev instances | Low | Low | Document, ensure clean removes lockfile |
| Parallel routes default.js required | Low (no parallel routes) | Medium if we add @slot later | Add default.js that calls notFound() or returns null if we have @slot |

### 5.2 React 19 forwardRef Removal — Additional Audit Needed

React 19 ships with Next.js 16 and removes forwardRef. Components that used forwardRef to pass refs to DOM elements now accept ref as regular prop. Check our codebase:

```bash
grep -R "forwardRef" src/components/ui/ | head
```

We have `Button.tsx` uses `React.forwardRef` — needs migration to ref as regular prop per React 19:

```tsx
// Before (React 18)
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => ...)

// After (React 19)
export function Button({ ref, ...props }: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  // use ref directly
}
```

Need to audit all ui primitives for forwardRef and migrate.

**Action**: Include in Phase 1 or Phase 7 — grep for forwardRef, count components, estimate effort, migrate.

### 5.3 Rollback Plan

- Keep branch `arena/ead2cd90-okengine` with commits before upgrade — can revert via `git revert` or `git reset --hard` to commit before upgrade
- Keep package-lock.json and bun.lock before upgrade — can restore
- If Turbopack fails, opt out with `next build --webpack` in package.json build scripts
- If proxy.ts Node.js-only causes edge runtime issues, keep middleware.ts for edge per versions.dev guidance: "Apps that depend on the edge runtime for middleware (proxy is Node.js-only today; keep middleware for edge for now)"
- If React 19.3.0 breaks, downgrade to 19.2.x minimum required for Next.js 16

---

## 6. Testing Plan

After each phase, run:

```bash
npm run build # must PASS 26 routes, no webpack errors, Turbopack default
npm run test:homepage-tour-readiness # must PASS 52/52
npm run test:embed-authorization # must PASS 29/29
npm run lint # must PASS after migrating to eslint flat config (was next lint)
npx tsc --noEmit # must PASS no type errors
```

Manual verification after Phase 7:

- `/` landing v3.0 12 surfaces, announcement banner, hero, logo strip, metrics ≥98% -73% 1k 3 lines, how it works 5-step, product features 6, integration 3 modes, developers 3 lines code, testimonials, pricing monthly/annual -20%, FAQ, final CTA, footer 4-column — no console errors
- `/docs` PA-DOCS header 56px sticky backdrop-blur sidebar 300px border-r bg-surface sticky top-14 h calc 100vh-56px main max-w-3xl/4xl px-6 py-8/12 right TOC 200px footer, sidebar 18 public docs + search + first collection COL-DOCS expanded + auto-select first doc getting-started + article deterministic with TOC hover # + toolbar Copy Share Edit + version badge knowledgeVersion 189 + Ask Box DogfoodInlineBot with citations + search hybrid + next-step CTA + feedback + related docs + footer, responsive mobile/desktop, i18n EN/ES
- `/docs/:slug` — e.g., /docs/getting-started, /docs/collections, /docs/embedding, /docs/access-control, /docs/retrieval, /docs/facturacion-y-planes — deterministic + Ask Box pre-filled currentUrl
- `/about` — AboutView product overview capabilities metrics trust badges CTA
- `/contact` — ContactView form FORM-SEC-01 success state trust badges
- `/terms` `/privacy` `/acceptable-use` — LegalView deterministic legal + EMB-PUBLIC-LEGAL assistant
- `/login` `/signup` `/forgot-password` `/reset-password` — AuthView PA-AUTH card centered canvas white surface rounded-lg shadow-md cobalt
- `/workspaces/okeng/collections` etc — workspace console, collections, files, embeds, test console 5 scenarios
- Security: CORS exact-origin 403 for disallowed origin, security headers X-Frame-Options DENY etc, CSRF double-submit, session httpOnly secure sameSite strict 12h, rate limiting 429 standardized
- No hardcoded secrets, no console errors, FORM-SEC-01 where forms, real metrics only, DS tokens v3.0 no hardcoded colors

---

## 7. Acceptance Criteria (For Execution After Signal)

- [ ] This plan doc PLAN-007 v1.0 for review
- [ ] Node.js 20.9+ and TypeScript 5.1+ confirmed, React bumped 19.0.1→19.3.0 for Next.js 16.4.0 React 19.2+ requirement
- [ ] Official upgrade codemod `npx @next/codemod@canary upgrade latest` run — next 15.5.27→16.4.0, turbopack config move, next-lint-to-eslint migration, middleware→proxy rename, unstable_ prefix removal, experimental_ppr drop, typegen
- [ ] Async Request APIs fully async — cookies() headers() draftMode() params searchParams awaited, no sync access remains, typegen helpers PageProps LayoutProps RouteContext
- [ ] Middleware→proxy rename completed — proxy.ts Node.js runtime, function proxy, matcher preserved, security headers CORS exact-origin CSRF tested
- [ ] Turbopack default handled — webpack alias @→./src migrated to turbopack.resolveAlias, keep webpack fallback for --webpack mode, dev startup ~87% faster, no "webpack is configured while Turbopack is not" error
- [ ] CacheLife profiles added to revalidateTag if used, image/config defaults reviewed — minimumCacheTTL 4h qualities [75] dangerouslyAllowLocalIP maximumRedirects 3, removed config AMP runtimeConfig devIndicators ppr/dynamicIO fixed, parallel routes default.js added if needed
- [ ] React 19 forwardRef removal migrated — Button.tsx etc ref as regular prop, no forwardRef wrapper
- [ ] ESLint flat config migrated — eslint.config.mjs flat config, lint script eslint . instead of next lint, @next/eslint-plugin-next flat config
- [ ] Type errors fixed — npx tsc --noEmit PASS
- [ ] Build 26 routes PASS with Turbopack default, no webpack errors
- [ ] Tests 52/52 + 29/29 PASS
- [ ] Manual verification all public pages with v3.0 visual identity professional sublime
- [ ] LOCAL-SETUP-GUIDE.md updated for Next.js 16.4.0 Turbopack default proxy async APIs next lint removal image defaults lockfile dev/build output directories separate
- [ ] Atomic commits + push + PR update

---

## 8. References

- Latest version: npm view next version → 16.4.0 (2026-10-11), dist-tags latest 16.4.0, canary 16.5.0-canary.8
- Official upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16 — Async Request APIs breaking change sync removed, async params for icon/open-graph image breaking, next/image minimumCacheTTL 60s→4h local IP restriction
- Official blog: https://nextjs.org/blog/next-16 — New Features Improved Caching APIs revalidateTag updated migration guidance add second arg cacheLife profile 'max' for SWR or use updateTag() in Server Actions read-your-writes, Breaking Changes Version Requirements Node 20.9+ TS 5+ Browsers Chrome 111+ Edge 111+ Firefox 111+ Safari 16.4+, Removals AMP next lint devIndicators serverRuntimeConfig publicRuntimeConfig experimental.turbopack→top-level turbopack experimental.dynamicIO→cacheComponents experimental.ppr removed experimental_ppr removed automatic scroll-behavior smooth removed unstable_rootParams removed sync params searchParams removed sync cookies headers draftMode removed metadata image route params async next/image local src with query strings requires localPatterns, Behavior Changes Turbopack default images defaults @next/eslint-plugin-next flat config prefetch cache rewrite revalidateTag signature Babel config auto enables Babel terminal output redesigned dev/build output directories separate lockfile parallel routes default.js required modern Sass API, Deprecations middleware.ts→proxy.ts next/legacy/image images.domains→remotePatterns revalidateTag single arg, Additional Improvements performance Node.js native TS for next.config.ts --experimental-next-config-strip-types
- Migration guide 16: https://www.salmanizhar.com/blog/nextjs-16-migration-guide — Cache Components use cache model opt-in caching proxy.ts preferred replacement for middleware.ts revalidateTag expects cache profile updateTag available for read-your-writes Turbopack default next lint gone Node 20.9+ stricter
- Migration guide step-by-step: https://detartech.com/en/blog/nextjs-16-migration-guide — Turbopack default bundler params searchParams cookies headers fully async middleware→proxy next lint gone next/image defaults
- Upgrade to 16: https://versions.dev/modernize/nextjs/upgrade-to-nextjs-16 — GA October 21 2025 LTS Active 16.2.x as of mid-2026 now 16.4.0 headline breaking fully-removed sync request APIs Turbopack default middleware-to-proxy rename revalidateTag(tag, profile) Node 20.9+ floor, who should wait edge runtime middleware proxy Node.js-only Node 18 pinned PPR canary webpack config, what changed sync request APIs removed Turbopack default middleware deprecated proxy Node.js only revalidateTag deprecated errors minimums Node 20.9+ TS 5.1+ React 19.2 removed AMP next lint runtime config devIndicators PPR dynamicIO useCache unstable_rootParams parallel-route slots require default.js next/image defaults, @next/codemod upgrade CLI automates version bump turbopack/lint/proxy/unstable_/ppr migrations, compatibility matrix sync cookies/headers/params Warns in 15 Removed in 16 must await default bundler webpack→Turbopack request interception middleware.ts→proxy.ts revalidateTag single→profile minimum Node 18.18+→20.9+ React 19→19.2 next lint Available→Removed PPR experimental.ppr→cacheComponents+use cache, common errors cookies()/headers()/searchParams should be awaited hard failure webpack configured while Turbopack not build fails on webpack config TypeScript error on revalidateTag add cacheLife profile Build fails on parallel route add default.js Cannot find module next/amp next lint errors removed, copy-ready AI prompts migration execution order Node TS bump react react-dom latest codemod upgrade latest turbopack config next lint to ESLint middleware to proxy unstable prefix PPR await remaining sync request APIs finish proxy rename unless edge handle Turbopack default remove --turbopack move experimental.turbopack to top-level turbopack only add --webpack if must keep webpack build add cacheLife profile to revalidateTag or updateTag fix removed config AMP runtime config devIndicators ppr/dynamicIO add default.js to parallel-route slots review image config defaults fix type errors after each step run typecheck lint build tests report before continuing do not refactor unrelated
- Wisp CMS: https://www.wisp.blog/blog/nextjs-16-1-upgrade-guide — Turbopack file system caching stable default 16.1 dev startup, experimental bundle analyzer, breaking Node TS stricter async APIs deprecations next/legacy/image images.domains next lint parallel routes default.js AMP
- TheCodeForge: https://thecodeforge.io/javascript/next-js-react-migration-guide/ — Next.js 16 ships React 19 stable Rust-based Compiler replaces Babel Pages Router fully removed (controversial claim, but official docs still support Pages Router, so we treat as not removed, but we have no pages/ anyway) Server Components default every file in app/ is Server Component unless use client Server Actions replace API routes Rust compiler replaces next/babel SWC plugins Babel configs break, breaking change 1 Pages Router removed no compatibility layer every route must live in app/ using App Router conventions params and searchParams in page components are Promises must await, breaking change 2 compiler replaces Babel silent config ignoring .babelrc silently ignored build completes without errors but functionality stops output wrong CSS not scoped tree-shaking fails bundle size increases 30-50% run pre-migration check script, breaking change 3 React 19 forwardRef removed use() hook added forwardRef removed components accept ref as regular prop automatically forwarded without wrapper useRef callback refs still work only wrapper removed React.FC no longer includes children
- PkgPulse: https://www.pkgpulse.com/guides/nextjs-16-2-new-features-migration-2026 — 16.2 ships ~87% faster dev startup 25–60% faster RSC rendering stable Adapters 200+ Turbopack fixes transitionTypes ImageResponse 2x–20x faster --inspect works with next start, upgrade 15.x→16.2 async Request APIs cookies headers draftMode async codemod catches ~80% middleware→proxy PPR changes experimental_ppr removed use cacheComponents legacy removal AMP runtime configs next lint wrapper
- VersionLog: https://versionlog.com/nextjs/16/ — Performance Core faster local server startup optimized bundling reduced memory stable React 18 features Developer Experience enhanced error handling source maps improved next/headers caching production-ready React canary New Features next/after post-response tasks unstable_after Improvements better HMR refined dev build output TypeScript integration Breaking Changes minimum Node version caching behavior dynamic data fetches
- DigitalApplied: https://www.digitalapplied.com/blog/next-js-15-to-16-migration-playbook-cache-components-2026 — 5 axes Cache use cache proxy codemods runtime codemod coverage 80–90% typical migration 1–3 wk mid-size app phased new defaults Proxy+Cache rename+opt-in caching, what's new 16 ships five axes caching model shifts legacy fetch-cache+revalidate→Cache Components PPR default use cache directive cached functions tag-based invalidation cacheTag updateTag unstable_cache deprecation window codemod rewrites most call sites to use cache directive middleware renamed to proxy.ts Vercel codemods 80–90% mechanical, 01 Cache Components PPR default use cache directive marks functions for cache participation cacheLife cacheTag TTL invalidation replaces implicit fetch-cache model, unstable_cache out enters deprecation window in 16 codemod rewrites most call sites to use cache directive edge cases closures conditional caching manual review codemod covers most, Turbopack+Node/Bun 13–15 era cached fetch by default required opt-outs via cache no-store revalidate 0 16 inverts default nothing cached unless mark with use cache, common pitfalls 4 cache-related failure modes codemods carry mechanical load next-async-request-api sweeps sync request-API reads next-proxy-rename moves middleware file unstable_cache migration handles ~85% call sites with TODO comments rest
- Current codebase: next.config.mjs ESM webpack alias @→./src, middleware.ts security headers CORS exact-origin CSRF lightweight matcher /api/* /workspaces/* /login etc, src/app/(public)/page.tsx LandingView only, about/contact/terms/privacy/acceptable-use/docs/docs/[slug] dedicated routes v3.0 client components using custom router useParams not Next.js server params, (auth) login/signup/forgot-password/reset-password AuthView PA-AUTH, (workspace) workspaces/[workspaceSlug]/* client components using custom router, api routes NextRequest NextResponse no next/headers, src/lib/env.ts fail-fast DATABASE_URL SESSION_SECRET CSRF_SECRET NODE_ENV PORT REDIS_URL CORS_ALLOWED_ORIGINS no wildcard STRIPE keys dummy fallback for phase-production-build, src/lib/db.ts PG pool, src/lib/auth.ts Session CSRF Privilege SYSTEM_ROLES viewer/member/admin/super_admin ROLE_LEVEL hasSystemRole requireSystemRole SessionData sign HMAC-SHA256 createSessionToken verifySessionToken timingSafeEqual expiry 12h getSession cookie okeng.sid __Host-okeng.sid createSessionResponse httpOnly secure sameSite strict maxAge 12h generateCsrfToken double-submit, src/lib/redis.ts ioredis auto fallback memory, src/lib/rateLimit.ts RateLimiterAdapter Redis Lua atomic vs in-memory sliding-window TIER_AUTH_5_PER_15M etc 429 standardized, src/lib/validation.ts validateSafeUrl FORM-SEC-01, src/index.css @import tailwindcss @theme tokens warm canvas cobalt shadow-sm/md/lg radius-lg Inter+JetBrains Mono, 26 routes build PASS 52/52+29/29 PASS
- Existing plan docs: PLAN-006 public pages & docs redesign v3.0 completed 9 PR + 8 CO + DocsView v3.0 + AboutView + ContactView + LegalView dedicated routes 26 routes 52/52+29/29 PASS

---

*Plan for review — awaiting signal to execute upgrade to latest Next.js 16.4.0, one concern at a time, Turbopack default, proxy.ts, async Request APIs, ESLint flat config, React 19.3.0, 26 routes PASS 52/52+29/29 PASS.*
