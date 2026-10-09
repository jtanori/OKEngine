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
