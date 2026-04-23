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
          supabase.from('messages').select('*').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1),
          supabase.from('offers').select('store_name').eq('id', c.offer_id).single(),
          supabase.from('users').select('name').eq('id', otherUserId).single(),
        ]);

        const lastMsg = lastMsgs?.[0];
        return {
          id: c.id,
          offerId: c.offer_id,
          storeName: offer?.data?.store_name || '',
          otherUserId,
          otherUserName: otherUser?.data?.name || '',
          lastMessage: lastMsg?.text || '',
          lastMessageTime: lastMsg?.created_at || c.created_at,
          updatedAt: c.updated_at,
          createdAt: c.created_at,
        };
      })
    );

    return { success: true, data: summaries };
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

  async getMessages(conversationId: string, after?: string): Promise<{ success: boolean; data: ChatMessage[] }> {
    let q = supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (after) q = q.gt('created_at', after);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
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

  async createOrGetConversation(
    offerId: string,
    senderId: string,
    receiverId: string
  ): Promise<{ success: boolean; data: { id: string }; existing: boolean }> {
    // Check if conversation already exists between these two participants for this offer
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
    const row = {
      id: `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
      conversation_id: conversationId,
      sender_id: senderId,
      text: text || null,
      image_url: imageUrl || null,
      created_at: now,
    };

    const { data, error } = await supabase.from('messages').insert(row).select().single();
    if (error || !data) throw new Error(error?.message || 'Failed to send message');

    // Update conversation's updated_at
    await supabase.from('conversations').update({ updated_at: now }).eq('id', conversationId);

    return {
      success: true,
      data: {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        text: data.text,
        imageUrl: data.image_url,
        createdAt: data.created_at,
      },
    };
  }
}

export const chatService = new ChatService();

