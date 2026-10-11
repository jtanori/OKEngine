# PLAN-001 — Landing Page Full Incorporation from Proposal

| Field | Value |
| :--- | :--- |
| **Document ID** | `PLAN-001` |
| **Status** | `APPROVED — EXECUTION IN PROGRESS` |
| **Owner** | Product & Design System |
| **Authority** | Blocking — Homepage & Public Surfaces |
| **Dependencies** | `00_product_contract`, `01_ui_foundation`, `02_component_catalog`, `03_page_specifications`, `UI-01`, `PUBLIC-01`, `PAGE-PUB-01`, `AUDIT-001`, `PLAN-003` |
| **Revision** | `1.0 (2026-10-11)` |
| **Source** | `https://01a1278b-f5a1-71f6-830f-8c5c544d4689.arena.site/` — full copy extracted |

---

## 0. Goal

Fully incorporate landing design from proposal into home page (`/`), forgetting old content visually but preserving ideas/plans/components for later use (pipeline, pillars, old tour contract). New landing must:

- Use accurate copy from deep product read (not lorem)
- Introduce new visual direction (warm canvas, editorial, metrics, pricing, FAQ)
- Create/update UI primitives, components, surfaces, archetypes, workflows, specs
- Be implemented in proper Next.js architecture (`src/app/(public)/page.tsx` → `PublicSurfaceView.tsx` or new `LandingView.tsx`)
- Pass i18n (EN/ES), a11y, FORM-SEC-01, exact-origin

---

## 1. Proposal Content Inventory (Extracted)

### 1.1 Top Announcement Banner
- **Copy**: "Citas verificables y permisos por rol" (ES) / "Verifiable citations and role-based permissions" (EN)
- **Visual**: Full-width, subtle background, centered text, small dot or badge
- **Behavior**: Static, dismissible? In proposal not dismissible

### 1.2 Hero — Split Layout
- **Left**:
  - Badge: "Nuevo: Widget que parece tuyo" / "New: Widget that looks yours"
  - H1: "Capa de conocimiento para tu producto" / "Knowledge layer for your product" (ES) — Actually full: "Capa de conocimiento para tu producto / Convierte tu documentación en respuestas con citas, dentro de tu app"
  - H1 EN: "Knowledge layer for your product / Turn your docs into cited answers, inside your app"
  - Sub: "Empieza gratis con 1.000 consultas/mes. Sin tarjeta. Cancela cuando quieras." / "Start free with 1,000 queries/mo. No card. Cancel anytime."
  - CTAs: Primary "Empieza gratis" / "Start free" → /signup, Secondary "Ver cómo funciona" / "See how it works" → anchor #como-funciona
  - Trust: Badges "≥98% con cita" / "≥98% cited", "Permisos por rol" / "Role permissions", "Markdown, PDF y web" / "Markdown, PDF & web"
  - Social proof: Avatars + "Más de 1.200 equipos confían" / "1,200+ teams trust"
- **Right**: Chat mock UI
  - Header: "OKEng — Demo en vivo" / "Live demo", status dot "En línea"
  - Messages: User "¿Cómo configuro SSO?" / "How to configure SSO?", Bot answer with citations [1] [2]
  - Citations strip: Source chips with title + excerpt
  - Input: "Pregunta sobre tu docs..." / "Ask about your docs..."
  - Metrics below mock: "0 líneas de código" / "0 lines of code" for widget? Actually "0 líneas" placeholder, needs real: "3 líneas de código"

### 1.3 Logo Strip
- **Title**: "Usado por equipos que escalan soporte" / "Used by teams scaling support"
- **Logos**: Nexora, Dataflow, Kubelab, Aurea, Pacted, Vanti (6 logos, monochrome, opacity 60%)

### 1.4 Metrics Bar
- **Metrics**: "0 líneas de código para el widget", "-0% tickets repetidos", "99.9% uptime", "0 datos usados para entrenar"
- **Real values from proposal**: Need accurate — "-73% tickets repetidos" from testimonials, "3 líneas de código" for widget, "1.000 consultas gratis"

