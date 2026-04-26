import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Image as ImageIcon, Star, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatMessage, ConversationDetail, ReviewRequestPayload } from '../services/chatService';
import { offersService } from '../services/offersService';
import { reviewsService } from '../services/reviewsService';
import { ChatScreenSkeleton } from '../components/Skeleton';
import { Layout } from '../components/Layout';
import { ReviewRequestCard } from '../components/ReviewRequestCard';
import { ReviewRequestModal } from '../components/ReviewRequestModal';

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
  const [failedImageMessageIds, setFailedImageMessageIds] = useState<Set<string>>(new Set());
  // Review request workflow state
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeReviewPayload, setActiveReviewPayload] = useState<ReviewRequestPayload | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittedOfferIds, setSubmittedOfferIds] = useState<Set<string>>(new Set());
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

  // For each unique review_request offerId received by current user, check if already reviewed
  useEffect(() => {
    if (!currentUserId) return;
    const offerIds = new Set<string>();
    for (const m of messages) {
      if (m.messageType === 'review_request' && m.reviewRequestPayload && m.senderId !== currentUserId) {
        offerIds.add(m.reviewRequestPayload.offerId);
      }
    }
    if (offerIds.size === 0) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        Array.from(offerIds).map(async (offerId) => {
          try {
            const has = await reviewsService.hasUserReviewedOffer(offerId, currentUserId);
            return [offerId, has] as const;
          } catch {
            return [offerId, false] as const;
          }
        }),
      );
      if (cancelled) return;
      setSubmittedOfferIds((prev) => {
        const next = new Set(prev);
        for (const [offerId, has] of results) {
          if (has) next.add(offerId);
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [messages, currentUserId]);

  if (loading) {
    return (
      <Layout>
        <ChatScreenSkeleton />
      </Layout>
    );
  }

  if (!conversation) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400">Conversation introuvable</p>
          <button onClick={() => navigate('/messages')} className="text-[#1FA774] font-medium">
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

  const handleRequestReview = async () => {
    if (!user || !id || !conversation || sending) return;
    setActionsOpen(false);
    setSending(true);
    try {
      // Use the offer attached to the conversation as target.
      const offerResp = await offersService.getOfferById(conversation.offerId);
      if (!offerResp.success || !offerResp.data) {
        toast.error("Offre introuvable pour cette conversation");
        return;
      }
      const offer = offerResp.data;
      const payload: ReviewRequestPayload = {
        offerId: offer.id,
        offerTitle: offer.storeName,
        offerImageUrl: offer.imageUrl,
        discount: offer.discount,
      };
      const optimistic: ChatMessage = {
        id: `temp-rr-${Date.now()}`,
        conversationId: id,
        senderId: user.id,
        messageType: 'review_request',
        reviewRequestPayload: payload,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();

      const response = await chatService.sendReviewRequest(id, user.id, payload);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? response.data : m)));
      lastMessageTimeRef.current = response.data.createdAt;
      toast.success('Demande d\'avis envoyée');
    } catch (err) {
      console.error('Error sending review request:', err);
      toast.error('Impossible d\'envoyer la demande d\'avis');
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-rr-')));
    } finally {
      setSending(false);
    }
  };

  const openReviewModalFor = (payload: ReviewRequestPayload) => {
    if (!user) {
      toast.error('Connectez-vous pour laisser un avis');
      navigate('/signin');
      return;
    }
    if (submittedOfferIds.has(payload.offerId)) return;
    setActiveReviewPayload(payload);
    setReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    if (submittingReview) return;
    setReviewModalOpen(false);
    setActiveReviewPayload(null);
  };

  const handleReviewModalSubmit = async (rating: number, comment: string) => {
    if (!user || !activeReviewPayload) return;
    setSubmittingReview(true);
    try {
      await reviewsService.createReview({
        offerId: activeReviewPayload.offerId,
        userId: user.id,
        userName: user.name,
        rating,
        comment,
      });
      setSubmittedOfferIds((prev) => {
        const next = new Set(prev);
        next.add(activeReviewPayload.offerId);
        return next;
      });
      toast.success('Merci pour votre avis !');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi de l\'avis';
      toast.error(msg);
      throw err;
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Layout>
    <div className="min-h-[calc(100vh-8rem)] md:min-h-screen bg-gray-50 flex flex-col md:px-8 md:py-6">
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
                    ) : msg.messageType === 'review_request' && msg.reviewRequestPayload ? (
                      <ReviewRequestCard
                        payload={msg.reviewRequestPayload}
                        isReceiver={!isMine}
                        hasSubmitted={submittedOfferIds.has(msg.reviewRequestPayload.offerId)}
                        onReviewClick={() => msg.reviewRequestPayload && openReviewModalFor(msg.reviewRequestPayload)}
                      />
                    ) : msg.messageType === 'photo' ? (
                      <div className={`rounded-2xl overflow-hidden ${isMine ? 'rounded-br-md' : 'rounded-bl-md'}`}>
                        {msg.imageUrl && !failedImageMessageIds.has(msg.id) ? (
                          <img
                            src={msg.imageUrl}
                            alt="Photo partagée"
                            className="max-w-full max-h-72 w-auto object-cover block"
                            loading="lazy"
                            onError={() => {
                              setFailedImageMessageIds((prev) => {
                                const next = new Set(prev);
                                next.add(msg.id);
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded-xl">
                            Image indisponible
                          </div>
                        )}
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

        {/* Input bar with "+" actions menu (review request) */}
        <div className="bg-white border-t border-gray-200 sticky bottom-0">
          <div className="max-w-3xl mx-auto px-5 md:px-6 py-3 relative">
            <AnimatePresence>
              {actionsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-5 mb-2 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                >
                  <button
                    onClick={handleRequestReview}
                    disabled={sending}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Star size={16} className="text-amber-600 fill-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Demander un avis</p>
                      <p className="text-xs text-gray-500 truncate">Sur cette offre</p>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSend} className="flex items-center gap-2">
              {/* + Actions */}
              <button
                type="button"
                onClick={() => setActionsOpen((prev) => !prev)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                  actionsOpen ? 'bg-[#1FA774] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                aria-label="Plus d'actions"
                title="Plus d'actions"
              >
                <motion.div animate={{ rotate: actionsOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  <Plus size={20} />
                </motion.div>
              </button>
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
                  inputText.trim() && !sending ? 'bg-[#1FA774] text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>

      </div>{/* End desktop card wrapper */}

      {/* Review submission modal (receiver clicked a review request card) */}
      {activeReviewPayload && (
        <ReviewRequestModal
          isOpen={reviewModalOpen}
          offerId={activeReviewPayload.offerId}
          offerTitle={activeReviewPayload.offerTitle}
          offerImageUrl={activeReviewPayload.offerImageUrl}
          onClose={closeReviewModal}
          onSubmit={handleReviewModalSubmit}
          isLoading={submittingReview}
        />
      )}
    </div>
    </Layout>
  );
}
