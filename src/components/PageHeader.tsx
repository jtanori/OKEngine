import React from 'react';
import { useAppShell } from './AppShell';
import { Text } from './ui';

// ============================================================================
// UI-01 §2.2, 02_component_catalog.md & 04_top_screens_audit §9:
// Workspace Page Header (CO-PAGE-HEADER)
//   - Canonical Level-2 context primitive for 'workspace' navigationContext (32px axis)
//   - Visual ownership ≠ behavioral ownership: consumes isSidebarCollapsed from
//     CO-APP-SHELL solely for DS-SHELL-TRIGGER clearance:
//       * workspace + expanded  -> px-8 (32px left & right)
//       * workspace + collapsed -> pl-14 pr-8 (56px left clearance, 32px right)
//   - Stacking context: sticky top-0 z-20 (beneath DS-SHELL-TRIGGER z-30, above z-0 content)
// ============================================================================

export interface PageHeaderProps {
  breadcrumb?: { label: string; onClick?: () => void }[];
  title: string;
  description?: string;
  subtitle?: string;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumb,
  title,
  description,
  subtitle,
  metadata,
  actions,
}) => {
  const { isSidebarCollapsed } = useAppShell();
  const resolvedDescription = description ?? subtitle;

  return (
    <header
      className={`${
        isSidebarCollapsed ? 'pl-14 pr-8' : 'px-8'
      } sticky top-0 z-20 border-b border-line bg-surface py-5 select-none shrink-0 transition-[padding] duration-150`}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 text-xs text-ink-secondary mb-2 font-mono">
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-ink-muted">/</span>}
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-ink hover:underline cursor-pointer"
                >
                  {item.label}
                </button>
              ) : (
                <span className="text-ink">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <Text variant="h1" tone="primary">
            {title}
          </Text>
          {resolvedDescription && (
            <Text variant="body" tone="secondary" className="mt-1 max-w-2xl">
              {resolvedDescription}
            </Text>
          )}
          {metadata && <div className="mt-2.5">{metadata}</div>}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </header>
  );
};
