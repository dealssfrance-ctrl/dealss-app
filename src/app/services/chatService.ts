const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

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
  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async getConversations(userId: string): Promise<{ success: boolean; data: ConversationSummary[] }> {
    const response = await fetch(`${API_URL}/chat/conversations?userId=${userId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  }

  async getConversation(id: string, userId: string): Promise<{ success: boolean; data: ConversationDetail }> {
    const response = await fetch(`${API_URL}/chat/conversations/${id}?userId=${userId}`, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch conversation');
    return response.json();
  }

  async getMessages(conversationId: string, after?: string): Promise<{ success: boolean; data: ChatMessage[] }> {
    const url = after
      ? `${API_URL}/chat/conversations/${conversationId}/messages?after=${encodeURIComponent(after)}`
      : `${API_URL}/chat/conversations/${conversationId}/messages`;
    const response = await fetch(url, {
      method: 'GET',
      headers: await this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  }

  async createOrGetConversation(offerId: string, senderId: string, receiverId: string): Promise<{ success: boolean; data: { id: string }; existing: boolean }> {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ offerId, senderId, receiverId })
    });
    if (!response.ok) throw new Error('Failed to create conversation');
    return response.json();
  }

  async sendMessage(conversationId: string, senderId: string, text?: string, imageUrl?: string): Promise<{ success: boolean; data: ChatMessage }> {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ senderId, text, imageUrl })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  }
}

export const chatService = new ChatService();
