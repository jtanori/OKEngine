# AUTH-02 — Data Model & Database Security

**Status:** MVP Engineering Contract  
**Type:** Security / Data Architecture  
**Depends on:** `00 — Product Contract`, `AUTH-01 — Authentication & Authorization Architecture`  
**Related:** `AUTH-03`, `AUTH-04`, `AUTH-05`, `EMBED-01`

---

# 1. Purpose

`AUTH-02` defines the persistent data model required to support authentication, workspace isolation, authorization, sessions, privileged operations, approvals, and auditability.

Primary invariant:

```text
Every customer-owned resource
        │
        ▼
   belongs to one Workspace
        │
        ▼
access requires valid membership
        │
        ▼
authorization is checked before use
```

---

# 2. Core Data Model

```text
User
 │
 ├──────────────< Session
 │
 ├──────────────< WorkspaceMembership >────────────── Workspace
 │                                                     │
 │                                                     ├──< Collection
 │                                                     │      │
 │                                                     │      └──< Document
 │                                                     │
 │                                                     ├──< Embed
 │                                                     │
 │                                                     ├──< ChatSession
 │                                                     │
 │                                                     └──< Conversation
 │
 └──────────────< AuditEvent

Platform administration:

User
 │
 ├── platform_role
 │
 ├──────────────< AdminGrant
 │
 └──────────────< ApprovalRequest
```

---

# 3. Entity Specifications

## 3.1 User

| Field           | Type              | Rules                            |
| --------------- | ----------------- | -------------------------------- |
| `id`            | UUID / equivalent | Primary key                      |
| `email`         | string            | Unique, normalized               |
| `name`          | string            | Optional                         |
| `status`        | enum              | `ACTIVE`, `SUSPENDED`, `DELETED` |
| `platform_role` | enum/null         | `OWNER`, `ADMIN`, or `NULL`      |
| `created_at`    | timestamp         | Required                         |
| `updated_at`    | timestamp         | Required                         |

Constraint: `UNIQUE(normalized_email)`. References must always use `user.id`, never `user.email`.

## 3.2 Workspace

| Field        | Type      | Rules                            |
| ------------ | --------- | -------------------------------- |
| `id`         | UUID      | Primary key                      |
| `name`       | string    | Required                         |
| `status`     | enum      | `ACTIVE`, `SUSPENDED`, `DELETED` |
| `created_at` | timestamp | Required                         |
| `updated_at` | timestamp | Required                         |

## 3.3 WorkspaceMembership

| Field          | Type       | Rules                            |
| -------------- | ---------- | -------------------------------- |
| `id`           | UUID       | Primary key                      |
| `workspace_id` | UUID       | FK → Workspace                   |
| `user_id`      | UUID       | FK → User                        |
| `role`         | enum       | `OWNER`, `USER`                  |
| `permissions`  | JSON/array | Explicit permissions             |
| `status`       | enum       | Active/inactive membership state |
| `created_at`   | timestamp  | Required                         |
| `updated_at`   | timestamp  | Required                         |

Critical constraint: `UNIQUE(workspace_id, user_id)`. Platform Owner ≠ Workspace Owner.

## 3.4 Session

```text
Session (id, user_id, created_at, expires_at, last_seen_at, revoked_at, ip_address, user_agent)
```

* `id` is an opaque random session identifier.
* Revoked sessions are invalid immediately.
* Suspended users cannot create new sessions; existing sessions are revoked upon suspension.

## 3.5 Customer Resource Ownership & Cross-Workspace Protection

The following resources carry `workspace_id` directly: `Collection`, `Document`, `Embed`, `ChatSession`, `Conversation`.

Database-level invariant:

```text
Document.workspace_id == Collection.workspace_id
```

A document must never be attachable to a collection belonging to another workspace.

## 3.6 Document Lifecycle & Derived Data Deletion

Deleting a document (`ACTIVE → DELETED`) must immediately invalidate retrieval and remove/invalidate all derived representations (Original file, Extracted text, Chunks, Embeddings, Search index records, Derived metadata).

## 3.7 AdminGrant, ApprovalRequest & AuditEvent

* `AdminGrant`: `(id, user_id, permission, granted_by, reason, created_at, expires_at, revoked_at)`. Cannot be self-granted.
* `ApprovalRequest`: `(id, requested_by, action, resource_type, resource_id, reason, status, approved_by, created_at, resolved_at)`. Constraint: `requested_by != approved_by`.
* `AuditEvent`: `(id, actor_user_id, workspace_id, action, resource_type, resource_id, metadata, created_at)`. Never stores passwords, session secrets, embed secrets, raw tokens, or full customer documents.

---

# 4. Data Access Rules & Database Security Tests

* `RULE-DB-001`: Every customer resource belongs to a workspace.
* `RULE-DB-002`: Workspace membership is unique per user/workspace (`DB-TEST-001`).
* `RULE-DB-003`: Workspace ownership is explicit.
* `RULE-DB-004`: Platform roles and workspace roles are separate (`DB-TEST-015`).
* `RULE-DB-005`: Repositories require workspace scope (`DB-TEST-013`).
* `RULE-DB-006`: Cross-workspace resource relationships are rejected (`DB-TEST-002`, `DB-TEST-014`).
* `RULE-DB-007`: Deleted documents cannot remain retrievable (`DB-TEST-006`).
* `RULE-DB-008`: Revoked sessions cannot authenticate requests (`DB-TEST-004`).
* `RULE-DB-009`: Critical operations are auditable (`DB-TEST-012`).
* `RULE-DB-010`: Admin self-approval is prohibited (`DB-TEST-008`).
* `RULE-DB-011`: Exceptional admin access is explicit and auditable (`DB-TEST-007`).
* `RULE-DB-012`: Embedded identity does not bypass authorization.
