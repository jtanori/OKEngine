import React from 'react';
import { Globe } from 'lucide-react';
import { SupportedLanguage } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { SegmentedTabs } from './ui/Tabs';

// ============================================================================
// UI-01 §2.2 & I18N-001 §6: Language Switcher Component (CO-LANGUAGE-SELECTOR)
// Supports SURF-PUBLIC, SURF-WORKSPACE, and SU-EMBED-* surfaces
// ============================================================================

export interface LanguageSelectorProps {
  value?: SupportedLanguage;
  onChange?: (lang: SupportedLanguage) => void;
  variant?: 'compact' | 'full';
  showIcon?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  variant = 'compact',
  showIcon = true,
  className = '',
}) => {
  const { language, setLanguage, t } = useI18n();
  const activeLang: SupportedLanguage = value ?? language;
  const handleSelect = onChange ?? setLanguage;

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`.trim()}
      title={t('common.language', 'Language')}
    >
      {showIcon && <Globe className="w-3.5 h-3.5 text-ink-secondary shrink-0" />}
      <SegmentedTabs<SupportedLanguage>
        size="sm"
        variant="ink"
        activeId={activeLang}
        onChange={handleSelect}
        options={[
          { id: 'en', label: variant === 'full' ? 'English (EN)' : 'EN' },
          { id: 'es', label: variant === 'full' ? 'Español (ES)' : 'ES' },
        ]}
      />
    </div>
  );
};
