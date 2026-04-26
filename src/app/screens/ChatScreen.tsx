import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Image as ImageIcon, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatMessage, ConversationDetail } from '../services/chatService';
import { ChatScreenSkeleton } from '../components/Skeleton';

const POLL_INTERVAL = 30_000;

// ── Review message bubble ─────────────────────────────────────────────────────
function ReviewBubble({ rating, comment, isMine }: { rating: number; comment?: string; isMine: boolean }) {
  return (
    <div
      className={`rounded-2xl p-3.5 ${
        isMine
          ? 'bg-[#1FA774]/10 border border-[#1FA774]/25'
          : 'bg-amber-50 border border-amber-200'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Avis</p>
      <div className="flex gap-0.5 mb-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={15}
            className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'}
          />
        ))}
      </div>
      {comment && <p className="text-sm text-gray-700 leading-snug mt-1">{comment}</p>}
    </div>
  );
}

export function ChatScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Review inline panel
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const currentUserId = user?.id || '';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch conversation details
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

  // Fetch messages (initial + polling)
  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const response = await chatService.getMessages(id, lastMessageTimeRef.current || undefined);
      if (lastMessageTimeRef.current && response.data.length > 0) {
        // Polling: append new messages
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
        // Initial load
        setMessages(response.data);
        setTimeout(scrollToBottom, 100);
      }
      // Update last message time for next poll
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
    return <ChatScreenSkeleton />;
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">Conversation introuvable</p>
        <button onClick={() => navigate('/messages')} className="text-[#1FA774] font-medium">
          Retour aux messages
        </button>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !id || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      messageType: 'text',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const response = await chatService.sendMessage(id, user.id, text);
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? response.data : m));
      lastMessageTimeRef.current = response.data.createdAt;
    } catch (error) {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInputText(text); // Restore input
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so the same file can be picked again
    e.target.value = '';
    if (!file || !user || !id) return;

    setUploadingImage(true);
    // Optimistic placeholder with a local blob URL for instant preview
    const blobUrl = URL.createObjectURL(file);
    const optimistic: ChatMessage = {
      id: `temp-img-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      messageType: 'photo',
      imageUrl: blobUrl,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      // Upload file to Supabase storage; store the public URL, not a base64 blob
      const imageUrl = await chatService.uploadChatImage(file);
      const response = await chatService.sendMessage(id, user.id, undefined, imageUrl);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? response.data : m));
      lastMessageTimeRef.current = response.data.createdAt;
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      console.error('Error sending image:', error);
    } finally {
      URL.revokeObjectURL(blobUrl);
      setUploadingImage(false);
    }
  };

  const handleSendReview = async () => {
    if (reviewRating === 0 || !user || !id || sending) return;
    setReviewOpen(false);
    setSending(true);

    const optimistic: ChatMessage = {
      id: `temp-rev-${Date.now()}`,
      conversationId: id,
      senderId: user.id,
      messageType: 'review',
      reviewRating,
      reviewComment: reviewComment || undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    scrollToBottom();

    try {
      const response = await chatService.sendReview(id, user.id, reviewRating, reviewComment);
      setMessages(prev => prev.map(m => m.id === optimistic.id ? response.data : m));
      lastMessageTimeRef.current = response.data.createdAt;
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
      setReviewRating(0);
      setReviewComment('');
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:px-8 md:py-6">
      {/* Desktop card wrapper */}
      <div className="flex-1 flex flex-col md:max-w-4xl md:mx-auto md:w-full md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-5 md:px-6 py-4 flex items-center gap-3">
            <button
              onClick={() => navigate('/messages')}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <ArrowLeft size={22} className="text-gray-900" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1FA774]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#1FA774] font-bold text-base">
                {(conversation.otherUserName || '?').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate leading-tight">{conversation.otherUserName}</h2>
              <p className="text-xs text-gray-400 truncate">{conversation.storeName}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            {messages.map((msg) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[60%]`}>
                    {msg.messageType === 'review' ? (
                      <ReviewBubble
                        rating={msg.reviewRating ?? 0}
                        comment={msg.reviewComment}
                        isMine={isMine}
                      />
                    ) : msg.messageType === 'photo' ? (
                      <div className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                        <img
                          src={msg.imageUrl}
                          alt="Photo partagée"
                          className="max-w-full max-h-72 w-auto object-cover block"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? 'bg-[#1FA774] text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    )}
                    <span className="text-xs text-gray-400 mt-1 px-1">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Inline review panel */}
        {reviewOpen && (
          <div className="bg-white border-t border-gray-100 px-5 md:px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Envoyer un avis</p>
                <button
                  onClick={() => { setReviewOpen(false); setReviewRating(0); setReviewComment(''); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Annuler
                </button>
              </div>
              <div className="flex gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onMouseEnter={() => setReviewHover(s)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(s)}
                  >
                    <Star
                      size={28}
                      className={
                        s <= (reviewHover || reviewRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Commentaire (optionnel)"
                rows={2}
                className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774] resize-none mb-3"
              />
              <button
                disabled={reviewRating === 0 || sending}
                onClick={handleSendReview}
                className="w-full py-2.5 bg-[#1FA774] text-white rounded-full text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                Envoyer l'avis
              </button>
            </div>
          </div>
        )}

        {/* Input bar — hidden while review panel is open */}
        {!reviewOpen && (
          <div className="bg-white border-t border-gray-200 sticky bottom-0">
            <div className="max-w-3xl mx-auto px-5 md:px-6 py-3">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* Photo upload */}
                <label
                  className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 ${
                    uploadingImage ? 'bg-gray-200 pointer-events-none' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <ImageIcon size={18} className="text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
                {/* Review trigger */}
                <button
                  type="button"
                  onClick={() => setReviewOpen(true)}
                  className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Envoyer un avis"
                >
                  <Star size={18} className="text-gray-600" />
                </button>
                {/* Text input */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Écrire un message..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774]"
                />
                {/* Send */}
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                    inputText.trim() && !sending
                      ? 'bg-[#1FA774] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>{/* End desktop card wrapper */}
    </div>
  );
}
