import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  setLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'inline' | 'card';
  showIcon?: boolean;
  onChange?: (lng: SupportedLanguage) => void;
}

export function LanguageSwitcher({
  variant = 'card',
  showIcon = true,
  onChange,
}: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const current = getCurrentLanguage();

  const handleSelect = async (lng: SupportedLanguage) => {
    if (lng === current) return;
    await setLanguage(lng);
    onChange?.(lng);
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => handleSelect(lng)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              current === lng
                ? 'bg-[#1FA774] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-pressed={current === lng}
          >
            <span aria-hidden>{LANGUAGE_FLAGS[lng]}</span>
            {LANGUAGE_NAMES[lng]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {showIcon && <Globe size={18} className="text-gray-700" />}
        <div>
          <h3 className="font-semibold text-gray-900">{t('profile.language')}</h3>
          <p className="text-xs text-gray-500">{t('profile.language_subtitle')}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {SUPPORTED_LANGUAGES.map((lng) => (
          <button
            key={lng}
            type="button"
            onClick={() => handleSelect(lng)}
            className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-sm transition-colors ${
              current === lng
                ? 'border-[#1FA774] bg-[#1FA774]/10 text-[#1FA774] font-semibold'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={current === lng}
          >
            <span className="text-2xl" aria-hidden>{LANGUAGE_FLAGS[lng]}</span>
            <span>{LANGUAGE_NAMES[lng]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
