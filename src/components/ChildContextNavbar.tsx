import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAppShell } from './AppShell';
import { useI18n } from '../i18n/I18nContext';
import { Button, Divider } from './ui';

// ============================================================================
// UI-01, 02_component_catalog.md & 04_top_screens_audit §9:
// Child Context Navigation (CO-CHILD-NAVBAR)
//   - Canonical Level-2 context primitive for 'resource' navigationContext (24px axis)
//   - Visual ownership ≠ behavioral ownership: consumes isSidebarCollapsed from
//     CO-APP-SHELL solely for DS-SHELL-TRIGGER clearance on Surface 1:
//       * resource + expanded  -> px-6 (24px left & right)
//       * resource + collapsed -> pl-12 pr-6 on Surface 1 (48px left clearance, 24px right);
//                                 Surface 2 (children) remains px-6 (24px left & right)
//   - Stacking context: sticky top-0 z-20 (beneath DS-SHELL-TRIGGER z-30, above z-0 content)
// ============================================================================

export interface ChildBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export interface ChildContextNavbarProps {
  onBack: () => void;
  backLabel?: string;
  breadcrumb: ChildBreadcrumbItem[];
  contextMetadata?: React.ReactNode;
  actions?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const ChildContextNavbar: React.FC<ChildContextNavbarProps> = ({
  onBack,
  backLabel,
  breadcrumb,
  contextMetadata,
  actions,
  disabled = false,
  children,
}) => {
  const { isSidebarCollapsed } = useAppShell();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface shrink-0">
      <div
        className={`${
          isSidebarCollapsed ? 'pl-12 pr-6' : 'px-6'
        } h-11 flex items-center justify-between gap-4 transition-[padding] duration-150`}
      >
        {/* LEFT: Back + Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={disabled}
            aria-label={backLabel || t('common.back', 'Back')}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel || t('common.back', 'Back')}</span>
          </Button>

          <Divider orientation="vertical" />

          {/* Breadcrumb / Page Identity */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-ink-secondary min-w-0"
          >
            {breadcrumb.map((item, idx) => {
              const isLast = idx === breadcrumb.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <ChevronRight className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                  )}
                  {item.onClick && !isLast ? (
                    <button
                      type="button"
                      onClick={item.onClick}
                      disabled={disabled}
                      className="hover:text-ink hover:underline transition-colors cursor-pointer truncate max-w-[180px]"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      className={`truncate max-w-[260px] ${
                        isLast ? 'text-ink font-medium' : ''
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* RIGHT: Contextual Status / Metadata + Optional Page Actions */}
        {(contextMetadata || actions) && (
          <div className="flex items-center gap-3 shrink-0">
            {contextMetadata && (
              <div className="flex items-center gap-2.5 text-xs">{contextMetadata}</div>
            )}
            {contextMetadata && actions && <Divider orientation="vertical" />}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
      </div>

      {/* Optional Surface 2 Slot (Resource Identity + Actions Surface — 24px / px-6 axis) */}
      {children}
    </header>
  );
};
