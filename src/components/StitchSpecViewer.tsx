import React, { useState } from 'react';
import {
  Copy,
  Check,
  Layers,
  Palette,
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Card, Box, Text, Button, Badge } from './ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// UI-01 §2.2: Stitch Design Specification Viewer (CO-STITCH-SPEC)
// Synchronized with the Normative Page Archetype Taxonomy (PA-*) & Surfaces (SU-*)
// ============================================================================

export const StitchSpecViewer: React.FC = () => {
  const { t } = useI18n();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const FULL_STITCH_PROMPT = `STITCH PROMPT SPECIFICATION: OKENG (QUIET TECHNICAL / EDITORIAL UTILITY)

[PROJECT]
Name: OKEng (Embedded Product Knowledge Layer)
Category: Developer Console & Technical Documentation Layer
Target Aesthetic: "Design it like a beautifully crafted developer utility from a small, opinionated software company—not like an AI startup landing page or a modern SaaS template."
Architectural North Star: "Standardize behavioral contracts and interaction language, not visual templates. A new page should compose an existing PA-* archetype; it should not invent a new page grammar."

[CANONICAL ARCHETYPE TAXONOMY & SIDEBAR POSTURE (DS-SIDEBAR-POSTURE-001)]
- Sidebar Posture (sidebarPosture: 'expanded' 240px | 'collapsed' 56px rail): Persistent shell preference controlled exclusively by the user's explicit toggle (DS-SHELL-TRIGGER). Route changes and Back navigation NEVER mutate sidebarPosture.
- Top-Level Workspace Archetypes (navigationContext: 'workspace' -> CO-PAGE-HEADER + 32px axis):
  1. PA-DIRECTORY (Collections, Embeds List)
  2. PA-DATA-DIRECTORY (Files)
  3. PA-CONSOLE (Test Console — viewport-bounded split execution + diagnostics)
  4. PA-INSPECTOR (Conversations — viewport-bounded master stream + detail inspector)
  5. PA-SYSTEM-CONFIGURATION (Settings — persistent PR-TABS navigation + normal page scroll)
- Persistent Child-Resource Archetypes (navigationContext: 'resource' -> CO-CHILD-NAVBAR + 24px axis):
  1. PA-RESOURCE-DETAIL (Collection Detail)
  2. PA-EDITOR (File Editor — viewport-bounded synchronized Editor | Preview)
  3. PA-RESOURCE-CONFIGURATION (Embed Detail — CO-CHILD-NAVBAR + PR-TABS configuration sections)

[ANTI-PATTERNS & BANNED ELEMENTS]
- Strictly NO neon or electric purple/blue gradients
- Strictly NO glassmorphism, blur backdrops, or floating translucent panels
- Strictly NO glowing aura effects, neon borders, or cyber glows
- Strictly NO AI sparkle stars, wand icons, or robot illustrations
- Strictly NO card-in-card nesting or floating elevated stat boxes
- Strictly NO static pill tags for metadata (render metadata as plain text with " · ")
- Strictly NO low-opacity watermark typography behind page content

[DESIGN TOKENS]
- Canvas Background: var(--bg-canvas) / #F8F7F4 (Warm paper canvas)
- Card / Panel Surface: var(--bg-surface) / #FFFFFF (Crisp white surface)
- Primary Text: var(--text-primary) / #171717 (Deep ink)
- Secondary / Muted Text: var(--text-secondary) / #6B6B67 (Warm charcoal)
- Hairline Border: 1px solid var(--border-default) / #DEDDD8 (Quiet divider)
- Interactive Accent: var(--accent-primary) / #1D4ED8 (Deep cobalt)
- Accent Subtle Hover: var(--accent-subtle) / #EFF6FF (Cobalt tint)
- Status Positive: var(--color-success) / #15803D (Forest green)
- Status Pending: var(--color-warning) / #B45309 (Warm amber)
- Status Danger: var(--color-danger) / #B91C1C (Crimson)
- Radii: 4px for buttons, inputs, table rows; 6px for dialogs; no pill rounded-full buttons.`;

  const SCREEN_PROMPTS = [
    {
      id: 'screen-collections',
      title: 'Screen 1: Collections Directory (PA-DIRECTORY / SU-COLLECTION-DIRECTORY)',
      prompt: `Design a minimalist developer directory on a warm paper canvas. The left CO-SIDEBAR (240px expanded or 56px collapsed rail per user preference) displays the OKEng logo, active workspace, and navigation links. The main view renders CO-PAGE-HEADER ('Knowledge Collections', '+ New Collection' button) on a 32px axis, a canonical PR-FILTER-BAR (search input + segmented visibility tabs [All | Public | Members | Admins]), a fluid 3-column grid of clickable CO-COLLECTION-CARD items, and a 420px right-hand PR-DRAWER-MD creation drawer with an explicit workspace/clearance scope banner.`,
    },
    {
      id: 'screen-files',
      title: 'Screen 2: Global Files Data Directory (PA-DATA-DIRECTORY / SU-FILE-DIRECTORY)',
      prompt: `Design a high-density operational file directory on a 32px workspace axis. Top header has '[Upload File]' and '[+ Create Markdown]'. Below is a unified PR-FILTER-BAR owning search, collection filter, and status filter (All | Ready | Processing | Failed) attached to a fluid full-width file table. Clicking '[Upload File]' opens CO-UPLOAD-DRAWER (PR-DRAWER-MD) requiring explicit Target Collection selection before file drop.`,
    },
    {
      id: 'screen-embeds',
      title: 'Screen 3: Embeds Directory, Resource Configuration & Dedicated Installation (PA-DIRECTORY & PA-RESOURCE-CONFIGURATION)',
      prompt: `Design a three-stage Embeds management flow preserving the user's chosen sidebar posture across transitions. Stage 1 (PA-DIRECTORY, 32px axis) shows CO-PAGE-HEADER, PR-FILTER-BAR, and clickable CO-EMBED-CARD rows with isolated action buttons. Clicking an embed enters Stage 2 (PA-RESOURCE-CONFIGURATION, 24px axis): CO-CHILD-NAVBAR renders '<- Embeds | Embeds > Product Docs Assistant', and PR-TABS switches between '1. Mode & Knowledge Scope', '2. Context & Behavior', and '3. Installation' (a compact launcher). Clicking '[Installation Guide]' opens Stage 3 (/workspaces/:slug/embeds/:embedId/installation, SU-EMBED-INSTALLATION): a centered, single-column APP-05 installation recipe with an immediate verdict, browser environment selector [React | Vue | JavaScript], numbered SERVER/BROWSER code steps, single-action verification, and a collapsed Developer tools footer.`,
    },
    {
      id: 'screen-editor',
      title: 'Screen 4: Markdown Editor with Live Preview (PA-EDITOR / SU-FILE-EDITOR)',
      prompt: `Design a viewport-bounded split-pane technical document editor on a 24px resource axis. Surface 1 (CO-CHILD-NAVBAR) shows '<- Back | Breadcrumb' on the left and AccessBadge ('PUBLIC') + solid green 'Ready' badge on the right. Surface 2 shows 'Document Title [Edit]' + metadata on the left and inline '[Next step ... Edit]' + '[Save & Index]' on the right. Below are synchronized 40px Editor | Preview pane headers.`,
    },
    {
      id: 'screen-test-console',
      title: 'Screen 5: Test Console & Permission Sandbox (PA-CONSOLE / SU-TEST-CONSOLE)',
      prompt: `Design a viewport-bounded dual-pane verification console. CO-PAGE-HEADER includes '[Bump Knowledge Version]'. The simulation parameter bar features simulated clearance [Public | Members | Admins], Compiler mode [Deterministic | Extractive | Generative], Answer Language [Auto | EN | ES], and Simulated Route (without mutating global operator session state). Left pane scrolls the compiled answer, CO-NEXT-STEP, CO-SOURCE-LIST, and CO-FEEDBACK; right pane scrolls L1/L2 cache telemetry and pre-retrieval access filtering.`,
    },
    {
      id: 'screen-conversations',
      title: 'Screen 6: Conversations Inspector (PA-INSPECTOR / SU-CONVERSATION-INSPECTOR)',
      prompt: `Design a viewport-bounded master/detail conversation audit inspector. The left master stream has a compact search input and segmented feedback filter [All | Helpful | Unhelpful] above an independently scrolling inquiry list. The right detail inspector scrolls the grounded answer, next-step CTA, and actionable CO-SOURCE-LIST cards with '[Edit]' links that open the cited file directly in the File Editor.`,
    },
    {
      id: 'screen-settings',
      title: 'Screen 7: Workspace Settings & Security (PA-SYSTEM-CONFIGURATION / SU-WORKSPACE-SETTINGS)',
      prompt: `Design a workspace configuration screen with normal page scrolling, CO-PAGE-HEADER ('[Export Full Workspace Backup (JSON)]'), and persistent PR-TABS configuration navigation: [General] [Members & RBAC] [Credentials & Keys] [Audit Log]. General includes Workspace Name, Slug, and Default Workspace Language (EN/ES). Members & RBAC renders the members table, CO-RBAC-MATRIX (Dual RBAC & Retrieval Clearance Matrix), and 340px PR-DRAWER-SM slide-in drawers for Invite Member and Transfer Ownership.`,
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <PageHeader
        title="Ready-to-Use Google Stitch Assets (`DS-*` → `PR-*` → `CO-*` → `SU-*` → `PA-*`)"
        description="Copy the complete system prompt or modular archetype specifications directly into Google Stitch (stitch.withgoogle.com) to generate matching visual components and behavioral surfaces."
        metadata={
          <Badge tone="accent" mono uppercase>
            <Layers className="w-3.5 h-3.5" />
            <span>Google Stitch Prompt &amp; Normative Archetype Specification</span>
          </Badge>
        }
        actions={
          <Button
            variant="primary"
            onClick={() => copyToClipboard(FULL_STITCH_PROMPT, 'full-prompt')}
          >
            {copiedSection === 'full-prompt' ? (
              <>
                <Check className="w-4 h-4 text-success" />
                <span>{t('common.copied', 'Copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t('common.copy', 'Copy')} Full Sheet</span>
              </>
            )}
          </Button>
        }
      />

      <div className="p-8 w-full space-y-8 select-text">

      {/* Visual Token Palette */}
      <Card variant="surface" padding="md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-ink" />
            <Text variant="h2" tone="primary">
              Design System Tokens (`DS-*`)
            </Text>
          </div>
          <Text variant="mono" tone="secondary">
            Quiet Technical Edition
          </Text>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Box surface="canvas" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-canvas border border-line mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Canvas Paper
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --bg-canvas
            </Text>
          </Box>
          <Box surface="surface" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-surface border border-line mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Surface Panel
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --bg-surface
            </Text>
          </Box>
          <Box surface="surface" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-ink mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Ink Text
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --text-primary
            </Text>
          </Box>
          <Box surface="surface" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-line mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Hairline Border
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --border-default
            </Text>
          </Box>
          <Box surface="surface" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-accent mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Cobalt Accent
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --accent-primary
            </Text>
          </Box>
          <Box surface="surface" padding="xs" radius="sm">
            <div className="w-full h-8 rounded-xs bg-success mb-2" />
            <Text variant="mono" tone="primary" className="block font-medium">
              Ready Forest
            </Text>
            <Text variant="mono" tone="secondary" className="block">
              --color-success
            </Text>
          </Box>
        </div>
      </Card>

      {/* Screen-by-Screen Prompts */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Text variant="mono-label" tone="primary">
            Modular Archetype Screen Prompts for Stitch
          </Text>
        </div>

        <div className="space-y-3">
          {SCREEN_PROMPTS.map((screen) => (
            <Card key={screen.id} variant="surface" padding="sm" className="space-y-3">
              <div className="flex items-center justify-between">
                <Text variant="h3" tone="primary" className="font-mono">
                  {screen.title}
                </Text>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyToClipboard(screen.prompt, screen.id)}
                >
                  {copiedSection === screen.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-success" />
                      <span>{t('common.copied', 'Copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{t('common.copy', 'Copy')}</span>
                    </>
                  )}
                </Button>
              </div>

              <Box surface="elevated" padding="sm" radius="sm" className="font-mono text-xs text-ink leading-relaxed">
                {screen.prompt}
              </Box>
            </Card>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
};
