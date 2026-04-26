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
  offerImageUrl?: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSenderId?: string;
  updatedAt: string;
  createdAt: string;
  /** All conversation IDs that share this same other user (used to merge per-person threads). */
  siblingConversationIds: string[];
  /** How many distinct offers this person has chatted about with the current user. */
  offerCount: number;
}

export interface ConversationDetail {
  id: string;
  offerId: string;
  participants: string[];
  storeName: string;
  offerImageUrl?: string;
  otherUserId: string;
  otherUserName: string;
  createdAt: string;
  updatedAt: string;
  /** All conversation IDs that share this same other user. */
  siblingConversationIds: string[];
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

    type Raw = ConversationSummary;
    const raws: Raw[] = await Promise.all(
      (convs || []).map(async (c: any) => {
        const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';

        const [{ data: lastMsgs }, { data: offer }, { data: otherUser }] = await Promise.all([
          supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase.from('offers').select('store_name, image_url').eq('id', c.offer_id).maybeSingle(),
          supabase.from('users').select('name').eq('id', otherUserId).maybeSingle(),
        ]);

        const lastMsg = lastMsgs?.[0];
        const rawImg = String((offer as any)?.image_url ?? '').trim();
        let firstImg = rawImg;
        if (rawImg.startsWith('[')) {
          try {
            const arr = JSON.parse(rawImg);
            if (Array.isArray(arr)) firstImg = String(arr[0] ?? '').trim();
          } catch { /* ignore */ }
        }
        return {
          id: c.id,
          offerId: c.offer_id,
          storeName: (offer as any)?.store_name || '',
          offerImageUrl: /^https?:\/\//i.test(firstImg) ? firstImg : undefined,
          otherUserId,
          otherUserName: (otherUser as any)?.name || '',
          lastMessage: lastMsg ? lastMessagePreview(lastMsg) : '',
          lastMessageTime: lastMsg?.created_at || c.updated_at,
          lastMessageSenderId: lastMsg?.sender_id || undefined,
          updatedAt: c.updated_at,
          createdAt: c.created_at,
          siblingConversationIds: [c.id],
          offerCount: 1,
        };
      })
    );

    // Deduplicate by other-user: keep the most-recently-active conversation as the
    // representative, but attach all sibling conversation ids so the chat view can
    // merge messages across all offers shared with that person.
    const byUser = new Map<string, Raw>();
    for (const r of raws) {
      if (!r.otherUserId) continue;
      const existing = byUser.get(r.otherUserId);
      if (!existing) {
        byUser.set(r.otherUserId, { ...r });
        continue;
      }
      // Pick the more recent one as representative.
      const existingTs = new Date(existing.lastMessageTime).getTime();
      const candidateTs = new Date(r.lastMessageTime).getTime();
      const winner = candidateTs > existingTs ? { ...r } : { ...existing };
      const loser = candidateTs > existingTs ? existing : r;
      // Merge siblings + offer count.
      const siblings = new Set<string>([
        ...winner.siblingConversationIds,
        ...loser.siblingConversationIds,
      ]);
      winner.siblingConversationIds = Array.from(siblings);
      // Distinct offers shared with this person.
      const offerIds = new Set<string>();
      for (const id of siblings) {
        const src = raws.find((x) => x.id === id);
        if (src?.offerId) offerIds.add(src.offerId);
      }
      winner.offerCount = offerIds.size || 1;
      byUser.set(r.otherUserId, winner);
    }

