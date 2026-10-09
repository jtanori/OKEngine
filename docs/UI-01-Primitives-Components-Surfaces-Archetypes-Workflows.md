# UI-01 — Primitives, Components, Surfaces, Archetypes & Workflows

**Status:** Canonical UI & Interaction Architecture Specification (v2.0)  
**Type:** Design System / Primitive & Component Catalog / Page Archetypes / Workflows  
**Depends on:** `AUTH-01`–`05`, `EMBED-01`, `EMBED-02`, `PUBLIC-01`, `I18N-001`, `RENDER-001`

---

# 1. Design Philosophy & Visual Tokens ("Quiet Technical")

OKEng rejects decorative AI SaaS tropes (neon gradients, floating orbs, fake dashboards, fabricated metrics) in favor of high-craft light-mode structural clarity. Every user-facing file in `src/app/*`, `src/components/*`, and `src/pages/*` MUST consume `DS-*` tokens through `PR-*` primitives and `CO-*` components.

## 1.1 Color, Typography & Geometry Tokens (`src/index.css @theme`)

| Token                | Value     | Tailwind Utility      | Usage                                                      |
| -------------------- | --------- | --------------------- | ---------------------------------------------------------- |
| `--color-canvas`     | `#F8F7F4` | `bg-canvas`           | Warm Alabaster primary viewport background                 |
| `--color-elevated`   | `#FAF9F6` | `bg-elevated`         | Secondary wells, code headers, table headers, inputs       |
| `--color-surface`    | `#FFFFFF` | `bg-surface`          | Document cards, tables, modals, active panels              |
| `--color-subtle`     | `#F1F0EC` | `bg-subtle`           | Subtle badges, hover states                                |
| `--color-line`       | `#DEDDD8` | `border-line`         | `1px solid` structural grid and card boundaries            |
| `--color-ink`        | `#171717` | `text-ink`            | Primary headings and body copy                             |
| `--color-ink-secondary`| `#6B6B67`| `text-ink-secondary` | Subtitles, descriptions, secondary labels                  |
| `--color-ink-muted`  | `#8C8B85` | `text-ink-muted`      | Monospace metadata, timestamps, chunk counts               |
| `--color-accent`     | `#1D4ED8` | `text-accent`         | Source citations, active embed badges, diagnostic links    |
| `--radius-xs`        | `3px`     | `rounded-xs`          | Compact badges, inline code tags                           |
| `--radius-sm`        | `4px`     | `rounded-sm`          | Cards, buttons, inputs, selects, tables                    |
| `--radius-md`        | `6px`     | `rounded-md`          | Modals, drawers, floating widget containers                |
| `--text-2xs`         | `10px`    | `text-2xs`            | Monospace badges, uppercase section headers                |
| `--text-xs`          | `12px`    | `text-xs`             | High-density controls, table rows, metadata                |
| `--text-sm`          | `14px`    | `text-sm`             | Primary prose and document body                            |

## 1.2 Embed Theme Variable Contract (`EMBED-02`)

```css
--okeng-accent       #1D4ED8
--okeng-surface      #FFFFFF
--okeng-text         #171717
--okeng-muted        #6B6B67
--okeng-border       #DEDDD8
--okeng-radius       4px
--okeng-chat-width   360px
```

---

# 2. UI Primitive Layer (`PR-*` in `src/components/ui/`)

All views and domain components compose the canonical primitives exported from `src/components/ui/index.ts` and adhere to the **4-Tier Control Height Scale (`DS-CONTROL-HEIGHT-*`: `xs=24px / h-6`, `sm=32px / h-8`, `md=36px / h-9`, `lg=40px / h-10`)**:
* `PR-BOX` (`Box`), `PR-CARD` (`Card`, `CardHeader`, `CardSection`), `PR-DIVIDER` (`Divider`) — `Card.tsx`
* `PR-TEXT` (`Text`) — `Text.tsx`
* `PR-BUTTON` (`Button` with `size?: 'xs' | 'sm' | 'md' | 'lg'`, `isLoading` spinner + `disabled` double-submit lock) — `Button.tsx`
* `PR-BADGE` (`Badge`, `AccessBadge`, `StatusDot`) — `Badge.tsx`
* `PR-INPUT` (`Input` with `sizeVariant?: 'sm' | 'md' | 'lg'`, `leadingIcon`, `trailingElement`), `PR-TEXTAREA` (`Textarea` with `label`, `placeholder`, `hint`, `error`, `aria-invalid`, `role="alert"`) — `Input.tsx`
* `PR-SELECT` (`Select` with `sizeVariant?: 'sm' | 'md' | 'lg'`, custom `ChevronDown`, `options` or `children`, `label`, `hint`, `error`, `aria-invalid`, `role="alert"`) — `Select.tsx`
* `PR-TABS` (`SegmentedTabs` with explicit height tokens `xs=h-6`, `sm=h-8`, `md=h-9`) — `Tabs.tsx`
* `PR-FILTER-BAR` (`FilterBar` enforcing one dataset → one filter model → one filter region and `sm=32px` control height alignment) — `FilterBar.tsx`
* `PR-TABLE` (`TableContainer`, `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`) — `Table.tsx`
* `PR-MODAL` (`Modal`) — `Modal.tsx`
* `PR-DRAWER` (`Drawer` — semantic sizes `sm=340px`, `md=420px`, `lg=520px`, `scopeBanner` slot, `headerActions` slot, and inner `min-w-0 overflow-x-hidden` container) — `Drawer.tsx`
* `PR-CODE-BLOCK` (`CodeBlock`) — `CodeBlock.tsx`
* `PR-EMPTY-STATE` (`EmptyState`) — `EmptyState.tsx`
* `PR-ACCORDION` (`Accordion`) — `Accordion.tsx`
* `PR-CHECKBOX` (`Checkbox` with rich ReactNode label, `hint`, `disabled`, and `role="alert"` error) — `Checkbox.tsx`
* `PR-INFO-POPOVER` (`InfoPopover` — `?` header help icon button and progressive-disclosure popover that reveals system IDs and specification contracts on demand while keeping primary labels human-centric) — `InfoPopover.tsx`

