# 04 — Top-Level Workspace UI Archetypes, Spec vs. Implementation Audit & Standardization Plan

**Status:** Normative Architecture & Audit Specification  
**Scope:** Top-level authenticated workspace screens (`SURF-WORKSPACE`) and persistent child-resource workspaces  
**Evaluated Top-Level Screens:** Collections (`PAGE-APP-01`), Files (`PAGE-APP-04`), Embeds (`PAGE-APP-05`), Test Console (`PAGE-APP-06`), Conversations (`PAGE-APP-07`), Settings (`PAGE-APP-08`)  
**Persistent Child-Resource Workspaces:** Collection Detail (`PAGE-APP-02`), File Editor (`PAGE-APP-03`), Embed Detail (`PAGE-APP-05 Detail`)

---

## Architectural North Star

> **Standardize behavioral contracts and interaction language, not visual templates.**  
> **A new page should compose an existing archetype; it should not invent a new page grammar.**

The **six evaluated top-level workspace screens** are organized across **five behavioral archetype families** (`PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-CONSOLE`, `PA-INSPECTOR`, `PA-SYSTEM-CONFIGURATION`), with **persistent child-resource workspaces** governed by `PA-RESOURCE-DETAIL`, `PA-EDITOR`, and `PA-RESOURCE-CONFIGURATION`.

- **Directories** discover things.
- **Data directories** manage things at density.
- **Consoles** execute things.
- **Inspectors** investigate things.
- **Configuration surfaces** change things.
- **Resource workspaces** own a persistent thing.

---

## 1. Normative Taxonomy & Architectural Hierarchy (`DS → PR → CO → SU → PA → PAGE`)

### 1.1 Canonical Page Architecture Tree

```text
OKENG PAGE ARCHITECTURE
│
├── TOP-LEVEL WORKSPACE ARCHETYPES (navigationContext: 'workspace' — CO-PAGE-HEADER + 32px axis)
│   │
│   ├── PA-DIRECTORY
│   │   ├── Collections          (PAGE-APP-01 — Conceptual entity card grid)
│   │   └── Embeds (List)        (PAGE-APP-05 — Operational resource rows/cards)
│   │
│   ├── PA-DATA-DIRECTORY
│   │   └── Files                (PAGE-APP-04 — High-density operational record table)
│   │
│   ├── PA-CONSOLE
│   │   └── Test Console         (PAGE-APP-06 — Simulation controls + execution + diagnostics)
│   │
│   ├── PA-INSPECTOR
│   │   └── Conversations        (PAGE-APP-07 — Bounded master stream + detail inspector)
│   │
│   └── PA-SYSTEM-CONFIGURATION
│       └── Settings             (PAGE-APP-08 — Persistent config nav + bounded content surface)
│
├── PERSISTENT RESOURCE WORKSPACES (navigationContext: 'resource' — CO-CHILD-NAVBAR + 24px axis)
│   │
│   ├── PA-RESOURCE-DETAIL
│   │   └── Collection Detail    (PAGE-APP-02 — Collection boundary + scoped file table)
│   │
│   ├── PA-EDITOR
│   │   └── File Editor          (PAGE-APP-03 — Synchronized Editor | Preview workspace)
│   │
│   └── PA-RESOURCE-CONFIGURATION
│       └── Embed Detail         (PAGE-APP-05 Detail — Resource identity + bounded config sections)
│
└── ABSTRACT BEHAVIORAL FAMILY (Never directly assigned to a PAGE)
    │
    └── PA-CONFIGURATION         ← Abstract behavioral family defining configuration grammar
        ├── PA-SYSTEM-CONFIGURATION
        └── PA-RESOURCE-CONFIGURATION
```

> **Taxonomy Rule on `PA-CONFIGURATION`**: `PA-CONFIGURATION` is an **abstract behavioral family** that defines the shared configuration grammar (`Context → Configuration Navigation → Bounded Configuration Surface → Save / Test / Publish`). It is **never directly assigned to a `PAGE`**; concrete pages implement either `PA-SYSTEM-CONFIGURATION` (workspace-wide) or `PA-RESOURCE-CONFIGURATION` (child resource).

### 1.2 Summary Mapping of Evaluated Screens

| Screen | Route | Concrete Archetype | Primary Surface (`SU-*`) | Context Primitive (`DS-LAYOUT-AXIS`) | Viewport & Scroll Model |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Collections** | `/workspaces/:slug/collections` | `PA-DIRECTORY` | `SU-COLLECTION-DIRECTORY` | `CO-PAGE-HEADER` (`32px`) | Normal page scroll; fluid `p-8 w-full` container |
| **Embeds (List)** | `/workspaces/:slug/embeds` | `PA-DIRECTORY` | `SU-EMBED-DIRECTORY` | `CO-PAGE-HEADER` (`32px`) | Normal page scroll; fluid `p-8 w-full` container |
| **Files** | `/workspaces/:slug/files` | `PA-DATA-DIRECTORY` | `SU-FILE-DIRECTORY` | `CO-PAGE-HEADER` (`32px`) | Normal page scroll; fluid `p-8 w-full` container |
| **Test Console** | `/workspaces/:slug/test` | `PA-CONSOLE` | `SU-TEST-CONSOLE` | `CO-PAGE-HEADER` (`32px`) | Viewport-bounded (`h-screen overflow-hidden`, `flex-1 min-h-0`, fluid `p-8 w-full`) |
| **Conversations** | `/workspaces/:slug/conversations` | `PA-INSPECTOR` | `SU-CONVERSATION-INSPECTOR` | `CO-PAGE-HEADER` (`32px`) | Viewport-bounded (`h-screen overflow-hidden`, `flex-1 min-h-0`, fluid `p-8 w-full`) |
| **Settings** | `/workspaces/:slug/settings` | `PA-SYSTEM-CONFIGURATION` | `SU-WORKSPACE-SETTINGS` | `CO-PAGE-HEADER` (`32px`) | Normal page scroll with persistent config nav & fluid `p-8 w-full` container |
| **Embed Detail** | `/workspaces/:slug/embeds/:id` | `PA-RESOURCE-CONFIGURATION` | `SU-EMBED-RESOURCE-CONFIG` | `CO-CHILD-NAVBAR` (`24px`) | Resource context (`CO-CHILD-NAVBAR` + persistent config nav + fluid `p-6 w-full`) |

---

## 2. The 9 Frozen Normative Principles & Global Invariants

### 2.1 The 9 Normative Principles
1. **Standardize behavior, not templates.**
2. **One dataset → one filter model → one filter region.**
3. **Every mutation has explicit semantic scope.**
4. **Interactive affordance must match its actual hit target.**
5. **Persistent resources switch into resource navigation context (`CO-CHILD-NAVBAR` + `24px` axis) and exit on return, without mutating `sidebarPosture`.**
6. **Drawers preserve parent context; resource pages own complex workflows.**
7. **Global session state must never masquerade as local test/configuration state.**
8. **Operational workspaces get bounded scrolling; directory/configuration pages don't.**
9. **Sidebar posture is a persistent application-shell preference (`DS-SIDEBAR-POSTURE-001`); route and archetype changes never mutate sidebar posture.**

---

### 2.2 Three-Level Global Page Anatomy
Every workspace screen is composed through three structural levels, where `CO-PAGE-HEADER` and `CO-CHILD-NAVBAR` act as parallel **Level 2** context primitives:

```text
Level 1 — Shell Context
  └── CO-APP-SHELL (Owns persistent route-independent sidebarPosture: 'expanded' 240px | 'collapsed' 56px rail)

Level 2 — Page / Resource Context (Parallel Context Primitives, sticky top-0 z-20)
  ├── Top-level Workspace Pages ('workspace' — 32px axis): CO-PAGE-HEADER  (Title, Description, Primary/Secondary Actions)
  └── Persistent Resource Pages ('resource' — 24px axis):  CO-CHILD-NAVBAR (← Back | Parent > Resource on Left; Status + Action on Right)

Level 3 — Behavioral Archetype
  └── PA-* (Defines the internal functional grammar of the page inside a fluid w-full container)
```

---

### 2.3 Resource Context State Machine Invariant (`navigationContext ≠ sidebarPosture`)
Entering a persistent child resource workspace transitions the shell into `navigationContext: 'resource'` (`CO-CHILD-NAVBAR` + `24px` axis), and returning to the parent directory deterministically exits `navigationContext: 'resource'` back to `'workspace'` (`CO-PAGE-HEADER` + `32px` axis)—while **`sidebarPosture` (`expanded` | `collapsed`) remains invariant across all transitions**:

```text
┌───────────────────────────────────────────────────┐
│ Top-Level Directory / Workspace                   │
│  • navigationContext: 'workspace'                 │
│  • Level-2 Header: CO-PAGE-HEADER                 │
│  • DS-LAYOUT-AXIS: 32px (px-8 / pl-14 pr-8 / p-8) │
│  • sidebarPosture: Preserved (expanded|collapsed) │
└─────────────────────────┬─────────────────────────┘
                          │
            Open Resource │  ▲ Return / Back (Preserves sidebarPosture)
                          ▼  │
┌───────────────────────────────────────────────────┐
│ Persistent Resource Workspace                     │
│  • navigationContext: 'resource'                  │
│  • Level-2 Header: CO-CHILD-NAVBAR                │
│  • DS-LAYOUT-AXIS: 24px (px-6 / pl-12 pr-6 / p-6) │
│  • sidebarPosture: Preserved (expanded|collapsed) │
└───────────────────────────────────────────────────┘
```

