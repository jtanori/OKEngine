# AGENTS.md — Agent Mode Working Agreements for OKEngine

| Field | Value |
| :--- | :--- |
| **Type** | Agent Working Contract — Blocking |
| **Scope** | All `arena/*` branches, `src/*`, `docs/*`, `src/app/(public)` + `(auth)` + `(workspace)` |
| **Authority** | Operational — supplements `00_product_contract`, `SEC-01`, `UI-01`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `04_top_screens_audit_and_standardization`, `04_workflows` |
| **Related** | `docs/UI-ALIGNMENT-STATUS.md` (live alignment tracker — **read first, then continue UI alignment**) |

---

## 1. Purpose

This file is the **entry point for any agent session** on `arena/*`. Before writing code, read:

1. **`docs/UI-ALIGNMENT-STATUS.md`** — live continuation tracker for DS → PR → CO → SU → PA → PAGE alignment (v3.1 as of 2026-10-11). It tells you what is already **ALIGNED** (landing 12 surfaces, auth 5 surfaces, docs, public pages, workspace 6 screens) and what remains (**§8 nice-to-have**).
2. **`docs/00_product_contract.md`** — product invariant *Authorization strictly before retrieval* and Files → Collections → Access → Context → Answer.
3. **`docs/01_ui_foundation.md` v3.0** — DS tokens (`src/index.css @theme`), 13 normative principles, control heights `xs 24 h-6` / `sm 32 h-8` / `md 36 h-9` / `lg 40 h-10`, PA-LANDING / PA-AUTH.
4. **`docs/UI-01-Primitives-Components-Surfaces-Archetypes-Workflows.md` v3.0** — canonical PR/CO/SU/PA/WF catalog.
5. **`docs/04_top_screens_audit_and_standardization.md`** — 9 frozen principles + `DS-SIDEBAR-POSTURE-001` + filter/mutation/drawer invariants.

Then continue UI alignment by composing **existing contracts first** — do not invent a new page grammar.

---

## 2. Architectural North Star

> **Standardize behavioral contracts and interaction language, not visual templates.**
> A new page should compose an existing `PA-*` archetype; it should not invent a new page grammar.

**Five-layer hierarchy** (strict):

```
DS (src/index.css @theme — --color-*, --text-*, --radius-*, --shadow-*, --spacing-*)
  ↓ consumes via className
PR (src/components/ui/* — domain-agnostic, zero hardcoded hex, zero bracket literals)
  ↓ composes
CO (src/components/*, src/components/landing/*, src/components/auth/*, src/components/docs/*, src/components/public/* — from PR only, useI18n, FORM-SEC-01)
  ↓ composes
SU (domain surfaces — SURF-PUBLIC, SURF-AUTH, SURF-WORKSPACE, SU-LANDING-*, SU-AUTH-*, SU-DOCS-*, SU-PUBLIC-*)
  ↓ implements
PA / PAGE (src/app/(public)/page.tsx etc — max-w-7xl, py-16 md:py-24, no sidebar for PA-LANDING/PA-AUTH, App Router)
```

**Governance Loop**:

```
Need new behavior
  ↓ Can existing PA/CO/PR express it?
  Yes → Compose existing contract
  No  → Amend normative architecture (01/02/03/UI-01) first, then implement
```

---

## 3. Design System Rules (DS)

- **Single source**: `src/index.css` `@theme` + `:root` — all colors/typography/radii/shadows/spacings.
- **No hardcoded colors**: never `bg-[#...]`, `text-[#...]`, `#DEDDD8` in JSX. Use `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-subtle`, `text-ink`, `text-ink-strong`, `text-ink-secondary`, `text-ink-muted`, `border-line`, `border-line-strong`, `bg-accent`, `bg-success-subtle`, etc. via `@theme`.
- **No bracket literals**: never `h-[360px]`, `w-[448px]` etc unless truly unavoidable and documented. Use Tailwind scale `h-14`, `max-w-md`, `w-[300px]` is allowed only for sidebar `300px` per spec but prefer `w-72` etc when possible — document exceptions.
- **Typography**: `text-2xs 10px`, `text-xs 12px`, `text-sm 14px`, `text-hero 48/52 -0.02em`, `text-section 30/36 -0.01em`, `text-card-title 16/24`, `text-metric-value 36/40`, `font-sans Instrument Sans`, `font-mono JetBrains Mono`, `font-serif Source Serif 4`.
- **Control heights**: `xs 24 h-6` (dense row actions), `sm 32 h-8` (all `PR-FILTER-BAR`, toolbars, `CO-CHILD-NAVBAR`), `md 36 h-9` (default form fields, drawers, `CO-PAGE-HEADER` CTAs), `lg 40 h-10` (prominent auth/hero).
- **Shadows & radii**: `shadow-sm 0 1px 2px rgba(0,0,0,0.04)` cards, `shadow-md 0 4px 12px rgba(0,0,0,0.08)` hero mock/pricing popular/auth card/drawer, `shadow-lg 0 8px 24px rgba(0,0,0,0.12)` modals; `rounded-xs 3px` badges, `rounded-sm 4px` buttons/inputs, `rounded-md 6px` modals/drawers, `rounded-lg 12px` hero mock/pricing/testimonial/auth, `rounded-xl 16px` future.

