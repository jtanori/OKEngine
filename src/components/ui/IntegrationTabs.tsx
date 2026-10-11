// PR-INTEGRATION-TABS — Tabs for widget/panel/fullscreen with mock preview
// DS tokens: bg-elevated, bg-surface, border-line, rounded-sm, text-ink
import React, { useState } from 'react';

export type IntegrationMode = 'widget' | 'panel' | 'fullscreen';

export interface IntegrationTabsProps {
  modes: Array<{ id: IntegrationMode; label: string; description: string; code: string }>;
  className?: string;
}

export function IntegrationTabs({ modes, className = '' }: IntegrationTabsProps) {
  const [active, setActive] = useState<IntegrationMode>(modes[0]?.id || 'widget');
  const activeMode = modes.find(m => m.id === active) || modes[0];

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      <div className="inline-flex items-center gap-1 rounded-sm bg-elevated p-0.5 border border-line self-start" role="tablist">
        {modes.map(mode => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={active === mode.id}
            onClick={() => setActive(mode.id)}
            className={`rounded-xs px-4 py-1.5 text-sm font-medium transition-colors ${
              active === mode.id ? 'bg-surface text-ink shadow-sm border border-line' : 'text-ink-secondary hover:text-ink'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {activeMode && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-surface border border-line rounded-lg p-6 shadow-sm min-h-[280px] flex flex-col">
            <div className="text-sm font-medium text-ink mb-2">{activeMode.label}</div>
            <div className="text-sm text-ink-secondary mb-4">{activeMode.description}</div>
            <div className="mt-auto bg-elevated border border-line rounded-sm p-3 font-mono text-xs text-ink">
              {activeMode.id === 'widget' && (
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-3/4 bg-line rounded-xs"></div>
                  <div className="h-3 w-1/2 bg-line rounded-xs"></div>
                  <div className="ml-auto h-8 w-8 bg-accent rounded-full"></div>
                </div>
              )}
              {activeMode.id === 'panel' && (
                <div className="flex gap-2 h-32">
                  <div className="flex-1 bg-surface border border-line rounded-sm p-2">
                    <div className="h-2 w-3/4 bg-line rounded-xs mb-2"></div>
                    <div className="h-2 w-1/2 bg-line rounded-xs"></div>
                  </div>
                  <div className="w-[140px] bg-surface border border-line rounded-sm p-2 shadow-sm">
                    <div className="h-2 w-full bg-line rounded-xs mb-2"></div>
                    <div className="h-2 w-3/4 bg-line rounded-xs"></div>
                  </div>
                </div>
              )}
              {activeMode.id === 'fullscreen' && (
                <div className="flex flex-col gap-2">
                  <div className="h-8 bg-surface border border-line rounded-sm flex items-center px-2">
                    <div className="h-2 w-1/3 bg-line rounded-xs"></div>
                  </div>
                  <div className="h-20 bg-surface border border-line rounded-sm p-2">
                    <div className="h-2 w-3/4 bg-line rounded-xs mb-2"></div>
                    <div className="h-2 w-full bg-line rounded-xs mb-1"></div>
                    <div className="h-2 w-2/3 bg-line rounded-xs"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-elevated border border-line rounded-md p-4">
            <div className="text-xs font-medium text-ink-secondary mb-2 font-mono">{activeMode.label} — 3 líneas</div>
            <pre className="text-xs font-mono text-ink overflow-x-auto"><code>{activeMode.code}</code></pre>
          </div>
        </div>
      )}
    </div>
  );
}
