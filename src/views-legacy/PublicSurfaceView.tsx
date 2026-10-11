import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Lock,
  Layers,
  FileText,
  Search,
  CheckCircle2,
  FolderKanban,
  Code2,
  Shield,
  MessageSquare,
  Sparkles,
  Zap,
  Database,
  Globe,
  Puzzle,
  BarChart3,
  Palette,
  Key,
  Copy,
  Check,
  ChevronDown,
  Quote,
  Mail,
  Users,
  Boxes,
  Timer,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { authService } from '../services/auth';
import { store } from '../services/store';
import {
  Button,
  Input,
  Textarea,
  Card,
  Box,
  Text,
  SegmentedTabs,
  Checkbox,
} from '../components/ui';
import { LanguageSelector } from '../components/LanguageSelector';
import { DocumentNav, DocumentNavGroup } from '../components/DocumentNav';
import { DogfoodInlineBot } from '../components/public/DogfoodInlineBot';
import { HomepageGuidedTour } from '../components/public/HomepageGuidedTour';
import { DocArticleRenderer } from '../components/public/DocArticleRenderer';
import { useI18n } from '../i18n/I18nContext';
import { scrollViewportToTop } from '../app/router';
import {
  validateEmailInput,
  validatePasswordInput,
  validatePlainText,
  containsUnsafePayload,
  sanitizePlainText,
} from '../services/formSecurity';

export type PublicPageType =
  | 'landing'
  | 'about'
  | 'docs'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'acceptable-use'
  | 'login'
  | 'signup'
  | 'forgot-password';

interface PublicSurfaceViewProps {
  initialPage?: PublicPageType;
  initialDocSlug?: string;
  authRedirectMessage?: string;
  onEnterWorkspace: (workspaceSlug: string, editDocumentId?: string) => void;
  onNavigatePath?: (path: string) => void;
}

