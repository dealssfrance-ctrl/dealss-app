import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY environment variables');
}

// Workaround for the well-known supabase-js deadlock that happens when a tab is
// backgrounded then resumed: the cross-tab Web Locks acquisition can hang and
// every subsequent query gets stuck behind it (infinite skeletons / clicks that
// appear to do nothing). Replacing the lock with an in-memory mutex keeps the
// auth state safe within the tab while removing the cross-tab deadlock.
type LockFn = <R>(name: string, acquireTimeout: number, fn: () => Promise<R>) => Promise<R>;

const inMemoryLocks = new Map<string, Promise<unknown>>();
const inMemoryLock: LockFn = async (name, _timeout, fn) => {
  const previous = inMemoryLocks.get(name) ?? Promise.resolve();
  const current = previous.catch(() => {}).then(() => fn());
  inMemoryLocks.set(name, current);
  try {
    return await current;
  } finally {
    if (inMemoryLocks.get(name) === current) {
      inMemoryLocks.delete(name);
    }
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: inMemoryLock,
  },
});

// On tab resume, kick the auth subsystem and broadcast an event so screens can
// re-run any data fetch that may have been started while the tab was hidden.
if (typeof document !== 'undefined') {
  let lastHiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenAt = Date.now();
      return;
    }
    if (document.visibilityState !== 'visible') return;
    const wasAwayLong = Date.now() - lastHiddenAt > 5000;

    // Restart the auto-refresh ticker; this also releases any stale lock state.
    Promise.resolve()
      .then(() => supabase.auth.startAutoRefresh())
      .catch(() => { /* noop */ });

    if (wasAwayLong) {
      window.dispatchEvent(new CustomEvent('app:resume'));
    }
  });

  window.addEventListener('online', () => {
    window.dispatchEvent(new CustomEvent('app:resume'));
  });
}
