import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { Capacitor } from '@capacitor/core';

import fr from './locales/fr.json';
import en from './locales/en.json';
import nl from './locales/nl.json';

export const SUPPORTED_LANGUAGES = ['fr', 'en', 'nl'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  nl: 'Nederlands',
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  nl: '🇳🇱',
};

const STORAGE_KEY = 'troqly_language';

function normalize(code: string | null | undefined): SupportedLanguage | null {
  if (!code) return null;
  const lower = code.toLowerCase().split(/[-_]/)[0];
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lower)) {
    return lower as SupportedLanguage;
  }
  return null;
}

/**
 * Detects native device language on Capacitor before i18n init.
 * Falls back to navigator.language for web.
 */
export async function detectInitialLanguage(): Promise<SupportedLanguage> {
  // 1. User explicit choice has top priority
  try {
    const stored = normalize(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // ignore (private mode)
  }

  // 2. Native device language on iOS / Android
  if (Capacitor.isNativePlatform()) {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getLanguageCode();
      const detected = normalize(info?.value);
      if (detected) return detected;
    } catch {
      // ignore
    }
  }

  // 3. Browser language (navigator.languages then navigator.language)
  if (typeof navigator !== 'undefined') {
    const candidates = [
      ...(navigator.languages || []),
      navigator.language || '',
    ];
    for (const c of candidates) {
      const detected = normalize(c);
      if (detected) return detected;
    }
  }

  // 4. Default
  return 'fr';
}

export async function initI18n(): Promise<void> {
  const lng = await detectInitialLanguage();

  await i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        fr: { translation: fr },
        en: { translation: en },
        nl: { translation: nl },
      },
      lng,
      fallbackLng: 'fr',
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      interpolation: { escapeValue: false },
      returnNull: false,
      detection: {
        order: [],
        caches: [],
      },
    });

  try {
    document.documentElement.lang = lng;
  } catch {
    // ignore
  }
}

export async function setLanguage(lng: SupportedLanguage): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // ignore
  }
  await i18n.changeLanguage(lng);
  try {
    document.documentElement.lang = lng;
  } catch {
    // ignore
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const code = i18n.language || 'fr';
  return normalize(code) ?? 'fr';
}

export default i18n;
