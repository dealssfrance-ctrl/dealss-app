import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { MessageSquare, Search, Store } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService, ConversationSummary } from '../services/chatService';
import { ChatListSkeleton } from '../components/Skeleton';

const POLL_INTERVAL = 30000;

export function ChatListScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const response = await chatService.getConversations(user.id);
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const filteredConversations = conversations.filter(c =>
    c.otherUserName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.storeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-4xl mx-auto px-5 md:px-8 py-6">
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <MessageSquare size={36} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connectez-vous</h3>
            <p className="text-gray-400 text-center mb-6 text-sm max-w-xs">
              Accédez à vos conversations et échangez avec les vendeurs
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="px-8 py-3 bg-[#1FA774] text-white font-semibold rounded-full hover:bg-[#18956a] transition-colors shadow-md shadow-[#1FA774]/20"
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
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
        {/* ─── Header ─── */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-5 md:px-8 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
              {conversations.length > 0 && (
                <span className="px-2.5 py-1 bg-[#1FA774] text-white text-xs font-bold rounded-full">
                  {conversations.length}
                </span>
              )}
            </div>
            {/* Search bar */}
            {conversations.length > 0 && (
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une conversation..."
                  className="w-full bg-gray-100 rounded-xl pl-11 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774]/30 focus:bg-white transition-all border border-transparent focus:border-[#1FA774]/20"
                />
              </div>
            )}
          </div>
        </div>

        {/* ─── Conversations List ─── */}
        <div className="max-w-4xl mx-auto md:px-8 md:py-6">
          {loading ? (
            <ChatListSkeleton count={5} />
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-5">
                <MessageSquare size={36} className="text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun message</h3>
              <p className="text-gray-400 text-center text-sm max-w-xs">
                Trouvez une offre et contactez le vendeur pour démarrer une conversation
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search size={32} className="text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Aucun résultat pour "{searchQuery}"</p>
            </div>
          ) : (
            <div className="md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden md:border md:border-gray-100">
              {filteredConversations.map((conversation, index) => (
                <motion.button
                  key={conversation.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.25 }}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className={`w-full bg-white px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                    index > 0 ? 'border-t border-gray-100' : ''
                  }`}
                >
                  {/* Avatar with online indicator */}
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-lg">
                        {conversation.otherUserName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-semibold text-gray-900 text-[15px] truncate">
                        {conversation.otherUserName}
                      </h3>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 ml-3 font-medium">
                        {formatTime(conversation.lastMessageTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Store size={12} className="text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-400 truncate">{conversation.storeName}</p>
                    </div>
                    <p className="text-sm text-gray-500 truncate leading-snug">
                      {conversation.lastMessage || 'Commencez la conversation...'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
