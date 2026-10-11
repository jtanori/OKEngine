import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { store } from '../services/store';
import { EmbedInstance, Workspace } from '../types';
import { ChildContextNavbar } from '../components/ChildContextNavbar';
import { useAppShell } from '../components/AppShell';
import {
  evaluateEmbedReadiness,
  evaluateEmbedInstallationContract,
  EmbedInstallationContract,
  EmbedStatusBadge,
} from '../components/EmbedCard';
import {
  computeEmbedVerificationProof,
  clearanceLabelToEmbedIdentity,
} from '../services/embedAuthorization';
import {
  Card,
  Box,
  Text,
  Button,
  Badge,
  SegmentedTabs,
  CodeBlock,
  Select,
} from '../components/ui';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// APP-05 — Dedicated Embed Installation Surface (SU-EMBED-INSTALLATION)
// Route: /workspaces/:workspaceSlug/embeds/:embedId/installation
// Alias: /app/embed/:embedId/installation
// Core Principle: "Because OKEng knows the Embed configuration, it should show
// less—not more. Choose your environment → copy the steps → verify → done."
// ============================================================================

export type BrowserEnvironment = 'react' | 'vue' | 'javascript';

export type VerificationScenario =
  | 'verified'
  | 'missing_embed'
  | 'signing_failure'
  | 'context_failure'
  | 'unauthorized';

export interface EmbedInstallationSnippets {
  installPackageReact: string;
  installPackageVue: string;
  reactComponentSnippet: string;
  vueComponentSnippet: string;
  javascriptSnippet: string;
  serverMinimalSnippet: string;
  serverFullExampleSnippet: string;
}

