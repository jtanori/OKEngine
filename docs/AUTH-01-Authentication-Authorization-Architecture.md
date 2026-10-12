# AUTH-01 — Authentication & Authorization Architecture

**Status:** MVP Engineering Contract  
**Document type:** Security / Architecture  
**Depends on:** Product Contract, Data Security Specification  
**Related:** `AUTH-02`, `AUTH-03`, `AUTH-04`, `AUTH-05`, `EMBED-01`

---

# 1. Purpose

Define how OKEng authenticates users, establishes sessions, determines platform/workspace permissions, authorizes requests, and securely identifies end users of embedded widgets.

The architecture must provide:

* Secure authentication
* Platform authorization
* Workspace authorization
* Tenant isolation
* Permission enforcement
* Signed embedded identity
* Privileged-operation approval
* Auditability
* Simple implementation

The system must prefer **explicit denial** over implicit access.

---

# 2. Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                         OKENG APPLICATION                    │
│                                                              │
│  Browser                                                     │
│    │                                                         │
│    ▼                                                         │
│  Auth Session ────────┐                                      │
│                       ▼                                      │
│                Authentication                                │
│                       │                                      │
│                       ▼                                      │
│                Authorization                                 │
│                 /           \                                │
│                ▼             ▼                               │
│        Platform RBAC     Workspace RBAC                      │
│                \             /                               │
│                 ▼           ▼                                │
│                   Resource                                   │
│                       │                                      │
│                       ▼                                      │
│                    Database                                  │
└──────────────────────────────────────────────────────────────┘

┌──────────────────── CUSTOMER APPLICATION ────────────────────┐
│                                                              │
│ Host application                                             │
│      │                                                       │
│      │ short-lived signed identity                           │
│      ▼                                                       │
│ Embedded OKEng Widget                                        │
│      │                                                       │
│      ▼                                                       │
│ OKEng Chat API                                               │
│      │                                                       │
│      ├── Verify signature                                    │
│      ├── Verify expiration                                   │
│      ├── Resolve workspace                                   │
│      ├── Resolve access                                      │
│      ├── Retrieve authorized content                         │
│      └── Generate answer                                     │
└──────────────────────────────────────────────────────────────┘
```

---

# 3. Security Boundaries

There are three distinct security contexts.

## 3.1 Platform User

A person operating OKEng itself.

Examples:

* Product Owner (`PLATFORM_OWNER`)
* Platform Admin (`PLATFORM_ADMIN`)

Authenticated through OKEng authentication.

## 3.2 Workspace User

A customer using the OKEng application.

Examples:

* Workspace Owner (`WORKSPACE_OWNER`)
* Workspace User (`WORKSPACE_USER`)

Authenticated through OKEng authentication.

## 3.3 Embedded End User

A person using a customer's product.

They do **not** need an OKEng account.

Their identity is asserted by the customer's application through a signed token.

```text
OKEng Account     ≠ Customer Application User
```

This distinction is fundamental.

---

# 4. Identity Model

## User

```text
User
────
id
email
name
status
platform_role
created_at
updated_at
```

`id` is the canonical identity identifier (e.g., `usr_01JABC...`). The email address must not be used as the primary identity key.

---

# 5. Platform Role

A user has zero or one platform role:

```text
platform_role: NULL | OWNER | ADMIN
```

Do not create a separate platform membership table for the MVP.

---

# 6. Workspace Membership

Workspace authorization is represented separately:

```text
WorkspaceMembership
───────────────────
id
workspace_id
user_id
role
permissions
status
created_at
updated_at
```

Constraints:

```text
UNIQUE(workspace_id, user_id)
```

Workspace roles: `OWNER` | `USER`. A user can belong to multiple workspaces. A user has **no workspace access unless a membership exists**.

---

# 7. Permission Model

Do not build a generic policy engine for the MVP. Use explicit permission constants:

```text
workspace.read
workspace.settings.manage
workspace.users.manage

collection.read
collection.write
collection.delete
collection.access.manage

content.read
content.write
content.delete

embed.read
embed.manage

conversations.read

test.execute
```

Workspace Owner receives all workspace permissions. Workspace User receives a defined default subset.

---

# 8. Effective Authorization

Authorization is resolved in this order:

```text
Request
   │
   ▼
Authenticate
   │
   ▼
Identify user
   │
   ▼
Identify workspace
   │
   ▼
Load membership
   │
   ▼
Resolve platform override
   │
   ▼
Resolve workspace permissions
   │
   ▼
Check resource ownership/access
   │
   ▼
