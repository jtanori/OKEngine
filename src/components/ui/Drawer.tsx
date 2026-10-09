import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// ============================================================================
// UI-01 §2.1 & 01_ui_foundation.md: Slide-In Drawer Primitive (PR-DRAWER)
// Semantic complexity sizing:
//   - sm (PR-DRAWER-SM): 340px
//   - md (PR-DRAWER-MD): 420px
//   - lg (PR-DRAWER-LG): 520px
// Supports scopeBanner slot for explicit mutation scope (WHAT, WHERE, WHO/WHAT)
// and headerActions slot on the right side of the header (e.g. ? InfoPopover).
// ============================================================================

export type DrawerSize = 'sm' | 'md' | 'lg';

const DRAWER_SIZE_WIDTHS: Record<DrawerSize, { width: string; maxWidth: string }> = {
  sm: { width: '340px', maxWidth: 'min(360px, 90vw)' },
  md: { width: '420px', maxWidth: 'min(440px, 92vw)' },
  lg: { width: '520px', maxWidth: 'min(540px, 94vw)' },
};

export interface DrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  position?: 'left' | 'right';
  size?: DrawerSize;
  width?: string;
  maxWidth?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  scopeBanner?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen = true,
  onClose,
  position = 'right',
  size,
  width,
  maxWidth,
  title,
  subtitle,
  scopeBanner,
  headerActions,
  footer,
  inline = false,
  className = '',
  children,
}) => {
  useEffect(() => {
    if (!isOpen || inline || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inline, onClose]);

  if (!isOpen) return null;

  const borderEdge = position === 'left' ? 'border-r border-line' : 'border-l border-line';

  const sizePreset = size ? DRAWER_SIZE_WIDTHS[size] : undefined;
  const rawWidth = width || sizePreset?.width || '360px';

  // Normalize 100% or oversized pixel widths so an inline side drawer never dominates the host canvas
  const trimmedWidth = rawWidth.trim();
  const numericPx = trimmedWidth.endsWith('px') ? parseInt(trimmedWidth, 10) : NaN;
  const resolvedWidth =
    trimmedWidth === '100%' || (inline && !Number.isNaN(numericPx) && numericPx > 380)
      ? '360px'
      : trimmedWidth;
  const resolvedMaxWidth =
    maxWidth ||
    (inline ? 'min(380px, 40%)' : sizePreset?.maxWidth || 'min(420px, 92vw)');

  const drawerPanel = (
    <aside
      style={{ width: resolvedWidth, maxWidth: resolvedMaxWidth }}
      className={`${borderEdge} bg-surface text-ink flex flex-col justify-between shrink-0 shadow-md overflow-y-auto overflow-x-hidden ${className}`.trim()}
    >
      <div className="w-full max-w-full min-w-0 overflow-x-hidden p-4 space-y-3.5 flex-1">
        {(title || subtitle || headerActions || onClose) && (
          <div className="flex items-start justify-between border-b border-line pb-3 gap-2">
            <div className="min-w-0">
              {title && <div className="text-xs font-semibold text-ink truncate">{title}</div>}
              {subtitle && (
                <div className="text-2xs text-ink-secondary leading-snug mt-0.5">{subtitle}</div>
              )}
            </div>
            {(headerActions || onClose) && (
              <div className="flex items-center gap-1 shrink-0">
                {headerActions}
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close drawer"
                    className="p-1 text-ink-muted hover:text-ink rounded-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {scopeBanner && (
          <div className="p-2.5 bg-elevated border border-line rounded-sm text-2xs font-mono text-ink-secondary">
            {scopeBanner}
          </div>
        )}

        {children}
      </div>

      {footer && (
        <div className="px-4 py-3 border-t border-line bg-elevated flex items-center justify-end gap-2 shrink-0">
          {footer}
        </div>
      )}
    </aside>
  );

  if (inline) {
    return drawerPanel;
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-ink/30 backdrop-blur-xs">
      {position === 'right' && <div className="flex-1" onClick={onClose} />}
      {drawerPanel}
      {position === 'left' && <div className="flex-1" onClick={onClose} />}
    </div>
  );
};