export function buildEmbedInstallationSnippets(
  embed: EmbedInstance,
  workspace: Workspace,
  contract: EmbedInstallationContract
): EmbedInstallationSnippets {
  const mode = contract.mode;
  const routeRules = embed.contextConfig?.routeRules || [];
  const needsMountElement =
    mode === 'inline' || mode === 'documentation' || mode === 'fullscreen';

  // Context configuration lines (only included when configured)
  const reactContextProp = contract.expectsCurrentUrl
    ? `\n      context={{\n        url: window.location.pathname,${
        contract.expectsRouteRules ? `\n        route: window.location.pathname,` : ''
      }\n      }}`
    : '';

  const vueContextProp = contract.expectsCurrentUrl
    ? `\n    :context="{ url: window.location.pathname${
        contract.expectsRouteRules ? ', route: window.location.pathname' : ''
      } }"`
    : '';

  // 1. React Component Snippet (BROWSER)
  const reactComponentSnippet =
    contract.signingState === 'required'
      ? `import React, { useEffect, useState } from 'react';
import { OKEng } from '@okeng/react';

export function KnowledgeEmbed() {
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/okeng/embed-token', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUserToken(data.assertion));
  }, []);

  if (!userToken) return null;

  return (
    <OKEng
      embed="${embed.id}"
      workspace="${workspace.id}"
      mode="${mode}"
      userToken={userToken}${reactContextProp}
    />
  );
}`
      : contract.signingState === 'optional'
      ? `import React from 'react';
import { OKEng } from '@okeng/react';

export function KnowledgeEmbed({ userToken }: { userToken?: string }) {
  return (
    <OKEng
      embed="${embed.id}"
      workspace="${workspace.id}"
      mode="${mode}"
      userToken={userToken}${reactContextProp}
    />
  );
}`
      : `import React from 'react';
import { OKEng } from '@okeng/react';

export function KnowledgeEmbed() {
  return (
    <OKEng
      embed="${embed.id}"
      workspace="${workspace.id}"
      mode="${mode}"${reactContextProp}
    />
  );
}`;

  // 2. Vue Component Snippet (BROWSER)
  const vueComponentSnippet =
    contract.signingState === 'required'
      ? `<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { OKEng } from '@okeng/vue';

const userToken = ref<string | null>(null);

onMounted(async () => {
  const res = await fetch('/api/okeng/embed-token', { credentials: 'include' });
  const data = await res.json();
  userToken.value = data.assertion;
});
</script>

<template>
  <OKEng
    v-if="userToken"
    embed="${embed.id}"
    workspace="${workspace.id}"
    mode="${mode}"
    :user-token="userToken"${vueContextProp}
  />
</template>`
      : contract.signingState === 'optional'
      ? `<script setup lang="ts">
import { OKEng } from '@okeng/vue';

defineProps<{ userToken?: string }>();
</script>

<template>
  <OKEng
    embed="${embed.id}"
    workspace="${workspace.id}"
    mode="${mode}"
    :user-token="userToken"${vueContextProp}
  />
</template>`
      : `<script setup lang="ts">
import { OKEng } from '@okeng/vue';
</script>

<template>
  <OKEng
    embed="${embed.id}"
    workspace="${workspace.id}"
    mode="${mode}"${vueContextProp}
  />
</template>`;

  // 3. Vanilla JavaScript Snippet (BROWSER)
  const containerLine = needsMountElement
    ? `<div id="okeng-embed-root" data-okeng-embed="${embed.id}"></div>\n`
    : '';

  const jsIdentityFetch =
    contract.signingState === 'required'
      ? `  const tokenRes = await fetch('/api/okeng/embed-token', { credentials: 'include' });
  const { assertion } = await tokenRes.json();\n\n`
      : '';

  const jsContextLine = contract.expectsCurrentUrl
    ? `\n    context: {\n      url: window.location.pathname,${
        contract.expectsRouteRules && routeRules.length > 0
          ? `\n      routeRules: ${JSON.stringify(
              routeRules.map((r) => ({
                routePattern: r.routePattern,
                promptTitle: r.promptTitle,
              }))
            )},`
          : ''
      }\n    },`
    : '';

  const jsTokenLine =
    contract.signingState === 'required'
      ? `\n    userToken: assertion,`
      : '';

  const javascriptSnippet = `${containerLine}<script src="https://cdn.okeng.io/v1/embed.js" async></script>
<script>
window.addEventListener('DOMContentLoaded', async function () {
${jsIdentityFetch}  window.OKEng?.init({
    workspace: "${workspace.id}",
    embed: "${embed.id}",
    mode: "${mode}",${needsMountElement ? `\n    mountSelector: "#okeng-embed-root",` : ''}${jsTokenLine}${jsContextLine}
  });
});
</script>`;

  // 4. Server Endpoint Snippets (SERVER — Canonical HS256 JWT with server-side secret)
  const serverMinimalSnippet = `// GET /api/okeng/embed-token
import crypto from 'node:crypto';

export function createUserAssertion(user: {
  id: string;
  role: 'member' | 'admin';
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      role: user.role,
      workspace_id: "${workspace.id}",
      embed_id: "${embed.id}",
      iat: now,
      exp: now + 300,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', process.env.OKENG_SIGNING_SECRET!)
    .update(\`\${header}.\${payload}\`)
    .digest('base64url');

  return \`\${header}.\${payload}.\${signature}\`;
}`;

  const serverFullExampleSnippet = `# 1. Server environment (.env)
OKENG_SIGNING_SECRET="<YOUR_KMS_MANAGED_WORKSPACE_HMAC_SECRET>"
OKENG_SIGNING_KID="${workspace.signingSecretKid || 'kid_okeng_active_v1'}"

// 2. Express / Node.js route handler
import crypto from 'node:crypto';

app.get('/api/okeng/embed-token', requireAuth, (req, res) => {
  const secret = process.env.OKENG_SIGNING_SECRET;
  const kid = process.env.OKENG_SIGNING_KID || '${workspace.signingSecretKid || 'kid_okeng_active_v1'}';
  if (!secret) {
    return res.status(500).json({ error: 'Missing OKENG_SIGNING_SECRET' });
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT', kid })
  ).toString('base64url');

  const payload = Buffer.from(
    JSON.stringify({
      iss: "workspace:${workspace.id}",
      aud: "okeng-embed-runtime",
      jti: crypto.randomUUID(),
      sub: req.user.id,
      role: req.user.isAdmin ? 'admin' : 'member',
      workspace_id: "${workspace.id}",
      embed_id: "${embed.id}",
      iat: now,
      exp: now + 300,
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(\`\${header}.\${payload}\`)
    .digest('base64url');

  res.json({ assertion: \`\${header}.\${payload}.\${signature}\` });
});`;

  return {
    installPackageReact: 'npm install @okeng/react',
    installPackageVue: 'npm install @okeng/vue',
    reactComponentSnippet,
    vueComponentSnippet,
    javascriptSnippet,
    serverMinimalSnippet,
    serverFullExampleSnippet,
  };
}

// ============================================================================
// Focused Subcomponents (APP-05 §24)
//   - InstallationHeader
//   - InstallationVerdict
//   - EnvironmentSelector
//   - ServerStep / PackageStep / EmbedStep / ContextStep
//   - VerificationStep & InstallationSuccess
//   - DeveloperTools
// ============================================================================

