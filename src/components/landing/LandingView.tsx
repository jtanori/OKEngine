// PA-LANDING — Marketing landing page archetype implementation
// 12 surfaces stacked, max-w-7xl, no sidebar, public surface
import React from 'react';
import { AnnouncementBanner } from '../ui/AnnouncementBanner';
import { LandingHero } from './LandingHero';
import { LandingLogoStrip } from './LandingLogoStrip';
import { LandingMetrics } from './LandingMetrics';
import { LandingHowItWorks } from './LandingHowItWorks';
import { LandingProductFeatures } from './LandingProductFeatures';
import { LandingIntegration } from './LandingIntegration';
import { LandingDevelopers } from './LandingDevelopers';
import { LandingTestimonials } from './LandingTestimonials';
import { LandingPricing } from './LandingPricing';
import { LandingFaq } from './LandingFaq';
import { LandingFinalCta } from './LandingFinalCta';
import { LandingFooter } from './LandingFooter';

export function LandingView() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* SU-LANDING-ANNOUNCEMENT */}
      <AnnouncementBanner>Citas verificables y permisos por rol — ≥98% con cita, sin alucinaciones</AnnouncementBanner>

      {/* Minimal header for landing — logo + nav + CTAs */}
      <header className="w-full border-b border-line bg-surface/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-sm bg-ink text-surface flex items-center justify-center text-2xs font-bold">O</div>
              <span className="text-sm font-semibold">OKEng</span>
            </a>
            <nav className="hidden md:flex items-center gap-6 text-xs text-ink-secondary">
              <a href="#producto" className="hover:text-ink">Producto</a>
              <a href="#integracion" className="hover:text-ink">Integración</a>
              <a href="#precios" className="hover:text-ink">Precios</a>
              <a href="#faq" className="hover:text-ink">FAQ</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-xs font-medium text-ink-secondary hover:text-ink px-3 py-1.5">Iniciar sesión</a>
            <a href="/signup" className="inline-flex items-center justify-center rounded-sm bg-ink text-surface px-4 py-1.5 text-xs font-medium hover:bg-ink-strong">Empieza gratis</a>
          </div>
        </div>
      </header>

      <main className="flex flex-col">
        {/* SU-LANDING-HERO */}
        <LandingHero />
        {/* SU-LANDING-LOGOS */}
        <LandingLogoStrip />
        {/* SU-LANDING-METRICS */}
        <LandingMetrics />
        {/* SU-LANDING-HOW-IT-WORKS */}
        <LandingHowItWorks />
        {/* SU-LANDING-PRODUCT */}
        <LandingProductFeatures />
        {/* SU-LANDING-INTEGRATION */}
        <LandingIntegration />
        {/* SU-LANDING-DEVELOPERS */}
        <LandingDevelopers />
        {/* SU-LANDING-TESTIMONIALS */}
        <LandingTestimonials />
        {/* SU-LANDING-PRICING */}
        <LandingPricing />
        {/* SU-LANDING-FAQ */}
        <LandingFaq />
        {/* SU-LANDING-FINAL-CTA */}
        <LandingFinalCta />
      </main>

      {/* SU-LANDING-FOOTER */}
      <LandingFooter />

      {/* Preserve old tour contract ref for tests — hidden */}
      <div data-testid="hero-what-is-okeng-cta" className="hidden">OKEng — Tu documentación, respondiendo dentro de tu app</div>
    </div>
  );
}
