'use client';

// ============================================================================
// ARCH-MIG-001 & ARCH-001 §5.1: Canonical App Router & URL Navigation Engine
// Synchronizes browser URL paths (HTML5 History API) with the src/app/*
// route group hierarchy: (public), (auth), and (workspace).
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppRoute } from '../components/AppShell';
import { store } from '../services/store';
import { authService } from '../services/auth';

export interface AppRouterContextValue {
  pathname: string;
  appRoute: AppRoute;
  params: Record<string, string>;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
  navigateRoute: (route: AppRoute, routeParams?: Record<string, string>) => void;
}

const AppRouterContext = createContext<AppRouterContextValue>({
  pathname: '/',
  appRoute: 'public-surface',
  params: {},
  push: () => {},
  replace: () => {},
  back: () => {},
  navigateRoute: () => {},
});

export function useRouter() {
  const ctx = useContext(AppRouterContext);
  return {
    push: ctx.push,
    replace: ctx.replace,
    back: ctx.back,
    navigateRoute: ctx.navigateRoute,
  };
}

export function usePathname(): string {
  return useContext(AppRouterContext).pathname;
}

export function useAppRoute(): AppRoute {
  return useContext(AppRouterContext).appRoute;
}

export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  return useContext(AppRouterContext).params as T;
}

export const Link: React.FC<{
  href: string;
  className?: string;
  children: React.ReactNode;
}> = ({ href, className, children }) => {
  const { push } = useRouter();
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        push(href);
      }}
    >
      {children}
    </a>
  );
};

/**
 * Convert an AppRoute + optional params into a canonical App Router URL path
 */
export function routeToPath(
  route: AppRoute,
  params?: Record<string, string>,
  workspaceSlug = 'okeng'
): string {
  switch (route) {
    case 'public-surface':
      return '/';
    case 'public-docs':
      return params?.slug ? `/docs/${params.slug}` : '/docs';
    case 'collections':
      return `/workspaces/${workspaceSlug}/collections`;
    case 'collection-detail':
      return params?.collectionId
        ? `/workspaces/${workspaceSlug}/collections/${params.collectionId}`
        : `/workspaces/${workspaceSlug}/collections`;
    case 'files':
      return `/workspaces/${workspaceSlug}/files`;
    case 'file-edit': {
      const docPart = params?.documentId || 'new';
      const colQuery = params?.collectionId ? `?collectionId=${params.collectionId}` : '';
      return `/workspaces/${workspaceSlug}/files/${docPart}${colQuery}`;
    }
    case 'embed': {
      const base = params?.embedId
        ? `/workspaces/${workspaceSlug}/embeds/${params.embedId}`
        : `/workspaces/${workspaceSlug}/embeds`;
      const tabQuery = params?.tab ? `?tab=${encodeURIComponent(params.tab)}` : '';
      return `${base}${tabQuery}`;
    }
    case 'embed-installation': {
      const embedId = params?.embedId || 'EMB-PUBLIC-DOCS';
      return `/workspaces/${workspaceSlug}/embeds/${embedId}/installation`;
    }
    case 'widget-preview': {
      const queryParts: string[] = [];
      if (params?.embedId) queryParts.push(`embedId=${encodeURIComponent(params.embedId)}`);
      if (params?.from) queryParts.push(`from=${encodeURIComponent(params.from)}`);
      return queryParts.length > 0
        ? `/workspaces/${workspaceSlug}/embeds/preview?${queryParts.join('&')}`
        : `/workspaces/${workspaceSlug}/embeds/preview`;
    }
    case 'test': {
      const testQuery: string[] = [];
      if (params?.collectionId) {
        testQuery.push(`collectionId=${encodeURIComponent(params.collectionId)}`);
      }
      if (params?.embedId) {
        testQuery.push(`embedId=${encodeURIComponent(params.embedId)}`);
      }
      return testQuery.length > 0
        ? `/workspaces/${workspaceSlug}/test?${testQuery.join('&')}`
        : `/workspaces/${workspaceSlug}/test`;
    }
    case 'conversations':
      return `/workspaces/${workspaceSlug}/conversations`;
    case 'stitch':
      return `/workspaces/${workspaceSlug}/stitch`;
    case 'settings':
      return `/workspaces/${workspaceSlug}/settings`;
    default:
      return '/';
  }
}

/**
 * Parse a browser URL pathname + search query into AppRoute and dynamic segment params
 */
