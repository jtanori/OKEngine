import React, { useState, useEffect, useMemo } from 'react';
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
import {
  DogfoodInlineBot,
  HostSimulatedIdentity,
} from '../components/public/DogfoodInlineBot';
import { DocArticleRenderer } from '../components/public/DocArticleRenderer';
import {
  getEmbedCollectionIds,
  resolveEmbedAuthorization,
  clearanceLabelToEmbedIdentity,
} from '../services/embedAuthorization';
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

  // Homepage Dogfooding Host Environment Inputs (PAGE-PUB-01 / PUBLIC-01 & PUBLIC-02)
  const [homeIdentityMode, setHomeIdentityMode] =
    useState<HostSimulatedIdentity>('anonymous');
  const [homeContextRoute, setHomeContextRoute] = useState<
    '/' | '/docs/embedding' | '/docs/access-control'
  >('/');
  const [activeHomeQuestion, setActiveHomeQuestion] = useState<string | null>(null);
  const [externalHomeTrigger, setExternalHomeTrigger] = useState<{
    question: string;
    nonce: number;
  } | null>(null);

  const currentUser = authService.getCurrentUser();
  const isAuthenticated = Boolean(currentUser);
  const personas = authService.getPersonas();

  // Derive Homepage Embed pre-retrieval collection eligibility directly from resolveEmbedAuthorization
  const homeEmbed = store.getPublicEmbed('EMB-PUBLIC-HOME');
  const allWorkspaceCollections = store.getCollections();
  const homeEmbedCollectionIds = useMemo(
    () => getEmbedCollectionIds(homeEmbed),
    [homeEmbed]
  );
  const homeResolvedIdentity = useMemo(
    () =>
      clearanceLabelToEmbedIdentity(
        homeIdentityMode === 'admin'
          ? 'admin'
          : homeIdentityMode === 'member'
          ? 'member'
          : 'anonymous'
      ),
    [homeIdentityMode]
  );
  const homeAuthorizationScope = useMemo(
    () =>
      resolveEmbedAuthorization(
        homeResolvedIdentity,
        homeEmbedCollectionIds,
        allWorkspaceCollections
      ),
    [homeResolvedIdentity, homeEmbedCollectionIds, allWorkspaceCollections]
  );
  const homeAuthorizedSet = useMemo(
    () => new Set(homeAuthorizationScope.collectionIds),
    [homeAuthorizationScope]
  );

  const homeContextLabel = useMemo(() => {
    if (homeContextRoute === '/docs/embedding') {
      return t('public.host.ctx_embeds', 'OKEng / Embeds');
    }
    if (homeContextRoute === '/docs/access-control') {
      return t('public.host.ctx_security', 'OKEng / Access control');
    }
    return t('public.host.ctx_home', 'Homepage · Product overview');
  }, [homeContextRoute, t]);

  const roleSuggestedQuestion = useMemo(() => {
    if (homeIdentityMode === 'admin') {
      return 'How does the pre-retrieval authorization and cache pipeline work?';
    }
    return 'How do I configure customer authentication and host context?';
  }, [homeIdentityMode]);

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
  // 1. Product Guides (COL-DOCS) — for everyone, first item (expanded by default)
  // 2. Public Product Knowledge (COL-PUBLIC) — for everyone (collapsed by default)
  // 3. Legal & Trust Policies (COL-LEGAL) — for everyone (collapsed by default)
  // 4. Engineering Specifications (/docs) — ONLY when authenticated (collapsed by default)
  const docNavGroups: DocumentNavGroup[] = useMemo(() => {
    const formatSpecTitle = (slug: string): string => {
      const cleaned = slug
        .replace(/^[A-Z]+-\d+-/i, '')
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

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Canonical Public Navigation (PUBLIC-01 §27) */}
      <header className="h-14 border-b border-line bg-surface px-8 flex items-center justify-between shrink-0">
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

          <nav className="flex items-center gap-6 text-xs font-medium text-ink-secondary">
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
          {/* I18N-001 §36: Public Surface Language Selector (CO-LANGUAGE-SELECTOR) */}
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-8">
        {/* ============================================================
            PAGE-PUB-01: Home Page (/) — Public Product Landing & Dogfooding Showcase
        ============================================================ */}
        {page === 'landing' && (
          <div className="space-y-12 py-6">
            {/* Hero */}
            <section className="max-w-2xl space-y-4">
              <Text as="h1" variant="h1">
                {t('public.hero.title')}
              </Text>
              <Text as="p" variant="body" tone="secondary" className="leading-relaxed">
                {t('public.hero.subtitle')}
              </Text>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={() =>
                    currentUser ? onEnterWorkspace('okeng') : navigatePublicPage('login')
                  }
                >
                  <span>{t('public.hero.cta_start')}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="secondary" onClick={() => navigatePublicPage('docs')}>
                  <BookOpen className="w-4 h-4" />
                  <span>{t('public.hero.cta_docs')}</span>
                </Button>
              </div>
            </section>

            {/* Single Live OKEng Homepage Assistant (EMB-PUBLIC-HOME) + Adjacent Host Environment Bar */}
            <section className="space-y-3">
              <DogfoodInlineBot
                embedId="EMB-PUBLIC-HOME"
                title={t('public.bot.home_title')}
                subtitle={t('public.bot.home_subtitle')}
                hostIdentityMode={homeIdentityMode}
                hostCurrentUrl={homeContextRoute}
                hostContextLabel={homeContextLabel}
                externalTriggerQuestion={externalHomeTrigger}
                onActiveQuestionChange={setActiveHomeQuestion}
                suggestedQuestions={[
                  'What is OKEng?',
                  'How does OKEng work?',
                  'How do Embeds work?',
                  'How does OKEng protect private knowledge?',
                  'How does contextual retrieval work?',
                  '¿Cómo funciona OKEng?',
                ]}
                onSelectCitationSlug={handleCitationNavigate}
                onNavigateUrl={handleEmbedNavigateUrl}
              />

              {/* Adjacent Host Environment Bar (Host-Supplied Identity & Context Controls) */}
              <div className="bg-surface border border-line rounded-sm px-5 py-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Host Identity Switcher */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Text variant="caption" tone="secondary" className="font-medium">
                      {t('public.host.identity_label', 'Identity:')}
                    </Text>
                    <SegmentedTabs<HostSimulatedIdentity>
                      size="xs"
                      variant="ink"
                      ariaLabel={t('public.host.identity_label', 'Identity')}
                      activeId={homeIdentityMode}
                      onChange={(nextMode) => setHomeIdentityMode(nextMode)}
                      options={[
                        {
                          id: 'anonymous',
                          label: t('public.host.identity_visitor', 'Visitor'),
                        },
                        {
                          id: 'member',
                          label: t('public.host.identity_member', 'Member'),
                        },
                        {
                          id: 'admin',
                          label: t('public.host.identity_admin', 'Admin'),
                        },
                      ]}
                    />
                  </div>

                  {/* Host Context Switcher */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Text variant="caption" tone="secondary" className="font-medium">
                      {t('public.host.context_label', 'Context:')}
                    </Text>
                    <SegmentedTabs<'/' | '/docs/embedding' | '/docs/access-control'>
                      size="xs"
                      variant="surface"
                      ariaLabel={t('public.host.context_label', 'Context')}
                      activeId={homeContextRoute}
                      onChange={(nextRoute) => setHomeContextRoute(nextRoute)}
                      options={[
                        {
                          id: '/',
                          label: t('public.host.ctx_home', 'Homepage · Product overview'),
                        },
                        {
                          id: '/docs/embedding',
                          label: t('public.host.ctx_embeds', 'OKEng / Embeds'),
                        },
                        {
                          id: '/docs/access-control',
                          label: t('public.host.ctx_security', 'OKEng / Access control'),
                        },
                      ]}
                    />
                  </div>
                </div>

                {/* Canonical Collection Access Matrix (Derived strictly from resolveEmbedAuthorization) */}
                <div className="pt-2.5 border-t border-line flex flex-wrap items-center justify-between gap-3 text-2xs">
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex flex-wrap items-center gap-2 font-mono"
                  >
                    <span className="text-ink-secondary font-sans">
                      {t('public.host.access_label', 'Accessible collections:')}
                    </span>
                    <span
                      className={
                        homeAuthorizedSet.has('COL-PUBLIC') &&
                        homeAuthorizedSet.has('COL-DOCS')
                          ? 'text-ink font-semibold'
                          : 'text-ink-muted'
                      }
                    >
                      {t('public.host.col_public_docs', 'Public Docs')}{' '}
                      {homeAuthorizedSet.has('COL-PUBLIC') &&
                      homeAuthorizedSet.has('COL-DOCS')
                        ? '✓'
                        : '✗'}
                    </span>
                    <span aria-hidden="true" className="text-ink-muted">
                      ·
                    </span>
                    <span
                      className={
                        homeAuthorizedSet.has('COL-LEGAL')
                          ? 'text-ink font-semibold'
                          : 'text-ink-muted'
                      }
                    >
                      {t('public.host.col_legal', 'Legal')}{' '}
                      {homeAuthorizedSet.has('COL-LEGAL') ? '✓' : '✗'}
                    </span>
                    <span aria-hidden="true" className="text-ink-muted">
                      ·
                    </span>
                    <span
                      className={
                        homeAuthorizedSet.has('COL-CUSTOMER')
                          ? 'text-accent font-semibold'
                          : 'text-ink-muted'
                      }
                    >
                      {t('public.host.col_customer', 'Customer Docs')}{' '}
                      {homeAuthorizedSet.has('COL-CUSTOMER') ? '✓' : '✗'}
                    </span>
                    <span aria-hidden="true" className="text-ink-muted">
                      ·
                    </span>
                    <span
                      className={
                        homeAuthorizedSet.has('COL-INTERNAL')
                          ? 'text-accent font-semibold'
                          : 'text-ink-muted'
                      }
                    >
                      {t('public.host.col_admin', 'Admin Docs')}{' '}
                      {homeAuthorizedSet.has('COL-INTERNAL') ? '✓' : '✗'}
                    </span>
                  </div>

                  {/* Quick Verification Actions for Current Identity */}
                  <div className="flex flex-wrap items-center gap-2">
                    {activeHomeQuestion && (
                      <button
                        type="button"
                        onClick={() =>
                          setExternalHomeTrigger({
                            question: activeHomeQuestion,
                            nonce: Date.now(),
                          })
                        }
                        className="px-2.5 py-1 bg-ink text-surface rounded-xs font-medium hover:bg-ink/90 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t('public.host.rerun_as', 'Re-run question as')}{' '}
                        {homeIdentityMode === 'admin'
                          ? t('public.host.identity_admin', 'Admin')
                          : homeIdentityMode === 'member'
                          ? t('public.host.identity_member', 'Member')
                          : t('public.host.identity_visitor', 'Visitor')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setExternalHomeTrigger({
                          question: roleSuggestedQuestion,
                          nonce: Date.now(),
                        })
                      }
                      className="px-2.5 py-1 bg-elevated hover:bg-subtle border border-line rounded-xs text-ink transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {t('public.host.try_role_q', 'Ask with current access:')}{' '}
                      <span className="font-medium">“{roleSuggestedQuestion}”</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Pipeline Flow: How OKEng Works */}
            <section className="space-y-4">
              <Text as="h2" variant="h3">
                {t('public.pipeline.heading', 'How OKEng works')}
              </Text>
              <Card padding="lg">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1 border-l-2 border-ink pl-3">
                    <Text variant="mono" tone="secondary">
                      {t('public.pipeline.step1_tag')}
                    </Text>
                    <Text variant="caption" className="font-semibold">
                      {t('public.pipeline.step1_title')}
                    </Text>
                    <Text as="p" variant="caption" tone="secondary">
                      {t('public.pipeline.step1_desc')}
                    </Text>
                  </div>
                  <div className="space-y-1 border-l-2 border-ink pl-3">
                    <Text variant="mono" tone="secondary">
                      {t('public.pipeline.step2_tag')}
                    </Text>
                    <Text variant="caption" className="font-semibold">
                      {t('public.pipeline.step2_title')}
                    </Text>
                    <Text as="p" variant="caption" tone="secondary">
                      {t('public.pipeline.step2_desc')}
                    </Text>
                  </div>
                  <div className="space-y-1 border-l-2 border-ink pl-3">
                    <Text variant="mono" tone="secondary">
                      {t('public.pipeline.step3_tag')}
                    </Text>
                    <Text variant="caption" className="font-semibold">
                      {t('public.pipeline.step3_title')}
                    </Text>
                    <Text as="p" variant="caption" tone="secondary">
                      {t('public.pipeline.step3_desc')}
                    </Text>
                  </div>
                  <div className="space-y-1 border-l-2 border-ink pl-3">
                    <Text variant="mono" tone="secondary">
                      {t('public.pipeline.step4_tag')}
                    </Text>
                    <Text variant="caption" className="font-semibold">
                      {t('public.pipeline.step4_title')}
                    </Text>
                    <Text as="p" variant="caption" tone="secondary">
                      {t('public.pipeline.step4_desc')}
                    </Text>
                  </div>
                </div>
              </Card>
            </section>

            {/* Built around your data (PUBLIC-01 §10.1, §14) */}
            <section className="space-y-4">
              <Text as="h2" variant="h3">
                {t('public.pillars.heading')}
              </Text>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="caption" className="font-semibold">
                      {t('public.pillars.files_title')}
                    </Text>
                    <FileText className="w-4 h-4 text-accent" />
                  </div>
                  <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">
                    {t('public.pillars.files_desc')}
                  </Text>
                </Card>
                <Card padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="caption" className="font-semibold">
                      {t('public.pillars.collections_title')}
                    </Text>
                    <FolderKanban className="w-4 h-4 text-accent" />
                  </div>
                  <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">
                    {t('public.pillars.collections_desc')}
                  </Text>
                </Card>
                <Card padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="caption" className="font-semibold">
                      {t('public.pillars.access_title')}
                    </Text>
                    <Lock className="w-4 h-4 text-accent" />
                  </div>
                  <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">
                    {t('public.pillars.access_desc')}
                  </Text>
                </Card>
                <Card padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text variant="caption" className="font-semibold">
                      {t('public.pillars.retrieval_title')}
                    </Text>
                    <Code2 className="w-4 h-4 text-accent" />
                  </div>
                  <Text as="p" variant="caption" tone="secondary" className="leading-relaxed">
                    {t('public.pillars.retrieval_desc')}
                  </Text>
                </Card>
              </div>
            </section>

            {/* Bottom CTA */}
            <Card padding="lg" className="flex flex-wrap items-center justify-between gap-4">
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
      <footer className="border-t border-line bg-surface px-8 py-8 mt-12 shrink-0">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs">
          <div className="space-y-2">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.product')}
            </Text>
            <ul className="space-y-1.5 text-ink-secondary">
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
            </ul>
          </div>

          <div className="space-y-2">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.resources')}
            </Text>
            <ul className="space-y-1.5 text-ink-secondary">
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
            </ul>
          </div>

          <div className="space-y-2">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.company')}
            </Text>
            <ul className="space-y-1.5 text-ink-secondary">
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

          <div className="space-y-2">
            <Text
              as="span"
              variant="mono"
              tone="primary"
              className="block !text-xs font-semibold uppercase tracking-wider"
            >
              {t('public.footer.legal')}
            </Text>
            <ul className="space-y-1.5 text-ink-secondary">
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

        <div className="max-w-5xl mx-auto pt-6 mt-6 border-t border-line flex items-center justify-between">
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
          </span>
        </div>
      </footer>
    </div>
  );
};
