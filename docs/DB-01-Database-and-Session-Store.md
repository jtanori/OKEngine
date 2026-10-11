# DB-01 — Database and Session Store

| Field | Value |
| :--- | :--- |
| **Document ID** | `DB-01` |
| **Status** | `APPROVED — v1.0` |
| **Owner** | API & Backend |
| **Authority** | Blocking — Data Layer |
| **Dependencies** | `SEC-01`, `API-01`, `DATA-01`, `00_product_contract`, `STG-01` |
| **Revision** | `1.0 (2026-10-11)` |

---

## 0. Purpose

Canonical database and session store specification, from staging hardening and Next.js migration.

---

## 1. Database — PostgreSQL 15+ (DB-PG-01)

**Requirement**: PostgreSQL 15+ (from STG-01)

**Connection**:
- `DATABASE_URL` env var, format `postgresql://user:password@host:port/db?sslmode=require` (prod requires SSL)
- Pool: `pg.Pool` with max 20 connections, idleTimeout 30s, connectionTimeout 5s
- SSL: In prod, `ssl: { rejectUnauthorized: false }` or true with cert, in dev false
- Migrations: Via `node-pg-migrate` or `knex` or custom `src/lib/migrate.ts`, run on boot or via `npm run migrate`

**Tables** (from `00_product_contract` + `ANALYSIS-001` + existing):

| Table | Columns | Purpose |
| :--- | :--- | :--- |
| `workspaces` | id UUID PK, name TEXT, slug TEXT UNIQUE, public_key TEXT, signing_secret TEXT, plan TEXT (starter/pro/escala), plan_interval TEXT (monthly/annual), stripe_customer_id TEXT, stripe_subscription_id TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ | Multi-tenant isolation |
| `users` | id UUID PK, email TEXT UNIQUE, password_hash TEXT, name TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ | Users |
| `workspace_members` | id UUID PK, workspace_id FK, user_id FK, role TEXT (super_admin/admin/member/viewer), created_at TIMESTAMPTZ, UNIQUE(workspace_id, user_id) | Membership + RBAC |
| `collections` | id UUID PK, workspace_id FK, name TEXT, description TEXT, visibility TEXT (everyone/members/admins), created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ | Logical groupings |
| `documents` | id UUID PK, workspace_id FK, collection_id FK, title TEXT, filename TEXT, content TEXT, status TEXT (uploading/processing/ready/failed), next_step JSONB, created_at TIMESTAMPTZ, indexed_at TIMESTAMPTZ | Files |
| `document_chunks` | id UUID PK, document_id FK, collection_id FK, content TEXT, embedding VECTOR(1536) or TEXT (if pgvector), metadata JSONB, created_at TIMESTAMPTZ | Chunks + embeddings |
| `embeds` | id UUID PK, workspace_id FK, name TEXT, collection_ids UUID[] or JSONB, theme JSONB, mode TEXT (widget/panel/fullscreen/inline/documentation/contextual), public_key TEXT, signing_secret TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ | Embed configs |
| `chat_sessions` | id UUID PK, workspace_id FK, user_id TEXT (host app user), role TEXT, current_url TEXT, created_at TIMESTAMPTZ | Host user context |
| `messages` | id UUID PK, chat_session_id FK, role TEXT (user/assistant), content TEXT, sources JSONB, cta JSONB, feedback TEXT (helpful/unhelpful), created_at TIMESTAMPTZ | Conversation history |
| `usage` | id UUID PK, workspace_id FK, period_start DATE, period_end DATE, queries_count INTEGER, files_count INTEGER, collections_count INTEGER, storage_bytes BIGINT, UNIQUE(workspace_id, period_start) | Usage metering (from ANALYSIS-001) |
| `analytics_events` | id UUID PK, workspace_id FK, query TEXT, sources JSONB, timestamp TIMESTAMPTZ, user_id TEXT, collection_ids UUID[] | Analytics (future) |
| `feedback` | id UUID PK, message_id FK, helpful BOOLEAN, comment TEXT, created_at TIMESTAMPTZ | Feedback |

**Indexes**:
- `workspaces.slug` UNIQUE
- `users.email` UNIQUE
- `workspace_members(workspace_id, user_id)` UNIQUE
- `collections(workspace_id)`, `collections(workspace_id, visibility)`
- `documents(workspace_id)`, `documents(collection_id)`, `documents(status)`
- `document_chunks(document_id)`, `document_chunks(collection_id)`, `document_chunks USING ivfflat (embedding vector_cosine_ops)` if pgvector
- `embeds(workspace_id)`
- `chat_sessions(workspace_id)`, `messages(chat_session_id)`
- `usage(workspace_id, period_start)` UNIQUE

**Vector Search**: If using `pgvector` extension, enable `CREATE EXTENSION vector;`, store embeddings as `VECTOR(1536)` (OpenAI ada-002), query via cosine similarity `ORDER BY embedding <=> query_embedding LIMIT k`. If not using pgvector, store as TEXT and use external vector DB or in-memory (but PG15+ with pgvector recommended).

---

## 2. Session Store — Redis Optional + In-Memory Fallback (DB-REDIS-01)

**Requirement**: Redis optional (from STG-01, OPS-01)

**Connection**:
- `REDIS_URL` env var optional, format `redis://:password@host:port/db` or `rediss://` for TLS
- If present: use `redis` client (node-redis) or `ioredis`, connect on boot, handle errors, log
- If missing: warn `REDIS_URL not set, using in-memory session store — not suitable for production multi-instance` and use in-memory `Map`

**Session Store**:
- Express: `connect-redis` with `RedisStore`, or `MemoryStore` fallback
- Next.js: Custom store in `src/lib/redis.ts` — `get`, `set`, `del` with TTL 12h, fallback to `Map` if Redis not available

**Rate Limit Store**:
- Same Redis client, `rate-limit-redis` for Express, custom for Next.js
- Fallback to in-memory `Map` with TTL

**Why Optional**: For staging and prod multi-instance, Redis required for session sharing and rate limiting across instances. For dev single-instance, in-memory ok with warning. Checklist STG-01 says Redis optional but recommended.

---

## 3. Migrations (DB-MIGRATE-01)

**Tool**: `node-pg-migrate` or custom

**Location**: `migrations/` or `src/lib/migrations/`

**Naming**: `YYYYMMDDHHMMSS-description.js` or `.ts`

**Run**: On boot in `src/lib/db.ts` or via `npm run migrate`, fail-fast if migration fails

**Example Migrations**:
- `20241001-create-workspaces.js`
- `20241002-create-users.js`
- `20241003-create-collections.js`
- `20241004-create-documents.js`
- `20241005-create-document-chunks.js` (with pgvector)
- `20241006-create-embeds.js`
- `20241007-create-chat-sessions-messages.js`
- `20241008-create-usage.js` (from ANALYSIS-001)
- `20241009-add-workspace-plan.js`

---

## 4. Connection Pooling & Graceful Shutdown (DB-POOL-01)

**Pool**: `pg.Pool` max 20, idleTimeout 30s, connectionTimeout 5s, maxUses 7500 (recycle)

**Graceful Shutdown**: On SIGTERM/SIGINT, `pool.end()` to close all connections, wait for drain, log

**Health Check**: `/api/health` checks DB via `SELECT 1`, returns `db: "up"` or `"down"` with 503 if down

---

## 5. References

- `server.ts` DB pool
- `src/lib/db.ts` (Next.js)
- `src/lib/redis.ts`
- `00_product_contract` data schema
- `ANALYSIS-001` usage table
- `STG-01` PG15+ requirement
- `SEC-01` env validation

---

*Database and session store spec for Next.js migration.*
