# 04 — Workflows: Operational Contracts

Workflows define end-to-end user objectives, authorization checks, cache transitions, and multilingual retrieval behavior across OKEng surfaces.

---

### `WF-SETUP-01` — End-to-End Product Knowledge Setup
1. **Signup / Login**: Authenticate into tenant workspace (`/login` → `/workspaces/okeng/collections`).
2. **Create Collection**: Initialize collection with target visibility (`everyone`, `members`, `admins`).
3. **Add Documents**: Trigger `[Upload File]` in `CO-UPLOAD-DRAWER` (`lockedCollectionId` inside `PAGE-APP-02` `Collection Detail`, or explicit `Target Collection` selection inside `PAGE-APP-04` `Global Files`) or author in `CO-MARKDOWN-EDITOR`; status progresses `Uploading` → `Processing` → `Ready`.
4. **Configure Embed**: Select presentation mode (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`) in `/workspaces/:workspaceSlug/embeds`, open the dedicated installation recipe (`/workspaces/:workspaceSlug/embeds/:embedId/installation`), and configure HMAC-SHA256 signed host identity when required.
5. **Verify Access, Retrieval & Cache Pipeline**: Inspect pre-retrieval collection access, ranked chunks, and cache partitioning in `/workspaces/:workspaceSlug/test` across scopes (`All workspace collections`, `Embed`, `Collection`), identities (`Anonymous`, `Member`, `Admin`, `Invalid token`), and languages (`auto`, `en`, `es`).
6. **Go Live**: Embed answers user queries inside host application with verified citations and `next_step` CTAs.

---

### `WF-COLLECTION-02` — Configure Collection Access & Epoch Invalidation
- **Preconditions**: Authenticated workspace member with `workspace.collections.manage` permission.
- **Entry**: `/workspaces/:workspaceSlug/collections/:collectionId`.
- **Action**: Toggle visibility via `CO-VISIBILITY-SELECTOR` to `everyone`, `members`, or `admins`.
- **Invariants**:
  1. Any future queries from callers without the corresponding clearance immediately omit chunks from this collection prior to vector/BM25 retrieval (`SECURITY-001`).
  2. `CACHE-001` increments the workspace epoch and immediately invalidates L2/L3/L4 cached retrieval and answer entries.

---

### `WF-FILE-01` — Ingest & Normalize Knowledge Document
- **Entry**: Upload via `CO-UPLOAD-DRAWER` (`PR-DRAWER-MD` — resolving destination exclusively from `lockedCollectionId` when opened from `Collection Detail`, or requiring explicit `Target Collection` selection when opened from `Global Files`) or author in `CO-MARKDOWN-EDITOR` (`/workspaces/:workspaceSlug/files/new`).
- **Processing Job**:
  1. YAML frontmatter extraction, language detection (`en` | `es`), and Normalized Content AST (`RENDER-001`) parsing.
  2. Heading-aware semantic chunking with line-range metadata.
  3. Indexing into authorized collection scope and L1 parse cache (`CACHE-001`).
- **Postcondition**: Document status transitions to `Ready` and workspace epoch increments.

---

### `WF-TEST-02` — Verify Inspection Pipeline (`Context → Access → Retrieval → Answer Plan → Cache`)
- **Entry**: `/workspaces/:workspaceSlug/test` (or deep-linked via `?collectionId=:collectionId` from `PAGE-APP-02` `[Test Retrieval]` / `?embedId=:embedId` from `PAGE-APP-05`).
- **Execution**:
  1. **Zero-State Access & Scope Resolution (`resolveTestConsoleScope`)**: Before any query is submitted, `[ Access ]` displays the effective intersection `EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections` (`Allowed for retrieval`, `Excluded before retrieval — Requires Member/Admin`, `Outside target scope`).
  2. **Hard `401` Invalid Token Boundary**: Selecting `Identity = Invalid token` halts before retrieval (`401 Unauthorized · INVALID_TOKEN_SIGNATURE`, `Retrieval: Not executed`, `Retrieved chunks: 0`, `Anonymous fallback: None`).
  3. **Executable Verification Scenarios**: Running any of the 4 named scenarios (`Verify access boundary`, `Verify progressive identity`, `Verify multilingual retrieval`, `Verify cache reuse`) configures context, executes the query, and verifies `EXPECTED` vs. `ACTUAL` across `[ Access ]`, `[ Retrieval ]` (`Answer Plan` + `Ranked Chunks` `[Details ▾]`), and `[ Cache ]` (`kv`/`av` epoch state + `[Re-run query]` / `[Invalidate cache]`).

---

### `WF-AUTH-01` — Authentication, Legal Consent & Password Recovery
- **Sign In (`/login`)**:
  1. Fields initialize empty with localized placeholders (`you@company.com`, `••••••••••••`) and helper hints.
  2. Displays standard legal consent legend below the submit button linking to `/terms` and `/privacy`.
  3. Clicking **Forgot password?** transitions inside the auth card to `/forgot-password` (`PAGE-AUTH-03`).
- **Sign Up (`/signup`)**:
  1. Validates email format and minimum 8-character password via `FORM-SEC-01`.
  2. Requires explicit acceptance of the Terms of Service and Privacy Policy via `PR-CHECKBOX` before account creation is permitted.
- **Password Recovery (`/forgot-password`)**:
  1. Validates email address via `FORM-SEC-01`, shows `isLoading` spinner on submit, and transitions to a non-enumerating recovery confirmation state with a **Back to Sign In** link.

---

### `WF-FORM-SEC-01` — Universal Input Sanitization & Validation Lifecycle
- **Entry**: Any form submission or real-time filter across `SURF-PUBLIC`, `SURF-AUTH`, `SURF-WORKSPACE`, or `SU-EMBED-*`.
- **Execution (`src/services/formSecurity.ts`)**:
  1. Inspect raw input for XSS/script tags (`<script>`, `<iframe>`, `onload=`, `onerror=`), control characters, path traversal (`..`), and disallowed URL schemes (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`).
  2. If invalid or unsafe: block submission, set `aria-invalid="true"` on the offending `PR-INPUT` / `PR-TEXTAREA` / `PR-SELECT` / `PR-CHECKBOX`, and surface a localized field-level error (`role="alert"`).
  3. If valid: transition submit `PR-BUTTON` to `isLoading={true}` (`Loader2` spinner + `disabled` double-submit lock) and persist the sanitized payload.

