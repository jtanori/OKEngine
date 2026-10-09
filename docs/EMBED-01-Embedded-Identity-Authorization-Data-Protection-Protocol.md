# EMBED-01 — Embedded Identity, Authorization & Data Protection Protocol

**Status:** MVP Technical / Security Specification  
**Type:** Embedding, Identity & Data Protection  
**Depends on:** `AUTH-01`, `AUTH-02`, `AUTH-03`, `AUTH-04`, `AUTH-05`

---

# 1. Purpose

Define how OKEng serves an embedded assistant inside a customer's application while supporting public knowledge, authenticated customer knowledge, role/clearance-based knowledge, and mixed public/private knowledge bases.

> **The customer owns identity. OKEng owns knowledge authorization.**

OKEng does not authenticate the customer's users directly. The customer's backend authenticates its users and provides OKEng with a short-lived, cryptographically signed identity assertion.

---

# 2. Embedding Modes

1. **EMBED-MODE-01 — Public**: No user identity required. Retrieves only `everyone` collections.
2. **EMBED-MODE-02 — Authenticated**: Host application provides a signed identity assertion.
3. **EMBED-MODE-03 — Mixed**: A single widget exposes `everyone` collections to anonymous visitors while exposing `members` and `admins` collections to verified users according to their clearance.

---

# 3. Collection Visibility & Clearance Mapping

| Customer Role | OKEng Clearance | Accessible Collections              |
| ------------- | --------------- | ----------------------------------- |
| `visitor`     | `anonymous`     | `everyone`                          |
| `customer`    | `member`        | `everyone`, `members`               |
| `employee`    | `member`        | `everyone`, `members`               |
| `manager`     | `admin`         | `everyone`, `members`, `admins`     |
| `admin`       | `admin`         | `everyone`, `members`, `admins`     |

---

# 4. Host Identity Assertion & Verification

The customer's backend generates a short-lived (1–10 minutes, recommended 5 minutes) signed assertion:

```json
{
  "iss": "customer.example.com",
  "aud": "okeng",
  "workspace_id": "ws_123",
  "user_id": "usr_456",
  "role": "member",
  "iat": 1791020000,
  "exp": 1791020300,
  "jti": "assertion_789"
}
```

OKEng verifies:
1. Cryptographic signature
2. Issuer & audience (`okeng` or `okeng-embed`)
3. Expiration (`exp`) and issued-at (`iat`)
4. Workspace binding (`assertion.workspace_id == embed.workspace_id`)
5. Required claims presence

Browser-supplied roles without a valid signature are rejected when accessing non-public collections:
* **Unauthenticated / Missing Assertion on Public or Mixed Embeds**: Resolves as `anonymous` (`everyone` clearance) and retrieves only `everyone` collections.
* **Invalid, Expired, or Tampered Signed Assertion (`INVALID_TOKEN_SIGNATURE`)**: Treated as a hard **`401 Unauthorized` security boundary** — execution halts immediately before authorization and retrieval (`Retrieval: Not executed`, `Retrieved chunks: 0`, `Anonymous fallback: None`).

---

# 5. Authorization Before Retrieval & The "Nothing Shown" Rule

## 5.1 Pre-Retrieval Filtering

```text
Verified Identity → Resolve Clearance → Filter Authorized Collections → Retrieve Authorized Chunks → Build Context → LLM
```

Unauthorized documents never enter retrieval results, search results, prompt context, reranking, or citations.

## 5.2 The "Nothing Shown" Rule (No Metadata or Existence Leakage)

If a user asks a question whose answer only exists in a restricted collection (`members` or `admins`) that the user is not cleared for, the embedded assistant must respond:

```text
I couldn't find that information in the available documentation.
```

It must **never** say:
* *"I couldn't answer that because Corporate Security Policy is restricted."*
* *"Ask your administrator for access to sso-internal.md."*
* *"1 restricted collection was excluded."* (Note: diagnostic blocked-collection telemetry is restricted exclusively to the authenticated Workspace Test Console for users holding `test.execute`).

---

# 6. Security Invariants (`EMBED-INV-01` to `EMBED-INV-14`)

* `EMBED-INV-01`: Customer authentication remains customer-controlled.
* `EMBED-INV-02`: OKEng never receives customer passwords.
* `EMBED-INV-03`: Browser-supplied roles are never trusted for restricted access.
* `EMBED-INV-04`: Privileged identity assertions are cryptographically signed.
* `EMBED-INV-05`: Assertions expire (short-lived).
* `EMBED-INV-06`: Assertions are bound to a workspace.
* `EMBED-INV-07`: Assertions are bound to the intended OKEng embed context.
* `EMBED-INV-08`: Authorization happens before retrieval.
* `EMBED-INV-09`: Unauthorized chunks never enter LLM context.
* `EMBED-INV-10`: Unauthorized sources never appear in citations.
* `EMBED-INV-11`: Unauthorized document existence is never disclosed ("Nothing Shown" rule).
* `EMBED-INV-12`: Workspace isolation is always enforced.
* `EMBED-INV-13`: Collection visibility changes affect future retrieval immediately.
* `EMBED-INV-14`: The LLM is never responsible for authorization.
