# EMBED-02 — First-Class Composable Embed & Presentation Architecture

**Status:** Canonical Product & UI Architecture Specification  
**Type:** Composable Knowledge Presentation / Multi-Instance Embed System  
**Depends on:** `AUTH-03`, `EMBED-01`, `PUBLIC-01`, `UI-01`

---

# 1. Core Architectural Separation

OKEng separates the **Knowledge Layer** from the **Presentation Surface**:

* **Fixed Knowledge Layer:**
  `Files → Collections → Access → Context → Retrieval → Answer`
* **Configurable Presentation Surface:**
  `Widget → Panel → Fullscreen → Inline → Documentation → Contextual Help`

## 1.1 Three-Pillar Responsibility Model
1. **Workspace:** Knowledge and authorization container (`ws_okeng_01`).
2. **Collection:** Organizational and permission boundary (`everyone`, `members`, `admins`).
3. **Embed:** Explicit, self-contained, independently deployable presentation configuration. Every Embed is self-contained—there are no implicit global-to-embed inheritance chains.

---

# 2. The First-Class `Embed` Entity

Instead of a single global widget setting, a Workspace manages multiple saved Embed instances (`/app/embed` → `/app/embed/:embedId`):

```text
Embed
├── id                  (e.g., EMB-PUBLIC-HOME, EMB-ADMIN-PANEL)
├── workspaceId
├── name
├── status              ('active' | 'draft')
├── mode                ('widget' | 'panel' | 'fullscreen' | 'inline' | 'documentation' | 'contextual')
├── knowledgeScope
│   ├── collectionIds   (Narrowed collection references)
│   └── documentIds     (Optional document-level narrowing)
├── contextConfig
│   ├── useCurrentPage  (boolean)
│   ├── useHostUserContext (boolean)
│   └── routeRules      (Route pattern → prompt title, suggested questions, pinned documents)
├── behaviorConfig
│   ├── initialState    ('closed' | 'open')
│   ├── suggestedQuestions
│   ├── showNavigation  (boolean)
│   └── ctaBehavior     ('inline-link' | 'new-tab' | 'hidden')
└── appearanceConfig
    ├── theme           ('light' | 'system' | 'high-contrast')
    ├── width           (e.g., '360px' for panel, '320px' for contextual, '380px' for widget)
    ├── position        ('right' | 'left' | 'bottom-right' | 'bottom-left')
    ├── radius          (e.g., '4px' | '8px' | '12px')
    ├── accentColor
    ├── surfaceColor
    ├── textColor
    ├── mutedColor
    └── borderColor
```

## 2.1 Knowledge Scope Invariant
An Embed **references** collections and documents; it does not own them. The server-side authorization engine remains authoritative: an Embed's `knowledgeScope` can **narrow** the available corpus, but it can **never grant access** beyond the caller's verified clearance (`EMBED-01`).

## 2.2 Embed Lifecycle & Derived Readiness (`readyForInstallation`)
Every Embed progresses through a deterministic 6-stage lifecycle:

```text
Create  ──►  Configure  ──►  Test  ──►  Ready  ──►  Install  ──►  Live (Active)
```

An Embed instance derives its readiness state (`CO-EMBED-STATUS`) from configuration validity (`evaluateEmbedReadiness`):
* **`Incomplete`**: `!readyForInstallation` — required configuration for the selected mode is missing or invalid (e.g., no collection selected, invalid CSS width token, empty greeting/placeholder). Installation Guide is withheld until configuration is valid.
* **`Draft`**: `readyForInstallation && status === 'draft'` — configuration is valid and installable for staging/testing prior to live publication.
* **`Ready` / `Active`**: `readyForInstallation && status === 'active'` — configuration is valid and live for production host deployment.

> **Readiness Gate Invariant (`INV-EMBED-06`)**: Installation instructions (`SU-EMBED-INSTALLATION`) are available if and only if `readyForInstallation === true`.

---

# 3. Six Canonical Presentation Modes & Surfaces

