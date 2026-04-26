import { supabase } from './supabaseClient';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'photo' | 'review';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: MessageType;
  text?: string;
  imageUrl?: string;
  reviewRating?: number;
  reviewComment?: string;
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

/**
 * Normalise a raw DB row into a typed ChatMessage.
 * Infers message type from the `message_type` column when present, or falls back
 * to inspecting `image_url` / `text` for rows that pre-date the column.
 */
function toMessage(m: any): ChatMessage {
  const type: MessageType =
    m.message_type === 'review'
      ? 'review'
      : m.message_type === 'photo' || (!m.message_type && m.image_url && !m.text)
      ? 'photo'
      : 'text';

  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    messageType: type,
    text: m.text ?? undefined,
    imageUrl: m.image_url ?? undefined,
    reviewRating: m.review_rating ?? undefined,
    reviewComment: m.review_comment ?? undefined,
    createdAt: m.created_at,
  };
}

/** Returns a concise, human-readable last-message preview for the conversation list. */
function lastMessagePreview(msg: any): string {
  const type: MessageType =
    msg.message_type === 'review'
      ? 'review'
      : msg.message_type === 'photo' || (!msg.message_type && msg.image_url && !msg.text)
      ? 'photo'
      : 'text';

  if (type === 'photo') return '📷 Photo';
  if (type === 'review') {
    const stars = '⭐'.repeat(Math.min(5, Math.max(0, msg.review_rating || 0)));
    return msg.review_comment ? `${stars} ${msg.review_comment}` : stars || '⭐ Avis';
  }
  return msg.text || '';
}

// ── Service ───────────────────────────────────────────────────────────────────

class ChatService {
  // ── Image upload ────────────────────────────────────────────────────────────

  /** Upload a chat image file to the 'chat' storage bucket and return its public URL. */
  async uploadChatImage(file: File): Promise<string> {
    const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}.${ext}`;
    const buffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from('chat')
      .upload(fileName, buffer, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    const { data: pub } = supabase.storage.from('chat').getPublicUrl(data.path);
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
            .select('text, image_url, message_type, review_rating, review_comment, created_at')
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

  async getMessages(conversationId: string, after?: string): Promise<{ success: boolean; data: ChatMessage[] }> {
    let q = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }); // stable tie-breaker for same-timestamp messages
    if (after) q = q.gt('created_at', after);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return { success: true, data: (data || []).map(toMessage) };
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
    const row = {
      id: `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      message_type: type,
      text: text || null,
      image_url: imageUrl || null,
      created_at: now,
    };

    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to send message');
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
    const row = {
      id: `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      message_type: 'review',
      text: null,
      image_url: null,
      review_rating: rating,
      review_comment: comment || null,
      created_at: now,
    };

    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to send review');
    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);
    return { success: true, data: toMessage(data) };
  }
}

export const chatService = new ChatService();

