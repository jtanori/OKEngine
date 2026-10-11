// PR-DOCS-SIDEBAR — Collapsible sidebar collection nav with search, single-expand, auto-select, auth-gated
import React, { useState } from 'react';

export interface DocsSidebarItem {
  slug: string;
  title: string;
  collectionId: string;
}

export interface DocsSidebarGroup {
  id: string;
  name: string;
  description?: string;
  items: DocsSidebarItem[];
  count: number;
}

export interface DocsSidebarProps {
  groups: DocsSidebarGroup[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  isAuthenticated?: boolean;
  className?: string;
}

export function DocsSidebar({ groups, selectedSlug, onSelect, searchQuery = '', onSearch, isAuthenticated = false, className = '' }: DocsSidebarProps) {
  const [expandedGroup, setExpandedGroup] = useState<string>(groups[0]?.id || '');

  const filteredGroups = groups.map(g => ({
    ...g,
    items: g.items.filter(item => !searchQuery || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.slug.toLowerCase().includes(searchQuery.toLowerCase())),
  })).filter(g => g.items.length > 0 || !searchQuery);

  return (
    <aside className={`w-[300px] border-r border-line bg-surface flex flex-col overflow-hidden ${className}`}>
      {onSearch && (
        <div className="p-4 border-b border-line">
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="Filtrar docs..."
            className="w-full h-8 rounded-sm border border-line bg-elevated px-3 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent-subtle"
          />
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
        {filteredGroups.map(group => {
          const isExpanded = expandedGroup === group.id;
          const isInternal = group.id === 'COL-INTERNAL';
          if (isInternal && !isAuthenticated) return null;

          return (
            <div key={group.id} className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  const newExpanded = isExpanded ? '' : group.id;
                  setExpandedGroup(newExpanded);
                  if (newExpanded && group.items.length > 0) {
                    onSelect(group.items[0].slug);
                  }
                }}
                className="flex items-center justify-between w-full px-2 py-1.5 rounded-sm hover:bg-elevated transition-colors text-left"
              >
                <span className="text-xs font-semibold tracking-tight text-ink font-sans">{group.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-ink-muted tabular-nums">{group.count}</span>
                  <span className={`text-ink-muted text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>⌄</span>
                </div>
              </button>
              {isExpanded && (
                <div className="flex flex-col gap-0.5 ml-2 pl-2 border-l border-line">
                  {group.items.map(item => (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => onSelect(item.slug)}
                      className={`text-left px-2 py-1.5 rounded-sm text-xs transition-colors ${
                        selectedSlug === item.slug ? 'bg-ink text-surface font-medium' : 'text-ink-secondary hover:text-ink hover:bg-elevated'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-line text-2xs text-ink-muted">
        <div>18 docs públicos</div>
        {isAuthenticated && <div>+4 specs ingeniería (auth)</div>}
        <div className="mt-1">v{new Date().getFullYear()} • knowledgeVersion</div>
      </div>
    </aside>
  );
}
