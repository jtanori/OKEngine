# 01 — UI Foundation: Quiet Technical Architecture

| Field | Value |
| :--- | :--- |
| **Document ID** | `01_ui_foundation` |
| **Status** | `APPROVED — v3.1` |
| **Owner** | Design System |
| **Authority** | Blocking |
| **Dependencies** | `00_product_contract`, `SEC-01`, `PLAN-001`, `PLAN-002`, `PLAN-003`, `PLAN-006` |
| **Revision** | `3.1 (2026-10-12)` — DS ground-up audit: token-spec convergence (subtle/line-strong/ink-strong), font convergence (Inter active), alias tokens, landing band rule |

## v3.1 Changelog (from v3.0)

- **DS Token–Spec Convergence**: Aligned implementation `src/index.css` with spec — `DS-COLOR-SUBTLE` `#F1F0EC → #F4F4F0` (lighter, less gray mass on marketing bands), `DS-COLOR-LINE-STRONG` `#C5C4BE → #C7C6C0`, added missing `DS-COLOR-INK-STRONG` `#0F172A` (`--color-ink-strong`/`text-ink-strong`) to token table, documented `--text-display`/`--text-body` aliases as legacy compat (canonical `text-hero`/`text-section`/`text-card-title`/`text-metric-value` remain).
- **Font Convergence**: Spec `font-sans` was `Instrument Sans` but active implementation and `arena.site` target use `Inter` (loaded via `next/font`, optimized). Spec updated to `Inter` with `Instrument Sans` retained as editorial-optional fallback; `Source Serif 4` + `JetBrains Mono` unchanged.
- **Marketing Band Rule** (new §1.3): `PA-LANDING` generic sections MUST use `bg-canvas` (no `bg-elevated`/`bg-surface` + `border-y` full-width bands); `bg-surface` reserved for cards/panels, `bg-elevated` for wells/inputs, `bg-subtle` for hover/badge only. This prevents the “too many gray and black items” accumulation seen in `LogoStrip/Metrics/HowItWorks/Integration/Testimonials/FAQ` before ground-up fix.
- **No New Tokens**: Geometry (`xs 3px / sm 4px / md 6px / lg 12px / xl 16px`), elevation (`sm 0 1px 2px 0.04 / md 0 4px 12px 0.08 / lg 0 8px 24px 0.12`), control heights (`xs 24 h-6 / sm 32 h-8 / md 36 h-9 / lg 40 h-10`), spacing (`section-y 6rem / mobile 4rem`) unchanged and verified.

## v3.0 Changelog (from v2.0)

