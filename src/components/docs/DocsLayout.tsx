// CO-DOCS-LAYOUT — Docs layout PA-DOCS: header + sidebar + main + footer, max-w-7xl, no app shell, public surface, editorial whitespace
import React from 'react';
import { DocsHeader } from '../ui/DocsHeader';
import { LandingFooter } from '../landing/LandingFooter';

export interface DocsLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  searchQuery?: string;
  onSearch?: (q: string) => void;
}

export function DocsLayout({ sidebar, children, rightRail, searchQuery, onSearch }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <DocsHeader searchQuery={searchQuery} onSearch={onSearch} />
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        <div className="hidden md:flex w-[300px] shrink-0 border-r border-line bg-surface sticky top-14 h-[calc(100vh-56px)] overflow-hidden">
          {sidebar}
        </div>
        <main className="flex-1 min-w-0 px-6 py-8 md:py-12 flex flex-col gap-8">
          {children}
        </main>
        {rightRail && (
          <div className="hidden xl:flex w-[200px] shrink-0 px-4 py-8 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            {rightRail}
          </div>
        )}
      </div>
      <LandingFooter />
    </div>
  );
}
