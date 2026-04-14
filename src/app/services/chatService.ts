import { supabase } from './supabaseClient';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  imageUrl?: string;
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
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      summaries.push({
        id: c.id,
        offerId: c.offer_id,
        storeName: offer?.store_name || 'Unknown',
        otherUserId,
        otherUserName: otherUser?.name || 'Unknown',
        lastMessage: lastMsg?.text || '',
        lastMessageTime: lastMsg?.created_at || c.updated_at,
        updatedAt: c.updated_at,
        createdAt: c.created_at,
      });
    }

    return { success: true, data: summaries };
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

    return {
      success: true,
      data: (data || []).map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        text: m.text,
        imageUrl: m.image_url,
        createdAt: m.created_at,
      })),
    };
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

  async sendMessage(conversationId: string, senderId: string, text?: string, imageUrl?: string): Promise<{ success: boolean; data: ChatMessage }> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = new Date().toISOString();

    const { data: msg, error } = await supabase.from('messages').insert({
      id,
      conversation_id: conversationId,
      sender_id: senderId,
      text: text || null,
      image_url: imageUrl || null,
      created_at: now,
    }).select().single();

    if (error) throw new Error('Failed to send message');

    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);

    return {
      success: true,
      data: {
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        text: msg.text,
        imageUrl: msg.image_url,
        createdAt: msg.created_at,
      },
    };
  }
}

export const chatService = new ChatService();
