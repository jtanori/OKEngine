import React from 'react';
import { ChevronRight } from 'lucide-react';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Single-Expand Accordion Primitive (PR-ACCORDION)
// Consumes DS-* tokens: bg-surface, bg-elevated, border-line, rounded-sm,
// stronger font-semibold collection headings, and tabular-nums item count.
// ============================================================================

export interface AccordionSection {
  id: string;
  title: string;
  subtitle?: string;
  count?: number;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  content: React.ReactNode;
}

export interface AccordionProps {
  sections: AccordionSection[];
  expandedId: string | null;
  onExpandChange: (sectionId: string) => void;
  allowCollapseActive?: boolean;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  sections,
  expandedId,
  onExpandChange,
  allowCollapseActive = false,
  className = '',
}) => {
  const handleHeaderClick = (sectionId: string) => {
    if (expandedId === sectionId) {
      if (allowCollapseActive) {
        onExpandChange('');
      }
      return;
    }
    onExpandChange(sectionId);
  };

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {sections.map((section) => {
        const isExpanded = expandedId === section.id;

        return (
          <div
            key={section.id}
            className={`border rounded-sm overflow-hidden transition-colors ${
              isExpanded
                ? 'border-line-strong bg-surface'
                : 'border-line bg-surface hover:border-line-strong'
            }`}
          >
            <button
              type="button"
              aria-expanded={isExpanded}
              onClick={() => handleHeaderClick(section.id)}
              className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors ${
                isExpanded
                  ? 'bg-elevated border-b border-line'
                  : 'bg-surface hover:bg-elevated/60'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ChevronRight
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                    isExpanded
                      ? 'rotate-90 text-ink'
                      : 'text-ink-secondary'
                  }`}
                />
                {section.icon && (
                  <span className="text-ink-secondary shrink-0">{section.icon}</span>
                )}
                <div className="min-w-0">
                  <span className="block font-sans text-xs font-semibold tracking-tight text-ink truncate">
                    {section.title}
                  </span>
                  {section.subtitle && (
                    <span className="block font-mono text-2xs text-ink-muted truncate">
                      {section.subtitle}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {section.badge}
                {section.count !== undefined && (
                  <span className="font-mono text-2xs tabular-nums text-ink-muted px-1.5 py-0.5 rounded-xs bg-subtle/70">
                    {section.count}
                  </span>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="p-2 bg-surface">{section.content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