---

### 2.4 Canonical Filter State & Region Invariant
> **Invariant**: **One dataset → one filter model → one filter region.** A page must have one canonical filter state and one canonical filter region (`PR-FILTER-BAR`) for a dataset. Individual data components must not independently own competing search or filter controls for the same dataset. Filter regions may wrap responsively across rows at narrower viewports.

---

### 2.5 Semantic Mutation Scope & Control Scope Invariant
> **Invariant 1 (Mutation Scope)**: **A mutation must never derive a destructive or persistent target from incidental UI state when that target is not visible to the user.** Every mutation flow must explicitly expose:
> - **WHAT** is changing
> - **WHERE** it belongs
> - **WHO / WHAT** it affects
>
> **Invariant 2 (Control Scope)**: **A control belongs in the smallest scope that completely explains its effect.** Global session controls belong in `CO-ACCOUNT-MENU`; simulation-scoped controls belong in `PA-CONSOLE` test controls; cache invalidation controls belong with cache diagnostics or page-level actions.

---

### 2.6 Contextual Drawer vs. Modal vs. Resource Page Standard
> **Invariant**: Secondary creation and editing flows use `PR-DRAWER` when the underlying page should remain visible and contextual. **Drawer size (`PR-DRAWER-SM`, `PR-DRAWER-MD`, `PR-DRAWER-LG`) is determined by content complexity, not by page identity.** Complex multi-step or multi-faceted configuration belongs in a persistent resource page (`PA-RESOURCE-CONFIGURATION` / `PA-EDITOR`), never forced into an oversized drawer.

| Interaction | Pattern | Semantic Size / Archetype | Explicit Scope Displayed |
| :--- | :--- | :--- | :--- |
| **Invite Member / Transfer Ownership** | `PR-DRAWER` | `PR-DRAWER-SM` (`340px`) | Workspace + Target Role |
| **New Collection** | `PR-DRAWER` | `PR-DRAWER-MD` (`420px`) | Workspace + Visibility Boundary |
| **Upload File (from Global Files)** | `PR-DRAWER` (`CO-UPLOAD-DRAWER`) | `PR-DRAWER-MD` (`420px`) | Explicit `Target Collection` (required) |
| **Upload File (from Collection Detail)** | `PR-DRAWER` (`CO-UPLOAD-DRAWER`) | `PR-DRAWER-MD` (`420px`) | Semantic scope lock (`lockedCollectionId` — no `Target Collection` selector) |
| **Create Embed** | `PR-DRAWER` | `PR-DRAWER-MD` (`420px`) | Workspace + Mode + Initial Collection Scope |
| **Document Details / Next-Step CTA** | `PR-DRAWER` | `PR-DRAWER-MD` (`420px`) | Document + Target Collection / Host Route |
| **Destructive / Guard Confirmation** | `PR-MODAL` | Dialog | Resource identity + irreversible consequence |
| **Embed Full Configuration** | Resource Page | `PA-RESOURCE-CONFIGURATION` | `Embeds > <Embed Name>` (`CO-CHILD-NAVBAR`) |
| **Document Authoring & Preview** | Resource Page | `PA-EDITOR` | `Files > <Document Title>` (`CO-CHILD-NAVBAR`) |

---

### 2.7 Interaction Affordance & Ownership Invariant
> **Invariant**: **Interactive affordances must correspond to their actual hit targets and resulting action.** A component must not visually imply that an entire card or row is clickable (`<Card interactive>`) when the primary navigation is available only through a nested button. Conversely, secondary row/card buttons (`Simulator`, `Duplicate`, `Re-index`, `Delete`) must isolate their click events (`stopPropagation()`) so they never accidentally trigger the parent card/row navigation.

---

### 2.8 Viewport & Scrolling Invariant
- **Directory & System Configuration Pages (`PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-SYSTEM-CONFIGURATION`)**: Use normal page scrolling with a bounded content surface. (In `PA-SYSTEM-CONFIGURATION`, *"bounded active surface"* means a bounded content container for the active configuration tab—not a viewport-locked scroll box.)
- **Operational & Editing Workspaces (`PA-CONSOLE`, `PA-INSPECTOR`, `PA-EDITOR`)**: Use a viewport-bounded shell (`h-screen overflow-hidden`, `flex-1 min-h-0`) with independent internal pane scrolling.

---

### 2.9 Architectural Governance Loop
> **Implementation Guard**: **No implementation change may introduce a new page-level interaction pattern without either composing an existing archetype contract or explicitly amending the normative architecture first.**

```text
Need new behavior
      ↓
Can existing PA / CO / PR express it?
      │
   Yes ─────→ Compose existing contract
      │
    No
      ↓
Amend normative architecture
      ↓
Then implement
```

---

## 3. Screen-by-Screen Audit: Spec vs. Implementation vs. Target Archetype

---

### 3.1 Screen 1: Collections (`PAGE-APP-01`) — `PA-DIRECTORY`

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned `PA-RESOURCE-LIST` with `CO-PAGE-HEADER`, `CO-COLLECTION-CARD`, `CO-VISIBILITY-SELECTOR`, and a `PR-MODAL` creation dialog.
- **Actual Implementation (`CollectionsView.tsx`)**:
  - Renders `CO-PAGE-HEADER` + 3-column `CO-COLLECTION-CARD` grid + centered `PR-MODAL` for `+ New Collection`.
  - **Audit Gaps**:
    1. Missing canonical filter region (`PR-FILTER-BAR` with `Search` + `All | Public | Members | Admins`).
    2. Uses `PR-MODAL` instead of `PR-DRAWER-MD` for creating a collection in context.
    3. Declares an unused `onCreateMarkdown` prop in `CollectionsViewProps`.

#### B. ASCII Comparison — Screen 1: Collections (`PA-DIRECTORY`)

```text
[CURRENT IMPLEMENTATION — No Filter Region, Centered Modal Creation]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Knowledge Collections                                  [+ New Collection] │
│                      │  Group related documentation and set access boundaries...                  │
│  ■ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐│
│  □ Embeds            │  │ 📁 Public Knowledge  │ │ 📁 Customer Portal   │ │ 📁 Internal Eng      ││
│  □ Test Console      │  │ [PUBLIC]             │ │ [MEMBERS]            │ │ [ADMINS]             ││
│  □ Conversations     │  │ 5 docs · ● 5 Ready   │ │ 4 docs · ● 4 Ready   │ │ 2 docs · ● 2 Ready   ││
│  □ Settings          │  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

[TARGET ARCHETYPE — PA-DIRECTORY (SU-COLLECTION-DIRECTORY: PR-FILTER-BAR + 3-Col Grid + PR-DRAWER-MD)]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Knowledge Collections                                  [+ New Collection] │
│                      │  Group related documentation and set access boundaries.                    │
│  ■ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  PR-FILTER-BAR (Canonical Filter Region):                                  │
│  □ Embeds            │  [ 🔍 Search collections...        ]   [All (6)] [Public] [Members] [Admin]│
│  □ Test Console      ├────────────────────────────────────────────────────────────────────────────┤
│  □ Conversations     │  Resource Collection (CO-COLLECTION-CARD Grid):                            │
│  □ Settings          │  ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐│
│                      │  │ 📁 Public Knowledge  │ │ 📁 Customer Portal   │ │ 📁 Internal Eng      ││
│                      │  │ [PUBLIC]             │ │ [MEMBERS]            │ │ [ADMINS]             ││
│                      │  │ Core product docs... │ │ Implementation...    │ │ Runbooks & KMS...    ││
│                      │  │ 5 docs · ● 5 Ready   │ │ 4 docs · ● 4 Ready   │ │ 2 docs · ● 2 Ready   ││
│                      │  └──────────────────────┘ └──────────────────────┘ └──────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Screen 2: Files (`PAGE-APP-04`) — `PA-DATA-DIRECTORY`

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned `PA-RESOURCE-LIST` with `CO-PAGE-HEADER`, `CO-UPLOAD-DROPZONE`, `CO-FILE-ROW`, and `PR-SELECT`.
- **Actual Implementation (`GlobalFilesView.tsx` + `FileTable.tsx`)**:
  - Renders a permanently expanded `UploadDropzone` above the directory, a `Collection:` `<Select>` in `GlobalFilesView`, and a separate search toolbar inside `FileTable`.
  - **Audit Gaps**:
    1. **Data-Integrity / Mutation Scope Defect (§2.5)**: When `All Collections` is active in `GlobalFilesView`, dropping a file into `UploadDropzone` silently targets `collections[0].id` (`COL-PUBLIC`)—deriving a persistent mutation target from incidental state invisible to the user.
    2. **Filter Ownership Violation (§2.4)**: Filtering for the same dataset is split across two components (`GlobalFilesView` owns `selectedColFilter`; `FileTable` owns `searchQuery`), and the localized `Status` filter (`files.all_statuses`) is omitted.
    3. **Wrong Archetype Priority**: `Files` is a high-density record directory (`PA-DATA-DIRECTORY`), not an upload landing page.

#### B. ASCII Comparison — Screen 2: Files (`PA-DATA-DIRECTORY`)

```text
[CURRENT IMPLEMENTATION — Upload-First Surface, Silent collections[0] Target, Split Filter Ownership]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  All Workspace Files                                    [+ Create Markdown]│
│                      ├────────────────────────────────────────────────────────────────────────────┤
│  □ Collections       │  ┌─ Permanent UploadDropzone (Silently targets collections[0]!) ──────────┐│
│  ■ Files             │  │        ⬆ Drop Markdown (.md) or text (.txt) files here...              ││
│  □ Embeds            │  └────────────────────────────────────────────────────────────────────────┘│
│  □ Test Console      │  COLLECTION: [ All Collections (14) ▾ ]     ◄── Filter State #1 (Parent)   │
│  □ Conversations     │  ┌────────────────────────────────────────────────────────────────────────┐│
│  □ Settings          │  │ [ 🔍 Filter files by title... ]       14 DOCUMENTS ◄── Filter State #2 ││
│                      │  ├────────────────────────────────────────────────────────────────────────┤│
│                      │  │ DOCUMENT               │ COLLECTION │ VISIBILITY │ STATUS │ CHUNKS │...││
│                      │  └────────────────────────────────────────────────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

