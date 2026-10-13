'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/auth';
import { useRouter } from '../app/router';

type CollectionSummary = {
  id: string;
  name: string;
  description: string;
  visibility: 'everyone' | 'members' | 'admins';
};

type DocumentSummary = {
  id: string;
  collection_id: string;
  title: string;
  filename: string;
  status: string;
  chunk_count: number;
  created_at: string;
};

type FileSummary = {
  id: string;
  collection_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

type WorkspaceOverviewData = {
  workspace: { id: string; slug: string; name: string };
  collections: CollectionSummary[];
  documents: DocumentSummary[];
  files: FileSummary[];
  truncated: { collections: boolean; documents: boolean; files: boolean };
};

interface SupabaseWorkspaceOverviewProps {
  workspaceSlug: string;
  workspaceName: string;
  userEmail: string;
  workspaceRole: string;
  workspacePermissions: string[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

async function loadWorkspaceOverview(url: string): Promise<WorkspaceOverviewData> {
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(response.status === 401 || response.status === 403
      ? 'Your workspace session is no longer authorized. Sign in again or contact a workspace owner.'
      : response.status === 404
        ? 'This workspace is not available to the signed-in account.'
        : 'Workspace data could not be loaded. Check that local Supabase is running and migrations are applied.');
  }
  return payload as WorkspaceOverviewData;
}

export function SupabaseWorkspaceOverview({
  workspaceSlug,
  workspaceName,
  userEmail,
  workspaceRole,
  workspacePermissions,
}: SupabaseWorkspaceOverviewProps) {
  const { push } = useRouter();
  const [data, setData] = useState<WorkspaceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const overviewUrl = useMemo(
    () => `/api/workspaces/${encodeURIComponent(workspaceSlug)}/overview`,
    [workspaceSlug]
  );

  const commitOverview = useCallback((payload: WorkspaceOverviewData) => {
    setData(payload);
    setSelectedCollection((current) =>
      payload.collections.some((collection) => collection.id === current)
        ? current
        : payload.collections[0]?.id || ''
    );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      commitOverview(await loadWorkspaceOverview(overviewUrl));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Workspace data could not be loaded.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [commitOverview, overviewUrl]);

  useEffect(() => {
    let active = true;
    loadWorkspaceOverview(overviewUrl)
      .then((payload) => {
        if (!active) return;
        commitOverview(payload);
        setLoadError(null);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Workspace data could not be loaded.');
        setData(null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [commitOverview, overviewUrl]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || !selectedFile) {
      setUploadError('Choose a collection and a Markdown, text, or PDF file.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadMessage(null);
    try {
      const csrfResponse = await fetch('/api/csrf-token', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!csrfResponse.ok) throw new Error('Could not validate the upload request.');
      const { csrfToken } = await csrfResponse.json();
      const formData = new FormData();
      formData.set('collectionId', selectedCollection);
      formData.set('file', selectedFile);

      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceSlug)}/files`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': String(csrfToken || '') },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(response.status === 413
          ? 'The file is larger than the 10 MiB upload limit.'
          : response.status === 403
            ? 'This account does not have permission to upload to that collection.'
            : 'The private upload failed. Check the local Storage service and try again.');
      }

      setSelectedFile(null);
      setUploadMessage('File stored privately. Document parsing and indexing are not enabled yet.');
      await refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'The private upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(file: FileSummary) {
    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(workspaceSlug)}/files/${encodeURIComponent(file.id)}`,
        { credentials: 'same-origin', cache: 'no-store' }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || typeof payload.signedUrl !== 'string') {
        throw new Error('A short-lived download link could not be created.');
      }
      const link = document.createElement('a');
      link.href = payload.signedUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Download failed.');
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const success = await authService.signOut();
    setSigningOut(false);
    if (success) push('/login');
    else setLoadError('Sign-out could not be completed. Please retry.');
  }

  const collectionNames = new Map((data?.collections || []).map((collection) => [collection.id, collection.name]));
  const canUpload = workspaceRole === 'WORKSPACE_OWNER' || workspacePermissions.includes('content.write');

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-muted">Supabase workspace</p>
          <h1 className="mt-1 text-xl font-semibold">{data?.workspace.name || workspaceName}</h1>
          <p className="mt-1 text-xs text-ink-secondary">
            {workspaceSlug} · {userEmail} · {workspaceRole.replaceAll('_', ' ').toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-success/30 bg-success-subtle px-3 py-1 text-xs font-medium text-success">
            Authenticated with Supabase
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="rounded-sm border border-line px-3 py-2 text-sm hover:bg-subtle disabled:opacity-60"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="rounded-md border border-accent/20 bg-accent-subtle/30 p-4 text-sm text-ink-secondary">
          Workspace identity and records below are loaded through your HttpOnly Supabase Auth session and tenant-scoped PostgreSQL queries. Existing demo-backed dashboard modules are intentionally hidden in Supabase mode until each is connected to tenant data.
        </section>

        {loadError && <div role="alert" className="rounded-sm border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{loadError}</div>}
        {loading && <div role="status" className="text-sm text-ink-secondary">Loading workspace data…</div>}

        {!loading && data && (
          <>
            <section className="grid gap-3 sm:grid-cols-3" aria-label="Workspace data summary">
              <SummaryCard label="Collections" value={data.collections.length} truncated={data.truncated.collections} />
              <SummaryCard label="Documents" value={data.documents.length} truncated={data.truncated.documents} />
              <SummaryCard label="Private files" value={data.files.length} truncated={data.truncated.files} />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border border-line bg-surface p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">Your collections</h2>
                  <button type="button" onClick={() => void refresh()} className="text-xs text-accent hover:underline">
                    Refresh
                  </button>
                </div>
                {data.collections.length === 0 ? (
                  <p className="text-sm text-ink-secondary">No collections are visible in this workspace yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.collections.map((collection) => (
                      <li key={collection.id} className="rounded-sm border border-line p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-medium">{collection.name}</h3>
                            {collection.description && <p className="mt-1 text-xs text-ink-secondary">{collection.description}</p>}
                          </div>
                          <span className="shrink-0 rounded bg-subtle px-2 py-1 text-2xs text-ink-secondary">
                            {collection.visibility}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-md border border-line bg-surface p-5">
                <h2 className="mb-4 text-base font-semibold">Upload a private file</h2>
                {canUpload ? (
                <form onSubmit={(event) => void handleUpload(event)} className="space-y-3">
                  <label className="block text-xs font-medium text-ink-secondary" htmlFor="private-file-collection">
                    Collection
                  </label>
                  <select
                    id="private-file-collection"
                    value={selectedCollection}
                    onChange={(event) => setSelectedCollection(event.target.value)}
                    disabled={!data.collections.length || uploading}
                    className="w-full rounded-sm border border-line bg-canvas px-3 py-2 text-sm disabled:opacity-60"
                    required
                  >
                    <option value="">Choose a collection</option>
                    {data.collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>{collection.name}</option>
                    ))}
                  </select>
                  <label className="block text-xs font-medium text-ink-secondary" htmlFor="private-file-input">
                    Markdown, text, or PDF · maximum 10 MiB
                  </label>
                  <input
                    id="private-file-input"
                    type="file"
                    accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                    disabled={!data.collections.length || uploading}
                    className="block w-full text-sm text-ink-secondary file:mr-3 file:rounded-sm file:border-0 file:bg-subtle file:px-3 file:py-2 file:text-xs file:font-medium"
                  />
                  {uploadError && <p role="alert" className="text-xs text-danger">{uploadError}</p>}
                  {uploadMessage && <p role="status" className="text-xs text-success">{uploadMessage}</p>}
                  <button
                    type="submit"
                    disabled={!data.collections.length || !selectedFile || uploading}
                    className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? 'Uploading securely…' : 'Upload privately'}
                  </button>
                </form>
                ) : (
                  <p className="text-sm text-ink-secondary">This account is read-only for file uploads. Ask a workspace owner to grant content-write access.</p>
                )}
              </div>
            </section>

            <section className="rounded-md border border-line bg-surface p-5">
              <h2 className="mb-4 text-base font-semibold">Private files</h2>
              {data.files.length === 0 ? (
                <p className="text-sm text-ink-secondary">No ready files are stored for this workspace.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] text-left text-sm">
                    <thead className="border-b border-line text-xs text-ink-muted">
                      <tr><th className="py-2 pr-3 font-medium">File</th><th className="py-2 pr-3 font-medium">Collection</th><th className="py-2 pr-3 font-medium">Size</th><th className="py-2 pr-3 font-medium">Uploaded</th><th className="py-2 font-medium"><span className="sr-only">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      {data.files.map((file) => (
                        <tr key={file.id} className="border-b border-line/60 last:border-0">
                          <td className="py-3 pr-3">{file.filename}</td>
                          <td className="py-3 pr-3 text-ink-secondary">{collectionNames.get(file.collection_id) || 'Collection'}</td>
                          <td className="py-3 pr-3 text-ink-secondary">{formatSize(file.size_bytes)}</td>
                          <td className="py-3 pr-3 text-ink-secondary">{formatDate(file.created_at)}</td>
                          <td className="py-3 text-right">
                            <button type="button" onClick={() => void downloadFile(file)} className="text-xs text-accent hover:underline">
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-md border border-line bg-surface p-5">
              <h2 className="mb-4 text-base font-semibold">Indexed documents</h2>
              {data.documents.length === 0 ? (
                <p className="text-sm text-ink-secondary">No indexed documents are available yet. Uploaded files remain private and are not automatically parsed or indexed.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.documents.map((document) => (
                    <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <div>
                        <p className="font-medium">{document.title}</p>
                        <p className="mt-1 text-xs text-ink-secondary">
                          {document.filename} · {collectionNames.get(document.collection_id) || 'Collection'} · {document.chunk_count} chunks
                        </p>
                      </div>
                      <span className="rounded bg-subtle px-2 py-1 text-xs text-ink-secondary">{document.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ label, value, truncated }: { label: string; value: number; truncated: boolean }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}{truncated ? ' (first 100)' : ''}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
