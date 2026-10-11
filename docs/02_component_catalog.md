# 02 — Component Catalog: Canonical Inventory (`PR-*` & `CO-*`)

| Field | Value |
| :--- | :--- |
| **Document ID** | `02_component_catalog` |
| **Status** | `APPROVED — v3.0` |
| **Owner** | Component Catalog |
| **Authority** | Blocking |
| **Dependencies** | `01_ui_foundation`, `UI-01`, `PLAN-001`, `PLAN-002`, `PLAN-003` |
| **Revision** | `3.0 (2026-10-11)` — Added 16 new PR primitives + 18 new CO components for landing + auth from proposal |

## v3.0 Changelog — New Primitives & Components from Proposal (PLAN-001, PLAN-002, PLAN-003)

### New PR Primitives (16) — `src/components/ui/`

| Primitive ID | File | Purpose | Tokens |
| :--- | :--- | :--- | :--- |
| `PR-ANNOUNCEMENT-BANNER` | `AnnouncementBanner.tsx` | Top full-width banner "Citas verificables y permisos por rol" | bg-subtle, border-line, text-ink-secondary, text-xs |
| `PR-METRIC` | `Metric.tsx` | Metric display value + label "-73% tickets" | text-ink, text-ink-secondary, text-metric-value, font-sans |
| `PR-PRICING-TOGGLE` | `PricingToggle.tsx` | Monthly/Annual toggle with -20% badge | bg-elevated, bg-surface, border-line, rounded-sm, accent |
| `PR-TESTIMONIAL-CARD` | `TestimonialCard.tsx` | Testimonial quote + author + role + company + metric | bg-surface, border-line, rounded-lg, shadow-sm |
| `PR-FAQ-ACCORDION` | `FaqAccordion.tsx` | FAQ accordion Q+A single expand | border-line, bg-surface, text-ink |
| `PR-CODE-SNIPPET` | `CodeSnippet.tsx` | Code block with language, copy button | bg-elevated, border-line, rounded-md, font-mono |
| `PR-LOGO-STRIP` | `LogoStrip.tsx` | Logo strip 6 logos monochrome | text-ink-muted, border-line |
| `PR-INTEGRATION-TABS` | `IntegrationTabs.tsx` | Tabs widget/panel/fullscreen with mock preview | bg-elevated, bg-surface, border-line, rounded-sm |
| `PR-FEATURE-CARD` | `FeatureCard.tsx` | Feature card icon + title + desc for 6 features | bg-surface, border-line, rounded-lg, shadow-sm/md |
| `PR-HOW-IT-WORKS-STEP` | `HowItWorksStep.tsx` | Step number + icon + title + desc + connector | bg-surface, border-line, text-ink, accent |
| `PR-CHAT-MOCK` | `ChatMock.tsx` | Chat mock UI header + messages + citations + input | bg-surface, border-line, rounded-lg, shadow-lg |
| `PR-PRICING-CARD` | `PricingCard.tsx` | Pricing tier card features + CTA + popular badge | bg-surface, border-line/ink, rounded-lg, shadow-sm/md |
| `PR-AUTH-CARD` | `AuthCard.tsx` | Centered card logo + title + subtitle + form + footer + trust | bg-surface, border-line, rounded-lg, shadow-md, bg-canvas |
| `PR-PASSWORD-INPUT` | `PasswordInput.tsx` | Input show/hide toggle + strength meter | border-line, rounded-sm, bg-surface, text-ink |
| `PR-AUTH-DIVIDER` | `AuthDivider.tsx` | Divider with "o"/"or" for SSO vs password | bg-line, text-ink-muted |
| `PR-TRUST-BADGE` | `TrustBadge.tsx` | Small badge "Sin tarjeta" etc | text-2xs, text-ink-muted |

All consume DS tokens via @theme, no hardcoded colors, a11y, sizeVariant where applicable.

### New CO Components (18) — `src/components/landing/` + `src/components/auth/`