---

# 3. Expanded Component Taxonomy (`CO-*` in `src/components/`)

## 3.1 Workspace & Governance Components
* `CO-APP-SHELL` & `CO-SIDEBAR` (`AppShell.tsx`): Authenticated workspace layout shell (`240px` workspace sidebar ↔ `56px` resource rail).
* `CO-PAGE-HEADER` (`PageHeader.tsx`): Top-level workspace header with title, description, and primary actions.
* `CO-CHILD-NAVBAR` (`ChildContextNavbar.tsx`): Two-surface child-resource navigation header (`Surface 1`: `Back`, Breadcrumb, contextual metadata/actions; `Surface 2`: resource identity and primary actions).
* `CO-LANGUAGE-SELECTOR` (`LanguageSelector.tsx`): EN/ES UI language switcher (`I18N-001`).
* `CO-VISIBILITY-SELECTOR` (`VisibilitySelector.tsx`): 3-tier access clearance selector (`everyone`, `members`, `admins`).
* `CO-ROLE-SELECTOR` (`RoleSelector.tsx`): Simulation clearance toggle (`SegmentedTabs` `size="sm"`).
* `CO-COLLECTION-CARD` (`CollectionCard.tsx`): High-density collection summary card.
* `CO-FILE-ROW` (`FileTable.tsx`): Filterable document inventory table with sanitized search (`FORM-SEC-01`) and per-row reindex spinner. Enforces the **`scopedCollectionName` Filter Model Invariant** (when `scopedCollectionName` is provided, operates against the parent-supplied collection-scoped dataset without rendering or maintaining a competing collection filter or `Collection` column).
* `CO-UPLOAD-DROPZONE` (`UploadDropzone.tsx`): Multi-stage file upload dropzone with filename and script sanitization (`FORM-SEC-01`).
* `CO-UPLOAD-DRAWER` (`UploadDrawer.tsx`): Contextual file ingestion drawer (`PR-DRAWER-MD`) enforcing the **`lockedCollectionId` Semantic Scope Lock Invariant** (`lockedCollectionId` resolves destination exclusively from that ID, never from UI state or collection ordering, and omits the `Target Collection` selector when locked).
* `CO-MARKDOWN-EDITOR` (`MarkdownEditor.tsx`): Split/tabbed Markdown editor with live AST preview and validated `next_step` CTA builder (`FORM-SEC-01`).
* `CO-EMBED-CARD` & `CO-EMBED-STATUS` (`EmbedCard.tsx`): Readiness-aware Embed collection row/card (`[Installation Guide]`, `[Edit]`, `[Simulator]`, `[Duplicate]`, `[Delete]` when Ready; `[Continue Configuration]` when Incomplete), derived lifecycle badge (`INCOMPLETE` | `DRAFT` | `READY`), and `evaluateEmbedInstallationContract` 3-state signing evaluator (`none` | `optional` | `required`).
* `CO-EMBED-INSTALLATION` (`EmbedInstallationView.tsx`): Dedicated centered single-column (`max-w-3xl mx-auto`) configuration-driven developer installation recipe (`APP-05` / `SU-EMBED-INSTALLATION`) at `/workspaces/:workspaceSlug/embeds/:embedId/installation` with `InstallationVerdict`, `[React | Vue | JavaScript]` browser environments, conditional `SERVER` / `BROWSER` steps, single-action `[Verify installation]`, and collapsed `Developer tools`.

