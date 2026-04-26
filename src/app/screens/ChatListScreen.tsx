import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout } from '../components/Layout';
import { HyvisHeader } from '../components/HyvisHeader';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Search, MoreVertical, Pin, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService, ConversationSummary } from '../services/chatService';
import { ChatListSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';
import { chatPrefs } from '../utils/chatPrefs';

const POLL_INTERVAL = 30000; // 30 seconds
const REQUEST_TIMEOUT_MS = 12000;

function withTimeout<T>(promise: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

// Deterministic pastel avatar color from the user's name.
const AVATAR_PALETTE = [
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-emerald-500',
  'from-cyan-400 to-blue-500',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function ChatListScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'archived'>('all');
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [archived, setArchived] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Record<string, string>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate prefs from localStorage and stay in sync with cross-tab updates.
  useEffect(() => {
    if (!user) return;
    const sync = () => {
      setPinned(chatPrefs.getPinned(user.id));
      setArchived(chatPrefs.getArchived(user.id));
      setHidden(chatPrefs.getHidden(user.id));
    };
    sync();
    window.addEventListener('chat:prefs-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('chat:prefs-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [user]);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await withTimeout(chatService.getConversations(user.id));
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Chargement trop long. Réessayez.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // A conversation is "archived" iff ALL its sibling IDs are archived.
  // A conversation is "pinned" iff its representative ID is pinned.
  const isArchived = useCallback(
    (c: ConversationSummary) => {
      const ids = c.siblingConversationIds?.length ? c.siblingConversationIds : [c.id];
      return ids.every((id) => archived.has(id));
    },
    [archived],
  );
  const isPinned = useCallback((c: ConversationSummary) => pinned.has(c.id), [pinned]);

  // A conversation is hidden iff ALL its sibling IDs are hidden AND its
  // last message is not newer than the most recent hide timestamp among
  // those siblings. A new incoming message resurfaces it automatically.
  const isHidden = useCallback(
    (c: ConversationSummary) => {
      const ids = c.siblingConversationIds?.length ? c.siblingConversationIds : [c.id];
      const stamps = ids.map((id) => hidden[id]).filter(Boolean) as string[];
      if (stamps.length === 0 || stamps.length < ids.length) return false;
      const latestHide = stamps.reduce((a, b) => (a > b ? a : b));
      return !(c.lastMessageTime && c.lastMessageTime > latestHide);
    },
    [hidden],
  );

  // Auto-cleanup: once a hidden conversation has resurfaced (new message
  // newer than the hide timestamp), drop the hide marker so it stays visible.
  useEffect(() => {
    if (!user) return;
    const ids: string[] = [];
    for (const c of conversations) {
      const sibs = c.siblingConversationIds?.length ? c.siblingConversationIds : [c.id];
      for (const id of sibs) {
        const stamp = hidden[id];
        if (stamp && c.lastMessageTime && c.lastMessageTime > stamp) ids.push(id);
      }
    }
    if (ids.length > 0) chatPrefs.unhide(user.id, ids);
  }, [conversations, hidden, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = conversations.filter((c) => !isHidden(c));
    list = list.filter((c) => (tab === 'archived' ? isArchived(c) : !isArchived(c)));
    if (q) {
      list = list.filter(
        (c) =>
          (c.otherUserName || '').toLowerCase().includes(q) ||
          (c.storeName || '').toLowerCase().includes(q) ||
          (c.lastMessage || '').toLowerCase().includes(q),
      );
    }
    // Sort: pinned first (only in 'all' tab), then by most-recent message.
    return [...list].sort((a, b) => {
      if (tab === 'all') {
        const pa = isPinned(a) ? 1 : 0;
        const pb = isPinned(b) ? 1 : 0;
        if (pa !== pb) return pb - pa;
      }
      return (
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
    });
  }, [conversations, query, tab, isArchived, isPinned, isHidden]);

  const archivedCount = useMemo(
    () => conversations.filter((c) => !isHidden(c) && isArchived(c)).length,
    [conversations, isArchived, isHidden],
  );

  const visibleCount = useMemo(
    () => conversations.filter((c) => !isHidden(c)).length,
    [conversations, isHidden],
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (mins < 1) return "À l'instant";
    if (mins < 60) return `${mins} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // ── Context-menu actions ───────────────────────────────────────────────
  const handlePin = (c: ConversationSummary) => {
    if (!user) return;
    const next = chatPrefs.togglePin(user.id, c.id);
    setMenuOpenId(null);
    toast.success(next ? 'Conversation épinglée' : 'Conversation désépinglée');
  };

  const handleArchive = (c: ConversationSummary) => {
    if (!user) return;
    const ids = c.siblingConversationIds?.length ? c.siblingConversationIds : [c.id];
    const willArchive = !isArchived(c);
    for (const id of ids) {
      // Toggle to the desired final state for every sibling.
      const currentlyArchived = chatPrefs.isArchived(user.id, id);
      if (currentlyArchived !== willArchive) chatPrefs.toggleArchive(user.id, id);
    }
    setMenuOpenId(null);
    toast.success(willArchive ? 'Conversation archivée' : 'Conversation désarchivée');
  };

  const handleDelete = async (c: ConversationSummary) => {
    if (!user) return;
    setMenuOpenId(null);
    const ids = c.siblingConversationIds?.length ? c.siblingConversationIds : [c.id];
    try {
      // Soft-delete: hide for this user only. The other participant keeps
      // their copy. If the other user sends a new message later, the
      // conversation will resurface (lastMessageTime > hiddenAt).
      chatPrefs.hide(user.id, ids);
      setConversations((prev) => prev.filter((x) => !ids.includes(x.id)));
      toast.success('Conversation supprimée');
    } catch (err) {
      console.error('delete conversation failed', err);
      toast.error('Suppression impossible');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Long-press on touch devices opens the context menu (≈500ms).
  const startLongPress = (id: string) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setMenuOpenId(id), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-b from-[#f4fbf8] via-white to-gray-50">
          <HyvisHeader />
          <div className="flex flex-col items-center justify-center py-32 px-6">
            <div className="w-20 h-20 rounded-3xl bg-[#1FA774]/10 flex items-center justify-center mb-5">
              <MessageSquare size={36} className="text-[#1FA774]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vos messages</h2>
            <p className="text-gray-500 text-center mb-6 max-w-xs">
              Connectez-vous pour discuter avec d'autres membres et échanger vos réductions.
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="px-8 py-3 bg-[#1FA774] text-white font-semibold rounded-full shadow-md shadow-[#1FA774]/30 hover:bg-[#16865c] transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#f4fbf8] via-white to-gray-50 pb-6">
        <HyvisHeader />

        {/* Header — gradient banner */}
        <div className="relative bg-gradient-to-br from-[#1FA774] to-[#16865c] text-white overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.4) 0, transparent 40%)',
            }}
          />
          <div className="relative max-w-4xl mx-auto px-5 md:px-8 pt-7 pb-6">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/70 mb-1">
                  Boîte de réception
                </p>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Messages</h1>
              </div>
              <span className="text-sm text-white/80 bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                {conversations.length}{' '}
                {conversations.length <= 1 ? 'conversation' : 'conversations'}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une conversation…"
                className="w-full bg-white/95 text-gray-900 placeholder-gray-400 pl-11 pr-4 py-3 rounded-full text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2">
              {([
                { key: 'all', label: 'Toutes', count: visibleCount - archivedCount },
                { key: 'archived', label: 'Archivées', count: archivedCount },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setMenuOpenId(null); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-white text-[#1FA774] shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 text-[11px] ${tab === t.key ? 'text-[#1FA774]/70' : 'text-white/70'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversations List */}
        <div className="max-w-3xl mx-auto md:px-8 md:py-6 -mt-3">
          {loading ? (
            <div className="md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden">
              <ChatListSkeleton count={5} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6">
              <div className="w-20 h-20 rounded-3xl bg-[#1FA774]/10 flex items-center justify-center mb-5">
                <MessageSquare size={36} className="text-[#1FA774]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {query ? 'Aucun résultat' : 'Pas encore de messages'}
              </h2>
              <p className="text-gray-500 text-center max-w-xs">
                {query
                  ? 'Essayez avec un autre nom ou marque.'
                  : 'Contactez un vendeur depuis une offre pour démarrer une conversation.'}
              </p>
            </div>
          ) : (
            <div className="md:bg-white md:rounded-2xl md:shadow-sm divide-y divide-gray-100">
              {filtered.map((conversation, index) => {
                const name = conversation.otherUserName || 'Utilisateur';
                const initial = name.charAt(0).toUpperCase();
                const gradient = avatarGradient(name);
                const pinnedRow = isPinned(conversation);
                const archivedRow = isArchived(conversation);
                const open = menuOpenId === conversation.id;
                return (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.2) }}
                    className="relative bg-white"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/chat/${conversation.id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/chat/${conversation.id}`); }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenuOpenId(open ? null : conversation.id);
                      }}
                      onTouchStart={() => startLongPress(conversation.id)}
                      onTouchEnd={cancelLongPress}
                      onTouchCancel={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      className="w-full px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                    >
                      {/* Gradient avatar */}
                      <div
                        className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                      >
                        <span className="text-white font-bold text-base">{initial}</span>
                        {pinnedRow && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 ring-2 ring-white flex items-center justify-center">
                            <Pin size={10} className="text-white" strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <h3 className="font-semibold text-gray-900 truncate text-[15px]">
                            {name}
                          </h3>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(conversation.lastMessageTime)}
                          </span>
                        </div>
                        {conversation.storeName && (
                          <p className="text-xs text-[#1FA774] font-medium truncate mb-0.5">
                            · {conversation.storeName}
                            {conversation.offerCount > 1 && (
                              <span className="text-gray-400 font-normal ml-1">
                                +{conversation.offerCount - 1} autre{conversation.offerCount > 2 ? 's' : ''}
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.lastMessage || (
                            <span className="italic text-gray-400">Aucun message</span>
                          )}
                        </p>
                      </div>

                      {/* 3-dot menu trigger */}
                      <button
                        type="button"
                        aria-label="Actions de conversation"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(open ? null : conversation.id);
                        }}
                        className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 flex-shrink-0"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>

                    {/* Context menu */}
                    <AnimatePresence>
                      {open && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setMenuOpenId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-3 top-12 z-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[180px]"
                          >
                            <button
                              type="button"
                              onClick={() => handlePin(conversation)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                            >
                              <Pin size={16} className="text-amber-500" />
                              {pinnedRow ? 'Désépingler' : 'Épingler'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchive(conversation)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                            >
                              {archivedRow ? (
                                <ArchiveRestore size={16} className="text-sky-500" />
                              ) : (
                                <Archive size={16} className="text-sky-500" />
                              )}
                              {archivedRow ? 'Désarchiver' : 'Archiver'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(conversation.id)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
                            >
                              <Trash2 size={16} />
                              Supprimer
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Delete confirmation */}
                    {confirmDeleteId === conversation.id && (
                      <div
                        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-5"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        <div
                          className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            Supprimer la conversation ?
                          </h3>
                          <p className="text-sm text-gray-600 mb-5">
                            Tous les messages échangés avec <strong>{name}</strong> seront définitivement supprimés. Cette action est irréversible.
                          </p>
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(conversation)}
                              className="flex-1 py-2.5 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
