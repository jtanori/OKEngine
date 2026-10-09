# I18N-001 — MVP Internationalization & Multilingual Answer Specification

**Document ID:** `I18N-001`  
**Status:** Canonical MVP Architecture & Audit Specification (v2.0)  
**Scope:** Public Platform (`SURF-PUBLIC`), Workspace Console (`SURF-WORKSPACE`), Composable Embeds (`SU-EMBED-*`), App Router Boundaries, Multilingual Retrieval, LLM & LLM-less Deterministic Answer Compiler, Document Language Handling  
**MVP Languages:** English (`en`), Spanish (`es`)

---

# 1. Governing Principle

> **Retrieve what the user is allowed to know, regardless of source language; answer in the language the user expects; localize every UI surface deterministically.**
>
> UI language, user/query language, and knowledge/document language are three distinct domains. Language metadata and language adapters never participate in access control (`SECURITY-001`).

---

# 2. The Three Language Domains & `LanguageContext`

Every session and answer request resolves an explicit, inspectable `LanguageContext`:

```text
LanguageContext
├── ui_language                ('en' | 'es')   — Controls all UI chrome, labels, modals, boundaries
├── query_language             ('en' | 'es')   — Detected from user prompt text
├── response_language          ('en' | 'es')   — Target language for compiled/generated answers
├── user_language_preference   ('en' | 'es' | 'auto')
├── host_language              ('en' | 'es' | undefined)
├── locale                     ('en-US' | 'es-ES' | 'es-MX')
└── knowledge_languages        (['en', 'es'])  — Authorized document corpus languages
```

## 2.1 Deterministic Resolution Order
1. **Domain 1 — UI Language (`ui_language`)**:
   `Explicit User Selection (CO-LANGUAGE-SELECTOR)` → `Persisted Preference (localStorage 'okeng_ui_lang')` → `Signed Host Assertion / Widget Config Language` → `Browser Navigator Locale` → `'en'`.
2. **Domain 2 — Query Language (`query_language`)**:
   `Lexical & Diacritic Detection on Query Text (src/i18n/languageDetector.ts)` → `host_language` → `ui_language` → `'en'`.
3. **Domain 3 — Response & Knowledge Language (`response_language` & `knowledge_languages`)**:
   `Explicit Response Override ('en' | 'es')` → `query_language (when user_language_preference === 'auto')` → `ui_language` → `'en'`.

---

# 3. The Three Surface Domains Requiring 100% UI Localization

All user-facing chrome, navigation, badges, forms, tables, empty states, and error boundaries MUST consume `useI18n()` (`t(key, vars)`) across all three surface domains:

| Surface Domain | Route / Component Scope | Language Switcher Component | Required Dictionary Namespaces |
| :--- | :--- | :--- | :--- |
| **1. `SURF-PUBLIC` (Public & Auth Surface)** | `/`, `/about`, `/docs`, `/docs/:slug`, `/contact`, `/terms`, `/privacy`, `/acceptable-use`, `/login`, `/signup` (`PublicSurfaceView`, `DocArticleRenderer`, `DogfoodInlineBot`) | `CO-LANGUAGE-SELECTOR` (`compact` in Public Header) | `common.*`, `public.*`, `chat.*`, `renderer.*`, `boundary.*` |
| **2. `SURF-WORKSPACE` (Authenticated Console)** | `/workspaces/:workspaceSlug/*` (`AppShell`, `CollectionsView`, `CollectionDetailView`, `GlobalFilesView`, `MarkdownEditor`, `EmbedConfigView`, `TestConsoleView`, `ConversationsView`, `SettingsView`, `StitchSpecViewer`) + App Router Boundaries (`error.tsx`, `not-found.tsx`, `loading.tsx`, workspace `layout.tsx`) | `CO-LANGUAGE-SELECTOR` (`compact` in `AppShell` sidebar header) | `common.*`, `nav.*`, `boundary.*`, `auth_gate.*`, `collections.*`, `files.*`, `editor.*`, `embed.*`, `test.*`, `conversations.*`, `settings.*`, `stitch.*`, `renderer.*` |
| **3. `SU-EMBED-*` (6 Composable Embed Surfaces)** | `SU-EMBED-CHAT` (`widget`), `SU-EMBED-PANEL` (`panel`), `SU-EMBED-FULLSCREEN` (`fullscreen`), `SU-EMBED-INLINE` (`inline`), `SU-EMBED-DOCUMENTATION` (`documentation`), `SU-EMBED-CONTEXTUAL-HELP` (`contextual`) (`WidgetPreviewView`, `DogfoodInlineBot`) | `CO-LANGUAGE-SELECTOR` (`compact` in Host Simulator bar & Embed Header) | `common.*`, `simulator.*`, `chat.*`, `renderer.*` |

