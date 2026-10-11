// PR-CODE-SNIPPET — Code block with language, copy button, DS tokens
// DS tokens: bg-elevated, border-line, rounded-sm, font-mono, text-ink
import React, { useState } from 'react';

export interface CodeSnippetProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}

export function CodeSnippet({ code, language = 'tsx', title, className = '' }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className={`bg-elevated border border-line rounded-md overflow-hidden ${className}`}>
      {(title || language) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-surface">
          <span className="text-xs font-medium text-ink-secondary font-mono">{title || language}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-ink-secondary hover:text-ink transition-colors"
            aria-label="Copy code"
          >
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-xs font-mono text-ink leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
