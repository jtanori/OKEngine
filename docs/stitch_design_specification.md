# Google Stitch Design Specification: OKEng

> **Target Platform:** Google Stitch (`stitch.withgoogle.com`) & Design LLM Generators  
> **Visual Philosophy:** **Quiet Technical / Editorial Utility**  
> *"Design it like a beautifully crafted developer utility from a small, opinionated software company—not like an AI startup landing page or a modern SaaS template."*

---

## 1. System Prompt & Anti-Patterns for Stitch

```text
You are generating interface screens for OKEng, an embedded product knowledge platform.
Embody "Quiet Technical / Editorial Utility". The application must feel precise, calm, and crafted by software artisans.

STRICT VISUAL PROHIBITIONS:
1. NO neon colors, cyan/magenta glow, or purple-to-blue AI gradients.
2. NO glassmorphism, backdrop-blur planes, or floating translucent surfaces.
3. NO "AI sparkle" icons (✨), wand icons, or robot mascots.
4. NO floating candy pills for static metadata (timestamps, file counts, and categories must be plain unboxed text separated by " · ").
5. NO nested cards within cards. Use 1px crisp dividers (#DEDDD8) and tabular spacing.
6. NO oversized hero statements, marketing fluff, or fake telemetry tickers.
```

---

## 2. Design Tokens (`DS-*`)

| Token Name | Value | Purpose |
| :--- | :--- | :--- |
| `DS-COLOR-CANVAS` | `#F8F7F4` | Warm paper background |
| `DS-COLOR-SURFACE` | `#FFFFFF` | Primary content panels & modals |
| `DS-COLOR-INK` | `#171717` | High-contrast body & heading text |
| `DS-COLOR-MUTED` | `#6B6B67` | Warm secondary text & column headers |
| `DS-COLOR-BORDER` | `#DEDDD8` | 1px hairline border & table rules |
| `DS-COLOR-ACCENT` | `#1D4ED8` | Disciplined cobalt for active links, buttons, focus |
| `DS-COLOR-ACCENT-SUBTLE` | `#EFF6FF` | Very light cobalt wash for selection |
| `DS-COLOR-SUCCESS` | `#15803D` | Forest green for `Ready` state |
| `DS-COLOR-WARNING` | `#B45309` | Amber for `Processing` state |
| `DS-COLOR-DANGER` | `#B91C1C` | Crimson for errors & destructive actions |
| `DS-RADIUS-CONTROL` | `4px` | Strict 4px radius for buttons, inputs, pills |
| `DS-RADIUS-PANEL` | `6px` | Modals and widget drawer corners |
| `DS-FONT-PRIMARY` | `Instrument Sans`, sans-serif | Interface labels, buttons, dialogs |
| `DS-FONT-SERIF` | `Source Serif 4`, serif | Quiet editorial page titles |
| `DS-FONT-MONO` | `JetBrains Mono`, monospace | File sizes, counts, code, tabular numbers |

---

## 3. Screen Archetypes & Stitch Wireframes

### Screen 1: Collections Dashboard (`PA-RESOURCE-LIST`)
**Stitch Prompt:**
> "Design a minimalist developer dashboard on a #F8F7F4 canvas. A 240px white sidebar on the left displays the OKEng logo, active workspace 'Acme Corp', and 6 quiet text links with an indicator on 'Collections'. The main view has a Source Serif 4 title 'Collections', subtitle 'Knowledge repositories scoped by visibility permissions', and a black 4px rounded button '+ New Collection'. Below, render a structured list with 1px #DEDDD8 dividers separating rows. Each row shows collection name in 15px semibold, description in 13px muted, document count and readiness status in tabular monospace on the right, and an access tag ('Everyone', 'Members', 'Admins')."

