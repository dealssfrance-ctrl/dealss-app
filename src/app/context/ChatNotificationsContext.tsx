import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { chatService, type ConversationSummary } from '../services/chatService';
import { playMessageSound } from '../utils/sounds';

const POLL_MS = 15_000;
const SEEN_PREFIX = 'chat:lastSeen:';
const PERMISSION_ASKED_KEY = 'chat:notif:asked';

interface ChatNotificationsContextValue {
  unreadCount: number;
  unreadByConversation: Record<string, boolean>;
  markConversationRead: (conversationId: string, ts?: string) => void;
  requestPermission: () => Promise<NotificationPermission>;
}

const ChatNotificationsContext = createContext<ChatNotificationsContextValue>({
  unreadCount: 0,
  unreadByConversation: {},
  markConversationRead: () => {},
  requestPermission: async () => 'denied',
});

function getLastSeen(convId: string): number {
  try {
    const v = localStorage.getItem(SEEN_PREFIX + convId);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function setLastSeen(convId: string, ts: number) {
  try {
    localStorage.setItem(SEEN_PREFIX + convId, String(ts));
  } catch { /* noop */ }
}

export function ChatNotificationsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadByConversation, setUnreadByConversation] = useState<Record<string, boolean>>({});
  // Track which conversations we already notified for (to avoid repeating sound on every poll).
  const notifiedRef = useRef<Set<string>>(new Set());
  // Have we run a first poll yet? On first load, don't fire notifications for messages
  // that were already there before the app opened.
  const initializedRef = useRef(false);

  const getActiveConversationId = (): string | null => {
    const m = (typeof window !== 'undefined' ? window.location.pathname : '').match(/^\/chat\/([^/?#]+)/);
    return m ? m[1] : null;
  };

  const markConversationRead = useCallback((conversationId: string, ts?: string) => {
    const seen = ts ? new Date(ts).getTime() : Date.now();
    if (Number.isFinite(seen) && seen > 0) {
      setLastSeen(conversationId, seen);
    }
    notifiedRef.current.delete(conversationId);
    setUnreadByConversation((prev) => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Notification.permission;
    }
    try {
      const result = await Notification.requestPermission();
      try { localStorage.setItem(PERMISSION_ASKED_KEY, '1'); } catch { /* noop */ }
      return result;
    } catch {
      return 'denied' as NotificationPermission;
    }
  }, []);

  // Politely ask for browser notification permission once after sign-in.
  useEffect(() => {
    if (!isAuthenticated || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'default') return;
    let asked = false;
    try { asked = localStorage.getItem(PERMISSION_ASKED_KEY) === '1'; } catch { /* noop */ }
    if (asked) return;
    // Defer to first user interaction so the prompt is allowed by browsers.
    const onFirstInteraction = () => {
      void requestPermission();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
  }, [isAuthenticated, requestPermission]);

  // Poll for new messages globally.
  useEffect(() => {
    if (!user) {
      setUnreadByConversation({});
      notifiedRef.current.clear();
      initializedRef.current = false;
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const resp = await chatService.getConversations(user.id);
        if (cancelled) return;
        const conversations = resp.data || [];
        const nextUnread: Record<string, boolean> = {};
        const newMessages: ConversationSummary[] = [];
        const activeId = getActiveConversationId();

        for (const c of conversations) {
          const ts = c.lastMessageTime ? new Date(c.lastMessageTime).getTime() : 0;
          if (!ts) continue;
          // If we are viewing this conversation, treat as read live.
          if (activeId === c.id) {
            setLastSeen(c.id, ts);
            continue;
          }
          const seen = getLastSeen(c.id);
          const isFromOther = c.lastMessageSenderId && c.lastMessageSenderId !== user.id;
          const unread = isFromOther && ts > seen;
          if (unread) {
            nextUnread[c.id] = true;
            const sig = `${c.id}:${ts}`;
            if (initializedRef.current && !notifiedRef.current.has(sig)) {
              newMessages.push(c);
              notifiedRef.current.add(sig);
            }
          }
        }

        // First poll: hydrate counts but don't fire sound/notifications retroactively.
        if (!initializedRef.current) {
          initializedRef.current = true;
        }

        setUnreadByConversation(nextUnread);

        for (const c of newMessages) {
          try { playMessageSound(); } catch { /* noop */ }
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              const n = new Notification(c.otherUserName || 'Nouveau message', {
                body: c.lastMessage || 'Nouveau message',
                tag: `chat-${c.id}`,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
              });
              n.onclick = () => {
                window.focus();
                window.location.href = `/chat/${c.id}`;
              };
            } catch { /* noop */ }
          }
        }
      } catch {
        // Silent — chat polling shouldn't toast on transient errors.
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, POLL_MS);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user]);

  const unreadCount = Object.values(unreadByConversation).filter(Boolean).length;

  const value = useMemo<ChatNotificationsContextValue>(
    () => ({ unreadCount, unreadByConversation, markConversationRead, requestPermission }),
    [unreadCount, unreadByConversation, markConversationRead, requestPermission],
  );

  return (
    <ChatNotificationsContext.Provider value={value}>
      {children}
    </ChatNotificationsContext.Provider>
  );
}

export function useChatNotifications() {
  return useContext(ChatNotificationsContext);
}
