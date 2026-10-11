// CO-LANDING-DEVELOPERS — Dark code section
import React from 'react';

export function LandingDevelopers() {
  return (
    <section id="desarrolladores" className="w-full bg-ink-strong py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-start">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-2xs font-medium tracking-wide text-white/80">
              <span className="font-mono text-xs">&gt;_</span> Para desarrolladores
            </span>
            <h2 className="text-section font-bold tracking-tight text-white leading-tight">
              Tres líneas de código.
              <br />
              Cero infraestructura.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              Empotra el conocimiento donde ya está tu producto. Sin servidores de vectores que mantener, sin pipelines, sin sorpresas en la factura de la nube.
            </p>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-white/80">
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xs">✓</span> API REST documentada y SDKs oficiales para JavaScript y Python
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xs">✓</span> Webhooks y eventos para mantener el índice siempre sincronizado
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xs">✓</span> Trae tu propia clave: OpenAI, Anthropic, Azure o modelos locales
            </li>
            <li className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xs">✓</span> Despliega en la UE o en tu propia infraestructura con Docker
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="/docs" className="inline-flex items-center justify-center rounded-md bg-white text-ink-strong px-5 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 transition-colors">
              Leer la documentación →
            </a>
            <a href="#faq" className="inline-flex items-center justify-center rounded-md bg-white/5 border border-white/20 text-white px-5 py-2.5 text-sm font-medium backdrop-blur hover:bg-white/10 transition-colors">
              Ver preguntas frecuentes
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-white/[0.06] border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></span>
                </span>
                <span className="text-xs font-mono text-white/70 ml-2">HelpCenter.tsx</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
                <span className="bg-white text-ink-strong rounded-full px-2.5 py-1 text-2xs font-medium">React</span>
                <span className="text-white/60 px-2.5 py-1 text-2xs">HTML</span>
                <span className="text-white/60 px-2.5 py-1 text-2xs">cURL</span>
              </div>
              <span className="text-2xs border border-white/10 rounded-md px-2 py-1 text-white/60">⎘ Copiar</span>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-white/90">
              <code>{`import { OKEngWidget } from "@okeng/react";\n\nexport function HelpCenter() {\n  return (\n    <OKEngWidget\n      collection="docs-v3"\n      permissions={user.role}  // respeta el rol\n      theme="auto"\n      citations\n    />\n  );\n}`}</code>
            </pre>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-2xs text-white/80 shadow-lg">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">✓</span> 200 OK · 312 ms
              <span className="text-white/40">·</span> 3 fuentes citadas · 0 alucinaciones
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