[TARGET ARCHETYPE — PA-DATA-DIRECTORY (SU-FILE-DIRECTORY: PR-FILTER-BAR + CO-FILE-ROW + CO-UPLOAD-DRAWER)]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  All Workspace Files                     [⬆ Upload File] [+ New Document]  │
│                      │  Central directory of all ingested documents across every collection.      │
│  □ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  ■ Files             │  ┌─ PR-FILTER-BAR (Single Filter Model & Region, wraps responsively) ─────┐│
│  □ Embeds            │  │ [ 🔍 Search title or filename... ]  [Collection: All▾]  [Status: All▾] ││
│  □ Test Console      │  ├────────────────────────────────────────────────────────────────────────┤│
│  □ Conversations     │  │ DOCUMENT               │ COLLECTION │ VISIBILITY │ STATUS  │ CHUNKS │  ││
│  □ Settings          │  ├────────────────────────┼────────────┼────────────┼─────────┼────────┼──┤│
│                      │  │ OKEng Product Overview │ Public...  │ [PUBLIC]   │ ● Ready │ 3      │⟳🗑││
│                      │  │ product-overview.md    │            │            │         │        │  ││
│                      │  └────────────────────────┴────────────┴────────────┴─────────┴────────┴──┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
  * [⬆ Upload File] opens CO-UPLOAD-DRAWER (PR-DRAWER-MD) requiring explicit Target Collection before Drop/Browse.
