# DATA-01 — Data Model and Sanitization

| Field | Value |
| :--- | :--- |
| **Document ID** | `DATA-01` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | API & Backend |
| **Authority** | Blocking — Data & Validation |
| **Dependencies** | `SEC-01`, `API-01`, `DB-01`, `00_product_contract`, `FORM-SEC-01` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Purpose

Canonical data model and sanitization specification, consolidating Zod schemas, FORM-SEC-01, and data invariants.

---

## 1. Data Model — Entities (from `00_product_contract`)

See `DB-01` for tables, this doc for model invariants.

### 1.1 Workspace

- **Fields**: id UUID, name TEXT (max 100, FORM-SEC-01), slug TEXT (unique, lowercase alphanumeric + hyphen, max 50, regex `^[a-z0-9-]+$`), public_key TEXT (random 32 chars), signing_secret TEXT (random 64 chars, server-only, never client), plan TEXT (starter/pro/escala), plan_interval TEXT (monthly/annual), stripe_customer_id TEXT, stripe_subscription_id TEXT, created_at, updated_at
- **Invariants**: slug unique, lowercase, no spaces, max 50; public_key random, not secret but identifies workspace; signing_secret secret, never client, used to sign host user context (userId, role, currentUrl) via HMAC

### 1.2 User

- **Fields**: id UUID, email TEXT (unique, max 255, format email, FORM-SEC-01), password_hash TEXT (bcrypt, not plain), name TEXT (max 100, FORM-SEC-01), created_at, updated_at
- **Invariants**: email unique, lowercase, trimmed; password_hash bcrypt with salt 10, never return in API; name required for signup

### 1.3 WorkspaceMember

- **Fields**: id UUID, workspace_id FK, user_id FK, role TEXT (super_admin/admin/member/viewer), created_at, UNIQUE(workspace_id, user_id)
- **Invariants**: role must be one of SYSTEM_ROLES, user must exist, workspace must exist, one membership per workspace per user

### 1.4 Collection

- **Fields**: id UUID, workspace_id FK, name TEXT (max 100, FORM-SEC-01), description TEXT (max 500, FORM-SEC-01), visibility TEXT (everyone/members/admins), created_at, updated_at
- **Invariants**: name required, max 100, no <script> etc; visibility enum, default everyone; workspace must exist; name unique per workspace? Not necessarily, but recommended

### 1.5 Document

- **Fields**: id UUID, workspace_id FK, collection_id FK, title TEXT (max 200, FORM-SEC-01), filename TEXT (max 255, FORM-SEC-01, no path traversal), content TEXT (max 1M chars? Or 100k? Define), status TEXT (uploading/processing/ready/failed), next_step JSONB (optional CTA: { label, url, type } with URL validation https or /path), created_at, indexed_at
- **Invariants**: title required, content required, collection must exist and belong to same workspace, status lifecycle uploading → processing → ready|failed, next_step URL must be https or /path (defense-in-depth, no javascript: etc), filename sanitized (no .., no /)

### 1.6 DocumentChunk

- **Fields**: id UUID, document_id FK, collection_id FK, content TEXT (chunk, max 1000 chars), embedding VECTOR(1536) or TEXT, metadata JSONB (e.g., { page, line }), created_at
- **Invariants**: document must exist, collection must match document's collection, content max 1000, embedding generated from content via OpenAI or similar, metadata optional

### 1.7 Embed

- **Fields**: id UUID, workspace_id FK, name TEXT (max 100, FORM-SEC-01), collection_ids UUID[] or JSONB (array of collection IDs), theme JSONB (e.g., { accent, surface, text, muted, border, radius, chatWidth }), mode TEXT (widget/panel/fullscreen/inline/documentation/contextual), public_key TEXT, signing_secret TEXT, created_at, updated_at
- **Invariants**: name required, collection_ids must exist and belong to same workspace, theme validated (colors hex, radius number, chatWidth number), mode enum, public_key random, signing_secret secret server-only, mode gated by plan (fullscreen gated to Pro+)

### 1.8 ChatSession

- **Fields**: id UUID, workspace_id FK, user_id TEXT (host app user ID, max 100, FORM-SEC-01), role TEXT (host app role, e.g., everyone/members/admins or custom, max 50), current_url TEXT (max 500, URL validation https or /path), created_at
- **Invariants**: workspace must exist, user_id from signed host context (HMAC verified via signing_secret), role from signed context, current_url optional but validated