| Component ID | File | Composition | Purpose |
| :--- | :--- | :--- | :--- |
| `CO-LANDING-HERO` | `landing/LandingHero.tsx` | PR-BOX + PR-TEXT + PR-BUTTON + PR-CHAT-MOCK + PR-BADGE | Hero split left copy + right chat mock, badges ≥98% con cita etc |
| `CO-LANDING-LOGO-STRIP` | `landing/LandingLogoStrip.tsx` | PR-LOGO-STRIP + PR-TEXT | Logo strip Nexora/Dataflow/Kubelab/Aurea/Pacted/Vanti |
| `CO-LANDING-METRICS` | `landing/LandingMetrics.tsx` | PR-METRIC x4 | Metrics bar 3 líneas, -73%, 99.9%, 0 datos entrenados |
| `CO-LANDING-HOW-IT-WORKS` | `landing/LandingHowItWorks.tsx` | PR-HOW-IT-WORKS-STEP x5 | 5 steps Files→Collections→Access→Context→Answer |
| `CO-LANDING-PRODUCT-FEATURES` | `landing/LandingProductFeatures.tsx` | PR-FEATURE-CARD x6 | 6 features MD, permisos, citas, BYOK, widget, analítica |
| `CO-LANDING-INTEGRATION` | `landing/LandingIntegration.tsx` | PR-INTEGRATION-TABS + mock + code | 3 modes widget/panel/fullscreen tabs + preview + 3 lines code |
| `CO-LANDING-DEVELOPERS` | `landing/LandingDevelopers.tsx` | PR-CODE-SNIPPET + PR-TEXT + list | Code HelpCenter.tsx + bullets API/webhooks/BYOK/EU/SDKs |
| `CO-LANDING-TESTIMONIALS` | `landing/LandingTestimonials.tsx` | PR-TESTIMONIAL-CARD x3 + PR-METRIC | 3 testimonials -73% etc + metrics |
| `CO-LANDING-PRICING` | `landing/LandingPricing.tsx` | PR-PRICING-TOGGLE + PR-PRICING-CARD x3 | Pricing 3 tiers Starter 0€ Pro 31€/24€ Escala custom + toggle |
| `CO-LANDING-FAQ` | `landing/LandingFaq.tsx` | PR-FAQ-ACCORDION | FAQ 6 Q integration time, data training, permissions, formats, no source, migration |
| `CO-LANDING-FINAL-CTA` | `landing/LandingFinalCta.tsx` | PR-BOX + PR-TEXT + PR-BUTTON | Final centered CTA Empieza a responder en minutos |
| `CO-LANDING-FOOTER` | `landing/LandingFooter.tsx` | PR-BOX + links + LanguageSelector | Footer 4 columns Producto/Desarrolladores/Empresa/Legal + bottom © |
| `CO-AUTH-LOGIN-FORM` | `auth/LoginForm.tsx` | PR-AUTH-CARD + PR-INPUT + PR-PASSWORD-INPUT + PR-BUTTON + PR-CHECKBOX + PR-AUTH-DIVIDER + CO-AUTH-SSO-BUTTONS + CO-AUTH-TRUST-FOOTER | Login form email, password, remember, forgot, submit, SSO, FORM-SEC-01, empty initial, placeholder+hint, field errors, isLoading, generic 401, 429 |
| `CO-AUTH-SIGNUP-FORM` | `auth/SignupForm.tsx` | Same + PR-CHECKBOX terms | Signup form name, email, password, terms, submit, SSO |
| `CO-AUTH-FORGOT-FORM` | `auth/ForgotPasswordForm.tsx` | PR-AUTH-CARD + PR-INPUT + PR-BUTTON | Forgot password email, submit, generic success no enumeration |
| `CO-AUTH-RESET-FORM` | `auth/ResetPasswordForm.tsx` | PR-AUTH-CARD + PR-PASSWORD-INPUT x2 + PR-BUTTON | Reset password new + confirm, strength, submit |
| `CO-AUTH-SSO-BUTTONS` | `auth/SsoButtons.tsx` | PR-BUTTON outline + icon | SSO buttons Google/GitHub/SAML placeholder Pronto |
| `CO-AUTH-TRUST-FOOTER` | `auth/AuthTrustFooter.tsx` | PR-TRUST-BADGE x3 + links | Trust badges Citas verificables, Permisos por rol, Sin tarjeta + terms/privacy |

