import { useEffect, useState } from 'react';
import {
  describePresence,
  fetchLastSeen,
  PresenceInfo,
  subscribeToUserPresence,
} from '../services/presenceService';

/**
 * Subscribe to a user's presence. Re-evaluates the label every 30s so a card
 * left open transitions naturally from "En ligne" → "il y a 2 min" → ...
 */
export function useUserPresence(userId: string | null | undefined): PresenceInfo {
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchLastSeen(userId).then((value) => {
      if (!cancelled) setLastSeenAt(value);
    });
    const unsubscribe = subscribeToUserPresence(userId, (value) => {
      if (!cancelled) setLastSeenAt(value);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId]);

  // Refresh derived label every 30s (without re-fetching) so the relative
  // time stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return describePresence(lastSeenAt);
}