### 1.5 Cómo Funciona — 5 Steps
- **Section title**: "Cómo funciona" / "How it works", subtitle "De archivos a respuestas en 5 pasos"
- **Steps**:
  1. **Sube contenido**: "Markdown, PDF, URLs. Arrastrar y soltar, sin fricción." Icon: MD/PDF
  2. **Organiza en colecciones**: "Agrupa por producto, audiencia o tema. +9 colecciones ilimitadas." Icon: +9
  3. **Define quién ve qué**: "Permisos por rol: todos, miembros, admins. SSO y SAML." Icon: sso/saml
  4. **Recupera con contexto híbrido**: "Búsqueda semántica + palabras clave. Re-ranking con citas verificables." Icon: hybrid
  5. **Responde con citas**: "Cada respuesta con fuentes clicables. Sin alucinaciones." Icon: citations
- **Visual**: Horizontal steps on desktop (5 columns), vertical on mobile, connecting line, number + icon + title + description

### 1.6 Producto — 6 Features
- **Section title**: "Todo lo que necesitas para responder con confianza" / "Everything you need to answer with confidence"
- **Features grid (3x2)**:
  1. **Markdown primero**: "Tu documentación como fuente de verdad. MD, MDX, PDF, URLs. Sincronización automática."
  2. **Permisos por rol**: "Control granular: todos, miembros, admins. Hereda de tu app vía SSO."
  3. **Citas verificables**: "≥98% de respuestas con fuente. Cada afirmación trazable al doc original."
  4. **Tu modelo, tu clave**: "OpenAI, Anthropic, Azure, Bedrock, o local. Trae tu propia API key. Datos nunca usados para entrenar."
  5. **Widget que parece tuyo**: "100% personalizable: colores, fuentes, posición. Parece parte de tu producto, no un añadido."
  6. **Analítica de uso**: "Qué preguntan, qué falta, qué fuentes usan. Mejora continua de tu base de conocimiento."
- **Visual**: Card grid, icon top, title, description, subtle border, hover lift

### 1.7 Integración — 3 Modes
- **Section title**: "Se adapta a cómo usas tu producto" / "Adapts to how you use your product"
- **Subtitle**: "Widget flotante, panel lateral o pantalla completa. Elige la experiencia."
- **Tabs**: "Widget flotante" / "Floating widget", "Panel lateral" / "Side panel", "Pantalla completa" / "Full screen"
- **Content per tab**:
  - Widget flotante: Mock floating button bottom-right + chat window, description "Ideal para ayuda contextual sin salir del flujo. 3 líneas de código."
  - Panel lateral: Mock side drawer 380px, description "Documentación y chat en un panel deslizable. Perfecto para dashboards."
  - Pantalla completa: Mock full page search + filters + answer, description "Base de conocimiento completa. Para centros de ayuda dedicados."
- **Code snippet**: For each mode, show 3 lines code: `<OKEngWidget collection="..." theme={{ accent: "#1D4ED8" }} />`

### 1.8 Para Desarrolladores — Code + Bullets
- **Section title**: "Para desarrolladores, por desarrolladores" / "For developers, by developers"
- **Left**: Code block `HelpCenter.tsx`:
```tsx
import { OKEngWidget } from '@okeng/react';

export function HelpCenter() {
  return (
    <OKEngWidget
      collection="docs"
      theme={{ accent: "#1D4ED8" }}
      permissions={{ role: user.role }}
    />
  );
}
```
- **Right**: Bullets:
  - API REST completa
  - Webhooks para sincronización
  - Trae tu propia clave (BYOK)
  - Despliega en UE (EU hosting)
  - SDKs: React, Vue, JS
  - Documentación interactiva

### 1.9 Clientes — Testimonials + Metrics
- **Section title**: "Equipos que responden mejor" / "Teams that answer better"
- **Testimonials (3 cards)**:
  1. "Reducimos 73% los tickets repetidos. OKEng responde con citas, no inventa." — CTO, Nexora
  2. "Integración en una tarde. 3 líneas de código y parecía nuestro." — Lead, Dataflow
  3. "Permisos por rol nos salvó. Clientes solo ven lo que deben." — PM, Kubelab