export const PublicSurfaceView: React.FC<PublicSurfaceViewProps> = ({
  initialPage = 'landing',
  initialDocSlug,
  authRedirectMessage,
  onEnterWorkspace,
  onNavigatePath,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [page, setPage] = useState<PublicPageType>(initialPage);
  const [selectedDocSlug, setSelectedDocSlug] = useState<string>(
    initialDocSlug || 'getting-started'
  );
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSearchError, setDocSearchError] = useState<string | null>(null);
  const [specList, setSpecList] = useState<{ slug: string; filename: string }[]>([]);
  const [specContent, setSpecContent] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [tosError, setTosError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // Contact form state (PAGE-PUB-08)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactErrors, setContactErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
  }>({});
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [contactSent, setContactSent] = useState(false);

  // Homepage Floating Guided Tour trigger state (PAGE-PUB-01)
  const heroTourButtonRef = useRef<HTMLButtonElement | null>(null);
  const [heroTourOpenRequest, setHeroTourOpenRequest] = useState<{
    nonce: number;
  } | null>(null);

  // New landing marketing UI state
  const [integrationTab, setIntegrationTab] = useState<'widget' | 'panel' | 'fullscreen'>('widget');
  const [pricingAnnual, setPricingAnnual] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const currentUser = authService.getCurrentUser();
  const isAuthenticated = Boolean(currentUser);
  const personas = authService.getPersonas();

  useEffect(() => {
    setPage(initialPage);
    scrollViewportToTop();
  }, [initialPage]);

  useEffect(() => {
    if (initialDocSlug) {
      setSelectedDocSlug(initialDocSlug);
      scrollViewportToTop();
    }
  }, [initialDocSlug]);

  // Always reset viewport scroll to top when switching public pages or documentation articles
  useEffect(() => {
    scrollViewportToTop();
  }, [page, selectedDocSlug]);

  const navigatePublicPage = (nextPage: PublicPageType, docSlug?: string) => {
    setPage(nextPage);
    setEmailError(null);
    setPasswordError(null);
    setTosError(null);
    setContactErrors({});
    if (nextPage !== 'forgot-password') {
      setRecoverySent(false);
    }
    if (docSlug) {
      setSelectedDocSlug(docSlug);
    }
    scrollViewportToTop();
    if (onNavigatePath) {
      if (nextPage === 'landing') onNavigatePath('/');
      else if (nextPage === 'docs') {
        onNavigatePath(docSlug ? `/docs/${docSlug}` : '/docs');
      } else {
        onNavigatePath(`/${nextPage}`);
      }
    }
  };

  // Fetch archived specification files from /api/docs ONLY when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setSpecList([]);
      setSpecContent('');
      return;
    }
    fetch('/api/docs')
      .then((r) => r.json())
      .then((data) => {
        if (data.docs && data.docs.length > 0) {
          setSpecList(data.docs);
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // Load spec markdown ONLY if authenticated and selectedDocSlug is an archived spec
  const isSpecDoc = isAuthenticated && specList.some((s) => s.slug === selectedDocSlug);
  useEffect(() => {
    if (page === 'docs' && isSpecDoc) {
      setSpecContent(t('common.loading'));
      fetch(`/api/docs/${selectedDocSlug}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.content) setSpecContent(data.content);
        })
        .catch(() => setSpecContent('Failed to load specification document.'));
    }
  }, [page, selectedDocSlug, isSpecDoc, t]);

  const handleCitationNavigate = (slug: string) => {
    if (slug === 'terms' || slug === 'privacy' || slug === 'acceptable-use') {
      navigatePublicPage(slug as PublicPageType);
      return;
    }
    navigatePublicPage('docs', slug);
  };

  const handleEmbedNavigateUrl = (url: string) => {
    if (url.startsWith('/docs/')) {
      handleCitationNavigate(url.replace(/^\/docs\//, ''));
      return;
    }
    if (url === '/docs') {
      navigatePublicPage('docs');
      return;
    }
    if (url === '/login' || url === '/signup') {
      navigatePublicPage(url.slice(1) as PublicPageType);
      return;
    }
    if (url.startsWith('/workspaces/')) {
      if (currentUser && onNavigatePath) {
        onNavigatePath(url);
      } else if (currentUser) {
        onEnterWorkspace('okeng');
      } else {
        navigatePublicPage('login');
      }
      return;
    }
    if (onNavigatePath) {
      onNavigatePath(url);
    }
  };

  const handleEditInWorkspace = (docId: string) => {
    onEnterWorkspace('okeng', docId);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;

    const emailCheck = validateEmailInput(email);
    const passCheck = validatePasswordInput(
      password,
      page === 'signup' ? 'signup' : 'login'
    );

    let hasError = false;
    if (!emailCheck.valid) {
      setEmailError(
        t(emailCheck.errorKey || 'validation.email_invalid', emailCheck.errorMessage)
      );
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!passCheck.valid) {
      setPasswordError(
        t(passCheck.errorKey || 'validation.password_short', passCheck.errorMessage)
      );
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (page === 'signup' && !acceptedTos) {
      setTosError(
        t(
          'public.auth.tos_required_error',
          'Please accept the Terms of Service and Privacy Policy to create an account.'
        )
      );
      hasError = true;
    } else {
      setTosError(null);
    }

    if (hasError) return;

    setIsAuthSubmitting(true);
    setTimeout(() => {
      const matchedPersona = personas.find(
        (p) => p.email.toLowerCase() === emailCheck.sanitizedValue
      );
      authService.switchPersona(matchedPersona ? matchedPersona.id : 'usr_sarah_102');
      setIsAuthSubmitting(false);
      onEnterWorkspace('okeng');
    }, 220);
  };

  const handleRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthSubmitting) return;

    const emailCheck = validateEmailInput(email);
    if (!emailCheck.valid) {
      setEmailError(
        t(emailCheck.errorKey || 'validation.email_invalid', emailCheck.errorMessage)
      );
      return;
    }
    setEmailError(null);
    setIsAuthSubmitting(true);
    setTimeout(() => {
      setEmail(emailCheck.sanitizedValue);
      setIsAuthSubmitting(false);
      setRecoverySent(true);
    }, 220);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isContactSubmitting) return;

    const nameCheck = validatePlainText(contactName, {
      required: true,
      minLength: 2,
      maxLength: 80,
      fieldLabel: t('public.contact.name', 'Name'),
    });
    const emailCheck = validateEmailInput(contactEmail);
    const msgCheck = validatePlainText(contactMessage, {
      required: true,
      minLength: 10,
      maxLength: 2000,
      fieldLabel: t('public.contact.message', 'Message'),
    });

    const nextErrors: { name?: string; email?: string; message?: string } = {};
    if (!nameCheck.valid) {
      nextErrors.name = t(
        nameCheck.errorKey || 'validation.required',
        nameCheck.errorMessage
      );
    }
    if (!emailCheck.valid) {
      nextErrors.email = t(
        emailCheck.errorKey || 'validation.email_invalid',
        emailCheck.errorMessage
      );
    }
    if (!msgCheck.valid) {
      nextErrors.message = t(
        msgCheck.errorKey || 'validation.too_short',
        msgCheck.errorMessage
      );
    }

    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsContactSubmitting(true);
    setTimeout(() => {
      setContactSent(true);
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setContactErrors({});
      setIsContactSubmitting(false);
    }, 250);
  };

  // Query public collections for documentation index & search (PUBLIC-01 §20-22)
  const docsCollectionArticles = store.searchCollectionDocuments(
    'COL-DOCS',
    docSearchQuery
  );
  const publicProductSearchArticles = store.searchCollectionDocuments(
    'COL-PUBLIC',
    docSearchQuery
  );
  const legalSearchArticles = store.searchCollectionDocuments(
    'COL-LEGAL',
    docSearchQuery
  );
  const publicProductArticles = store.getDocuments('COL-PUBLIC');

  // Guard: If unauthenticated and selectedDocSlug is not in any public (everyone) collection, fall back to getting-started
  const matchedWorkspaceDoc = store.getDocumentByFilename(selectedDocSlug);
  const matchedDocCollection = matchedWorkspaceDoc
    ? store.getCollection(matchedWorkspaceDoc.collectionId)
    : undefined;
  const isPublicWorkspaceDoc = Boolean(
    matchedWorkspaceDoc && matchedDocCollection?.visibility === 'everyone'
  );

  useEffect(() => {
    if (
      page === 'docs' &&
      !isAuthenticated &&
      !isPublicWorkspaceDoc &&
      selectedDocSlug !== 'getting-started'
    ) {
      setSelectedDocSlug('getting-started');
    }
  }, [page, isAuthenticated, isPublicWorkspaceDoc, selectedDocSlug]);

  const activeWorkspaceDoc = isAuthenticated
    ? matchedWorkspaceDoc
    : isPublicWorkspaceDoc
    ? matchedWorkspaceDoc
    : store.getDocumentByFilename('getting-started');

  // Build Collapsible Documentation Navigation Groups (CO-DOCUMENT-NAV)
  const docNavGroups: DocumentNavGroup[] = useMemo(() => {
    const formatSpecTitle = (slug: string): string => {
      const cleaned = slug
        .replace(/^(?:[A-Z]+-)+\d+-/i, '')
        .replace(/^\d+_/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();
      if (!cleaned) return slug;
      return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const groups: DocumentNavGroup[] = [
      {
        id: 'COL-DOCS',
        title: t('public.docs.guides_heading', 'Product Guides'),
        icon: <BookOpen className="w-3.5 h-3.5 text-ink-secondary" />,
        items: docsCollectionArticles.map((doc) => {
          const slug = doc.filename.replace(/\.md$/i, '');
          return {
            id: slug,
            title: doc.title,
          };
        }),
      },
      {
        id: 'COL-PUBLIC',
        title: t('public.docs.product_knowledge_heading', 'Public Product Knowledge'),
        icon: <FolderKanban className="w-3.5 h-3.5 text-ink-secondary" />,
        items: publicProductSearchArticles.map((doc) => {
          const slug = doc.filename.replace(/\.md$/i, '');
          return {
            id: slug,
            title: doc.title,
          };
        }),
      },
      {
        id: 'COL-LEGAL',
        title: t('public.docs.legal_heading', 'Legal & Trust Policies'),
        icon: <Shield className="w-3.5 h-3.5 text-ink-secondary" />,
        items: legalSearchArticles.map((doc) => {
          const slug = doc.filename.replace(/\.md$/i, '');
          return {
            id: slug,
            title: doc.title,
          };
        }),
      },
    ];

    if (isAuthenticated && specList.length > 0) {
      const normalizedQuery = docSearchQuery.trim().toLowerCase();
      const filteredSpecs = normalizedQuery
        ? specList.filter(
            (s) =>
              s.slug.toLowerCase().includes(normalizedQuery) ||
              s.filename.toLowerCase().includes(normalizedQuery)
          )
        : specList;

      groups.push({
        id: 'ENG-SPECS',
        title: t('public.docs.specs_heading', 'Engineering Specifications'),
        icon: <Layers className="w-3.5 h-3.5 text-accent" />,
        items: filteredSpecs.map((spec) => ({
          id: spec.slug,
          title: formatSpecTitle(spec.slug),
          isSpec: true,
        })),
      });
    }

    return groups;
  }, [
    docsCollectionArticles,
    publicProductSearchArticles,
    legalSearchArticles,
    isAuthenticated,
    specList,
    docSearchQuery,
    t,
  ]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const codeSnippet = `import { OKEngWidget } from "@okeng/react";

export function HelpCenter() {
  return (
    <OKEngWidget
      collection="docs-v3"
      permissions={user.role}  // respeta el rol
      theme="auto"
      citations
    />
  );
}`;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Canonical Public Navigation (PUBLIC-01 §27) */}
      <header className="h-14 border-b border-line bg-surface/80 backdrop-blur-md px-6 lg:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <button
            type="button"
            onClick={() => navigatePublicPage('landing')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-6 h-6 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-xs font-semibold">
              OK
            </div>
            <span className="font-semibold text-sm tracking-tight text-ink">OKEng</span>
          </button>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-ink-secondary">
            <button
              type="button"
              onClick={() => scrollToSection('como-funciona')}
              className="cursor-pointer transition-colors hover:text-ink"
            >
              {language === 'es' ? 'Cómo funciona' : 'How it works'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('producto')}
              className="cursor-pointer transition-colors hover:text-ink"
            >
              {language === 'es' ? 'Producto' : 'Product'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('precios')}
              className="cursor-pointer transition-colors hover:text-ink"
            >
              {language === 'es' ? 'Precios' : 'Pricing'}
            </button>
            <button
              type="button"
              onClick={() => navigatePublicPage('docs')}
              className={`cursor-pointer transition-colors ${
                page === 'docs' ? 'text-ink font-semibold' : 'hover:text-ink'
              }`}
            >
              {t('public.nav.docs')}
            </button>
            <button
              type="button"
              onClick={() => navigatePublicPage('about')}
              className={`cursor-pointer transition-colors ${
                page === 'about' ? 'text-ink font-semibold' : 'hover:text-ink'
              }`}
            >
              {t('public.nav.about')}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector
            value={language}
            onChange={setLanguage}
            variant="compact"
            showIcon={false}
          />

          {currentUser ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onEnterWorkspace('okeng')}
            >
              <span>
                {t('public.nav.open_workspace')} ({currentUser.name.split(' ')[0]})
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => navigatePublicPage('login')}>
                {t('common.sign_in')}
              </Button>
              <Button size="sm" variant="primary" onClick={() => navigatePublicPage('signup')}>
                {t('common.get_started')}
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content Surface */}
      <main className={`flex-1 w-full ${page === 'landing' ? '' : 'max-w-5xl mx-auto p-8'}`}>
        {/* ============================================================
            PAGE-PUB-01: Home Page (/) — Ported Landing with Full Marketing Coverage
            Maintains spec: hero CTA, pipeline, pillars, bottom CTA + guided tour
        ============================================================ */}
        {page === 'landing' && (
          <div className="w-full">
            {/* Announcement Banner */}
            <div className="w-full bg-ink text-surface py-2.5 px-4 flex items-center justify-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-xs bg-surface/15 font-mono text-2xs font-semibold tracking-wide uppercase">
                  {t('public.announcement.badge', 'Nuevo')}
                </span>
                <span className="font-medium">{t('public.announcement.text', 'Respuestas con citas verificables y permisos por rol.')}</span>
              </span>
              <button
                type="button"
                onClick={() => scrollToSection('producto')}
                className="ml-2 underline underline-offset-4 hover:text-surface/80 cursor-pointer"
              >
                {t('public.announcement.cta', 'Ver novedades→')}
              </button>
            </div>

            {/* HERO — Split layout with chat demo */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
                {/* Left: Copy */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-surface text-2xs font-medium text-ink-secondary">
                    <Sparkles className="w-3 h-3 text-accent" />
                    <span>{t('public.hero.badge_new', 'Capa de conocimiento para tu producto')}</span>
                  </div>

                  <div className="space-y-4">
                    <h1 className="font-sans text-[2.1rem] lg:text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.02em] text-ink">
                      {t('public.hero.title_new', 'Convierte tu documentación en respuestas con citas, dentro de tu app.')}
                    </h1>
                    <p className="text-sm lg:text-[15px] leading-relaxed text-ink-secondary max-w-[560px]">
                      {t('public.hero.subtitle_new', 'OKEng indexa tu Markdown y web, respeta los permisos por colección y devuelve respuestas verificables. Tus usuarios preguntan y obtienen la fuente, sin salir de tu producto.')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => (currentUser ? onEnterWorkspace('okeng') : navigatePublicPage('signup'))}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-surface rounded-sm text-sm font-medium hover:bg-ink/90 transition-colors cursor-pointer"
                    >
                      <span>{t('public.hero.cta_primary', 'Empieza gratis')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToSection('como-funciona')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-line text-ink rounded-sm text-sm font-medium hover:bg-subtle transition-colors cursor-pointer"
                    >
                      <span>{t('public.hero.cta_secondary', 'Ver cómo funciona')}</span>
                    </button>
                    {/* Spec-required primary tour CTA */}
                    <button
                      ref={heroTourButtonRef}
                      type="button"
                      data-testid="hero-what-is-okeng-cta"
                      onClick={() => setHeroTourOpenRequest({ nonce: Date.now() })}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-sm text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{t('public.tour.hero_primary_cta', 'What is OKEng?')}</span>
                    </button>
                  </div>

                  <p className="text-2xs text-ink-muted font-mono">
                    {t('public.hero.free_note', 'Gratis hasta 1.000 consultas al mes · Sin tarjeta de crédito · Listo en 5 minutos')}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-subtle border border-success/20 text-2xs font-medium text-success">
                      <CheckCircle2 className="w-3 h-3" />
                      {t('public.hero.badge_citations', '≥98% de respuestas con cita')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-subtle border border-accent/20 text-2xs font-medium text-accent">
                      <Lock className="w-3 h-3" />
                      {t('public.hero.badge_permissions', 'Permisos por colección')}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated border border-line text-2xs font-medium text-ink-secondary">
                      <FileText className="w-3 h-3" />
                      {t('public.hero.badge_formats', 'Markdown, web y texto')}
                    </span>
                  </div>
                </div>

                {/* Right: Chat demo mock */}
                <div className="lg:col-span-5 relative">
                  <div className="bg-surface border border-line rounded-md shadow-[0_8px_40px_rgba(0,0,0,0.08)] overflow-hidden">
                    {/* Mock header */}
                    <div className="px-4 py-3 border-b border-line bg-elevated flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-xs font-semibold">OK</div>
                        <div>
                          <div className="text-xs font-semibold text-ink">OKEng</div>
                          <div className="text-2xs text-success flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                            Asistente de conocimiento · En línea
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-line" />
                        <div className="w-2 h-2 rounded-full bg-line" />
                        <div className="w-2 h-2 rounded-full bg-line" />
                      </div>
                    </div>

                    {/* Mock conversation */}
                    <div className="p-4 space-y-4 bg-canvas">
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 bg-ink text-surface rounded-sm text-xs">
                          {t('public.hero.demo_question', '¿Cómo configuro SSO?')}
                        </div>
                      </div>

                      <div className="bg-surface border border-line rounded-sm p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-2xs">OK</div>
                          <span className="text-2xs font-mono text-ink-muted">Para configurar</span>
                        </div>
                        <div className="text-xs leading-relaxed text-ink">
                          Ve a <span className="font-mono bg-subtle px-1 py-0.5 rounded-xs">Configuración → Seguridad</span> y habilita SAML. Necesitarás los metadatos XML de tu IdP.
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-line">
                          <FileText className="w-3 h-3 text-accent" />
                          <span className="text-2xs font-mono text-ink-secondary truncate">
                            {t('public.hero.demo_source', 'Guía de SSO · authentication/sso.md')}
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 text-2xs text-success font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('public.hero.demo_verified', 'Verificada')}
                          </span>
                        </div>
                        <div className="text-2xs text-ink-muted font-mono">Fragmento 2 de 3 · coincidencia 0,94</div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-sm text-2xs text-ink-muted">
                        <Search className="w-3 h-3" />
                        <span>Haz una pregunta…</span>
                        <span className="ml-auto flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-subtle rounded-xs font-mono">{t('public.hero.demo_citation', 'Respuesta con cita')}</span>
                          <span className="px-1.5 py-0.5 bg-ink text-surface rounded-xs font-mono flex items-center gap-1">
                            <Code2 className="w-3 h-3" />
                            {t('public.hero.demo_code', '3 líneas de código')}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Floating badges */}
                    <div className="absolute -right-2 -top-2 hidden lg:flex flex-col gap-2">
                      <div className="px-2.5 py-1 bg-surface border border-line rounded-full shadow-sm text-2xs font-mono text-ink flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-success rounded-full" />
                        Fuente verificable en 1 clic
                      </div>
                      <div className="px-2.5 py-1 bg-ink text-surface rounded-full shadow-sm text-2xs font-mono flex items-center gap-1.5 ml-4">
                        <Code2 className="w-3 h-3" />
                        iframe, React o API
                      </div>
                    </div>
                  </div>

                  {/* Background glow */}
                  <div className="absolute -z-10 inset-0 blur-[60px] opacity-20 pointer-events-none">
                    <div className="absolute top-10 right-10 w-40 h-40 bg-accent rounded-full" />
                    <div className="absolute bottom-10 left-10 w-32 h-32 bg-success rounded-full" />
                  </div>
                </div>
              </div>
            </section>

            {/* Logos strip */}
            <section className="border-y border-line bg-surface">
              <div className="max-w-6xl mx-auto px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-2xs font-mono text-ink-muted uppercase tracking-wider">
                  {t('public.logos.heading', 'Equipos de producto que ya responden con OKEng')}
                </p>
                <div className="flex flex-wrap items-center gap-6 lg:gap-8 text-sm font-semibold tracking-tight text-ink-muted">
                  <span className="flex items-center gap-1.5"><span className="text-ink">◆</span> Nexora</span>
                  <span className="flex items-center gap-1.5"><span className="text-ink">●</span> Dataflow</span>
                  <span className="flex items-center gap-1.5"><span className="text-ink">▲</span> Kubelab</span>
                  <span className="flex items-center gap-1.5"><span className="text-ink">■</span> Aurea</span>
                  <span className="flex items-center gap-1.5"><span className="text-ink">✦</span> Pacted</span>
                  <span className="flex items-center gap-1.5"><span className="text-ink">⬡</span> Vanti</span>
                </div>
              </div>
            </section>

            {/* Metrics strip */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: t('public.metrics.lines_title', '3 líneas'), desc: t('public.metrics.lines_desc', 'para integrar el widget'), icon: Code2 },
                  { title: t('public.metrics.tickets_title', '−73%'), desc: t('public.metrics.tickets_desc', 'tickets de soporte (media)'), icon: MessageSquare },
                  { title: t('public.metrics.uptime_title', '99,9%'), desc: t('public.metrics.uptime_desc', 'uptime SLA'), icon: ShieldCheck },
                  { title: t('public.metrics.training_title', '0 datos'), desc: t('public.metrics.training_desc', 'usados para entrenar IA'), icon: Brain },
                ].map((m, i) => (
                  <div key={i} className="bg-surface border border-line rounded-sm p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xs bg-elevated border border-line flex items-center justify-center shrink-0">
                      <m.icon className="w-4 h-4 text-ink-secondary" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-ink">{m.title}</div>
                      <div className="text-2xs text-ink-secondary leading-tight">{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* How it works — 5 steps (spec pipeline + expanded) */}
            <section id="como-funciona" className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
              <div className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-subtle border border-accent/20 text-2xs font-mono font-medium text-accent mb-3">
                  <Zap className="w-3 h-3" />
                  {t('public.pipeline.heading', 'Cómo funciona')}
                </div>
                <h2 className="font-sans text-[1.75rem] lg:text-[2rem] font-semibold leading-tight tracking-tight text-ink mb-3">
                  {t('public.how.heading', 'De tus archivos a respuestas, en cinco pasos')}
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {t('public.how.desc', 'Sin infraestructura, sin pipelines que mantener. Subes el contenido, defines los permisos y OKEng hace el resto.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-px bg-gradient-to-r from-line via-accent/20 to-line" />

                {[
                  { n: '1', title: t('public.how.step1_title'), desc: t('public.how.step1_desc'), icon: FileText, color: 'bg-ink' },
                  { n: '2', title: t('public.how.step2_title'), desc: t('public.how.step2_desc'), icon: Boxes, color: 'bg-ink' },
                  { n: '3', title: t('public.how.step3_title'), desc: t('public.how.step3_desc'), icon: Users, color: 'bg-accent' },
                  { n: '4', title: t('public.how.step4_title'), desc: t('public.how.step4_desc'), icon: Search, color: 'bg-accent' },
                  { n: '5', title: t('public.how.step5_title'), desc: t('public.how.step5_desc'), icon: CheckCircle2, color: 'bg-success' },
                ].map((step) => (
                  <div key={step.n} className="relative bg-surface border border-line rounded-sm p-5 space-y-3 hover:border-line-strong transition-colors group">
                    <div className={`w-7 h-7 rounded-xs ${step.color} text-surface flex items-center justify-center text-xs font-mono font-semibold`}>
                      {step.n}
                    </div>
                    <div className="w-8 h-8 rounded-xs bg-elevated border border-line flex items-center justify-center group-hover:bg-subtle transition-colors">
                      <step.icon className="w-4 h-4 text-ink-secondary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-ink mb-1">{step.title}</h3>
                      <p className="text-xs text-ink-secondary leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-xs text-ink-secondary">
                <Timer className="w-4 h-4" />
                <span>{t('public.how.time', 'Tiempo medio hasta la primera respuesta en producción: un día.')}</span>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('signup')}
                  className="ml-1 font-medium text-accent hover:underline cursor-pointer"
                >
                  {t('public.how.time_cta', 'Empieza ahora →')}
                </button>
              </div>

              {/* Original spec pipeline 4-stage for compatibility (visually integrated) */}
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs border-t border-line pt-8">
                <div className="space-y-1">
                  <Text variant="mono" tone="secondary">{t('public.pipeline.step1_tag')}</Text>
                  <Text variant="caption" className="font-semibold">{t('public.pipeline.step1_title')}</Text>
                  <Text as="p" variant="caption" tone="secondary">{t('public.pipeline.step1_desc')}</Text>
                </div>
                <div className="space-y-1 sm:border-l sm:border-line sm:pl-4">
                  <Text variant="mono" tone="secondary">{t('public.pipeline.step2_tag')}</Text>
                  <Text variant="caption" className="font-semibold">{t('public.pipeline.step2_title')}</Text>
                  <Text as="p" variant="caption" tone="secondary">{t('public.pipeline.step2_desc')}</Text>
                </div>
                <div className="space-y-1 sm:border-l sm:border-line sm:pl-4">
                  <Text variant="mono" tone="secondary">{t('public.pipeline.step3_tag')}</Text>
                  <Text variant="caption" className="font-semibold">{t('public.pipeline.step3_title')}</Text>
                  <Text as="p" variant="caption" tone="secondary">{t('public.pipeline.step3_desc')}</Text>
                </div>
                <div className="space-y-1 sm:border-l sm:border-line sm:pl-4">
                  <Text variant="mono" tone="secondary">{t('public.pipeline.step4_tag')}</Text>
                  <Text variant="caption" className="font-semibold">{t('public.pipeline.step4_title')}</Text>
                  <Text as="p" variant="caption" tone="secondary">{t('public.pipeline.step4_desc')}</Text>
                </div>
              </div>
            </section>

            {/* Product — 6 pillars */}
            <section id="producto" className="bg-surface border-y border-line">
              <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                <div className="max-w-3xl mb-10">
                  <h2 className="font-sans text-[1.75rem] lg:text-[2rem] font-semibold leading-tight tracking-tight text-ink mb-3">
                    {t('public.product.heading', 'Todo lo que necesita una capa de conocimiento seria')}
                  </h2>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {t('public.product.desc', 'No es un chatbot con tus PDFs encima. Es retrieval con control de acceso, citas y gobierno del contenido.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: t('public.product.md_title'), desc: t('public.product.md_desc'), icon: FileText },
                    { title: t('public.product.perm_title'), desc: t('public.product.perm_desc'), icon: Shield },
                    { title: t('public.product.cite_title'), desc: t('public.product.cite_desc'), icon: Quote },
                    { title: t('public.product.model_title'), desc: t('public.product.model_desc'), icon: Key },
                    { title: t('public.product.widget_title'), desc: t('public.product.widget_desc'), icon: Palette },
                    { title: t('public.product.analytics_title'), desc: t('public.product.analytics_desc'), icon: BarChart3 },
                  ].map((f, i) => (
                    <Card key={i} padding="md" className="space-y-3 hover:border-line-strong transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xs bg-elevated border border-line flex items-center justify-center">
                          <f.icon className="w-4 h-4 text-accent" />
                        </div>
                        {i === 3 && (
                          <div className="flex items-center gap-1 text-2xs font-mono text-ink-muted">
                            <span className="px-1.5 py-0.5 bg-subtle rounded-xs">OpenAI</span>
                            <span className="px-1.5 py-0.5 bg-subtle rounded-xs">Anthropic</span>
                            <span className="px-1.5 py-0.5 bg-subtle rounded-xs">Azure</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-ink mb-1">{f.title}</h3>
                        <p className="text-xs text-ink-secondary leading-relaxed">{f.desc}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Original 4 pillars for spec compliance */}
                <div className="mt-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <Card padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Text variant="caption" className="font-semibold">{t('public.pillars.files_title')}</Text>
                      <FileText className="w-4 h-4 text-accent" />
                    </div>
                    <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">{t('public.pillars.files_desc')}</Text>
                  </Card>
                  <Card padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Text variant="caption" className="font-semibold">{t('public.pillars.collections_title')}</Text>
                      <FolderKanban className="w-4 h-4 text-accent" />
                    </div>
                    <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">{t('public.pillars.collections_desc')}</Text>
                  </Card>
                  <Card padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Text variant="caption" className="font-semibold">{t('public.pillars.access_title')}</Text>
                      <Lock className="w-4 h-4 text-accent" />
                    </div>
                    <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">{t('public.pillars.access_desc')}</Text>
                  </Card>
                  <Card padding="md" className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Text variant="caption" className="font-semibold">{t('public.pillars.retrieval_title')}</Text>
                      <Code2 className="w-4 h-4 text-accent" />
                    </div>
                    <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">{t('public.pillars.retrieval_desc')}</Text>
                  </Card>
                </div>
              </div>
            </section>

            {/* Integration — choose how it looks */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <div className="lg:col-span-5 space-y-6">
                  <div>
                    <h2 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight text-ink mb-3">
                      {t('public.integration.heading', 'Elige cómo se ve en tu producto')}
                    </h2>
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {t('public.integration.desc', 'El mismo motor, la misma seguridad y las mismas citas. Solo cambia el contenedor.')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-elevated border border-line rounded-sm w-fit">
                    {[
                      { id: 'widget' as const, label: t('public.integration.tab_widget', 'Widget flotante') },
                      { id: 'panel' as const, label: t('public.integration.tab_panel', 'Panel lateral') },
                      { id: 'fullscreen' as const, label: t('public.integration.tab_full', 'Pantalla completa') },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setIntegrationTab(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                          integrationTab === tab.id
                            ? 'bg-ink text-surface'
                            : 'text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-ink">
                        {integrationTab === 'widget' && t('public.integration.widget_title')}
                        {integrationTab === 'panel' && t('public.integration.panel_title')}
                        {integrationTab === 'fullscreen' && t('public.integration.full_title')}
                      </h3>
                      <p className="text-xs text-ink-secondary leading-relaxed mt-1">
                        {integrationTab === 'widget' && t('public.integration.widget_desc')}
                        {integrationTab === 'panel' && t('public.integration.panel_desc')}
                        {integrationTab === 'fullscreen' && t('public.integration.full_desc')}
                      </p>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-line">
                      {[
                        { title: t('public.integration.feature_perms'), desc: t('public.integration.feature_perms_desc') },
                        { title: t('public.integration.feature_analytics'), desc: t('public.integration.feature_analytics_desc') },
                        { title: t('public.integration.feature_theme'), desc: t('public.integration.feature_theme_desc') },
                      ].map((feat, i) => (
                        <div key={i} className="flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-ink">{feat.title}</div>
                            <div className="text-2xs text-ink-secondary">{feat.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  <div className="bg-elevated border border-line rounded-md p-3 lg:p-4">
                    <div className="bg-surface border border-line rounded-sm overflow-hidden shadow-sm">
                      <div className="h-9 px-3 bg-canvas border-b border-line flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-line" />
                          <div className="w-3 h-3 rounded-full bg-line" />
                          <div className="w-3 h-3 rounded-full bg-line" />
                        </div>
                        <div className="text-2xs font-mono text-ink-muted">app.tuproducto.com</div>
                        <div className="w-16" />
                      </div>

                      <div className="p-4 min-h-[280px] flex">
                        {integrationTab === 'widget' && (
                          <div className="ml-auto mt-auto relative">
                            <div className="w-[280px] bg-surface border border-line rounded-sm shadow-lg overflow-hidden">
                              <div className="px-3 py-2 bg-elevated border-b border-line flex items-center gap-2">
                                <div className="w-5 h-5 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-2xs">OK</div>
                                <span className="text-xs font-semibold">OKEng</span>
                                <span className="ml-auto text-2xs text-success">En línea</span>
                              </div>
                              <div className="p-3 space-y-2">
                                <div className="text-xs bg-ink text-surface rounded-sm px-2.5 py-1.5 w-fit ml-auto">¿Cómo configuro SSO?</div>
                                <div className="text-xs bg-canvas border border-line rounded-sm p-2 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-success" />
                                  <span className="text-2xs">✓ fuente verificada</span>
                                </div>
                                <div className="h-8 bg-canvas border border-line rounded-sm flex items-center px-2 text-2xs text-ink-muted">
                                  Haz una pregunta…
                                </div>
                              </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-ink rounded-full flex items-center justify-center text-surface">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        {integrationTab === 'panel' && (
                          <div className="flex w-full gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-subtle rounded-xs w-3/4" />
                              <div className="h-3 bg-subtle rounded-xs w-full" />
                              <div className="h-3 bg-subtle rounded-xs w-5/6" />
                              <div className="h-20 bg-subtle rounded-xs w-full mt-4" />
                            </div>
                            <div className="w-[200px] border-l border-line pl-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-2xs">OK</div>
                                <span className="text-xs font-semibold">Ayuda</span>
                              </div>
                              <div className="h-3 bg-subtle rounded-xs w-full" />
                              <div className="h-16 bg-canvas border border-line rounded-sm" />
                            </div>
                          </div>
                        )}
                        {integrationTab === 'fullscreen' && (
                          <div className="w-full space-y-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-xs">OK</div>
                              <span className="text-sm font-semibold">Centro de ayuda</span>
                              <div className="ml-auto flex gap-1">
                                <div className="px-2 py-1 bg-accent text-white rounded-xs text-2xs">Preguntas</div>
                                <div className="px-2 py-1 bg-subtle rounded-xs text-2xs">Docs</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-1 space-y-2">
                                <div className="h-3 bg-subtle rounded-xs" />
                                <div className="h-3 bg-subtle rounded-xs w-5/6" />
                                <div className="h-3 bg-subtle rounded-xs w-3/4" />
                              </div>
                              <div className="col-span-2 border border-line rounded-sm p-3 space-y-2">
                                <div className="h-4 bg-ink rounded-xs w-1/2" />
                                <div className="h-3 bg-subtle rounded-xs w-full" />
                                <div className="h-3 bg-subtle rounded-xs w-5/6" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Developers — 3 lines of code */}
            <section id="desarrolladores" className="bg-ink text-surface">
              <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface/10 border border-surface/15 text-2xs font-mono text-surface/70 mb-3">
                        <Code2 className="w-3 h-3" />
                        Para desarrolladores
                      </div>
                      <h2 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight mb-3">
                        {t('public.dev.heading', 'Tres líneas de código. Cero infraestructura.')}
                      </h2>
                      <p className="text-sm text-surface/60 leading-relaxed">
                        {t('public.dev.desc', 'Empotra el conocimiento donde ya está tu producto. Sin servidores de vectores que mantener, sin pipelines, sin sorpresas en la factura de la nube.')}
                      </p>
                    </div>

                    <ul className="space-y-3 text-sm text-surface/70">
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{t('public.dev.bullet_api')}</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{t('public.dev.bullet_webhooks')}</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{t('public.dev.bullet_byok')}</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        <span>{t('public.dev.bullet_deploy')}</span>
                      </li>
                    </ul>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('docs')}
                        className="px-4 py-2 bg-surface text-ink rounded-sm text-xs font-medium hover:bg-surface/90 cursor-pointer"
                      >
                        {t('public.dev.read_docs')}
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToSection('faq')}
                        className="px-4 py-2 bg-surface/10 border border-surface/20 text-surface rounded-sm text-xs font-medium hover:bg-surface/15 cursor-pointer"
                      >
                        {t('public.dev.view_faq')}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="bg-[#0F0F0F] border border-surface/10 rounded-md overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface/10 bg-surface/5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-danger/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                            <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                          </div>
                          <span className="ml-3 text-xs font-mono text-surface/50">{t('public.dev.code_file')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-2xs font-mono text-surface/40">
                            <span className="px-1.5 py-0.5 bg-surface/10 rounded-xs">React</span>
                            <span className="px-1.5 py-0.5 bg-surface/10 rounded-xs">HTML</span>
                            <span className="px-1.5 py-0.5 bg-surface/10 rounded-xs">cURL</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(codeSnippet);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 1500);
                            }}
                            className="ml-2 px-2 py-1 bg-surface/10 hover:bg-surface/15 rounded-xs text-2xs font-mono text-surface/70 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedCode ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto">
                        <pre className="text-surface/80">
                          <code>{codeSnippet}</code>
                        </pre>
                      </div>

                      <div className="px-4 py-2 bg-success/10 border-t border-success/20 flex items-center gap-3 text-2xs font-mono">
                        <span className="text-success flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                          {t('public.dev.code_ok')}
                        </span>
                        <span className="text-surface/50">{t('public.dev.code_cited')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
              <div className="max-w-3xl mb-10">
                <h2 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight text-ink mb-3">
                  {t('public.testimonials.heading')}
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {t('public.testimonials.desc')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    metric: t('public.testimonials.t1_metric'),
                    quote: t('public.testimonials.t1_quote'),
                    author: t('public.testimonials.t1_author'),
                    role: t('public.testimonials.t1_role'),
                    initials: 'MI',
                  },
                  {
                    metric: t('public.testimonials.t2_metric'),
                    quote: t('public.testimonials.t2_quote'),
                    author: t('public.testimonials.t2_author'),
                    role: t('public.testimonials.t2_role'),
                    initials: 'DS',
                  },
                  {
                    metric: t('public.testimonials.t3_metric'),
                    quote: t('public.testimonials.t3_quote'),
                    author: t('public.testimonials.t3_author'),
                    role: t('public.testimonials.t3_role'),
                    initials: 'LF',
                  },
                ].map((testi, i) => (
                  <div key={i} className="bg-surface border border-line rounded-sm p-5 space-y-4">
                    <div className="text-sm font-semibold text-ink">{testi.metric}</div>
                    <div className="relative">
                      <Quote className="w-4 h-4 text-line-strong absolute -top-1 -left-1" />
                      <p className="text-xs text-ink-secondary leading-relaxed pl-4">“{testi.quote}”</p>
                    </div>
                    <div className="flex items-center gap-2.5 pt-2 border-t border-line">
                      <div className="w-7 h-7 rounded-full bg-ink text-surface flex items-center justify-center text-2xs font-mono font-semibold">
                        {testi.initials}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-ink">{testi.author}</div>
                        <div className="text-2xs text-ink-secondary">{testi.role}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-elevated border border-line rounded-full text-2xs font-mono text-ink-secondary">
                  <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                  {t('public.testimonials.stats')}
                </span>
              </div>
            </section>

            {/* Pricing */}
            <section id="precios" className="bg-elevated border-y border-line">
              <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
                  <div className="max-w-xl">
                    <h2 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight text-ink mb-3">
                      {t('public.pricing.heading')}
                    </h2>
                    <p className="text-sm text-ink-secondary leading-relaxed">
                      {t('public.pricing.desc')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-surface border border-line rounded-sm">
                      <button
                        type="button"
                        onClick={() => setPricingAnnual(false)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xs cursor-pointer ${
                          !pricingAnnual ? 'bg-ink text-surface' : 'text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {t('public.pricing.monthly')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPricingAnnual(true)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-xs cursor-pointer flex items-center gap-1.5 ${
                          pricingAnnual ? 'bg-ink text-surface' : 'text-ink-secondary hover:text-ink'
                        }`}
                      >
                        {t('public.pricing.annual')}
                        <span className="px-1 py-0.5 bg-success text-white rounded-xs text-2xs">{t('public.pricing.discount')}</span>
                      </button>
                    </div>
                    <span className="text-2xs text-ink-muted font-mono">{t('public.pricing.note')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Starter */}
                  <div className="bg-surface border border-line rounded-sm p-6 flex flex-col">
                    <div className="space-y-1 mb-5">
                      <h3 className="text-sm font-semibold text-ink">{t('public.pricing.starter_name')}</h3>
                      <p className="text-xs text-ink-secondary">{t('public.pricing.starter_desc')}</p>
                      <div className="pt-2">
                        <span className="text-2xl font-semibold tracking-tight text-ink">{t('public.pricing.starter_price')}</span>
                      </div>
                      <p className="text-2xs text-ink-muted">{t('public.pricing.starter_sub')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigatePublicPage('signup')}
                      className="w-full py-2 bg-surface border border-line rounded-sm text-xs font-medium text-ink hover:bg-subtle cursor-pointer"
                    >
                      {t('public.pricing.starter_cta')}
                    </button>
                    <ul className="mt-6 space-y-2 text-xs text-ink-secondary">
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.starter_f1')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.starter_f2')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.starter_f3')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.starter_f4')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.starter_f5')}</li>
                    </ul>
                  </div>

                  {/* Pro — popular */}
                  <div className="bg-ink text-surface border border-ink rounded-sm p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-surface text-ink rounded-full text-2xs font-semibold">
                      {t('public.pricing.pro_popular')}
                    </div>
                    <div className="space-y-1 mb-5">
                      <h3 className="text-sm font-semibold">{t('public.pricing.pro_name')}</h3>
                      <p className="text-xs text-surface/60">{t('public.pricing.pro_desc')}</p>
                      <div className="pt-2">
                        <span className="text-2xl font-semibold tracking-tight">{pricingAnnual ? t('public.pricing.pro_price') : '39€/mes'}</span>
                      </div>
                      <p className="text-2xs text-surface/50">{t('public.pricing.pro_sub')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigatePublicPage('signup')}
                      className="w-full py-2 bg-surface text-ink rounded-sm text-xs font-medium hover:bg-surface/90 cursor-pointer"
                    >
                      {t('public.pricing.pro_cta')}
                    </button>
                    <ul className="mt-6 space-y-2 text-xs text-surface/70">
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f1')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f2')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f3')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f4')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f5')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f6')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.pro_f7')}</li>
                    </ul>
                  </div>

                  {/* Scale */}
                  <div className="bg-surface border border-line rounded-sm p-6 flex flex-col">
                    <div className="space-y-1 mb-5">
                      <h3 className="text-sm font-semibold text-ink">{t('public.pricing.scale_name')}</h3>
                      <p className="text-xs text-ink-secondary">{t('public.pricing.scale_desc')}</p>
                      <div className="pt-2">
                        <span className="text-2xl font-semibold tracking-tight text-ink">{t('public.pricing.scale_price')}</span>
                      </div>
                      <p className="text-2xs text-ink-muted">{t('public.pricing.scale_sub')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigatePublicPage('contact')}
                      className="w-full py-2 bg-ink text-surface rounded-sm text-xs font-medium hover:bg-ink/90 cursor-pointer"
                    >
                      {t('public.pricing.scale_cta')}
                    </button>
                    <ul className="mt-6 space-y-2 text-xs text-ink-secondary">
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.scale_f1')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.scale_f2')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.scale_f3')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.scale_f4')}</li>
                      <li className="flex gap-2"><Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />{t('public.pricing.scale_f5')}</li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 bg-surface border border-line rounded-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-ink">{t('public.pricing.bottom_title')}</div>
                    <div className="text-2xs text-ink-secondary">{t('public.pricing.bottom_desc')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigatePublicPage('contact')}
                    className="px-4 py-2 bg-surface border border-line rounded-sm text-xs font-medium text-ink hover:bg-subtle cursor-pointer whitespace-nowrap"
                  >
                    {t('public.pricing.bottom_cta')}
                  </button>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5 space-y-4">
                  <h2 className="font-sans text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
                    {t('public.faq.heading')}
                  </h2>
                  <p className="text-sm text-ink-secondary leading-relaxed">
                    {t('public.faq.desc')}
                  </p>
                  <Card padding="md" className="bg-elevated">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-ink text-surface flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-ink">{t('public.faq.contact')}</div>
                        <div className="text-2xs text-ink-secondary leading-relaxed">{t('public.faq.contact_desc')}</div>
                        <a href="mailto:hola@okeng.com" className="inline-flex mt-2 text-xs font-medium text-accent hover:underline">
                          hola@okeng.com
                        </a>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-7 space-y-2">
                  {[
                    { q: t('public.faq.q1'), a: t('public.faq.a1') },
                    { q: t('public.faq.q2'), a: t('public.faq.a2') },
                    { q: t('public.faq.q3'), a: t('public.faq.a3') },
                    { q: t('public.faq.q4'), a: t('public.faq.a4') },
                    { q: t('public.faq.q5'), a: t('public.faq.a5') },
                    { q: t('public.faq.q6'), a: t('public.faq.a6') },
                  ].map((item, idx) => {
                    const id = `faq-${idx}`;
                    const isOpen = openFaq === id;
                    return (
                      <div key={id} className="border border-line rounded-sm bg-surface overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenFaq(isOpen ? null : id)}
                          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left cursor-pointer hover:bg-elevated transition-colors"
                        >
                          <span className="text-sm font-medium text-ink">{item.q}</span>
                          <ChevronDown className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4 text-xs text-ink-secondary leading-relaxed border-t border-line bg-canvas">
                            <div className="pt-3">{item.a}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Final CTA + Spec bottom CTA */}
            <section className="bg-ink text-surface">
              <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  <div className="lg:col-span-7 space-y-5">
                    <h2 className="font-sans text-[2rem] font-semibold leading-tight tracking-tight">
                      {t('public.final.heading', 'Empieza a responder en minutos')}
                    </h2>
                    <p className="text-sm text-surface/60 leading-relaxed max-w-xl">
                      {t('public.final.desc')}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('signup')}
                        className="px-5 py-2.5 bg-surface text-ink rounded-sm text-sm font-medium hover:bg-surface/90 cursor-pointer"
                      >
                        {t('public.final.cta_primary')}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('docs')}
                        className="px-5 py-2.5 bg-surface/10 border border-surface/20 text-surface rounded-sm text-sm font-medium hover:bg-surface/15 cursor-pointer"
                      >
                        {t('public.final.cta_secondary')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2 text-2xs font-mono text-surface/50">
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{t('public.final.bullet1')}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{t('public.final.bullet2')}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{t('public.final.bullet3')}</span>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <Card padding="lg" className="bg-surface text-ink flex flex-col gap-4">
                      <div className="space-y-1">
                        <Text as="h3" variant="body" className="font-semibold">
                          {t('public.bottom_cta.title')}
                        </Text>
                        <Text as="p" variant="caption" tone="secondary">
                          {t('public.bottom_cta.desc')}
                        </Text>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {currentUser && onNavigatePath && (
                          <Button
                            variant="secondary"
                            onClick={() =>
                              onNavigatePath('/workspaces/okeng/test?embedId=EMB-PUBLIC-HOME')
                            }
                          >
                            <span>{t('public.bottom_cta.test_console', 'Verify in Test Console')}</span>
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          onClick={() =>
                            currentUser ? onEnterWorkspace('okeng') : navigatePublicPage('login')
                          }
                        >
                          <span>{t('public.bottom_cta.button')}</span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </section>

            {/* Floating Conversational Guided Tour (EMB-PUBLIC-HOME) */}
            <HomepageGuidedTour
              openFromHeroRequest={heroTourOpenRequest}
              heroButtonRef={heroTourButtonRef}
              onSelectCitationSlug={handleCitationNavigate}
              onNavigateUrl={handleEmbedNavigateUrl}
            />
          </div>
        )}

        {/* ============================================================
            PAGE-PUB-02: About Page (/about)
        ============================================================ */}
        {page === 'about' && (
          <div className="space-y-8 py-4">
            <div className="space-y-1">
              <Text as="h1" variant="h1">
                {t('public.about.title')}
              </Text>
              <Text as="p" variant="caption" tone="secondary">
                {t('public.about.desc')}
              </Text>
            </div>

            <div className="space-y-6">
              {publicProductArticles.slice(0, 2).map((doc) => (
                <DocArticleRenderer
                  key={doc.id}
                  document={doc}
                  onEditInWorkspace={handleEditInWorkspace}
                />
              ))}
            </div>

            <DogfoodInlineBot
              embedId="EMB-PUBLIC-HOME"
              title={t('public.about.bot_title')}
              suggestedQuestions={[
                'What is OKEng?',
                'How does OKEng differ from a normal documentation site?',
              ]}
              onSelectCitationSlug={handleCitationNavigate}
            />
          </div>
        )}

        {/* ============================================================
            PAGE-PUB-03, 04, 05: Legal Pages (/terms, /privacy, /acceptable-use)
        ============================================================ */}
        {(page === 'terms' || page === 'privacy' || page === 'acceptable-use') && (
          <div className="space-y-8 py-4">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <Text as="h1" variant="h1">
                  {page === 'terms' && t('public.legal.terms')}
                  {page === 'privacy' && t('public.legal.privacy')}
                  {page === 'acceptable-use' && t('public.legal.acceptable_use')}
                </Text>
              </div>

              <SegmentedTabs
                size="sm"
                activeId={page}
                onChange={(val) => navigatePublicPage(val as PublicPageType)}
                options={[
                  { id: 'terms', label: t('public.legal.terms') },
                  { id: 'privacy', label: t('public.legal.privacy') },
                  { id: 'acceptable-use', label: t('public.legal.acceptable_use') },
                ]}
              />
            </div>

            {/* Authoritative Non-LLM Legal Document Rendering */}
            <DocArticleRenderer
              document={store.getDocumentByFilename(`${page}.md`)}
              onEditInWorkspace={handleEditInWorkspace}
            />

            {/* Contextual Legal Retrieval Assistant (EMB-PUBLIC-LEGAL -> COL-LEGAL) */}
            <DogfoodInlineBot
              embedId="EMB-PUBLIC-LEGAL"
              title={t('public.legal.bot_title')}
              subtitle={t('public.legal.bot_subtitle')}
              suggestedQuestions={[
                'What does the privacy policy say about uploaded files?',
                'Does OKEng store customer passwords or session cookies?',
                'Who retains ownership of uploaded workspace documents?',
              ]}
              onSelectCitationSlug={handleCitationNavigate}
            />
          </div>
        )}

        {/* ============================================================
            PAGE-PUB-06 & 07: Documentation Index & Articles (/docs, /docs/:slug)
        ============================================================ */}
        {page === 'docs' && (
          <div className="space-y-6 py-2">
            {/* Docs Header & Dogfood Retrieval Search Bar (PUBLIC-01 §20, §22) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <Text as="h1" variant="h2">
                  {t('public.docs.title')}
                </Text>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-3 z-10 pointer-events-none" />
                <Input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (containsUnsafePayload(val)) {
                      setDocSearchError(t('validation.unsafe_input'));
                      setDocSearchQuery(sanitizePlainText(val, 120));
                    } else {
                      setDocSearchError(null);
                      setDocSearchQuery(val.slice(0, 120));
                    }
                  }}
                  placeholder={t('public.docs.search_placeholder')}
                  hint={t('public.docs.search_hint')}
                  error={docSearchError || undefined}
                  aria-label="Search documentation"
                  className="pl-8 bg-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              {/* Left Collapsible Collection Sidebar (CO-DOCUMENT-NAV) */}
              <aside className="md:sticky md:top-6">
                <DocumentNav
                  groups={docNavGroups}
                  activeItemId={selectedDocSlug}
                  onSelectItem={(slug) => navigatePublicPage('docs', slug)}
                />
              </aside>

              {/* Main Article + Documentation Chat */}
              <div className="md:col-span-3 space-y-6">
                {activeWorkspaceDoc ? (
                  <DocArticleRenderer
                    document={activeWorkspaceDoc}
                    onEditInWorkspace={handleEditInWorkspace}
                  />
                ) : isSpecDoc ? (
                  <DocArticleRenderer
                    rawMarkdown={specContent}
                    sourceLabel={`docs/${selectedDocSlug}.md`}
                  />
                ) : (
                  <DocArticleRenderer
                    document={store.getDocumentByFilename('getting-started')}
                    onEditInWorkspace={handleEditInWorkspace}
                  />
                )}

                {/* Documentation Embedded Assistant (EMB-PUBLIC-DOCS -> COL-DOCS) */}
                <DogfoodInlineBot
                  embedId="EMB-PUBLIC-DOCS"
                  title={t('public.docs.bot_title')}
                  subtitle={t('public.docs.bot_subtitle')}
                  suggestedQuestions={[
                    'What is the fastest way to get started?',
                    'How do I restrict a collection to employees?',
                    'Where do I invite team members?',
                  ]}
                  onSelectCitationSlug={handleCitationNavigate}
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            PAGE-PUB-08: Contact Page (/contact)
        ============================================================ */}
        {page === 'contact' && (
          <Card padding="lg" className="max-w-lg mx-auto space-y-5 my-6">
            <div>
              <Text as="h1" variant="h2">
                {t('public.contact.title')}
              </Text>
              <Text as="p" variant="caption" tone="secondary" className="mt-0.5">
                {t('public.contact.desc')}
              </Text>
            </div>

            {contactSent && (
              <Box
                surface="elevated"
                padding="sm"
                className="bg-success-subtle border-success/30 flex items-center gap-2 text-xs text-success"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                <span>{t('public.contact.sent')}</span>
              </Box>
            )}

            <form onSubmit={handleContactSubmit} noValidate className="space-y-4">
              <Input
                label={t('public.contact.name')}
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  if (contactErrors.name) {
                    setContactErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="Alex Rivera"
                hint={t('public.contact.name_hint')}
                error={contactErrors.name}
                disabled={isContactSubmitting}
                required
              />
              <Input
                label={t('public.contact.email')}
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (contactErrors.email) {
                    setContactErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="alex@company.com"
                hint={t('public.contact.email_hint')}
                error={contactErrors.email}
                disabled={isContactSubmitting}
                required
              />
              <Textarea
                label={t('public.contact.message')}
                rows={4}
                value={contactMessage}
                onChange={(e) => {
                  setContactMessage(e.target.value);
                  if (contactErrors.message) {
                    setContactErrors((prev) => ({ ...prev, message: undefined }));
                  }
                }}
                placeholder={t('public.contact.message_placeholder')}
                hint={t('public.contact.message_hint')}
                error={contactErrors.message}
                disabled={isContactSubmitting}
                required
              />
              <Button variant="primary" type="submit" isLoading={isContactSubmitting}>
                {t('public.contact.send')}
              </Button>
            </form>
          </Card>
        )}

        {/* ============================================================
            Authentication Surface (/login, /signup, /forgot-password)
        ============================================================ */}
        {(page === 'login' || page === 'signup' || page === 'forgot-password') && (
          <Card padding="lg" className="max-w-md mx-auto space-y-6 my-6">
            {authRedirectMessage && (
              <Box
                surface="elevated"
                padding="sm"
                className="bg-warning-subtle border-warning/30 text-xs text-warning font-mono"
              >
                {authRedirectMessage}
              </Box>
            )}

            <div>
              <Text as="h1" variant="h2">
                {page === 'login' && t('public.auth.login_title')}
                {page === 'signup' && t('public.auth.signup_title')}
                {page === 'forgot-password' &&
                  t('public.auth.reset_title', 'Reset your OKEng password')}
              </Text>
              <Text as="p" variant="caption" tone="secondary" className="mt-0.5">
                {page === 'forgot-password'
                  ? t(
                      'public.auth.reset_desc',
                      'Enter the email address associated with your account and we will send a password recovery link.'
                    )
                  : t('public.auth.desc')}
              </Text>
            </div>

            {page === 'forgot-password' ? (
              <div className="space-y-4">
                {recoverySent ? (
                  <Box
                    surface="elevated"
                    padding="sm"
                    className="bg-success-subtle border-success/30 flex items-start gap-2 text-xs text-success"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-success" />
                    <span>
                      {t(
                        'public.auth.reset_sent',
                        'If an account exists for that email address, we have sent password recovery instructions.'
                      )}
                    </span>
                  </Box>
                ) : (
                  <form onSubmit={handleRecoverySubmit} noValidate className="space-y-4">
                    <Input
                      label={t('public.auth.email')}
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      placeholder={t('public.auth.email_placeholder', 'you@company.com')}
                      hint={t('public.auth.reset_email_hint')}
                      error={emailError || undefined}
                      disabled={isAuthSubmitting}
                      required
                    />
                    <Button
                      variant="primary"
                      type="submit"
                      isLoading={isAuthSubmitting}
                      className="w-full justify-center"
                    >
                      {t('public.auth.reset_submit', 'Send Recovery Link')}
                    </Button>
                  </form>
                )}

                <div className="border-t border-line pt-4">
                  <button
                    type="button"
                    onClick={() => navigatePublicPage('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-secondary hover:text-ink cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t('public.auth.back_to_login', 'Back to Sign In')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                  <Input
                    label={t('public.auth.email')}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder={t('public.auth.email_placeholder', 'you@company.com')}
                    hint={t('public.auth.email_hint')}
                    error={emailError || undefined}
                    disabled={isAuthSubmitting}
                    required
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="auth-password-input" className="block text-xs font-medium text-ink">
                        <span>{t('public.auth.password')}</span>
                        <span className="text-danger ml-0.5" aria-hidden="true">
                          *
                        </span>
                      </label>
                      {page === 'login' && (
                        <button
                          type="button"
                          onClick={() => navigatePublicPage('forgot-password')}
                          className="text-xs font-medium text-accent hover:underline cursor-pointer"
                        >
                          {t('public.auth.forgot_password', 'Forgot password?')}
                        </button>
                      )}
                    </div>
                    <Input
                      id="auth-password-input"
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError(null);
                      }}
                      placeholder={t('public.auth.password_placeholder', '••••••••••••')}
                      hint={
                        page === 'signup'
                          ? t('public.auth.password_signup_hint')
                          : t('public.auth.password_login_hint')
                      }
                      error={passwordError || undefined}
                      disabled={isAuthSubmitting}
                      required
                    />
                  </div>

                  {page === 'signup' && (
                    <Checkbox
                      id="signup-tos-checkbox"
                      checked={acceptedTos}
                      onChange={(nextVal) => {
                        setAcceptedTos(nextVal);
                        if (nextVal) setTosError(null);
                      }}
                      required
                      disabled={isAuthSubmitting}
                      error={tosError || undefined}
                      label={
                        <span>
                          {t('public.auth.tos_agree_prefix', 'I have read and agree to the')}{' '}
                          <button
                            type="button"
                            onClick={() => navigatePublicPage('terms')}
                            className="text-ink font-medium underline hover:text-accent cursor-pointer"
                          >
                            {t('public.legal.terms', 'Terms of Service')}
                          </button>{' '}
                          {t('public.auth.and', 'and')}{' '}
                          <button
                            type="button"
                            onClick={() => navigatePublicPage('privacy')}
                            className="text-ink font-medium underline hover:text-accent cursor-pointer"
                          >
                            {t('public.legal.privacy', 'Privacy Policy')}
                          </button>
                          .
                        </span>
                      }
                    />
                  )}

                  <Button
                    variant="primary"
                    type="submit"
                    isLoading={isAuthSubmitting}
                    className="w-full justify-center"
                  >
                    {page === 'login'
                      ? t('public.auth.login_submit')
                      : t('public.auth.signup_submit')}
                  </Button>

                  {page === 'login' && (
                    <p className="text-2xs text-ink-secondary leading-relaxed text-center pt-1">
                      {t(
                        'public.auth.login_legal_prefix',
                        'By signing in, you agree to the OKEng'
                      )}{' '}
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('terms')}
                        className="text-ink font-medium underline hover:text-accent cursor-pointer"
                      >
                        {t('public.legal.terms', 'Terms of Service')}
                      </button>{' '}
                      {t('public.auth.and', 'and')}{' '}
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('privacy')}
                        className="text-ink font-medium underline hover:text-accent cursor-pointer"
                      >
                        {t('public.legal.privacy', 'Privacy Policy')}
                      </button>
                      .
                    </p>
                  )}
                </form>

                <div className="border-t border-line pt-4 flex items-center justify-between text-xs text-ink-secondary">
                  {page === 'login' ? (
                    <>
                      <span>{t('public.auth.no_account', "Don't have an account?")}</span>
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('signup')}
                        className="font-medium text-ink hover:text-accent underline cursor-pointer"
                      >
                        {t('public.auth.create_account_link', 'Create an account')}
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{t('public.auth.have_account', 'Already have an account?')}</span>
                      <button
                        type="button"
                        onClick={() => navigatePublicPage('login')}
                        className="font-medium text-ink hover:text-accent underline cursor-pointer"
                      >
                        {t('public.auth.sign_in_link', 'Sign in')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}
      </main>

      {/* Canonical Public Footer (CO-PUBLIC-FOOTER / PUBLIC-01 §28) */}
      <footer className="border-t border-line bg-surface px-6 lg:px-8 py-10 mt-0 shrink-0">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.product')}
            </Text>
            <ul className="space-y-2 text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('landing')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.overview')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleCitationNavigate('security-overview')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.security')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('producto')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Producto' : 'Product'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('precios')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Precios' : 'Pricing'}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.resources')}
            </Text>
            <ul className="space-y-2 text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('docs')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.documentation')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('contact')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.contact')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollToSection('como-funciona')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {language === 'es' ? 'Cómo funciona' : 'How it works'}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.company')}
            </Text>
            <ul className="space-y-2 text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('about')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.nav.about')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    currentUser ? onEnterWorkspace('okeng') : navigatePublicPage('login')
                  }
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.workspace_console')}
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.legal')}
            </Text>
            <ul className="space-y-2 text-ink-secondary">
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('terms')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.terms')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('privacy')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.privacy')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigatePublicPage('acceptable-use')}
                  className="hover:text-ink hover:underline underline-offset-4 transition-colors cursor-pointer"
                >
                  {t('public.footer.acceptable_use')}
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 mt-8 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            onClick={() => navigatePublicPage('landing')}
            className="inline-flex items-center gap-2 cursor-pointer"
          >
            <span className="w-6 h-6 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-xs font-semibold">
              OK
            </span>
            <span className="font-sans font-semibold text-sm tracking-tight text-ink">
              OKEng
            </span>
            <span className="ml-2 text-2xs font-mono text-ink-muted hidden sm:inline">
              Tu conocimiento. Dentro de tu producto. Desde el primer día.
            </span>
          </span>
          <div className="flex items-center gap-3 text-2xs font-mono text-ink-muted">
            <span>Gratis hasta 1.000 consultas</span>
            <span>·</span>
            <span>Sin tarjeta · Listo en 5 minutos</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