| Mode | Surface ID | Primary Components | Description |
|---|---|---|---|
| `widget` | `SU-EMBED-CHAT` | `CO-CHAT-LAUNCHER`, `CO-CHAT-WINDOW`, `CO-SOURCE-LIST` | Recommended default. Floating launcher button that opens an anchored conversational assistant. |
| `panel` | `SU-EMBED-PANEL` | `PR-DRAWER`, `CO-CONTENT-RENDERER`, `CO-NEXT-STEP` | Persistent slide-in drawer (`left` or `right`, default `360px` width, `maxWidth: min(380px, 40%)` inline guard, automatic `100%` width normalization) alongside SaaS applications. |
| `fullscreen` | `SU-EMBED-FULLSCREEN` | `CO-CHAT-FULLSCREEN`, `CO-DOCUMENT-LIST`, `CO-SOURCE-LIST` | Dedicated full-viewport help center / knowledge portal experience. |
| `inline` | `SU-EMBED-INLINE` | `CO-ASK-BOX`, `CO-SOURCE-LIST` | Embedded knowledge component placed directly inside a product screen or landing page. |
| `documentation` | `SU-EMBED-DOCUMENTATION` | `CO-DOCUMENT-NAV`, `CO-DOCUMENT-VIEWER`, `CO-ASK-BOX` | Interactive 3-column documentation experience combining single-expand collapsible navigation (`CO-DOCUMENT-NAV`), deterministic document viewing, and contextual assistant. |
| `contextual` | `SU-EMBED-CONTEXTUAL-HELP` | `PR-DRAWER` (`320px`), `CO-RELATED-DOCUMENTS`, `CO-ASK-BOX` | Route-aware sidebar that inspects `current_url` (e.g., `/settings/security/sso`) to surface relevant guides and tailored prompts (*"Need help with SSO?"*). |

---

# 4. Controlled Styling & Theme Variable Contract

Instead of arbitrary unstructured CSS injection, OKEng exposes structured Appearance tokens (canonical hex-normalized `accentColor`: `#1D4ED8`, `#171717`, `#15803D`, `#B45309`) and deterministic CSS variables (validated via `FORM-SEC-01` `validateCssWidthToken`):

```css
:root {
  --okeng-accent: #1D4ED8;
  --okeng-surface: #FFFFFF;
  --okeng-text: #171717;
  --okeng-muted: #6B6B67;
  --okeng-border: #DEDDD8;
  --okeng-radius: 4px;
  --okeng-chat-width: 360px;
}
```

When an embed configured with `width: 100%` (such as an `inline` or `documentation` embed) is previewed in `panel` mode (`SU-EMBED-PANEL`), `PR-DRAWER` and `WidgetPreviewView` normalize the drawer width to `360px` with `maxWidth: min(380px, 40%)` so the slide-over panel never claims the entire host viewport.

---

# 5. Configuration vs. Installation (`APP-05`) & Deterministic Signing Contract

## 5.1 Deterministic 3-State Signing Contract (`evaluateEmbedInstallationContract`)
Signing state has a single source of truth derived from the Embed's **collection visibility tiers (`everyone` vs. `members` / `admins`)** and **`contextConfig.useHostUserContext`**. Whenever any protected collection (`members` or `admins`) is bound, `useHostUserContext` is **automatically forced to `true` and locked (`[✓] REQUIRED`)** in both the configuration UI and `store` persistence so that an invalid `Protected + Off` combination can never be persisted:

| Collection Visibility Scope | `useHostUserContext` | Derived `signingState` | Canonical Access Status (`APP-05`) |
|---|---|---|---|
| **Public collections only** (`everyone`) | `false` (`Off`) | **`'none'` (`No signing`)** | `● Public — No signing required` |
| **Public collections only** (`everyone`) | `true` (`On`) | **`'optional'` (`Signing optional`)** | `● Public + authenticated — Signing optional` |
| **Any protected collection** (`members` / `admins`) | **`true` (Forced & Locked `Required`)** | **`'required'` (`Signing required`)** | `● Authenticated — Signing required` |
| *Any protected collection* | *`false` (`Off`)* | *Prevented at Configuration & Store Layer* | *Normalized to `useHostUserContext: true`* |

