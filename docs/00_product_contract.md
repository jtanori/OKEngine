# 00 — Product Contract: OKEng MVP

**Product:** Embedded, file-based product knowledge layer  
**Principle:** **Files → Collections → Access → Context → Answer**  

---

## 1. Product Invariant

> **Authorization happens strictly before retrieval and context assembly.**  
> Chunks from unauthorized collections are excluded before vector similarity computation.

---

## 2. Core Capabilities

1. **Workspace**: Multi-tenant isolation with unique slug and signing secrets.
2. **Collections**: Logical groupings of documentation with 3-tier access control (`everyone`, `members`, `admins`).
3. **Files**: Ingested Markdown documents and plain-text files.
4. **Markdown Editor**: Integrated syntax editing with real-time preview and document frontmatter metadata.
5. **Document Ingestion/Indexing**: Automatic text normalization, chunking, embedding generation, and status lifecycle (`uploading` → `processing` → `ready` | `failed`).
6. **Access Control**: Dynamic role resolution ensuring users only retrieve content matching their privileges.
7. **AI Retrieval + Answers**: Vector retrieval with top-k cosine similarity and grounded answer generation with sources.
8. **Embedded Chat Client**: Standalone lightweight widget embeddable via a single `<script>` tag.
9. **Host User Context**: Signed host-app parameters (`userId`, `role`, `currentUrl`) injected into query sessions.
10. **Citations**: Direct references to source documents and chunk excerpts.
11. **Test/Debug Console**: Simulation console displaying retrieved chunks, blocked collections, and similarity scores.
12. **Embed Configuration & 6 Composable Surfaces**: Widget placement (`widget`), slide-in panel (`panel` — default `360px`, max-width `min(380px, 40%)`), fullscreen portal (`fullscreen`), inline assistant (`inline`), 3-column documentation experience (`documentation`), and route-aware contextual sidebar (`contextual`).
13. **Document Next-Step CTA**: Optional actionable button (`CO-NEXT-STEP`) rendered below answers to deep-link to verified `https://` or `/path` destinations.
14. **Conversation History**: Operational audit log of questions, answers, and citations.
15. **Answer Feedback**: Simple 👍 / 👎 submission for continuous knowledge quality monitoring.
16. **Usage Metering**: Query counts and token tracking.
17. **Universal Form Security & State Contract (`FORM-SEC-01`)**: Strict XSS/script/protocol sanitization, localized placeholders, helper hints, accessible field-level validation errors (`aria-invalid`, `role="alert"`), and `isLoading` submit spinners across all public, authentication (`/login`, `/signup`, `/forgot-password`), workspace, and embedded surfaces.

---

## 3. Data Schema

- `Workspace(id, name, slug, public_key, signing_secret, created_at)`
- `Collection(id, workspace_id, name, description, visibility, created_at, updated_at)`
- `Document(id, workspace_id, collection_id, title, filename, content, status, next_step, created_at, indexed_at)`
- `DocumentChunk(id, document_id, collection_id, content, embedding, metadata)`
- `ChatSession(id, workspace_id, user_id, role, current_url, created_at)`
- `Message(id, chat_session_id, role, content, sources, cta, feedback, created_at)`

---

## 4. Definition of Done (16 Invariants)

1. Create workspace
2. Create collection
3. Set collection = Members
4. Upload Markdown/file
5. Files become Ready
6. Create embed
7. Install widget
8. Pass signed user role
9. Ask question
10. Receive grounded answer
11. See citations
12. Change role to Everyone
13. Verify protected collection is inaccessible
14. Test same behavior in Test Chat
15. Inspect resulting conversation
16. Submit feedback