---

### `WF-EMBED-01` — Create Embed (`SU-EMBED-DIRECTORY` → `SU-EMBED-RESOURCE-CONFIG`)
- **Entry**: `/workspaces/:workspaceSlug/embeds` → `[+ Create Embed]`.
- **Execution**:
  1. Opens `PR-DRAWER-MD` with explicit `scopeBanner` (`Workspace`, `Presentation Mode`, `Collections Bound`).
  2. Validates `name` via `FORM-SEC-01` and requires at least one collection in `knowledgeScope.collectionIds`.
  3. Initializes the `EmbedInstance` and navigates directly to `/workspaces/:workspaceSlug/embeds/:embedId?tab=mode_scope` while preserving `sidebarPosture` (`INV-EMBED-10`, `INV-EMBED-11`).

---

### `WF-EMBED-02` — Configure Embed (`SU-EMBED-RESOURCE-CONFIG`)
- **Entry**: `/workspaces/:workspaceSlug/embeds/:embedId`.
- **Execution**:
  1. **Surface 1 (`CO-CHILD-NAVBAR`)** displays `← Embeds | Embeds > <Name>` on the left and `CO-EMBED-STATUS` (`INCOMPLETE` | `DRAFT` | `READY`), `[Installation Guide]` (when `readyForInstallation`), and `[Test in Host Simulator]` on the right.
  2. **Surface 2 (`CO-EMBED-IDENTITY` + `CO-EMBED-ACTION-BAR`)** displays identity (`Name [✎] [?]`, unboxed `Mode · Scope · Status`) on the left and resource lifecycle actions (`[Publish / Set as Draft]`, `[Duplicate]`, `[Delete]`) on the right.
  3. **Body Configuration (`PR-TABS` + `CO-EMBED-STEP-FOOTER` `1 of 3` Previous/Next)**:
     - **Step 1 (`1. Mode & Knowledge`)**: Select presentation mode (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`), bind collections, and optionally pin documents. Selecting any protected collection (`members` or `admins`) automatically forces `contextConfig.useHostUserContext = true` in both UI and store persistence.
     - **Step 2 (`2. Context & Behavior`)**: Configure `useCurrentPage`, `useHostUserContext` (rendered as locked `[✓] REQUIRED` when protected collections are bound), interactive `routeRules[]`, `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`, greeting, placeholder), and hex-normalized `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
     - **Step 3 (`3. Installation`)**: Compact **Installation Launcher** displaying `Installation`, the short verdict, `Frontend only` or `Backend + frontend required`, and `[Open installation guide →]`.

---

### `WF-EMBED-03` — Test Embed in Host Simulator (`SU-EMBED-HOST-SIMULATOR`)
- **Entry**: `/workspaces/:workspaceSlug/embeds/preview?embedId=:embedId`.
- **Execution**:
  1. Simulates the relationship between Embed configuration and Host context across all 6 modes (`widget`, `panel`, `fullscreen`, `inline`, `documentation`, `contextual`), host routes (including custom `routeRules`), user clearance (`Anonymous`, `Member`, `Admin`), and viewports (`Desktop 100%`, `Tablet 768px`, `Mobile 390px`).
  2. Dynamically applies `behaviorConfig` (`initialState`, `suggestedQuestions`, `showNavigation`, `ctaBehavior`) and `appearanceConfig` (`theme`, `width`, `position`, `radius`, `accentColor`).
  3. Exposes the 5-part `Inspect` diagnostics popover (`Route`, `User`, `Viewport`, `Behavior`, `Theme Variables`).
  4. Clicking `[← Back]` returns to `/workspaces/:workspaceSlug/embeds/:embedId` when launched from Embed Detail or Installation.

---

### `WF-EMBED-04` — Install Embed (`APP-05` / `SU-EMBED-INSTALLATION`)
- **Route**: `/workspaces/:workspaceSlug/embeds/:embedId/installation` (aliased to `/app/embed/:embedId/installation`).
- **Entry**:
  1. Stage 1 `CO-EMBED-CARD` → `[Installation Guide]`.
  2. Stage 2 `CO-CHILD-NAVBAR` → `[Installation Guide]`.
  3. Stage 2 Tab 3 (`3. Installation`) or Step 3 footer → `[Open installation guide →]`.
- **Execution (`src/pages/EmbedInstallationView.tsx`)**:
  1. Evaluates the Embed's configuration via `evaluateEmbedInstallationContract` and displays the immediate verdict (`Frontend-only installation`, `Frontend installation`, or `Backend + frontend installation`).
  2. Lets the developer pick their browser environment (`[React] [Vue] [JavaScript]`) and presents only the required numbered steps (`01. Add the server endpoint` when signing is required, `Install the package`, `Add the Embed`, `Optional: identify signed-in users` collapsed when signing is optional, and `Verify your installation`).
  3. Runs single-action verification (`[Verify installation]` → `✓ Installation looks good`) with progressive error recovery and keeps QA simulation controls inside the collapsed `Developer tools` footer.

---

### `WF-EMBED-05` — Configure Host Identity (`EMBED-01` HMAC Assertion Signer)
- **Entry**: `SU-EMBED-INSTALLATION` (`ServerStep` inside the installation recipe when `signingState` is `required` or `optional`).
- **Execution**:
  1. Host server stores `OKENG_SIGNING_SECRET` in server environment variables and signs a short-lived (5-minute) HMAC-SHA256 user assertion containing `workspaceId`, `embedId`, `sub`, `email`, `clearance` (`everyone` | `members` | `admins`), and `exp`.
  2. Host browser fetches the signed assertion from `/api/okeng/embed-token` and passes it to `<OKEng userToken={...} />` or `window.OKEng.init({ userToken })`.
  3. OKEng verifies the signature server-side and filters collections strictly before retrieval.



