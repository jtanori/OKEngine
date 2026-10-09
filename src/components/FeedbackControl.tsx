import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Badge } from './ui';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Helpful / Unhelpful Feedback (CO-FEEDBACK)
// ============================================================================

export interface FeedbackControlProps {
  feedback?: 'up' | 'down';
  onRate?: (rating: 'up' | 'down') => void;
  readOnly?: boolean;
  className?: string;
}

export const FeedbackControl: React.FC<FeedbackControlProps> = ({
  feedback,
  onRate,
  readOnly = false,
  className = '',
}) => {
  const { t } = useI18n();

  if (readOnly) {
    if (!feedback) return null;
    return feedback === 'up' ? (
      <Badge tone="success" mono className={className}>
        <ThumbsUp className="w-3 h-3" />
        <span>{t('common.positive_feedback', 'Positive Feedback')}</span>
      </Badge>
    ) : (
      <Badge tone="danger" mono className={className}>
        <ThumbsDown className="w-3 h-3" />
        <span>{t('common.negative_feedback', 'Negative Feedback')}</span>
      </Badge>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="text-2xs text-ink-secondary">{t('chat.helpful', 'Was this helpful?')}</span>
      <button
        type="button"
        onClick={() => onRate?.('up')}
        aria-label={t('common.helpful', 'Helpful')}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs border transition-colors cursor-pointer ${
          feedback === 'up'
            ? 'bg-success-subtle text-success border-success/30'
            : 'bg-surface text-ink-secondary border-line hover:text-ink'
        }`}
      >
        <ThumbsUp className="w-3 h-3" />
        <span>{t('common.helpful', 'Helpful')}</span>
      </button>
      <button
        type="button"
        onClick={() => onRate?.('down')}
        aria-label={t('common.unhelpful', 'Unhelpful')}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-2xs border transition-colors cursor-pointer ${
          feedback === 'down'
            ? 'bg-danger-subtle text-danger border-danger/30'
            : 'bg-surface text-ink-secondary border-line hover:text-ink'
        }`}
      >
        <ThumbsDown className="w-3 h-3" />
        <span>{t('common.unhelpful', 'Unhelpful')}</span>
      </button>
    </div>
  );
};
