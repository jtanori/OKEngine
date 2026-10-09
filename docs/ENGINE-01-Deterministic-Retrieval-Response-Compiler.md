# ENGINE-01 — Deterministic Knowledge Retrieval & Response Compiler

**Status:** Canonical Retrieval & Answer Compilation Architecture  
**Type:** Non-LLM Information Retrieval / Structured Response Compiler  
**Depends on:** `AUTH-03`, `EMBED-01`, `EMBED-02`, `ENG-DOD-001`

---

# 1. Core Architectural Principle: Separate "Finding" from "Writing"

OKEng does not require an LLM to answer product-knowledge questions. Instead of treating an LLM as the mandatory final step, OKEng's core pipeline is:

```text
User Question
   ↓
Identity & Pre-Retrieval Authorization (SECURITY-001)
   ↓
Authorized Knowledge Model (Frontmatter + AST Blocks)
   ↓
Traditional IR Retriever (BM25 + Stemming + Synonyms + Fuzzy + Route Context Weighting)
   ↓
Intent Classification & Answer Plan
   ↓
Deterministic Response Compiler (or Extractive / Optional Generative)
   ↓
Structured UI Renderer + Sources + Optional CTA
```

---

# 2. Three Supported Answer Modes

| Mode | Identifier | LLM Used? | Behavior |
|---|---|---|---|
| **Mode 1 (Default)** | `deterministic` | **No (Zero LLM)** | Compiles structured Markdown AST (`Summary`, `Steps`, `Bullets`, `Warnings`, `Code`, `CTA`, `Sources`) into a deterministic `AnswerPlan`. Zero hallucination, `<25ms` assembly. |
| **Mode 2** | `extractive` | **No (Zero LLM)** | Selects and organizes verbatim relevant passages under `"According to your documentation:"` with section headers and source citations. |
| **Mode 3 (Optional)** | `generative` | **Optional (`gemini-3.8-flash`)** | Synthesizes a conversational response strictly grounded in authorized chunks when explicitly enabled by the workspace or caller. |

---

# 3. Machine-Readable Markdown & Frontmatter Model

Customers author standard Markdown files enhanced with optional structured YAML frontmatter:

```markdown
---
title: Configure SSO
summary: Configure single sign-on (SAML 2.0 / OIDC) from Security settings.
intent:
  - configure-sso
  - setup-saml
  - enable-single-sign-on
synonyms:
  - okta
  - identity provider
  - idp
  - saml
route: /settings/security/sso
visibility: admins
next_step:
  label: Open SSO Settings
  url: /settings/security/sso
---

# Configure SSO

Configure single sign-on for your organization.

## Steps

1. Open **Settings**.
2. Select **Security**.
3. Select **SSO**.
4. Add your identity provider metadata.
5. Save the configuration.
```

---

# 4. Ranking Formula (BM25 + Context Weighting)

For every authorized document $D$ and normalized query $Q$ on host route $R$:

$$\text{Score}(D, Q, R) = w_{\text{BM25}} \cdot \text{BM25}(D, Q) + w_{\text{title}} \cdot M_{\text{title}} + w_{\text{intent}} \cdot M_{\text{intent}} + w_{\text{heading}} \cdot M_{\text{heading}} + w_{\text{syn}} \cdot M_{\text{synonym}} + w_{\text{route}} \cdot I(D.\text{route} = R)$$

where:
* **Pre-Retrieval Invariant (`SECURITY-001`)**: Documents in unauthorized collections are excluded **before** scoring ($D \in \text{AuthorizedCorpus}$).
* **Route Context Boost ($w_{\text{route}}$)**: Queries asked on `/settings/security/sso` automatically boost documents associated with `/settings/security/sso`, resolving ambiguous questions like *"How do I configure this?"* without AI guesswork.

---

# 5. Deterministic Answer Types & Compiler Output

The Answer Planner classifies queries into 7 canonical answer types:
1. `procedure` (*"How do I..."*, *"Steps to..."*) → Summary + Numbered Steps + Code/Warning + CTA + Sources
2. `location` (*"Where is..."*, *"Where do I..."*) → Navigation Path + Summary + CTA + Sources
3. `definition` (*"What is..."*) → Concept Title + Summary + Key Bullets + Sources
4. `troubleshooting` (*"Why did..."*, *"401"*, *"error"*) → Diagnostic Cause + Resolution Steps + Sources
5. `comparison` (*"Difference between..."*, *"vs"*) → Structured Comparison Bullets + Sources
6. `faq` (*"Can I..."*, *"Does OKEng..."*) → Direct Answer + Supporting Section + Sources
7. `unknown` (Confidence $< 0.25$) → Conservative fallback: `"I couldn't find that information in the available documentation."`
