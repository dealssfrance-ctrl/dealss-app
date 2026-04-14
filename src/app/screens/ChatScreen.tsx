import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { chatService, ChatMessage, ConversationDetail } from '../services/chatService';
import { ChatScreenSkeleton } from '../components/Skeleton';

const POLL_INTERVAL = 30000; // 30 seconds

export function ChatScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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
    if (!file || !user || !id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const imageUrl = reader.result as string;
      try {
        const response = await chatService.sendMessage(id, user.id, undefined, imageUrl);
        setMessages(prev => [...prev, response.data]);
        lastMessageTimeRef.current = response.data.createdAt;
        scrollToBottom();
      } catch (error) {
        console.error('Error sending image:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:px-8 md:py-6">
      {/* Desktop card wrapper */}
      <div className="flex-1 flex flex-col md:max-w-4xl md:mx-auto md:w-full md:bg-white md:rounded-2xl md:shadow-sm md:overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/messages')} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-900" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#1FA774]/10 flex items-center justify-center">
              <span className="text-[#1FA774] font-bold">
                {conversation.otherUserName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{conversation.otherUserName}</h2>
              <p className="text-sm text-gray-500 truncate">Re: {conversation.storeName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4">
        <div className="max-w-3xl mx-auto">
        {messages.map((message) => {
          const isCurrentUser = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] md:max-w-[60%] ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                {message.imageUrl ? (
                  <div
                    className={`rounded-2xl overflow-hidden ${
                      isCurrentUser ? 'rounded-br-md' : 'rounded-bl-md'
                    }`}
                  >
                    <img
                      src={message.imageUrl}
                      alt="Shared image"
                      className="max-w-full h-auto"
                    />
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      isCurrentUser
                        ? 'bg-[#1FA774] text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                )}
                <span className="text-xs text-gray-400 mt-1 px-1">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-3xl mx-auto px-5 md:px-6 py-4">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <label className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
              <ImageIcon size={20} className="text-gray-600" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1FA774]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                inputText.trim() && !sending
                  ? 'bg-[#1FA774] text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
      </div>{/* End desktop card wrapper */}
    </div>
  );
}
