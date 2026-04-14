import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, Phone, ShieldCheck, Store, CheckCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatMessage, ConversationDetail } from '../services/chatService';
import { Layout } from '../components/Layout';
import { ChatScreenSkeleton } from '../components/Skeleton';

const POLL_INTERVAL = 30000;

export function ChatScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = user?.id || '';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const fetchConversation = async () => {
      if (!id || !user) return;
      try {
        const response = await chatService.getConversation(id, user.id);
        setConversation(response.data);
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
    fetchConversation();
  }, [id, user]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const response = await chatService.getMessages(id, lastMessageTimeRef.current || undefined);
      if (lastMessageTimeRef.current && response.data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = response.data.filter(m => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            setTimeout(scrollToBottom, 100);
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      } else if (!lastMessageTimeRef.current) {
        setMessages(response.data);
        setTimeout(scrollToBottom, 100);
      }
      if (response.data.length > 0) {
        lastMessageTimeRef.current = response.data[response.data.length - 1].createdAt;
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [id, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  if (loading) {
    return <Layout><ChatScreenSkeleton /></Layout>;
  }

  if (!conversation) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-2">
            <Store size={28} className="text-gray-300" />
          </div>
          <p className="text-gray-400 text-lg">Conversation introuvable</p>
          <button onClick={() => navigate('/messages')} className="text-[#1FA774] font-medium hover:underline">
            Retour aux messages
          </button>
        </div>
      </Layout>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !id || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);
    inputRef.current?.focus();

    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const response = await chatService.sendMessage(id, user.id, text);
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? response.data : m));
      lastMessageTimeRef.current = response.data.createdAt;
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(text);
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageUrl = reader.result as string;
      try {
        const response = await chatService.sendMessage(id, user.id, undefined, imageUrl);
        setMessages(prev => [...prev, response.data]);
        lastMessageTimeRef.current = response.data.createdAt;
        scrollToBottom();
      } catch (error) {
        console.error('Error sending image:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && new Date(last.messages[0].createdAt).toDateString() === dateKey) {
      last.messages.push(msg);
    } else {
      groupedMessages.push({ date: msg.createdAt, messages: [msg] });
    }
  });

  return (
    <Layout>
      <div className="h-screen flex flex-col bg-[#f0f2f5]">
        {/* ─── Header ─── */}
        <div className="bg-white border-b border-gray-200 shrink-0 z-20">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 h-16">
              <button
                onClick={() => navigate('/messages')}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
              >
                <ArrowLeft size={22} className="text-gray-700" />
              </button>
              <button
                onClick={() => navigate('/messages')}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors hidden md:flex"
              >
                <ArrowLeft size={20} className="text-gray-500" />
              </button>

              {/* Avatar */}
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">
                    {conversation.otherUserName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
              </div>

              {/* Name + offer context */}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 text-[15px] leading-tight truncate">
                  {conversation.otherUserName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Store size={12} className="text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-400 truncate">{conversation.storeName}</p>
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-1">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Phone size={18} className="text-gray-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Offer context banner ─── */}
        <div className="bg-white border-b border-gray-100 shrink-0">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 py-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1FA774]/5 border border-[#1FA774]/15 rounded-full">
                <ShieldCheck size={14} className="text-[#1FA774]" />
                <span className="text-xs font-medium text-[#1FA774]">Transaction protégée</span>
              </div>
              <span className="text-xs text-gray-400 hidden md:inline">
                À propos de : <span className="font-medium text-gray-600">{conversation.storeName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ─── Messages area ─── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {conversation.otherUserName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{conversation.otherUserName}</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Commencez la conversation à propos de <span className="font-medium text-gray-600">{conversation.storeName}</span>
                </p>
              </div>
            )}

            {/* Grouped messages */}
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-5">
                  <div className="px-4 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>
                </div>

                {/* Messages in group */}
                <AnimatePresence>
                  {group.messages.map((message, idx) => {
                    const isCurrentUser = message.senderId === currentUserId;
                    const isTemp = message.id.startsWith('temp-');
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                    const isConsecutive = prevMsg && prevMsg.senderId === message.senderId;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isConsecutive ? 'mt-1' : 'mt-3'} ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* Other user avatar */}
                        {!isCurrentUser && (
                          <div className={`mr-2 shrink-0 ${isConsecutive ? 'invisible' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center">
                              <span className="text-white font-semibold text-xs">
                                {conversation.otherUserName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className={`max-w-[75%] md:max-w-[55%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          {message.imageUrl ? (
                            <div
                              className={`rounded-2xl overflow-hidden shadow-sm border border-gray-100 ${
                                isCurrentUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
                              }`}
                            >
                              <img
                                src={message.imageUrl}
                                alt="Image partagée"
                                className="max-w-full h-auto max-h-80 object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2.5 shadow-sm ${
                                isCurrentUser
                                  ? isConsecutive
                                    ? 'bg-[#1FA774] text-white rounded-2xl rounded-tr-sm'
                                    : 'bg-[#1FA774] text-white rounded-2xl rounded-tr-sm'
                                  : isConsecutive
                                    ? 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                                    : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                              }`}
                            >
                              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                            </div>
                          )}

                          {/* Time + read status */}
                          <div className={`flex items-center gap-1 mt-0.5 px-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] text-gray-400">
                              {formatMessageTime(message.createdAt)}
                            </span>
                            {isCurrentUser && (
                              <span className={`${isTemp ? 'text-gray-300' : 'text-[#1FA774]'}`}>
                                {isTemp ? <Check size={12} /> : <CheckCheck size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── Input bar ─── */}
        <div className="bg-white border-t border-gray-200 shrink-0">
          <div className="max-w-3xl mx-auto px-3 md:px-6 py-3">
            <form onSubmit={handleSend} className="flex items-end gap-2">
              {/* Attachments */}
              <label className="p-2.5 hover:bg-gray-100 rounded-full cursor-pointer transition-colors shrink-0">
                <ImageIcon size={22} className="text-gray-500" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* Text input */}
              <div className="flex-1 bg-gray-100 rounded-3xl flex items-end overflow-hidden border border-transparent focus-within:border-[#1FA774]/30 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-transparent px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>

              {/* Send button */}
              <motion.button
                type="submit"
                disabled={!inputText.trim() || sending}
                whileTap={{ scale: 0.9 }}
                className={`p-3 rounded-full transition-all shrink-0 ${
                  inputText.trim() && !sending
                    ? 'bg-[#1FA774] text-white shadow-md shadow-[#1FA774]/25 hover:bg-[#18956a]'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Send size={20} className={inputText.trim() ? '-rotate-12' : ''} />
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