const InstallationHeader: React.FC<{ embedName: string }> = ({ embedName }) => (
  <header className="space-y-1.5">
    <Text variant="h1" tone="primary">
      Installation
    </Text>
    <Text variant="body" tone="secondary">
      You&apos;re installing <strong className="text-ink">{embedName}</strong>. Install{' '}
      <strong className="text-ink">{embedName}</strong> in your application.
    </Text>
  </header>
);

const InstallationVerdict: React.FC<{ contract: EmbedInstallationContract }> = ({
  contract,
}) => {
  return (
    <Card variant="surface" padding="md" className="space-y-1">
      <Text variant="h2" tone="primary">
        {contract.statusHeadline}
      </Text>
      <Text variant="body" tone="secondary">
        {contract.statusSubline}
      </Text>
    </Card>
  );
};

const EnvironmentSelector: React.FC<{
  selectedEnv: BrowserEnvironment;
  onChange: (env: BrowserEnvironment) => void;
}> = ({ selectedEnv, onChange }) => (
  <section className="space-y-2.5">
    <Text variant="h2" tone="primary">
      How is your app built?
    </Text>
    <SegmentedTabs<BrowserEnvironment>
      ariaLabel="How is your app built?"
      activeId={selectedEnv}
      onChange={onChange}
      options={[
        { id: 'react', label: 'React' },
        { id: 'vue', label: 'Vue' },
        { id: 'javascript', label: 'JavaScript' },
      ]}
    />
  </section>
);

