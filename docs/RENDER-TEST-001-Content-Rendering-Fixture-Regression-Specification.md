# RENDER-TEST-001 — Content Rendering Fixture & Regression Test Specification

**Document ID:** `RENDER-TEST-001`  
**Status:** Active Engineering Specification  
**Scope:** Markdown parsing, normalized content AST, rendering, document presentation, answer rendering, citations, permissions, accessibility, security  
**Priority:** P0/P1  
**Related:** `RENDER-001`, `SECURITY-003`, `TEST-002`, `TEST-006`, `ACCESSIBILITY-001`, `I18N-001`  

---

## 1. Objective & Four-Layer Test Architecture

Establish a deterministic rendering test system across four verification layers:

```text
Markdown Fixture → parseMarkdownToAst() → Normalized AST → sanitizeContentAst() → renderAstToHtml() / CO-CONTENT-RENDERER → Semantic & Security Assertions
```

## 2. Canonical Test Matrix (`RENDER-001` – `RENDER-045`)

- `RENDER-001`: Heading Isolation (H1/H2/H3 never consume following paragraphs)
- `RENDER-002`: Paragraph Isolation (Separate `<p>` elements preserved)
- `RENDER-003`: Inline Formatting (`<strong>`, `<em>`, `<del>`, `<code>`, nested `<strong><em>`)
- `RENDER-004`: Links (Safe `https://` preserved; `javascript:` neutralized)
- `RENDER-005`: Unordered Lists (`<ul><li>` without literal `-` bullets)
- `RENDER-006`: Nested Lists (Hierarchical `<ul>` nesting preserved)
- `RENDER-007`: Ordered Lists (`<ol><li>` ordering preserved)
- `RENDER-008`: Blockquotes (`<blockquote>` and nested blockquotes)
- `RENDER-009`: Code Blocks (`<pre><code data-language="...">` preserving whitespace and unparsed Markdown)
- `RENDER-010`: Inline Code (`<code>workspace_id</code>` without literal backticks)
- `RENDER-011`: Tables (`<table><thead><tr><th>` and `<tbody><tr><td>` with inline cell formatting)
- `RENDER-012`: Table Alignment (`left`, `center`, `right` column alignment metadata preserved)
- `RENDER-013`: Images (`<figure><img alt="..." src="...">` with accessible fallback)
- `RENDER-014`: Media (Allowlisted providers `youtube.com`/`vimeo.com` vs rejected arbitrary iframes)
- `RENDER-015`: Horizontal Rules (`<hr>` separator between blocks)
- `RENDER-016`: Line Breaks (Soft break vs hard break `<br>` vs paragraph break)
- `RENDER-017`: Raw HTML Sanitization (Dangerous tags stripped; safe text preserved)
- `RENDER-018`: XSS Protection (`<script>`, `<img onerror>`, `[attack](javascript:alert(1))` neutralized)
- `RENDER-019`: Dangerous URL Schemes (`javascript:`, `data:`, `vbscript:` blocked)
- `RENDER-020`: Long URLs (`break-all` / safe wrapping without viewport overflow)
- `RENDER-021`: Chunk Boundary Preservation (Reconstructed/chunked content preserves semantic blocks)
- `RENDER-022`: Chunk Boundary Formatting (Multiline `**important\nsecurity information**` preserved)
- `RENDER-023`: `security-overview.md` Permanent Regression Test
- `RENDER-024`: Citation Rendering (Authorized sources linked with accurate titles and excerpts)
- `RENDER-025`: Citation Excerpt Safety (`<script>` inside excerpt sanitized identically to documents)
- `RENDER-026`: Permission-Aware Actions Matrix (Anonymous vs Reader vs Editor)
- `RENDER-027`: Edit Source Visibility (Hidden for anonymous/unauthorized; visible for workspace editor)
- `RENDER-028`: Edit Source Server Authorization (`POST /api/embed/sources/:id/edit` rejects unauthorized callers with 401/403)
- `RENDER-029`: Copy Behavior (Semantic plain text without UI chrome `3 chunks • Updated...`)
- `RENDER-030`: Editor / Viewer Semantic Parity (`EDITOR_PREVIEW` AST & HTML match `DOCUMENT_FULL`)
- `RENDER-031`: Spanish Rendering (`i18n-es.md` accents, `¿`, `¡`, headings, lists, code)
- `RENDER-032`: Mixed-Language Content (`mixed-language.md` EN + ES without forced translation)
- `RENDER-033`: RTL Readiness (Logical properties / no hardcoded left-only assumptions)
- `RENDER-034`: Accessibility Semantics (Landmark/heading hierarchy, table `scope="col"`, `alt` text)
- `RENDER-035`: Responsive Content Containers (Overflow-x scroll wrapper on tables and pre blocks)
- `RENDER-036`: Broken Asset Recovery (Broken image/media degrades to fallback card without crashing)
- `RENDER-037`: Unsupported Markdown Graceful Degradation (Preserves readable text without throwing)
- `RENDER-038`: Empty Document State (Intentional empty state without exception)
- `RENDER-039`: Very Large Document Performance (Bounded rendering under 50ms)
- `RENDER-040`: Save-As & Save-Answer-to-Workspace Integrity (Markdown re-import produces identical AST)
- `RENDER-041`: Share Integrity (Public share opens; private share enforces workspace auth)
- `RENDER-042`: Print Rendering (`print:hidden` on toolbars and navigation chrome)
- `RENDER-043`: Table of Contents Generation (Hierarchical TOC with anchor links)
- `RENDER-044`: Duplicate Heading IDs (`#security`, `#security-1` uniqueness)
- `RENDER-045`: Renderer Version Exposure (`renderer_version = 1` decoupled from embedding index)
