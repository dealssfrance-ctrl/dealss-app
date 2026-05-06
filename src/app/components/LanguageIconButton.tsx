import { useEffect, useRef, useState } from 'react';
import { Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LANGUAGE_FLAGS,
  setLanguage,
  getCurrentLanguage,
} from '../i18n';

interface LanguageIconButtonProps {
  className?: string;
  /** Color of the icon (CSS color or Tailwind text-* class via parent). Defaults to inherit. */
  iconColor?: string;
}

/**
 * Small icon button that opens a popover allowing the user to switch between FR/EN/NL.
 * Designed to fit inside headers and toolbars.
 */
export function LanguageIconButton({ className = '', iconColor }: LanguageIconButtonProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const current = (i18n.language?.split('-')[0] || getCurrentLanguage()) as
    (typeof SUPPORTED_LANGUAGES)[number];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (lng: (typeof SUPPORTED_LANGUAGES)[number]) => {
    setLanguage(lng);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('language.select')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-2 rounded-full hover:bg-black/5 transition-colors flex items-center justify-center"
        style={iconColor ? { color: iconColor } : undefined}
      >
        <Languages size={20} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-50"
        >
          {SUPPORTED_LANGUAGES.map((lng) => {
            const active = lng === current;
            return (
              <button
                key={lng}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(lng)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active ? 'bg-[#1FA774]/10 text-[#1FA774] font-semibold' : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg leading-none">{LANGUAGE_FLAGS[lng]}</span>
                <span className="flex-1 text-left">{LANGUAGE_NAMES[lng]}</span>
                {active && <Check size={16} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