- **Metrics**: "-73% tickets repetidos", "1.200+ equipos", "99.9% uptime", "≥98% con cita"

### 1.10 Precios — 3 Tiers + Toggle
- **Section title**: "Precios simples, que escalan contigo" / "Simple pricing that scales with you"
- **Toggle**: Mensual / Anual -20%
- **Tiers**:
  - **Starter**: 0€/mes, 1.000 consultas/mes, 1 colección, 100 archivos, Widget + Panel, Soporte comunitario, CTA "Empieza gratis"
  - **Pro**: 31€/mes (24€ anual), 10.000 consultas/mes, 10 colecciones, 1.000 archivos, Todo en Starter + Permisos por rol + SSO + Analítica + Soporte prioritario, CTA "Empieza con Pro", badge "Más popular"
  - **Escala**: A medida, Consultas ilimitadas, Colecciones ilimitadas, Archivos ilimitados, Todo en Pro + On-premise + SLA + Soporte dedicado + BYOK, CTA "Habla con nosotros"
- **FAQ below pricing**: Link to FAQ

### 1.11 FAQ — Accordion
- **Section title**: "Preguntas frecuentes" / "FAQ"
- **Questions (6)**:
  1. ¿Cuánto tarda la integración? / How long integration? — "3 líneas de código, una tarde. SDKs React/Vue/JS, API REST, webhooks."
  2. ¿Usáis mis datos para entrenar? / Do you use my data for training? — "Nunca. 0 datos usados para entrenar. Trae tu propia clave, despliega en UE."
  3. ¿Cómo funcionan los permisos? / How permissions work? — "3 niveles: todos, miembros, admins. Hereda de tu app vía SSO/SAML, filtrado en retrieval."
  4. ¿Qué formatos soportáis? / What formats supported? — "Markdown, MDX, PDF, URLs. Sincronización automática, re-index."
  5. ¿Qué pasa si no hay fuente? / What if no source? — "Responde 'No tengo fuente para eso' con ≥98% con cita. Sin alucinaciones."
  6. ¿Puedo migrar desde X? / Can I migrate from X? — "Sí, API de importación, soporte migración, preserva estructura."

### 1.12 Final CTA
- **Section**: Centered, large H2 "Empieza a responder en minutos" / "Start answering in minutes", sub "1.000 consultas gratis, sin tarjeta. Cancela cuando quieras."
- **CTAs**: "Empieza gratis" primary, "Ver demo" secondary
- **Trust**: "Sin tarjeta • Cancela cuando quieras • Soporte en ES/EN"

### 1.13 Footer
- **Columns**: Producto (Características, Integración, Precios, Changelog), Desarrolladores (Docs, API, SDKs, Estado), Empresa (Sobre, Blog, Contacto), Legal (Términos, Privacidad, Uso aceptable)
- **Bottom**: © OKEng, ES/EN switch, social icons

---

## 2. Design System — New Visual Direction

### 2.1 Tokens to Add/Update in `src/index.css`

**Current**: Warm Alabaster #F8F7F4, Ink #171717, Cobalt #1D4ED8, radius sm 4px, md 6px, Inter + JetBrains Mono

**New Direction from Proposal** (preserve base but extend):
- **Backgrounds**: Keep #F8F7F4 canvas, #FFFFFF surface, add #FAF9F6 elevated, add #F4F4F0 subtle for pricing cards
- **Accent**: Keep #1D4ED8 primary, add #EFF6FF subtle, #1E40AF hover, add #0F172A ink-strong for hero H1
- **Success**: #15803D for ≥98% badge, #F0FDF4 subtle
- **Typography**: Keep Inter, but hero H1 uses 48px/52px tight, 600 weight, -0.02em tracking. Body 16px/24px. Mono for code 13px.
- **Radii**: Keep xs 3px, sm 4px, md 6px, add lg 12px for hero mock, pricing cards, testimonial cards
- **Shadows**: Add `shadow-sm` 0 1px 2px rgba(0,0,0,0.04), `shadow-md` 0 4px 12px rgba(0,0,0,0.08), `shadow-lg` 0 8px 24px rgba(0,0,0,0.12) for hero mock, pricing popular
- **Spacing**: Add section padding `py-24` (96px) desktop, `py-16` mobile for landing sections
- **Max widths**: `max-w-7xl` for sections, `max-w-3xl` for centered text