### 1.9 Message

- **Fields**: id UUID, chat_session_id FK, role TEXT (user/assistant), content TEXT (max 5000, FORM-SEC-01), sources JSONB (array of { document_id, chunk_id, title, excerpt, url }), cta JSONB (next_step), feedback TEXT (helpful/unhelpful), created_at
- **Invariants**: chat_session must exist, role enum, content required, sources from retrieval (filtered by visibility and role), cta from document next_step, feedback optional

### 1.10 Usage (from ANALYSIS-001)

- **Fields**: id UUID, workspace_id FK, period_start DATE (first day of month), period_end DATE (last day of month), queries_count INTEGER (default 0), files_count INTEGER, collections_count INTEGER, storage_bytes BIGINT, UNIQUE(workspace_id, period_start)
- **Invariants**: workspace must exist, period_start first day of month, period_end last day, counts >=0, unique per workspace per month

---

## 2. Zod Schemas (DATA-VALIDATION-01)

**File**: `src/lib/validation.ts` / `src/services/requestSchemas.ts`

See `API-01` API-VALIDATION-01 for list, this doc for details.

**Common Rules**:
- All strings: `z.string().max(N).refine(val => !containsDangerous(val), { message: "Contenido no permitido" })` where `containsDangerous` checks FORM-SEC-01
- Unknown fields: `.strict()` — reject unknown
- Email: `z.string().email().max(255).toLowerCase().trim()`
- Password: `z.string().min(8).max(128)` (min 8 for signup/reset, no min for login? Actually login also min 1 but max 128, but signup min 8)
- URL: `z.string().url().refine(url => url.startsWith('https://') || url.startsWith('/'), { message: "URL debe ser https o /path" })` for next_step
- UUID: `z.string().uuid()`
- Enum: `z.enum(['everyone', 'members', 'admins'])` etc
- Array: `z.array(z.string().uuid()).max(10)` for collection_ids

**FORM-SEC-01 Check Function**:

```ts
function containsDangerous(input: string): boolean {
  const lower = input.toLowerCase();
  // Check <script>, <iframe>, etc
  if (/<\s*(script|iframe|object|embed|link|meta|style)\b/i.test(input)) return true;
  // Check on*= event handlers
  if (/on\w+\s*=/i.test(input)) return true;
  // Check control chars
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(input)) return true;
  // Check path traversal
  if (/\.\.\//.test(input) || /\.\.\\/.test(input)) return true;
  // Check dangerous URI schemes
  if (/(javascript|data|vbscript|file|blob)\s*:/i.test(input)) return true;
  return false;
}
```

**Reject, Not Strip**: If contains dangerous, Zod refine fails, returns 422 validation error with field-level message, not stripped.

---

## 3. Sanitization — FORM-SEC-01 (DATA-SANITIZATION-01)

See `SEC-01` SEC-SANITIZATION-01.

**Server-Side**: Enforced in Zod schemas via refine

**Client-Side**: Enforced in `src/services/formSecurity.ts` via `sanitizeInput()` and `validateInput()` — same checks, but server is source of truth, client is for UX (show error before submit)

**Placeholders & Hints**: Every form field has placeholder (empty initial values) and hint (aria-describedby) — e.g., email placeholder "tu@empresa.com", hint "Usa tu correo de trabajo"

**Field-Level Errors**: Invalid input renders inline error with AlertCircle icon, role=alert, aria-invalid=true

**Loading Spinners**: Submit buttons isLoading true with Loader2 spinner + disabled during submission

---

## 4. Data Invariants — Authorization Before Retrieval (DATA-AUTHZ-01)

**Invariant**: Authorization happens strictly before retrieval and context assembly. Chunks from unauthorized collections excluded before vector similarity.

**Implementation**:
- In `POST /api/ask`, get user role from session or signed host context
- Get workspace collections, filter by visibility: everyone (all roles), members (member+), admins (admin+)
- Only then perform vector search on filtered collections' chunks
- Never retrieve then filter — filter before retrieval

**Tests**: `embed-authorization` 29 checks verify blocked collections excluded before retrieval

---

## 5. References

- `00_product_contract` data schema
- `DB-01` tables
- `SEC-01` sanitization
- `API-01` validation
- `src/services/formSecurity.ts`
- `src/lib/validation.ts` / `requestSchemas.ts`

---

*Data model and sanitization preserved for Next.js migration.*
