import React from 'react';
import { AccessVisibility } from '../types';
import { Globe, Users, Shield } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { SegmentedTabs, SegmentedTabsSize } from './ui/Tabs';

// ============================================================================
// UI-01 §2.2: Role / Clearance Simulation Selector (CO-ROLE-SELECTOR)
// Composes PR-TABS (SegmentedTabs) to guarantee exact height alignment (sm = 32px)
// ============================================================================

interface RoleSelectorProps {
  value: AccessVisibility;
  onChange: (role: AccessVisibility) => void;
  size?: SegmentedTabsSize;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  size = 'sm',
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <span className="text-2xs font-mono uppercase tracking-wider text-ink-secondary">
        {t('test.role_label', 'Simulate User:')}
      </span>
      <SegmentedTabs<AccessVisibility>
        size={size}
        activeId={value}
        onChange={onChange}
        options={[
          {
            id: 'everyone',
            label: t('visibility.everyone', 'Everyone'),
            icon: <Globe className="w-3.5 h-3.5 text-ink-secondary" />,
          },
          {
            id: 'members',
            label: t('visibility.members', 'Members'),
            icon: <Users className="w-3.5 h-3.5 text-accent" />,
          },
          {
            id: 'admins',
            label: t('visibility.admins', 'Admins'),
            icon: <Shield className="w-3.5 h-3.5 text-warning" />,
          },
        ]}
      />
    </div>
  );
};