### 2.2 New Primitives (PR-*) Required

| Primitive ID | Component | Purpose | File |
| :--- | :--- | :--- | :--- |
| `PR-ANNOUNCEMENT-BANNER` | `AnnouncementBanner` | Top full-width banner "Citas verificables y permisos por rol" | `src/components/ui/AnnouncementBanner.tsx` |
| `PR-METRIC` | `Metric` | Metric display "−73% tickets" with value + label | `src/components/ui/Metric.tsx` |
| `PR-PRICING-TOGGLE` | `PricingToggle` | Monthly/Annual toggle with -20% badge | `src/components/ui/PricingToggle.tsx` |
| `PR-TESTIMONIAL-CARD` | `TestimonialCard` | Testimonial with quote, author, role, company | `src/components/ui/TestimonialCard.tsx` |
| `PR-FAQ-ACCORDION` | `FaqAccordion` | FAQ accordion with Q + A, single expand | `src/components/ui/FaqAccordion.tsx` |
| `PR-CODE-SNIPPET` | `CodeSnippet` | Code block with language, copy button, line numbers | `src/components/ui/CodeSnippet.tsx` |
| `PR-LOGO-STRIP` | `LogoStrip` | Logo strip 6 logos monochrome | `src/components/ui/LogoStrip.tsx` |
| `PR-INTEGRATION-TABS` | `IntegrationTabs` | Tabs for widget/panel/fullscreen with mock preview | `src/components/ui/IntegrationTabs.tsx` |
| `PR-FEATURE-CARD` | `FeatureCard` | Feature card icon + title + desc for 6 features | `src/components/ui/FeatureCard.tsx` |
| `PR-HOW-IT-WORKS-STEP` | `HowItWorksStep` | Step number + icon + title + desc + connector line | `src/components/ui/HowItWorksStep.tsx` |
| `PR-CHAT-MOCK` | `ChatMock` | Chat mock UI with header, messages, citations, input | `src/components/ui/ChatMock.tsx` |
| `PR-PRICING-CARD` | `PricingCard` | Pricing tier card with features, CTA, popular badge | `src/components/ui/PricingCard.tsx` |

**All primitives must**:
- Consume DS tokens via `@theme`, no hardcoded colors
- Support `sizeVariant` if applicable
- Enforce `rounded-sm` (4px) default, `rounded-md` (6px) for cards, `rounded-lg` (12px) for hero mock/pricing popular
- Use `font-sans` Inter, `font-mono` for code
- A11y: `role`, `aria-*`, keyboard navigation for tabs/accordion/toggle

### 2.3 New Components (CO-*) Required

