import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Send, Image as ImageIcon, ShieldCheck, Store,
  CheckCheck, Check, Reply, Pencil, Trash2, X, ChevronDown, User, Eye, Copy, ZoomIn, ZoomOut, Download, Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatMessage, ConversationDetail } from '../services/chatService';
import { Layout } from '../components/Layout';
import { ChatScreenSkeleton } from '../components/Skeleton';
import { toast } from 'sonner';

const POLL_INTERVAL = 15000;

export function ChatScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [contextMenu, setContextMenu] = useState<{ message: ChatMessage; x: number; y: number } | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentUserId = user?.id || '';

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const scrollToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('highlight-flash');
      setTimeout(() => el.classList.remove('highlight-flash'), 1500);
    }
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
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
          const updatedMap = new Map(response.data.map(m => [m.id, m]));
          const merged = prev.map(m => updatedMap.get(m.id) || m);
          if (newMsgs.length > 0) {
            setTimeout(() => scrollToBottom(), 100);
            return [...merged, ...newMsgs];
          }
          return merged;
        });
      } else if (!lastMessageTimeRef.current) {
        setMessages(response.data);
        setTimeout(() => scrollToBottom(false), 100);
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

  // Mark as read
  useEffect(() => {
    if (!id || !user) return;
    chatService.markAsRead(id, user.id).catch(() => {});
  }, [id, user, messages]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Close context menu on outside click/scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const openContextMenu = (message: ChatMessage, e: { clientX: number; clientY: number }) => {
    if (message.deletedAt || message.id.startsWith('temp-')) return;
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - 200);
    setContextMenu({ message, x, y });
  };

  const handleTouchStart = (message: ChatMessage, e: React.TouchEvent) => {
    longPressTriggeredRef.current = false;
    const touch = e.touches[0];
    const pos = { clientX: touch.clientX, clientY: touch.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      openContextMenu(message, pos);
      // Prevent text selection
      window.getSelection()?.removeAllRanges();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopyText = (text: string | undefined) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success('Copié'));
    setContextMenu(null);
  };

  const handleShareMessage = async (message: ChatMessage) => {
    const text = message.text || '';
    const shareData: ShareData = { text };
    if (message.imageUrl) shareData.text = message.imageUrl;
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(text || message.imageUrl || '');
        toast.success('Copié dans le presse-papier');
      }
    } catch {}
    setContextMenu(null);
  };

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

    // If editing
    if (editingMessage) {
      try {
        const response = await chatService.editMessage(editingMessage.id, text);
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, text: response.data.text, editedAt: response.data.editedAt } : m));
        toast.success('Message modifiÃ©');
      } catch {
        toast.error('Erreur lors de la modification');
        setInputText(text);
      } finally {
        setEditingMessage(null);
        setSending(false);
      }
      return;
    }

    // Normal send
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      text,
      replyToId: replyTo?.id,
      replyTo: replyTo || undefined,
      readBy: [user.id],
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setReplyTo(null);
    scrollToBottom();

    try {
      const response = await chatService.sendMessage(id, user.id, text, undefined, replyTo?.id);
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? response.data : m));
      lastMessageTimeRef.current = response.data.createdAt;
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(text);
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
        const response = await chatService.sendMessage(id, user.id, undefined, imageUrl, replyTo?.id);
        setMessages(prev => [...prev, response.data]);
        lastMessageTimeRef.current = response.data.createdAt;
        setReplyTo(null);
        scrollToBottom();
      } catch {
        toast.error("Erreur lors de l'envoi de l'image");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deletedAt: new Date().toISOString() } : m));
      toast.success('Message supprimÃ©');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessage(message);
    setInputText(message.text || '');
    setReplyTo(null);
    inputRef.current?.focus();
  };

  const startReply = (message: ChatMessage) => {
    setReplyTo(message);
    setEditingMessage(null);
    inputRef.current?.focus();
  };

  const cancelAction = () => {
    setReplyTo(null);
    setEditingMessage(null);
    setInputText('');
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

  const getReplyPreview = (msg: ChatMessage | null | undefined) => {
    if (!msg) return '';
    if (msg.deletedAt) return 'Message supprimÃ©';
    if (msg.imageUrl) return 'ðŸ“· Photo';
    return (msg.text?.slice(0, 60) || '') + ((msg.text?.length || 0) > 60 ? '...' : '');
  };

  return (
    <Layout>
      <style>{`
        .highlight-flash { animation: flash-bg 1.5s ease-out; }
        @keyframes flash-bg {
          0%, 30% { background-color: rgba(31, 167, 116, 0.12); }
          100% { background-color: transparent; }
        }
      `}</style>
      <div className="h-screen flex flex-col bg-[#f0f2f5]">
        {/* â”€â”€â”€ Header â”€â”€â”€ */}
        <div className="bg-white border-b border-gray-200 shrink-0 z-20">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 h-16">
              <button
                onClick={() => navigate('/messages')}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={22} className="text-gray-700 md:text-gray-500" />
              </button>

              <button
                onClick={() => navigate(`/profile/${conversation.otherUserId}`)}
                className="relative group"
              >
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center shadow-sm group-hover:ring-2 group-hover:ring-[#1FA774]/30 transition-all">
                  <span className="text-white font-bold text-lg">
                    {conversation.otherUserName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full" />
              </button>

              <button
                onClick={() => navigate(`/profile/${conversation.otherUserId}`)}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
              >
                <h2 className="font-semibold text-gray-900 text-[15px] leading-tight truncate">
                  {conversation.otherUserName}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Store size={12} className="text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-400 truncate">{conversation.storeName}</p>
                </div>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate(`/profile/${conversation.otherUserId}`)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Voir le profil"
                >
                  <User size={18} className="text-gray-500" />
                </button>
                <button
                  onClick={() => navigate(`/offer/${conversation.offerId}`)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Voir l'offre"
                >
                  <Eye size={18} className="text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€â”€ Offer context banner â”€â”€â”€ */}
        <div className="bg-white border-b border-gray-100 shrink-0">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1FA774]/5 border border-[#1FA774]/15 rounded-full">
                <ShieldCheck size={14} className="text-[#1FA774]" />
                <span className="text-xs font-medium text-[#1FA774]">Transaction sÃ©curisÃ©e</span>
              </div>
              <button
                onClick={() => navigate(`/offer/${conversation.offerId}`)}
                className="text-xs text-gray-400 hover:text-[#1FA774] transition-colors hidden md:inline"
              >
                Re : <span className="font-medium">{conversation.storeName}</span> â†’
              </button>
            </div>
          </div>
        </div>

        {/* â”€â”€â”€ Messages area â”€â”€â”€ */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
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
                  Commencez la conversation Ã  propos de <span className="font-medium text-gray-600">{conversation.storeName}</span>
                </p>
              </div>
            )}

            {groupedMessages.map((group) => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-5">
                  <div className="px-4 py-1.5 bg-white rounded-full shadow-sm border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">
                      {formatDateSeparator(group.date)}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {group.messages.map((message, idx) => {
                    const isCurrentUser = message.senderId === currentUserId;
                    const isTemp = message.id.startsWith('temp-');
                    const isDeleted = !!message.deletedAt;
                    const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                    const isConsecutive = prevMsg && prevMsg.senderId === message.senderId && !prevMsg.deletedAt;

                    return (
                      <motion.div
                        key={message.id}
                        id={`msg-${message.id}`}
                        initial={{ opacity: 0, y: 10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${isConsecutive ? 'mt-0.5' : 'mt-3'} ${isCurrentUser ? 'justify-end' : 'justify-start'} rounded-lg transition-colors`}
                        onContextMenu={(e) => { e.preventDefault(); openContextMenu(message, e); }}
                        onTouchStart={(e) => handleTouchStart(message, e)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                      >
                        {/* Other user avatar */}
                        {!isCurrentUser && (
                          <div className={`mr-2 shrink-0 ${isConsecutive ? 'invisible' : ''}`}>
                            <button
                              onClick={() => navigate(`/profile/${conversation.otherUserId}`)}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1FA774] to-[#16865c] flex items-center justify-center hover:ring-2 hover:ring-[#1FA774]/20 transition-all"
                            >
                              <span className="text-white font-semibold text-xs">
                                {conversation.otherUserName.charAt(0).toUpperCase()}
                              </span>
                            </button>
                          </div>
                        )}

                        <div className={`max-w-[75%] md:max-w-[55%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                          {isDeleted ? (
                            <div className="px-4 py-2.5 bg-gray-100 rounded-2xl border border-gray-200 border-dashed">
                              <p className="text-[13px] text-gray-400 italic flex items-center gap-1.5">
                                <Trash2 size={13} />
                                Message supprimÃ©
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Reply preview */}
                              {message.replyTo && (
                                <button
                                  onClick={() => scrollToMessage(message.replyToId!)}
                                  className={`w-full mb-0.5 px-3 py-2 rounded-t-xl text-left text-xs transition-colors ${
                                    isCurrentUser
                                      ? 'bg-[#1a9066] border-l-[3px] border-white/30 text-white/80 hover:bg-[#178a60]'
                                      : 'bg-gray-50 border-l-[3px] border-[#1FA774] text-gray-500 hover:bg-gray-100'
                                  }`}
                                >
                                  <p className="font-semibold text-[11px] mb-0.5">
                                    {message.replyTo.senderId === currentUserId ? 'Vous' : conversation.otherUserName}
                                  </p>
                                  <p className="truncate">{getReplyPreview(message.replyTo)}</p>
                                </button>
                              )}

                              {message.imageUrl ? (
                                <button
                                  onClick={() => { setLightboxUrl(message.imageUrl!); setLightboxZoom(1); }}
                                  className={`rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-zoom-in ${
                                    isCurrentUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
                                  } ${message.replyTo ? 'rounded-t-none' : ''}`}
                                >
                                  <img
                                    src={message.imageUrl}
                                    alt="Image partagée"
                                    className="max-w-full h-auto max-h-80 object-cover"
                                  />
                                </button>
                              ) : (
                                <div
                                  className={`px-4 py-2.5 shadow-sm ${
                                    isCurrentUser
                                      ? 'bg-[#1FA774] text-white rounded-2xl rounded-tr-sm'
                                      : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100'
                                  } ${message.replyTo ? 'rounded-t-none' : ''}`}
                                >
                                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
                                </div>
                              )}

                            </>
                          )}

                          {/* Time + edited + read */}
                          {!isDeleted && (
                            <div className={`flex items-center gap-1 mt-0.5 px-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                              <span className="text-[10px] text-gray-400">
                                {formatMessageTime(message.createdAt)}
                              </span>
                              {message.editedAt && (
                                <span className="text-[10px] text-gray-400 italic">modifiÃ©</span>
                              )}
                              {isCurrentUser && (
                                <span className={`${isTemp ? 'text-gray-300' : message.readBy?.includes(conversation.otherUserId) ? 'text-[#1FA774]' : 'text-gray-400'}`}>
                                  {isTemp ? <Check size={12} /> : <CheckCheck size={12} />}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {showScrollDown && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                onClick={() => scrollToBottom()}
                className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center z-20 hover:bg-gray-50 transition-colors"
              >
                <ChevronDown size={20} className="text-gray-600" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Image Lightbox ─── */}
        <AnimatePresence>
          {lightboxUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/90 flex flex-col"
              onClick={() => setLightboxUrl(null)}
            >
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLightboxZoom(z => Math.max(0.5, z - 0.5))}
                    disabled={lightboxZoom <= 0.5}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  >
                    <ZoomOut size={20} />
                  </button>
                  <span className="text-white/70 text-sm font-medium min-w-[3rem] text-center">{Math.round(lightboxZoom * 100)}%</span>
                  <button
                    onClick={() => setLightboxZoom(z => Math.min(4, z + 0.5))}
                    disabled={lightboxZoom >= 4}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 transition-colors"
                  >
                    <ZoomIn size={20} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxUrl}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <Download size={20} />
                  </a>
                  <button
                    onClick={() => setLightboxUrl(null)}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              {/* Image */}
              <div className="flex-1 flex items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
                <motion.img
                  src={lightboxUrl}
                  alt="Zoom"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-out"
                  style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.2s ease' }}
                  onClick={() => setLightboxUrl(null)}
                  draggable={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Context Menu ─── */}
        <AnimatePresence>
          {contextMenu && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setContextMenu(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 5 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 min-w-[170px] overflow-hidden"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => { startReply(contextMenu.message); setContextMenu(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Reply size={16} className="text-[#1FA774]" /> Répondre
                </button>
                {contextMenu.message.text && (
                  <button
                    onClick={() => handleCopyText(contextMenu.message.text)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Copy size={16} className="text-gray-400" /> Copier
                  </button>
                )}
                <button
                  onClick={() => handleShareMessage(contextMenu.message)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <Share2 size={16} className="text-gray-400" /> Partager
                </button>
                {contextMenu.message.senderId === currentUserId && contextMenu.message.text && (
                  <button
                    onClick={() => { startEdit(contextMenu.message); setContextMenu(null); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Pencil size={16} className="text-blue-500" /> Modifier
                  </button>
                )}
                {contextMenu.message.senderId === currentUserId && (
                  <>
                    <div className="mx-3 my-1 border-t border-gray-100" />
                    <button
                      onClick={() => { handleDeleteMessage(contextMenu.message.id); setContextMenu(null); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                    >
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* â”€â”€â”€ Reply/Edit preview â”€â”€â”€ */}
        <AnimatePresence>
          {(replyTo || editingMessage) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-t border-gray-100 overflow-hidden"
            >
              <div className="max-w-3xl mx-auto px-4 md:px-6 py-2.5 flex items-center gap-3">
                <div className={`w-1 h-10 rounded-full shrink-0 ${editingMessage ? 'bg-blue-500' : 'bg-[#1FA774]'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500">
                    {editingMessage ? (
                      <span className="flex items-center gap-1"><Pencil size={12} /> Modifier le message</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Reply size={12} />
                        RÃ©pondre Ã  {replyTo?.senderId === currentUserId ? 'vous-mÃªme' : conversation.otherUserName}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {editingMessage ? editingMessage.text : getReplyPreview(replyTo)}
                  </p>
                </div>
                <button
                  onClick={cancelAction}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€â”€ Input bar â”€â”€â”€ */}
        <div className="bg-white border-t border-gray-200 shrink-0">
          <div className="max-w-3xl mx-auto px-3 md:px-6 py-3">
            <form onSubmit={handleSend} className="flex items-end gap-2">
              <label className="p-2.5 hover:bg-gray-100 rounded-full cursor-pointer transition-colors shrink-0">
                <ImageIcon size={22} className="text-gray-500" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 bg-gray-100 rounded-3xl flex items-end overflow-hidden border border-transparent focus-within:border-[#1FA774]/30 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={editingMessage ? 'Modifier le message...' : replyTo ? 'RÃ©pondre...' : 'Ã‰crire un message...'}
                  className="flex-1 bg-transparent px-4 py-3 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none"
                />
              </div>

              <motion.button
                type="submit"
                disabled={!inputText.trim() || sending}
                whileTap={{ scale: 0.9 }}
                className={`p-3 rounded-full transition-all shrink-0 ${
                  inputText.trim() && !sending
                    ? editingMessage
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 hover:bg-blue-600'
                      : 'bg-[#1FA774] text-white shadow-md shadow-[#1FA774]/25 hover:bg-[#18956a]'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {editingMessage ? <Check size={20} /> : <Send size={20} className={inputText.trim() ? '-rotate-12' : ''} />}
              </motion.button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
