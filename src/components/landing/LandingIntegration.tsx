'use client';

// CO-LANDING-INTEGRATION — 3 modes tabs + preview with bullets and browser mock — fully mode-specific per SBS
import React, { useState } from 'react';
import { SectionPill } from '../ui/SectionPill';
import { Shield, BarChart3, Sun, PanelRight, Maximize2 } from 'lucide-react';

type Mode = 'widget' | 'panel' | 'fullscreen';

export function LandingIntegration() {
  const [mode, setMode] = useState<Mode>('widget');

  const modeContent: Record<Mode, { title: string; desc: string; bullets: Array<{ icon: React.ReactNode; title: string; desc: string }> }> = {
    widget: {
      title: 'Widget flotante',
      desc: 'La burbuja que tus usuarios ya saben usar. Se abre en un clic, no interrumpe y desaparece cuando no la necesitan.',
      bullets: [
        { icon: <Shield className="w-4 h-4" />, title: 'Flota abajo-derecha', desc: '3 líneas de código. Burbuja discreta que no cubre tu contenido.' },
        { icon: <BarChart3 className="w-4 h-4" />, title: 'No interrumpe el flujo', desc: 'Se abre en un clic y se cierra sin recargar la página.' },
        { icon: <Sun className="w-4 h-4" />, title: 'Claro y oscuro', desc: 'Se adapta al tema de tu aplicación automáticamente.' },
      ],
    },
    panel: {
      title: 'Panel lateral',
      desc: 'Documentación y chat en un panel deslizable. Perfecto para dashboards. 360px, se abre desde el lateral sin salir de la página.',
      bullets: [
        { icon: <PanelRight className="w-4 h-4" />, title: 'Panel deslizante 360px', desc: 'Se acopla al lateral, mantiene el contexto de la página principal.' },
        { icon: <Shield className="w-4 h-4" />, title: 'Ideal para producto interno', desc: 'El usuario consulta sin perder su trabajo en el dashboard.' },
        { icon: <BarChart3 className="w-4 h-4" />, title: 'Mantiene navegación', desc: 'No recarga; el panel se abre por encima del contenido.' },
      ],
    },
    fullscreen: {
      title: 'Pantalla completa',
      desc: 'Base de conocimiento completa. Para centros de ayuda dedicados. Búsqueda, filtros y respuestas en una sola vista.',
      bullets: [
        { icon: <Maximize2 className="w-4 h-4" />, title: 'Búsqueda y filtros avanzados', desc: 'Categorías, colecciones y búsqueda híbrida en una sola página.' },
        { icon: <Shield className="w-4 h-4" />, title: 'Para help centers', desc: 'Toda la documentación navegable sin salir del centro de ayuda.' },
        { icon: <BarChart3 className="w-4 h-4" />, title: 'Navegación completa', desc: 'Filtros por producto, versión y equipo con resultados citables.' },
      ],
    },
  };

  const active = modeContent[mode];

  return (
    <section id="integracion" className="w-full bg-canvas py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-10 items-center">
        <SectionPill label="Integración" />
        <div className="max-w-2xl flex flex-col gap-4 text-center">
          <h2 className="text-[32px] lg:text-[36px] font-bold text-ink-strong tracking-tight leading-tight">Elige cómo se ve en tu producto</h2>
          <p className="text-[15px] leading-relaxed text-ink-secondary max-w-xl mx-auto">El mismo motor, la misma seguridad y las mismas citas. Solo cambia el contenedor.</p>
        </div>
        {/* Segmented control — centered dark active, now interactive */}
        <div className="flex justify-center w-full">
          <div className="inline-flex items-center gap-1 rounded-full bg-elevated p-1 border border-line shadow-sm" role="tablist">
            {(['widget', 'panel', 'fullscreen'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-ink-strong text-white shadow-sm' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {m === 'widget' ? 'Widget flotante' : m === 'panel' ? 'Panel lateral' : 'Pantalla completa'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-start max-w-7xl w-full">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-ink">{active.title}</h3>
                <p className="text-[15px] text-ink-secondary leading-relaxed">{active.desc}</p>
              </div>
              <div className="flex flex-col gap-4">
                {active.bullets.map((b, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="w-8 h-8 rounded-lg bg-accent-subtle text-accent flex items-center justify-center shrink-0">{b.icon}</span>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold text-ink">{b.title}</div>
                      <div className="text-sm text-ink-secondary leading-relaxed">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative bg-surface border border-line rounded-xl shadow-lg overflow-hidden">
              <div className="h-8 bg-elevated border-b border-line flex items-center gap-1.5 px-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></span>
                <span className="ml-3 flex-1 bg-white border border-line rounded-full px-3 py-1 text-2xs text-ink-muted">app.tuproducto.com</span>
              </div>
              {/* Preview switches by mode — widget representation itself changes */}
              {mode === 'widget' && (
                <>
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
                  {/* Widget as floating bubble — only widget mode */}
                  <div className="absolute bottom-4 right-4 bg-surface border border-line rounded-xl shadow-xl w-64 p-3 hidden md:block">
                    <div className="flex items-center gap-2 text-xs font-semibold"><span className="w-5 h-5 rounded-md bg-ink text-surface flex items-center justify-center text-2xs">OK</span> OKEng <span className="ml-auto w-1.5 h-1.5 bg-success rounded-full"></span></div>
                    <div className="mt-2 bg-ink-strong text-surface rounded-2xl rounded-br-sm px-3 py-2 text-xs ml-auto w-fit">¿Cómo configuro SSO?</div>
                    <div className="mt-2 text-2xs bg-success-subtle text-success border border-success/20 rounded-md px-2 py-1">✓ fuente verificada · Verificada</div>
                    <div className="mt-2 flex items-center gap-1.5 text-2xs text-ink-muted border-t border-line pt-2"><span className="w-3 h-3 rounded-full bg-ink-strong text-white flex items-center justify-center text-2xs">↗</span> Haz una pregunta…</div>
                  </div>
                </>
              )}
              {mode === 'panel' && (
                <div className="flex h-80">
                  <div className="flex-1 p-3 flex flex-col gap-3 bg-elevated/30">
                    <div className="h-4 bg-white border border-line rounded-md w-2/3"></div>
                    <div className="bg-white border border-line rounded-lg p-3 h-16"></div>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <div className="bg-white border border-line rounded-lg p-3"></div>
                      <div className="bg-white border border-line rounded-lg p-3"></div>
                    </div>
                  </div>
                  {/* Widget as side panel — resembles panel mode */}
                  <div className="w-[200px] border-l border-line bg-surface flex flex-col shadow-[-8px_0_20px_rgba(0,0,0,0.06)]">
                    <div className="h-10 border-b border-line px-3 flex items-center justify-between bg-surface">
                      <span className="flex items-center gap-2 text-xs font-semibold"><span className="w-5 h-5 rounded-md bg-ink text-white flex items-center justify-center text-2xs">OK</span> OKEng</span>
                      <span className="w-5 h-5 rounded-full hover:bg-elevated flex items-center justify-center text-ink-muted">✕</span>
                    </div>
                    <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
                      <div className="bg-ink-strong text-white rounded-2xl rounded-br-sm px-3 py-2 text-xs self-end max-w-[85%]">¿Cómo configuro SSO?</div>
                      <div className="bg-white border border-line rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-ink-secondary shadow-sm">Para configurar SSO ve a Configuración → SSO y conecta tu SAML. <span className="inline-flex items-center rounded-full bg-success-subtle border border-success/20 px-1.5 py-0.5 text-2xs text-success mt-1">Verificada</span></div>
                      <div className="mt-auto flex items-center gap-2 bg-elevated border border-line rounded-full px-3 py-2">
                        <span className="text-2xs text-ink-muted flex-1">Haz una pregunta…</span>
                        <span className="w-6 h-6 rounded-full bg-ink-strong text-white flex items-center justify-center text-2xs">↑</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {mode === 'fullscreen' && (
                <div className="flex flex-col h-80">
                  <div className="h-12 bg-white border-b border-line flex items-center px-4 gap-3">
                    <div className="flex-1 h-8 bg-elevated border border-line rounded-lg flex items-center px-3 gap-2">
                      <span className="text-accent text-xs">⌕</span>
                      <span className="text-xs text-ink-muted">Buscar en la documentación…</span>
                      <span className="ml-auto text-2xs bg-ink-strong text-white rounded-full px-2 py-1">⌘K</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-2xs text-ink-muted">
                      <span className="w-6 h-6 rounded-md bg-ink-strong text-white flex items-center justify-center text-2xs">OK</span> OKEng
                    </div>
                  </div>
                  <div className="flex-1 p-3 grid grid-cols-[200px_1fr] gap-3 bg-elevated/30">
                    <div className="bg-white border border-line rounded-xl p-3 flex flex-col gap-2">
                      <div className="text-2xs font-semibold text-ink-muted tracking-widest uppercase">Colecciones</div>
                      <div className="h-6 bg-accent text-white rounded-md flex items-center px-2 text-2xs">Guía de SSO</div>
                      <div className="h-6 bg-elevated border border-line rounded-md flex items-center px-2 text-2xs text-ink-secondary">API Reference</div>
                      <div className="h-6 bg-elevated border border-line rounded-md flex items-center px-2 text-2xs text-ink-secondary">Onboarding</div>
                    </div>
                    <div className="bg-white border border-line rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-md bg-ink-strong text-white flex items-center justify-center text-2xs shrink-0">OK</span>
                        <div className="flex-1 bg-elevated/50 border border-line rounded-2xl rounded-tl-sm px-3 py-2">
                          <p className="text-xs text-ink-secondary leading-relaxed">Para configurar SSO ve a Configuración → SSO y conecta tu proveedor SAML. Sigue la guía paso a paso.</p>
                          <div className="mt-2 flex items-center gap-1.5 text-2xs text-ink-muted bg-white border border-line rounded-md px-2 py-1.5">
                            <span className="text-success">✓</span> Guía de SSO · authentication/sso.md · Fragmento 2 de 3
                            <span className="ml-auto bg-success-subtle text-success border border-success/20 rounded-full px-1.5 py-0.5">Verificada</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center gap-2 bg-elevated border border-line rounded-full px-3 py-2.5">
                        <span className="text-xs text-ink-muted flex-1">Haz una pregunta…</span>
                        <span className="w-7 h-7 rounded-full bg-ink-strong text-white flex items-center justify-center text-xs">↑</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </section>
  );
}