### PA Archetypes Added

- `PA-LANDING`: Marketing landing page archetype — single column, max-w-7xl centered, section padding py-16 md:py-24, no sidebar, no app shell, public surface, minimal header logo + nav + CTAs, 12 surfaces stacked, footer 4 columns, anchor nav, pricing toggle state, FAQ accordion state, integration tabs state, i18n EN/ES, real metrics only
- `PA-AUTH`: Authentication page archetype — full viewport canvas #F8F7F4, centered card max-w-md 448px, white surface, border #DEDDD8, rounded-lg 12px, shadow-md, padding 32px, minimal header logo + EN/ES switch, card with AuthHeader + form + divider + SSO + footer links, below card trust badges + terms/privacy + ©, FORM-SEC-01, 5-Link Auth Chain, TIER_AUTH_5_PER_15M, generic 401, no enumeration, empty initial, placeholder+hint, field errors, isLoading+disabled

### SU Surfaces Added

See UI-01 v3.0 for full list: SU-LANDING-ANNOUNCEMENT, HERO, LOGOS, METRICS, HOW-IT-WORKS, PRODUCT, INTEGRATION, DEVELOPERS, TESTIMONIALS, PRICING, FAQ, FINAL-CTA, FOOTER (13) and SU-AUTH-LOGIN, SIGNUP, FORGOT, RESET, LAYOUT (5).

---

# Original v2.0 Content Below — Preserved

## 1. Layer 2 — UI Primitives (`src/components/ui/`)

## 1. Layer 2 — UI Primitives (`src/components/ui/`)

