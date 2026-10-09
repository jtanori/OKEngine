import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '../../i18n/I18nContext';

// ============================================================================
// UI-01 & 01_ui_foundation.md: Monospace Code Block Primitive (PR-CODE-BLOCK)
// ============================================================================

export interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  label?: string;
  variant?: 'dark' | 'elevated';
  showCopy?: boolean;
  className?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
  title,
  label,
  variant = 'dark',
  showCopy = true,
  className = '',
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const resolvedTitle = title ?? label;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`border border-line rounded-sm overflow-hidden ${className}`.trim()}>
      {(resolvedTitle || language || showCopy) && (
        <div className="px-4 py-2 bg-elevated border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            {resolvedTitle && <span className="text-xs font-semibold text-ink">{resolvedTitle}</span>}
            {language && (
              <span className="font-mono text-2xs uppercase text-ink-secondary">{language}</span>
            )}
          </div>
          {showCopy && (
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-success" />
                  <span>{t('common.copied', 'Copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{t('common.copy', 'Copy')}</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}
      <div
        className={`p-5 font-mono text-xs overflow-x-auto leading-relaxed ${
          variant === 'dark' ? 'bg-ink text-canvas' : 'bg-elevated text-ink'
        }`}
      >
        <pre>{code}</pre>
      </div>
    </div>
  );
};