```

---

### 3.3 Screen 3: Embeds (`PAGE-APP-05`) — `PA-DIRECTORY` (List) & `PA-RESOURCE-CONFIGURATION` (Detail)

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned a single `PA-CONFIGURATION` archetype to `PAGE-APP-05`.
- **Actual Implementation (`EmbedConfigView.tsx`)**:
  - Houses both the Embeds directory list (`Stage 1`) and the individual Embed configuration workspace (`Stage 2`).
  - **Audit Gaps**:
    1. **Interaction Affordance Violation (§2.7)**: In Stage 1, each Embed is rendered inside `<Card interactive>`, visually signaling that the card is clickable, but clicking the card body does nothing—only the nested `[Edit]` button works.
    2. **Inline Creation Form**: Clicking `[+ Create embed]` injects a multi-step form card inline above the list instead of using `PR-DRAWER-MD`.
    3. **Resource Context Violation in Stage 2 (§2.3)**: Opening an Embed's configuration (`Stage 2`) fails to transition into `navigationContext: 'resource'` (`CO-CHILD-NAVBAR` + `24px` axis with `← Back | Embeds > <Name>` on the left while preserving `sidebarPosture`), instead rendering `CO-PAGE-HEADER` with `[← All Embeds]` on the right and an undifferentiated 5-card vertical stack.

#### B. ASCII Comparison — Screen 3: Embeds (`PA-DIRECTORY` → `PA-RESOURCE-CONFIGURATION`)

```text
[CURRENT IMPLEMENTATION — Broken Card Affordance, Inline Creation Card, No Resource Context in Stage 2]
STAGE 1 (List):
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Embeds & Presentation Surfaces     [Launch Host Simulator] [+ Create embed│
│                      ├────────────────────────────────────────────────────────────────────────────┤
│  ■ Embeds            │  [Architecture Summary Prose Banner: Workspace = ... • Collection = ...]   │
│                      │  [Inline Create Card injected here when isCreating = true]                 │
│                      │  ┌─ <Card interactive> (Looks clickable, but body click does NOTHING!) ───┐│
│                      │  │ 🌐 Public Website Widget [Chat widget] [ACTIVE]  [Sim][Edit][Dup][Del] ││
│                      │  └────────────────────────────────────────────────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
STAGE 2 (Detail — Stays in 240px Sidebar, Back Button on RIGHT of PageHeader):
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Public Website Widget              [← All Embeds] [Test in Host Simulator]│
│                      ├────────────────────────────────────────────────────────────────────────────┤
│                      │  5 long vertically stacked cards (Steps 1, 2, 3, 4, 5)...                  │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

[TARGET ARCHETYPE — PA-DIRECTORY (SU-EMBED-DIRECTORY) + PA-RESOURCE-CONFIGURATION (SU-EMBED-RESOURCE-CONFIG)]
STAGE 1: PA-DIRECTORY (PR-FILTER-BAR + Readiness-Aware CO-EMBED-CARD Rows + PR-DRAWER-MD for Creation):
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Embeds & Presentation Surfaces     [Launch Host Simulator] [+ Create Embed│
│                      │  Manage deployable presentations across widgets, panels, and docs.         │
│  □ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  PR-FILTER-BAR (Canonical Filter Region):                                  │
│  ■ Embeds            │  [ 🔍 Search embeds...             ]   [All Modes ▾]   [Status: All ▾]     │
│  □ Test Console      ├────────────────────────────────────────────────────────────────────────────┤
│  □ Conversations     │  ┌─ CO-EMBED-CARD (Navigates to /workspaces/:slug/embeds/:id) ────────────┐│
│  □ Settings          │  │ 🌐 Product Help  [● READY]  [Installation Guide][Edit][Simulator][⧉][🗑]││
│                      │  │    Chat widget · Scope: Public Product Knowledge · Route-aware          ││
│                      │  └────────────────────────────────────────────────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

STAGE 2: PA-RESOURCE-CONFIGURATION (URL: /workspaces/:slug/embeds/:embedId — Preserves sidebarPosture):
┌────┬──────────────────────────────────────────────────────────────────────────────────────────────┐
│[OK]│ [»]  ← Embeds │  Embeds  >  Product Help     [● READY] [Installation Guide] [Host Simulator↗]│
│    ├──────────────────────────────────────────────────────────────────────────────────────────────┤
│[📁]│  Product Help  [✎] [?]                                   [Set as Draft] [Duplicate] [Delete] │
│[📄]│  Mode: Chat widget (SU-EMBED-CHAT) · Scope: Public Knowledge · Status: Ready · Active        │
│[<>]├──────────────────────────────────────────────────────────────────────────────────────────────┤
│[🧪]│  Body Configuration Navigation (PR-TABS):                                                    │
│    │  [ 1. Mode & Knowledge ]   [ 2. Context & Behavior ]   [ 3. Installation ]                   │
│    │  ┌──────────────────────────────────────────────────────────────────────────────────────────┐│
│    │  │ Tab 1/2: Fluid Configuration Surface (routeRules, locked host identity, appearance)      ││
│    │  │ Tab 3:   Compact Installation Readiness Summary + [Open installation guide →]            ││
│    │  └──────────────────────────────────────────────────────────────────────────────────────────┘│
│    │  ┌─ Step Progression Footer (CO-EMBED-STEP-FOOTER) ─────────────────────────────────────────┐│
│    │  │ [← All Embeds]             1 of 3 · Mode & Knowledge Scope    [Next: Context & Behavior→]││
│    │  └──────────────────────────────────────────────────────────────────────────────────────────┘│
└────┴──────────────────────────────────────────────────────────────────────────────────────────────┘
STAGE 3: APP-05 DEDICATED INSTALLATION SURFACE (URL: /workspaces/:slug/embeds/:embedId/installation):
┌────┬──────────────────────────────────────────────────────────────────────────────────────────────┐
│[OK]│ [»]  ← Product Help │ Embeds > Product Help > Installation     [● READY] [Host Simulator ↗]  │
│    ├──────────────────────────────────────────────────────────────────────────────────────────────┤
│[<>]│  Installation  ·  Install Product Help in your application.                  [Edit Embed]    │
│    ├──────────────────────────────────────────────────────────────────────────────────────────────┤
│    │  ┌─ CENTERED SINGLE-COLUMN RECIPE (max-w-3xl mx-auto) ──────────────────────────────────────┐│
│    │  │ • InstallationVerdict: Frontend-only | Frontend (optional signing) | Backend + frontend  ││
│    │  │ • EnvironmentSelector: "How is your app built?"  [ React ] [ Vue ] [ JavaScript ]        ││
│    │  │ • Step 01 (SERVER, if required): Add the server endpoint (+ inline secret warning)       ││
│    │  │ • Step 02 (BROWSER): Install the package & Add the Embed                                 ││
│    │  │ • Step 03 (VERIFY):  [Verify installation] → ✓ Installation looks good                   ││
│    │  │ • Footer:            ▸ Developer tools (Simulate drift, verification states, Simulator)  ││
│    │  └──────────────────────────────────────────────────────────────────────────────────────────┘│
└────┴──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.4 Screen 4: Test Console (`PAGE-APP-06`) — `PA-CONSOLE`

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned `PA-CONSOLE` with a 6-control toolbar, workspace-only scope, 3-role clearance selector, and post-query diagnostic panels.
- **Canonical Redesign (`TestConsoleView.tsx` — 5-Stage Inspection Pipeline)**:
  - **Architectural Model**: Replaces the developer debug toolbar with a **Calm Test Context Band** (`Scope: All workspace collections | Embed | Collection`, 4-way `Identity: Anonymous | Member | Admin | Invalid token`, `Route`, and progressive `Advanced execution ▾`) backed by a single canonical `resolveTestConsoleScope` resolver (`EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`).
  - **Resolved Audit Gaps**:
    1. **Zero Session Mutation (§2.5 & Principle 7)**: Test Context controls operate strictly on the local simulation pipeline without mutating `authService` session state.
    2. **Pre-Populated Zero-State & Stage-Ordered Inspection (`[ Access ] [ Retrieval ] [ Cache ]`)**: `[ Access ]` populates immediately on load (`Allowed for retrieval`, `Excluded before retrieval`, `Outside target scope`); `[ Retrieval ]` unifies `Answer Plan` + `Ranked Chunks` (`[Details ▾]` progressive disclosure); `[ Cache ]` surfaces `kv:v{knowledgeVersion}`, compact `av:v1 (N cols)` epoch state, 4-way partition summary, and `[Re-run query]` / `[Invalidate cache]` test actions (removing the overflowing `kv`/`av` badge from `CO-PAGE-HEADER`).
    3. **First-Class `Invalid token` (`401`) Boundary & Executable Scenarios**: Selecting `Invalid token` halts prior to retrieval (`401 Unauthorized · INVALID_TOKEN_SIGNATURE`, `Retrieved chunks: 0`, `Anonymous fallback: None`), and 4 executable Verification Scenarios prove `OBJECTIVE`, `CONTEXT`, `EXPECTED`, and live `ACTUAL` outcomes.
    4. **Viewport Bounded (§2.8)**: Strictly viewport-bounded (`lg:h-screen lg:overflow-hidden`, `flex-1 min-h-0`) with independent pane scrolling.

#### B. ASCII Comparison — Screen 4: Test Console (`PA-CONSOLE`)

```text
[PREVIOUS IMPLEMENTATION — Global Session Mutation in Test Bar, Workspace-Only Scope, Unbounded]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Test Knowledge Retrieval, Cache & Multilingual Compiler                   │
│                      ├────────────────────────────────────────────────────────────────────────────┤
│  ■ Test Console      │  ROLE:[Public|Members|Admins] COMPILER:[Det|Ext|Gen] LANG:[Auto|EN|ES]     │
│                      │  ROUTE:[/settings/sso] TEST PERSONA:[Sarah Chen ▾] [Bump Knowledge Version]│
│                      │  Quick tests: [Invite Teammates] [Invitar Miembros] ...                    │
│                      ├──────────────────────────────────────────┬─────────────────────────────────┤
│                      │  Ask Knowledge Question                  │ Cache, Language & Compiler      │
│                      │  [ Where do I invite team members? ][Run]│ (Unbounded page scroll)         │
│                      │  [Compiled Answer — Missing Feedback!]   │                                 │
└──────────────────────┴──────────────────────────────────────────┴─────────────────────────────────┘

[TARGET ARCHETYPE — PA-CONSOLE (SU-TEST-CONSOLE: 5-Stage Inspection Pipeline, Clean Header, Bounded Viewport)]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Test Console                                                              │
│                      │  Verify what a user can access, what OKEng retrieves, and why an answer... │
│  □ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  SCOPE: [All workspace collections ▾]  IDENTITY: [Anon][Member][Admin][401]│
│  □ Embeds            │  ROUTE: [/settings/security/sso     ]  [Advanced execution: Det · Auto ▾]  │
│  ■ Test Console      │  SCENARIOS: [Access boundary][Progressive identity][Multilingual][Cache]   │
│  □ Conversations     ├──────────────────────────────────────────┬─────────────────────────────────┤
│  □ Settings          │  Query & Grounded Outcome (Scroll)       │ Inspection Pipeline (Scroll)    │
│                      │  ┌──────────────────────────────────────┐│ ┌─────────────────────────────┐ │
│                      │  │ [ Ask a question...      ][Run test] ││ │ [Access][Retrieval][Cache]  │ │
│                      │  ├──────────────────────────────────────┤│ ├─────────────────────────────┤ │
│                      │  │ • Scenario Verification Banner       ││ │ • Access: Allowed / Excluded│ │
│                      │  │ • Grounded Answer (TEST_CHAT)        ││ │   (Zero-state pre-populated)│ │
│                      │  │   or 401 Hard Security Boundary      ││ │ • Retrieval: Answer Plan +  │ │
│                      │  │ • CO-NEXT-STEP + CO-SOURCE-LIST      ││ │   Ranked Chunks [Details ▾] │ │
│                      │  │ • CO-FEEDBACK (Helpful / Unhelpful)  ││ │ • Cache: kv/av + Test Actions│ │
│                      │  └──────────────────────────────────────┘│ └─────────────────────────────┘ │
└──────────────────────┴──────────────────────────────────────────┴─────────────────────────────────┘
```

---

### 3.5 Screen 5: Conversations (`PAGE-APP-07`) — `PA-INSPECTOR`

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned `PA-INSPECTOR` with `CO-PAGE-HEADER`, `PR-TABS` (`All | Helpful | Unhelpful`), `PR-INPUT` keyword search, `CO-CONTENT-RENDERER` (`CHAT_ANSWER`), `CO-FEEDBACK`, and `CO-NEXT-STEP`.
- **Actual Implementation (`ConversationsView.tsx`)**:
  - Renders a 2-column layout without viewport bounding or feedback filter tabs.
  - **Audit Gaps**:
    1. **Missing Feedback Filter (`PR-TABS`)**: Omits the mandatory `All | Helpful | Unhelpful` filter required by `PAGE-APP-07`.
    2. **Master Header Clutter**: Renders a multi-line `hint` below the search input inside the master pane header.
    3. **Viewport Violation (§2.8)**: Not viewport-bounded (`h-screen overflow-hidden`, `flex-1 min-h-0`).
    4. **Non-Actionable Citations**: Cited documents in the detail inspector cannot be clicked to open the **File Editor** (`PAGE-APP-03`).

#### B. ASCII Comparison — Screen 5: Conversations (`PA-INSPECTOR`)

```text
[CURRENT IMPLEMENTATION — Missing Feedback Filter Tabs, Unbounded Scroll, Dead-End Citations]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Conversations & Operational Log                                           │
│                      ├────────────────────────────────────────────────────────────────────────────┤
│  ■ Conversations     │  ┌─ Master List (Missing Feedback Tabs) ┐ ┌─ Detail Inspector ────────────┐│
│                      │  │ [ 🔍 Search inquiries...           ] │ │ Inquiry Details       [👍] [i]││
│                      │  │ Helper hint text bloats header...    │ │ CONTENT PAYLOAD               ││
│                      │  ├──────────────────────────────────────┤ │ [Rendered Answer]             ││
│                      │  │ ASSISTANT                     14:22  │ │ CITED KNOWLEDGE DOCUMENTS (2) ││
│                      │  │ OKEng verifies short-lived HMAC...   │ │ security-model.md (Static!)   ││
│                      │  └──────────────────────────────────────┘ └───────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

[TARGET ARCHETYPE — PA-INSPECTOR (SU-CONVERSATION-INSPECTOR: Bounded Master/Detail + CO-SOURCE-LIST)]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Conversations & Operational Log          [3 Total · 2 Helpful · 1 Issue]  │
│                      │  Audit end-user inquiries, inspect cited documents, and review feedback.   │
│  □ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  ┌─ Master Stream (Independent Scroll) ─┐ ┌─ Detail Inspector (Scroll) ───┐│
│  □ Embeds            │  │ [ 🔍 Search inquiries or citations ] │ │ Inquiry Details       [👎] [i]││
│  □ Test Console      │  │ [ All (3) ] [ 👍 Helpful ] [ 👎 (1) ]│ │ 2026-10-04 · Clearance: PUBLIC││
│  ■ Conversations     │  ├──────────────────────────────────────┤ ├───────────────────────────────┤│
│  □ Settings          │  │ ● PUBLIC                      14:22  │ │ GROUNDED ANSWER               ││
│                      │  │   OKEng verifies short-lived HMAC... │ │ [Rendered Answer]             ││
│                      │  │   [👍 Helpful] · 2 citations         │ │ + CO-NEXT-STEP                ││
│                      │  ├──────────────────────────────────────┤ ├───────────────────────────────┤│
│                      │  │   MEMBERS                     13:10  │ │ CITED DOCUMENTS (CO-SOURCE-LIST│
│                      │  │   How do I configure SAML SSO?       │ │ ┌───────────────────────────┐ ││
│                      │  │   [👎 Unhelpful] · 1 citation        │ │ │ security-model.md · 94%   │ ││
│                      │  │                                      │ │ │ [Open in File Editor ↗]   │ ││
│                      │  └──────────────────────────────────────┘ │ └───────────────────────────┘ ││
│                      │                                           └───────────────────────────────┘│
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.6 Screen 6: Settings (`PAGE-APP-08`) — `PA-SYSTEM-CONFIGURATION`

#### A. Spec vs. Implementation Evaluation
- **Previous Spec (`03_page_specifications.md`)**: Assigned `PA-CONFIGURATION` with `CO-PAGE-HEADER`, `PR-TABS`, Default Workspace Language, Dual RBAC Matrix (`AUTH-03`), Signing Keys, Audit Log, and JSON Backup.
- **Actual Implementation (`SettingsView.tsx`)**:
  - Stacks 5 cards vertically on a single page without `PR-TABS`, omits Default Workspace Language, omits the Dual RBAC Matrix, and injects inline `<Box>` forms for `Invite Member` and `Transfer Ownership`.
  - **Audit Gaps**:
    1. **Missing Configuration Navigation (`PR-TABS`)**: Needs persistent configuration navigation (`General`, `Members & RBAC`, `Credentials & Keys`, `Audit Log`) with normal page scrolling and a bounded content surface for the active section.
    2. **Missing Spec Features**: Missing Default Workspace Language (`EN`/`ES`) in `General` and Dual RBAC Matrix (`CO-RBAC-MATRIX` / `AUTH-03`) in `Members & RBAC`.
    3. **Inline Mutation Forms**: `Invite Member` and `Transfer Ownership` should use `PR-DRAWER-SM`.

#### B. ASCII Comparison — Screen 6: Settings (`PA-SYSTEM-CONFIGURATION`)

```text
[CURRENT IMPLEMENTATION — 5 Stacked Cards, No Configuration Navigation, Missing Language & RBAC]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Workspace Settings & Security                                             │
│                      ├────────────────────────────────────────────────────────────────────────────┤
│  ■ Settings          │  [Card 1: Workspace Details (Missing Default Language!)]                   │
│                      │  [Card 2: Workspace Members & Roles (Inline Invite/Transfer Boxes!)]       │
│                      │  [Card 3: Embed & Security Credentials]                                    │
│                      │  [Card 4: Security Audit Log]                                              │
│                      │  [Card 5: Workspace Archive & Backup]                                      │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘

[TARGET ARCHETYPE — PA-SYSTEM-CONFIGURATION (SU-WORKSPACE-SETTINGS: Config Nav + CO-RBAC-MATRIX)]
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│  OKEng (240px)       │  Workspace Settings & Security                      [⬇ Export Backup JSON] │
│                      │  Manage workspace identity, access control, credentials, and audit logs.   │
│  □ Collections       ├────────────────────────────────────────────────────────────────────────────┤
│  □ Files             │  Persistent Configuration Navigation (PR-TABS):                            │
│  □ Embeds            │  [ General ]  [ Members & RBAC (3) ]  [ Credentials & Keys ]  [ Audit Log ]│
│  □ Test Console      ├────────────────────────────────────────────────────────────────────────────┤
│  □ Conversations     │  Bounded Active Configuration Content Surface (Normal page scroll):        │
│  ■ Settings          │  • General: Workspace Name, Slug, Default Language (EN/ES), Archive Backup │
│                      │  • Members & RBAC: Members Table + CO-RBAC-MATRIX (AUTH-03)                │
│                      │    + [Invite Member] & [Transfer Ownership] via PR-DRAWER-SM               │
│                      │  • Credentials & Keys: Public Client Key + HMAC Signing Secret Rotation    │
│                      │  • Audit Log: Append-only Security Audit Event Table                       │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. New & Updated Primitives (`PR-*`), Components (`CO-*`), Surfaces (`SU-*`), and Spec Updates

### 4.1 Layer 2 — New & Updated UI Primitives (`PR-*` in `src/components/ui/`)

| Primitive ID | Status | Implementation File | Contract & Specification Changes |
| :--- | :--- | :--- | :--- |
| **`PR-FILTER-BAR`** | **NEW** | `src/components/ui/FilterBar.tsx` | Canonical responsive filter region container (`searchSlot`, `filtersSlot`, `summarySlot`) enforcing **One dataset → one filter model → one filter region** across `PA-DIRECTORY`, `PA-DATA-DIRECTORY`, and `PA-INSPECTOR`. Wraps cleanly across rows at narrower viewports. |
| **`PR-DRAWER`** | **UPDATED** | `src/components/ui/Drawer.tsx` | Adds semantic size tokens: `size?: 'sm' \| 'md' \| 'lg'` (`PR-DRAWER-SM`: `340px`, `PR-DRAWER-MD`: `420px`, `PR-DRAWER-LG`: `520px`) driven by content complexity, plus an optional `scopeBanner?: React.ReactNode` slot at the top of the drawer body to display explicit mutation scope (`WHAT`, `WHERE`, `WHO/WHAT`). |
| **`PR-CARD`** | **UPDATED** | `src/components/ui/Card.tsx` | Enforces the **Interaction Affordance Invariant (§2.7)**: when `interactive` is true and `onClick` is provided, renders keyboard-accessible hit-target semantics (`role="button"`, `tabIndex={0}`, `Enter`/`Space` activation); prohibits `interactive` styling on cards without an associated click action. |
| **`PR-BADGE`** | **UPDATED** | `src/components/ui/Badge.tsx` | Formalizes high-contrast solid status tones (`solid-success`, `solid-warning`, `solid-accent`, `solid-danger`), `StatusIndicator` `variant?: 'inline' \| 'solid'`, and clarified `AccessBadge` (`Public` / `Público`, `Members` / `Miembros`, `Admins` / `Administradores`). |

---

### 4.2 Layer 3 — New & Updated Domain Components (`CO-*` in `src/components/`)

| Component ID | Status | Implementation File | Depends On | Contract & Specification Changes |
| :--- | :--- | :--- | :--- | :--- |
| **`CO-EMBED-CARD` / `CO-EMBED-STATUS`** | **NEW** | `src/components/EmbedCard.tsx` | `PR-CARD`, `PR-BADGE`, `PR-BUTTON`, `PR-INFO-POPOVER` | Readiness-aware operational resource card/row for `Embeds` (`PA-DIRECTORY`), derived lifecycle badge, and `evaluateEmbedInstallationContract` 3-state signing evaluator (`none` \| `optional` \| `required`). Entire card body navigates to `/workspaces/:slug/embeds/:embedId`, while isolated `stopPropagation()` actions expose `[Installation Guide]` (navigating to `/installation` when `readyForInstallation`), `[Edit / Continue]`, `[Simulator]`, `[Duplicate]`, and `[Delete]`. |
| **`CO-EMBED-INSTALLATION`** | **NEW** | `src/pages/EmbedInstallationView.tsx` | `CO-CHILD-NAVBAR`, `PR-CARD`, `PR-BOX`, `PR-BADGE`, `PR-TABS`, `PR-CODE-BLOCK`, `PR-SELECT`, `PR-BUTTON` | Dedicated centered single-column (`max-w-3xl mx-auto`) configuration-driven developer installation recipe (`APP-05` / `SU-EMBED-INSTALLATION`) at `/workspaces/:slug/embeds/:embedId/installation` (`/app/embed/:embedId/installation`), presenting `InstallationVerdict`, `[React \| Vue \| JavaScript]` browser environments, conditional `SERVER` / `BROWSER` steps, single-action `[Verify installation]`, and collapsed `Developer tools` (`INV-EMBED-05`–`INV-EMBED-12`). |
| **`CO-UPLOAD-DRAWER`** | **NEW** | `src/components/UploadDrawer.tsx` | `PR-DRAWER` (`size="md"`), `PR-SELECT`, `PR-BADGE`, `CO-UPLOAD-DROPZONE` | Contextual file ingestion drawer for both `GlobalFilesView` (`PA-DATA-DIRECTORY`) and `CollectionDetailView` (`PA-RESOURCE-DETAIL`). Enforces the **`lockedCollectionId` Semantic Scope Lock Invariant**: when `lockedCollectionId` is present, destination resolves exclusively from that ID (never from UI state or collection ordering) and the `Target Collection` `<Select>` is omitted; when absent, requires explicit `Target Collection` selection. |
| **`CO-RBAC-MATRIX`** | **NEW** | `src/components/RbacMatrix.tsx` | `PR-CARD`, `PR-TABLE`, `PR-BADGE`, `PR-TEXT` | Renders the canonical **Dual RBAC Matrix (`AUTH-03`)** (`Platform Roles: PLATFORM_ADMIN` vs. `Workspace Roles: WORKSPACE_OWNER, WORKSPACE_USER`, permission capabilities, and pre-retrieval clearance mapping) inside `Settings > Members & RBAC`. |
| **`CO-FILE-ROW` (`FileTable`)** | **UPDATED** | `src/components/FileTable.tsx` | `PR-FILTER-BAR`, `PR-TABLE`, `PR-INPUT`, `PR-SELECT`, `PR-BADGE`, `PR-BUTTON` | Consolidates dataset filtering into a single `PR-FILTER-BAR` header region. Enforces the **`scopedCollectionName` Filter Model Invariant**: when `scopedCollectionName` is provided (`CollectionDetailView`), operates strictly against the parent-supplied collection-scoped dataset with collection-bounded search and `Status` filter only (never rendering or maintaining a competing collection filter or `Collection` column). |
| **`CO-SOURCE-LIST`** | **UPDATED** | `src/components/SourceList.tsx` | `PR-CARD`, `PR-BOX`, `PR-BADGE`, `PR-BUTTON`, `CO-CONTENT-RENDERER` | Adds `onOpenDocument?: (docId: string) => void` so cited documents in `Test Console` (`PA-CONSOLE`) and `Conversations` (`PA-INSPECTOR`) provide a direct `Open in File Editor ↗` action. |
| **`CO-CHILD-NAVBAR`** | **UPDATED** | `src/components/ChildContextNavbar.tsx` | `PR-BUTTON`, `PR-DIVIDER`, `PR-BADGE`, `CO-APP-SHELL` | Canonical Level-2 context primitive for all persistent child-resource workspaces: `CollectionDetailView` (`PA-RESOURCE-DETAIL`), `MarkdownEditor` (`PA-EDITOR`), `EmbedDetail` (`PA-RESOURCE-CONFIGURATION`), and `EmbedInstallationView` (`APP-05`). |

---

### 4.3 Layer 4 — Canonical Workspace Surfaces (`SU-*`)

| Surface ID | Status | Archetype | Host Page | Composed Components |
| :--- | :--- | :--- | :--- | :--- |
| **`SU-COLLECTION-DIRECTORY`** | **UPDATED** (from `SU-COLLECTION-MANAGEMENT`) | `PA-DIRECTORY` | `PAGE-APP-01` (`Collections`) | `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `CO-COLLECTION-CARD`, `PR-DRAWER` (`size="md"`), `CO-VISIBILITY-SELECTOR`, `PR-EMPTY-STATE` |
| **`SU-COLLECTION-DETAIL`** | **NEW** (split from `SU-COLLECTION-MANAGEMENT`) | `PA-RESOURCE-DETAIL` | `PAGE-APP-02` (`Collection Detail`) | `CO-CHILD-NAVBAR` (Two-Surface), `CO-VISIBILITY-SELECTOR`, `CO-FILE-ROW` (`scopedCollectionName`), `CO-UPLOAD-DRAWER` (`lockedCollectionId`) |
| **`SU-FILE-EDITOR`** | **UPDATED** | `PA-EDITOR` | `PAGE-APP-03` (`File Editor`) | `CO-CHILD-NAVBAR`, `CO-MARKDOWN-EDITOR`, `CO-CONTENT-RENDERER`, `CO-NEXT-STEP`, `PR-DRAWER` (`size="md"`), `PR-MODAL` |
| **`SU-FILE-DIRECTORY`** | **UPDATED** (from `SU-FILE-MANAGEMENT`) | `PA-DATA-DIRECTORY` | `PAGE-APP-04` (`Files`) | `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `CO-FILE-ROW`, `CO-UPLOAD-DRAWER` |
| **`SU-EMBED-DIRECTORY`** | **NEW** (split from `SU-EMBED-CONFIGURATION`) | `PA-DIRECTORY` | `PAGE-APP-05` (`Embeds List`) | `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `CO-EMBED-CARD`, `PR-DRAWER` (`size="md"`) |
| **`SU-EMBED-RESOURCE-CONFIG`** | **NEW** (split from `SU-EMBED-CONFIGURATION`) | `PA-RESOURCE-CONFIGURATION` | `PAGE-APP-05 Detail` (`/workspaces/:slug/embeds/:embedId`) | `CO-CHILD-NAVBAR`, `CO-EMBED-STATUS`, `PR-TABS` (body-level), `PR-CARD`, `PR-INPUT`, `PR-SELECT`, `PR-CHECKBOX` |
| **`SU-EMBED-INSTALLATION`** | **UPDATED** | `PA-RESOURCE-CONFIGURATION` | `APP-05` (`/workspaces/:slug/embeds/:embedId/installation`) | `CO-CHILD-NAVBAR`, `CO-EMBED-INSTALLATION`, `PR-CARD`, `PR-TABS`, `PR-CODE-BLOCK`, `PR-SELECT`, `PR-BUTTON` |
| **`SU-EMBED-HOST-SIMULATOR`** | **UPDATED** | `PA-EMBEDDED-WIDGET` | `PAGE-WIDGET` (`/workspaces/:slug/embeds/preview`) | `CO-LANGUAGE-SELECTOR`, `CO-CONTENT-RENDERER`, `CO-DOCUMENT-VIEWER`, `CO-DOCUMENT-NAV`, `CO-NEXT-STEP`, `PR-DRAWER` |
| **`SU-TEST-CONSOLE`** | **UPDATED** | `PA-CONSOLE` | `PAGE-APP-06` (`Test Console`) | `CO-PAGE-HEADER`, `PR-SELECT`, `PR-TABS`, `PR-CARD`, `PR-INPUT`, `PR-BUTTON`, `CO-CONTENT-RENDERER`, `CO-SOURCE-LIST`, `CO-FEEDBACK`, `CO-NEXT-STEP` |
| **`SU-CONVERSATION-INSPECTOR`** | **UPDATED** | `PA-INSPECTOR` | `PAGE-APP-07` (`Conversations`) | `CO-PAGE-HEADER`, `PR-FILTER-BAR`, `PR-TABS`, `CO-CONTENT-RENDERER`, `CO-SOURCE-LIST`, `CO-FEEDBACK`, `CO-NEXT-STEP` |
| **`SU-WORKSPACE-SETTINGS`** | **NEW** | `PA-SYSTEM-CONFIGURATION` | `PAGE-APP-08` (`Settings`) | `CO-PAGE-HEADER`, `PR-TABS`, `PR-CARD`, `CO-RBAC-MATRIX`, `PR-TABLE`, `PR-DRAWER` (`size="sm"`) |

---

## 5. Phased Standardization Roadmap & Definition of Standardized

### Phase 1 — Normative Taxonomy & Structural Contracts (Documentation Layer) — **COMPLETE**
1. Persisted `/docs/04_top_screens_audit_and_standardization.md` and synchronized `/docs/01_ui_foundation.md`, `/docs/02_component_catalog.md`, and `/docs/03_page_specifications.md` with the canonical archetype taxonomy: **5 top-level behavioral families (`PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-CONSOLE`, `PA-INSPECTOR`, `PA-SYSTEM-CONFIGURATION`) plus persistent child-resource archetypes (`PA-RESOURCE-DETAIL`, `PA-EDITOR`, `PA-RESOURCE-CONFIGURATION`)**, with `PA-CONFIGURATION` explicitly defined as an abstract behavioral family never directly assigned to a `PAGE`.
2. Frozen the **8 Normative Principles**, **3-Level Global Page Anatomy** (`CO-PAGE-HEADER` and `CO-CHILD-NAVBAR` as parallel Level 2 context primitives), **Resource Context State Machine**, **Filter State Ownership Invariant**, **Semantic Mutation Scope Invariant**, **Interaction Affordance Invariant**, and **Semantic Drawer Sizing (`PR-DRAWER-SM | MD | LG`)**.
3. **Implementation Governance Guard**: **No implementation change may introduce a new page-level interaction pattern without either composing an existing archetype contract or explicitly amending the normative architecture first.**

### Phase 2 — Foundation Primitives & Domain Components — **COMPLETE**
1. Implemented `PR-FILTER-BAR` (`src/components/ui/FilterBar.tsx`) and updated `PR-DRAWER` (`size?: 'sm' | 'md' | 'lg'`, `scopeBanner`, `footer`) and `PR-CARD` (interactive keyboard/hit-target contract).
2. Implemented `CO-EMBED-CARD` (`src/components/EmbedCard.tsx`), `CO-UPLOAD-DRAWER` (`src/components/UploadDrawer.tsx`), and `CO-RBAC-MATRIX` (`src/components/RbacMatrix.tsx`).
3. Updated `CO-FILE-ROW` (`FileTable.tsx`) with unified `PR-FILTER-BAR` (`Search` + `Collection` + `Status`) and `CO-SOURCE-LIST` (`SourceList.tsx`) with `onOpenDocument` File Editor navigation.

### Phase 3 — Page-by-Page Behavioral Alignment (Implementation Layer) — **COMPLETE**
1. **Collections (`PA-DIRECTORY` / `SU-COLLECTION-DIRECTORY`)**: Added `PR-FILTER-BAR` (`Search` + `All | Public | Members | Admins`), migrated `+ New Collection` to `PR-DRAWER-MD` with explicit workspace scope, and removed unused props.
2. **Files (`PA-DATA-DIRECTORY` / `SU-FILE-DIRECTORY`) & Collection Detail (`PA-RESOURCE-DETAIL` / `SU-COLLECTION-DETAIL`)**: Unified filter state and toolbar in `FileTable` (`PR-FILTER-BAR`), replaced inline dropzones with `[⬆ Upload File]` triggering `CO-UPLOAD-DRAWER` (explicit `Target Collection` required in `GlobalFilesView`; semantic scope lock via `lockedCollectionId` in `CollectionDetailView`), and aligned `CollectionDetailView` on the two-surface `CO-CHILD-NAVBAR` (`24px` axis) and fluid `p-6 w-full` `FileTable` layout.
3. **Embeds (`PA-DIRECTORY` / `SU-EMBED-DIRECTORY` + `PA-RESOURCE-CONFIGURATION` / `SU-EMBED-RESOURCE-CONFIG`)**: Rendered `PR-FILTER-BAR` + clickable `CO-EMBED-CARD` items, migrated `+ Create Embed` to `PR-DRAWER-MD`, removed non-operational prose banner, and transitioned `Embed Detail` into `navigationContext: 'resource'` (`CO-CHILD-NAVBAR` + `24px` axis + `PR-TABS` sectioned configuration navigation, preserving `sidebarPosture`).
4. **Test Console (`PA-CONSOLE` / `SU-TEST-CONSOLE`)**: Replaced the legacy developer debug toolbar with the **5-Stage Inspection Pipeline** (`Calm Test Context Band` with `Scope: Workspace | Embed | Collection`, 4-way `Identity: Anonymous | Member | Admin | Invalid token`, `Route`, and progressive `Advanced execution ▾`), unified permission evaluation under `resolveTestConsoleScope` (`EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`), added 4 executable Verification Scenarios, and organized the right-hand inspector into 3 stage-ordered tabs (`[ Access ] [ Retrieval ] [ Cache ]`) with `[Re-run query]` / `[Invalidate cache]` actions and compact epoch formatting inside `[ Cache ]` (keeping `CO-PAGE-HEADER` clean and overflow-free).
5. **Conversations (`PA-INSPECTOR` / `SU-CONVERSATION-INSPECTOR`)**: Enforced viewport-bounded master/detail scrolling (`lg:h-screen lg:overflow-hidden`, `flex-1 min-h-0`), added `All | Helpful | Unhelpful` `SegmentedTabs`, removed the search header hint, and composed actionable `CO-SOURCE-LIST` (`Edit` in File Editor).
6. **Settings (`PA-SYSTEM-CONFIGURATION` / `SU-WORKSPACE-SETTINGS`)**: Added persistent `PR-TABS` configuration navigation (`General`, `Members & RBAC`, `Credentials & Keys`, `Audit Log`) with normal page scrolling and bounded content surface, added **Default Workspace Language (`EN`/`ES`)**, composed `CO-RBAC-MATRIX` (`AUTH-03`), and migrated `Invite Member` / `Transfer Ownership` to `PR-DRAWER-SM`.

### Phase 4 — Regression & Definition of Standardized (DoD) — **COMPLETE & VERIFIED**

| DoD Architectural Invariant | Verification Scope | Status |
| :--- | :--- | :--- |
| **1. Concrete `PA-*` Archetype Assignment** (`PA-CONFIGURATION` remains abstract) | `PAGE-APP-01` (`PA-DIRECTORY`), `PAGE-APP-02` (`PA-RESOURCE-DETAIL`), `PAGE-APP-03` (`PA-EDITOR`), `PAGE-APP-04` (`PA-DATA-DIRECTORY`), `PAGE-APP-05` (`PA-DIRECTORY` & `PA-RESOURCE-CONFIGURATION`), `PAGE-APP-06` (`PA-CONSOLE`), `PAGE-APP-07` (`PA-INSPECTOR`), `PAGE-APP-08` (`PA-SYSTEM-CONFIGURATION`) | **VERIFIED** |
| **2. Resource Context State Machine (`navigationContext ≠ sidebarPosture`)** | Entering `CollectionDetailView`, `MarkdownEditor`, or `EmbedDetail` switches `navigationContext` to `'resource'` (`CO-CHILD-NAVBAR` + `24px` axis) and returning exits back to `'workspace'` (`CO-PAGE-HEADER` + `32px` axis) without mutating `sidebarPosture` | **VERIFIED** |
| **3. Filter State Ownership Invariant** (`One dataset → one filter model → one filter region`) | `CollectionsView` (`PR-FILTER-BAR`), `FileTable` (`PR-FILTER-BAR` — global or collection-scoped via `scopedCollectionName`), `EmbedConfigView` (`PR-FILTER-BAR`), `ConversationsView` (master stream filter bar) | **VERIFIED** |
| **4. Semantic Mutation Scope Invariant** (`WHAT`, `WHERE`, `WHO/WHAT` via `scopeBanner` & `lockedCollectionId` scope lock) | `New Collection` (`PR-DRAWER-MD`), `Upload File` (`CO-UPLOAD-DRAWER` — explicit selection in `GlobalFilesView`, `lockedCollectionId` scope lock in `CollectionDetailView`), `Create Embed` (`PR-DRAWER-MD`), `Document Details` (`PR-DRAWER-MD`), `Invite Member` & `Transfer Ownership` (`PR-DRAWER-SM`) | **VERIFIED** |
| **5. Interaction Affordance Invariant** (Hit target matches visual affordance; nested actions use `stopPropagation()`) | `PR-CARD` (`interactive && onClick`), `CO-COLLECTION-CARD`, `CO-EMBED-CARD`, `CO-FILE-ROW` (`FileTable`) | **VERIFIED** |
| **6. Viewport & Scrolling Model by Archetype** | Bounded viewport + independent pane scroll on `PA-EDITOR`, `PA-CONSOLE`, and `PA-INSPECTOR`; normal page scroll on `PA-DIRECTORY`, `PA-DATA-DIRECTORY`, `PA-RESOURCE-DETAIL`, `PA-SYSTEM-CONFIGURATION`, and `PA-RESOURCE-CONFIGURATION` | **VERIFIED** |
| **7. Global Session State vs. Simulation State** | `TestConsoleView` Calm Test Context Band controls only simulation parameters (`Scope`, `Identity`, `Route`, and `Advanced execution: Answer Mode & Response Language`); global persona switching lives exclusively in `CO-SIDEBAR` (`CO-ACCOUNT-MENU`) | **VERIFIED** |
| **8. Control Dimension & Alignment Invariant (`DS-CONTROL-HEIGHT-*`)** | Unified `xs=24px` (`h-6`), `sm=32px` (`h-8`), `md=36px` (`h-9`), `lg=40px` (`h-10`) height scale across `PR-INPUT`, `PR-SELECT`, `PR-TABS`, and `PR-BUTTON`; all `PR-FILTER-BAR` and simulation toolbar controls use `sm` (`32px`) with built-in `leadingIcon` and custom `ChevronDown` | **VERIFIED** |
| **9. Sidebar Posture & Layout Adaptability Invariant (`DS-SIDEBAR-POSTURE-001`, `DS-LAYOUT-AXIS`, `DS-CONTAINER-WIDTH`, `DS-SHELL-TRIGGER`)** | Persistent route-independent `sidebarPosture` (`'expanded' \| 'collapsed'`) decoupled from `navigationContext` (`workspace` = `32px` axis; `resource` = `24px` axis); `CO-PAGE-HEADER` (`px-8` / `pl-14 pr-8`) and `CO-CHILD-NAVBAR` (`px-6` / `pl-12 pr-6`) at `sticky top-0 z-20` beneath `DS-SHELL-TRIGGER` (`z-30`); fluid `w-full` page-level containers across all workspace screens | **VERIFIED** |
| **10. Canonical Embed Lifecycle, Dedicated `APP-05` Installation Recipe, 3-State Signing Contract & Host Simulator Fidelity (`EMBED-02` / `APP-05` / `INV-EMBED-01`–`12`)** | 3-stage URL-addressed hierarchy (`/workspaces/:slug/embeds` → `/workspaces/:slug/embeds/:embedId` → `/workspaces/:slug/embeds/:embedId/installation`, aliased to `/app/embed/:embedId/installation`); Stage 2 Tab 3 as a compact **Installation Launcher** (`[Open installation guide →]`) with no competing installation drawer; deterministic 3-state signing derivation (`Public + Off → No signing`, `Public + On → Signing optional`, `Protected → Forced & Locked useHostUserContext=true → Signing required`); centered single-column (`max-w-3xl mx-auto`) `APP-05` Installation Recipe (`EmbedInstallationView.tsx`) with `InstallationVerdict`, `[React \| Vue \| JavaScript]` browser environment selector, conditional `SERVER` / `BROWSER` steps, single-action `[Verify installation]` with progressive error recovery, and collapsed `Developer tools`; full Host Simulator (`SU-EMBED-HOST-SIMULATOR`) with `Viewport` simulation and 5-part `Inspect` diagnostics | **VERIFIED** |
| **11. Canonical Test Console Inspection Pipeline & Single `EffectiveScope` Resolver (`PAGE-APP-06` / `SU-TEST-CONSOLE`)** | Single canonical `resolveTestConsoleScope` resolver (`EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections`); pre-populated zero-state `[ Access ]` tab; first-class `Invalid token` (`401 Unauthorized · INVALID_TOKEN_SIGNATURE`) hard security boundary with zero retrieval and zero anonymous fallback; 4 executable Verification Scenarios (`OBJECTIVE / CONTEXT / EXPECTED / ACTUAL`); progressive `[Details ▾]` chunk ranking disclosure in `[ Retrieval ]`; compact `kv`/`av` epoch formatting and `[Re-run query]` / `[Invalidate cache]` actions in `[ Cache ]`; deep-link context preservation (`?collectionId=:id` and `?embedId=:id`) | **VERIFIED** |

---

## 7. Interactive Control Primitives & Filter Bar Dimension Standard (`DS-CONTROL-HEIGHT-*`)

To ensure placing any combination of search inputs, dropdown selects, segmented tabs, or action buttons inside a filter bar or toolbar never distorts horizontal alignment or control styling:

| Tier | Height (`px` / Tailwind) | Participating Primitives | Canonical Usage Context |
| :--- | :--- | :--- | :--- |
| **`xs`** | **`24px` (`h-6`)** | `PR-BUTTON` (`size="xs"`), `PR-TABS` (`size="xs"`) | Dense table row actions (`Re-index`, `Delete`), micro inline chips |
| **`sm`** | **`32px` (`h-8`)** | `PR-INPUT` (`sizeVariant="sm"`), `PR-SELECT` (`sizeVariant="sm"`), `PR-TABS` (`size="sm"`), `PR-BUTTON` (`size="sm"`), `CO-ROLE-SELECTOR` (`size="sm"`), `CO-LANGUAGE-SELECTOR` | **All `PR-FILTER-BAR` controls**, `PA-CONSOLE` simulation toolbars, `PA-INSPECTOR` stream filters, and `CO-CHILD-NAVBAR` actions |
| **`md`** | **`36px` (`h-9`)** | `PR-INPUT` (`sizeVariant="md"`), `PR-SELECT` (`sizeVariant="md"`), `PR-TABS` (`size="md"`), `PR-BUTTON` (`size="md"``) | **Default height** for standalone form fields, `PR-DRAWER` forms, and `CO-PAGE-HEADER` primary CTAs |
| **`lg`** | **`40px` (`h-10`)** | `PR-INPUT` (`sizeVariant="lg"`), `PR-SELECT` (`sizeVariant="lg"`), `PR-BUTTON` (`size="lg"`) | Prominent authentication and public hero controls |

---

## 8. `PAGE-APP-02` (`Collection Detail`) & `PAGE-APP-04` (`Global Files`) Shared File-Management Grammar

`PAGE-APP-02` (`CollectionDetailView` / `PA-RESOURCE-DETAIL`) reuses the same file-management grammar as `PAGE-APP-04` (`GlobalFilesView` / `PA-DATA-DIRECTORY`) while specializing only the semantics imposed by collection resource context:

1. **`lockedCollectionId` Semantic Scope Lock Invariant (`CO-UPLOAD-DRAWER`)**:
   > **`lockedCollectionId` is a semantic scope lock, not merely a UI convenience. When present, the upload mutation MUST resolve its destination exclusively from that ID; the component MUST NOT derive the destination from selected UI state or collection ordering.**
2. **`scopedCollectionName` Filter Model Invariant (`CO-FILE-ROW` / `FileTable`)**:
   > **When `scopedCollectionName` is provided, the table operates against the already collection-scoped dataset supplied by the parent. It MUST NOT render or maintain a competing collection filter.**

---

## 9. Sidebar Posture & Layout Adaptability Invariant (`DS-SIDEBAR-POSTURE-001`, `DS-LAYOUT-AXIS`, `DS-CONTAINER-WIDTH`, `DS-SHELL-TRIGGER`)

### 9.1 Canonical Normative Invariant (`DS-SIDEBAR-POSTURE-001`)

> **9. Sidebar Posture & Layout Adaptability Invariant (`DS-SIDEBAR-POSTURE-001`)**
>
> **Sidebar posture (`sidebarPosture: 'expanded' | 'collapsed'`) is a persistent application-shell state independent of route and page archetype. `navigationContext` MUST NOT determine, reset, or mutate sidebar posture. Navigation between workspace and resource pages preserves the current sidebar posture. Only explicit user interaction with the sidebar toggle (`DS-SHELL-TRIGGER`) may change posture, except for responsive viewport constraints defined by the shell's responsive policy.**
>
> `CO-APP-SHELL` owns `sidebarPosture` (persisted in local shell preference `okeng.shell.sidebarPosture`, never in URL state) and shell-trigger behavior (`DS-SHELL-TRIGGER`, `z-30`). `navigationContext` determines the page's Level-2 header archetype and horizontal layout axis (`DS-LAYOUT-AXIS`); `sidebarPosture` determines only shell width and trigger clearance:
>
> **Workspace context (`navigationContext: 'workspace'` — `CO-PAGE-HEADER` + `32px` axis)**
> * Expanded: `px-8`
> * Collapsed: `pl-14 pr-8` on `CO-PAGE-HEADER`; sub-bars and content remain `px-8` / `p-8`
>
> **Resource context (`navigationContext: 'resource'` — `CO-CHILD-NAVBAR` + `24px` axis)**
> * Expanded: `px-6`
> * Collapsed: `pl-12 pr-6` on `CO-CHILD-NAVBAR` Surface 1
> * Surface 2 and content remain `px-6` / `p-6`
>
> Page-level workspace containers are fluid (`w-full`) and must not use arbitrary `max-w-*` caps (`DS-CONTAINER-WIDTH`). Semantic descendant surfaces may remain bounded only when explicitly required by their page specification.
>
> The collapsed shell trigger is behaviorally owned by `CO-APP-SHELL` / `DS-SHELL-TRIGGER` (`Visual ownership ≠ behavioral ownership`) and visually integrated into the active Level-2 header. Header surfaces remain `sticky top-0 z-20`; the shell trigger remains `z-30`; page content remains `z-0`.
>
> **Back Navigation Rule**: Back navigation (`← Back`, breadcrumb clicks, browser Back/Forward) MUST NOT modify `sidebarPosture`.

### 9.2 Three-Layer State Separation Diagram

```text
                 ┌──────────────────────┐
                 │      APP SHELL       │
                 │  (CO-APP-SHELL)      │
                 │  sidebarPosture      │
                 │  = expanded/collapsed│
                 │  (Persisted Locally) │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │      NAVIGATION      │
                 │                      │
                 │  currentRoute        │
                 │  activeSection       │
                 │  resourceId          │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │     PAGE CONTENT     │
                 │                      │
                 │  navigationContext   │
                 │  = workspace/resource│
                 │  • workspace: 32px   │
                 │  • resource:  24px   │
                 └──────────────────────┘
```

### 9.3 Canonical Behavioral Matrix (`DS-SIDEBAR-POSTURE-001`)

| Event | Expected Effect on Sidebar (`sidebarPosture`) |
| :--- | :--- |
| **User clicks Collapse (`DS-SHELL-TRIGGER`)** | `expanded → collapsed` (persisted in local shell preference) |
| **User clicks Expand (`DS-SHELL-TRIGGER`)** | `collapsed → expanded` (persisted in local shell preference) |
| **User clicks collapsed nav item** | **No change** (stays `collapsed`) |
| **User clicks expanded nav item** | **No change** (stays `expanded`) |
| **Navigate `workspace → resource`** | **No change** (preserves current posture) |
| **Navigate `resource → workspace` (`← Back`)** | **No change** (preserves current posture) |
| **Navigate `resource → resource`** | **No change** (preserves current posture) |
| **Browser Back** | **No change** (preserves current posture) |
| **Browser Forward** | **No change** (preserves current posture) |
| **Programmatic navigation** | **No change** (preserves current posture) |
| **Refresh** | Restore persisted posture |
| **Deep link** | Restore persisted posture |
| **Responsive breakpoint crossed** | May adapt presentation according to responsive policy |
| **Explicit user toggle after breakpoint** | User preference wins where feasible |

### 9.4 Canonical Behavioral Regression Test Contracts (`Test 1`–`Test 6`)

- **Test 1 — Collapse persists across top-level navigation**:
  `Open Files → collapse sidebar → click Collections → assert sidebar = collapsed → click Embeds → assert sidebar = collapsed`
- **Test 2 — Collapse persists into resource**:
  `Open Files → collapse sidebar → click File → assert sidebar = collapsed`
- **Test 3 — Collapse persists through Back**:
  `Open Files → collapse sidebar → open File → click Back → assert sidebar = collapsed`
- **Test 4 — Expanded persists into resource and through Back**:
  `Open Files → sidebar expanded → open File → assert sidebar = expanded → click Back → assert sidebar = expanded`
- **Test 5 — Browser history does not mutate posture**:
  `collapsed → Files → File → Browser Back → Browser Forward → assert sidebar remains collapsed`
- **Test 6 — Deep links & refresh restore persisted posture**:
  `set sidebar = collapsed → navigate directly to /files/:fileId or refresh → assert sidebar = collapsed`



