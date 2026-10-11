// CO-PUBLIC-CONTACT — Contact page PA-PUBLIC: form + info + trust, max-w-7xl py-16/24 editorial, FORM-SEC-01
import React from 'react';
import { AnnouncementBanner } from '../ui/AnnouncementBanner';
import { ContactForm } from '../ui/ContactForm';
import { LandingFooter } from '../landing/LandingFooter';

export function ContactView() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <AnnouncementBanner>Citas verificables y permisos por rol — ≥98% con cita, sin alucinaciones</AnnouncementBanner>
      <header className="w-full border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold">OKEng</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-xs text-ink-secondary">
              <a href="/#producto" className="hover:text-ink">Producto</a>
              <a href="/#integracion" className="hover:text-ink">Integración</a>
              <a href="/#precios" className="hover:text-ink">Precios</a>
              <a href="/docs" className="hover:text-ink">Docs</a>
              <a href="/#faq" className="hover:text-ink">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-xs font-medium text-ink-secondary hover:text-ink px-3 py-1.5">Iniciar sesión</a>
            <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-4 py-1.5 text-xs font-medium hover:bg-ink-strong">Empieza gratis</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-12">
        <div className="flex flex-col gap-6">
          <div className="text-2xs font-medium uppercase tracking-wider text-ink-muted">Contacto</div>
          <h1 className="text-section font-semibold tracking-tight text-ink-strong">Hablemos de tu docs</h1>
          <p className="text-sm text-ink-secondary leading-relaxed">¿Tienes preguntas sobre OKEng, integración, precios, o cómo migrar tu docs actual? Te respondemos en menos de 24h. También puedes preguntar directo en docs con citas verificables.</p>
          <div className="flex flex-col gap-4 text-sm text-ink-secondary">
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-ink">Email</div>
              <div>hola@okeng.dev • Soporte en ES/EN</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-ink">Docs</div>
              <a href="/docs" className="text-accent hover:underline">/docs — 18 docs públicos, búsqueda híbrida, Ask con citas</a>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold text-ink">Estado</div>
              <div>≥98% respuestas con cita • -73% tickets • 3 líneas integración • 1k docs free</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Citas verificables</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">Sin tarjeta</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">EU hosting</span>
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-1 text-2xs text-ink-secondary">BYOK OpenAI/Anthropic/Azure/Bedrock/Local</span>
          </div>
        </div>
        <ContactForm />
      </main>

      <LandingFooter />
    </div>
  );
}