```text
┌────────────────────────────────────────────────────────────────────────┐
│ OKEng                        Acme Corp ▼                 Logout        │
├───────────────┬────────────────────────────────────────────────────────┤
│ • Collections │ Collections                           + New Collection │
│   Files       │ Knowledge repositories scoped by visibility.           │
│   Embed       │                                                        │
│   Test        │ ────────────────────────────────────────────────────── │
│   Log         │ Product Documentation                 42 files · Ready │
│   Settings    │ Public customer knowledge             Access: Everyone │
│               │ ────────────────────────────────────────────────────── │
│               │ Team Workflows & Runbooks             18 files · Ready │
│               │ Internal procedures and accounts      Access: Members  │
│               │ ────────────────────────────────────────────────────── │
│               │ Infrastructure & Security              7 files · Ready │
│               │ SSO SAML configuration & secrets      Access: Admins   │
│               │ ────────────────────────────────────────────────────── │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

### Screen 2: Collection Detail & Access (`PA-RESOURCE-DETAIL`)
**Stitch Prompt:**
> "Design a document management screen for 'Product Documentation'. At the top, show a breadcrumb 'Collections / Product Documentation', followed by a title and a 3-way segmented access selector: [Everyone] [Members] [Admins], where 'Everyone' is active with a black background. Display buttons for '+ New Markdown' and 'Upload Document'. Below is a clean dashed 1px upload dropzone, followed by a high-density file table: columns for Name, Type, Visibility, Status, Last Indexed, and Actions. Numbers and dates use tabular monospace figures."

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Collections / Product Documentation                                    │
│ Product Documentation                                                  │
│ 42 files · Ready · Last indexed 12 min ago                             │
│                                                                        │
│ Visibility: [ Everyone ]  [ Members ]  [ Admins ]                      │
│                                                                        │
│ [ Upload Document ]  [ + New Markdown ]  [ Test Chat ]                 │
│                                                                        │
│ ┌ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┐  │
│ ╎ Drag markdown or text files here to index into this collection     ╎  │
│ └ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - ┘  │
│                                                                        │
│ Filename               Type     Status    Updated      Actions         │
│ ────────────────────────────────────────────────────────────────────── │
│ getting-started.md     Markdown Ready     2h ago       [Edit] [Reindex]│
│ api-reference.md       Markdown Ready     1d ago       [Edit] [Reindex]│
│ troubleshooting.md     Markdown Ready     3d ago       [Edit] [Reindex]│
└────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 3: Markdown Editor with Live Preview (`PA-EDITOR`)
**Stitch Prompt:**
> "Design a split-pane technical document editor. Top bar has an editable filename input 'sso-configuration.md', a collection selector, a 'Ready' status indicator, and a black button 'Save & Re-index'. The left 50% pane is a raw monospace textarea with subtle line numbers. The right 50% pane renders live typography with crisp headings and styled code snippets. Bottom bar contains an expandable 'Document Next-Step Action' drawer with inputs for CTA Label ('Open SSO Settings') and Destination URL ('/settings/security/sso')."

```text
┌────────────────────────────────────────────────────────────────────────┐
│ getting-started.md      Collection: Product Docs   Saved ✓  [Save Doc] │
├───────────────────────────────────┬────────────────────────────────────┤
│ 1  # Getting Started              │ Getting Started                    │
│ 2                                 │                                    │
│ 3  Welcome to OKEng. Follow these │ Welcome to OKEng. Follow these     │
│ 4  steps to configure your embed: │ steps to configure your embed:     │
│ 5                                 │                                    │
│ 6  1. Create a workspace          │ 1. Create a workspace              │
│ 7  2. Index documents             │ 2. Index documents                 │
│ 8  3. Paste widget script         │ 3. Paste widget script             │
├───────────────────────────────────┴────────────────────────────────────┤
│ Next-Step Action CTA:  Label: [Open Setup Guide]  URL: [/docs/setup]   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Screen 4: Test Console & Permission Sandbox (`PA-CONSOLE`)
**Stitch Prompt:**
> "Design a dual-pane verification sandbox. Top control bar features a simulated user role switcher [Everyone] [Member] [Admin], simulated User ID 'usr_102', and simulated Current URL '/settings/billing'. Left pane is an interactive chat window with input 'How do I invite a teammate?'. Right pane is a Diagnostic Inspector detailing: 1) Accessible Collections for this role, 2) Retrieved Chunks with similarity scores (e.g. 0.91), 3) Blocked Collections, and 4) Latency/token figures in tabular numbers."

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Test Knowledge Retrieval                                               │
│ Simulate Role: [ Everyone ] [ Member ] [ Admin ]   URL: [/settings]    │
├────────────────────────────────────┬───────────────────────────────────┤
│ TEST QUERY CHAT                    │ RETRIEVAL INSPECTOR               │
│                                    │                                   │
│ User: Where do I manage members?   │ Role: Member                      │
│                                    │ Accessible Collections:           │
│ OKEng:                             │ ✓ Product Documentation           │
│ You can invite teammates from the  │ ✓ Team Workflows (Members)        │
│ Workspace Members tab.             │ ✗ Security & SSO (Blocked)        │
│                                    │                                   │
│ Sources:                           │ Retrieved Chunks (2):             │
│ • team-workflows.md (score: 0.92)  │ #1 team-workflows.md (Line 14-38) │
│                                    │ #2 onboarding.md (Line 4-12)      │
│ [Open Members Page →]              │ Latency: 280ms · Tokens: 412      │
└────────────────────────────────────┴───────────────────────────────────┘
```

---

### Screen 5: Standalone Embedded Widget Simulation (`PA-EMBEDDED-WIDGET`)
**Stitch Prompt:**
> "Design a customer web application with an embedded OKEng chat drawer in the bottom right corner. The drawer is 380px wide with a crisp 1px #DEDDD8 border, 6px radius, and subtle shadow. The header says 'Product Knowledge' with a close button. Messages show clear speaker distinction, grounded markdown answers, clickable source citations ('• sso-configuration.md'), a prominent next-step button '[Open SSO Settings →]', and thumbs-up/down feedback buttons."

```text
┌───────────────────────────────────────────────────────────┐
│ Host SaaS Application (Simulated)                         │
│                                   ┌─────────────────────┐ │
│                                   │ Product Knowledge × │ │
│                                   ├─────────────────────┤ │
│                                   │ How can we help?    │ │
│                                   │                     │ │
│                                   │ How do I setup SSO? │ │
│                                   │                     │ │
│                                   │ SAML 2.0 can be     │ │
│                                   │ enabled under Admin │ │
│                                   │ Security settings.  │ │
│                                   │                     │ │
│                                   │ Sources:            │ │
│                                   │ • sso.md (p. 2)     │ │
│                                   │                     │ │
│                                   │ [Open Security →]   │ │
│                                   │                     │ │
│                                   │ Was this helpful?   │ │
│                                   │ [👍 Yes]  [👎 No]   │ │
│                                   ├─────────────────────┤ │
│                                   │ Ask a question... ↑ │ │
│                                   └─────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Mixed-Visibility Embed Authorization & Progressive Identity Contract (`EMBED-01` & `AUTH-03`)

