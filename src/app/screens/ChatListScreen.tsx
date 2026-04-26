import { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { HyvisHeader } from '../components/HyvisHeader';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { MessageSquare, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService, ConversationSummary } from '../services/chatService';
import { ChatListSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.otherUserName || '').toLowerCase().includes(q) ||
        (c.storeName || '').toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q),
    );
  }, [conversations, query]);

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
            <div className="md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden divide-y divide-gray-100">
              {filtered.map((conversation, index) => {
                const name = conversation.otherUserName || 'Utilisateur';
                const initial = name.charAt(0).toUpperCase();
                const gradient = avatarGradient(name);
                return (
                  <motion.button
                    key={conversation.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.2) }}
                    onClick={() => navigate(`/chat/${conversation.id}`)}
                    className="w-full bg-white px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    {/* Gradient avatar */}
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                    >
                      <span className="text-white font-bold text-base">{initial}</span>
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
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