## 5.2 Embed Detail Tab 3 — Compact Installation Launcher (`SU-EMBED-RESOURCE-CONFIG`)
Inside `/workspaces/:slug/embeds/:embedId`, **Tab 3 (`3. Installation`)** is a compact launcher:
* Shows `Installation`, the short configuration-derived verdict (`This Embed does not require a backend.`, `This Embed works without a backend. You can optionally add user signing for signed-in users.`, or `This Embed requires a small server endpoint to identify signed-in users.`), and `Frontend only` or `Backend + frontend required`.
* Provides the primary **`[Open installation guide →]`** CTA that navigates to `/workspaces/:slug/embeds/:embedId/installation`.

## 5.3 Dedicated Embed Installation Recipe (`APP-05` / `SU-EMBED-INSTALLATION`)
**Routes**: `/workspaces/:workspaceSlug/embeds/:embedId/installation` (aliased to `/app/embed/:embedId/installation`)
**Core Principle**: *"Because OKEng knows the Embed configuration, it should show less—not more. Choose your environment → copy the steps → verify → done."*

`APP-05` (`src/pages/EmbedInstallationView.tsx`) is a centered, single-column (`max-w-3xl mx-auto`) configuration-driven installation recipe:
1. **`InstallationHeader`**: Resource breadcrumb `← Embeds / <Embed Name> / Installation`, heading `Installation`, and supporting text `Install <Embed Name> in your application.`
2. **`InstallationVerdict`**: Immediate configuration-derived verdict:
   * `none`: **Frontend-only installation** — *"This Embed does not require a backend."* (Shows zero backend or signing UI).
   * `optional`: **Frontend installation** — *"This Embed works without a backend. You can optionally add user signing for signed-in users."*
   * `required`: **Backend + frontend installation** — *"This Embed requires a small server endpoint to identify signed-in users."*
3. **`EnvironmentSelector`**: *"How is your app built?"* → **`[ React ] [ Vue ] [ JavaScript ]`** (Node.js is never shown as a peer frontend environment).
4. **`InstallationSteps` (`01.`, `02.`, `03.`...)**:
   * **`ServerStep` (`SERVER` — *"Put this code on your server."*)**: Shown as Step `01. Add the server endpoint` when `signingState === 'required'` (with inline security note *"Keep your signing secret on the server. Never put it in browser code."* and `[Show full server example]`), or collapsed behind `[Show server setup]` as `Optional: identify signed-in users` when `signingState === 'optional'`. Omitted completely when `signingState === 'none'`.
   * **`PackageStep` (`BROWSER`)**: `Install the package` (`npm install @okeng/react` or `npm install @okeng/vue`).
   * **`EmbedStep` (`BROWSER` — *"Put this code in your application."*)**: `Add the Embed` with conditional host context notes (*"This Embed uses the current page URL."* / *"This Embed uses page-specific rules."*) included only when configured.
5. **`VerificationStep` (`Verify your installation`)**: Single primary action `[Verify installation]` that confirms `✓ Installation looks good — <Embed Name> is connected and responding correctly.` (`Embed connected · Knowledge available · Context received · ✓ You're ready`), or surfaces progressive error recovery (`missing_embed` with `[Copy Embed ID]`, `signing_failure` with `[Show server setup]`, `context_failure`, `unauthorized`).
6. **`DeveloperTools`**: Low-priority collapsed footer disclosure containing `Simulate configuration drift`, `Simulate verification state`, and `[Open Host Simulator]`.

---

# 6. Canonical Host Simulator (`SU-EMBED-HOST-SIMULATOR` at `/workspaces/:slug/embeds/preview`)