### 6.1 Canonical Pipeline

```text
Embed
  │
  ├── getEmbedCollectionIds()  (deduplicated & canonically sorted)
  │
  ▼
Identity
  │
  ├── missing → { type: 'anonymous' }
  └── supplied → verify HS256 JWT with server-selected workspace secret or reject (401/403)
  │
  ▼
resolveEmbedAuthorization()
  │
  ▼
AuthorizationScope (immutable ReadonlyArray<string> collectionIds)
  │
  ├── 1. retrieval
  ├── 2. citations
  ├── 3. suggestions
  ├── 4. starterQuestions
  ├── 5. routeRules
  ├── 6. relatedArticles
  ├── 7. documentationNavigation
  └── 8. simulatorDebugOutput
```

### 6.2 Visibility Access Matrix

| Identity | `everyone` | `members` | `admins` |
| :--- | :---: | :---: | :---: |
| `anonymous` | ✓ | — | — |
| `authenticated (member)` | ✓ | ✓ | — |
| `authenticated (admin)` | ✓ | ✓ | ✓ |

### 6.3 Token Verification Security Boundary
- **Algorithm Enforcement:** `alg` header MUST be `HS256`. Any other algorithm (`none`, `RS256`, `HS384`, `HS512`) or header key-injection parameter (`jku`, `x5u`, `jwk`) is rejected immediately (`INVALID_TOKEN_ALGORITHM`).
- **Server-Side Key Selection:** Verification secret is selected strictly from server-side workspace configuration (`workspace.signingSecret`), never from JWT headers or unverified claims.
- **No Silent Downgrade:** Missing token resolves to `{ type: 'anonymous' }`. Any supplied invalid, expired, or mismatched token is rejected immediately (`401`/`403`).

### 6.4 Three-Class Cache & Split Version Invalidation
- **`authorizationVersion`**: Monotonically incremented when Embed `collectionIds` or `contextConfig` changes, invalidating `SessionCacheKey` without invalidating unchanged corpus indices.
- **`knowledgeVersion`**: Monotonically incremented across the workspace whenever any document or collection visibility mutates, deterministically versioning multi-collection `RetrievalCacheKey` and `AnswerCacheKey` partitions.

