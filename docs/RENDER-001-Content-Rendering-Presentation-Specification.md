# RENDER-001 — Content Rendering & Presentation Specification

**Document ID:** `RENDER-001`  
**Status:** Active Engineering & Product Rendering Contract (v2.0)  
**Scope:** Documents, articles, Markdown, answers, citations, previews, media, content actions  
**Priority:** P0/P1  
**Applies to:** Workspace console (`SURF-WORKSPACE`), Test Chat, Composable Embeds (`SU-EMBED-*`), Public Documentation & Legal Surfaces (`SURF-PUBLIC`), Source Previews  

---

## 1. Purpose & Primary Rendering Invariant

OKEng is a file-native knowledge product. Customers provide Markdown and source documents that are parsed, normalized, chunked, indexed, retrieved, cited, and presented back to humans.

> **Parse once, normalize once, sanitize once, render consistently everywhere.**

Every OKEng surface that displays structured document or answer content MUST consume the canonical **Normalized Content AST** (`renderer_version = 1`) through `CO-CONTENT-RENDERER` (`src/content/renderer/content-renderer.tsx`). No surface may implement ad-hoc regex or string-splitting Markdown parsers.

### 1.1 Heading & Block Isolation Invariant
A heading terminates at the end of its heading line and MUST NEVER absorb a following paragraph—even when separated by a single newline:

```markdown
# Security & Isolation Overview

OKEng enforces a defense-in-depth security model.

## Dual Independent RBAC
Platform administration roles are isolated from customer roles.
```

Must produce:
- `Heading(level=1)`: `"Security & Isolation Overview"`
- `Paragraph`: `"OKEng enforces a defense-in-depth security model."`
- `Heading(level=2)`: `"Dual Independent RBAC"`
- `Paragraph`: `"Platform administration roles are isolated from customer roles."`

### 1.2 Scoped Heading Anchor Rule (Option 1 — Canonical)
Clickable `#` heading anchor links are rendered **only** in full document contexts (`DOCUMENT_FULL` and `PUBLIC_DOC`) on hover, and are suppressed in compact answer/chat contexts (`CHAT_ANSWER`, `TEST_CHAT`, `EMBEDDED_CHAT`, `CHAT_MESSAGE`, `SOURCE_EXCERPT`, `CITATION`) to keep conversational responses clean.

### 1.3 Unified Citation Strip Rule (Option A — Canonical)
In conversational and answer contexts (`CHAT_ANSWER`, `TEST_CHAT`, `EMBEDDED_CHAT`), verified source citation chips are rendered **once** inside the `CO-CONTENT-RENDERER` footer (`Verified Sources (N)`). Parent views (`TestConsoleView`, `WidgetPreviewView`, `DogfoodInlineBot`, `ConversationsView`) pass `citations` and `onCitationClick` into `ContentRenderer` rather than duplicating external citation strips beneath the answer bubble.

---

## 2. Canonical Pipeline & 10 Presentation Contexts

```text
Source Content → src/content/parser → Normalized Content AST → src/content/sanitizer → CO-CONTENT-RENDERER
```

| Surface | Context Identifier | Table of Contents | Heading `#` Anchors | Progressive Toolbar | Unified Citation Footer |
|---|---|---|---|---|---|
| 1. Document Article | `DOCUMENT_FULL` | Yes (2+ headings) | Hover `#` enabled | Copy, Share, Edit*, ••• | — |
| 2. Document Preview | `DOCUMENT_PREVIEW` | Optional | Suppressed | Copy, Share, ••• | — |
| 3. Markdown Editor Preview | `EDITOR_PREVIEW` | Optional | Suppressed | — | — |
| 4. Chat Answer | `CHAT_ANSWER` | No | Suppressed | Copy, Share, ••• | Mandatory (Option A) |
| 5. Chat Message | `CHAT_MESSAGE` | No | Suppressed | Copy | — |
| 6. Source Excerpt | `SOURCE_EXCERPT` | No | Suppressed | Open Source | — |
| 7. Citation Preview | `CITATION` | No | Suppressed | Open Source | — |
| 8. Test Chat | `TEST_CHAT` | No | Suppressed | Copy, Share, ••• | Mandatory (Option A) |
| 9. Embedded Chat | `EMBEDDED_CHAT` | No | Suppressed | Copy, Share, ••• | Mandatory (Option A) |
| 10. Public Content | `PUBLIC_DOC` | Yes (2+ headings) | Hover `#` enabled | Copy, Share, Edit*, ••• | — |

`*` `Edit Source` is rendered only when the caller is authenticated in the workspace and holds `workspace.documents.manage` permission, and is independently enforced by the server (`POST /api/embed/sources/:sourceId/edit` and `POST /api/documents/:id/edit`).

---

## 3. Progressive-Disclosure Toolbar & Localized Actions (`I18N-001`)

All toolbar labels, tooltips, and modal strings inside `CO-CONTENT-RENDERER` are localized in English (`en`) and Spanish (`es`) via `useI18n()` (`renderer.*` namespace):
- **Primary Actions**: `[Copy]`, `[Share]`, `[Edit Source]` (when authorized), `[•••]`
- **Overflow Menu (`[•••]`)**:
  - `Save as Markdown (.md)`
  - `Save as TXT (.txt)`
  - `Save as PDF (Print / Export)`
  - `Save Answer to Workspace` (creates a new indexed Markdown document from a verified answer + citations; modal uses `PR-INPUT`, `PR-SELECT`, `PR-BUTTON` with `FORM-SEC-01` title sanitization, helper hints, placeholders, field-level validation errors, and `isLoading` spinner)
  - `Report Issue` (`Wrong information`, `Wrong source`, `Missing information`, `Formatting problem`, `Something else`; modal enforces `FORM-SEC-01` notes sanitization, helper hints, validation errors, and `isLoading` spinner)
  - `Regenerate` (where supported by answer surface)
- **Next-Step Action CTA Security (`CO-NEXT-STEP`)**: `NextStepButton` validates action URLs via `validateActionUrlInput` (`FORM-SEC-01`) before rendering, blocking `javascript:`, `data:`, `vbscript:`, `file:`, and `blob:` schemes and displaying a non-clickable security warning badge if an invalid URL is encountered.

