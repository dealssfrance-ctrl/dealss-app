import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Send, Image as ImageIcon, Star, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useChatNotifications } from '../context/ChatNotificationsContext';
import { playMessageSound } from '../utils/sounds';
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
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Draft mode: route id is "new" — conversation is not yet persisted in DB.
  const isDraft = routeId === 'new';
  const draftOfferId = searchParams.get('offerId') || '';
  const draftReceiverId = searchParams.get('receiverId') || '';
  const draftStoreName = searchParams.get('storeName') || '';
  const draftOtherName = searchParams.get('otherName') || '';

  // Effective conversation id used for DB calls. In draft mode this is empty until
  // the first message materializes the conversation.
  const [conversationId, setConversationId] = useState<string>(isDraft ? '' : routeId || '');
  // All conversation IDs for the same other-user (merged thread).
  const [siblingIds, setSiblingIds] = useState<string[]>(routeId && routeId !== 'new' ? [routeId] : []);
  // Offer metadata per conversationId (for in-thread offer separators).
  const [conversationsMeta, setConversationsMeta] = useState<Record<string, { offerId: string; storeName: string; offerImageUrl?: string }>>({});

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
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageTimeRef = useRef<string | null>(null);
  const currentUserId = user?.id || '';
  const { markConversationRead } = useChatNotifications();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // State for the "target offer" card displayed at the top in draft mode (and
  // anytime the user opened the chat from a specific offer).
  const [draftOffer, setDraftOffer] = useState<{
    id: string;
    storeName: string;
    discount?: string;
    imageUrl?: string;
  } | null>(null);

  // Fetch conversation details + siblings.
  useEffect(() => {
    if (isDraft) {
      if (!draftOfferId || !draftReceiverId || !user) return;

      // 1) Pre-load target offer details to render the context card at the top.
      offersService
        .getOfferById(draftOfferId)
        .then((res) => {
          if (res?.data) {
            setDraftOffer({
              id: res.data.id,
              storeName: res.data.storeName,
              discount: res.data.discount,
              imageUrl: res.data.imageUrl,
            });
            // If we still don't know the seller's display name, use the one
            // attached to the offer record.
            if (res.data.userName) {
              setConversation((prev) =>
                prev && !prev.otherUserName
                  ? { ...prev, otherUserName: res.data.userName as string }
                  : prev,
              );
            }
          }
        })
        .catch(() => { /* non-blocking */ });

      // 2) Look up any existing conversations with this seller (any offer)
      //    so prior chat history is loaded immediately.
      (async () => {
        try {
          const sibs = await chatService.findSiblingConversations(user.id, draftReceiverId);
          if (sibs.length > 0) {
            setSiblingIds(sibs);
            chatService.getConversationsMeta(sibs).then(setConversationsMeta).catch(() => {});
            // Pull the real seller name from one of the existing conversations.
            try {
              const det = await chatService.getConversation(sibs[0], user.id);
              setConversation({
                ...det.data,
                // Override offer context with the offer the user just clicked from.
                offerId: draftOfferId,
                storeName: draftStoreName || det.data.storeName,
                siblingConversationIds: sibs,
              });
            } catch {
              // Fallback synthesis if details fetch fails.
              setConversation({
                id: '',
                offerId: draftOfferId,
                participants: [user.id, draftReceiverId],
                storeName: draftStoreName,
                otherUserId: draftReceiverId,
                otherUserName: draftOtherName,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                siblingConversationIds: sibs,
              });
            }
          } else {
            // No prior thread — synthesize empty conversation from URL params.
            setConversation({
              id: '',
              offerId: draftOfferId,
              participants: [user.id, draftReceiverId],
              storeName: draftStoreName,
              otherUserId: draftReceiverId,
              otherUserName: draftOtherName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              siblingConversationIds: [],
            });
          }
        } catch (err) {
          console.error('Error loading draft conversation context:', err);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }
    const fetchConversation = async () => {
      if (!conversationId || !user) return;
      try {
        const response = await chatService.getConversation(conversationId, user.id);
        setConversation(response.data);
        if (response.data.siblingConversationIds?.length) {
          setSiblingIds(response.data.siblingConversationIds);
          chatService
            .getConversationsMeta(response.data.siblingConversationIds)
            .then(setConversationsMeta)
            .catch(() => { /* non-blocking */ });
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };
    fetchConversation();
  }, [isDraft, conversationId, user, draftOfferId, draftReceiverId, draftStoreName, draftOtherName]);

  // Fetch messages (initial + polling). In draft mode with no prior siblings
  // there are no messages yet; otherwise we still load the merged thread.
  const fetchMessages = useCallback(async () => {
    if (!conversationId && siblingIds.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const isInitial = !lastMessageTimeRef.current;
      const queryIds = siblingIds.length > 0 ? siblingIds : [conversationId];
      const response = await chatService.getMessages(
        queryIds.length === 1 ? queryIds[0] : queryIds,
        isInitial ? { limit: 30 } : { after: lastMessageTimeRef.current || undefined },
      );
      if (!isInitial && response.data.length > 0) {
        // Polling: append new messages
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = response.data.filter(m => !existingIds.has(m.id));
          if (newMsgs.length > 0) {
            // Play a soft sound for incoming messages from the other user.
            const fromOther = newMsgs.some((m) => m.senderId && m.senderId !== currentUserId);
            if (fromOther) {
              try { playMessageSound(); } catch { /* noop */ }
            }
            setTimeout(scrollToBottom, 100);
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      } else if (isInitial) {
        // Initial load — most recent N messages.
        // Preserve any in-flight optimistic messages (temp-*) that may have
        // been added between conversation materialization and this fetch
        // (e.g. the very first message sent in a draft conversation).
        setMessages((prev) => {
          const optimistic = prev.filter((m) => m.id.startsWith('temp-'));
          if (optimistic.length === 0) return response.data;
          const seen = new Set(response.data.map((m) => m.id));
          return [...response.data, ...optimistic.filter((m) => !seen.has(m.id))];
        });
        setHasMoreOlder(Boolean(response.hasMore));
        setTimeout(scrollToBottom, 100);
      }
      // Update last message time for next poll
      if (response.data.length > 0) {
        lastMessageTimeRef.current = response.data[response.data.length - 1].createdAt;
        // Mark all sibling conversations as read up to the latest fetched message.
        const lastTs = response.data[response.data.length - 1].createdAt;
        for (const id of queryIds) markConversationRead(id, lastTs);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, siblingIds, scrollToBottom, currentUserId, markConversationRead]);

  // Load older messages when user scrolls near the top of the message list.
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlder || !hasMoreOlder) return;
    const oldest = messages[0];
    if (!oldest) return;
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;
    setLoadingOlder(true);
    try {
      const queryIds = siblingIds.length > 0 ? siblingIds : [conversationId];
      const response = await chatService.getMessages(queryIds.length === 1 ? queryIds[0] : queryIds, {
        before: oldest.createdAt,
        limit: 30,
      });
      if (response.data.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const merged = [...response.data.filter((m) => !existingIds.has(m.id)), ...prev];
          return merged;
        });
      }
      setHasMoreOlder(Boolean(response.hasMore));
      // Preserve scroll position so the viewport doesn't jump after prepending.
      requestAnimationFrame(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
        }
      });
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, siblingIds, loadingOlder, hasMoreOlder, messages]);

  // Auto-trigger when the user scrolls to the top of the messages container.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (container.scrollTop < 80 && hasMoreOlder && !loadingOlder) {
        loadOlderMessages();
      }
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [loadOlderMessages, hasMoreOlder, loadingOlder]);

  useEffect(() => {
    fetchMessages();
    if (!conversationId && siblingIds.length === 0) return;
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages, conversationId, siblingIds]);

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

  /**
   * Returns a real (DB-persisted) conversation id. In draft mode this lazily
   * creates the conversation on the first message and updates state + URL.
   * Returns null on failure.
   */
  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (!user || !draftOfferId || !draftReceiverId) return null;
    try {
      const resp = await chatService.createOrGetConversation(
        draftOfferId,
        user.id,
        draftReceiverId
      );
      const newId = resp.data.id;
      setConversationId(newId);
      // Replace URL so subsequent renders use the real id and refresh works.
      navigate(`/chat/${newId}`, { replace: true });
      return newId;
    } catch (err) {
      console.error('Error materializing conversation:', err);
      toast.error('Impossible de créer la conversation');
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    // Materialize conversation if we're in draft mode.
    const convId = await ensureConversation();
    if (!convId) {
      setInputText(text);
      setSending(false);
      return;
    }

    // Pre-populate sibling list and offer meta so the inline offer separator
    // appears immediately above the user's first message — without waiting
    // for the next polling cycle.
    if (draftOffer && draftOffer.id) {
      setSiblingIds((prev) => (prev.includes(convId) ? prev : [...prev, convId]));
      setConversationsMeta((prev) =>
        prev[convId]
          ? prev
          : {
              ...prev,
              [convId]: {
                offerId: draftOffer.id,
                storeName: draftOffer.storeName || draftStoreName,
                offerImageUrl: draftOffer.imageUrl,
              },
            },
      );
    }

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: convId,
      senderId: user.id,
      messageType: 'text',
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      const response = await chatService.sendMessage(convId, user.id, text);
      // Replace optimistic message with real one. Use a dedupe-by-id pass so
      // we don't end up with two rows when an in-flight initial fetch already
      // pulled the persisted message.
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m.id !== optimisticMsg.id && m.id !== response.data.id,
        );
        return [...filtered, response.data];
      });
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
    if (!file || !user) return;

    setUploadingImage(true);
    const convId = await ensureConversation();
    if (!convId) {
      setUploadingImage(false);
      return;
    }
    // Optimistic placeholder with a local blob URL for instant preview
    const blobUrl = URL.createObjectURL(file);
    const optimistic: ChatMessage = {
      id: `temp-img-${Date.now()}`,
      conversationId: convId,
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
      const response = await chatService.sendMessage(convId, user.id, undefined, imageUrl);
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m.id !== optimistic.id && m.id !== response.data.id,
        );
        return [...filtered, response.data];
      });
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
    if (!user || !conversation || sending) return;
    setActionsOpen(false);

    // Determine which offer the request is about: the offer attached to the
    // CURRENT thread (not the seller's most recent offer in general). Source
    // priority:
    //   1. draftOffer (when chat was opened from a specific offer page)
    //   2. The offer linked to the most-recent message in the visible thread
    //   3. conversation.offerId (the conversation's primary offer)
    let targetOfferId =
      draftOffer?.id ||
      (() => {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          const meta = m.conversationId ? conversationsMeta[m.conversationId] : undefined;
          if (meta?.offerId) return meta.offerId;
        }
        return '';
      })() ||
      conversation.offerId ||
      '';

    let myOffer:
      | { id: string; storeName: string; imageUrl: string; discount: string; userId: string }
      | undefined;

    try {
      // Fetch the offer details by id and confirm the current user owns it —
      // the requester must be the seller of the offer being reviewed.
      if (targetOfferId) {
        const res = await offersService.getOfferById(targetOfferId);
        if (res?.data && res.data.userId === user.id) {
          myOffer = {
            id: res.data.id,
            storeName: res.data.storeName,
            imageUrl: res.data.imageUrl,
            discount: res.data.discount,
            userId: res.data.userId,
          };
        }
      }
      // Fallback: if the current thread's offer doesn't belong to this user,
      // we genuinely can't request a review on it. Bail out clearly instead
      // of silently sending a request for an unrelated offer.
      if (!myOffer) {
        toast.error(
          "Vous ne pouvez demander un avis que sur l'offre de cette discussion (et uniquement si vous en êtes l'auteur).",
        );
        return;
      }
    } catch (err) {
      console.error('Error resolving offer for review request:', err);
      toast.error("Impossible de préparer la demande d'avis pour le moment");
      return;
    }

    setSending(true);
    try {
      const payload: ReviewRequestPayload = {
        offerId: myOffer.id,
        offerTitle: myOffer.storeName,
        offerImageUrl: myOffer.imageUrl,
        discount: myOffer.discount,
      };
      // Materialize the conversation on first interaction (draft → persisted).
      const convId = await ensureConversation();
      if (!convId) return;
      const optimistic: ChatMessage = {
        id: `temp-rr-${Date.now()}`,
        conversationId: convId,
        senderId: user.id,
        messageType: 'review_request',
        reviewRequestPayload: payload,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();

      const response = await chatService.sendReviewRequest(convId, user.id, payload);
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
      // Also post the review as a chat message so the requester sees it in
      // the thread. Pick the sibling conversation that matches the offer
      // being reviewed (falls back to the current conversationId).
      try {
        const targetConvId =
          Object.entries(conversationsMeta).find(
            ([, m]) => m.offerId === activeReviewPayload.offerId,
          )?.[0] || conversationId;
        if (targetConvId) {
          const optimistic: ChatMessage = {
            id: `temp-rv-${Date.now()}`,
            conversationId: targetConvId,
            senderId: user.id,
            messageType: 'review',
            reviewRating: rating,
            reviewComment: comment || undefined,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, optimistic]);
          scrollToBottom();
          const resp = await chatService.sendReview(targetConvId, user.id, rating, comment);
          setMessages((prev) => {
            const filtered = prev.filter(
              (m) => m.id !== optimistic.id && m.id !== resp.data.id,
            );
            return [...filtered, resp.data];
          });
          lastMessageTimeRef.current = resp.data.createdAt;
        }
      } catch (chatErr) {
        // Non-blocking: review is saved even if chat broadcast fails.
        console.error('Failed to post review chat message:', chatErr);
      }
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
    <div className="h-[calc(100dvh-8rem)] md:h-screen bg-gray-50 flex flex-col md:px-8 md:py-6 overflow-hidden">
      {/* Desktop card wrapper */}
      <div className="flex-1 min-h-0 flex flex-col md:max-w-4xl md:mx-auto md:w-full md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden">

        {/* Header (fixed at top of chat container) */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
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

        {/* Messages (only this scrolls) */}
        <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto px-5 md:px-6 py-4">
          <div className="max-w-3xl mx-auto flex flex-col gap-2 pb-2">
            {/* Top loader for older messages */}
            {hasMoreOlder && messages.length > 0 && (
              <div className="flex justify-center py-2">
                {loadingOlder ? (
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-[#1FA774] rounded-full animate-spin" />
                    Chargement…
                  </div>
                ) : (
                  <button
                    onClick={loadOlderMessages}
                    className="text-xs text-[#1FA774] font-medium hover:underline"
                  >
                    Voir les messages plus anciens
                  </button>
                )}
              </div>
            )}
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === currentUserId;
              const prev = idx > 0 ? messages[idx - 1] : undefined;
              const meta = msg.conversationId ? conversationsMeta[msg.conversationId] : undefined;
              // Show the offer-context pill at the start of the thread, and at
              // every boundary where the message belongs to a different offer
              // than the previous one.
              const showOfferSep = Boolean(
                meta && (meta.storeName || meta.offerImageUrl) &&
                  (idx === 0 || msg.conversationId !== prev?.conversationId),
              );
              return (
                <div key={msg.id}>
                  {showOfferSep && meta && (
                    <div
                      className={`mt-3 mb-1 flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      aria-label="Contexte d'offre"
                    >
                      <button
                        type="button"
                        onClick={() => meta.offerId && navigate(`/offer/${meta.offerId}`)}
                        className="group flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1 pr-3 py-0.5 shadow-sm hover:shadow hover:border-[#1FA774]/40 transition-all"
                        title={`À propos de ${meta.storeName || 'cette offre'}`}
                      >
                        {meta.offerImageUrl ? (
                          <img
                            src={meta.offerImageUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-gray-100"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 text-[10px] font-bold">
                            {(meta.storeName || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-gray-600 truncate max-w-[160px] group-hover:text-[#1FA774] transition-colors">
                          {meta.storeName || 'cette offre'}
                        </span>
                      </button>
                    </div>
                  )}
                <div
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
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input bar with "+" actions menu (review request) — fixed at bottom of chat container */}
        <div className="bg-white border-t border-gray-200 flex-shrink-0">
          {/* Draft mode: show the offer the user is contacting about, pinned
              above the composer until the first message is sent. */}
          {!conversationId && draftOffer && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-100">
              <div className="max-w-3xl mx-auto px-5 md:px-6 py-2.5 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold flex-shrink-0">
                  À propos de
                </span>
                {draftOffer.imageUrl ? (
                  <img
                    src={draftOffer.imageUrl}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover ring-1 ring-emerald-200 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <span className="w-9 h-9 rounded-lg bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold flex-shrink-0">
                    {(draftOffer.storeName || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/offer/${draftOffer.id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {draftOffer.storeName}
                  </p>
                  {draftOffer.discount && (
                    <p className="text-xs text-emerald-700 font-medium truncate">
                      {draftOffer.discount}
                    </p>
                  )}
                </button>
              </div>
            </div>
          )}
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