- **DS Tokens Extended**: Added `--text-strong` #0F172A, `--text-hero` 48px/52px -0.02em, `--text-section` 30px/36px -0.01em, `--text-card-title` 16px/24px, `--text-metric-value` 36px/40px, `--radius-lg` 12px, `--radius-xl` 16px, `--shadow-sm` 0 1px 2px rgba(0,0,0,0.04), `--shadow-md` 0 4px 12px rgba(0,0,0,0.08), `--shadow-lg` 0 8px 24px rgba(0,0,0,0.12), `--spacing-section-y` 6rem, `--spacing-section-y-mobile` 4rem
- **PR Taxonomy Extended**: Added 16 new primitives from PLAN-001/002: PR-ANNOUNCEMENT-BANNER, PR-METRIC, PR-PRICING-TOGGLE, PR-TESTIMONIAL-CARD, PR-FAQ-ACCORDION, PR-CODE-SNIPPET, PR-LOGO-STRIP, PR-INTEGRATION-TABS, PR-FEATURE-CARD, PR-HOW-IT-WORKS-STEP, PR-CHAT-MOCK, PR-PRICING-CARD, PR-AUTH-CARD, PR-PASSWORD-INPUT, PR-AUTH-DIVIDER, PR-TRUST-BADGE
- **Principles Added** (10-13): 10 Editorial Whitespace (py-16 mobile py-24 desktop, max-w-7xl, 24px gap), 11 Real Metrics Only (≥98% cited, -73% tickets, 1k free queries, 3 lines code — no fabricated), 12 Shadow Restraint (shadow-sm for cards, md for hero mock/pricing popular/auth card, lg for modals/drawers), 13 Radius Scale Extension (xs 3px, sm 4px, md 6px, lg 12px for hero mock/pricing/testimonial/auth, xl 16px future)
- **Archetypes Added**: PA-LANDING (marketing landing 12 surfaces, max-w-7xl, no sidebar, public surface, editorial whitespace) and PA-AUTH (centered card max-w-md, canvas #F8F7F4, white surface, cobalt accent, rounded-lg shadow-md)
- **Surfaces Added**: SU-LANDING-* (13 surfaces) and SU-AUTH-* (5 surfaces) — see UI-01 v3.0
- **Sidebar Posture Note**: Marketing surfaces PA-LANDING and PA-AUTH have no sidebar, full viewport, max-w-7xl or max-w-md centered, not affected by DS-SIDEBAR-POSTURE-001

---

The UI Foundation follows the strict five-layer hierarchy:

```text
DS (Design System Tokens — src/index.css @theme)
       ↓
PR (UI Primitives — src/components/ui/*)
       ↓
CO (Domain Components — src/components/*)
       ↓
SU (Surfaces — SURF-PUBLIC, SURF-WORKSPACE, SU-*)
       ↓
PA / PAGE (Page Archetypes & Canonical Routes)
```

> **Architectural North Star**: Standardize behavioral contracts and interaction language, not visual templates. A new page should compose an existing `PA-*` archetype; it should not invent a new page grammar.

---

## 1. Design System — `DS-*` (`src/index.css`)

### Visual Color Tokens
- `DS-COLOR-CANVAS` (`--color-canvas` / `bg-canvas`): `#F8F7F4` (Warm paper — primary viewport)
- `DS-COLOR-ELEVATED` (`--color-elevated` / `bg-elevated`): `#FAF9F6` (Secondary wells, code headers, table headers, inputs — never full-width marketing bands)
- `DS-COLOR-SURFACE` (`--color-surface` / `bg-surface`): `#FFFFFF` (Cards, panels, tables, active panels)
- `DS-COLOR-SUBTLE` (`--color-subtle` / `bg-subtle`): `#F4F4F0` (Hover & badge wells — v3.1 lightened from `#F1F0EC` to cut gray mass vs. `arena.site` target)
- `DS-COLOR-INK` (`--color-ink` / `text-ink`): `#171717` (Primary headings/body)
- `DS-COLOR-INK-STRONG` (`--color-ink-strong` / `text-ink-strong` / `bg-ink-strong`): `#0F172A` (Navy for hero H1 + dark landing bands Developers/FinalCTA/Footer — v3.0 extended, now documented)
- `DS-COLOR-INK-SECONDARY` (`--color-ink-secondary` / `text-ink-secondary`): `#6B6B67` (Subtitles, descriptions)
- `DS-COLOR-INK-MUTED` (`--color-ink-muted` / `text-ink-muted`): `#8C8B85` (Monospace metadata, timestamps)
- `DS-COLOR-LINE` (`--color-line` / `border-line`): `#DEDDD8` (1px hairline — card/table boundaries, not section dividers)
- `DS-COLOR-LINE-STRONG` (`--color-line-strong` / `border-line-strong`): `#C7C6C0` (Emphasized border — v3.1 from `#C5C4BE` to match implementation)
- `DS-COLOR-ACCENT` (`--color-accent` / `text-accent`): `#1D4ED8` (Cobalt — citations, active badges) + `DS-COLOR-ACCENT-HOVER` `#1E40AF`, `DS-COLOR-ACCENT-SUBTLE` `#EFF6FF`
- `DS-COLOR-SUCCESS` / `SUCCESS-SUBTLE`: `#15803D` / `#F0FDF4` — `WARNING` `#B45309`/`#FFFBEB` — `DANGER` `#B91C1C`/`#FEF2F2`
- `DS-ALIASES` (legacy compat): `--text-display 1.875rem/2.25rem -0.01em` (=`text-section`), `--text-body 0.875rem/1.25rem` (=`text-sm`) — canonical remains `text-hero`/`text-section`/`text-card-title`/`text-metric-value`

### Typography Scale & Font Families
- Primary Sans (`--font-sans` / `font-sans`): `Inter`, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif (weights 400, 500, 600, 700) — **v3.1 spec now matches implementation** (was `Instrument Sans` in v3.0; `Instrument Sans` retained as docs-optional editorial fallback).
- Monospace / Tabular (`--font-mono` / `font-mono`): `JetBrains Mono`, "Fira Code", monospace (`tabular-nums` — tabular numbers for pricing/metrics)
- Editorial Serif (`--font-serif` / `font-serif`): `Source Serif 4`, serif
- Type Scale Tokens (canonical):
  - `text-2xs`: `0.625rem` (`10px`) — badges, uppercase labels
  - `text-xs`: `0.75rem` (`12px`) — dense controls, table cells, secondary
  - `text-sm`: `0.875rem` (`14px`) — body prose
  - `text-hero`: `3rem`/`3.25rem` `-0.02em` — landing hero H1 (`text-ink-strong`)
  - `text-section`: `1.875rem`/`2.25rem` `-0.01em` — section H2s
  - `text-card-title`: `1rem`/`1.5rem` — feature/testimonial card titles
  - `text-metric-value`: `2.25rem`/`2.5rem` — metrics bar
  - Aliases: `text-display` (=`text-section`), `text-body` (=`text-sm`) for legacy compat

### Geometry, Elevation & Control Height Tokens
- `rounded-xs`: `3px` (`--radius-xs`) — Compact badges, inline code, inner segmented tab pills
- `rounded-sm`: `4px` (`--radius-sm`) — Buttons, inputs, selects, segmented tab tracks, cards, tables
- `rounded-md`: `6px` (`--radius-md`) — Modals, drawers, floating widget containers
- Dividers: `1px solid` hairline (`border-line`) rather than heavy drop shadows.
- **Canonical 4-Tier Control Height Scale (`DS-CONTROL-HEIGHT-*`)**:
  - `xs` (`24px` / `h-6`): Micro inline controls, dense table row action buttons, and compact header chips (`PR-BUTTON`, `PR-TABS`).
  - `sm` (`32px` / `h-8`): **Canonical height for all `PR-FILTER-BAR`, simulation toolbar, and `CO-CHILD-NAVBAR` controls** (`PR-INPUT`, `PR-SELECT`, `PR-TABS`, `PR-BUTTON`).
  - `md` (`36px` / `h-9`): **Canonical default height for standalone form fields, drawers, and `CO-PAGE-HEADER` primary actions** (`PR-INPUT`, `PR-SELECT`, `PR-TABS`, `PR-BUTTON`).
  - `lg` (`40px` / `h-10`): Prominent authentication and public hero controls (`PR-INPUT`, `PR-SELECT`, `PR-BUTTON`).

---

## 2. UI Primitives — `PR-*` (`src/components/ui/`)

Domain-agnostic building blocks that consume `DS-*` exclusively (zero bracket literals or hardcoded hex):

- `PR-BOX` (`Card.tsx` → `Box`): Surface-aware structural container (`surface`: `surface` | `elevated` | `canvas` | `subtle`).
- `PR-CARD` (`Card.tsx` → `Card`, `CardHeader`, `CardSection`): Bordered 1px hairline card container (`rounded-sm`). Enforces the **Interaction Affordance Invariant**: `interactive` styling is bound strictly to cards with an active click/keyboard handler (`role="button"`, `tabIndex={0}`).
- `PR-DIVIDER` (`Card.tsx` → `Divider`): 1px hairline horizontal or vertical separator.
- `PR-TEXT` (`Text.tsx` → `Text`): Semantic typography primitive (`variant`: `h1` | `h2` | `h3` | `body` | `caption` | `mono` | `label`; `tone`: `primary` | `secondary` | `muted` | `accent` | `success` | `warning` | `danger`).
- `PR-BUTTON` (`Button.tsx` → `Button`): Strict button variants (`primary`, `secondary`, `ghost`, `danger`, `accent`), canonical sizes (`xs` `24px`, `sm` `32px`, `md` `36px`, `lg` `40px`), and `isLoading` state (`Loader2` spinner + `disabled` double-submit prevention).
- `PR-BADGE` (`Badge.tsx` → `Badge`, `AccessBadge`, `StatusIndicator`): Semantic status indicator (inline or high-contrast `solid` badge variants: `solid-success`, `solid-warning`, `solid-accent`, `solid-danger`) and 3-tier clearance badge (`everyone` → `Public`/`Público`, `members` → `Members`/`Miembros`, `admins` → `Admins`/`Administradores`).
- `PR-INPUT` & `PR-TEXTAREA` (`Input.tsx` → `Input`, `Textarea`): Accessible form controls supporting `sizeVariant` (`sm` `32px`, `md` `36px`, `lg` `40px`), flex-centered `leadingIcon` / `trailingElement` slots, explicit `label`, `placeholder`, `hint` (`aria-describedby`), `error` (`aria-invalid="true"`, `role="alert"`), `disabled` styling, and zero outer vertical margin when rendered inline without auxiliary text.
- `PR-SELECT` (`Select.tsx` → `Select`): Accessible `<select>` primitive (`appearance-none`) supporting `sizeVariant` (`sm` `32px`, `md` `36px`, `lg` `40px`), `options` array or `children`, flex-centered `leadingIcon` and custom `ChevronDown` indicator, `label`, `hint`, `error` (`aria-invalid="true"`, `role="alert"`), and zero outer vertical margin when rendered inline.
- `PR-TABS` (`Tabs.tsx` → `SegmentedTabs`): Segmented button switcher (`xs` `24px`, `sm` `32px`, `md` `36px`) with explicit height tokens (`h-6`, `h-8`, `h-9`) and `h-full` inner tab buttons (`rounded-xs` inside `rounded-sm` `p-0.5` track).
- `PR-FILTER-BAR` (`FilterBar.tsx` → `FilterBar`): Canonical responsive filter region container (`searchSlot`, `filtersSlot`, `summarySlot`) enforcing **One dataset → one filter model → one filter region** and the **Control Dimension Invariant** (`sm` `32px` / `h-8` across all filter-bar inputs, selects, and segmented tabs).
- `PR-TABLE` (`Table.tsx` → `TableContainer`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`): High-density tabular data primitives.
- `PR-MODAL` (`Modal.tsx` → `Modal`): Centered keyboard-accessible overlay dialog (`rounded-md`) reserved for destructive confirmations and navigation guards.
- `PR-DRAWER` (`Drawer.tsx` → `Drawer`): Slide-in edge panel (`left` or `right`) with semantic complexity sizing (`size`: `'sm'` [`340px`] | `'md'` [`420px`] | `'lg'` [`520px`]), optional `scopeBanner` slot for explicit mutation scope (`WHAT`, `WHERE`, `WHO/WHAT`), `maxWidth` guard (`min(380px, 40%)` inline / `min(420px, 92vw)` overlay), automatic normalization of `100%` widths, inner `min-w-0 overflow-x-hidden` container, and right-aligned `headerActions` slot.
- `PR-CODE-BLOCK` (`CodeBlock.tsx` → `CodeBlock`): Dark/elevated monospace snippet viewer with one-click copy.
- `PR-EMPTY-STATE` (`EmptyState.tsx` → `EmptyState`): Standardized empty-state card with icon, title, description, and action slot.
- `PR-ACCORDION` (`Accordion.tsx` → `Accordion`): Single-expand collapsible accordion container with stronger header typography (`font-sans text-xs font-semibold text-ink`), chevron rotation indicator, and tabular item counter.
- `PR-CHECKBOX` (`Checkbox.tsx` → `Checkbox`): Accessible checkbox control (`role="checkbox"`, `aria-checked`, `aria-invalid`, `aria-describedby`) with custom 1px hairline check indicator, rich ReactNode label slot, `hint` helper text, `disabled` state, and validation `error` (`role="alert"`).
- `PR-INFO-POPOVER` (`InfoPopover.tsx` → `InfoPopover`): Keyboard-accessible `?` help icon button (`HelpCircle`) and progressive-disclosure popover surfacing internal system IDs (`EMB-*`, `COL-*`, `SU-EMBED-*`, `doc_*`) and specification contracts (`CACHE-001`, `ENGINE-01`, `SECURITY-001`) on demand.
- `FORM-SEC-01` (`src/services/formSecurity.ts`): Centralized input sanitization and validation contract blocking XSS/script tags, event handlers (`onload=`, `onerror=`), and dangerous protocols (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`).

---

## 3. Domain Components — `CO-*` (`src/components/`)

Functional UI compositions built strictly from `PR-*` primitives and localized via `useI18n()`:

- `CO-APP-SHELL` & `CO-SIDEBAR` (`AppShell.tsx`): Application shell that owns persistent, route-independent `sidebarPosture` (`'expanded'` `240px` | `'collapsed'` `56px` rail — `DS-SIDEBAR-POSTURE-001`, persisted in local shell storage `okeng.shell.sidebarPosture`), shell-trigger behavior (`DS-SHELL-TRIGGER`, `z-30`), and structural `navigationContext` (`'workspace' | 'resource'`). Route changes and `navigationContext` transitions NEVER determine, reset, or mutate `sidebarPosture`; only explicit user interaction with `DS-SHELL-TRIGGER` changes `sidebarPosture`.
- `CO-PAGE-HEADER` (`PageHeader.tsx`): Canonical Level-2 context primitive (`sticky top-0 z-20`) for top-level workspace pages (`navigationContext: 'workspace'` — `32px` horizontal axis). Consumes `isSidebarCollapsed` strictly for collapsed-state trigger clearance (`Visual ownership ≠ behavioral ownership`: `px-8` when expanded; `pl-14 pr-8` when collapsed).
- `CO-CHILD-NAVBAR` (`ChildContextNavbar.tsx`): Canonical Level-2 context primitive (`sticky top-0 z-20`) for persistent child-resource pages (`navigationContext: 'resource'` — `24px` horizontal axis). Surface 1 (`h-11`) applies `px-6` when expanded and `pl-12 pr-6` when collapsed for `DS-SHELL-TRIGGER` clearance; Surface 2 (`children`) and resource page content remain `px-6` / `p-6`.
- `CO-ACCOUNT-MENU` (`AppShell.tsx`): Compact sidebar footer account drop-up menu containing active workspace role & permission count header, Profile & Account Settings link, inline `CO-LANGUAGE-SELECTOR` (`EN` / `ES`), Quick Persona Switcher (`Owner` / `Member` / `Admin`), and `Sign Out` action.
- `CO-LANGUAGE-SELECTOR` (`LanguageSelector.tsx`): EN/ES UI language switcher (`compact` and `full` variants).
- `CO-VISIBILITY-SELECTOR` (`VisibilitySelector.tsx`): 3-tier access clearance switch (`everyone` | `members` | `admins`).
- `CO-ROLE-SELECTOR` (`RoleSelector.tsx`): Simulation clearance switcher for testing pre-retrieval filtering.
- `CO-COLLECTION-CARD` (`CollectionCard.tsx`): Conceptual entity summary card (`PA-DIRECTORY`) with visibility badge and document counters.
- `CO-EMBED-CARD` & `CO-EMBED-STATUS` (`EmbedCard.tsx`): Readiness-aware operational resource row/card (`PA-DIRECTORY`) whose full card body navigates to the URL-addressed `Embed Detail` (`/workspaces/:slug/embeds/:embedId`), exposing `[Installation Guide]`, `[Edit]`, `[Simulator]`, `[Duplicate]`, `[Delete]` when `readyForInstallation` is true, and `[Continue Configuration]` when Incomplete, alongside `evaluateEmbedInstallationContract` (`none` | `optional` | `required` signing evaluator).
- `CO-EMBED-INSTALLATION` (`EmbedInstallationView.tsx`): Dedicated centered single-column (`max-w-3xl mx-auto`) configuration-driven developer installation recipe (`APP-05` / `SU-EMBED-INSTALLATION`) at `/workspaces/:slug/embeds/:embedId/installation` (`/app/embed/:embedId/installation`) presenting `InstallationHeader`, `InstallationVerdict` (`Frontend-only installation` | `Frontend installation` | `Backend + frontend installation`), `EnvironmentSelector` (`[React | Vue | JavaScript]`), conditional `SERVER` / `BROWSER` numbered steps, single-action `VerificationStep` (`[Verify installation]`), and collapsed `Developer tools` (`INV-EMBED-05`–`INV-EMBED-12`).
- `CO-FILE-ROW` (`FileTable.tsx`): High-density operational document table (`PA-DATA-DIRECTORY` & `PA-RESOURCE-DETAIL`) with unified `PR-FILTER-BAR`, clickable rows opening `CO-MARKDOWN-EDITOR`, and isolated `stopPropagation()` row actions (`Re-index`, `Delete`). Enforces the **`scopedCollectionName` Filter Model Invariant**: when `scopedCollectionName` is provided (`PAGE-APP-02` `CollectionDetailView`), the table operates strictly against the already collection-scoped dataset supplied by the parent and MUST NOT render or maintain a competing collection filter or `Collection` column.
- `CO-UPLOAD-DROPZONE` (`UploadDropzone.tsx`): Drag-and-drop ingestion dropzone with stage progress (`Uploading` → `Processing` → `Ready`) and filename/content sanitization (`FORM-SEC-01`).
- `CO-UPLOAD-DRAWER` (`UploadDrawer.tsx`): Contextual file upload drawer (`PR-DRAWER-MD`) supporting both global mode (`PAGE-APP-04` `GlobalFilesView`, requiring explicit `Target Collection` selection) and collection-locked mode (`PAGE-APP-02` `CollectionDetailView`, via `lockedCollectionId`). Enforces the **`lockedCollectionId` Semantic Scope Lock Invariant**: `lockedCollectionId` is a semantic scope lock, not merely a UI convenience; when present, the upload mutation MUST resolve its destination exclusively from that ID, MUST NOT derive the destination from selected UI state or collection ordering, and omits the `Target Collection` selector.
- `CO-MARKDOWN-EDITOR` (`MarkdownEditor.tsx`): Full-height (`flex-1 min-h-0`) document authoring workspace (`PA-EDITOR`) with two stationary header surfaces (`Surface 1`: `CO-CHILD-NAVBAR` with `AccessBadge` + solid status badge; `Surface 2`: Stationary Document Identity + `[Next step ... ✎]` + `[Save & Index]`), two dedicated `PR-DRAWER-MD` panels (Document Details & Collection; Next-Step CTA), and synchronized `40px` (`h-10`) `Editor | Preview` pane headers.
- `CO-RBAC-MATRIX` (`RbacMatrix.tsx`): Canonical Dual RBAC Matrix (`AUTH-03`) table displaying Platform Roles vs. Workspace Roles, capabilities, and collection clearance rules inside `Settings > Members & RBAC`.
- `CO-CONTENT-RENDERER` (`src/content/renderer/content-renderer.tsx`): Canonical Normalized Content AST renderer powering all 10 presentation contexts.
- `CO-DOCUMENT-NAV` (`DocumentNav.tsx`): Single-expand collapsible collection navigation tree built on `PR-ACCORDION`.
- `CO-SOURCE-LIST` (`SourceList.tsx`): Grounded citation chip strip and source excerpt card list with optional `onOpenDocument` action to open cited files directly in `CO-MARKDOWN-EDITOR`.
- `CO-NEXT-STEP` / `CO-CTA-BUTTON` (`NextStepButton.tsx`): Verified document frontmatter next-step action button with defense-in-depth URL policy enforcement.
- `CO-FEEDBACK` (`FeedbackControl.tsx`): Helpful / Unhelpful feedback control and read-only audit badge.
- `CO-DOCUMENT-VIEWER` (`src/components/public/DocArticleRenderer.tsx`): Deterministic non-LLM Markdown article viewer.
- `CO-ASK-BOX` (`src/components/public/DogfoodInlineBot.tsx`): Inline dogfooding retrieval assistant bound to real workspace embeds.
- `CO-PUBLIC-FOOTER` (`src/pages/PublicSurfaceView.tsx`): 4-column canonical public footer (`Product`, `Resources`, `Company`, `Legal`).

---

## 4. Surfaces — `SU-*`

Domain-specific composable UI regions:

- **Top-Level Surface Domains**: `SURF-PUBLIC`, `SURF-AUTH`, `SURF-WORKSPACE`.
- **Workspace Surfaces**:
  - `SU-COLLECTION-DIRECTORY` (`Collections` — `PA-DIRECTORY`)
  - `SU-COLLECTION-DETAIL` (`Collection Detail` — `PA-RESOURCE-DETAIL`)
  - `SU-FILE-DIRECTORY` (`Files` — `PA-DATA-DIRECTORY`)
  - `SU-FILE-EDITOR` (`File Editor` — `PA-EDITOR`)
  - `SU-EMBED-DIRECTORY` (`Embeds List` — `PA-DIRECTORY`)
  - `SU-EMBED-RESOURCE-CONFIG` (`Embed Detail` — `PA-RESOURCE-CONFIGURATION`)
  - `SU-EMBED-INSTALLATION` (`APP-05 Dedicated Embed Installation Page` at `/workspaces/:slug/embeds/:embedId/installation` — `PA-RESOURCE-CONFIGURATION`)
  - `SU-EMBED-HOST-SIMULATOR` (`Host Simulator` — `PA-EMBEDDED-WIDGET`)
  - `SU-TEST-CONSOLE` (`Test Console` — `PA-CONSOLE`)
  - `SU-CONVERSATION-INSPECTOR` (`Conversations` — `PA-INSPECTOR`)
  - `SU-WORKSPACE-SETTINGS` (`Settings` — `PA-SYSTEM-CONFIGURATION`)
- **Embedded Host Surfaces**: `SU-EMBED-CHAT` (`widget`), `SU-EMBED-PANEL` (`panel` — bounded `360px` width, `min(380px, 40%)` max-width), `SU-EMBED-FULLSCREEN` (`fullscreen`), `SU-EMBED-INLINE` (`inline`), `SU-EMBED-DOCUMENTATION` (`documentation`), `SU-EMBED-CONTEXTUAL-HELP` (`contextual`).

---

## 5. Page Archetypes (`PA-*`) & The 9 Normative Principles

### 5.1 Canonical Page Archetype Taxonomy
- **Top-Level Workspace Archetypes (`navigationContext: 'workspace'` — `CO-PAGE-HEADER` + `32px` `DS-LAYOUT-AXIS`; works with both `expanded` and `collapsed` `sidebarPosture`)**:
  - `PA-DIRECTORY`: Browse and manage conceptual or operational collections of workspace resources (`Collections`, `Embeds List`).
  - `PA-DATA-DIRECTORY`: Find, filter, and operate on high-density tabular records (`Files`).
  - `PA-CONSOLE`: Configure simulation parameters, execute queries, and inspect live results and diagnostics in a viewport-bounded workspace (`Test Console`).
  - `PA-INSPECTOR`: Browse a filtered stream and inspect one selected item in a viewport-bounded master/detail workspace (`Conversations`).
  - `PA-SYSTEM-CONFIGURATION`: Navigate and modify workspace-wide settings with persistent section navigation and normal page scrolling (`Settings`).
- **Persistent Child-Resource Archetypes (`navigationContext: 'resource'` — `CO-CHILD-NAVBAR` + `24px` `DS-LAYOUT-AXIS`; works with both `expanded` and `collapsed` `sidebarPosture`)**:
  - `PA-RESOURCE-DETAIL`: Manage a single collection container and its scoped files (`Collection Detail`).
  - `PA-EDITOR`: Author and preview a persistent document resource in a viewport-bounded split workspace (`File Editor`).
  - `PA-RESOURCE-CONFIGURATION`: Configure an individual deployable resource across bounded configuration sections (`Embed Detail`).
- **Abstract Behavioral Family (Never directly assigned to a `PAGE`)**:
  - `PA-CONFIGURATION`: Abstract configuration grammar implemented concretely by `PA-SYSTEM-CONFIGURATION` and `PA-RESOURCE-CONFIGURATION`.
- **Host Simulator Archetype**:
  - `PA-EMBEDDED-WIDGET`: Multi-surface embedded host simulator (`PAGE-WIDGET`).

### 5.2 The 9 Frozen Normative Principles
1. **Standardize behavior, not templates.**
2. **One dataset → one filter model → one filter region (`PR-FILTER-BAR`).**
3. **Every mutation has explicit semantic scope (`WHAT`, `WHERE`, `WHO/WHAT`).**
4. **Interactive affordance must match its actual hit target.**
5. **Persistent resources switch into resource navigation context (`CO-CHILD-NAVBAR` + `24px` layout axis) and exit on return, without mutating `sidebarPosture`.**
6. **Drawers (`PR-DRAWER-SM | MD | LG`) preserve parent context; resource pages own complex workflows.**
7. **Global session state (`CO-ACCOUNT-MENU`) must never masquerade as local test/configuration state.**
8. **Operational workspaces (`PA-CONSOLE`, `PA-INSPECTOR`, `PA-EDITOR`) get bounded scrolling; directory/configuration pages don't.**
9. **Sidebar Posture & Layout Adaptability Invariant (`DS-SIDEBAR-POSTURE-001`, `DS-SHELL-TRIGGER`, `DS-LAYOUT-AXIS`, `DS-CONTAINER-WIDTH`)**:
   > **Sidebar posture is a persistent application-shell state independent of route and page archetype. `navigationContext` MUST NOT determine, reset, or mutate sidebar posture. Navigation between workspace and resource pages preserves the current sidebar posture. Only explicit user interaction with the sidebar toggle may change posture, except for responsive viewport constraints defined by the shell's responsive policy.**
   - `navigationContext` determines the page's Level-2 header archetype and horizontal layout axis (`workspace` = `CO-PAGE-HEADER` + `32px`; `resource` = `CO-CHILD-NAVBAR` + `24px`); `sidebarPosture` determines only shell width (`240px` vs. `56px` rail) and trigger clearance (`workspace + expanded → px-8`, `workspace + collapsed → pl-14 pr-8` on `CO-PAGE-HEADER`; `resource + expanded → px-6`, `resource + collapsed → pl-12 pr-6` on `CO-CHILD-NAVBAR` Surface 1 while Surface 2 and content remain `px-6` / `p-6`).
   - Page-level workspace containers are fluid (`w-full`) and must not use arbitrary `max-w-*` caps. Semantic descendant surfaces may remain bounded only when explicitly required by their page specification.
   - Header surfaces remain `sticky top-0 z-20`; the shell trigger remains `z-30`; page content remains `z-0`.

### 5.3 Canonical Sidebar Posture Behavioral Matrix (`DS-SIDEBAR-POSTURE-001`)

| Event | Expected Effect on Sidebar (`sidebarPosture`) |
| :--- | :--- |
| User clicks Collapse (`DS-SHELL-TRIGGER`) | `expanded → collapsed` (persisted in local shell preference) |
| User clicks Expand (`DS-SHELL-TRIGGER`) | `collapsed → expanded` (persisted in local shell preference) |
| User clicks collapsed nav item | **No change** |
| User clicks expanded nav item | **No change** |
| Navigate `workspace → resource` | **No change** |
| Navigate `resource → workspace` (`← Back`) | **No change** |
| Navigate `resource → resource` | **No change** |
| Browser Back | **No change** |
| Browser Forward | **No change** |
| Programmatic navigation | **No change** |
| Refresh | Restore persisted posture |
| Deep link | Restore persisted posture |
| Responsive breakpoint crossed | May adapt presentation according to responsive policy |
| Explicit user toggle after breakpoint | User preference wins where feasible |