The Host Simulator acts as a deterministic miniature host application that tests the **relationship between the Embed configuration and its host context**:
1. **All 6 Presentation Modes** (`Widget`, `Panel`, `Fullscreen`, `Inline`, `Docs`, `Contextual`) without leaving the simulator.
2. **Route & Route-Rule Simulation** (`/settings/security/sso`, `/docs/getting-started`, `/billing/invoices`, `/api/authentication`, plus custom `contextConfig.routeRules`) respecting `useCurrentPage`.
3. **Identity Clearance Simulation** (`Anonymous` ○ `Member` ○ `Admin`) respecting `useHostUserContext` and verifying pre-retrieval filtering.
4. **Viewport Simulation** (`Desktop 100%` | `Tablet 768px` | `Mobile 390px`) plus live `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`) and `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
5. **5-Part `Inspect` Diagnostics Popover**: `1. Route Context`, `2. User Identity & Clearance`, `3. Viewport & Surface Geometry`, `4. Behavior Configuration`, and `5. Theme Variables (--okeng-*)` with one-click copy.

---

# 7. The 12 Canonical Embed Product Invariants (`INV-EMBED-01` – `INV-EMBED-12`)

1. **`INV-EMBED-01` (Embed is independently deployable)**: Each Embed instance has its own URL-addressed resource identity (`/workspaces/:slug/embeds/:embedId`), mode, knowledge scope, context, behavior, appearance, readiness state, and dedicated `/installation` surface.
2. **`INV-EMBED-02` (Collections own knowledge and authorization)**: Collections remain the knowledge and access-control boundary; an Embed references collections to narrow presentation scope and can never bypass clearance checks.
3. **`INV-EMBED-03` (Configuration belongs in the body)**: Configuration navigation (`PR-TABS`: `1. Mode & Knowledge`, `2. Context & Behavior`, `3. Installation`) lives inside the `24px`-axis page body directly above the configuration surface, paired with a `1 of 3` **Previous / Next** progression footer.
4. **`INV-EMBED-04` (Header surfaces remain contextual)**: `Surface 1` (`CO-CHILD-NAVBAR`) holds `← Back | Embeds > <Name>` on the left and `CO-EMBED-STATUS`, `[Installation Guide]`, and `[Test in Host Simulator]` on the right; `Surface 2` holds resource identity (`CO-EMBED-IDENTITY`) on the left and resource lifecycle actions (`[Publish / Set as Draft]`, `[Duplicate]`, `[Delete]`) on the right.
5. **`INV-EMBED-05` (Installation has one canonical dedicated surface)**: `Embed Detail` configures the Embed (with Tab 3 acting as a compact launcher); `/workspaces/:slug/embeds/:embedId/installation` (`APP-05` / `SU-EMBED-INSTALLATION`) presents the centered, single-column installation recipe.
6. **`INV-EMBED-06` (Ready means installable)**: Installation Guide access is gated by `readyForInstallation`, and `/installation` renders only `This Embed isn't ready to install yet. Complete the required Embed settings first. [Edit Embed]` when incomplete.
7. **`INV-EMBED-07` (Show less because OKEng knows the configuration)**: `APP-05` hides anything that does not affect the user's installation path—omitting backend/signing UI for public no-signing Embeds and collapsing optional server setup by default.
8. **`INV-EMBED-08` (Single source of truth for signing with prevented invalid state)**: Signing state (`none` | `optional` | `required`) is derived deterministically from collection visibility tiers + `useHostUserContext`. Selecting any protected collection (`members` or `admins`) forces and locks `useHostUserContext = true` in both UI and persistence.
9. **`INV-EMBED-09` (Browser-only environment picker)**: `APP-05` presents `[React] [Vue] [JavaScript]` as browser environments and surfaces server setup inline (`SERVER`) only when signing is required or optional.
10. **`INV-EMBED-10` (Security warnings appear only where the action occurs)**: Private signing secrets (`OKENG_SIGNING_SECRET`) never appear in browser code, and the server security notice appears directly inside the server endpoint step.
11. **`INV-EMBED-11` (Sidebar posture is independent)**: Navigating between `/workspaces/:slug/embeds`, `/workspaces/:slug/embeds/:embedId`, `/workspaces/:slug/embeds/:embedId/installation`, and `/workspaces/:slug/embeds/preview` strictly preserves `sidebarPosture` (`DS-SIDEBAR-POSTURE-001`).
12. **`INV-EMBED-12` (Single-action verification & low-priority Developer Tools)**: `APP-05` provides a single primary `[Verify installation]` action with progressive error recovery, keeping simulation controls tucked inside the collapsed `Developer tools` footer.


