import React from 'react';
import { AccessVisibility } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { AccessBadge, Text } from './ui';

// ============================================================================
// UI-01 §2.2 & 02_component_catalog.md: Visibility Selector (CO-VISIBILITY-SELECTOR)
// 3-tier pre-retrieval access boundary selector (everyone, members, admins)
// ============================================================================

export interface VisibilitySelectorProps {
  value: AccessVisibility;
  onChange: (visibility: AccessVisibility) => void;
  label?: string;
  layout?: 'stack' | 'inline';
  className?: string;
}

export const VisibilitySelector: React.FC<VisibilitySelectorProps> = ({
  value,
  onChange,
  label,
  layout = 'stack',
  className = '',
}) => {
  const { t } = useI18n();

  const tiers: { id: AccessVisibility; label: string; desc: string }[] = [
    {
      id: 'everyone',
      label: t('common.everyone', 'Everyone'),
      desc: t(
        'collections.vis.everyone_desc',
        'Publicly accessible to all visitors and unauthenticated widget users.'
      ),
    },
    {
      id: 'members',
      label: t('common.members', 'Members'),
      desc: t(
        'collections.vis.members_desc',
        'Restricted to signed-in workspace members and authenticated customers.'
      ),
    },
    {
      id: 'admins',
      label: t('common.admins', 'Admins'),
      desc: t(
        'collections.vis.admins_desc',
        'Strictly isolated for internal administrators and privileged operators.'
      ),
    },
  ];

  if (layout === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`.trim()}>
        {tiers.map((tier) => {
          const isSelected = value === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={`px-2.5 py-1 rounded-xs text-2xs font-mono uppercase border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-ink text-surface border-ink'
                  : 'bg-surface text-ink-secondary border-line hover:text-ink'
              }`}
            >
              {tier.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      {label && (
        <Text as="label" variant="h3" tone="primary" className="block">
          {label}
        </Text>
      )}
      <div className="grid grid-cols-1 gap-2">
        {tiers.map((tier) => {
          const isSelected = value === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={`flex items-start justify-between p-3 rounded-sm border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-accent bg-accent-subtle/60 ring-1 ring-accent'
                  : 'border-line bg-surface hover:bg-elevated'
              }`}
            >
              <div className="space-y-0.5 pr-4">
                <div className="text-xs font-semibold text-ink">{tier.label}</div>
                <div className="text-2xs text-ink-secondary">{tier.desc}</div>
              </div>
              <AccessBadge visibility={tier.id} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
