import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import {
  FolderKanban,
  FileText,
  Code2,
  FlaskConical,
  MessageSquare,
  Settings,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Shield,
  LogOut,
  Globe,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { store } from '../services/store';
import { authService } from '../services/auth';
import { useI18n } from '../i18n/I18nContext';
import { LanguageSelector } from './LanguageSelector';
import { Divider } from './ui';

export type AppRoute =
  | 'collections'
  | 'collection-detail'
  | 'files'
  | 'file-edit'
  | 'embed'
  | 'embed-installation'
  | 'test'
  | 'conversations'
  | 'stitch'
  | 'settings'
  | 'widget-preview'
  | 'public-surface'
  | 'public-docs';

export type NavigationContext = 'workspace' | 'resource';
export type SidebarPosture = 'expanded' | 'collapsed';

const SIDEBAR_POSTURE_STORAGE_KEY = 'okeng.shell.sidebarPosture';

function readPersistedSidebarPosture(): SidebarPosture {
  if (typeof window === 'undefined') return 'expanded';
  try {
    const raw = window.localStorage.getItem(SIDEBAR_POSTURE_STORAGE_KEY);
    if (raw === 'collapsed' || raw === 'expanded') {
      return raw;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'expanded';
}

function writePersistedSidebarPosture(posture: SidebarPosture): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SIDEBAR_POSTURE_STORAGE_KEY, posture);
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

export function getNavigationContext(route: AppRoute): NavigationContext {
  if (
    route === 'collection-detail' ||
    route === 'file-edit' ||
    route === 'embed-installation'
  ) {
    return 'resource';
  }
  return 'workspace';
}

export type NavigationGuardFn = (proceed: () => void) => boolean;

export interface AppShellContextValue {
  navigationContext: NavigationContext;
  sidebarPosture: SidebarPosture;
  isSidebarCollapsed: boolean;
  routeReselectTick: number;
  toggleSidebar: () => void;
  setSidebarPosture: (posture: SidebarPosture) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setNavigationContextOverride: (context: NavigationContext | null) => void;
  registerNavigationGuard: (guard: NavigationGuardFn | null) => void;
  requestNavigation: (action: () => void) => void;
}

const AppShellContext = createContext<AppShellContextValue>({
  navigationContext: 'workspace',
  sidebarPosture: 'expanded',
  isSidebarCollapsed: false,
  routeReselectTick: 0,
  toggleSidebar: () => {},
  setSidebarPosture: () => {},
  setSidebarCollapsed: () => {},
  setNavigationContextOverride: () => {},
  registerNavigationGuard: () => {},
  requestNavigation: (action) => action(),
});

export const useAppShell = () => useContext(AppShellContext);

interface AppShellProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute, params?: Record<string, string>) => void;
  children: React.ReactNode;
}

const cleanUserName = (rawName?: string): string =>
  rawName ? rawName.replace(/\s*\(.*\)$/, '').trim() : 'Anonymous';

const getUserInitials = (rawName?: string): string => {
  const cleaned = cleanUserName(rawName);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
};

const getPersonaRoleLabel = (rawName: string): string => {
  const match = rawName.match(/\((.*)\)/);
  if (!match) return 'Member';
  return match[1].replace(/^OKEng\s+/i, '');
};

