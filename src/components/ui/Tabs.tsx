import React from 'react';

// ============================================================================
// UI-01 §2.1 & DS-CONTROL-HEIGHT: Segmented Control / Tabs Primitive (PR-TABS)
// Canonical 4-Tier Control Height Scale:
//   - xs: 24px (h-6) — Micro inline switchers and dense header chips
//   - sm: 32px (h-8) — Filter bars (PR-FILTER-BAR) and simulation toolbars
//   - md: 36px (h-9) — Standard page/section segmented switchers (default)
// ============================================================================

export type SegmentedTabsSize = 'xs' | 'sm' | 'md';
export type SegmentedTabTone = 'default' | 'danger';

export interface TabOption<T extends string = string> {
  id?: T;
  value?: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  tone?: SegmentedTabTone;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface SegmentedTabsProps<T extends string = string> {
  options: TabOption<T>[];
  activeId?: T;
  value?: T;
  onChange: (id: T) => void;
  size?: SegmentedTabsSize;
  variant?: 'surface' | 'ink';
  ariaLabel?: string;
  className?: string;
}

const containerSizeClasses: Record<SegmentedTabsSize, string> = {
  xs: 'h-6 p-0.5',
  sm: 'h-8 p-0.5',
  md: 'h-9 p-0.5',
};

const buttonSizeClasses: Record<SegmentedTabsSize, string> = {
  xs: 'h-full px-2 text-2xs gap-1',
  sm: 'h-full px-2.5 text-xs gap-1.5',
  md: 'h-full px-3 text-xs gap-1.5',
};

export function SegmentedTabs<T extends string = string>({
  options,
  activeId,
  value,
  onChange,
  size = 'md',
  variant = 'surface',
  ariaLabel,
  className = '',
}: SegmentedTabsProps<T>) {
  const currentActive = (activeId ?? value) as T;
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledIndices = options
      .map((opt, idx) => (opt.disabled ? -1 : idx))
      .filter((idx) => idx !== -1);
    if (enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(index);
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = enabledIndices[(currentPos + 1) % enabledIndices.length];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex =
        enabledIndices[(currentPos - 1 + enabledIndices.length) % enabledIndices.length];
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = enabledIndices[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = enabledIndices[enabledIndices.length - 1];
    }

    if (nextIndex !== null) {
      const targetOpt = options[nextIndex];
      const targetKey = (targetOpt.id ?? targetOpt.value) as T;
      tabRefs.current[nextIndex]?.focus();
      onChange(targetKey);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center ${containerSizeClasses[size]} bg-elevated border border-line rounded-sm select-none ${className}`.trim()}
    >
      {options.map((opt, idx) => {
        const optKey = (opt.id ?? opt.value) as T;
        const isActive = optKey === currentActive;
        const isDanger = opt.tone === 'danger';

        const activeClasses = isDanger
          ? 'bg-danger text-white shadow-2xs'
          : variant === 'ink'
          ? 'bg-ink text-surface shadow-2xs'
          : 'bg-surface text-ink border border-line shadow-2xs';

        const inactiveClasses = isDanger
          ? 'text-danger hover:text-danger hover:bg-danger-subtle/50'
          : 'text-ink-secondary hover:text-ink';

        return (
          <button
            key={optKey}
            ref={(el) => {
              tabRefs.current[idx] = el;
            }}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-label={opt.ariaLabel}
            tabIndex={isActive ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => onChange(optKey)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`inline-flex items-center justify-center font-medium rounded-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              buttonSizeClasses[size]
            } ${isActive ? activeClasses : inactiveClasses}`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
