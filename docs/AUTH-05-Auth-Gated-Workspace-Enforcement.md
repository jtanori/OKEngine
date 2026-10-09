# AUTH-05 — Auth-Gated Workspace Enforcement

**Status:** Implementation authorization contract  
**Depends on:** `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04`

---

# 1. Purpose

Define the mandatory enforcement behavior for every private workspace surface across browser routes, server routes, APIs, loaders, repositories, direct URLs, browser refresh, and client navigation.

---

# 2. Required 5-Link Authorization Chain

Every workspace request must satisfy:

```text
1. Valid authentication
        +
2. Valid workspace
        +
3. Active workspace membership
        +
4. Required permission
        +
5. Resource belongs to workspace
        =
AUTHORIZED
```

Failure at any stage stops the request immediately.

---

# 3. Canonical Enforcement Flow

```text
REQUEST
   │
   ▼
Is this workspace-scoped?
   ├── NO ──► normal public/auth handling
   └── YES
         │
         ▼
     Authenticate ──(invalid)──► 401 / login redirect
         │
         ▼
     Resolve workspace & active membership ──(none/inactive)──► 403 / 404
         │
         ▼
     Resolve permissions ──(denied)──► 403 / 404
         │
         ▼
     Verify resource.workspace_id == request.workspace_id ──(mismatch)──► 404
         │
         ▼
     Execute operation & Audit where required
```

---

# 4. Workspace UI States

1. **Unauthenticated**: No valid session → Redirect to `/login`.
2. **Authenticated, no workspace**: Valid session, zero memberships → Workspace onboarding / creation state.
3. **Authenticated, unauthorized workspace**: Valid session, not a member of requested workspace → Access Denied / 404 Not Found.
4. **Authenticated and authorized**: Valid session + active membership + permission → Render workspace.

---

# 5. Security Invariants

* **INV-01**: Anonymous users cannot access workspace data.
* **INV-02**: Authenticated users cannot access workspaces without membership.
* **INV-03**: Workspace membership in A does not grant access to B.
* **INV-04**: Workspace role does not bypass object-level authorization.
* **INV-05**: Platform role does not automatically create workspace membership.
* **INV-06**: Frontend visibility does not determine authorization.
* **INV-07**: A resource cannot be returned across workspace boundaries.
* **INV-08**: Search cannot return unauthorized content.
* **INV-09**: Test Chat cannot bypass production authorization.
* **INV-10**: Expired/revoked sessions cannot authorize workspace requests.