export function parsePathname(fullPath: string): {
  pathname: string;
  appRoute: AppRoute;
  params: Record<string, string>;
} {
  const [rawPath, rawQuery = ''] = fullPath.split('?');
  const pathname = rawPath || '/';
  const searchParams = new URLSearchParams(rawQuery);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });

  // Support /app/embed/:embedId/installation canonical shorthand alias (APP-05)
  const appEmbedInstallMatch = pathname.match(/^\/app\/embeds?\/([^/]+)\/installation$/);
  if (appEmbedInstallMatch) {
    params.workspaceSlug = params.workspaceSlug || 'okeng';
    params.embedId = appEmbedInstallMatch[1];
    return { pathname, appRoute: 'embed-installation', params };
  }

  // Support /app/embed and /app/embed/:embedId canonical shorthand aliases
  const appEmbedMatch = pathname.match(/^\/app\/embeds?(?:\/([^/]+))?$/);
  if (appEmbedMatch) {
    params.workspaceSlug = params.workspaceSlug || 'okeng';
    if (appEmbedMatch[1] === 'preview') {
      return { pathname, appRoute: 'widget-preview', params };
    }
    if (appEmbedMatch[1]) {
      params.embedId = appEmbedMatch[1];
    }
    return { pathname, appRoute: 'embed', params };
  }

  // Match /workspaces/:workspaceSlug/*
  const wsMatch = pathname.match(/^\/workspaces\/([^/]+)(?:\/(.*))?$/);
  if (wsMatch) {
    params.workspaceSlug = wsMatch[1];
    const subPath = wsMatch[2] || 'collections';
    const segments = subPath.split('/').filter(Boolean);

    if (segments[0] === 'collections') {
      if (segments[1]) {
        params.collectionId = segments[1];
        return { pathname, appRoute: 'collection-detail', params };
      }
      return { pathname, appRoute: 'collections', params };
    }
    if (segments[0] === 'files') {
      if (segments[1]) {
        if (segments[1] !== 'new') {
          params.documentId = segments[1];
        }
        return { pathname, appRoute: 'file-edit', params };
      }
      return { pathname, appRoute: 'files', params };
    }
    if (segments[0] === 'embeds' || segments[0] === 'embed') {
      if (segments[1] === 'preview') {
        return { pathname, appRoute: 'widget-preview', params };
      }
      if (segments[1] && segments[2] === 'installation') {
        params.embedId = segments[1];
        return { pathname, appRoute: 'embed-installation', params };
      }
      if (segments[1]) {
        params.embedId = segments[1];
      }
      return { pathname, appRoute: 'embed', params };
    }
    if (segments[0] === 'test') {
      return { pathname, appRoute: 'test', params };
    }
    if (segments[0] === 'conversations') {
      return { pathname, appRoute: 'conversations', params };
    }
    if (segments[0] === 'stitch') {
      return { pathname, appRoute: 'stitch', params };
    }
    if (segments[0] === 'settings') {
      return { pathname, appRoute: 'settings', params };
    }
    return { pathname, appRoute: 'collections', params };
  }

  // Match /docs or /docs/:slug
  const docsMatch = pathname.match(/^\/docs(?:\/([^/]+))?$/);
  if (docsMatch) {
    if (docsMatch[1]) {
      params.slug = docsMatch[1];
    }
    return { pathname, appRoute: 'public-docs', params };
  }

  return { pathname, appRoute: 'public-surface', params };
}

export function scrollViewportToTop(): void {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
}

export const AppRouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialUrl = () => {
    if (typeof window === 'undefined') return '/';
    return `${window.location.pathname}${window.location.search}`;
  };

  const [currentUrl, setCurrentUrl] = useState<string>(getInitialUrl);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubStore = store.subscribe(() => setTick((t) => t + 1));
    const unsubAuth = authService.subscribe(() => setTick((t) => t + 1));
    const onPopState = () => {
      setCurrentUrl(`${window.location.pathname}${window.location.search}`);
      scrollViewportToTop();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      unsubStore();
      unsubAuth();
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    scrollViewportToTop();
  }, [currentUrl]);

  const push = useCallback((href: string) => {
    if (
      typeof window !== 'undefined' &&
      href !== `${window.location.pathname}${window.location.search}`
    ) {
      window.history.pushState({}, '', href);
    }
    setCurrentUrl(href);
    scrollViewportToTop();
  }, []);

  const replace = useCallback((href: string) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', href);
    }
    setCurrentUrl(href);
    scrollViewportToTop();
  }, []);

  const back = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }, []);

  const { pathname, appRoute, params } = parsePathname(currentUrl);

  const navigateRoute = useCallback(
    (route: AppRoute, routeParams?: Record<string, string>) => {
      const wsSlug = routeParams?.workspaceSlug || params.workspaceSlug || 'okeng';
      const targetHref = routeToPath(route, routeParams, wsSlug);
      push(targetHref);
    },
    [params.workspaceSlug, push]
  );

  return (
    <AppRouterContext.Provider
      value={{
        pathname,
        appRoute,
        params,
        push,
        replace,
        back,
        navigateRoute,
      }}
    >
      {children}
    </AppRouterContext.Provider>
  );
};