| Component ID | Purpose | Composition | File |
| :--- | :--- | :--- | :--- |
| `CO-LANDING-HERO` | Hero split left copy + right chat mock | PR-BOX + PR-TEXT + PR-BUTTON + PR-CHAT-MOCK + PR-BADGE + PR-METRIC | `src/components/landing/LandingHero.tsx` |
| `CO-LANDING-LOGO-STRIP` | Logo strip with title | PR-LOGO-STRIP + PR-TEXT | `src/components/landing/LandingLogoStrip.tsx` |
| `CO-LANDING-METRICS` | Metrics bar 4 metrics | PR-METRIC x4 in grid | `src/components/landing/LandingMetrics.tsx` |
| `CO-LANDING-HOW-IT-WORKS` | 5 steps horizontal | PR-HOW-IT-WORKS-STEP x5 + connector | `src/components/landing/LandingHowItWorks.tsx` |
| `CO-LANDING-PRODUCT-FEATURES` | 6 features grid 3x2 | PR-FEATURE-CARD x6 | `src/components/landing/LandingProductFeatures.tsx` |
| `CO-LANDING-INTEGRATION` | 3 modes tabs + preview | PR-INTEGRATION-TABS + mock + code | `src/components/landing/LandingIntegration.tsx` |
| `CO-LANDING-DEVELOPERS` | Code block + bullets | PR-CODE-SNIPPET + PR-TEXT + list | `src/components/landing/LandingDevelopers.tsx` |
| `CO-LANDING-TESTIMONIALS` | 3 testimonials + metrics | PR-TESTIMONIAL-CARD x3 + PR-METRIC | `src/components/landing/LandingTestimonials.tsx` |
| `CO-LANDING-PRICING` | Pricing 3 tiers + toggle | PR-PRICING-TOGGLE + PR-PRICING-CARD x3 | `src/components/landing/LandingPricing.tsx` |
| `CO-LANDING-FAQ` | FAQ accordion 6 Q | PR-FAQ-ACCORDION | `src/components/landing/LandingFaq.tsx` |
| `CO-LANDING-FINAL-CTA` | Final centered CTA | PR-BOX + PR-TEXT + PR-BUTTON | `src/components/landing/LandingFinalCta.tsx` |
| `CO-LANDING-FOOTER` | Footer 4 columns + bottom | PR-BOX + links + LanguageSelector | `src/components/landing/LandingFooter.tsx` |

### 2.4 Surfaces (SU-*) Required

| Surface ID | Route | Auth | Composition |
| :--- | :--- | :--- | :--- |
| `SU-LANDING-ANNOUNCEMENT` | `/` top | None | PR-ANNOUNCEMENT-BANNER |
| `SU-LANDING-HERO` | `/` hero | None | CO-LANDING-HERO |
| `SU-LANDING-LOGOS` | `/` logos | None | CO-LANDING-LOGO-STRIP |
| `SU-LANDING-METRICS` | `/` metrics | None | CO-LANDING-METRICS |
| `SU-LANDING-HOW-IT-WORKS` | `/` #como-funciona | None | CO-LANDING-HOW-IT-WORKS |
| `SU-LANDING-PRODUCT` | `/` #producto | None | CO-LANDING-PRODUCT-FEATURES |
| `SU-LANDING-INTEGRATION` | `/` #integracion | None | CO-LANDING-INTEGRATION |
| `SU-LANDING-DEVELOPERS` | `/` #desarrolladores | None | CO-LANDING-DEVELOPERS |
| `SU-LANDING-TESTIMONIALS` | `/` #clientes | None | CO-LANDING-TESTIMONIALS |
| `SU-LANDING-PRICING` | `/` #precios | None | CO-LANDING-PRICING |
| `SU-LANDING-FAQ` | `/` #faq | None | CO-LANDING-FAQ |
| `SU-LANDING-FINAL-CTA` | `/` final | None | CO-LANDING-FINAL-CTA |
| `SU-LANDING-FOOTER` | `/` footer | None | CO-LANDING-FOOTER |

### 2.5 Page Archetype

**Archetype**: `PA-LANDING` — Marketing landing page archetype

- **Layout**: Single column, max-w-7xl centered, section padding py-16 md:py-24, no sidebar, no app shell, public surface
- **Header**: Minimal header with logo + nav links (Producto, Integración, Precios, FAQ) + CTAs (Iniciar sesión, Empieza gratis) + announcement banner
- **Sections**: 12 surfaces stacked vertically with dividers or background alternation (canvas vs surface)
- **Footer**: Full-width footer with 4 columns + bottom bar
- **Behavior**: Anchor navigation, pricing toggle state (monthly/annual), FAQ accordion state, integration tabs state, no auth required, i18n EN/ES

### 2.6 Workflows

**WF-LANDING-01**: Anonymous visitor → landing → hero CTA "Empieza gratis" → /signup → onboarding

- **Trigger**: Anonymous visits `/`
- **Steps**: Views announcement → hero (value prop) → logo strip (social proof) → metrics → how it works (5 steps) → product features (6) → integration (3 modes) → developers (code) → testimonials → pricing (toggle) → FAQ → final CTA → /signup
- **Branch**: Secondary CTA "Ver cómo funciona" → scroll to #como-funciona
- **Success**: Clicks primary CTA → /signup, conversion tracked

