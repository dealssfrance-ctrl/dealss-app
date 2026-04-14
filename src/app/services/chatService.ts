import { supabase } from './supabaseClient';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
  replyToId?: string;
  replyTo?: ChatMessage | null;
  editedAt?: string;
  deletedAt?: string;
  readBy: string[];
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
  unreadCount: number;
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

function mapMessage(m: any): ChatMessage {
  return {
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    text: m.text,
    imageUrl: m.image_url,
    replyToId: m.reply_to_id || undefined,
    editedAt: m.edited_at || undefined,
    deletedAt: m.deleted_at || undefined,
    readBy: m.read_by || [],
    createdAt: m.created_at,
  };
}

class ChatService {
  async getConversations(userId: string): Promise<{ success: boolean; data: ConversationSummary[] }> {
    const { data: convos, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (error) throw new Error('Failed to fetch conversations');

    const summaries: ConversationSummary[] = [];
    for (const c of convos || []) {
      const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';

      const { data: otherUser } = await supabase.from('users').select('name').eq('id', otherUserId).single();
      const { data: offer } = await supabase.from('offers').select('store_name').eq('id', c.offer_id).single();
      const { data: lastMsg } = await supabase.from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Count unread messages (where userId is NOT in read_by)
      const { count: unreadCount } = await supabase.from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_id', userId)
        .is('deleted_at', null)
        .not('read_by', 'cs', `{${userId}}`);

      summaries.push({
        id: c.id,
        offerId: c.offer_id,
        storeName: offer?.store_name || 'Unknown',
        otherUserId,
        otherUserName: otherUser?.name || 'Unknown',
        lastMessage: lastMsg?.text || (lastMsg?.image_url ? '📷 Photo' : ''),
        lastMessageTime: lastMsg?.created_at || c.updated_at,
        unreadCount: unreadCount || 0,
        updatedAt: c.updated_at,
        createdAt: c.created_at,
      });
    }

    return { success: true, data: summaries };
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const { data: convos } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [userId]);

    if (!convos || convos.length === 0) return 0;

    const ids = convos.map(c => c.id);
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', ids)
      .neq('sender_id', userId)
      .is('deleted_at', null)
      .not('read_by', 'cs', `{${userId}}`);

    return count || 0;
  }

  async getConversation(id: string, userId: string): Promise<{ success: boolean; data: ConversationDetail }> {
    const { data: c, error } = await supabase.from('conversations').select('*').eq('id', id).single();
    if (error || !c) throw new Error('Failed to fetch conversation');

    const otherUserId = (c.participants as string[]).find((p: string) => p !== userId) || '';
    const { data: otherUser } = await supabase.from('users').select('name').eq('id', otherUserId).single();
    const { data: offer } = await supabase.from('offers').select('store_name').eq('id', c.offer_id).single();

    return {
      success: true,
      data: {
        id: c.id,
        offerId: c.offer_id,
        participants: c.participants,
        storeName: offer?.store_name || 'Unknown',
        otherUserId,
        otherUserName: otherUser?.name || 'Unknown',
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    };
  }

  async getMessages(conversationId: string, after?: string): Promise<{ success: boolean; data: ChatMessage[] }> {
    let q = supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (after) {
      q = q.gt('created_at', after);
    }
    const { data, error } = await q;
    if (error) throw new Error('Failed to fetch messages');

    const msgs = (data || []).map(mapMessage);

    // Resolve reply references
    const replyIds = msgs.filter(m => m.replyToId).map(m => m.replyToId!);
    if (replyIds.length > 0) {
      const { data: replyMsgs } = await supabase.from('messages').select('*').in('id', replyIds);
      const replyMap = new Map((replyMsgs || []).map(m => [m.id, mapMessage(m)]));
      msgs.forEach(m => {
        if (m.replyToId) m.replyTo = replyMap.get(m.replyToId) || null;
      });
    }

    return { success: true, data: msgs };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    // Get all unread messages in this conversation not sent by this user
    const { data: unread } = await supabase.from('messages')
      .select('id, read_by')
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('deleted_at', null)
      .not('read_by', 'cs', `{${userId}}`);

    if (!unread || unread.length === 0) return;

    // Update each unread message to add userId to read_by
    for (const msg of unread) {
      const newReadBy = [...(msg.read_by || []), userId];
      await supabase.from('messages').update({ read_by: newReadBy }).eq('id', msg.id);
    }
  }

  async createOrGetConversation(offerId: string, senderId: string, receiverId: string): Promise<{ success: boolean; data: { id: string }; existing: boolean }> {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('offer_id', offerId)
      .contains('participants', [senderId, receiverId]);

    if (existing && existing.length > 0) {
      return { success: true, data: { id: existing[0].id }, existing: true };
    }

    const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();
    const { data: created, error } = await supabase.from('conversations').insert({
      id,
      offer_id: offerId,
      participants: [senderId, receiverId],
      created_at: now,
      updated_at: now,
    }).select().single();

    if (error) throw new Error('Failed to create conversation');
    return { success: true, data: { id: created.id }, existing: false };
  }

  async sendMessage(conversationId: string, senderId: string, text?: string, imageUrl?: string, replyToId?: string): Promise<{ success: boolean; data: ChatMessage }> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    const { data: msg, error } = await supabase.from('messages').insert({
      id,
      conversation_id: conversationId,
      sender_id: senderId,
      text: text || null,
      image_url: imageUrl || null,
      reply_to_id: replyToId || null,
      read_by: [senderId],
      created_at: now,
    }).select().single();

    if (error) throw new Error('Failed to send message');

    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);

    const mapped = mapMessage(msg);

    // If replying, fetch the replied message
    if (replyToId) {
      const { data: replyMsg } = await supabase.from('messages').select('*').eq('id', replyToId).single();
      if (replyMsg) mapped.replyTo = mapMessage(replyMsg);
    }

    return { success: true, data: mapped };
  }

  async editMessage(messageId: string, newText: string): Promise<{ success: boolean; data: ChatMessage }> {
    const now = new Date().toISOString();
    const { data: msg, error } = await supabase.from('messages')
      .update({ text: newText, edited_at: now })
      .eq('id', messageId)
      .select()
      .single();

    if (error) throw new Error('Failed to edit message');
    return { success: true, data: mapMessage(msg) };
  }

  async deleteMessage(messageId: string): Promise<void> {
    const now = new Date().toISOString();
    await supabase.from('messages')
      .update({ deleted_at: now })
      .eq('id', messageId);
  }
}

export const chatService = new ChatService();
