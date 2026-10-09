# AUTH-03 — Authorization Matrix & Permission Contract

**Status:** MVP Engineering Contract  
**Type:** Security / Authorization  
**Depends on:** `AUTH-01`, `AUTH-02`  
**Related:** `AUTH-04`, `AUTH-05`, `EMBED-01`

---

# 1. Purpose

Define the canonical authorization contract for OKEng: who can perform an action, on which resource, with which permission, under what conditions, and how authorization decisions are evaluated server-side.

```text
IDENTITY → ROLE / PERMISSIONS → WORKSPACE → RESOURCE → ACTION → ALLOW / DENY
```

---

# 2. Core Authorization Principles

* **AUTHZ-001 — Deny by Default**: Any action without an explicit authorization rule is denied.
* **AUTHZ-002 — Server-Side Enforcement**: UI visibility is never an authorization mechanism.
* **AUTHZ-003 — Workspace Isolation**: `request.workspace_id == resource.workspace_id`, otherwise DENY.
* **AUTHZ-004 — Least Privilege**: Users receive only the permissions required for their workspace role.
* **AUTHZ-005 — Object-Level Authorization**: Access to one collection/resource does not imply access to another.
* **AUTHZ-006 — Fail Closed**: If authorization state cannot be determined reliably, DENY.

---

# 3. Canonical Permission Registry

## 3.1 Workspace Permissions

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

test.execute

conversations.read
```

## 3.2 Platform Permissions (Separate Namespace)

```text
platform.users.manage
platform.admin.manage
platform.workspace.inspect
platform.customer_data.access
platform.settings.manage
platform.approvals.manage
```

## 3.3 Default Role Sets

* **Workspace Owner**: Receives all 14 workspace permissions.
* **Workspace User (Default)**: `workspace.read`, `collection.read`, `content.read`, `test.execute` (plus any explicitly assigned workspace permissions).

---

# 4. Action Matrices

## 4.1 Workspace Actions

| Action                    | Permission                  | Owner | User |
| ------------------------- | --------------------------- | ----: | ---: |
| View workspace            | `workspace.read`            |     ✓ |    ✓ |
| Rename / change settings  | `workspace.settings.manage` |     ✓ |    — |
| Delete / transfer owner   | Owner-only critical action  |     ✓ |    — |
| View / invite / manage    | `workspace.users.manage`    |     ✓ |    — |

## 4.2 Collections & Files Actions

| Action                      | Permission                 | Owner |       User |
| --------------------------- | -------------------------- | ----: | ---------: |
| List / view collections     | `collection.read`          |     ✓ |          ✓ |
| Create / rename collection  | `collection.write`         |     ✓ | Permission |
| Delete collection           | `collection.delete`        |     ✓ | Permission |
| Change collection access    | `collection.access.manage` |     ✓ | Permission |
| List / view files           | `content.read`             |     ✓ |          ✓ |
| Upload / edit / re-index    | `content.write`            |     ✓ | Permission |
| Delete file                 | `content.delete`           |     ✓ | Permission |

## 4.3 Embed, Test & Conversations Actions

| Action                      | Permission           | Owner |       User |
| --------------------------- | -------------------- | ----: | ---------: |
| View embed                  | `embed.read`         |     ✓ | Permission |
| Configure / rotate secret   | `embed.manage`       |     ✓ | Permission |
| Execute Test Chat           | `test.execute`       |     ✓ | Permission |
| Read conversations          | `conversations.read` |     ✓ | Permission |

---

# 5. External Role Mapping & Retrieval Authorization

Customer roles supplied in signed assertions map deterministically to OKEng collection visibility levels:

| Customer Role | OKEng Level | Accessible Visibility Tiers         |
| ------------- | ----------- | ----------------------------------- |
| `admin`       | `ADMIN`     | `everyone`, `members`, `admins`     |
| `member`      | `MEMBER`    | `everyone`, `members`               |
| `user`        | `MEMBER`    | `everyone`, `members`               |
| `anonymous`   | `EVERYONE`  | `everyone`                          |

Retrieval Authorization Contract: `authorizeRetrieval(identity, workspace, collection)` runs **before** chunk retrieval and LLM context construction.

---

# 6. Centralized Authorization API

```text
authorize(context, action, resource) → AuthorizationDecision {
  allowed: boolean
  reason?: string
  permission: string
  resource?: string
  requires_approval?: boolean
}
```

> **A role never grants access directly. A role produces permissions; permissions are evaluated against a specific resource inside a specific workspace for a specific request.**