## 3.2 Conversational, Rendering & Presentation Components
* `CO-CONTENT-RENDERER` (`src/content/renderer/content-renderer.tsx`): Canonical Normalized Content AST renderer (`RENDER-001`) with Unified Citation Strip (`Option A`), scoped heading anchors (`Option 1`), and validated Save Answer / Report Issue modals.
* `CO-DOCUMENT-NAV` (`DocumentNav.tsx`): Single-expand collapsible collection navigation tree (`PR-ACCORDION`), with first collection expanded by default, stronger collection heading typography (`font-semibold`), and auto-selection of the first item upon collection expansion.
* `CO-DOCUMENT-VIEWER` (`src/components/public/DocArticleRenderer.tsx`): Deterministic (non-LLM) Markdown article renderer.
* `CO-ASK-BOX` (`src/components/public/DogfoodInlineBot.tsx`): Inline knowledge prompt and source-attributed answer component with `FORM-SEC-01` validation and `isLoading` state.
* `CO-SOURCE-LIST` (`SourceList.tsx`): Clickable source citation chips and excerpt cards.
* `CO-NEXT-STEP` / `CO-CTA-BUTTON` (`NextStepButton.tsx`): Verified action CTA surfaced from authoritative document metadata with defense-in-depth URL policy enforcement.
* `CO-FEEDBACK` (`FeedbackControl.tsx`): Helpful / Unhelpful feedback submission and status badge.

---

# 4. Application & Embed Surfaces (`SU-*`)

## 4.1 Platform & Workspace Surfaces
| Surface ID       | Namespace               | Auth Requirement | Primary Shell |
| ---------------- | ----------------------- | ---------------- | ------------- |
| `SURF-PUBLIC`    | `/`, `/about`, `/docs*`, `/terms`, `/privacy`, `/acceptable-use`, `/contact` | None (`anonymous`) | `PublicSurfaceView` |
| `SURF-AUTH`      | `/login`, `/signup`, `/forgot-password`, `/password/reset` | None | `PublicSurfaceView` |
| `SURF-WORKSPACE` | `/workspaces/:workspaceSlug/*` | 5-Link Auth Chain (`AUTH-05`) | `AppShell` |
| `SU-EMBED-DIRECTORY` | `/workspaces/:workspaceSlug/embeds` | 5-Link Auth Chain (`AUTH-05`) | `AppShell` (`PA-DIRECTORY`) |
| `SU-EMBED-RESOURCE-CONFIG` | `/workspaces/:workspaceSlug/embeds/:embedId` | 5-Link Auth Chain (`AUTH-05`) | `AppShell` (`PA-RESOURCE-CONFIGURATION`) |
| `SU-EMBED-INSTALLATION` | `/workspaces/:workspaceSlug/embeds/:embedId/installation` (`/app/embed/:embedId/installation`) | 5-Link Auth Chain (`AUTH-05`) | `AppShell` (`EmbedInstallationView` — `APP-05`) |
| `SU-EMBED-HOST-SIMULATOR` | `/workspaces/:workspaceSlug/embeds/preview` | 5-Link Auth Chain (`AUTH-05`) | `WidgetPreviewView` (`PAGE-WIDGET`) |

## 4.2 Six Composable Embed Surfaces (`EMBED-02`)
| Surface ID               | Mode            | Composition |
| ------------------------ | --------------- | ----------- |
| `SU-EMBED-CHAT`          | `widget`        | Floating launcher + `CO-CONTENT-RENDERER` (`EMBEDDED_CHAT`) + `CO-NEXT-STEP` |
| `SU-EMBED-PANEL`         | `panel`         | `PR-DRAWER` (`width="360px"`, `maxWidth="min(380px, 40%)"`) + `CO-CONTENT-RENDERER` + `CO-NEXT-STEP` |
| `SU-EMBED-FULLSCREEN`    | `fullscreen`    | Full-viewport search + collection filter + `CO-CONTENT-RENDERER` |
| `SU-EMBED-INLINE`        | `inline`        | Inline `CO-ASK-BOX` + `CO-CONTENT-RENDERER` |
| `SU-EMBED-DOCUMENTATION` | `documentation` | `CO-DOCUMENT-NAV` + `CO-DOCUMENT-VIEWER` + `CO-CONTENT-RENDERER` |
| `SU-EMBED-CONTEXTUAL-HELP`| `contextual`   | `PR-DRAWER` (`width="320px"`) contextual route header + recommended docs + `CO-CONTENT-RENDERER` |

---

# 5. Universal Form Security, Sanitization & State Contract (`FORM-SEC-01`)

All forms and interactive inputs across `SURF-PUBLIC`, `SURF-AUTH`, `SURF-WORKSPACE`, and `SU-EMBED-*` enforce:
1. **Sanitization (`src/services/formSecurity.ts`)**: Rejects `<script>`, `<iframe>`, `<object>`, `<embed>`, inline event handlers (`onload=`, `onerror=`), control characters, path traversal (`..`), and dangerous URI schemes (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`).
2. **Placeholders & Helper Hints**: Every form field displays a localized `placeholder` (with empty initial values on `/login` and `/signup`) and contextual `hint` (`aria-describedby`).
3. **Field-Level Validation Errors**: Invalid or unsafe input renders an inline error banner (`role="alert"`, `aria-invalid="true"`) with an `AlertCircle` indicator.
4. **Loading State Spinners**: Submit buttons use `PR-BUTTON` `isLoading={true}` (`Loader2` spinner + `disabled`) during submission or retrieval.

