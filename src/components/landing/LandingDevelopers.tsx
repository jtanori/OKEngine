// CO-LANDING-DEVELOPERS — Dark code section (target: "Tres líneas de código. Cero infraestructura.")
import React from 'react';

export function LandingDevelopers() {
  return (
    <section id="desarrolladores" className="w-full bg-ink-strong py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold tracking-widest uppercase text-white/60">Para desarrolladores</p>
            <h2 className="text-section font-semibold tracking-tight text-white leading-tight">
              Tres líneas de código.
              <br />
              Cero infraestructura.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              Empotra el conocimiento donde ya está tu producto. Sin servidores de vectores que mantener, sin pipelines, sin sorpresas en la factura.
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 text-sm text-white/80">
            <li className="flex items-start gap-2"><span className="text-white/60">—</span> API REST documentada y SDKs oficiales para JavaScript y Python</li>
            <li className="flex items-start gap-2"><span className="text-white/60">—</span> Webhooks y eventos para mantener el índice siempre sincronizado</li>
            <li className="flex items-start gap-2"><span className="text-white/60">—</span> Trae tu propia clave: OpenAI, Anthropic, Azure o modelos locales</li>
            <li className="flex items-start gap-2"><span className="text-white/60">—</span> Despliega en la UE o en tu propia infraestructura con Docker</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/docs" className="inline-flex items-center justify-center rounded-sm bg-white text-ink-strong px-5 py-2.5 text-sm font-medium hover:bg-white/90 transition-colors">
              Leer la documentación
            </a>
            <a href="#faq" className="inline-flex items-center justify-center rounded-sm border border-white/20 text-white px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors">
              Ver preguntas frecuentes
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white/[0.06] border border-white/10 rounded-lg overflow-hidden backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
              <span className="text-xs font-mono text-white/70">HelpCenter.tsx</span>
              <span className="text-2xs text-white/50">React</span>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-white/90">
              <code>{`import { OKEngWidget } from "@okeng/react";\n\nexport function HelpCenter() {\n  return (\n    <OKEngWidget\n      collection="docs-v3"\n      permissions={user.role}  // respeta el rol\n      theme="auto"\n      citations\n    />\n  );\n}`}</code>
            </pre>
          </div>
          <div className="flex items-center gap-3 text-2xs text-white/60">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>200 OK · 312 ms</span>
            <span>·</span>
            <span>3 fuentes citadas · 0 alucinaciones</span>
          </div>
        </div>
      </div>
    </section>
  );
}
