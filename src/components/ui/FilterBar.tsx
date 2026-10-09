import React from 'react';

// ============================================================================
// UI-01 §2.1 & 04_top_screens_audit_and_standardization.md §2.4:
// Canonical Filter Region Primitive (PR-FILTER-BAR)
// Enforces: One dataset -> one filter model -> one filter region
// All controls inside PR-FILTER-BAR use sizeVariant="sm" / size="sm" (32px / h-8)
// ============================================================================

export interface FilterBarProps {
  searchSlot?: React.ReactNode;
  filtersSlot?: React.ReactNode;
  summarySlot?: React.ReactNode;
  resultCount?: number;
  totalCount?: number;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  children?: React.ReactNode;
  variant?: 'card' | 'table' | 'inline';
  className?: string;
}

const variantClasses: Record<NonNullable<FilterBarProps['variant']>, string> = {
  card: 'bg-surface border border-line rounded-sm px-4 py-3',
  table: 'bg-surface border-b border-line px-4 py-3',
  inline: 'bg-transparent py-2',
};

export const FilterBar: React.FC<FilterBarProps> = ({
  searchSlot,
  filtersSlot,
  summarySlot,
  resultCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
  children,
  variant = 'card',
  className = '',
}) => {
  return (
    <div
      role="search"
      aria-label="Filter controls"
      className={`flex flex-wrap items-center justify-between gap-3 ${variantClasses[variant]} ${className}`.trim()}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
        {children}
        {searchSlot && (
          <div className="flex-1 min-w-[200px] max-w-sm">{searchSlot}</div>
        )}
        {filtersSlot && (
          <div className="flex flex-wrap items-center gap-2">{filtersSlot}</div>
        )}
      </div>
      {(summarySlot || typeof resultCount === 'number') && (
        <div className="flex items-center gap-2.5 shrink-0 text-2xs font-mono text-ink-secondary">
          {summarySlot}
          {!summarySlot && typeof resultCount === 'number' && (
            <span>
              Showing {resultCount}
              {typeof totalCount === 'number' ? ` of ${totalCount}` : ''}
            </span>
          )}
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="text-accent hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};
