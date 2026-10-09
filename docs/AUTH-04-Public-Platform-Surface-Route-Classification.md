# AUTH-04 — Public Platform Surface & Route Classification

**Status:** Implementation authorization contract  
**Depends on:** `AUTH-01`  
**References:** `AUTH-02`, `AUTH-03`, `AUTH-05`, `EMBED-01`

---

# 1. Purpose

Define the boundary between:

1. the **public platform**, which can be accessed without authentication; and
2. the **private application**, where workspace data and functionality require authentication and authorization.

---

# 2. Platform Surface Model

```text
OKENG PLATFORM
│
├── PUBLIC SURFACE
│   ├── Landing (/)
│   ├── About (/about)
│   ├── Contact (/contact)
│   ├── Documentation (/docs, /docs/:slug)
│   ├── Terms of Service (/terms)
│   ├── Privacy (/privacy)
│   └── Authentication (/login, /signup, /password/reset)
│
└── PRIVATE APPLICATION
    └── Workspaces (/workspaces/:workspaceId/*)
        ├── Dashboard
        ├── Collections
        ├── Documents / Files
        ├── Editor / Management
        ├── Embeds
        ├── Test Chat
        ├── Conversations
        ├── Members
        └── Settings
```

---

# 3. Public Pages & Rules

| Page                      | Example Route            | Authentication |
| ------------------------- | ------------------------ | -------------- |
| Landing                   | `/`                      | Not required   |
| About                     | `/about`                 | Not required   |
| Contact                   | `/contact`               | Not required   |
| Documentation             | `/docs`                  | Not required   |
| Documentation page        | `/docs/:slug`            | Not required   |
| Terms of Service          | `/terms`                 | Not required   |
| Privacy                   | `/privacy`               | Not required   |
| Login                     | `/login`                 | Not required   |
| Signup                    | `/signup`                | Not required   |
| Password Recovery         | `/forgot-password` / `/password/reset` | Not required |
| Password Reset Completion | `/password/reset/:token` | Not required   |

Public pages:
* do not require an OKEng session;
* must never expose workspace data, customer documents, private conversations, workspace membership, or signing secrets;
* must never expose internal testing persona selectors (`AUTH-03 / AUTH-05` persona switching is restricted strictly to the authenticated **Test Console** at `/workspaces/:workspaceSlug/test`).

### 3.1 Authentication Legal Consent, Placeholders & Recovery Contract (`PAGE-AUTH-01`, `PAGE-AUTH-02`, `PAGE-AUTH-03`)
* **Empty Initial Values & Placeholders**:
  - Both `/login` and `/signup` initialize with empty `email` and `password` values (`''`) and render localized `placeholder` attributes (`you@company.com`, `••••••••••••`) and helper hints (`hint`) rather than pre-filled demo credentials.
  - All inputs validate against `FORM-SEC-01` (`src/services/formSecurity.ts`) and display `isLoading` button spinners during authentication.
* **Sign In (`/login` — `PAGE-AUTH-01`)**:
  - Includes a **Forgot password?** link that navigates to `/forgot-password`.
  - Displays the standard legal consent legend below the submit button: *"By signing in, you agree to the OKEng Terms of Service and Privacy Policy"* with interactive links to `/terms` and `/privacy`.
* **Sign Up (`/signup` — `PAGE-AUTH-02`)**:
  - Enforces minimum 8-character password validation and requires an explicit **Accept Terms of Service & Privacy Policy** checkbox (`PR-CHECKBOX`) with interactive links to `/terms` and `/privacy` before account creation is permitted.
* **Password Recovery (`/forgot-password` — `PAGE-AUTH-03`)**:
  - Renders inside the authentication card with a validated email input, helper hint, `isLoading` submit spinner, non-enumerating recovery confirmation state, and a **Back to Sign In** link.

---

# 4. Private Application Boundary & Authentication ≠ Workspace Access

Everything under `/workspaces/:workspaceId/*` is private.

A valid session proves identity (`USER ID`), **not** access to a particular workspace. Access requires an active `WorkspaceMembership` in that workspace plus the required permission.

Platform roles (`PLATFORM_OWNER`, `PLATFORM_ADMIN`) do **not** automatically grant membership in customer workspaces.

---

# 5. Deep Links, Browser Refresh & API Boundary

* Direct URL navigation (`GET /workspaces/abc/documents/doc-1`) and browser refresh must evaluate the full server-side authorization chain.
* Hiding a navigation item or button is a UX convenience, never an authorization mechanism.
* Public APIs (`/api/auth/*`, `/api/docs/*`) require no workspace membership; Private Workspace APIs (`/api/workspaces/:id`, `/api/collections`, `/api/documents`, `/api/embeds`, `/api/conversations`) require authentication and workspace authorization.

---

# 6. Error / Redirect Behavior

* **Unauthenticated user requests private workspace**: `401 Unauthorized` (API) or redirect to `/login` (Browser).
* **Authenticated user requests unauthorized workspace**: `403 Forbidden` or intentionally concealed `404 Not Found`.

> **The public platform is public by explicit route classification. Everything under a workspace is private by default and requires a valid session, workspace membership, and the permissions required for the requested action.**
