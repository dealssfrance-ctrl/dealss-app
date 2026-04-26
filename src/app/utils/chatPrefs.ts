// Per-user, client-side preferences for conversations: pinned + archived sets,
// plus a per-user "hidden" map (soft-delete) keyed by conversation id with the
// timestamp at which the user hid it. New messages with a `lastMessageTime`
// strictly greater than that timestamp resurrect the conversation.
// Stored in localStorage so they survive reloads without DB schema changes.

type Bucket = 'pinned' | 'archived';

function key(userId: string, bucket: Bucket) {
  return `chat:${bucket}:${userId}`;
}

function hiddenKey(userId: string) {
  return `chat:hidden:${userId}`;
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

function readHidden(userId: string): Record<string, string> {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(hiddenKey(userId));
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? (obj as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeHidden(userId: string, map: Record<string, string>) {
  if (!userId) return;
  try {
    localStorage.setItem(hiddenKey(userId), JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('chat:prefs-changed', { detail: { userId, bucket: 'hidden' } }));
  } catch {
    /* ignore */
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
  /** Returns map of convId → ISO timestamp at which the user hid it. */
  getHidden(userId: string): Record<string, string> {
    return readHidden(userId);
  },
  /** Soft-delete: hide for the current user only. */
  hide(userId: string, convIds: string[]): void {
    if (!userId || !convIds.length) return;
    const map = readHidden(userId);
    const now = new Date().toISOString();
    for (const id of convIds) map[id] = now;
    writeHidden(userId, map);
    // Also drop pin/archive for hidden ids — they no longer make sense.
    chatPrefs.remove(userId, convIds);
  },
  /** Explicitly bring a hidden conversation back. */
  unhide(userId: string, convIds: string[]): void {
    const map = readHidden(userId);
    let changed = false;
    for (const id of convIds) {
      if (id in map) {
        delete map[id];
        changed = true;
      }
    }
    if (changed) writeHidden(userId, map);
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
