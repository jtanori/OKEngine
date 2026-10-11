// PR-DOCS-TOC — Table of contents: heading extraction h2/h3, hover #, active highlight
import React from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DocsTocProps {
  items: TocItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function DocsToc({ items, activeId, onSelect, className = '' }: DocsTocProps) {
  if (items.length < 2) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="text-xs font-semibold text-ink">En esta página</div>
      <nav className="flex flex-col gap-1">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={`text-left text-xs flex items-center gap-1.5 group ${item.level === 3 ? 'pl-4' : ''} ${activeId === item.id ? 'text-ink font-medium' : 'text-ink-secondary hover:text-ink'}`}
          >
            <span className={`opacity-0 group-hover:opacity-100 text-accent ${activeId === item.id ? 'opacity-100' : ''}`}>#</span>
            <span>{item.text}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
