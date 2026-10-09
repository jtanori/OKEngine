import { Workspace, Collection, KnowledgeDocument, EmbedInstance } from '../types';

export const INITIAL_WORKSPACE: Workspace = {
  id: 'ws_okeng_01',
  name: 'OKEng',
  slug: 'okeng',
  publicKey: 'pk_live_ok_7739a8204b',
  signingSecret: 'sk_live_sec_okeng_prod_9921',
  knowledgeVersion: 187,
  createdAt: '2026-09-15T08:00:00Z',
};

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'COL-PUBLIC',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Public Product Knowledge',
    description:
      'Product overview, core capabilities, concepts, terminology, security architecture, and public FAQs. Powers EMB-PUBLIC-HOME.',
    visibility: 'everyone',
    fileCount: 4,
    createdAt: '2026-09-15T08:30:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
  },
  {
    id: 'COL-DOCS',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Documentation',
    description:
      'Canonical product documentation: getting started, workspaces, collections, files, markdown, ingestion, retrieval, access control, embedding, and troubleshooting. Powers /docs and EMB-PUBLIC-DOCS.',
    visibility: 'everyone',
    fileCount: 11,
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
  },
  {
    id: 'COL-LEGAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Legal',
    description:
      'Authoritative Terms of Service, Privacy Policy, and Acceptable Use Policy. Deterministically rendered on legal pages and indexed for EMB-PUBLIC-LEGAL.',
    visibility: 'everyone',
    fileCount: 3,
    createdAt: '2026-09-17T09:00:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
  },
  {
    id: 'COL-CUSTOMER',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Customer Docs',
    description:
      'Authenticated customer integration guides: backend HMAC token signing, host context route rules, and production rollout checklists. Accessible to Members and Admins.',
    visibility: 'members',
    fileCount: 3,
    createdAt: '2026-09-17T14:00:00Z',
    updatedAt: '2026-10-06T08:00:00Z',
  },
  {
    id: 'COL-INTERNAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Internal',
    description:
      'Restricted administrative documentation, pre-retrieval authorization architecture, cache epoch internals, and security runbooks. Accessible strictly to Admins.',
    visibility: 'admins',
    fileCount: 4,
    createdAt: '2026-09-18T11:15:00Z',
    updatedAt: '2026-10-06T08:00:00Z',
  },
];