export const AppShell: React.FC<AppShellProps> = ({
  currentRoute,
  onRouteChange,
  children,
}) => {
  const workspace = store.getWorkspace();
  const { t } = useI18n();
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // ============================================================================
  // DS-SIDEBAR-POSTURE-001:
  // Sidebar posture ('expanded' | 'collapsed') is a persistent application-shell
  // preference independent of route and page archetype.
  //   - navigationContext ('workspace' | 'resource') determines layout geometry
  //     (CO-PAGE-HEADER + 32px axis vs. CO-CHILD-NAVBAR + 24px axis) and MUST NOT
  //     determine, reset, or mutate sidebarPosture.
  //   - Navigation between workspace and resource pages (including Back) preserves
  //     the user's current sidebarPosture.
  //   - Only explicit user interaction with DS-SHELL-TRIGGER changes sidebarPosture.
  // ============================================================================
  const routeNavigationContext = getNavigationContext(currentRoute);
  const [navContextOverride, setNavContextOverride] = useState<NavigationContext | null>(null);
  const navigationContext = navContextOverride ?? routeNavigationContext;
  const [sidebarPosture, setSidebarPostureState] = useState<SidebarPosture>(() =>
    readPersistedSidebarPosture()
  );
  const [routeReselectTick, setRouteReselectTick] = useState(0);
  const navGuardRef = useRef<NavigationGuardFn | null>(null);

  // Reset child-view structural context override when top-level route changes
  // (Never mutates sidebarPosture)
  useEffect(() => {
    setNavContextOverride(null);
  }, [currentRoute]);

  const isSidebarCollapsed = sidebarPosture === 'collapsed';

  const setSidebarPosture = useCallback((nextPosture: SidebarPosture) => {
    setSidebarPostureState(nextPosture);
    writePersistedSidebarPosture(nextPosture);
  }, []);

  const setSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      setSidebarPosture(collapsed ? 'collapsed' : 'expanded');
    },
    [setSidebarPosture]
  );

  const setNavigationContextOverride = useCallback((ctx: NavigationContext | null) => {
    setNavContextOverride(ctx);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarPostureState((prev) => {
      const next: SidebarPosture = prev === 'collapsed' ? 'expanded' : 'collapsed';
      writePersistedSidebarPosture(next);
      return next;
    });
  }, []);

  const registerNavigationGuard = useCallback((guard: NavigationGuardFn | null) => {
    navGuardRef.current = guard;
  }, []);

  const requestNavigation = useCallback((action: () => void) => {
    if (navGuardRef.current) {
      const allowedImmediately = navGuardRef.current(action);
      if (!allowedImmediately) return;
    }
    action();
  }, []);

  const handleGuardedRouteChange = useCallback(
    (route: AppRoute, params?: Record<string, string>) => {
      requestNavigation(() => {
        setRouteReselectTick((tick) => tick + 1);
        onRouteChange(route, params);
      });
    },
    [onRouteChange, requestNavigation]
  );

  const currentUser = authService.getCurrentUser();
  const reqContext = authService.getRequestContext(workspace.slug);
  const personas = authService.getPersonas();
  const mainViewportRef = useRef<HTMLElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainViewportRef.current) {
      mainViewportRef.current.scrollTop = 0;
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentRoute]);

  useEffect(() => {
    if (!isAccountMenuOpen && !isWorkspaceMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isAccountMenuOpen &&
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
      if (
        isWorkspaceMenuOpen &&
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsWorkspaceMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAccountMenuOpen, isWorkspaceMenuOpen]);

  const activeRoleLabel =
    currentUser?.platformRole === 'PLATFORM_ADMIN'
      ? 'Platform Admin'
      : reqContext.workspaceRole === 'WORKSPACE_OWNER'
      ? 'Workspace Owner'
      : 'Workspace Member';

  const navItems = [
    {
      id: 'collections' as AppRoute,
      label: t('nav.collections', 'Collections'),
      icon: FolderKanban,
      count: store.getCollections().length,
    },
    {
      id: 'files' as AppRoute,
      label: t('nav.files', 'Files'),
      icon: FileText,
      count: store.getDocuments().length,
    },
    { id: 'embed' as AppRoute, label: t('nav.embed', 'Embed'), icon: Code2 },
    { id: 'test' as AppRoute, label: t('nav.test', 'Test Console'), icon: FlaskConical },
    {
      id: 'conversations' as AppRoute,
      label: t('nav.conversations', 'Conversations'),
      icon: MessageSquare,
      count: store.getConversations().length,
    },
    { id: 'settings' as AppRoute, label: t('nav.settings', 'Settings & Auth'), icon: Settings },
  ];

  const expandLabel = t('nav.expand_sidebar', 'Expand navigation');
  const collapseLabel = t('nav.collapse_sidebar', 'Collapse navigation');

  return (
    <AppShellContext.Provider
      value={{
        navigationContext,
        sidebarPosture,
        isSidebarCollapsed,
        routeReselectTick,
        toggleSidebar,
        setSidebarPosture,
        setSidebarCollapsed,
        setNavigationContextOverride,
        registerNavigationGuard,
        requestNavigation,
      }}
    >
      <div className="flex h-screen w-screen overflow-hidden bg-canvas text-ink">
        {/* Utilitarian Sidebar (CO-SIDEBAR — DS-SIDEBAR-POSTURE-001): 240px ('expanded') / 56px rail ('collapsed') */}
        <aside
          className={`${
            isSidebarCollapsed ? 'w-14' : 'w-60'
          } shrink-0 border-r border-line bg-surface flex flex-col justify-between select-none relative transition-[width] duration-150 ease-out`}
        >
          <div>
            {/* Top Brand Mark + Collapse/Expand Trigger */}
            <div
              ref={workspaceMenuRef}
              className={`${
                isSidebarCollapsed ? 'p-2.5 flex flex-col items-center' : 'p-4'
              } border-b border-line relative`}
            >
              <div
                className={`flex items-center ${
                  isSidebarCollapsed ? 'justify-center w-full' : 'justify-between'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleGuardedRouteChange('collections')}
                  title={workspace.name}
                  className="flex items-center gap-2 group text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xs"
                >
                  <div className="w-6 h-6 bg-ink rounded-xs flex items-center justify-center text-surface font-mono text-xs font-semibold shrink-0">
                    OK
                  </div>
                  {!isSidebarCollapsed && (
                    <div>
                      <span className="font-semibold text-sm tracking-tight text-ink block">
                        OKEng
                      </span>
                    </div>
                  )}
                </button>

                {/* Collapse / Expand Trigger:
                    - Expanded: Top-right inside sidebar
                    - Collapsed: Same vertical level, 10px outside the right border */}
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={isSidebarCollapsed ? expandLabel : collapseLabel}
                  title={isSidebarCollapsed ? expandLabel : collapseLabel}
                  className={
                    isSidebarCollapsed
                      ? 'absolute top-2.5 left-[calc(100%+10px)] z-30 w-7 h-7 flex items-center justify-center rounded-sm bg-surface border border-line text-ink-secondary hover:text-ink hover:bg-subtle shadow-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                      : 'w-7 h-7 flex items-center justify-center rounded-sm text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
                  }
                >
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  ) : (
                    <PanelLeftClose className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Workspace Selector */}
              <div className={`${isSidebarCollapsed ? 'mt-2.5 w-full' : 'mt-3'} relative`}>
                <button
                  type="button"
                  onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                  title={`${t('nav.authenticated_workspace', 'Workspace')}: ${workspace.name}`}
                  aria-label={`${t('nav.authenticated_workspace', 'Workspace')}: ${workspace.name}`}
                  className={`w-full flex items-center ${
                    isSidebarCollapsed
                      ? 'justify-center p-1.5'
                      : 'justify-between px-2.5 py-1.5'
                  } bg-elevated border border-line rounded-sm text-xs text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                >
                  {isSidebarCollapsed ? (
                    <span className="font-mono text-2xs font-semibold uppercase">WS</span>
                  ) : (
                    <>
                      <span className="font-medium truncate">{workspace.name}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-ink-secondary shrink-0" />
                    </>
                  )}
                </button>

                {isWorkspaceMenuOpen && (
                  <div
                    className={`absolute top-full left-0 ${
                      isSidebarCollapsed ? 'w-56' : 'right-0'
                    } mt-1 bg-surface border border-line rounded-sm shadow-md z-30 p-1 text-xs`}
                  >
                    <div className="px-2 py-1 text-2xs text-ink-secondary font-mono uppercase">
                      {t('nav.authenticated_workspace', 'Authenticated Workspace')}
                    </div>
                    <div className="px-2 py-1 font-medium text-ink bg-subtle rounded-xs">
                      {workspace.name}
                    </div>
                    <Divider className="my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        handleGuardedRouteChange('public-docs');
                      }}
                      className="w-full text-left px-2 py-1 text-accent hover:bg-elevated rounded-xs transition-colors cursor-pointer"
                    >
                      {t('nav.view_public_specs', 'View Documentation & Specs')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsWorkspaceMenuOpen(false);
                        handleGuardedRouteChange('settings');
                      }}
                      className="w-full text-left px-2 py-1 text-ink-secondary hover:text-ink hover:bg-elevated rounded-xs transition-colors cursor-pointer"
                    >
                      {t('nav.manage_settings', 'Manage Workspace Settings')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Links */}
            <nav className={`${isSidebarCollapsed ? 'p-1.5' : 'p-2'} space-y-0.5`}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  currentRoute === item.id ||
                  (item.id === 'collections' && currentRoute === 'collection-detail') ||
                  (item.id === 'files' && currentRoute === 'file-edit') ||
                  (item.id === 'embed' && currentRoute === 'embed-installation');

                const tooltipText =
                  item.count !== undefined ? `${item.label} (${item.count})` : item.label;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={isSidebarCollapsed ? tooltipText : undefined}
                    aria-label={tooltipText}
                    onClick={() => handleGuardedRouteChange(item.id)}
                    className={`w-full flex items-center ${
                      isSidebarCollapsed
                        ? 'justify-center p-2'
                        : 'justify-between px-3 py-1.5'
                    } rounded-sm text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      isActive
                        ? 'bg-ink text-surface'
                        : 'text-ink-secondary hover:text-ink hover:bg-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-surface' : 'text-ink-muted'
                        }`}
                      />
                      {!isSidebarCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isSidebarCollapsed && item.count !== undefined && (
                      <span
                        className={`text-2xs font-mono tabular-nums ${
                          isActive ? 'text-surface/80' : 'text-ink-muted'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Public Surface & Docs Links (AUTH-04 & PUBLIC-01) */}
            <div
              className={`${
                isSidebarCollapsed ? 'px-1.5 pt-2 mx-1' : 'px-2 pt-2 mx-2'
              } border-t border-line space-y-0.5`}
            >
              <button
                type="button"
                title={
                  isSidebarCollapsed ? t('common.public_site', 'Public Website') : undefined
                }
                aria-label={t('common.public_site', 'Public Website')}
                onClick={() => handleGuardedRouteChange('public-surface')}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2 py-1.5'
                } rounded-sm text-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-accent shrink-0" />
                  {!isSidebarCollapsed && (
                    <span>{t('common.public_site', 'Public Website')}</span>
                  )}
                </span>
                {!isSidebarCollapsed && <ExternalLink className="w-3 h-3" />}
              </button>
              <button
                type="button"
                title={
                  isSidebarCollapsed ? t('common.public_docs', 'Documentation') : undefined
                }
                aria-label={t('common.public_docs', 'Documentation')}
                onClick={() => handleGuardedRouteChange('public-docs')}
                className={`w-full flex items-center ${
                  isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2 py-1.5'
                } rounded-sm text-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                  {!isSidebarCollapsed && (
                    <span>{t('common.public_docs', 'Documentation')}</span>
                  )}
                </span>
                {!isSidebarCollapsed && <ExternalLink className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Bottom Section: Account Drop-Up Menu (CO-ACCOUNT-MENU) */}
          <div ref={accountMenuRef} className="p-2 border-t border-line bg-surface relative">
            {isAccountMenuOpen && (
              <div
                role="menu"
                className={`absolute bottom-full left-2 ${
                  isSidebarCollapsed ? 'w-60' : 'right-2'
                } mb-1.5 bg-surface border border-line rounded-sm shadow-md z-30 p-1.5 text-xs space-y-1`}
              >
                {/* 1. Menu Header with Current Workspace Role */}
                <div className="px-2 py-1.5 bg-elevated rounded-xs space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-ink truncate">
                      {cleanUserName(currentUser?.name)}
                    </span>
                  </div>
                  <div className="text-2xs text-ink-secondary truncate">
                    {currentUser?.email || 'anonymous@okeng.io'}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5 text-2xs font-mono text-ink-secondary">
                    <Shield className="w-3 h-3 text-accent shrink-0" />
                    <span className="text-ink font-medium truncate">{activeRoleLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums shrink-0">
                      {reqContext.permissions.length} {t('nav.permissions_short', 'perms')}
                    </span>
                  </div>
                </div>

                <Divider className="my-1" />

                {/* 2. Profile & Account Settings Link */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    handleGuardedRouteChange('settings');
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-ink-secondary hover:text-ink hover:bg-subtle transition-colors cursor-pointer text-left"
                >
                  <Settings className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  <span className="truncate">
                    {t('nav.account_settings', 'Profile & Account Settings')}
                  </span>
                </button>

                {/* 3. Inline Language Switcher (EN / ES) */}
                <div className="flex items-center justify-between px-2 py-1 rounded-xs text-ink-secondary">
                  <span className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <span>{t('common.language', 'Language')}</span>
                  </span>
                  <LanguageSelector showIcon={false} />
                </div>

                <Divider className="my-1" />

                {/* 4. Quick Persona Switcher (Owner / Member / Admin) */}
                <div className="px-2 pt-1 pb-0.5 text-2xs font-mono uppercase tracking-wider text-ink-muted">
                  {t('nav.switch_persona', 'Switch Persona')}
                </div>
                <div className="space-y-0.5">
                  {personas.map((persona) => {
                    const isCurrent = currentUser?.id === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          authService.switchPersona(persona.id);
                          setIsAccountMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xs transition-colors cursor-pointer text-left ${
                          isCurrent
                            ? 'bg-subtle text-ink font-medium'
                            : 'text-ink-secondary hover:text-ink hover:bg-subtle'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs">{cleanUserName(persona.name)}</div>
                          <div className="truncate text-2xs font-mono text-ink-muted">
                            {getPersonaRoleLabel(persona.name)}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <Divider className="my-1" />

                {/* 5. Sign Out Action */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    requestNavigation(() => {
                      authService.switchPersona(null);
                      onRouteChange('public-surface');
                    });
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xs text-danger hover:bg-danger-subtle transition-colors cursor-pointer text-left font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>{t('common.sign_out', 'Sign Out')}</span>
                </button>
              </div>
            )}

            {/* Account Trigger: Avatar + Name (Line 1) + Email (Line 2) */}
            <button
              type="button"
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              title={`${cleanUserName(currentUser?.name)} (${
                currentUser?.email || 'anonymous@okeng.io'
              })`}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center p-1' : 'gap-2.5 p-2'
              } rounded-sm hover:bg-subtle transition-colors cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
            >
              <div className="w-8 h-8 rounded-full bg-ink text-surface font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                {getUserInitials(currentUser?.name)}
              </div>
              {!isSidebarCollapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-ink truncate">
                      {cleanUserName(currentUser?.name)}
                    </div>
                    <div className="text-2xs text-ink-secondary truncate">
                      {currentUser?.email || 'anonymous@okeng.io'}
                    </div>
                  </div>
                  <ChevronUp
                    className={`w-3.5 h-3.5 text-ink-secondary shrink-0 transition-transform ${
                      isAccountMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main
          ref={mainViewportRef}
          className="flex-1 flex flex-col min-w-0 overflow-y-auto"
        >
          {children}
        </main>
      </div>
    </AppShellContext.Provider>
  );
};
