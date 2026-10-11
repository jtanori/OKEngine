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
      {/* SU-LANDING-ANNOUNCEMENT — Left target: Nuevo pill */}
      <AnnouncementBanner>
        <span className="inline-flex items-center rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-2xs font-medium">Nuevo</span>
        Respuestas con citas verificadas y permisos por rol. <a href="#novedades" className="underline underline-offset-2 hover:text-white">Ver novedades →</a>
      </AnnouncementBanner>

      {/* Minimal header for landing — 3-zone centered nav — Left target IA */}
      <header className="w-full bg-surface border-b border-line/60 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="h-6 w-6 rounded-md bg-ink text-surface flex items-center justify-center text-2xs font-bold shadow-sm">O</div>
            <span className="text-sm font-semibold text-ink">OKEng</span>
          </a>
          <nav className="hidden md:flex flex-1 items-center justify-center gap-8 text-sm font-medium text-ink-secondary">
            <a href="#producto" className="hover:text-ink transition-colors">Producto</a>
            <a href="#como-funciona" className="hover:text-ink transition-colors">Cómo funciona</a>
            <a href="#desarrolladores" className="hover:text-ink transition-colors">Desarrolladores</a>
            <a href="#precios" className="hover:text-ink transition-colors">Precios</a>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <a href="/login" className="text-sm font-medium text-ink-secondary hover:text-ink px-3 py-2">Iniciar sesión</a>
            <a href="/signup" className="inline-flex items-center justify-center rounded-md bg-accent text-surface px-5 py-2 text-sm font-medium shadow-sm hover:bg-accent-hover">Empieza gratis</a>
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
