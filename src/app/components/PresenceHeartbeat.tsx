import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendHeartbeat } from '../services/presenceService';

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 s

/**
 * Renders nothing. While the user is authenticated, sends a periodic
 * `last_seen_at` heartbeat so other clients can show presence indicators.
 *
 * Triggers:
 *   - on auth (immediate)
 *   - every 60 s
 *   - on tab visibility change (when becoming visible)
 *   - on `app:resume` (custom event from supabaseClient)
 *   - on browser `online`
 */
export function PresenceHeartbeat() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const beat = () => {
      if (cancelled) return;
      sendHeartbeat(userId);
    };

    beat();
    const intervalId = setInterval(beat, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', beat);
    window.addEventListener('online', beat);
    window.addEventListener('app:resume', beat);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', beat);
      window.removeEventListener('online', beat);
      window.removeEventListener('app:resume', beat);
    };
  }, [userId]);

  return null;
}
