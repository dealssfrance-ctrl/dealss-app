import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, X, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from '../version';

const REMOTE_VERSION_URL = 'https://troqly.be/version.json';
const REMOTE_SITE_URL = 'https://troqly.be/';
const DISMISS_KEY = 'troqly_update_dismissed_for';
const CHECK_DELAY_MS = 1500;

interface RemoteVersion {
  version?: string;
  buildTime?: string;
}

/**
 * Compares the embedded APP_VERSION with the version published at troqly.be.
 * If a newer version is detected, shows a non-blocking modal asking the user
 * to switch to the live site (which then loads the latest code).
 *
 * Behaviour:
 *  - Only runs on native platforms (no-op on the web build itself).
 *  - Skips check if APP_VERSION is the dev placeholder.
 *  - Remembers dismissal per remote-version (so it does not nag every launch
 *    for the same target version).
 */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Skip on dev builds and when running in a browser tab on troqly.be itself
    // (the website is, by definition, already up-to-date with itself).
    if (APP_VERSION === '__DEV__') return;
    if (!Capacitor.isNativePlatform()) {
      // On web, only show if origin is NOT troqly.be (e.g. hosted preview)
      if (typeof window !== 'undefined' && window.location.host.includes('troqly.be')) {
        return;
      }
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${REMOTE_VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const data = (await response.json()) as RemoteVersion;
        if (!data?.version) return;
        if (data.version === APP_VERSION) return;
        // Only consider remote as "newer" if it sorts strictly greater
        // (our version stamp is timestamp-based, so lex-compare works).
        if (data.version <= APP_VERSION) return;

        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed === data.version) return;

        setRemoteVersion(data.version);
        setOpen(true);
      } catch {
        // network error — silently ignore, the bundled app keeps working
      }
    }, CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    // Switch the WebView origin to the live site. On next app cold-start
    // the WebView reverts to the bundled assets unless the OS keeps the
    // process alive — which is fine, the user can update again.
    window.location.replace(REMOTE_SITE_URL);
  };

  const handleDismiss = () => {
    if (remoteVersion) {
      localStorage.setItem(DISMISS_KEY, remoteVersion);
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[9999] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-prompt-title"
    >
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="bg-gradient-to-br from-[#1FA774] to-[#16865c] text-white px-6 py-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <Download size={26} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="update-prompt-title" className="text-lg font-bold leading-tight">
              {t('update.title')}
            </h2>
            <p className="text-sm text-white/85 mt-0.5">{t('update.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('common.close')}
            className="p-1 rounded-full hover:bg-white/15 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {t('update.description')}
          </p>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-4 py-3 space-y-1">
            <div className="flex justify-between">
              <span>{t('update.current_version')}</span>
              <span className="font-mono">{APP_VERSION.slice(0, 22)}</span>
            </div>
            {remoteVersion && (
              <div className="flex justify-between">
                <span>{t('update.new_version')}</span>
                <span className="font-mono text-[#1FA774] font-semibold">
                  {remoteVersion.slice(0, 22)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-full font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('update.later')}
          </button>
          <button
            type="button"
            onClick={handleUpdate}
            className="flex-1 py-3 rounded-full font-semibold text-white bg-[#1FA774] hover:bg-[#16865c] transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            {t('update.update_now')}
          </button>
        </div>
      </div>
    </div>
  );
}