---

# 4. Semantic Dictionary Contract (`EN_DICTIONARY` & `ES_DICTIONARY`)

1. **Source of Truth**:
   - `src/i18n/locales/en.ts` (`EN_DICTIONARY`)
   - `src/i18n/locales/es.ts` (`ES_DICTIONARY`)
2. **1:1 Key Parity Invariant**: Every key present in `EN_DICTIONARY` MUST exist in `ES_DICTIONARY` with a complete, natural Spanish translation (neutral technical Spanish appropriate for software documentation and enterprise SaaS).
3. **Variable Interpolation**: Dynamic values use `{{variable}}` placeholders (e.g., `t('files.Dropzone.types', { count: 4 })`) resolved deterministically by `I18nContext`.
4. **Prohibition of Hardcoded View Strings**: User-facing components in `src/app/*`, `src/components/*`, and `src/pages/*` must not hardcode English UI labels, button text, table headers, or empty-state messages.

---

# 5. Document Language & Translation Availability Matrix

Each `KnowledgeDocument` tracks:
* `language`: `'en' | 'es'`
* `languageConfidence`: `0.0 – 1.0`
* `languageDetectionMethod`: `'automatic' | 'explicit'`
* `translations`: Optional map of `SupportedLanguage → DocumentTranslation` (`status: 'AVAILABLE' | 'NOT_AVAILABLE' | 'OUTDATED'`, `title`, `summary`, `steps`, `bullets`, `content`).

---

# 6. Multilingual Retrieval & Language Adapter Priority

1. **Pre-Retrieval Authorization (`SECURITY-001`)**: Filter authorized collections and documents first. Language never widens or narrows authorization.
2. **Level 1 — Same-Language Retrieval**: Prefer documents or `AVAILABLE` translations matching `response_language`.
3. **Level 2 — Cross-Language Retrieval**: Retrieve authorized documents across supported languages (`en` ↔ `es`) via bilingual concept/synonym indexing (`src/services/engine/bm25Retriever.ts`).
4. **Language Adapter Compilation (`src/i18n/languageAdapter.ts`)**:
   - **Case A (Native source matches `response_language`)**: Compile directly with `LanguageAdapter(response_language)`.
   - **Case B (Structured translation `AVAILABLE` in `response_language`)**: Compile from structured translation while citing the authoritative source document.
   - **Case C (LLM-less mode, source is `'en'`, `response_language` is `'es'`, translation `NOT_AVAILABLE`)**: Never fabricate machine translation; return the localized Spanish adapter availability notice (`"Nota de idioma: La fuente autorizada está en inglés (EN)..."`) with the authoritative English citation (`language: en`).
   - **Case D (Generative LLM mode)**: Pass authorized source + `LanguageAdapter(response_language)` instructions to generate a grounded answer in `response_language`.

---

# 7. Mandatory 15-Point I18N Audit & Verification Matrix (`I18N-01` – `I18N-15`)

Every release must pass all 15 verification checks before `I18N-001` can be marked `DONE`:

| Check ID | Domain / Surface | Verification Requirement | Status |
| :--- | :--- | :--- | :--- |
| **`I18N-01`** | Dictionary Parity | `Object.keys(EN_DICTIONARY)` and `Object.keys(ES_DICTIONARY)` have 100% 1:1 key parity and zero empty values. | PASS |
| **`I18N-02`** | `CO-LANGUAGE-SELECTOR` | Standalone `LanguageSelector` component is mounted in `SURF-PUBLIC` header, `SURF-WORKSPACE` (`AppShell`), and `SU-EMBED-*` (`WidgetPreviewView`). | PASS |
| **`I18N-03`** | App Router Boundaries | `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/loading.tsx`, and workspace `layout.tsx` auth gate localize all titles, badges, descriptions, and CTAs in EN/ES. | PASS |
| **`I18N-04`** | `SURF-PUBLIC` Localization | Home (`/`), About (`/about`), Docs (`/docs`), Legal (`/terms`, `/privacy`, `/acceptable-use`), Contact (`/contact`), and Auth (`/login`, `/signup`) switches 100% of UI chrome between EN and ES. | PASS |
| **`I18N-05`** | `SURF-WORKSPACE` Navigation | `AppShell` sidebar items, workspace switcher, security persona selector, and footer links localize dynamically in EN and ES. | PASS |
| **`I18N-06`** | Collections & Access (`PAGE-APP-01/02`) | `CollectionsView`, `CollectionDetailView`, `CollectionCard`, and `VisibilitySelector` localize all headers, modals, visibility descriptions (`everyone`, `members`, `admins`), and empty states. | PASS |
| **`I18N-07`** | Files & Editor (`PAGE-APP-03/04`) | `GlobalFilesView`, `FileTable`, `UploadDropzone`, and `MarkdownEditor` localize table headers, status badges, search/filter controls, dropzone states, and editor toolbars. | PASS |
| **`I18N-08`** | Embed Config & Simulator (`PAGE-APP-05` & `PAGE-WIDGET`) | `EmbedConfigView` and `WidgetPreviewView` localize all 6 presentation mode labels, configuration tabs, security inspection panels, and live preview chrome. | PASS |
| **`I18N-09`** | Test Console (`PAGE-APP-06`) | `TestConsoleView` and `RoleSelector` localize clearance switcher, answer mode tabs, language override controls, and diagnostic telemetry panels. | PASS |
| **`I18N-10`** | Conversations & Settings (`PAGE-APP-07/08`) | `ConversationsView`, `FeedbackControl`, and `SettingsView` localize audit tables, feedback badges, API key panels, RBAC matrices, and data export controls. | PASS |
| **`I18N-11`** | `CO-CONTENT-RENDERER` Chrome | Progressive action toolbar (`Copy`, `Share`, `Edit Source`, `•••` export menu, `Report Issue` modal, `TOC` header, and `Verified Sources` strip) localizes in EN and ES. | PASS |
| **`I18N-12`** | Query Language Detection | Spanish queries (e.g., *"¿Cómo funciona la autenticación firmada?"*) automatically resolve `query_language = 'es'` and `response_language = 'es'` when preference is `'auto'`. | PASS |
| **`I18N-13`** | Cross-Language Retrieval | Spanish queries retrieve authorized English or Spanish documents via bilingual synonym expansion while strictly enforcing pre-retrieval clearance (`SECURITY-001`). | PASS |
| **`I18N-14`** | LLM-less Cross-Language Honesty | When `answerMode === 'deterministic'`, `response_language === 'es'`, and the matched source has no Spanish translation, the compiler emits the Spanish language-availability notice without fabricating translation. | PASS |
| **`I18N-15`** | Locale-Partitioned Caching | `CACHE-001` L3 and L4 cache keys include `responseLanguage` (`en` vs `es`), preventing an English cached answer from being served to a Spanish request. | PASS |
