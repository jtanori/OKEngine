import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

// ============================================================================
// UI-01 §2.1: Technical Details & Help Info Popover Primitive (PR-INFO-POPOVER)
// Surfaces internal system IDs, collection scopes, and spec contracts on demand
// via a clean '?' icon button so primary UI remains human-friendly.
// ============================================================================

export interface InfoPopoverItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export interface InfoPopoverProps {
  title: string;
  description?: string;
  items?: InfoPopoverItem[];
  align?: 'left' | 'right';
  triggerVariant?: 'default' | 'inverted';
  className?: string;
}

export const InfoPopover: React.FC<InfoPopoverProps> = ({
  title,
  description,
  items = [],
  align = 'right',
  triggerVariant = 'default',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const triggerClasses =
    triggerVariant === 'inverted'
      ? 'p-1 rounded-xs text-surface/80 hover:text-surface hover:bg-surface/15 transition-colors cursor-pointer inline-flex items-center justify-center'
      : 'p-1 rounded-xs text-ink-muted hover:text-ink hover:bg-subtle transition-colors cursor-pointer inline-flex items-center justify-center';

  const alignClasses = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`.trim()}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={title}
        aria-expanded={isOpen}
        title={title}
        className={triggerClasses}
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={title}
          className={`absolute top-full mt-1.5 ${alignClasses} z-50 w-72 bg-surface text-ink border border-line rounded-sm shadow-lg p-3.5 space-y-2.5 text-left select-text font-sans font-normal normal-case tracking-normal`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-line pb-2">
            <span className="text-xs font-semibold text-ink leading-snug">{title}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close details"
              className="p-0.5 text-ink-muted hover:text-ink rounded-xs cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {description && (
            <p className="text-2xs text-ink-secondary leading-relaxed">{description}</p>
          )}

          {items.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {items.map((item, idx) => (
                <div
                  key={`${item.label}-${idx}`}
                  className="flex items-start justify-between gap-2 text-2xs"
                >
                  <span className="text-ink-secondary shrink-0">{item.label}</span>
                  <span
                    className={`text-right text-ink break-all ${
                      item.mono !== false ? 'font-mono font-medium' : 'font-medium'
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