**WF-PRICING-01**: Pricing toggle → plan selection → checkout (future)

- **Trigger**: User in pricing section
- **Steps**: Toggle monthly/annual → view tier features → click CTA → /signup?plan=pro or /contact?plan=escala
- **State**: `pricingInterval` = 'monthly' | 'annual' stored in local state, -20% badge for annual

---

## 3. Copy — Accurate from Product Read

### 3.1 Product Truth (from `00_product_contract` + code)

- **What OKEng is**: Knowledge layer for product — turns docs (MD, PDF, URLs) into cited answers inside app
- **Invariant**: Files → Collections → Access → Context → Answer (not broken)
- **Key capabilities**:
  - Ingestion: MD, MDX, PDF, URLs, drag & drop, auto-sync, re-index
  - Collections: Group by product/audience/topic, unlimited (Pro+)
  - Access: 3-tier (everyone, members, admins), inherits via SSO/SAML, filtered at retrieval (not just UI)
  - Context: Hybrid search semantic + keyword, re-ranking, citations
  - Answer: ≥98% with citation, no hallucinations, source chips with excerpt
  - Widget: 100% customizable, 3 lines code, floating/panel/fullscreen, looks native
  - Model: BYOK OpenAI/Anthropic/Azure/Bedrock/local, 0 data used for training, EU hosting
  - Analytics: What asked, what's missing, what sources used
  - Governance: Feedback, report issue, save answer

### 3.2 Copy Mapping (ES primary from proposal, EN secondary)

- **Hero H1**: "Capa de conocimiento para tu producto" + "Convierte tu documentación en respuestas con citas, dentro de tu app" — accurate to product
- **Sub**: "Empieza gratis con 1.000 consultas/mes. Sin tarjeta." — matches pricing Starter 0€
- **Badges**: "≥98% con cita" (from product metric), "Permisos por rol" (from access control), "Markdown, PDF y web" (from ingestion)
- **How it works**: 5 steps map to invariant Files→Collections→Access→Context→Answer
- **Product features**: 6 features map to capabilities: MD primero (ingestion), Permisos (access), Citas (context/answer), Tu modelo tu clave (BYOK), Widget que parece tuyo (embed), Analítica (analytics)
- **Integration**: 3 modes map to EMBED-02 surfaces: widget (SU-EMBED-CHAT), panel (SU-EMBED-PANEL), fullscreen (SU-EMBED-FULLSCREEN)
- **Developers**: Code snippet accurate to SDK, bullets API REST, webhooks, BYOK, EU hosting, SDKs React/Vue/JS — matches product
- **Pricing**: Starter 0€ 1k queries, Pro 31€/mo 10k, Escala custom — to be validated with monetization analysis (ANALYSIS-001)

---

## 4. Implementation Plan

### Phase 1 — Design System & Primitives (P0)

1. **Update `src/index.css`**:
   - Add shadow tokens, lg radius, section spacing, max-w tokens
   - Preserve existing tokens, add new

2. **Create 12 new PR primitives** in `src/components/ui/`:
   - Each with `index.ts` export, props interface, DS token consumption, a11y, sizeVariant if needed
   - Stories? Not required but props documented

3. **Create `src/components/landing/` directory** with 12 CO components:
   - Each composed from PR primitives
   - i18n via `useI18n()` or props, EN/ES copy from this doc
   - No hardcoded colors, use DS tokens

### Phase 2 — Page Spec Update (P0)

1. **Update `docs/03_page_specifications.md` PAGE-PUB-01**:
   - Replace old 5-stage tour (pipeline/pillars) with new 12-surface structure
   - Preserve old spec in `docs/archive/PAGE-PUB-01-v2-legacy.md`
   - Keep `hero-what-is-okeng-cta` ref for test compatibility or update tests
   - New spec: 12 surfaces, PA-LANDING archetype, WF-LANDING-01, WF-PRICING-01

