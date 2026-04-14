import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatService, ConversationSummary } from '../services/chatService';
import { ChatListSkeleton } from '../components/Skeleton';

const POLL_INTERVAL = 30000; // 30 seconds

export function ChatListScreen() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

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

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (!isAuthenticated) {
    return (
      <Layout>
      <div className="min-h-screen bg-gray-50 pb-24 md:pb-6">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-5 md:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <MessageSquare size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-400 text-center mb-4">Connectez-vous pour accéder à vos messages</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-6 py-3 bg-[#1FA774] text-white font-semibold rounded-full"
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-3xl mx-auto md:px-8 md:py-6">
        {loading ? (
          <ChatListSkeleton count={5} />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <MessageSquare size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-400">Pas encore de messages</p>
          </div>
        ) : (
          <div className="md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden divide-y divide-gray-100">
            {conversations.map((conversation, index) => (
              <motion.button
                key={conversation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/chat/${conversation.id}`)}
                className="w-full bg-white px-5 md:px-6 py-4 flex items-center gap-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-[#1FA774]/10 flex items-center justify-center">
                    <span className="text-[#1FA774] font-bold text-lg">
                      {conversation.otherUserName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conversation.otherUserName}
                    </h3>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1 truncate">Re: {conversation.storeName}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {conversation.lastMessage || 'No messages yet'}
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