export const INITIAL_PUBLIC_EMBEDS: EmbedInstance[] = [
  {
    id: 'EMB-PRODUCT-WIDGET',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Product Help',
    status: 'active',
    mode: 'widget',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
    },
    behaviorConfig: {
      initialState: 'closed',
      suggestedQuestions: [
        'What is the fastest way to get started?',
        'How do I restrict a collection to employees?',
        'Where do I invite team members?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '400px',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'How can we help you with OKEng today?',
    placeholderText: 'Ask about setup, collections, or embedding...',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS'],
    createdAt: '2026-09-15T08:45:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-DOCS',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Documentation',
    status: 'active',
    mode: 'documentation',
    knowledgeScope: {
      collectionIds: ['COL-DOCS'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: false,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What is the fastest way to get started?',
        'How do I restrict a collection to employees?',
        'Where do I invite team members?',
      ],
      showNavigation: true,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Search or ask questions across the OKEng engineering documentation.',
    placeholderText: 'How do I restrict a collection to employees?',
    allowedCollectionIds: ['COL-DOCS'],
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'EMB-ADMIN-PANEL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Admin Help',
    status: 'active',
    mode: 'panel',
    knowledgeScope: {
      collectionIds: ['COL-DOCS', 'COL-INTERNAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'How are production KMS keys rotated?',
        'How does emergency customer support access work?',
        'Where do I invite team members?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '360px',
      position: 'right',
      radius: '4px',
      accentColor: '#171717',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#171717',
    greetingText: 'Slide-in administrative knowledge panel scoped to Docs & Internal Runbooks.',
    placeholderText: 'Ask about SSO, vault rotation, or workspace administration...',
    allowedCollectionIds: ['COL-DOCS', 'COL-INTERNAL'],
    createdAt: '2026-09-18T12:00:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-HOME',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'OKEng Homepage Assistant',
    status: 'active',
    mode: 'inline',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
      routeRules: [
        {
          routePattern: '/',
          promptTitle: 'Homepage · Product Overview',
          suggestedQuestions: [
            'What is OKEng?',
            'How does OKEng work?',
            'How do Embeds work?',
            'How does OKEng protect private knowledge?',
            'How does contextual retrieval work?',
            '¿Cómo funciona OKEng?',
          ],
          pinnedDocumentIds: ['doc_pub_01', 'doc_pub_02'],
        },
        {
          routePattern: '/docs/embedding',
          promptTitle: 'Embeds & Host Integration',
          suggestedQuestions: [
            'How do Embeds work?',
            'How does contextual retrieval work?',
            'How do I configure customer authentication and host context?',
          ],
          pinnedDocumentIds: ['doc_docs_13', 'doc_cust_21'],
        },
        {
          routePattern: '/docs/access-control',
          promptTitle: 'Access Control & Security Architecture',
          suggestedQuestions: [
            'How does OKEng protect private knowledge?',
            'How do I configure customer authentication and host context?',
            'How does the pre-retrieval authorization and cache pipeline work?',
          ],
          pinnedDocumentIds: ['doc_docs_12', 'doc_internal_24'],
        },
      ],
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What is OKEng?',
        'How does OKEng work?',
        'How do Embeds work?',
        'How does OKEng protect private knowledge?',
        'How does contextual retrieval work?',
        '¿Cómo funciona OKEng?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Ask anything about OKEng product capabilities, collections, or security.',
    placeholderText: 'What can OKEng do?',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-LEGAL', 'COL-CUSTOMER', 'COL-INTERNAL'],
    createdAt: '2026-09-15T09:00:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
  },
  {
    id: 'EMB-SSO-CONTEXTUAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'Contextual Route Assistant',
    status: 'active',
    mode: 'contextual',
    knowledgeScope: {
      collectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-INTERNAL'],
      documentIds: ['doc_docs_05', 'doc_docs_06', 'doc_docs_12', 'doc_docs_13', 'doc_internal_18'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: true,
      routeRules: [
        {
          routePattern: '/settings/security/sso',
          promptTitle: 'Need help with SSO & Security?',
          suggestedQuestions: [
            'How are production KMS keys rotated?',
            'How do I restrict a collection to employees?',
          ],
          pinnedDocumentIds: ['doc_internal_18', 'doc_docs_12'],
        },
        {
          routePattern: '/docs/getting-started',
          promptTitle: 'Getting started with OKEng',
          suggestedQuestions: [
            'What is the fastest way to get started?',
            'How does the file ingestion process work?',
          ],
          pinnedDocumentIds: ['doc_docs_05', 'doc_docs_10'],
        },
        {
          routePattern: '/billing/invoices',
          promptTitle: 'Workspace & Seat Administration',
          suggestedQuestions: [
            'Where do I invite team members?',
            'What permissions does a Workspace Owner hold?',
          ],
          pinnedDocumentIds: ['doc_docs_06', 'doc_pub_02'],
        },
        {
          routePattern: '/api/authentication',
          promptTitle: 'Embedded Identity & HMAC Signing',
          suggestedQuestions: [
            'How does authenticated embed initialization work?',
            'Why did the widget return 401 TOKEN_EXPIRED?',
          ],
          pinnedDocumentIds: ['doc_docs_13', 'doc_docs_14'],
        },
      ],
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'How do I restrict a collection to employees?',
        'How does authenticated embed initialization work?',
      ],
      showNavigation: true,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '340px',
      position: 'right',
      radius: '4px',
      accentColor: '#1D4ED8',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#1D4ED8',
    greetingText: 'Context-aware knowledge sidebar tailored to the active host route.',
    placeholderText: 'Ask about this page...',
    allowedCollectionIds: ['COL-PUBLIC', 'COL-DOCS', 'COL-INTERNAL'],
    createdAt: '2026-09-19T14:00:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'EMB-PUBLIC-LEGAL',
    workspaceId: INITIAL_WORKSPACE.id,
    name: 'OKEng Legal & Privacy Assistant',
    status: 'active',
    mode: 'fullscreen',
    knowledgeScope: {
      collectionIds: ['COL-LEGAL'],
    },
    contextConfig: {
      useCurrentPage: true,
      useHostUserContext: false,
    },
    behaviorConfig: {
      initialState: 'open',
      suggestedQuestions: [
        'What does the privacy policy say about uploaded files?',
        'Does OKEng store customer passwords or session cookies?',
      ],
      showNavigation: false,
      ctaBehavior: 'inline-link',
    },
    appearanceConfig: {
      theme: 'light',
      width: '100%',
      position: 'bottom-right',
      radius: '4px',
      accentColor: '#171717',
      surfaceColor: '#FFFFFF',
      textColor: '#171717',
      mutedColor: '#6B6B67',
      borderColor: '#DEDDD8',
    },
    position: 'bottom-right',
    accentColor: '#171717',
    greetingText: 'Ask source-bound questions about OKEng Terms, Privacy, or Acceptable Use.',
    placeholderText: 'What does the privacy policy say about uploaded files?',
    allowedCollectionIds: ['COL-LEGAL'],
    createdAt: '2026-09-17T09:30:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
];

export const INITIAL_DOCUMENTS: KnowledgeDocument[] = [
  // ==========================================
  // COL-PUBLIC (01 - 04)
  // ==========================================
  {
    id: 'doc_pub_01',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'OKEng Product Overview',
    filename: 'product-overview.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.6 KB',
    nextStep: {
      label: 'Read Getting Started Docs',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-15T08:35:00Z',
    updatedAt: '2026-10-09T16:10:00Z',
    indexedAt: '2026-10-09T16:11:00Z',
    chunkCount: 4,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 187,
        title: 'Descripción General de OKEng',
        summary:
          'OKEng es un asistente de conocimiento integrable que responde preguntas de sus usuarios directamente desde su documentación Markdown (.md) y de texto (.txt), verificando permisos por colección antes de buscar y citando cada fuente.',
        steps: [
          'Centralice guías públicas, documentación de clientes y manuales internos en un solo espacio de trabajo.',
          'Organice sus archivos en colecciones con acceso para visitantes (everyone), clientes (members) o administradores (admins).',
          'Ofrezca respuestas directas con citas verificables al documento fuente y rechace temas no documentados sin inventar.',
        ],
        content:
          '# Descripción General de OKEng\n\n¿Qué es OKEng y cómo funciona OKEng? OKEng conecta sus archivos Markdown (.md) y colecciones con un asistente integrable que verifica permisos antes de buscar y cita cada documento fuente.',
        updatedAt: '2026-10-09T16:10:00Z',
      },
    },
    content: `# OKEng Product Overview

What is OKEng, what problem does it solve, and how does OKEng work? OKEng is an embeddable product knowledge assistant that turns your product documentation into accurate, source-cited answers for your users and team.

- **Stop scattering knowledge across tools**: Keep public help guides, customer documentation, and internal runbooks organized in a single workspace.
- **Eliminate guessed or fabricated answers**: Standard chatbots guess when a topic is missing; OKEng answers strictly from your approved collection documents, links to the exact source file, and declines unknown questions honestly.
- **Protect private docs automatically**: Visitors, signed-in customers, and internal staff only receive answers from the collection tiers they are allowed to read.

## What Can I Do with OKEng Today?
Which features and file types are supported in OKEng right now? Here is what you can build and manage with OKEng today:
- **Upload or write documentation**: Import Markdown (\`.md\`), plain-text (\`.txt\`), \`.json\`, or \`.csv\` files, or write articles directly in the built-in Markdown editor with live preview.
- **Publish a \`/docs\` hub & chat assistant**: Launch a searchable documentation portal or add the floating assistant (\`/widget.js\` or inline embed) to your website or app in English and Spanish.
- **Guide users with next-step actions**: Attach verified action links (such as \`/signup\` or setup guides) to any document so answers lead users straight to the right page.
- **Preview & test before launch**: Use the Workspace Test Console and Host Simulator to test how different user roles and page routes experience your assistant before going live.

## Core Principles
1. **Your app owns sign-in; OKEng handles document access.** Pass a signed HS256 role assertion when embedding the assistant to unlock \`members\` or \`admins\` collections alongside \`everyone\` docs.
2. **Permissions apply before search.** Restricted collections are filtered out before BM25 retrieval (\`EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections\`).
3. **Source-first answers.** Every answer cites the exact OKEng source documents used, and missing topics are never fabricated.
`,
  },
  {
    id: 'doc_pub_02',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Core Product Concepts',
    filename: 'product-concepts.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.4 KB',
    nextStep: {
      label: 'Explore Collections Guide',
      url: '/docs/collections',
    },
    createdAt: '2026-09-15T08:40:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 5,
    content: `# Core Product Concepts

What can I do with OKEng today, and what core capabilities and primitives does OKEng provide? OKEng is organized around five foundational primitives.

## 1. Workspaces
A Workspace is the top-level security and tenant boundary. Every collection, file, embed configuration, and conversation belongs to exactly one workspace.

## 2. Files & Markdown Documents
Knowledge enters OKEng through uploaded Markdown (\`.md\`) and plain-text (\`.txt\`) files (along with structured text \`.json\`/\`.csv\` files) or authored Markdown documents in the built-in editor. Files are parsed, split into heading-scoped sections, and indexed into chunks with line-range metadata.

## 3. Collections & Access Visibility
Collections group related documents and define the authorization boundary. Each collection is assigned one of three visibility tiers:
- \`everyone\`: Accessible to anonymous visitors and all authenticated users.
- \`members\`: Accessible only when the host application provides a verified \`member\` or \`admin\` identity assertion and the Embed binds the collection.
- \`admins\`: Accessible only when the host application provides a verified \`admin\` identity assertion and the Embed binds the collection.

## 4. Pre-Retrieval Authorization & Effective Scope
When a question arrives, OKEng resolves the caller's clearance first, intersects it with the Embed's bound collections, and queries only authorized chunks. Restricted documents never enter candidate chunks or model prompt context.

## 5. Embeds & Presentation Surfaces
An Embed binds a workspace and collection scope to a live inline assistant, an interactive documentation hub, a standalone floating widget script (\`/widget.js\`), or configurable slide-in panel, fullscreen, and contextual help surfaces in the Workspace Embed Studio and Host Simulator.
`,
  },
  {
    id: 'doc_pub_03',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Frequently Asked Questions (FAQ)',
    filename: 'faq.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.6 KB',
    nextStep: {
      label: 'View Embedding Protocol',
      url: '/docs/embedding',
    },
    createdAt: '2026-09-15T08:45:00Z',
    updatedAt: '2026-10-09T16:10:00Z',
    indexedAt: '2026-10-09T16:11:00Z',
    chunkCount: 5,
    content: `# Frequently Asked Questions

## What is OKEng, and what problem does it solve?
OKEng is an embeddable product knowledge assistant that turns your documentation into accurate, source-cited answers—solving the problem of scattered help docs and chatbots that guess or expose private internal content.
- **Centralize scattered documentation**: Keep public help guides, customer docs, and internal runbooks organized in one workspace.
- **Answers backed by real sources**: Every response retrieves strictly from your approved collection documents and links to the source file instead of guessing.
- **Built-in audience permissions**: Visitors, signed-in customers, and internal admins only receive answers from collections they are authorized to read.

## How does OKEng differ from a normal documentation site?
A normal documentation site is static and typically all-public or all-private. OKEng combines a clean documentation portal with an embeddable assistant that automatically filters which collections a user can search based on their role.

## Can I restrict documents to certain users?
Yes. Place restricted documents into a collection with visibility set to \`members\` or \`admins\`. When your backend signs a short-lived HS256 identity assertion for the current user, OKEng unlocks only the collections that match the user's role before searching.

## How does the file ingestion process work?
When you upload a Markdown or text file or save a document in the editor, OKEng validates the filename and content, splits the article by headings, and indexes it immediately for search and citations.

## What happens when the available documents do not answer a question?
When no authorized document meets the relevance threshold—or when the topic only exists in a restricted collection outside the caller's scope—OKEng never guesses or fabricates an answer. It states clearly that the information was not found in the available documentation.
`,
  },
  {
    id: 'doc_pub_04',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-PUBLIC',
    title: 'Security & Isolation Overview',
    filename: 'security-overview.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.9 KB',
    nextStep: {
      label: 'Read Access Control Docs',
      url: '/docs/access-control',
    },
    createdAt: '2026-09-15T08:50:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Security & Isolation Overview

OKEng enforces a defense-in-depth security model across both the private workspace console and embedded customer widgets.

## Dual Independent RBAC
Platform administration roles (\`PLATFORM_OWNER\`, \`PLATFORM_ADMIN\`) are completely isolated from customer workspace roles (\`WORKSPACE_OWNER\`, \`WORKSPACE_USER\`). Platform operators do not automatically receive access to customer workspaces.

## The "Nothing Shown" Rule & Missing Topic Fallback
What happens when the available documents do not answer a question, or when a topic is restricted? If an embedded user asks about a topic that is absent from the corpus or covered only in a restricted collection (\`members\` or \`admins\`) for which they lack clearance, OKEng never reveals that a restricted document exists. It responds: *"I couldn't find that information in the available documentation."*

## Universal Input Sanitization & URL Policy (\`FORM-SEC-01\`)
Every form, search field, Markdown frontmatter input, and \`next_step\` action CTA across public, authentication, workspace, and embedded surfaces blocks script injection (\`<script>\`, \`<iframe>\`, event handlers) and restricts URLs strictly to \`https:\`, \`http:\`, \`mailto:\`, relative \`/paths\`, and \`#anchors\`.
`,
  },

  // ==========================================
  // COL-DOCS (05 - 14 + 20)
  // ==========================================
  {
    id: 'doc_docs_05',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Getting Started with OKEng',
    filename: 'getting-started.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.4 KB',
    nextStep: {
      label: 'Create Workspace Account',
      url: '/signup',
    },
    createdAt: '2026-09-16T10:00:00Z',
    updatedAt: '2026-10-09T16:10:00Z',
    indexedAt: '2026-10-09T16:11:00Z',
    chunkCount: 3,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 187,
        title: 'Primeros Pasos con OKEng',
        summary:
          'Configure su espacio de trabajo OKEng, organice sus documentos en colecciones e integre el asistente en su sitio web o aplicación en cinco pasos.',
        steps: [
          'Cree una cuenta en /signup o inicie sesión en su Espacio de Trabajo OKEng.',
          'Cree una Colección y elija quién puede leerla (everyone, members o admins).',
          'Suba archivos Markdown (.md) o de texto (.txt) o redáctelos en el editor hasta que estén en estado Ready.',
          'Pruebe las respuestas y citas por rol en la Consola de Pruebas.',
          'Copie el código de instalación desde Embed Studio para agregar el asistente a su sitio.',
        ],
        content: '# Primeros Pasos con OKEng\n\nSiga estos 5 pasos para configurar su espacio y publicar su primer Embed.',
        updatedAt: '2026-10-09T16:10:00Z',
      },
    },
    content: `# Getting Started

What are the steps to get started with OKEng, and what is the fastest way to set up a workspace and launch an Embed? You can set up an OKEng workspace, organize your documentation into collections, and embed an assistant on your site in five simple steps:

## Fastest Way to Get Started (Step-by-Step)
1. **Create or open a Workspace**: Sign up at \`/signup\` or sign in at \`/login\` to open your OKEng workspace console.
2. **Create a Collection**: Choose who can read the collection (\`everyone\`, \`members\`, or \`admins\`).
3. **Upload or write your docs**: Upload \`.md\`, \`.txt\`, \`.json\`, or \`.csv\` files, or write articles in the built-in Markdown editor until their status is \`Ready\`.
4. **Test answers by role**: Use the Workspace Test Console to preview answers and source citations as a visitor, member, or admin.
5. **Embed on your website or app**: Copy the installation snippet or \`/widget.js\` loader from Embed Studio and add it to your site.
`,
  },
  {
    id: 'doc_docs_06',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Workspaces & Team Membership',
    filename: 'workspaces.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.4 KB',
    nextStep: {
      label: 'Sign In to Workspace',
      url: '/login',
    },
    createdAt: '2026-09-16T10:05:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    language: 'en',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    translations: {
      es: {
        language: 'es',
        status: 'AVAILABLE',
        sourceVersion: 185,
        title: 'Espacios de Trabajo y Miembros del Equipo',
        summary:
          'Los propietarios del espacio de trabajo pueden invitar miembros navegando a Settings & Auth > Workspace Members & Roles y haciendo clic en Invite Member.',
        steps: [
          'Abra Settings & Auth en su consola de OKEng.',
          'Seleccione Workspace Members & Roles.',
          'Haga clic en Invite Member y asigne el rol WORKSPACE_USER o WORKSPACE_OWNER.',
        ],
        content: '# Espacios de Trabajo y Miembros del Equipo',
        updatedAt: '2026-10-09T08:00:00Z',
      },
    },
    content: `# Workspaces & Team Membership

Every customer resource in OKEng belongs to a single Workspace.

## Inviting Team Members
Where do I invite team members? Workspace Owners can invite team members by navigating to **Settings & Auth > Workspace Members & Roles** and clicking **Invite Member**.

## Workspace Roles
- **Workspace Owner (\`WORKSPACE_OWNER\`)**: Holds all 14 explicit workspace permissions, including \`workspace.settings.manage\`, \`workspace.users.manage\`, secret rotation, and ownership transfer.
- **Workspace User (\`WORKSPACE_USER\`)**: Receives explicit permissions (\`workspace.read\`, \`collection.read\`, \`content.read\`, \`test.execute\`, and optional write permissions).

## 5-Link Workspace Enforcement
Every private workspace request verifies:
1. Valid authenticated session
2. Valid workspace existence
3. Active \`WorkspaceMembership\` in the requested workspace
4. Required explicit permission for the operation
5. Resource ownership (\`resource.workspace_id == request.workspace_id\`)
`,
  },
  {
    id: 'doc_docs_07',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Collections & Visibility Boundaries',
    filename: 'collections.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.4 KB',
    nextStep: {
      label: 'Read Access Control Guide',
      url: '/docs/access-control',
    },
    createdAt: '2026-09-16T10:10:00Z',
    updatedAt: '2026-10-09T16:10:00Z',
    indexedAt: '2026-10-09T16:11:00Z',
    chunkCount: 3,
    content: `# Collections & Visibility Boundaries

How do collections and visibility work in OKEng? Collections group your documents by audience and control who can access them before any search happens, while page context boosts the most relevant articles for the screen the user is viewing.

## Collection Visibility Tiers
How do collections, visibility tiers, and host context control what an Embed can retrieve? Each collection uses one of three visibility tiers so users only receive answers from documents they are authorized to read:
- **Everyone (\`everyone\`)**: Public documentation and FAQs open to all website visitors.
- **Members (\`members\`)**: Customer and product guides available only to signed-in users verified by your app.
- **Admins (\`admins\`)**: Internal runbooks and operational docs restricted strictly to administrative team members.
- **Page-aware relevance**: Passing the user's current page URL prioritizes documents relevant to that screen without ever bypassing collection permissions.

## Effective Scope: Role Authorization Intersected with Embed Binding
Access is governed by both the caller's verified identity role and the collections bound to the target Embed (\`EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections\`). Even a valid \`member\` or \`admin\` identity cannot query a collection that the target Embed does not bind.

## Immediate Policy Effect
Changing a collection's visibility (for example, from \`everyone\` to \`members\`) updates the authorization version and takes effect immediately on subsequent retrieval requests without requiring document re-indexing.
`,
  },
  {
    id: 'doc_docs_08',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Files & Document Management',
    filename: 'files.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.9 KB',
    nextStep: {
      label: 'Read Ingestion & Chunking Guide',
      url: '/docs/ingestion',
    },
    createdAt: '2026-09-16T10:15:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Files & Document Management

OKEng supports uploading Markdown (\`.md\`) and plain-text (\`.txt\`) documentation files (along with structured text \`.json\` and \`.csv\` files in the upload dropzone) as well as authoring Markdown directly in the workspace editor.

## Document Lifecycle States
- \`Uploading\`: File payload is being received and validated against path traversal and script injection.
- \`Processing\`: Text extraction and heading boundary analysis are running.
- \`Indexing\`: Heading-scoped chunks and line ranges are being committed to the workspace retrieval index.
- \`Ready\`: Document is active and eligible for authorized retrieval.
- \`Failed\`: Ingestion encountered a validation or parsing error; inspect and retry.

## Deletion & Derived Data Invalidation
When a file is deleted in OKEng, all derived chunks and index records are invalidated immediately and the workspace knowledge version increments so deleted content is never returned.
`,
  },
  {
    id: 'doc_docs_09',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Authoring Markdown Documents',
    filename: 'markdown.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.8 KB',
    nextStep: {
      label: 'Explore Retrieval & Citations',
      url: '/docs/retrieval',
    },
    createdAt: '2026-09-16T10:20:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Authoring Markdown Documents

OKEng includes a built-in Markdown editor with side-by-side preview, frontmatter metadata parsing, and optional Next-Step CTA links.

## Structuring Markdown for Optimal Retrieval & Citations
Use clear Markdown headings (\`#\`, \`##\`, \`###\`) to separate distinct topics. OKEng segments documents along heading boundaries and records exact line ranges (\`Line X-Y\`) so every answer includes verifiable source citations pointing back to the exact document and section.

## Next-Step Action Links
Each document can define a **Next-Step Action** (\`label\` and \`url\`). When an authorized chunk from that document supports an answer, OKEng surfaces a verified action button or link guiding the user to the relevant documentation page or application route.
`,
  },
  {
    id: 'doc_docs_10',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Ingestion & Chunking Pipeline',
    filename: 'ingestion.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.1 KB',
    nextStep: {
      label: 'Explore Retrieval & Citations',
      url: '/docs/retrieval',
    },
    createdAt: '2026-09-16T10:25:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Ingestion & Chunking Pipeline

How does OKEng ingest and index documentation? The OKEng ingestion pipeline transforms uploaded Markdown (\`.md\`) and text (\`.txt\`) files or editor-authored documents into workspace-scoped, collection-tagged chunks.

## Pipeline Stages
1. **Boundary & Security Validation**: Verifies workspace ownership (\`Document.workspace_id == Collection.workspace_id\`), validates safe filenames, and sanitizes unsafe script tags or executable URLs.
2. **Heading-Aware Segmentation**: Splits Markdown and text along structural headings (\`#\`, \`##\`, \`###\`) while extracting ordered steps, bullet lists, callout warnings, and fenced code blocks.
3. **Line-Range & Language Tagging**: Attaches \`documentId\`, \`collectionId\`, \`filename\`, \`lineRange\` (\`Line X-Y\`), and detected language (\`en\` or \`es\`) metadata to every section.
4. **Live Re-Indexing & Cache Epoch Bump**: Saving or updating a document re-runs chunking immediately and increments the workspace \`knowledgeVersion\` so cached answers refresh automatically.
`,
  },
  {
    id: 'doc_docs_11',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Retrieval, Context & Source Attribution',
    filename: 'retrieval.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.9 KB',
    nextStep: {
      label: 'Explore Collections Guide',
      url: '/docs/collections',
    },
    createdAt: '2026-09-16T10:30:00Z',
    updatedAt: '2026-10-09T16:00:00Z',
    indexedAt: '2026-10-09T16:01:00Z',
    chunkCount: 4,
    content: `# Retrieval, Context & Source Attribution

How does OKEng answer questions using my documentation, how do citations help me verify an answer, and how does host context influence retrieval? OKEng answers questions strictly from the documentation collections the current user is allowed to access, ranking relevant sections with BM25 and attaching clickable source citations to every response.

- **Section-level matching**: OKEng splits your Markdown files by heading into focused chunks so answers pull the exact section that addresses the user's question.
- **Clickable source citations**: Every answer lists the source document and collection used so readers can open the full article and verify the details.
- **No guessing on missing topics**: If a question is not covered in your available documentation, OKEng states clearly that the information was not found instead of making up an answer.

## Pre-Retrieval Filtering & Grounded Answer Pipeline
\`\`\`text
Verified Identity → Effective Collection Scope (Role ∩ Embed) → Score Authorized Chunks (BM25 + Field/Route Boost) → Compile Grounded Answer + Citations + Next Step
\`\`\`
When a question arrives, OKEng filters the corpus to documents in the caller's authorized collection scope, ranks sections using lexical BM25 and heading/intent boosts, and compiles a grounded response from the top-scoring sections.

## How Citations Help Verify Every Answer
Every answer generated by OKEng includes structured source citations (\`title\`, \`filename\`, \`collectionId\`, \`snippet\`, and line range). Citations allow readers and operators to verify exactly which authorized document and section produced the answer and click through to read the full source article.

## How Host Context Influences Retrieval
The host application can pass the user's active route (\`currentUrl\`, such as \`/docs/embedding\` or \`/docs/access-control\`) to the OKEng Embed. OKEng uses this host context and configured \`routeRules\` to boost route-relevant chunks and pinned documents **strictly within** the already-authorized collection scope. Host context improves relevance ranking but never grants access to unauthorized collections.

## Missing Topic Honesty ("Nothing Shown" Fallback)
What happens when the available documents do not answer a question? If no authorized document meets the relevance confidence threshold, OKEng refuses to guess or fabricate an answer and returns its conservative fallback: *"I couldn't find that information in the available documentation."*
`,
  },
  {
    id: 'doc_docs_12',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Access Control & Clearance Mapping',
    filename: 'access-control.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.8 KB',
    nextStep: {
      label: 'Read Embedding Protocol',
      url: '/docs/embedding',
    },
    createdAt: '2026-09-16T10:35:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 4,
    content: `# Access Control & Clearance Mapping

How does OKEng protect private knowledge, and how do I restrict a collection to employees or members? Create a collection in your workspace, set its visibility to \`members\` (or \`admins\` for management-only docs), bind it to your target Embed, and pass a short-lived HS256-signed identity assertion from your backend when initializing the widget.

## External Role Mapping
Your application maps its internal roles to OKEng's three clearance tiers:
- \`visitor\` / \`anonymous\` → \`everyone\` (accesses bound \`everyone\` collections)
- \`customer\` / \`employee\` / \`member\` / \`user\` → \`members\` (accesses bound \`everyone\` + \`members\` collections)
- \`manager\` / \`admin\` → \`admins\` (accesses bound \`everyone\` + \`members\` + \`admins\` collections)

## Effective Scope & Pre-Retrieval Enforcement
OKEng computes effective access as the intersection of the verified caller identity and the Embed's bound collections (\`EffectiveScope = EmbedBoundCollections ∩ RoleAuthorizedCollections\`). Unauthorized documents are excluded before chunk scoring and never enter candidate chunks, model prompt context, answers, or citations.

## Invalid Token & Unverified Role Rejection (Hard 401 Boundary)
If an embed request supplies an expired, tampered, or wrong-algorithm JWT—or asserts a privileged role (\`member\` / \`admin\`) without a valid signed token—OKEng halts with \`401 Unauthorized\` prior to retrieval and never silently downgrades the request to anonymous access.
`,
  },
  {
    id: 'doc_docs_13',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Embedding & Signed Host Identity',
    filename: 'embedding.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '5.1 KB',
    nextStep: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-16T10:40:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 4,
    content: `# Embedding & Signed Host Identity

How do Embeds work, and how can I integrate OKEng into my website or application? An OKEng Embed references one or more collections in your workspace and exposes a grounded assistant inside your website or application without duplicating your knowledge base. OKEng supports **Public-Only** (\`everyone\`), **Protected-Only** (\`members\` / \`admins\`), and **Mixed-Access** embeds.

## Public Embed Initialization
For public websites and documentation (\`visibility = everyone\`), no identity token is required. Anonymous visitors automatically query only the \`everyone\` collections bound to the Embed:
\`\`\`javascript
OKEng.init({
  workspace: "okeng",
  embedId: "EMB-PUBLIC-HOME",
  currentUrl: window.location.pathname
});
\`\`\`

## Authenticated & Mixed-Access Initialization
When an Embed binds \`members\` or \`admins\` collections alongside public collections, anonymous visitors query only the bound \`everyone\` collections. When a user signs into your application, your backend signs a short-lived (5-minute) HMAC-SHA256 (\`HS256\`) JWT assertion containing \`workspace_id\`, \`sub\`, \`role\` (\`member\` or \`admin\`), \`iat\`, and \`exp\`, unlocking the authorized bound collections before retrieval. Browser-supplied roles without a valid signature are rejected with \`401 UNVERIFIED_ROLE_ASSERTION\`.

## What Presentation Modes Are Available?
OKEng supports six configurable Embed presentation modes in the Workspace Embed Studio (\`/workspaces/okeng/embeds\`) and Host Simulator (\`/workspaces/okeng/embeds/preview\`):
- **Live Public & Production Surfaces**: \`inline\` (embedded directly inside page content such as the OKEng homepage) and \`documentation\` (3-column interactive documentation hub with navigation, article viewer, and assistant on \`/docs\`).
- **Standalone Drop-In Script (\`/widget.js\`)**: Floating launcher and chat drawer for external host pages (connects to \`/api/chat\` for lightweight host integration).
- **Configurable Workspace & Host Simulator Modes**: \`widget\` (floating chat launcher), \`panel\` (slide-in drawer defaulting to \`--okeng-chat-width: 360px\`), \`fullscreen\` (full-viewport portal chat), \`inline\`, \`documentation\`, and \`contextual\` (route-aware sidebar).
`,
  },
  {
    id: 'doc_docs_14',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Troubleshooting & Diagnostics',
    filename: 'troubleshooting.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.8 KB',
    nextStep: {
      label: 'Read Getting Started Guide',
      url: '/docs/getting-started',
    },
    createdAt: '2026-09-16T10:45:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Troubleshooting & Diagnostics

Resolve common ingestion, token verification, and retrieval issues.

## 1. Widget Returns 401 TOKEN_EXPIRED or INVALID_TOKEN_SIGNATURE
Embedded identity assertions are short-lived (recommended 5 minutes, with a 30-second clock-skew tolerance) and must be signed with your workspace's server-side \`HS256\` signing secret. Ensure your host backend mints a fresh assertion when the user session loads or refreshes.

## 2. Expected Document Not Returned in Chat
Open the **Workspace Test Console** (\`/workspaces/okeng/test\`) and inspect the **Access** and **Retrieval** tabs:
- Verify the document status is \`Ready\`.
- Confirm the document's collection is bound to the target Embed.
- Check whether the collection was excluded because its visibility tier (\`members\` or \`admins\`) exceeds the caller's verified identity role.
`,
  },

  // ==========================================
  // COL-LEGAL (15 - 17)
  // ==========================================
  {
    id: 'doc_legal_15',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Terms of Service',
    filename: 'terms.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.9 KB',
    createdAt: '2026-09-17T09:00:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
    indexedAt: '2026-10-03T08:01:00Z',
    chunkCount: 4,
    content: `# Terms of Service

*Last updated: 2026-10-03*

## 1. Introduction
These Terms of Service govern your access to and use of the OKEng platform, workspaces, documentation interfaces, and embedded knowledge assistants.

## 2. Accounts & Workspace Ownership
Each customer workspace has a designated Workspace Owner. You are responsible for maintaining the confidentiality of your workspace signing secrets and managing member permissions accurately.

## 3. Service & Customer Data
You retain all ownership and intellectual property rights to the files and Markdown documents uploaded to your OKEng workspace. OKEng processes and indexes your documents solely to provide authorized retrieval and grounded answers for your workspace.

## 4. Acceptable Use
You may not use OKEng to store unlawful material, attempt cross-tenant workspace enumeration, or forge cryptographic identity assertions.
`,
  },
  {
    id: 'doc_legal_16',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Privacy Policy',
    filename: 'privacy.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.1 KB',
    createdAt: '2026-09-17T09:10:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
    indexedAt: '2026-10-03T08:01:00Z',
    chunkCount: 4,
    content: `# Privacy Policy

*Last updated: 2026-10-03*

## 1. Uploaded Files & Workspace Corpus
What does the privacy policy say about uploaded files? Uploaded files and authored Markdown documents are stored strictly within your isolated workspace boundary. Private collections (\`members\` and \`admins\`) are never exposed to public embeds or shared across workspaces. When you delete a file, its text, chunks, and index entries are invalidated immediately.

## 2. Customer End-User Identity
OKEng does not collect or store your customers' passwords, session cookies, or OAuth refresh tokens. For authenticated embeds, OKEng receives only a short-lived signed identity assertion (\`user_id\`, \`role\`, \`workspace_id\`) required to evaluate collection access before retrieval.

## 3. Security Audit Logs
OKEng records append-only security audit events for administrative actions (membership changes, permission updates, secret rotation). Audit logs never contain raw signing secrets, passwords, or private document contents.
`,
  },
  {
    id: 'doc_legal_17',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-LEGAL',
    title: 'Acceptable Use Policy',
    filename: 'acceptable-use.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.2 KB',
    createdAt: '2026-09-17T09:20:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
    indexedAt: '2026-10-03T08:01:00Z',
    chunkCount: 3,
    content: `# Acceptable Use Policy

*Last updated: 2026-10-03*

## 1. Prohibited Content
Workspaces may not upload or distribute malware, stolen credentials, or content that violates applicable law.

## 2. Security & Boundary Integrity
Users and host integrations must not:
- Attempt to bypass the 5-link workspace authorization chain;
- Expose workspace HMAC signing secrets in client-side browser code;
- Replay expired identity assertions or tamper with JWT signatures.
`,
  },

  // ==========================================
  // COL-INTERNAL (18 - 19 — Restricted Admins Only)
  // ==========================================
  {
    id: 'doc_internal_18',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Internal Operations & Production Vault Runbook',
    filename: 'internal-operations.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.5 KB',
    nextStep: {
      label: 'Open Security Settings',
      url: '/settings',
    },
    createdAt: '2026-09-18T11:20:00Z',
    updatedAt: '2026-10-03T08:00:00Z',
    indexedAt: '2026-10-03T08:01:00Z',
    chunkCount: 3,
    content: `# Internal Operations & Production Vault Runbook

*Visibility: Admins Only (COL-INTERNAL).* This document contains restricted internal operating procedures for OKEng infrastructure administrators.

## 1. Production Key & Vault Rotation
Internal corporate SSO and production KMS keys are rotated every 30 days using hardware security modules (HSM) and dual-operator approval (\`requested_by != approved_by\`).

## 2. Emergency Customer Support Access
Platform Admins have zero default access to customer workspaces. Exceptional read access requires a time-bounded \`AdminGrant\` approved by the Platform Owner and logged in the immutable audit trail.
`,
  },
  {
    id: 'doc_internal_19',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'ENG-DOD-001 — Engineering Definition of Done & Audit Specification',
    filename: 'eng-dod-001.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '8.4 KB',
    nextStep: {
      label: 'Open Security & Audit Console',
      url: '/settings',
    },
    createdAt: '2026-10-03T09:00:00Z',
    updatedAt: '2026-10-03T09:20:00Z',
    indexedAt: '2026-10-03T09:20:00Z',
    chunkCount: 6,
    language: 'en',
    content: `# ENG-DOD-001 — Engineering Definition of Done & Implementation Audit Specification

*Visibility: Internal — OKEng Workspace Only (COL-INTERNAL).*

## 1. Governing Principle
A feature is Done only when Specification → Architecture → Implementation → Tests → Security → Documentation → Runtime verification are all consistent.

## 2. P0 Blocking Invariants
- **DATA-002 (Multi-Tenant Isolation)**: Workspace A users can never access Workspace B resources.
- **SECURITY-001 (Authorization Before Retrieval)**: Unauthorized collections and chunks are excluded before retrieval and never reach prompt context or citations.
- **SECURITY-002 & 003 (Input Validation & XSS Safety)**: All inputs, Markdown, and CTA URLs are validated and sanitized; \`<script>\`, event handlers, and \`javascript:\` URLs are rejected.
- **SECURITY-004 & 005 (Secrets & Embedded Identity)**: Signing secrets stay server-side; embedded identity assertions are short-lived and HMAC-verified.
- **STORAGE-001 (File Safety)**: Path traversal (\`../\`) and unsupported extensions are blocked at the ingestion boundary.
`,
  },
  // ==========================================
  // I18N-001 Native Spanish Document (Case A & Prefer-ES Matrix)
  // ==========================================
  {
    id: 'doc_docs_es_20',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-DOCS',
    title: 'Facturación y Planes de Suscripción',
    filename: 'facturacion-y-planes.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.4 KB',
    language: 'es',
    languageConfidence: 0.99,
    languageDetectionMethod: 'automatic',
    nextStep: {
      label: 'Ver Guía de Facturación',
      url: '/docs/facturacion-y-planes',
    },
    createdAt: '2026-10-03T09:30:00Z',
    updatedAt: '2026-10-09T08:00:00Z',
    indexedAt: '2026-10-09T08:01:00Z',
    chunkCount: 3,
    content: `# Facturación y Planes de Suscripción

Gestione las facturas, métodos de pago y límites de uso de su espacio de trabajo en OKEng desde la sección de Facturación y Configuración.

## Cómo descargar facturas mensuales
1. Abra **Settings** (\`/settings\`) en el panel de su espacio de trabajo.
2. Seleccione la sección de facturación y comprobantes mensuales.
3. Elija el período mensual y descargue el comprobante en PDF.
`,
  },

  // ==========================================
  // COL-CUSTOMER (21 - 23 — Authenticated Members & Admins)
  // ==========================================
  {
    id: 'doc_cust_21',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Customer Authentication & Signed Identity Assertions',
    filename: 'customer-authentication.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.6 KB',
    nextStep: {
      label: 'Read Embedding Guide',
      url: '/docs/embedding',
    },
    createdAt: '2026-10-06T08:00:00Z',
    updatedAt: '2026-10-06T08:00:00Z',
    indexedAt: '2026-10-06T08:01:00Z',
    chunkCount: 3,
    content: `# Customer Authentication & Signed Identity Assertions

*Visibility: Members & Admins (COL-CUSTOMER).* How do I configure customer authentication and host context? When embedding OKEng inside an authenticated customer portal, your backend mints a short-lived HMAC-SHA256 identity token so authenticated customers can query \`members\` collections alongside public documentation.

## 1. Minting the Host Identity Assertion
1. Authenticate the user in your host application session.
2. Sign an \`HS256\` JWT on your server using your workspace \`signingSecret\` with claims \`workspace_id\`, \`sub\` (user ID), \`role: "member"\` (or \`"admin"\`), \`iat\`, and \`exp\` (5-minute TTL).
3. Pass the signed \`token\` and \`currentUrl\` to \`OKEng.init({ embedId, token, currentUrl })\`.

## 2. Progressive Identity Upgrade
When a visitor transitions from anonymous browsing to signed-in \`member\` status, OKEng upgrades the session identity and expands \`EffectiveScope\` to include \`Customer Docs\` (\`COL-CUSTOMER\`) without leaking \`Admin Docs\` (\`COL-INTERNAL\`).
`,
  },
  {
    id: 'doc_cust_22',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Host Context & Route-Aware Customer Integration',
    filename: 'host-context-integration.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.1 KB',
    nextStep: {
      label: 'Explore Retrieval Guide',
      url: '/docs/retrieval',
    },
    createdAt: '2026-10-06T08:05:00Z',
    updatedAt: '2026-10-06T08:05:00Z',
    indexedAt: '2026-10-06T08:06:00Z',
    chunkCount: 3,
    content: `# Host Context & Route-Aware Customer Integration

*Visibility: Members & Admins (COL-CUSTOMER).* Customer integrations can supply the active application route (\`current_url\`) so OKEng prioritizes documentation relevant to the screen the customer is viewing.

## Route Rules & Pinned Documents
Configure route rules on your Embed (for example, matching \`/docs/embedding\` or \`/billing/invoices\`) to pin high-priority documents and surface contextual suggested questions. Route context boosts ranking strictly within the collections already authorized by the user's verified identity.
`,
  },
  {
    id: 'doc_cust_23',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-CUSTOMER',
    title: 'Customer Production Rollout & Allowed Origins',
    filename: 'customer-integration.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '3.9 KB',
    nextStep: {
      label: 'Read Access Control Docs',
      url: '/docs/access-control',
    },
    createdAt: '2026-10-06T08:10:00Z',
    updatedAt: '2026-10-06T08:10:00Z',
    indexedAt: '2026-10-06T08:11:00Z',
    chunkCount: 2,
    content: `# Customer Production Rollout & Allowed Origins

*Visibility: Members & Admins (COL-CUSTOMER).* Before launching an OKEng Embed in production:
1. Verify collection visibilities (\`everyone\` vs \`members\` vs \`admins\`) in the Collections directory.
2. Confirm your backend never exposes \`signingSecret\` in client-side JavaScript bundles.
3. Run the 4 verification scenarios in the OKEng Test Console to confirm pre-retrieval boundary enforcement.
`,
  },

  // ==========================================
  // COL-INTERNAL (24 - 25 — Additional Admin Architecture Docs)
  // ==========================================
  {
    id: 'doc_internal_24',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Pre-Retrieval Authorization & EffectiveScope Architecture',
    filename: 'authorization-architecture.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.9 KB',
    nextStep: {
      label: 'Verify in Test Console',
      url: '/workspaces/okeng/test',
    },
    createdAt: '2026-10-06T08:15:00Z',
    updatedAt: '2026-10-06T08:15:00Z',
    indexedAt: '2026-10-06T08:16:00Z',
    chunkCount: 3,
    content: `# Pre-Retrieval Authorization & EffectiveScope Architecture

*Visibility: Admins Only (COL-INTERNAL).* How does the pre-retrieval authorization and cache pipeline work? OKEng computes \`EffectiveScope = TargetScope ∩ IdentityAuthorizedCollections\` on the server before any chunk enters BM25 scoring or answer compilation.

## 1. Hard 401 Invalid Token Boundary
If a request includes a malformed, expired, or forged identity token (\`INVALID_TOKEN_SIGNATURE\`), OKEng halts immediately with \`401 Unauthorized\`, executes zero retrieval, and never falls back to anonymous access.

## 2. Cache Partition Isolation
Every retrieval and answer cache entry in \`CACHE-001\` is partitioned by \`workspaceId\`, \`effectiveClearance\`, \`allowedCollectionIdsHash\`, \`knowledgeVersion\` (\`kv\`), \`authorizationVersion\` (\`av\`), \`answerMode\`, and \`responseLanguage\`.
`,
  },
  {
    id: 'doc_internal_25',
    workspaceId: INITIAL_WORKSPACE.id,
    collectionId: 'COL-INTERNAL',
    title: 'Retrieval Pipeline, Answer Planner & Test Console Verification',
    filename: 'retrieval-pipeline-internals.md',
    type: 'markdown',
    status: 'ready',
    fileSize: '4.4 KB',
    nextStep: {
      label: 'Open Test Console',
      url: '/workspaces/okeng/test',
    },
    createdAt: '2026-10-06T08:20:00Z',
    updatedAt: '2026-10-06T08:20:00Z',
    indexedAt: '2026-10-06T08:21:00Z',
    chunkCount: 3,
    content: `# Retrieval Pipeline, Answer Planner & Test Console Verification

*Visibility: Admins Only (COL-INTERNAL).* Administrators use the OKEng Test Console (\`/workspaces/okeng/test\`) to inspect the five-stage execution pipeline (\`Context → Authorization → Retrieval → Answer Plan → Cache\`) across \`[ Access ]\`, \`[ Retrieval ]\`, and \`[ Cache ]\` tabs.
`,
  },
];

