import { supabase } from './supabaseClient';

/**
 * Presence service — tracks per-user "last seen" timestamps so we can show
 * "En ligne" / "En ligne il y a X minutes" indicators.
 *
 * Persistence is done in the `users.last_seen_at` column. The current user
 * sends a heartbeat at a regular interval (and on focus/visibility events).
 * Other clients read the timestamp on demand and may also subscribe to live
 * updates via Postgres Realtime.
 *
 * Threshold conventions (used by the UI helper below):
 *   < 2 minutes : green dot — "En ligne"
 *   < 60 minutes: amber dot — "En ligne il y a X min"
 *   else        : gray dot  — "Vu il y a X h/j"
 *   never seen  : hidden
 */

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
const RECENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export type PresenceStatus = 'online' | 'recent' | 'away' | 'unknown';

export interface PresenceInfo {
  lastSeenAt: string | null;
  status: PresenceStatus;
  /** Localized French label, e.g. "En ligne" or "En ligne il y a 5 min". */
  label: string;
}

export function describePresence(lastSeenAt: string | null | undefined): PresenceInfo {
  if (!lastSeenAt) {
    return { lastSeenAt: null, status: 'unknown', label: '' };
  }
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) {
    return { lastSeenAt: null, status: 'unknown', label: '' };
  }
  const diff = Date.now() - ts;

  if (diff < ONLINE_THRESHOLD_MS) {
    return { lastSeenAt, status: 'online', label: 'En ligne' };
  }

  const minutes = Math.max(1, Math.round(diff / 60000));
  if (diff < RECENT_THRESHOLD_MS) {
    return { lastSeenAt, status: 'recent', label: `En ligne il y a ${minutes} min` };
  }

  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) {
    return {
      lastSeenAt,
      status: 'away',
      label: `Vu il y a ${hours} h`,
    };
  }
  const days = Math.round(diff / 86_400_000);
  return { lastSeenAt, status: 'away', label: `Vu il y a ${days} j` };
}

/** Update the current user's `last_seen_at` to now. Logs failures. */
export async function sendHeartbeat(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) {
      console.warn('[presence] heartbeat failed:', error.message);
    }
  } catch (err) {
    console.warn('[presence] heartbeat threw:', err);
  }
}

/** Fetch a single user's last_seen_at. Returns null if column missing or no data. */
export async function fetchLastSeen(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('last_seen_at')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('[presence] fetchLastSeen failed:', error.message);
      return null;
    }
    if (!data) return null;
    return (data as any).last_seen_at ?? null;
  } catch (err) {
    console.warn('[presence] fetchLastSeen threw:', err);
    return null;
  }
}

/**
 * Subscribe to live updates of a user's last_seen_at via Postgres Realtime.
 * Returns an unsubscribe function.
 */
export function subscribeToUserPresence(
  userId: string,
  onChange: (lastSeenAt: string | null) => void,
): () => void {
  // Channel names must be unique per subscription instance — sharing a name
  // between two callers triggers "cannot add postgres_changes callbacks
  // after subscribe()" because supabase-js reuses the existing channel.
  const channelName = `presence:${userId}:${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      (payload) => {
        const next = (payload.new as any)?.last_seen_at ?? null;
        onChange(next);
      },
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}
