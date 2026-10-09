import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { sanitizePlainText, validateActionUrlInput } from '../services/formSecurity';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Next-Step CTA Action (CO-NEXT-STEP)
// Renders verified host action button beneath grounded answers.
// Enforces URL policy validation (blocks javascript:/data:/vbscript: schemes).
// ============================================================================

export interface NextStepButtonProps {
  label: string;
  url: string;
  onTrigger?: (action: { label: string; url: string }) => void;
  variant?: 'accent' | 'ink';
  className?: string;
}

export const NextStepButton: React.FC<NextStepButtonProps> = ({
  label,
  url,
  onTrigger,
  variant = 'accent',
  className = '',
}) => {
  const { t } = useI18n();
  const safeLabel = sanitizePlainText(label, 120) || t('common.next_step', 'Next step');
  const urlValidation = validateActionUrlInput(url, true);

  if (!urlValidation.valid) {
    return (
      <div
        role="alert"
        className={`pt-1 text-2xs font-mono text-danger flex items-center gap-1.5 ${className}`.trim()}
      >
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>
          {t(
            'validation.url_unsafe',
            'Blocked unsafe CTA URL scheme. Only verified relative /paths or https:// links are allowed.'
          )}
        </span>
      </div>
    );
  }

  const classes =
    variant === 'ink'
      ? 'bg-ink text-surface hover:bg-ink/90'
      : 'bg-accent text-surface hover:bg-accent-hover';

  return (
    <div className={`pt-1 ${className}`.trim()}>
      <button
        type="button"
        onClick={() =>
          onTrigger?.({ label: safeLabel, url: urlValidation.sanitizedValue })
        }
        className={`w-full flex items-center justify-between px-3 py-2 rounded-sm text-xs font-medium transition-colors cursor-pointer ${classes}`}
      >
        <span>
          {t('common.next_step', 'Next step')}: {safeLabel}
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-2xs opacity-90">
          <span>{urlValidation.sanitizedValue}</span>
          <ExternalLink className="w-3 h-3" />
        </span>
      </button>
    </div>
  );
};