2. **Update `docs/UI-01` and `docs/01_ui_foundation`, `02_component_catalog`**:
   - Add new primitives, components, surfaces, archetype
   - Update to v3.0

### Phase 3 — Implementation (P0)

1. **Create `src/components/landing/index.ts`** barrel export

2. **Rewrite `src/pages/PublicSurfaceView.tsx`** landing section OR create new `src/components/landing/LandingView.tsx`:
   - Option A: Rewrite PublicSurfaceView home branch (current 2262 lines) to new landing — risk breaking auth
   - Option B (preferred): Extract landing to `LandingView.tsx`, keep PublicSurfaceView for auth + legacy, route `/` to LandingView via `src/app/(public)/page.tsx`
   - Preserve `HomepageGuidedTour` and old tour contract as optional overlay? Or keep for later — per task "preserve old idea/components for later use"

3. **Update `src/app/(public)/page.tsx`**:
   - Import `LandingView`, render with i18n
   - No Vite runner, pure Next.js client component or server component with client islands

4. **i18n**: Add EN/ES keys for new landing copy in `src/services/i18n.ts` or locale files

5. **A11y**: Ensure landmark roles, heading hierarchy, skip links, focus management for tabs/accordion/toggle

### Phase 4 — Testing & Verification (P0)

1. **Update `scripts/tests/homepage-tour-readiness.test.ts`**:
   - Update selectors for new landing structure but preserve 52 checks intent
   - Keep `APPROVED_HOMEPAGE_TOUR_CONTRACT` and `EMB-PUBLIC-HOME` boundary but update copy

2. **Manual verification**:
   - Visual: hero, 5 steps, 6 features, 3 integration modes, pricing toggle, FAQ, footer
   - Functional: CTAs to /signup, anchor nav, toggle, accordion, tabs
   - Responsive: mobile, tablet, desktop
   - i18n: ES/EN switch
   - No console errors, no hardcoded secrets, FORM-SEC-01 not needed for landing (no forms) but CTAs safe

---

## 5. Preservation of Old Ideas

Per task: "forget old content but preserve ideas/plans/components for later use"

- **Old landing content**: Pipeline (Files→Collections→Access→Context→Answer), Pillars (Markdown-first, Permissions, Citations, Widget, BYOK, Analytics), CTA
- **Preservation**: Move to `docs/archive/PAGE-PUB-01-v2-legacy.md` + `src/components/public/legacy/` or comment in `PublicSurfaceView.tsx` as `LEGACY_LANDING_V2`
- **Tour contract**: Keep `APPROVED_HOMEPAGE_TOUR_CONTRACT` idea (guided tour) but new landing may not need it — preserve component `HomepageGuidedTour.tsx` for future use, not render in new landing initially
- **Components**: Preserve `DocArticleRenderer`, `DogfoodInlineBot` — still used in embed surfaces, not landing

---

## 6. Dependencies & Risks

- **Depends on**: PLAN-003 visual direction (tokens), AUDIT-001 (security preserved), PLAN-005 Next.js architecture (implementation in Next.js)
- **Risk**: New primitives increase bundle size — mitigate by tree-shaking, no heavy deps
- **Risk**: Copy inaccurate — mitigate by deep product read (this doc uses product truth)
- **Risk**: Breaks homepage-tour tests — mitigate by updating tests, preserving intent

---

## 7. Deliverables

- [ ] This plan doc (PLAN-001)
- [ ] Updated DS tokens in `src/index.css`
- [ ] 12 new PR primitives in `src/components/ui/`
- [ ] 12 new CO components in `src/components/landing/`
- [ ] Updated `docs/03_page_specifications.md` PAGE-PUB-01 v3.0
- [ ] Updated `docs/01_ui_foundation.md`, `02_component_catalog.md`, `UI-01` v3.0
- [ ] New `src/components/landing/LandingView.tsx`
- [ ] Updated `src/app/(public)/page.tsx` to use LandingView
- [ ] i18n keys for landing copy
- [ ] Updated homepage-tour tests
- [ ] Preserved legacy in `docs/archive/`

---

*Plan up to standards — ready for execution.*
