# PLAN-002 — Auth Pages Design Integration

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-002` |
| **Status** | `APPROVED — EXECUTION PENDING` |
| **Owner** | Product & Security |
| **Authority** | Blocking — Auth Surfaces |
| **Dependencies** | `PLAN-001`, `PLAN-003`, `PAGE-AUTH-01/02/03`, `AUTH-01..05`, `FORM-SEC-01`, `SEC-01`, `01_ui_foundation`, `02_component_catalog` |
| **Revision** | `1.0 (2026-10-11)` |
| **Source** | Proposal visual language inferred (login/signup 404, so derive from landing design system) |

---

## 0. Goal

Integrate auth pages design from proposal into auth pages (`/login`, `/signup`, `/forgot-password`, `/password/reset`), using new visual direction (warm canvas, cobalt accent, rounded-sm, editorial, clean card), preserving security invariants (5-Link Auth Chain, FORM-SEC-01, exact-origin, CSRF, rate limiting TIER_AUTH_5_PER_15M).

Proposal `/login` and `/signup` returned 404, so auth design must be inferred from landing visual language:

- Clean card centered, warm canvas background #F8F7F4
- White surface card #FFFFFF, border #DEDDD8, rounded-md 6px or lg 12px, shadow-sm
- Cobalt accent #1D4ED8 for primary button, links
- Inter sans for headings/body, JetBrains Mono for code/meta
- No decorative gradients, quiet technical
- Trust badges: "≥98% con cita", "Permisos por rol", "Sin tarjeta" etc but adapted for auth
- Social proof minimal, focus on form

---

## 1. Current State

### 1.1 Current Auth Implementation

- **Files**: `src/pages/PublicSurfaceView.tsx` (2262 lines, contains login, signup, forgot-password forms), `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset/page.tsx` — all wrappers delegating to PublicSurfaceView with `initialPage` prop
- **Design**: Old pipeline/pillars visual, same as landing, not distinct auth card, no new visual direction
- **Security**: FORM-SEC-01 enforced, empty initial values, placeholder + hint, field-level validation, isLoading spinner, generic 401, no client corpus, exact-origin, CSRF via double-submit, rate limiting TIER_AUTH_5_PER_15M (5 attempts per 15 min)
- **i18n**: EN/ES via `useI18n()`
- **Tests**: Auth tests in `homepage-tour-readiness`? Actually separate

### 1.2 Gaps

- Visual not aligned with new landing (proposal)
- No dedicated auth surfaces (SU-AUTH-*) in UI-01
- No auth page archetype (PA-AUTH)
- Forms not using new primitives (PR-INPUT, PR-BUTTON already but not new card, trust, etc)
- Missing: SSO button, social proof, trust badges, password strength, terms checkbox

---

## 2. New Visual Direction for Auth (Derived from Proposal)

### 2.1 Design Tokens (reuse from PLAN-001)

- **Canvas**: #F8F7F4 background full viewport
- **Card**: #FFFFFF surface, border #DEDDD8, rounded-lg 12px, shadow-md 0 4px 12px rgba(0,0,0,0.08), max-w-md 448px centered
- **Accent**: #1D4ED8 primary button, #EFF6FF subtle for focus, #1E40AF hover
- **Typography**: H1 24px/28px 600, body 14px/20px, label 12px/16px uppercase 500, hint 12px/16px muted
- **Spacing**: Card padding 32px, gap 24px between fields, 16px between label and input
- **Radius**: Input rounded-sm 4px, button rounded-sm 4px, card rounded-lg 12px

### 2.2 New Primitives (PR-*) for Auth

| Primitive ID | Component | Purpose | File |
| :--- | :--- | :--- | :--- |
| `PR-AUTH-CARD` | `AuthCard` | Centered card container with logo, title, subtitle, form, footer | `src/components/ui/AuthCard.tsx` |
| `PR-AUTH-HEADER` | `AuthHeader` | Logo + title + subtitle inside card | Part of AuthCard or separate |
| `PR-PASSWORD-INPUT` | `PasswordInput` | Input with show/hide toggle, strength meter optional | `src/components/ui/PasswordInput.tsx` |
| `PR-AUTH-DIVIDER` | `AuthDivider` | Divider with "o" / "or" for SSO vs password | `src/components/ui/AuthDivider.tsx` |
| `PR-TRUST-BADGE` | `TrustBadge` | Small badge "Sin tarjeta", "Cancela cuando quieras", "≥98% con cita" | `src/components/ui/TrustBadge.tsx` |
| `PR-FORM-FOOTER` | `FormFooter` | Footer with link "¿No tienes cuenta? Regístrate" etc | Part of AuthCard |

### 2.3 New Components (CO-*) for Auth

| Component ID | Purpose | Composition | File |
| :--- | :--- | :--- | :--- |
| `CO-AUTH-LOGIN-FORM` | Login form: email, password, remember, forgot link, submit, SSO | PR-AUTH-CARD + PR-INPUT + PR-PASSWORD-INPUT + PR-BUTTON + PR-CHECKBOX + link | `src/components/auth/LoginForm.tsx` |
| `CO-AUTH-SIGNUP-FORM` | Signup form: name, email, password, terms checkbox, submit, SSO | Same + PR-CHECKBOX for terms | `src/components/auth/SignupForm.tsx` |
| `CO-AUTH-FORGOT-FORM` | Forgot password: email, submit, back to login | PR-AUTH-CARD + PR-INPUT + PR-BUTTON | `src/components/auth/ForgotPasswordForm.tsx` |
| `CO-AUTH-RESET-FORM` | Reset password: new password, confirm, submit | PR-AUTH-CARD + PR-PASSWORD-INPUT x2 + PR-BUTTON | `src/components/auth/ResetPasswordForm.tsx` |
| `CO-AUTH-SSO-BUTTONS` | SSO buttons: Google, GitHub, SAML | PR-BUTTON variant outline + icon | `src/components/auth/SsoButtons.tsx` |
| `CO-AUTH-TRUST-FOOTER` | Trust badges + terms links below card | PR-TRUST-BADGE x3 + links | `src/components/auth/AuthTrustFooter.tsx` |

### 2.4 Surfaces (SU-*) for Auth

| Surface ID | Route | Auth | Composition |
| :--- | :--- | :--- | :--- |
| `SU-AUTH-LOGIN` | `/login` | None | CO-AUTH-LOGIN-FORM + CO-AUTH-TRUST-FOOTER |
| `SU-AUTH-SIGNUP` | `/signup` | None | CO-AUTH-SIGNUP-FORM + CO-AUTH-TRUST-FOOTER |
| `SU-AUTH-FORGOT` | `/forgot-password` | None | CO-AUTH-FORGOT-FORM |
| `SU-AUTH-RESET` | `/password/reset` | None (token via query) | CO-AUTH-RESET-FORM |
| `SU-AUTH-LAYOUT` | All auth routes | None | Canvas #F8F7F4 + centered card + minimal header (logo) + footer (©, EN/ES, links) |

### 2.5 Page Archetype

**Archetype**: `PA-AUTH` — Authentication page archetype

- **Layout**: Full viewport canvas #F8F7F4, centered card max-w-md, minimal header with logo linking to `/`, no sidebar, no app shell, public surface
- **Header**: Logo only (OKEng wordmark) top-left or centered above card, EN/ES switch top-right
- **Card**: White surface, border, rounded-lg, shadow-md, padding 32px, contains AuthHeader (title, subtitle) + form + divider + SSO + footer links
- **Footer**: Below card, trust badges + terms/privacy links + ©, centered, muted text
- **Behavior**: FORM-SEC-01 sanitization, empty initial values, placeholder + hint, field-level validation with AlertCircle + role=alert, isLoading spinner + disabled double-submit lock, generic 401, no client corpus, exact-origin, CSRF double-submit, rate limiting TIER_AUTH_5_PER_15M, show 429 with Retry-After
- **Responsive**: Card full width on mobile with 16px margin, centered on desktop
- **i18n**: EN/ES, all copy localized

### 2.6 Workflows

**WF-AUTH-LOGIN-01**: Anonymous → /login → email + password → submit → 5-Link Auth Chain → /workspaces or /

- **Trigger**: Anonymous visits /login or clicks "Iniciar sesión" from landing header
- **Steps**: View auth card → enter email (placeholder "tu@empresa.com", hint "Usa tu correo de trabajo") → enter password (placeholder "••••••••", show/hide toggle) → optional remember checkbox → click "Iniciar sesión" (PR-BUTTON isLoading) → POST /api/auth/login with CSRF header → server validates via requestSchemas.loginSchema + FORM-SEC-01 + rate limiting → 5-Link Auth Chain (session creation, regeneration, httpOnly, secure, sameSite=strict, 12h expiry, Redis store) → redirect to /workspaces or intended URL
- **Branch**: Forgot password link → /forgot-password
- **Branch**: SSO buttons → OAuth flow (future, not in scope but UI placeholder)
- **Error**: Invalid → generic "Credenciales inválidas" (not "email not found"), field-level validation for unsafe input, 429 "Demasiados intentos, intenta en X min" with Retry-After
- **Success**: Redirect, session cookie set

**WF-AUTH-SIGNUP-01**: Anonymous → /signup → name + email + password + terms → submit → account creation → /workspaces

- **Steps**: Similar to login but with name field, password strength hint, terms checkbox (required, link to /terms, /privacy), submit → POST /api/auth/signup → validation + rate limiting → account creation + session → redirect
- **Trust**: Below card "Sin tarjeta • Cancela cuando quieras • 1.000 consultas gratis"

**WF-AUTH-FORGOT-01**: Anonymous → /forgot-password → email → submit → email sent → check email

- **Steps**: Enter email → submit → POST /api/auth/forgot-password → generic success "Si el correo existe, recibirás un enlace" (no email enumeration) → check email UI

**WF-AUTH-RESET-01**: Anonymous → /password/reset?token=xxx → new password + confirm → submit → password reset → /login

- **Steps**: Validate token (server), enter new password + confirm, strength, submit → POST /api/auth/reset-password → validation → reset → redirect to /login with success banner

---

## 3. Copy — Accurate from Product & Proposal

### 3.1 Login

- **Title**: "Inicia sesión en OKEng" / "Sign in to OKEng"
- **Subtitle**: "Tu documentación, respondiendo dentro de tu app" / "Your docs, answering inside your app" (from proposal tagline)
- **Email label**: "Correo electrónico" / "Email", placeholder "tu@empresa.com" / "you@company.com", hint "Usa tu correo de trabajo" / "Use your work email"
- **Password label**: "Contraseña" / "Password", placeholder "••••••••", hint "" (none)
- **Remember**: "Recordarme" / "Remember me"
- **Forgot**: "¿Olvidaste tu contraseña?" / "Forgot password?"
- **Submit**: "Iniciar sesión" / "Sign in"
- **Divider**: "o" / "or"
- **SSO**: "Continuar con Google" / "Continue with Google" (future)
- **Footer**: "¿No tienes cuenta? Regístrate" / "Don't have account? Sign up" → /signup
- **Trust**: "Citas verificables • Permisos por rol • Sin tarjeta" / "Verifiable citations • Role permissions • No card"

### 3.2 Signup

- **Title**: "Crea tu cuenta" / "Create your account"
- **Subtitle**: "Empieza gratis con 1.000 consultas/mes. Sin tarjeta." / "Start free with 1,000 queries/mo. No card."
- **Name label**: "Nombre" / "Name", placeholder "Ada Lovelace"
- **Email**: Same as login
- **Password**: Same + hint "Mínimo 8 caracteres" / "Min 8 chars"
- **Terms**: "Acepto los [Términos] y [Privacidad]" / "I agree to [Terms] and [Privacy]" checkbox required
- **Submit**: "Crear cuenta" / "Create account"
- **Footer**: "¿Ya tienes cuenta? Inicia sesión" / "Already have account? Sign in" → /login

### 3.3 Forgot Password

- **Title**: "Restablece tu contraseña" / "Reset your password"
- **Subtitle**: "Te enviaremos un enlace para restablecerla" / "We'll send you a reset link"
- **Email**: Same
- **Submit**: "Enviar enlace" / "Send link"
- **Footer**: "Volver a iniciar sesión" / "Back to sign in" → /login

### 3.4 Reset Password

- **Title**: "Nueva contraseña" / "New password"
- **Subtitle**: "Elige una contraseña segura" / "Choose a secure password"
- **New password**: "Nueva contraseña" / "New password"
- **Confirm**: "Confirma contraseña" / "Confirm password"
- **Submit**: "Restablecer contraseña" / "Reset password"
- **Footer**: "Volver a iniciar sesión" / "Back to sign in"

---

## 4. Implementation Plan

### Phase 1 — Primitives & Components (P0)

1. **Create 6 new PR primitives** in `src/components/ui/`:
   - `AuthCard.tsx`: Card container with logo, title, subtitle, children (form), footer slot, trust footer slot
   - `PasswordInput.tsx`: Extends PR-INPUT with show/hide toggle (Eye/EyeOff icons), optional strength meter (weak/medium/strong with color)
   - `AuthDivider.tsx`: Horizontal line with centered "o"/"or" text
   - `TrustBadge.tsx`: Small badge with icon + text, muted, for auth trust footer

2. **Create 6 new CO components** in `src/components/auth/`:
   - Each form component: uses PR primitives, FORM-SEC-01 sanitization via `formSecurity.ts`, empty initial values, placeholder + hint, field-level validation with AlertCircle + role=alert, isLoading + disabled
   - `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`, `SsoButtons.tsx`, `AuthTrustFooter.tsx`
   - i18n via `useI18n()`, EN/ES copy from this doc
   - No hardcoded colors, DS tokens

### Phase 2 — Page Spec Update (P0)

1. **Update `docs/03_page_specifications.md` PAGE-AUTH-01/02/03**:
   - Rewrite with new PA-AUTH archetype, SU-AUTH-* surfaces, WF-AUTH-* workflows
   - Preserve old spec in `docs/archive/PAGE-AUTH-legacy.md` if needed
   - Update to v3.0

2. **Update `docs/UI-01` and `docs/01_ui_foundation`, `02_component_catalog`**:
   - Add new auth primitives, components, surfaces, archetype
   - Update to v3.0

### Phase 3 — Implementation (P0)

1. **Create `src/components/auth/index.ts`** barrel

2. **Rewrite `src/pages/PublicSurfaceView.tsx` auth branches** OR create new `src/components/auth/AuthView.tsx`:
   - Option A: Rewrite auth branches in PublicSurfaceView to use new CO components — risk breaking
   - Option B (preferred): Create `AuthView.tsx` with login/signup/forgot/reset views using new CO components, keep PublicSurfaceView as legacy fallback, route via `src/app/(auth)/*` pages
   - Preserve FORM-SEC-01, 5-Link Auth Chain, rate limiting, CSRF, generic errors

3. **Update `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset/page.tsx`**:
   - Import `AuthView` or direct CO components, render with i18n
   - Pure Next.js client component or server component with client islands
   - Ensure no Vite runner, use Next.js App Router

4. **i18n**: Add EN/ES keys for auth copy in `src/services/i18n.ts` or locale files

5. **A11y**: Landmark roles, heading hierarchy, form labels, aria-invalid, role=alert, focus management, keyboard navigation

### Phase 4 — Testing & Verification (P0)

1. **Security verification**:
   - FORM-SEC-01: Try <script>, <iframe>, on*=, javascript:, etc — must be rejected with field error
   - Rate limiting: 6th attempt in 15 min → 429 with Retry-After
   - CSRF: POST without header → 403
   - Generic errors: Invalid login → "Credenciales inválidas" not "email not found"
   - No client corpus: No docs in client bundle
   - Empty initial values: Inputs empty on load, placeholder shown

2. **Visual verification**:
   - Card centered, warm canvas, white surface, cobalt accent, rounded-lg, shadow-md
   - Responsive mobile/desktop
   - i18n ES/EN
   - No console errors

3. **Functional verification**:
   - Login → /workspaces, Signup → /workspaces, Forgot → email sent, Reset → /login
   - Links: signup ↔ login, forgot → login, terms/privacy → /terms /privacy

---

## 5. Dependencies & Risks

- **Depends on**: PLAN-001 DS tokens, PLAN-003 visual direction, PLAN-005 Next.js architecture
- **Risk**: Auth redesign breaks 5-Link Auth Chain — mitigate by preserving sessionAndCsrf, rateLimiter, requestSchemas logic, no changes to server auth
- **Risk**: Breaks existing auth tests — mitigate by updating tests, preserving security intent

---

## 6. Deliverables

- [ ] This plan doc (PLAN-002)
- [ ] 4 new PR primitives (AuthCard, PasswordInput, AuthDivider, TrustBadge)
- [ ] 6 new CO components in `src/components/auth/`
- [ ] Updated `docs/03_page_specifications.md` PAGE-AUTH specs v3.0
- [ ] Updated `docs/UI-01`, `01_ui_foundation`, `02_component_catalog` v3.0
- [ ] New `src/components/auth/AuthView.tsx` or updated PublicSurfaceView auth branches
- [ ] Updated `src/app/(auth)/*` pages to use new auth view
- [ ] i18n keys for auth copy
- [ ] Security verification (FORM-SEC-01, rate limiting, CSRF, generic errors)

---

*Plan up to standards — ready for execution after PLAN-001 DS tokens.*