const StepHeader: React.FC<{
  stepNumber: number;
  title: string;
  placement?: 'SERVER' | 'BROWSER';
}> = ({ stepNumber, title, placement }) => {
  const formattedNum = stepNumber < 10 ? `0${stepNumber}` : `${stepNumber}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <Text variant="h2" tone="primary">
        <span className="font-mono text-ink-secondary mr-2 tabular-nums">
          {formattedNum}.
        </span>
        {title}
      </Text>
      {placement && (
        <Badge tone={placement === 'SERVER' ? 'accent' : 'neutral'} mono>
          {placement}
        </Badge>
      )}
    </div>
  );
};

const ServerStep: React.FC<{
  stepNumber: number;
  isOptional: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  showFullExample: boolean;
  onToggleFullExample: () => void;
  snippets: EmbedInstallationSnippets;
  contract?: EmbedInstallationContract;
  stepRef?: React.RefObject<HTMLDivElement | null>;
}> = ({
  stepNumber,
  isOptional,
  isOpen,
  onToggleOpen,
  showFullExample,
  onToggleFullExample,
  snippets,
  contract,
  stepRef,
}) => {
  if (isOptional) {
    const isMixed = contract?.visibilityProfile === 'mixed';
    return (
      <div ref={stepRef}>
        <Card variant="surface" padding="md" className="space-y-3">
          <StepHeader
            stepNumber={stepNumber}
            title={
              isMixed
                ? 'Optional: unlock protected collections for signed-in users'
                : 'Optional: identify signed-in users'
            }
            placement={isOpen ? 'SERVER' : undefined}
          />
          <Text variant="body" tone="secondary">
            {isMixed
              ? 'Public collections work immediately without a backend. Add server signing to unlock protected collections for signed-in users.'
              : 'Your Embed can also use signed-in user identity.'}
          </Text>

          <div>
            <Button variant="secondary" size="sm" onClick={onToggleOpen}>
              {isOpen ? (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span>Hide server setup</span>
                </>
              ) : (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span>Show server setup</span>
                </>
              )}
            </Button>
          </div>

          {isOpen && (
            <div className="pt-3 border-t border-line space-y-3">
              <div className="space-y-1">
                <Text variant="body" tone="primary" className="font-medium">
                  Put this code on your server.
                </Text>
                <Text variant="caption" tone="secondary">
                  Your server identifies the signed-in user and creates a short-lived user
                  assertion.
                </Text>
              </div>

              <div className="flex items-center gap-2 text-xs text-danger font-medium">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Keep your signing secret on the server. Never put it in browser code.
                </span>
              </div>

              <CodeBlock
                code={
                  showFullExample
                    ? snippets.serverFullExampleSnippet
                    : snippets.serverMinimalSnippet
                }
                language="ts"
                label="Add this to your server"
                variant="dark"
              />

              <div>
                <Button variant="ghost" size="sm" onClick={onToggleFullExample}>
                  <span>
                    {showFullExample
                      ? 'Hide full server example'
                      : 'Show full server example'}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div ref={stepRef}>
      <Card variant="surface" padding="md" className="space-y-3">
        <StepHeader
          stepNumber={stepNumber}
          title="Add the server endpoint"
          placement="SERVER"
        />

        <div className="space-y-1">
          <Text variant="body" tone="secondary">
            Your Embed uses protected content. Your server identifies the signed-in user and
            needs to create a short-lived user assertion.
          </Text>
          <Text variant="body" tone="primary" className="font-medium">
            Put this code on your server.
          </Text>
        </div>

        <div className="flex items-center gap-2 text-xs text-danger font-medium">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Keep your signing secret on the server. Never put it in browser code.
          </span>
        </div>

        <CodeBlock
          code={
            showFullExample
              ? snippets.serverFullExampleSnippet
              : snippets.serverMinimalSnippet
          }
          language="ts"
          label="Add this to your server"
          variant="dark"
        />

        <div>
          <Button variant="ghost" size="sm" onClick={onToggleFullExample}>
            <span>
              {showFullExample
                ? 'Hide full server example'
                : 'Show full server example'}
            </span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

const PackageStep: React.FC<{
  stepNumber: number;
  selectedEnv: 'react' | 'vue';
  snippets: EmbedInstallationSnippets;
}> = ({ stepNumber, selectedEnv, snippets }) => (
  <Card variant="surface" padding="md" className="space-y-3">
    <StepHeader
      stepNumber={stepNumber}
      title="Install the package"
      placement="BROWSER"
    />
    <Text variant="body" tone="secondary">
      Put this code in your application.
    </Text>
    <CodeBlock
      code={
        selectedEnv === 'react'
          ? snippets.installPackageReact
          : snippets.installPackageVue
      }
      language="bash"
      label={
        selectedEnv === 'react'
          ? 'Install @okeng/react'
          : 'Install @okeng/vue'
      }
      variant="dark"
    />
  </Card>
);

const EmbedStep: React.FC<{
  stepNumber: number;
  selectedEnv: BrowserEnvironment;
  contract: EmbedInstallationContract;
  snippets: EmbedInstallationSnippets;
}> = ({ stepNumber, selectedEnv, contract, snippets }) => {
  const code =
    selectedEnv === 'react'
      ? snippets.reactComponentSnippet
      : selectedEnv === 'vue'
      ? snippets.vueComponentSnippet
      : snippets.javascriptSnippet;

  const language =
    selectedEnv === 'react'
      ? 'tsx'
      : selectedEnv === 'vue'
      ? 'html'
      : 'html';

  const blockLabel =
    selectedEnv === 'react'
      ? 'Add this to your React app'
      : selectedEnv === 'vue'
      ? 'Add this to your Vue app'
      : 'Add this to your JavaScript app';

  return (
    <Card variant="surface" padding="md" className="space-y-3">
      <StepHeader
        stepNumber={stepNumber}
        title="Add the Embed"
        placement="BROWSER"
      />

      <div className="space-y-1">
        <Text variant="body" tone="primary" className="font-medium">
          Put this code in your application.
        </Text>
        {contract.expectsCurrentUrl && (
          <Text variant="caption" tone="secondary">
            This Embed uses the current page URL.
            {contract.expectsRouteRules ? ' This Embed uses page-specific rules.' : ''}
          </Text>
        )}
      </div>

      <CodeBlock
        code={code}
        language={language}
        label={blockLabel}
        variant="dark"
      />
    </Card>
  );
};

const VerificationStep: React.FC<{
  stepNumber: number;
  embed: EmbedInstance;
  contract: EmbedInstallationContract;
  hasVerifiedOnce: boolean;
  isVerifying: boolean;
  verificationScenario: VerificationScenario;
  verificationMode: 'anonymous' | 'member' | 'admin';
  onChangeVerificationMode: (mode: 'anonymous' | 'member' | 'admin') => void;
  onVerify: () => void;
  onShowServerSetup: () => void;
}> = ({
  stepNumber,
  embed,
  contract,
  hasVerifiedOnce,
  isVerifying,
  verificationScenario,
  verificationMode,
  onChangeVerificationMode,
  onVerify,
  onShowServerSetup,
}) => {
  const [copiedEmbedId, setCopiedEmbedId] = useState(false);
  const allCollections = store.getCollections();

  const proof = useMemo(
    () =>
      computeEmbedVerificationProof({
        embed,
        collections: allCollections,
        identity: clearanceLabelToEmbedIdentity(verificationMode),
        tokenVerified: verificationMode !== 'anonymous',
      }),
    [embed, allCollections, verificationMode]
  );

  const handleCopyEmbedId = () => {
    navigator.clipboard.writeText(embed.id);
    setCopiedEmbedId(true);
    setTimeout(() => setCopiedEmbedId(false), 2000);
  };

  return (
    <Card variant="surface" padding="md" className="space-y-4">
      <StepHeader stepNumber={stepNumber} title="Verify your installation" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Text variant="body" tone="secondary">
            Check your installation
          </Text>
          {(contract.hasProtectedCollections || contract.signingState !== 'none') && (
            <SegmentedTabs<'anonymous' | 'member' | 'admin'>
              ariaLabel="Verification identity mode"
              activeId={verificationMode}
              onChange={onChangeVerificationMode}
              options={[
                { id: 'anonymous', label: 'Anonymous' },
                { id: 'member', label: 'Member' },
                { id: 'admin', label: 'Admin' },
              ]}
            />
          )}
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onVerify}
          disabled={isVerifying}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`}
          />
          <span>{isVerifying ? 'Verifying...' : 'Verify installation'}</span>
        </Button>
      </div>

      {/* Progressive Verification Result (Dual Identity Proof + Authorization Proof) */}
      {hasVerifiedOnce && verificationScenario === 'verified' && (
        <div
          role="status"
          aria-live="polite"
          className="pt-3 border-t border-line space-y-2.5"
        >
          <div className="flex items-center gap-2 text-success font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>✓ Installation looks good</span>
          </div>
          <Text variant="body" tone="secondary">
            <strong className="text-ink">{embed.name}</strong> is connected and responding
            correctly.
          </Text>

          <Box surface="canvas" padding="sm" radius="sm" className="p-3 space-y-1.5 text-xs font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-ink-muted uppercase">Identity Proof:</span>
              <span className="text-ink">{proof.identityProof.summary}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-line-subtle pt-1.5">
              <span className="text-ink-muted uppercase">Authorization Proof:</span>
              <span className="text-ink">{proof.authorizationProof.summary}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-subtle pt-1.5 text-2xs text-ink-secondary">
              <span>
                Authorized IDs:{' '}
                <strong className="text-ink">
                  {proof.actualAuthorizedCollectionIds.length > 0
                    ? proof.actualAuthorizedCollectionIds.join(', ')
                    : 'NONE (Empty Scope)'}
                </strong>
              </span>
              <span>
                Flags: session={String(proof.sessionCreated)} · public=
                {String(proof.publicScopeVerified)} · identity=
                {String(proof.identityVerified)} · protected=
                {String(proof.protectedScopeVerified)}
              </span>
            </div>
          </Box>

          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-secondary pt-1">
            <span>Embed connected</span>
            <span aria-hidden="true">·</span>
            <span>
              {proof.authorizationProof.emptyScopeValid
                ? 'Empty scope initialized (Protected-only anonymous)'
                : 'Knowledge available'}
            </span>
            {contract.expectsCurrentUrl && (
              <>
                <span aria-hidden="true">·</span>
                <span>Context received</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="text-success font-medium">✓ You&apos;re ready</span>
          </div>
        </div>
      )}

      {hasVerifiedOnce && verificationScenario === 'missing_embed' && (
        <div
          role="alert"
          className="pt-3 border-t border-line space-y-2.5"
        >
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>We couldn&apos;t find this Embed.</span>
          </div>
          <Text variant="body" tone="secondary">
            Make sure the Embed ID in your application matches this Embed (
            <span className="font-mono text-xs text-ink">{embed.id}</span>).
          </Text>
          <div>
            <Button variant="secondary" size="sm" onClick={handleCopyEmbedId}>
              {copiedEmbedId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-success" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Embed ID</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {hasVerifiedOnce && verificationScenario === 'signing_failure' && (
        <div
          role="alert"
          className="pt-3 border-t border-line space-y-2.5"
        >
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>We couldn&apos;t verify the signed-in user.</span>
          </div>
          <Text variant="body" tone="secondary">
            Your server did not provide a valid signed assertion. Check your server signing
            endpoint.
          </Text>
          {contract.signingState !== 'none' && (
            <div>
              <Button variant="secondary" size="sm" onClick={onShowServerSetup}>
                <span>Show server setup</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {hasVerifiedOnce && verificationScenario === 'context_failure' && (
        <div
          role="alert"
          className="pt-3 border-t border-line space-y-2"
        >
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>We couldn&apos;t read the page context.</span>
          </div>
          <Text variant="body" tone="secondary">
            Check that your application passes the current page URL.
          </Text>
        </div>
      )}

      {hasVerifiedOnce && verificationScenario === 'unauthorized' && (
        <div
          role="alert"
          className="pt-3 border-t border-line space-y-2"
        >
          <div className="flex items-center gap-2 text-danger font-semibold text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This user does not have access to the configured content.</span>
          </div>
          <Text variant="body" tone="secondary">
            Check the user&apos;s role or collection access.
          </Text>
        </div>
      )}
    </Card>
  );
};

const DeveloperTools: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
  hasConfigDrifted: boolean;
  onToggleDrift: () => void;
  verificationScenario: VerificationScenario;
  onChangeScenario: (scenario: VerificationScenario) => void;
  onOpenSimulator: () => void;
}> = ({
  isOpen,
  onToggle,
  hasConfigDrifted,
  onToggleDrift,
  verificationScenario,
  onChangeScenario,
  onOpenSimulator,
}) => (
  <footer className="pt-4 border-t border-line">
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
    >
      {isOpen ? (
        <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5" />
      )}
      <span>Developer tools</span>
    </button>

    {isOpen && (
      <Box surface="canvas" padding="sm" radius="sm" className="mt-3 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Text variant="label" tone="primary">
              Simulate configuration drift
            </Text>
            <Text variant="caption" tone="secondary">
              Test the out-of-date instructions banner when the Embed changes.
            </Text>
          </div>
          <Button variant="secondary" size="sm" onClick={onToggleDrift}>
            <span>
              {hasConfigDrifted ? 'Clear configuration drift' : 'Simulate configuration drift'}
            </span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line">
          <div className="space-y-0.5">
            <Text variant="label" tone="primary">
              Simulate verification state
            </Text>
            <Text variant="caption" tone="secondary">
              Preview progressive verification recovery states.
            </Text>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={verificationScenario}
              onChange={(e) => onChangeScenario(e.target.value as VerificationScenario)}
              aria-label="Simulate verification state"
            >
              <option value="verified">Verified (Success)</option>
              <option value="missing_embed">Missing Embed</option>
              <option value="signing_failure">Signing failure</option>
              <option value="context_failure">Context failure</option>
              <option value="unauthorized">Unauthorized</option>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-line">
          <div className="space-y-0.5">
            <Text variant="label" tone="primary">
              Host Simulator
            </Text>
            <Text variant="caption" tone="secondary">
              Test this Embed in the interactive host environment.
            </Text>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenSimulator}>
            <span>Open Host Simulator</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Box>
    )}
  </footer>
);

export interface EmbedInstallationViewProps {
  embedId: string | null;
  onBackToEmbed: (embedId: string) => void;
  onBackToEmbedsList: () => void;
  onNavigateToConfigTab: (
    embedId: string,
    tab: 'mode_scope' | 'context_theme' | 'installation'
  ) => void;
  onOpenSimulator: (embedId: string) => void;
}

export const EmbedInstallationView: React.FC<EmbedInstallationViewProps> = ({
  embedId,
  onBackToEmbed,
  onBackToEmbedsList,
  onNavigateToConfigTab,
  onOpenSimulator,
}) => {
  const { t } = useI18n();
  const { routeReselectTick } = useAppShell();
  const initialTickRef = useRef(routeReselectTick);
  const serverStepRef = useRef<HTMLDivElement | null>(null);

  const workspace = store.getWorkspace();
  const collections = store.getCollections();
  const embed = embedId ? store.getEmbed(embedId) : undefined;

  // Clicking active "Embed" sidebar link returns to the Stage 1 Embeds Directory
  useEffect(() => {
    if (routeReselectTick !== initialTickRef.current) {
      initialTickRef.current = routeReselectTick;
      onBackToEmbedsList();
    }
  }, [routeReselectTick, onBackToEmbedsList]);

  // Browser environment selection (APP-05 §6: React | Vue | JavaScript)
  const [selectedEnv, setSelectedEnv] = useState<BrowserEnvironment>('react');

  // Progressive disclosure states (APP-05 §9, §10, §17)
  const [isOptionalServerOpen, setIsOptionalServerOpen] = useState(false);
  const [showFullServerExample, setShowFullServerExample] = useState(false);

  // Configuration drift tracking (APP-05 §21)
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(
    embed?.updatedAt || null
  );
  const [simulatedDrift, setSimulatedDrift] = useState(false);

  useEffect(() => {
    if (embed && !snapshotUpdatedAt) {
      setSnapshotUpdatedAt(embed.updatedAt);
    }
  }, [embed?.id]);

  const hasConfigDrifted =
    simulatedDrift || Boolean(embed && snapshotUpdatedAt && embed.updatedAt !== snapshotUpdatedAt);

  // Verification state (APP-05 §18-§19 + Dual Proof Mode)
  const [verificationScenario, setVerificationScenario] =
    useState<VerificationScenario>('verified');
  const [verificationMode, setVerificationMode] = useState<'anonymous' | 'member' | 'admin'>(
    'anonymous'
  );
  const [hasVerifiedOnce, setHasVerifiedOnce] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Low-priority Developer Tools disclosure (APP-05 §20)
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  const handleRunVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setHasVerifiedOnce(true);
      setIsVerifying(false);
    }, 180);
  };

  const handleFocusServerSetup = () => {
    setIsOptionalServerOpen(true);
    serverStepRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ==========================================================================
  // STATE 1: EMBED UNAVAILABLE
  // ==========================================================================
  if (!embed) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <ChildContextNavbar
          onBack={onBackToEmbedsList}
          backLabel={t('nav.embed', 'Embeds')}
          breadcrumb={[
            { label: t('nav.embed', 'Embeds'), onClick: onBackToEmbedsList },
            { label: 'Installation' },
          ]}
        />
        <div className="py-8 px-6 w-full max-w-3xl mx-auto">
          <Card variant="surface" padding="lg" className="space-y-4">
            <Text variant="h2" tone="primary">
              We couldn&apos;t find this Embed.
            </Text>
            <Text variant="body" tone="secondary">
              Return to Embeds and select a valid Embed to install.
            </Text>
            <div>
              <Button variant="primary" size="md" onClick={onBackToEmbedsList}>
                Return to Embeds
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const readiness = evaluateEmbedReadiness(embed, collections);
  const contract = useMemo(
    () => evaluateEmbedInstallationContract(embed, collections),
    [embed, collections]
  );
  const snippets = useMemo(
    () => buildEmbedInstallationSnippets(embed, workspace, contract),
    [embed, workspace, contract]
  );

  // ==========================================================================
  // STATE 2: INCOMPLETE CONFIGURATION (APP-05 §22)
  // Do not render a partially functional installation guide.
  // ==========================================================================
  if (!readiness.readyForInstallation) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <ChildContextNavbar
          onBack={() => onBackToEmbed(embed.id)}
          backLabel={embed.name}
          breadcrumb={[
            { label: t('nav.embed', 'Embeds'), onClick: onBackToEmbedsList },
            { label: embed.name, onClick: () => onBackToEmbed(embed.id) },
            { label: 'Installation' },
          ]}
          contextMetadata={
            <EmbedStatusBadge embed={embed} collections={collections} />
          }
        />

        <div className="py-8 px-6 w-full max-w-3xl mx-auto space-y-6">
          <InstallationHeader embedName={embed.name} />

          <Card variant="surface" padding="lg" className="space-y-4">
            <div className="space-y-1.5">
              <Text variant="h2" tone="primary">
                This Embed isn&apos;t ready to install yet.
              </Text>
              <Text variant="body" tone="secondary">
                Complete the required Embed settings first.
              </Text>
            </div>
            <div>
              <Button
                variant="primary"
                size="md"
                onClick={() => onNavigateToConfigTab(embed.id, 'mode_scope')}
              >
                Edit Embed
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Dynamic step numbering (APP-05 §8-§10)
  // Never skip step numbers; show only steps required for the chosen environment & signing state
  const hasPackageStep = selectedEnv === 'react' || selectedEnv === 'vue';
  let currentStep = 1;
  const serverStepNumber =
    contract.signingState === 'required' ? currentStep++ : null;
  const packageStepNumber = hasPackageStep ? currentStep++ : null;
  const embedStepNumber = currentStep++;
  const optionalServerStepNumber =
    contract.signingState === 'optional' ? currentStep++ : null;
  const verifyStepNumber = currentStep++;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ====================================================================
          RESOURCE NAVIGATION: ← Embeds / <Embed Name> / Installation (APP-05 §4)
          ==================================================================== */}
      <ChildContextNavbar
        onBack={() => onBackToEmbed(embed.id)}
        backLabel={embed.name}
        breadcrumb={[
          { label: t('nav.embed', 'Embeds'), onClick: onBackToEmbedsList },
          { label: embed.name, onClick: () => onBackToEmbed(embed.id) },
          { label: 'Installation' },
        ]}
        contextMetadata={
          <EmbedStatusBadge embed={embed} collections={collections} />
        }
      />

      {/* ====================================================================
          CENTERED SINGLE-COLUMN INSTALLATION WORKSPACE (APP-05 §13 & §28)
          ==================================================================== */}
      <div className="py-8 px-6 w-full max-w-3xl mx-auto space-y-6">
        {/* 1. PAGE HEADER (APP-05 §4) */}
        <InstallationHeader embedName={embed.name} />

        {/* 2. CONFIGURATION DRIFT BANNER (APP-05 §21) */}
        {hasConfigDrifted && (
          <Card
            variant="surface"
            padding="md"
            className="border-accent bg-accent/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <Text variant="h3" tone="primary">
                This Embed has changed.
              </Text>
              <Text variant="body" tone="secondary">
                Your installation instructions may be out of date.
              </Text>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setSnapshotUpdatedAt(embed.updatedAt);
                setSimulatedDrift(false);
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh instructions</span>
            </Button>
          </Card>
        )}

        {/* 3. IMMEDIATE VERDICT (APP-05 §5) */}
        <InstallationVerdict contract={contract} />

        {/* 4. ENVIRONMENT SELECTION (APP-05 §6) */}
        <EnvironmentSelector
          selectedEnv={selectedEnv}
          onChange={setSelectedEnv}
        />

        {/* 5. CONFIGURATION-DRIVEN RECIPE STEPS (APP-05 §7-§17) */}
        <div className="space-y-4">
          {/* Case C: Required Server Endpoint comes FIRST */}
          {contract.signingState === 'required' && serverStepNumber !== null && (
            <ServerStep
              stepNumber={serverStepNumber}
              isOptional={false}
              isOpen={true}
              onToggleOpen={() => {}}
              showFullExample={showFullServerExample}
              onToggleFullExample={() => setShowFullServerExample((prev) => !prev)}
              snippets={snippets}
              stepRef={serverStepRef}
            />
          )}

          {/* Package Step (React & Vue) */}
          {hasPackageStep && packageStepNumber !== null && (
            <PackageStep
              stepNumber={packageStepNumber}
              selectedEnv={selectedEnv}
              snippets={snippets}
            />
          )}

          {/* Browser Embed Step */}
          <EmbedStep
            stepNumber={embedStepNumber}
            selectedEnv={selectedEnv}
            contract={contract}
            snippets={snippets}
          />

          {/* Case B: Optional Server Endpoint comes AFTER Browser Step, collapsed by default */}
          {contract.signingState === 'optional' && optionalServerStepNumber !== null && (
            <ServerStep
              stepNumber={optionalServerStepNumber}
              isOptional={true}
              isOpen={isOptionalServerOpen}
              onToggleOpen={() => setIsOptionalServerOpen((prev) => !prev)}
              showFullExample={showFullServerExample}
              onToggleFullExample={() => setShowFullServerExample((prev) => !prev)}
              snippets={snippets}
              contract={contract}
              stepRef={serverStepRef}
            />
          )}

          {/* Final Step: Single-Action Verification (APP-05 §18-§19) */}
          <VerificationStep
            stepNumber={verifyStepNumber}
            embed={embed}
            contract={contract}
            hasVerifiedOnce={hasVerifiedOnce}
            isVerifying={isVerifying}
            verificationScenario={verificationScenario}
            verificationMode={verificationMode}
            onChangeVerificationMode={(m) => {
              setVerificationMode(m);
              setHasVerifiedOnce(true);
            }}
            onVerify={handleRunVerification}
            onShowServerSetup={handleFocusServerSetup}
          />
        </div>

        {/* 6. LOW-PRIORITY DEVELOPER TOOLS (APP-05 §20) */}
        <DeveloperTools
          isOpen={isDevToolsOpen}
          onToggle={() => setIsDevToolsOpen((prev) => !prev)}
          hasConfigDrifted={hasConfigDrifted}
          onToggleDrift={() => setSimulatedDrift((prev) => !prev)}
          verificationScenario={verificationScenario}
          onChangeScenario={(scenario) => {
            setVerificationScenario(scenario);
            setHasVerifiedOnce(true);
          }}
          onOpenSimulator={() => onOpenSimulator(embed.id)}
        />
      </div>
    </div>
  );
};
