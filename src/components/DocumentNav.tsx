import React, { useState, useEffect } from 'react';
import { FolderKanban, FileText, Layers } from 'lucide-react';
import { Accordion, AccordionSection } from './ui/Accordion';
import { Text } from './ui/Text';
import { useI18n } from '../i18n/I18nContext';

// ============================================================================
// UI-01 §3.2 & 02_component_catalog.md: Collapsible Documentation Navigation
// Component ID: CO-DOCUMENT-NAV
// Rules:
//  1. Default state for collections is collapsed, EXCEPT the first collection
//     in the sidebar which is expanded by default.
//  2. Only one collection at a time can be expanded (single-expand).
//  3. Collection headings use a stronger font-face style (font-semibold text-ink).
//  4. Expanding a collapsed collection automatically selects its first item.
//  5. Navigating to an item via deep-link or citation syncs the expanded group.
// ============================================================================

export interface DocumentNavItem {
  id: string;
  title: string;
  codeLabel?: string;
  isSpec?: boolean;
}

export interface DocumentNavGroup {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  items: DocumentNavItem[];
}

export interface DocumentNavProps {
  groups: DocumentNavGroup[];
  activeItemId: string;
  onSelectItem: (itemId: string, groupId: string) => void;
  className?: string;
}

export const DocumentNav: React.FC<DocumentNavProps> = ({
  groups,
  activeItemId,
  onSelectItem,
  className = '',
}) => {
  const { t } = useI18n();

  // Filter out empty groups while preserving order
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  // Determine which group contains activeItemId, defaulting to the 1st group
  const findGroupForItem = (itemId: string): string | null => {
    const matched = visibleGroups.find((g) =>
      g.items.some((item) => item.id === itemId)
    );
    return matched ? matched.id : visibleGroups[0]?.id || null;
  };

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(() =>
    findGroupForItem(activeItemId)
  );

  // Sync expanded collection when activeItemId changes externally (e.g., citation click or URL deep link)
  useEffect(() => {
    const ownerGroup = visibleGroups.find((g) =>
      g.items.some((item) => item.id === activeItemId)
    );
    if (ownerGroup && ownerGroup.id !== expandedGroupId) {
      setExpandedGroupId(ownerGroup.id);
    } else if (!expandedGroupId && visibleGroups.length > 0) {
      setExpandedGroupId(visibleGroups[0].id);
    }
  }, [activeItemId, visibleGroups, expandedGroupId]);

  const handleCollectionExpand = (nextGroupId: string) => {
    setExpandedGroupId(nextGroupId);
    const targetGroup = visibleGroups.find((g) => g.id === nextGroupId);
    if (targetGroup && targetGroup.items.length > 0) {
      // Automatically select the first item in the newly expanded collection
      const firstItem = targetGroup.items[0];
      onSelectItem(firstItem.id, targetGroup.id);
    }
  };

  if (visibleGroups.length === 0) {
    return (
      <div className="p-3 border border-line rounded-sm bg-surface">
        <Text variant="caption" tone="muted">
          {t('public.docs.no_matches', 'No matching documentation found.')}
        </Text>
      </div>
    );
  }

  const sections: AccordionSection[] = visibleGroups.map((group) => ({
    id: group.id,
    title: group.title,
    subtitle: group.subtitle,
    count: group.items.length,
    badge: group.badge,
    icon:
      group.icon || (
        <FolderKanban className="w-3.5 h-3.5 text-ink-secondary" />
      ),
    content: (
      <div className="border-l border-line ml-2.5 pl-2 space-y-0.5">
        {group.items.map((item) => {
          const isSelected = activeItemId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id, group.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded-xs text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-ink text-surface font-medium'
                  : 'text-ink-secondary hover:text-ink hover:bg-elevated'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                {item.isSpec ? (
                  <Layers className="w-3 h-3 shrink-0 opacity-80" />
                ) : (
                  <FileText className="w-3 h-3 shrink-0 opacity-75" />
                )}
                <span className="truncate">{item.title}</span>
              </span>
              {item.codeLabel && (
                <span
                  className={`font-mono text-2xs shrink-0 ${
                    isSelected ? 'text-surface/80' : 'text-ink-muted'
                  }`}
                >
                  {item.codeLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    ),
  }));

  return (
    <nav aria-label="Documentation Collections" className={className}>
      <Accordion
        sections={sections}
        expandedId={expandedGroupId}
        onExpandChange={handleCollectionExpand}
        allowCollapseActive={false}
      />
    </nav>
  );
};
