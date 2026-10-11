// CO-LANDING-INTEGRATION — 3 modes tabs + preview with bullets and browser mock — centered tabs removed per SBS (keep left/right only)
import React from 'react';
import { SectionPill } from '../ui/SectionPill';
import { Shield, BarChart3, Sun } from 'lucide-react';

export function LandingIntegration() {
  return (
    <section id="integracion" className="w-full bg-canvas py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10 items-center">
        <SectionPill label="Integración" />
        <div className="max-w-2xl flex flex-col gap-4 text-center">
          <h2 className="text-[32px] lg:text-[36px] font-bold text-ink-strong tracking-tight leading-tight">Elige cómo se ve en tu producto</h2>
          <p className="text-[15px] leading-relaxed text-ink-secondary max-w-xl mx-auto">El mismo motor, la misma seguridad y las mismas citas. Solo cambia el contenedor.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-start max-w-7xl w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-ink">Widget flotante</h3>
                <p className="text-[15px] text-ink-secondary leading-relaxed">La burbuja que tus usuarios ya saben usar. Se abre en un clic, no interrumpe y desaparece cuando no la necesitan.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0"><Shield className="w-4 h-4" /></span>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-ink">Permisos en todos los modos</div>
                    <div className="text-sm text-ink-secondary leading-relaxed">El mismo control de acceso, vayas donde vayas.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0"><BarChart3 className="w-4 h-4" /></span>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-ink">Analítica unificada</div>
                    <div className="text-sm text-ink-secondary leading-relaxed">Todas las conversaciones en un solo panel.</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0"><Sun className="w-4 h-4" /></span>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-ink">Claro y oscuro</div>
                    <div className="text-sm text-ink-secondary leading-relaxed">Se adapta al tema de tu aplicación.</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative bg-surface border border-line rounded-xl shadow-lg overflow-hidden">
              <div className="h-8 bg-elevated border-b border-line flex items-center gap-1.5 px-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></span>
                <span className="ml-3 flex-1 bg-white border border-line rounded-full px-3 py-1 text-2xs text-ink-muted">app.tuproducto.com</span>
              </div>
              <div className="grid grid-cols-[140px_1fr] h-80">
                <div className="border-r border-line p-3 flex flex-col gap-2">
                  <div className="h-5 w-5 rounded-md bg-ink"></div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-line"></div>
                      <div className="h-2 flex-1 bg-line rounded-sm"></div>
                    </div>
                  ))}
                </div>
                <div className="p-3 flex flex-col gap-3 bg-elevated/30">
                  <div className="h-4 bg-white border border-line rounded-md"></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white border border-line rounded-lg p-3 h-20"></div>
                    <div className="bg-white border border-line rounded-lg p-3 h-20"></div>
                  </div>
                  <div className="bg-white border border-line rounded-lg p-3 h-20"></div>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-surface border border-line rounded-lg shadow-lg w-64 p-3 hidden md:block">
                <div className="flex items-center gap-2 text-xs font-semibold"><span className="w-5 h-5 rounded-md bg-ink text-surface flex items-center justify-center text-2xs">OK</span> OKEng <span className="ml-auto w-1.5 h-1.5 bg-success rounded-full"></span></div>
                <div className="mt-2 bg-accent text-surface rounded-full px-3 py-1.5 text-2xs ml-auto w-fit">¿Cómo configuro SSO?</div>
                <div className="mt-2 text-2xs bg-success-subtle text-success border border-success/20 rounded-md px-2 py-1">✓ fuente verificada</div>
              </div>
            </div>
          </div>
      </div>
    </section>
  );
}
