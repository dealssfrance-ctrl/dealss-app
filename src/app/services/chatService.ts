import { supabase } from './supabaseClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'photo' | 'review' | 'review_request';

export interface ReviewRequestPayload {
  offerId: string;
  offerTitle: string;
  offerImageUrl?: string;
  discount?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  text?: string;
  imageUrl?: string;
  reviewRating?: number;
  reviewComment?: string;
  reviewRequestPayload?: ReviewRequestPayload;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  offerId: string;
  storeName: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageTime: string;
  updatedAt: string;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  offerId: string;
  participants: string[];
  storeName: string;
  otherUserId: string;
  otherUserName: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const REVIEW_REQUEST_PREFIX = '__review_request__:';

function parseReviewRequestText(value: unknown): ReviewRequestPayload | undefined {
  const raw = String(value ?? '').trim();
  if (!raw.startsWith(REVIEW_REQUEST_PREFIX)) return undefined;

  const payloadStr = raw.slice(REVIEW_REQUEST_PREFIX.length).trim();
  if (!payloadStr) return undefined;

  try {
    const parsed = JSON.parse(payloadStr);
    if (!parsed || typeof parsed !== 'object') return undefined;

    const offerId = String((parsed as any).offerId || '').trim();
    const offerTitle = String((parsed as any).offerTitle || '').trim();
    const offerImageUrl = String((parsed as any).offerImageUrl || '').trim() || undefined;
    const discount = String((parsed as any).discount || '').trim() || undefined;

    if (!offerId || !offerTitle) return undefined;
    return { offerId, offerTitle, offerImageUrl, discount };
  } catch {
    return undefined;
  }
}

function encodeReviewRequestText(payload: ReviewRequestPayload): string {
  return `${REVIEW_REQUEST_PREFIX}${JSON.stringify(payload)}`;
}

function sanitizeMessageImageUrl(value: unknown): string | undefined {
  let raw = String(value ?? '').trim();
  if (!raw) return undefined;

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const first = parsed.find((item) => typeof item === 'string' && item.trim().length > 0);
        raw = String(first ?? '').trim();
      }
    } catch {
      // Continue with fallback cleanup below.
    }
  }

  raw = raw.replace(/^['\"]+|['\"]+$/g, '').trim();

  if (raw.startsWith('%22http')) {
    try {
      raw = decodeURIComponent(raw).replace(/^['\"]+|['\"]+$/g, '').trim();
    } catch {
      return undefined;
    }
  }

  return /^https?:\/\//i.test(raw) ? raw : undefined;
}

/**
 * Normalise a raw DB row into a typed ChatMessage.
 * Infers message type from the `message_type` column when present, or falls back
 * to inspecting `image_url` / `text` for rows that pre-date the column.
 */
function toMessage(m: any): ChatMessage {
  const imageUrl = sanitizeMessageImageUrl(m.image_url);
  const reviewRequestPayload = parseReviewRequestText(m.text);
  const type: MessageType =
    reviewRequestPayload
      ? 'review_request'
      : m.message_type === 'review'
      ? 'review'
      : m.message_type === 'photo' || (!m.message_type && imageUrl && !m.text)
      ? 'photo'
      : 'text';

  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    messageType: type,
    text: m.text ?? undefined,
    imageUrl,
    reviewRating: m.review_rating ?? undefined,
    reviewComment: m.review_comment ?? undefined,
    reviewRequestPayload,
    createdAt: m.created_at,
  };
}

/** Returns a concise, human-readable last-message preview for the conversation list. */
function lastMessagePreview(msg: any): string {
  const imageUrl = sanitizeMessageImageUrl(msg.image_url);
  const reviewRequestPayload = parseReviewRequestText(msg.text);
  const type: MessageType =
    reviewRequestPayload
      ? 'review_request'
      : msg.message_type === 'review'
      ? 'review'
      : msg.message_type === 'photo' || (!msg.message_type && imageUrl && !msg.text)
      ? 'photo'
      : 'text';

  if (type === 'review_request') return '📝 Demande d\'avis';
  if (type === 'photo') return '📷 Photo';
  if (type === 'review') {
    const stars = '⭐'.repeat(Math.min(5, Math.max(0, msg.review_rating || 0)));
    return msg.review_comment ? `${stars} ${msg.review_comment}` : stars || '⭐ Avis';
  }
  return msg.text || '';
}

// ── Service ───────────────────────────────────────────────────────────────────

class ChatService {
  private supportsRichMessageColumns: boolean = false;

  private buildLegacyReviewText(rating: number, comment?: string): string {
    const safeRating = Math.min(5, Math.max(1, rating));
    const stars = '⭐'.repeat(safeRating);
    const c = (comment || '').trim();
    return c ? `${stars} ${c}` : stars;
  }

  // ── Image upload ────────────────────────────────────────────────────────────

  /** Upload a chat image file to storage and return its public URL. */
  async uploadChatImage(file: File): Promise<string> {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const fileName = `chat/${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.${ext}`;
    const buffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from('offers')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: pub } = supabase.storage.from('offers').getPublicUrl(data.path);
    return pub.publicUrl;
  }

  // ── Conversations ─────────────────────────────────────────────────────────

  async getConversations(userId: string): Promise<{ success: boolean; data: ConversationSummary[] }> {
    const { data: convs, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });
    if (error) throw new Error(error.message);

    const summaries: ConversationSummary[] = await Promise.all(
      (convs || []).map(async (c: any) => {
        const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';

        const [{ data: lastMsgs }, { data: offer }, { data: otherUser }] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase.from('offers').select('store_name').eq('id', c.offer_id).single(),
          supabase.from('users').select('name').eq('id', otherUserId).single(),
        ]);

        const lastMsg = lastMsgs?.[0];
        return {
          id: c.id,
          offerId: c.offer_id,
          // `offer` and `otherUser` are already the data objects due to destructuring { data: offer }.
          storeName: (offer as any)?.store_name || '',
          otherUserId,
          otherUserName: (otherUser as any)?.name || '',
          lastMessage: lastMsg ? lastMessagePreview(lastMsg) : '',
          lastMessageTime: lastMsg?.created_at || c.updated_at,
          updatedAt: c.updated_at,
          createdAt: c.created_at,
        };
      })
    );

    // Safety dedup by conversation id, then sort by most-recent message time descending.
    const seen = new Set<string>();
    const deduped = summaries.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    deduped.sort((a, b) =>
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    return { success: true, data: deduped };
  }

  async getConversation(id: string, userId: string): Promise<{ success: boolean; data: ConversationDetail }> {
    const { data: c, error } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (error || !c) throw new Error('Conversation not found');

    const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';
    const [{ data: offer }, { data: otherUser }] = await Promise.all([
      supabase.from('offers').select('store_name').eq('id', c.offer_id).single(),
      supabase.from('users').select('name').eq('id', otherUserId).single(),
    ]);

    return {
      success: true,
      data: {
        id: c.id,
        offerId: c.offer_id,
        participants: c.participants,
        storeName: (offer as any)?.store_name || '',
        otherUserId,
        otherUserName: (otherUser as any)?.name || '',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    };
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  /**
   * Fetch messages for a conversation.
   * - `after`  → only newer messages (used by polling).
   * - `before` → only older messages, returned newest-first then reversed (used by infinite scroll).
   * - `limit`  → caps result size (default 30 for paginated reads).
   */
  async getMessages(
    conversationId: string,
    opts: string | { after?: string; before?: string; limit?: number } = {},
  ): Promise<{ success: boolean; data: ChatMessage[]; hasMore?: boolean }> {
    // Back-compat: previous callers passed `after` as a string.
    const options = typeof opts === 'string' ? { after: opts } : opts;
    const { after, before, limit } = options;

    let q = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId);

    if (before) {
      // Newest-first window so `limit` returns the most recent N older messages.
      q = q.lt('created_at', before).order('created_at', { ascending: false }).order('id', { ascending: false });
    } else {
      q = q.order('created_at', { ascending: true }).order('id', { ascending: true });
      if (after) q = q.gt('created_at', after);
    }
    if (limit) q = q.limit(limit);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    if (!this.supportsRichMessageColumns && data && data.length > 0) {
      const probe = data[0] as any;
      this.supportsRichMessageColumns =
        Object.prototype.hasOwnProperty.call(probe, 'message_type') ||
        Object.prototype.hasOwnProperty.call(probe, 'review_rating') ||
        Object.prototype.hasOwnProperty.call(probe, 'review_comment');
    }

    let rows = (data || []).map(toMessage);
    if (before) rows = rows.reverse(); // present caller with chronological order
    const hasMore = limit ? (data || []).length === limit : false;
    return { success: true, data: rows, hasMore };
  }

  async findExistingConversation(
    offerId: string,
    senderId: string,
    receiverId: string
  ): Promise<{ id: string } | null> {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('offer_id', offerId)
      .contains('participants', [senderId, receiverId])
      .limit(1);
    if (existing && existing.length > 0) return { id: existing[0].id };
    return null;
  }

  async createOrGetConversation(
    offerId: string,
    senderId: string,
    receiverId: string
  ): Promise<{ success: boolean; data: { id: string }; existing: boolean }> {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('offer_id', offerId)
      .contains('participants', [senderId, receiverId])
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: true, data: { id: existing[0].id }, existing: true };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        id: `conv_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        offer_id: offerId,
        participants: [senderId, receiverId],
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create conversation');
    return { success: true, data: { id: data.id }, existing: false };
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    text?: string,
    imageUrl?: string
  ): Promise<{ success: boolean; data: ChatMessage }> {
    const now = new Date().toISOString();
    const type: MessageType = imageUrl ? 'photo' : 'text';
    const rowBase = {
      id: `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      text: text || null,
      image_url: sanitizeMessageImageUrl(imageUrl) || null,
      created_at: now,
    };

    const row = this.supportsRichMessageColumns ? { ...rowBase, message_type: type } : rowBase;
    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to send message');

    if (!this.supportsRichMessageColumns && (data as any)?.message_type !== undefined) {
      this.supportsRichMessageColumns = true;
    }

    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);
    return { success: true, data: toMessage(data) };
  }

  async sendReview(
    conversationId: string,
    senderId: string,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; data: ChatMessage }> {
    const now = new Date().toISOString();
    const legacyText = this.buildLegacyReviewText(rating, comment);
    const rowBase = {
      id: `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      text: legacyText,
      image_url: null,
      created_at: now,
    };

    const row = this.supportsRichMessageColumns
      ? {
          ...rowBase,
          message_type: 'review',
          text: null,
          review_rating: rating,
          review_comment: comment || null,
        }
      : rowBase;

    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to send review');

    if (!this.supportsRichMessageColumns && (data as any)?.message_type !== undefined) {
      this.supportsRichMessageColumns = true;
    }

    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);
    return { success: true, data: toMessage(data) };
  }

  async sendReviewRequest(
    conversationId: string,
    senderId: string,
    payload: ReviewRequestPayload
  ): Promise<{ success: boolean; data: ChatMessage }> {
    return this.sendMessage(conversationId, senderId, encodeReviewRequestText(payload));
  }
}

export const chatService = new ChatService();