---

## 4. Primitive & Component Rules (PR / CO)

- **PR consumes DS exclusively** via `@theme`; supports `sizeVariant` where applicable; has `aria-*`, `role`, keyboard.
- **CO composes PR exclusively**; never imports raw Tailwind bracket colors; localizes via `useI18n()`; validates via `src/services/formSecurity.ts` (`FORM-SEC-01` — blocks `<script>`, `on*=`, `javascript:`, etc., with `placeholder+hint` + `error role=alert aria-invalid` + `isLoading` spinner + `disabled` lock).
- **Control dimension invariant**: any `PR-FILTER-BAR` region must use `sm 32px h-8` uniformly across `PR-INPUT`/`PR-SELECT`/`PR-TABS`/`PR-BUTTON`.
- **One dataset → one filter model → one filter region** (`PR-FILTER-BAR`) — never split filter state across parent + child.
- **Drawer sizing**: `PR-DRAWER-SM 340px` (Invite Member, Transfer Ownership), `MD 420px` (New Collection, Upload, Create Embed), `LG 520px` (complex). Content complexity drives size, not page identity. Use `scopeBanner` (`WHAT WHERE WHO/WHAT`) for mutations.

---

## 5. Surfaces & Page Archetypes (SU / PA)

- **PA-LANDING**: `max-w-7xl mx-auto px-6 py-16 md:py-24`, no sidebar, no app shell, 13 surfaces stacked, header `AnnouncementBanner + h-14 sticky top-0 z-20` (logo + nav Producto/Integración/Precios/FAQ + CTAs Iniciar sesión/Empieza gratis), anchor nav, pricing toggle `monthly|annual -20%`, FAQ single-expand, integration tabs `widget|panel|fullscreen`, footer 4-col `grid-cols-2 md:grid-cols-4 gap-8`, `text-ink` headings `text-xs` links, bottom `© ES/EN quiet technical`.
- **PA-AUTH**: full viewport `bg-canvas`, centered `max-w-md 448px`, `bg-surface border-line rounded-lg shadow-md p-8`, minimal header `h-14` logo O + `CO-LANGUAGE-SELECTOR EN|ES`, card `title/subtitle` + form (`Input tu@empresa.com hint`, `PasswordInput ••• show/hide strength`, `Checkbox`, `Button isLoading`, `AuthDivider o`, `SsoButtons Pronto`, footer `¿No tienes cuenta? Regístrate`) + below `AuthTrustFooter` (`Citas verificables • Permisos por rol • Sin tarjeta` + `Términos·Privacidad`) + bottom `©`, `FORM-SEC-01`, 5-Link Auth Chain, `TIER_AUTH_5_PER_15M` generic `401 Credenciales inválidas`, `429`.
- **PA-DOCS**: `DocsLayout` — `DocsHeader` + sidebar `w-[300px] border-r bg-surface sticky top-14 h-[calc(100vh-56px)]` (single-expand, `COL-PUBLIC+COL-DOCS+COL-LEGAL 18` public + `COL-INTERNAL` auth, `font-semibold text-xs tabular-nums`) + main `flex-1 min-w-0 px-6 py-8 md:py-12 max-w-3xl/4xl` + right rail `w-[200px]` TOC + `LandingFooter`; `ContentRenderer PUBLIC_DOC` deterministic + `DogfoodInlineBot` dynamic; *ridiculously easy* additions: Edit this page, Copy MD, Share, Ask about page `currentUrl`, Feedback, Source chips, Next-Step CTA verified, Version badge `knowledgeVersion+updatedAt`, Was helpful?, Search hybrid, Report Issue, View source, History, Related docs, TOC hover `#`, Language switch, Auth-gated specs.
- **PA-PUBLIC**: single column `max-w-7xl` or `max-w-3xl` centered, `py-16 md:py-24`, no sidebar, `AnnouncementBanner` + minimal header + footer, `AboutView` pillars/metrics/dogfooding, `ContactView` `ContactForm` + info, `LegalView` `ContentRenderer PUBLIC_DOC` + `EMB-PUBLIC-LEGAL` Ask.
- **Workspace archetypes** (see `04_top_screens_audit_and_standardization.md`): `PA-DIRECTORY` (Collections, Embeds list) / `PA-DATA-DIRECTORY` (Files) / `PA-CONSOLE` (Test Console viewport-bounded) / `PA-INSPECTOR` (Conversations viewport-bounded) / `PA-SYSTEM-CONFIGURATION` (Settings) + persistent child `PA-RESOURCE-DETAIL` (Collection Detail) / `PA-EDITOR` (File Editor) / `PA-RESOURCE-CONFIGURATION` (Embed Detail `CO-CHILD-NAVBAR 24px axis` + `PR-TABS 1 of 3` + `APP-05 installation max-w-3xl`).

