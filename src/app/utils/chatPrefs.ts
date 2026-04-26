// Per-user, client-side preferences for conversations: pinned + archived sets.
// Stored in localStorage so they survive reloads without DB schema changes.

type Bucket = 'pinned' | 'archived';

function key(userId: string, bucket: Bucket) {
  return `chat:${bucket}:${userId}`;
}

function read(userId: string, bucket: Bucket): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(key(userId, bucket));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function write(userId: string, bucket: Bucket, set: Set<string>) {
  if (!userId) return;
  try {
    localStorage.setItem(key(userId, bucket), JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent('chat:prefs-changed', { detail: { userId, bucket } }));
  } catch {
    /* ignore quota errors */
  }
}

export const chatPrefs = {
  getPinned(userId: string): Set<string> {
    return read(userId, 'pinned');
  },
  getArchived(userId: string): Set<string> {
    return read(userId, 'archived');
  },
  isPinned(userId: string, convId: string): boolean {
    return read(userId, 'pinned').has(convId);
  },
  isArchived(userId: string, convId: string): boolean {
    return read(userId, 'archived').has(convId);
  },
  togglePin(userId: string, convId: string): boolean {
    const s = read(userId, 'pinned');
    const next = !s.has(convId);
    if (next) s.add(convId);
    else s.delete(convId);
    write(userId, 'pinned', s);
    return next;
  },
  toggleArchive(userId: string, convId: string): boolean {
    const s = read(userId, 'archived');
    const next = !s.has(convId);
    if (next) {
      s.add(convId);
      // Archiving auto-unpins.
      const pins = read(userId, 'pinned');
      if (pins.delete(convId)) write(userId, 'pinned', pins);
    } else {
      s.delete(convId);
    }
    write(userId, 'archived', s);
    return next;
  },
  remove(userId: string, convIds: string[]) {
    const a = read(userId, 'archived');
    const p = read(userId, 'pinned');
    let aChanged = false;
    let pChanged = false;
    for (const id of convIds) {
      if (a.delete(id)) aChanged = true;
      if (p.delete(id)) pChanged = true;
    }
    if (aChanged) write(userId, 'archived', a);
    if (pChanged) write(userId, 'pinned', p);
  },
};
