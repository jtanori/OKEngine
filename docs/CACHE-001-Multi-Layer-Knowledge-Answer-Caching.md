# CACHE-001 — Multi-Layer Knowledge & Answer Caching Specification

**Document ID:** `CACHE-001`  
**Status:** Canonical Architecture Specification  
**Scope:** Retrieval Cache, Exact & Semantic Answer Cache, Document/Chunk Cache, Authorization Cache, Knowledge Versioning, Stampede Protection  
**Depends on:** `AUTH-03`, `EMBED-01`, `ENGINE-01`, `ENG-DOD-001`

---

# 1. Governing Architectural Principle

> **Caching may accelerate retrieval and answer generation, but it must never alter the authorization boundary. Every cache lookup must be scoped to the verified tenant, authorization context, knowledge version, response language, and relevant host context. Cache failure must degrade to the uncached retrieval path.**

---

# 2. Four Canonical Cache Classes

1. **Class A — Retrieval Cache (`retrieval`)**:
   - Caches `normalized_query + workspace_id + authorized_scope + knowledge_version + current_route` → ranked authorized document/section matches.
   - Default TTL: `1800s` (30 minutes).
2. **Class B — Exact & Semantic Answer Cache (`answer`)**:
   - Caches `workspace_id + embed_id + authorized_scope + knowledge_version + context_hash + response_language + answer_mode + question_hash` → compiled `AnswerPlan` + citations + CTA.
   - Supports **Semantic Answer Cache** matching (`similarity >= 0.88`) strictly within the **same** `(workspace_id, authorized_scope, knowledge_version, context_hash, response_language, answer_mode)` partition.
   - Default TTL: `14400s` (4 hours).
   - **Negative Cache (`NO_SUPPORTED_ANSWER`)**: Short TTL of `600s` (10 minutes) for unanswered queries.
3. **Class C — Document & Collection Cache (`document`)**:
   - Caches parsed AST & metadata for `document:{workspaceId}:{docId}:{knowledgeVersion}`.
   - Default TTL: `43200s` (12 hours).
4. **Class D — Authorization & Context Cache (`authorization`)**:
   - Caches `workspace_id + principal_id + role_clearance` → resolved `authorizedCollectionIds`.
   - Short TTL: `180s` (3 minutes) + immediate invalidation on permission/collection visibility updates.

---

# 3. Knowledge Generation Versioning (`workspace.knowledge_version`)

Every workspace maintains an integer `knowledge_version` (starting at `184`).
Whenever any document or collection in a workspace is created, updated, deleted, or re-indexed:
1. `workspace.knowledge_version` increments atomically (`184 → 185`).
2. AllRetrieval and Answer cache lookups automatically bind to `kv:185`, rendering `kv:184` entries immediately unreachable without expensive key scans.

---

# 4. Cache Correctness Invariants (`CACHE-001` – `CACHE-012`)

* **`CACHE-001`**: Exact cache hit returns equivalent answer and citations.
* **`CACHE-002`**: Cache miss falls through cleanly to retrieval/compiler and populates cache.
* **`CACHE-003`**: Write/mutation invalidates affected cache scope.
* **`CACHE-004`**: Incrementing `knowledge_version` immediately obsoletes old cached answers.
* **`CACHE-005`**: Permission changes or lower roles (`everyone`/`members`) cannot hit `admins` cached answers.
* **`CACHE-006`**: Tenant A (`okeng`) cannot hit Tenant B (`globex-corp`) cache entries.
* **`CACHE-007`**: Context-sensitive questions on different host routes (`/settings/security/sso` vs `/billing/invoices`) do not collide.
* **`CACHE-008`**: Semantic similarity threshold (`>= 0.88`) reuses equivalent questions within identical security/version scope while rejecting unrelated queries.
* **`CACHE-009`**: Expired TTL entries fall through cleanly.
* **`CACHE-010`**: Concurrent identical misses share a single-flight lock (`1` execution for `N` concurrent callers, preventing stampedes).
* **`CACHE-011`**: Negative cache (`NO_SUPPORTED_ANSWER`) uses short TTL and expires/invalidates cleanly.
* **`CACHE-012`**: Cache backend outage degrades gracefully to the uncached retrieval path without breaking the product.
