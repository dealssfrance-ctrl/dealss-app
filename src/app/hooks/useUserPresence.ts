import { useEffect, useState } from 'react';
import {
  describePresence,
  fetchLastSeen,
  PresenceInfo,
  subscribeToUserPresence,
} from '../services/presenceService';
import { useAuth } from '../context/AuthContext';

/**
 * Subscribe to a user's presence. Re-evaluates the label every 30s so a card
 * left open transitions naturally from "En ligne" → "il y a 2 min" → ...
 *
 * If `userId` matches the currently-authenticated user, we treat them as
 * online immediately (avoids a race where the heartbeat hasn't yet written
 * to the DB on first paint).
 */
export function useUserPresence(userId: string | null | undefined): PresenceInfo {
  const { user: currentUser } = useAuth();
  const isSelf = !!userId && currentUser?.id === userId;
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const refetch = () => {
      fetchLastSeen(userId).then((value) => {
        if (!cancelled) setLastSeenAt(value);
      });
    };

    refetch();
    // Realtime may be disabled for the users table — poll every 45s as a
    // fallback so labels stay fresh even without Postgres Changes events.
    const pollId = setInterval(refetch, 45_000);

    const unsubscribe = subscribeToUserPresence(userId, (value) => {
      if (!cancelled) setLastSeenAt(value);
    });

    return () => {
      cancelled = true;
      clearInterval(pollId);
      unsubscribe();
    };
  }, [userId]);

  // Refresh derived label every 30s (without re-fetching) so the relative
  // time stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isSelf) {
    // The current user is, by definition, online right now.
    return describePresence(new Date().toISOString());
  }
  return describePresence(lastSeenAt);
}
