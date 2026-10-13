import { useSyncExternalStore } from 'react';

function subscribeToLocation(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('popstate', callback);
  window.addEventListener('hashchange', callback);
  return () => {
    window.removeEventListener('popstate', callback);
    window.removeEventListener('hashchange', callback);
  };
}

function getLocationSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

/** Read the browser query without a server/client hydration mismatch. */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribeToLocation, getLocationSearch, () => '');
}