    const merged = Array.from(byUser.values());
    merged.sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
    return { success: true, data: merged };
  }

  async getConversation(id: string, userId: string): Promise<{ success: boolean; data: ConversationDetail }> {
    const { data: c, error } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (error || !c) throw new Error('Conversation not found');

    const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';
    const [{ data: offer }, { data: otherUser }, { data: siblings }] = await Promise.all([
      supabase.from('offers').select('store_name, image_url').eq('id', c.offer_id).maybeSingle(),
      supabase.from('users').select('name').eq('id', otherUserId).maybeSingle(),
      supabase
        .from('conversations')
        .select('id')
        .contains('participants', [userId, otherUserId]),
    ]);

    const rawImg = String((offer as any)?.image_url ?? '').trim();
    let firstImg = rawImg;
    if (rawImg.startsWith('[')) {
      try {
        const arr = JSON.parse(rawImg);
        if (Array.isArray(arr)) firstImg = String(arr[0] ?? '').trim();
      } catch { /* ignore */ }
    }

    return {
      success: true,
      data: {
        id: c.id,
        offerId: c.offer_id,
        participants: c.participants,
        storeName: (offer as any)?.store_name || '',
        offerImageUrl: /^https?:\/\//i.test(firstImg) ? firstImg : undefined,
        otherUserId,
        otherUserName: (otherUser as any)?.name || '',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        siblingConversationIds: (siblings || []).map((s: any) => s.id),
      },
    };
  }

  /**
   * Fetch lightweight offer-context info for a list of conversation IDs.
   * Used to render per-offer separators in a merged thread.
   */
  async getConversationsMeta(
    conversationIds: string[]
  ): Promise<Record<string, { offerId: string; storeName: string; offerImageUrl?: string }>> {
    if (!conversationIds.length) return {};
    const { data: convs } = await supabase
      .from('conversations')
      .select('id, offer_id')
      .in('id', conversationIds);
    const offerIds = Array.from(new Set((convs || []).map((c: any) => c.offer_id).filter(Boolean)));
    const { data: offers } = offerIds.length
      ? await supabase.from('offers').select('id, store_name, image_url').in('id', offerIds)
      : { data: [] as any[] };
    const offerMap = new Map<string, { storeName: string; offerImageUrl?: string }>();
    for (const o of offers || []) {
      let firstImg = String((o as any).image_url ?? '').trim();
      if (firstImg.startsWith('[')) {
        try {
          const arr = JSON.parse(firstImg);
          if (Array.isArray(arr)) firstImg = String(arr[0] ?? '').trim();
        } catch { /* ignore */ }
      }
      offerMap.set((o as any).id, {
        storeName: (o as any).store_name || '',
        offerImageUrl: /^https?:\/\//i.test(firstImg) ? firstImg : undefined,
      });
    }
    const out: Record<string, { offerId: string; storeName: string; offerImageUrl?: string }> = {};
    for (const c of convs || []) {
      const meta = offerMap.get((c as any).offer_id);
      out[(c as any).id] = {
        offerId: (c as any).offer_id,
        storeName: meta?.storeName || '',
        offerImageUrl: meta?.offerImageUrl,
      };
    }
    return out;
  }

  // ── Messages ─────────────────────────────────────────────────────────────

  /**
   * Fetch messages for a conversation.
   * - `after`  → only newer messages (used by polling).
   * - `before` → only older messages, returned newest-first then reversed (used by infinite scroll).
   * - `limit`  → caps result size (default 30 for paginated reads).
   */
  async getMessages(
    conversationId: string | string[],
    opts: string | { after?: string; before?: string; limit?: number } = {},
  ): Promise<{ success: boolean; data: ChatMessage[]; hasMore?: boolean }> {
    // Back-compat: previous callers passed `after` as a string.
    const options = typeof opts === 'string' ? { after: opts } : opts;
    const { after, before, limit } = options;

    const ids = Array.isArray(conversationId) ? conversationId : [conversationId];
    let q = supabase
      .from('messages')
      .select('*');
    if (ids.length === 1) {
      q = q.eq('conversation_id', ids[0]);
    } else {
      q = q.in('conversation_id', ids);
    }

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

  /**
   * Find ALL conversations between two users, regardless of offer.
   * Used in draft mode to surface prior chat history when contacting
   * a seller about a new offer.
   */
  async findSiblingConversations(
    userId: string,
    otherUserId: string,
  ): Promise<string[]> {
    const { data } = await supabase
      .from('conversations')
      .select('id, updated_at')
      .contains('participants', [userId, otherUserId])
      .order('updated_at', { ascending: false });
    return (data || []).map((r: any) => r.id);
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

  /**
   * Delete one or more conversations and all their messages.
   * Caller must be a participant; we still scope by ids passed in.
   */
  async deleteConversations(conversationIds: string[]): Promise<void> {
    if (!conversationIds.length) return;
    // Delete messages first to avoid FK violations.
    const { error: mErr } = await supabase
      .from('messages')
      .delete()
      .in('conversation_id', conversationIds);
    if (mErr) throw new Error(mErr.message);
    const { error: cErr } = await supabase
      .from('conversations')
      .delete()
      .in('id', conversationIds);
    if (cErr) throw new Error(cErr.message);
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

