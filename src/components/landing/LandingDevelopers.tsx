// CO-LANDING-DEVELOPERS — Code block + bullets
import React from 'react';
import { CodeSnippet } from '../ui/CodeSnippet';

export function LandingDevelopers() {
  return (
    <section id="desarrolladores" className="w-full max-w-7xl mx-auto px-6 py-16 md:py-24">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-section font-semibold text-ink tracking-tight">Para desarrolladores, por desarrolladores</h2>
            <p className="text-sm text-ink-secondary">SDKs React, Vue, JS. API REST, webhooks, trae tu propia clave, despliega en UE.</p>
          </div>
          <CodeSnippet
            title="HelpCenter.tsx"
            language="tsx"
            code={`import { OKEngWidget } from '@okeng/react';\n\nexport function HelpCenter() {\n  return (\n    <OKEngWidget\n      collection="docs"\n      theme={{ accent: "#1D4ED8" }}\n      permissions={{ role: user.role }}\n    />\n  );\n}`}
          />
        </div>
        <div className="flex flex-col gap-6 pt-2">
          <ul className="flex flex-col gap-3">
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>API REST completa</li>
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>Webhooks para sincronización</li>
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>Trae tu propia clave (BYOK) — OpenAI, Anthropic, Azure, Bedrock, local</li>
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>Despliega en UE — datos nunca usados para entrenar</li>
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>SDKs: React, Vue, JavaScript</li>
            <li className="flex items-start gap-2 text-sm text-ink-secondary"><span className="text-success">✓</span>Documentación interactiva</li>
          </ul>
          <div className="bg-elevated border border-line rounded-md p-4 text-xs text-ink-secondary">
            <div className="font-medium text-ink mb-1">3 líneas de código, una tarde de integración.</div>
            <div>Instalación verificada, firma HMAC opcional, permisos heredados vía SSO.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