ALLOW / DENY
```

The application must never jump directly from `user_id → resource` without authorization.

---

# 9. Authorization Middleware & Request Context

Every protected API endpoint must pass through the authorization layer (`authenticate() → requireWorkspace() → requirePermission() → authorizeResource() → handler()`).

After middleware runs, application code receives a trusted `RequestContext`:

```text
RequestContext
──────────────
user_id
platform_role
workspace_id
workspace_role
permissions[]
auth_method
session_id
```

---

# 10. Authentication Session & Cookie Security

For the dashboard application, use server-managed sessions (`Session` with `id`, `user_id`, `created_at`, `expires_at`, `last_seen_at`, `revoked_at`, `ip_address`, `user_agent`).

Cookie properties: `HttpOnly`, `Secure`, `SameSite=Lax`. Conservative lifetime defaults: 7 days idle timeout, 30 days absolute lifetime.

### 10.1 Current Supabase Auth Implementation — Email + Optional OAuth

This subsection is the implementation contract for the Next.js App Router/Supabase Auth path and supersedes any legacy Express/custom-session examples above for that path.

- Password signup/login, email confirmation, recovery/reset, logout, session lookup, and OAuth initiation use same-origin `/api/auth/*` or `/auth/callback` server routes with request-scoped Supabase SSR clients. Browser code does not instantiate a Supabase client or store access/refresh tokens.
- Supabase Auth cookies use the `okeng-auth` storage key and are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and scoped to `/`. Unchecked Remember me yields a browser-session cookie; checked Remember me persists it for 30 days. The server proxy refreshes Auth sessions and the server session endpoint returns only a safe profile/workspace projection.
- Every route that resolves an app session must retain and apply the request-scoped SSR client's response applier to its outgoing response, including post-session error responses. This preserves refreshed, rotated, or cleared HttpOnly cookie updates without exposing tokens to JSON or browser JavaScript.
- Google and GitHub are the only application-advertised OAuth providers. Each appears only when the server has both a nonblank provider client ID and secret; `/api/auth/providers` returns names only. When none are configured, the provider block and divider are both absent. For hosted Supabase, configure the provider in the Supabase Auth dashboard and set the matching pair in the application server environment; for local Supabase, use `supabase/config.toml` and the ignored `.env.local`.
- OAuth initiation accepts only the provider allowlist, requires Terms/Privacy consent, enforces existing AUTH rate limiting and same-origin CSRF validation, uses Supabase PKCE, and sets a fixed application callback. The browser accepts only a validated HTTPS or loopback Supabase `/auth/v1/authorize` URL before top-level navigation. Provider secrets and the PKCE verifier are never placed in browser-readable application storage; OAuth protocol state is managed by Supabase Auth, not accepted from caller-supplied redirect state.
- `/auth/callback` accepts the Auth code/allowed OTP callback parameters and a safe internal `next`; it verifies the Supabase user, requires a usable email for the current profile/workspace model, and provisions the first workspace with the Auth user's UUID through the `auth.uid()`-checked RPC. Any missing email or provisioning failure signs out and redirects with a generic error. Workspace/platform roles are loaded from application tables, never inferred from provider metadata.
- No application-level email-based user matching, account merge, or custom social-account linking is implemented. Supabase Auth's own identity behavior is separate from OKEngine profile mapping; application profiles are associated by Auth UUID only.
- Recovery links use the same fixed callback to establish a recovery session. Password update then uses an authenticated, CSRF-protected same-origin API request; the client does not submit a reset token.

---

# 11. Cross-Tenant Protection & Retrieval Security

The following must always fail:

```text
User A (Workspace A) → Document belonging to Workspace B
```

Return `404 Not Found` rather than exposing whether the resource exists.

Retrieval Security Invariant:

```text
User Identity → Workspace Verification → Workspace Role → Accessible Collections → FILTER DOCUMENTS → RETRIEVE CHUNKS → BUILD CONTEXT → LLM
```

Authorization must happen **before retrieval and context construction**. Never retrieve everything and ask the AI not to reveal private information.

---

# 12. Embedded Identity Token & Verification

The customer backend signs a short-lived JWT/HMAC assertion:

```json
{
  "iss": "customer-app",
  "aud": "okeng-embed",
  "sub": "user_123",
  "workspace_id": "ws_123",
  "role": "admin",
  "iat": 1791000000,
  "exp": 1791000300,
  "jti": "assertion_001"
}
```

Every embedded chat request verifies signature, issuer, audience, expiration, workspace binding, and required claims. Any failure returns `401 Unauthorized`.

---

# 13. Critical Operations, Admin Bypass & Approvals

Critical operations (`workspace.delete`, `workspace.transfer_ownership`, `workspace.bulk_delete`, `platform.admin.grant`, `platform.admin.revoke`, `platform.security.change`, `customer_data.exceptional_access`) require Owner approval or an explicit, time-bounded `AdminGrant`. Self-approval (`requested_by == approved_by`) is strictly prohibited.

---

# 14. Security Invariants & Engineering Tests

* `AUTH-TEST-001`: Invalid credentials cannot create session.
* `AUTH-TEST-002`: Expired session cannot access protected API.
* `AUTH-TEST-003`: Revoked session cannot access protected API.
* `AUTH-TEST-004`: Workspace A user cannot access Workspace B resources.
* `AUTH-TEST-005`: Workspace User cannot execute Owner permission.
* `AUTH-TEST-006`: Platform Admin cannot perform Owner-only platform action.
* `AUTH-TEST-007`: Admin cannot self-approve critical action.
* `AUTH-TEST-008`: Expired embed token cannot initiate chat.
* `AUTH-TEST-009`: Invalid embed signature cannot initiate chat.
* `AUTH-TEST-010`: Unauthorized collection content never reaches retrieval context.
* `AUTH-TEST-011`: Unauthorized collection content never reaches LLM.
* `AUTH-TEST-012`: Deleted documents cannot be retrieved.
* `AUTH-TEST-013`: Revoked embed secret cannot authenticate new requests.
* `AUTH-TEST-014`: Audit event is generated for privileged operations.