| Primitive ID | Implementation File | Exported Symbols | Consumes Tokens | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `PR-BOX` | `src/components/ui/Card.tsx` | `Box` | `bg-surface`, `bg-elevated`, `border-line`, `rounded-sm` | Generic surface-aware container |
| `PR-CARD` | `src/components/ui/Card.tsx` | `Card`, `CardHeader`, `CardSection` | `bg-surface`, `border-line`, `rounded-sm` | Standard 1px hairline card; enforces Interaction Affordance Invariant when `interactive` is true |
| `PR-DIVIDER` | `src/components/ui/Card.tsx` | `Divider` | `border-line` | Horizontal or vertical 1px structural rule |
| `PR-TEXT` | `src/components/ui/Text.tsx` | `Text` | `text-ink*`, `font-sans`, `font-mono`, `text-2xs`–`text-2xl` | Semantic typography primitive |
| `PR-BUTTON` | `src/components/ui/Button.tsx` | `Button`, `ButtonSize` | `bg-ink`, `bg-surface`, `border-line`, `rounded-sm`, `h-6`–`h-10` | Strict button variants (`primary`, `secondary`, `ghost`, `danger`, `accent`) and canonical sizes (`xs` `24px`, `sm` `32px`, `md` `36px`, `lg` `40px`) with `isLoading` spinner |
| `PR-BADGE` | `src/components/ui/Badge.tsx` | `Badge`, `AccessBadge`, `StatusIndicator` | `rounded-xs`, `text-2xs`, subtle & solid semantic status colors | Status indicators (`inline` or `solid` variants) and 3-tier clearance tags (`Public`/`Público`, `Members`, `Admins`) |
| `PR-INPUT` | `src/components/ui/Input.tsx` | `Input`, `InputSizeVariant` | `bg-elevated`, `border-line`, `rounded-sm`, `text-xs`, `h-8`–`h-10` | Accessible single-line input with `sizeVariant` (`sm` `32px`, `md` `36px`, `lg` `40px`), `leadingIcon`, `trailingElement`, label, hint, `aria-invalid`, and `role="alert"` error |
| `PR-TEXTAREA` | `src/components/ui/Input.tsx` | `Textarea` | `bg-elevated`, `border-line`, `rounded-sm`, `text-xs` | Accessible multiline text and Markdown input control with label, hint, and error |
| `PR-SELECT` | `src/components/ui/Select.tsx` | `Select`, `SelectSizeVariant`, `SelectOption` | `bg-elevated`, `border-line`, `rounded-sm`, `text-xs`, `h-8`–`h-10` | Accessible native select (`appearance-none`) with `sizeVariant` (`sm` `32px`, `md` `36px`, `lg` `40px`), custom `ChevronDown` indicator, `options` or `children`, label, hint, and error |
| `PR-TABS` | `src/components/ui/Tabs.tsx` | `SegmentedTabs`, `SegmentedTabsSize` | `bg-elevated`, `border-line`, `rounded-sm`, `h-6`–`h-9` | Segmented control switcher (`xs` `24px`, `sm` `32px`, `md` `36px`) with explicit height tokens and `h-full` inner tab buttons |
| `PR-FILTER-BAR` | `src/components/ui/FilterBar.tsx` | `FilterBar`, `FilterBarProps` | `bg-surface`, `border-line`, `rounded-sm` | Canonical responsive filter region (`searchSlot`, `filtersSlot`, `summarySlot`) enforcing one filter model per dataset and `sm` (`32px` / `h-8`) control height alignment |
| `PR-TABLE` | `src/components/ui/Table.tsx` | `TableContainer`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell` | `bg-surface`, `bg-elevated`, `border-line` | High-density tabular layout primitives |
| `PR-MODAL` | `src/components/ui/Modal.tsx` | `Modal` | `bg-surface`, `border-line`, `rounded-md` | Keyboard-accessible modal dialog for destructive confirmations and navigation guards |
| `PR-DRAWER` | `src/components/ui/Drawer.tsx` | `Drawer`, `DrawerProps`, `DrawerSize` | `bg-surface`, `border-line`, `backdrop-blur-xs` | Left/right slide-over drawer with semantic complexity sizes (`sm` `340px`, `md` `420px`, `lg` `520px`), `scopeBanner` slot, and overflow guard |
| `PR-CODE-BLOCK` | `src/components/ui/CodeBlock.tsx` | `CodeBlock` | `font-mono`, `rounded-sm`, `border-line` | Monospace code block with copy button |
| `PR-EMPTY-STATE` | `src/components/ui/EmptyState.tsx` | `EmptyState` | `PR-CARD`, `PR-TEXT` | Empty state container with icon and CTA slot |
| `PR-ACCORDION` | `src/components/ui/Accordion.tsx` | `Accordion`, `AccordionSection` | `bg-surface`, `bg-elevated`, `border-line`, `font-semibold` | Single-expand collapsible accordion primitive |
| `PR-CHECKBOX` | `src/components/ui/Checkbox.tsx` | `Checkbox`, `CheckboxProps` | `bg-elevated`, `bg-ink`, `border-line`, `rounded-xs` | Accessible checkbox with rich label, `hint`, `disabled`, and `role="alert"` validation state |
| `PR-INFO-POPOVER` | `src/components/ui/InfoPopover.tsx` | `InfoPopover`, `InfoPopoverProps`, `InfoPopoverItem` | `bg-surface`, `border-line`, `rounded-sm`, `font-mono` | Header `?` help button & popover surfacing internal IDs (`EMB-*`, `COL-*`, `SU-EMBED-*`) and spec details on demand |

---

## 2. Layer 3 — Domain Components (`src/components/` & `src/content/renderer/`)

| Component ID | Implementation File | Depends On (`PR-*` / `CO-*`) | Used By Pages / Surfaces |
| :--- | :--- | :--- | :--- |
| `CO-APP-SHELL` / `CO-SIDEBAR` | `src/components/AppShell.tsx` | `PR-DIVIDER`, `CO-LANGUAGE-SELECTOR`, `CO-ACCOUNT-MENU` | All `/workspaces/:workspaceSlug/*` (`SURF-WORKSPACE` — owns persistent route-independent `sidebarPosture` `'expanded' \| 'collapsed'` (`DS-SIDEBAR-POSTURE-001`), `DS-SHELL-TRIGGER` `z-30`, and structural `navigationContext` `'workspace' \| 'resource'`) |
| `CO-PAGE-HEADER` | `src/components/PageHeader.tsx` | `PR-TEXT`, `CO-APP-SHELL` | Canonical `sticky top-0 z-20` Level-2 context primitive for `'workspace'` archetypes (`32px` axis: `px-8` expanded / `pl-14 pr-8` collapsed clearance) |
| `CO-CHILD-NAVBAR` | `src/components/ChildContextNavbar.tsx` | `PR-BUTTON`, `PR-DIVIDER`, `PR-BADGE`, `CO-APP-SHELL` | Canonical `sticky top-0 z-20` Level-2 context primitive for `'resource'` archetypes (`24px` axis: Surface 1 `px-6` expanded / `pl-12 pr-6` collapsed clearance; Surface 2 `px-6`) |
| `CO-ACCOUNT-MENU` | `src/components/AppShell.tsx` | `PR-DIVIDER`, `CO-LANGUAGE-SELECTOR` | `AppShell` sidebar footer drop-up menu (Avatar + Name/Email trigger, Role header, Profile & Account Settings link, Inline Language Switcher, Quick Persona Switcher, Sign Out) |
| `CO-LANGUAGE-SELECTOR` | `src/components/LanguageSelector.tsx` | `PR-TABS` | `PublicSurfaceView`, `AppShell` (`CO-ACCOUNT-MENU`), `WidgetPreviewView` |
| `CO-VISIBILITY-SELECTOR` | `src/components/VisibilitySelector.tsx` | `PR-BADGE`, `PR-TEXT` | `CollectionsView`, `CollectionDetailView`, `EmbedConfigView` |
| `CO-ROLE-SELECTOR` | `src/components/RoleSelector.tsx` | `PR-TABS` | `TestConsoleView`, `WidgetPreviewView` |
| `CO-COLLECTION-CARD` | `src/components/CollectionCard.tsx` | `PR-CARD`, `PR-TEXT`, `PR-BADGE`, `PR-DIVIDER` | `CollectionsView` (`PAGE-APP-01` / `SU-COLLECTION-DIRECTORY`) |
| `CO-EMBED-CARD` / `CO-EMBED-STATUS` | `src/components/EmbedCard.tsx` | `PR-CARD`, `PR-BADGE`, `PR-BUTTON`, `PR-INFO-POPOVER` | `EmbedConfigView` Stage 1 (`PAGE-APP-05` / `SU-EMBED-DIRECTORY`), Stage 2, & `EmbedInstallationView` — readiness-aware resource card (`[Installation Guide]`, `[Edit]`, `[Simulator]`, `[Duplicate]`, `[Delete]`), derived `INCOMPLETE` / `DRAFT` / `READY` badge, and `evaluateEmbedInstallationContract` 3-state signing evaluator |
| `CO-EMBED-INSTALLATION` | `src/pages/EmbedInstallationView.tsx` | `CO-CHILD-NAVBAR`, `PR-CARD`, `PR-BOX`, `PR-BADGE`, `PR-TABS`, `PR-CODE-BLOCK`, `PR-SELECT`, `PR-BUTTON` | `PAGE-APP-05-INSTALL` (`SU-EMBED-INSTALLATION` at `/workspaces/:slug/embeds/:embedId/installation` & `/app/embed/:embedId/installation`) — configuration-driven developer installation page (`APP-05`) |
| `CO-FILE-ROW` | `src/components/FileTable.tsx` | `PR-FILTER-BAR`, `PR-TABLE`, `PR-INPUT`, `PR-SELECT`, `PR-BADGE`, `PR-BUTTON`, `PR-EMPTY-STATE` | `CollectionDetailView` (`PAGE-APP-02` / `SU-COLLECTION-DETAIL` — collection-scoped via `scopedCollectionName`), `GlobalFilesView` (`PAGE-APP-04` / `SU-FILE-DIRECTORY` — global directory) |
| `CO-UPLOAD-DROPZONE` | `src/components/UploadDropzone.tsx` | `PR-BOX`, `PR-TEXT`, `PR-BADGE`, `FORM-SEC-01` | `UploadDrawer` (`CO-UPLOAD-DRAWER`) |
| `CO-UPLOAD-DRAWER` | `src/components/UploadDrawer.tsx` | `PR-DRAWER` (`size="md"`), `PR-SELECT`, `PR-BADGE`, `CO-UPLOAD-DROPZONE` | `CollectionDetailView` (`PAGE-APP-02` — collection-locked via `lockedCollectionId`), `GlobalFilesView` (`PAGE-APP-04` — requires explicit `Target Collection` selection) |
| `CO-MARKDOWN-EDITOR` | `src/components/MarkdownEditor.tsx` | `CO-CHILD-NAVBAR`, `PR-INPUT`, `PR-TEXTAREA`, `PR-SELECT`, `PR-BUTTON`, `PR-DRAWER`, `PR-MODAL`, `CO-CONTENT-RENDERER`, `CO-NEXT-STEP`, `FORM-SEC-01` | `PAGE-APP-03` (`files/new`, `files/:fileId` / `SU-FILE-EDITOR`) |
| `CO-RBAC-MATRIX` | `src/components/RbacMatrix.tsx` | `PR-CARD`, `PR-TABLE`, `PR-BADGE`, `PR-TEXT` | `SettingsView` (`PAGE-APP-08` / `SU-WORKSPACE-SETTINGS`) — Dual RBAC Matrix (`AUTH-03`) |
| `CO-CONTENT-RENDERER` | `src/content/renderer/content-renderer.tsx` | `PR-BADGE`, `PR-BUTTON`, `PR-MODAL`, `PR-INPUT`, `PR-SELECT`, `FORM-SEC-01` | All 10 `RENDER-001` contexts across `SURF-PUBLIC`, `SURF-WORKSPACE`, `SU-EMBED-*` |
| `CO-DOCUMENT-NAV` | `src/components/DocumentNav.tsx` | `PR-ACCORDION`, `PR-TEXT` | `PublicSurfaceView` (`/docs`), `WidgetPreviewView` (`SU-EMBED-DOCUMENTATION`) |
| `CO-SOURCE-LIST` | `src/components/SourceList.tsx` | `PR-CARD`, `PR-BADGE`, `PR-BUTTON`, `PR-TEXT`, `CO-CONTENT-RENDERER` | `TestConsoleView` (`PAGE-APP-06`), `ConversationsView` (`PAGE-APP-07`), `WidgetPreviewView` — supports `onOpenDocument` to jump into `CO-MARKDOWN-EDITOR` |
| `CO-NEXT-STEP` / `CO-CTA-BUTTON` | `src/components/NextStepButton.tsx` | `PR-BUTTON`, `FORM-SEC-01` | `TestConsoleView`, `WidgetPreviewView`, `ConversationsView`, `MarkdownEditor` |
| `CO-FEEDBACK` | `src/components/FeedbackControl.tsx` | `PR-BADGE` | `TestConsoleView`, `WidgetPreviewView`, `ConversationsView` |
| `CO-DOCUMENT-VIEWER` | `src/components/public/DocArticleRenderer.tsx` | `PR-CARD`, `PR-TEXT`, `PR-BUTTON`, `PR-INFO-POPOVER`, `CO-CONTENT-RENDERER` | `PublicSurfaceView` (`/about`, `/docs`, `/terms`, `/privacy`, `/acceptable-use`), `WidgetPreviewView` |
| `CO-ASK-BOX` | `src/components/public/DogfoodInlineBot.tsx` | `PR-CARD`, `PR-BOX`, `PR-INPUT`, `PR-BUTTON`, `PR-INFO-POPOVER`, `CO-CONTENT-RENDERER`, `CO-NEXT-STEP`, `FORM-SEC-01` | `PublicSurfaceView` (`/`, `/about`, `/docs`, `/terms`), `WidgetPreviewView` — executes real `mode: 'embed'` queries with host-supplied identity & route context |
| `CO-PUBLIC-FOOTER` | `src/pages/PublicSurfaceView.tsx` | `PR-TEXT` | `PublicSurfaceView` (`SURF-PUBLIC` & `SURF-AUTH`) — 4-column footer (`space-y-2`) |

---

## 3. Normative Component Contract Invariants (`CO-UPLOAD-DRAWER`, `CO-FILE-ROW`, `CO-APP-SHELL`, `CO-EMBED-INSTALLATION`, `SU-TEST-CONSOLE` & `CO-ASK-BOX`)

### 3.1 `CO-UPLOAD-DRAWER` — `lockedCollectionId` Semantic Scope Lock Invariant
> **Invariant**: **`lockedCollectionId` is a semantic scope lock, not merely a UI convenience. When present, the upload mutation MUST resolve its destination exclusively from that ID; the component MUST NOT derive the destination from selected UI state or collection ordering.**
- **Abstraction Boundary**: *The drawer owns ingestion mechanics; the page owns semantic scope.*
- **When `lockedCollectionId` is present (`PAGE-APP-02` `CollectionDetailView`)**:
  - Destination resolves exclusively via `collections.find(c => c.id === lockedCollectionId)`.
  - The `Target Collection` `<Select>` dropdown is omitted.
  - `scopeBanner` displays the locked `Destination` collection and its `Pre-Retrieval Visibility` (`AccessBadge`).
- **When `lockedCollectionId` is absent (`PAGE-APP-04` `GlobalFilesView`)**:
  - The operator must explicitly select a `Target Collection` in `PR-SELECT` (never silently falling back to `collections[0]`).

### 3.2 `CO-FILE-ROW` (`FileTable`) — `scopedCollectionName` Filter Model Invariant
> **Invariant**: **When `scopedCollectionName` is provided, the table operates against the already collection-scoped dataset supplied by the parent. It MUST NOT render or maintain a competing collection filter.**
- Preserves **One dataset → one filter model → one filter region (`PR-FILTER-BAR`)**.
- **When `scopedCollectionName` is present (`PAGE-APP-02` `CollectionDetailView`)**:
  - `PR-FILTER-BAR` renders a collection-bounded `Search` input (`"Filter files in {collection} by title or filename..."`) and the `Status` `<Select>` filter only.
  - Neither the `Target Collection` `<Select>` filter nor the `Collection` table column is rendered.

### 3.3 `CO-APP-SHELL`, `CO-PAGE-HEADER` & `CO-CHILD-NAVBAR` — `DS-SIDEBAR-POSTURE-001` & Layout Adaptability Invariant
> **Invariant (`DS-SIDEBAR-POSTURE-001` & `Visual ownership ≠ behavioral ownership`)**:
> - `CO-APP-SHELL` owns persistent `sidebarPosture` (`'expanded' | 'collapsed'`, stored in local shell preference `okeng.shell.sidebarPosture`, never in URL state) and `DS-SHELL-TRIGGER` (`z-30`).
> - `navigationContext` (`'workspace' | 'resource'`) MUST NOT implicitly mutate `sidebarPosture`.
> - **Back Navigation Rule**: Back navigation (`← Back`, breadcrumb clicks, browser Back/Forward) MUST NOT modify `sidebarPosture`.
> - `CO-PAGE-HEADER` and `CO-CHILD-NAVBAR` (`sticky top-0 z-20`) consume `isSidebarCollapsed` solely for trigger clearance padding:
- **Workspace context (`navigationContext: 'workspace'` — `32px` `DS-LAYOUT-AXIS`)**:
  - Expanded: `px-8`
  - Collapsed: `pl-14 pr-8` on `CO-PAGE-HEADER`; sub-bars and fluid `w-full` page content remain `px-8` / `p-8`.
- **Resource context (`navigationContext: 'resource'` — `24px` `DS-LAYOUT-AXIS`)**:
  - Expanded: `px-6`
  - Collapsed: `pl-12 pr-6` on `CO-CHILD-NAVBAR` Surface 1; Surface 2 and fluid `w-full` page content remain `px-6` / `p-6`.

### 3.4 `CO-EMBED-CARD`, `SU-EMBED-RESOURCE-CONFIG` & `CO-EMBED-INSTALLATION` (`APP-05`) — Canonical Embed Lifecycle, Signing & Installation Invariants (`INV-EMBED-01` – `INV-EMBED-12`)
> **Invariants**:
> - **Body-Level Configuration & Tab 3 Launcher (`INV-EMBED-03`–`INV-EMBED-05`)**: `Embed Detail` (`/workspaces/:slug/embeds/:embedId`) configures the Embed across 3 body-level tabs (`1. Mode & Knowledge`, `2. Context & Behavior`, and `3. Installation` acting as a compact readiness summary & launcher). Dedicated deployment guidance lives on a single canonical route: `/workspaces/:slug/embeds/:embedId/installation` (`APP-05` / `SU-EMBED-INSTALLATION`), with no competing installation drawer.
> - **Deterministic 3-State Signing Contract & Prevented Invalid Combination (`INV-EMBED-07` & `INV-EMBED-08`)**: `evaluateEmbedInstallationContract` derives signing from collection visibility + `useHostUserContext` (`Public + Off → 'none'`, `Public + On → 'optional'`, `Protected → 'required'`). Selecting any protected collection (`members` or `admins`) forces and locks `useHostUserContext = true` (`[✓] REQUIRED`) in both UI and `store` persistence so `Protected + Off` is never persisted.
> - **Centered Single-Column Recipe, Browser-Only Environment Picker & Single-Action Verification (`INV-EMBED-09`–`INV-EMBED-12`)**: `APP-05` (`/installation`) renders a centered single-column (`max-w-3xl mx-auto`) configuration-driven recipe with `InstallationVerdict`, `[React | Vue | JavaScript]` browser environments, conditional `SERVER` / `BROWSER` numbered steps, single-action `[Verify installation]` with progressive error recovery, and a collapsed low-priority `Developer tools` footer.

### 3.5 `SU-TEST-CONSOLE` (`PAGE-APP-06`) — 5-Stage Inspection Pipeline & Single `EffectiveScope` Resolver
> **Invariants**:
> - **Single Canonical `EffectiveScope` Resolver (`resolveTestConsoleScope`)**: Zero-state `[ Access ]`, `Verification Scenarios`, and retrieval execution all derive permissions from `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` (an Embed or Collection target can narrow scope, never expand it).
> - **Hard `401` Invalid Token Boundary**: Selecting `Identity = Invalid token` halts before authorization/retrieval with `401 Unauthorized · INVALID_TOKEN_SIGNATURE`, `Retrieval: Not executed`, `Retrieved chunks: 0`, and `Anonymous fallback: None`.
> - **Clean `CO-PAGE-HEADER` & Compact Epoch Telemetry**: `CO-PAGE-HEADER` remains free of overflowing epoch badges; `kv:v{knowledgeVersion}` and compact `av:v1 (N cols)` epoch descriptors live inside the `[ Cache ]` inspection tab alongside `[Re-run query]` and `[Invalidate cache]`.

### 3.6 `CO-ASK-BOX` (`DogfoodInlineBot`) & Adjacent Host Environment Bar (`PUBLIC-02`) — Real Mixed-Access Embed Contract
> **Invariant (`Identity → Authorization → Effective Collection Scope → Retrieval → Answer/Citations/CTA`)**:
> - **External Host Inputs Only**: `CO-ASK-BOX` (`EMB-PUBLIC-HOME`) receives `hostIdentityMode` (`'anonymous' | 'member' | 'admin'`) and `hostCurrentUrl` (`'/' | '/docs/embedding' | '/docs/access-control'`) externally from the host page's **Host Environment Bar** (`PAGE-PUB-01`)—never from an internal Embed role picker.
> - **Real Signed Host Assertions (`EMBED-01`)**: When `hostIdentityMode` is `'member'` or `'admin'`, `CO-ASK-BOX` requests a short-lived HMAC-SHA256 assertion from `/api/auth/token/sign` and passes it via `Authorization: Bearer <token>` to `/api/chat/stream` (`mode: 'embed'`).
> - **Single Authorization Source of Truth**: Both server-side retrieval and the Host Environment Bar's `✓/✗` collection matrix (`Public Docs ✓ · Legal ✓ · Customer Docs ✓/✗ · Admin Docs ✓/✗`) derive strictly from `resolveEmbedAuthorization(resolvedIdentity, embedCollectionIds, collections)`.




