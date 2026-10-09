# 01 — UI Foundation: Quiet Technical Architecture

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
- `DS-COLOR-CANVAS` (`--color-canvas` / `bg-canvas`): `#F8F7F4` (Warm paper)
- `DS-COLOR-ELEVATED` (`--color-elevated` / `bg-elevated`): `#FAF9F6` (Secondary wells & subtle headers)
- `DS-COLOR-SURFACE` (`--color-surface` / `bg-surface`): `#FFFFFF` (Clean white cards, panels, tables)
- `DS-COLOR-SUBTLE` (`--color-subtle` / `bg-subtle`): `#F1F0EC` (Hover & subtle badge background)
- `DS-COLOR-INK` (`--color-ink` / `text-ink`): `#171717` (Deep neutral black)
- `DS-COLOR-INK-SECONDARY` (`--color-ink-secondary` / `text-ink-secondary`): `#6B6B67` (Neutral charcoal)
- `DS-COLOR-INK-MUTED` (`--color-ink-muted` / `text-ink-muted`): `#8C8B85` (Monospace metadata, timestamps)
- `DS-COLOR-LINE` (`--color-line` / `border-line`): `#DEDDD8` (1px hairline gray)
- `DS-COLOR-LINE-STRONG` (`--color-line-strong` / `border-line-strong`): `#C5C4BE` (Emphasized border)
- `DS-COLOR-ACCENT` (`--color-accent` / `text-accent`): `#1D4ED8` (Disciplined cobalt)
- `DS-COLOR-SUCCESS` (`--color-success` / `text-success`): `#15803D` (Forest green)
- `DS-COLOR-WARNING` (`--color-warning` / `text-warning`): `#B45309` (Amber)
- `DS-COLOR-DANGER` (`--color-danger` / `text-danger`): `#B91C1C` (Crimson)

### Typography Scale & Font Families
- Primary Sans (`--font-sans` / `font-sans`): `Instrument Sans`, sans-serif (weights 400, 500, 600)
- Monospace / Tabular (`--font-mono` / `font-mono`): `JetBrains Mono`, monospace (`tabular-nums`)
- Editorial Serif (`--font-serif` / `font-serif`): `Source Serif 4`, serif
- Type Scale Tokens:
  - `text-2xs`: `0.625rem` (`10px`) — Technical tags, badges, uppercase labels
  - `text-xs`: `0.75rem` (`12px`) — Dense controls, table cells, secondary copy
  - `text-sm`: `0.875rem` (`14px`) — Standard body copy and document prose

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