---

## 6. Workflows & Invariants (WF)

- Before mutating, verify **semantic scope** (`WHAT WHERE WHO/WHAT` via `scopeBanner` / `lockedCollectionId` lock).
- Verify **interaction affordance** (`PR-CARD interactive` only when `onClick` + `role=button tabIndex=0`, nested actions `stopPropagation()`).
- Verify **sidebar posture** (`DS-SIDEBAR-POSTURE-001`): `sidebarPosture expanded 240 | collapsed 56 rail` is persistent shell state, **never** mutated by `navigationContext workspace|resource` transitions or `Back`/`Browser Back` (see 10-row behavioral matrix in `01_ui_foundation §5.3`).
- Verify **global vs simulation state**: `CO-ACCOUNT-MENU` global persona switch ≠ `PA-CONSOLE` test `Scope/Identity/Route` simulation.
- All workflows in `04_workflows.md` (`WF-LANDING-01`, `WF-PRICING-01`, `WF-AUTH-*`, `WF-SETUP-01`, `WF-EMBED-01..05`, `WF-FORM-SEC-01`) must remain green; `npx next build` must pass 26 routes.

---

## 7. Agent Operating Procedure

- **Branch**: always `arena/c1ccdf80-okengine` (session-fixed); never switch/create/push to other branches; `git push origin arena/c1ccdf80-okengine`; PR from this branch (`gh pr merge/close` with explicit number, last command, no `--auto`).
- **Commits**: atomic, conventional (`feat(PR):`, `feat(CO):`, `feat(SU):`, `feat(PA):`, `fix(DS):`, `docs(STATUS):`), no large datasets in Git (`bun.lock` etc only if needed).
- **Servers**: `start_process` with `0.0.0.0`, allowlist preview host `https://{port}-{sandbox}.e2b.app`, relative URLs, never `localhost` in browser code.
- **Verification**: after any UI change, run `npx next build` (must `Compiled successfully` 26 routes) and `npm run lint` (0 errors). Keep `homepage-tour-readiness 52/52` + `embed-authorization 29/29` green.
- **File hygiene**: `src/index.css` DS single source, `src/components/ui/index.ts` PR barrel, `src/components/landing/index.ts` + `src/components/docs/index.ts` + `src/components/auth/index.ts` CO barrels.

---

## 8. Current Status Pointer

See `docs/UI-ALIGNMENT-STATUS.md` for the live continuation log (v3.1 2026-10-11) — it documents what is **ALIGNED** and the **§8 next steps** (i18n full migration, `lg` auth controls, public header DRY, etc.). If that file is missing in your checkout, run:

```bash
ls docs/UI-ALIGNMENT-STATUS.md || echo "missing — regenerate from docs/01_ui_foundation.md + 02_component_catalog.md + 03_page_specifications.md + 04_top_screens_audit_and_standardization.md + PLAN-006"
```

and recreate it from the templates in this repo’s history.

---

*Quiet technical, editorial utility — max-w-7xl, py-16 md:py-24, warm canvas #F8F7F4, white surface #FFFFFF, ink #171717 strong #0F172A, cobalt #1D4ED8, shadow-sm/md/lg, radius-sm/md/lg — real metrics only.*

