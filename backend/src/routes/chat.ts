import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import crypto from 'crypto';

const router = Router();

// GET /api/chat/conversations - Get all conversations for a user
router.get('/conversations', async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'userId is required' });
  }

  const conversations = await db.getConversationsByUserId(userId);

  // Enrich conversations with participant names, last message, offer info
  const enriched = await Promise.all(conversations.map(async conv => {
    const lastMessage = await db.getLastMessage(conv.id);
    const otherUserId = conv.participants.find(p => p !== userId) || '';
    const otherUser = await db.getUserById(otherUserId);
    const offer = await db.getOfferById(conv.offerId);

    return {
      id: conv.id,
      offerId: conv.offerId,
      storeName: offer?.storeName || 'Unknown',
      otherUserId,
      otherUserName: otherUser?.name || 'Unknown',
      lastMessage: lastMessage?.imageUrl ? '📷 Photo' : (lastMessage?.text || ''),
      lastMessageTime: lastMessage?.createdAt || conv.updatedAt,
      updatedAt: conv.updatedAt,
      createdAt: conv.createdAt,
    };
  }));

  res.json({ success: true, data: enriched });
});

// GET /api/chat/conversations/:id/messages - Get messages for a conversation
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const after = req.query.after as string;

  const conversation = await db.getConversationById(id);
  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  let messages;
  if (after) {
    messages = await db.getMessagesByConversationIdAfter(id, new Date(after));
  } else {
    messages = await db.getMessagesByConversationId(id);
  }

  res.json({ success: true, data: messages });
});

// GET /api/chat/conversations/:id - Get conversation details
router.get('/conversations/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.query.userId as string;

  const conversation = await db.getConversationById(id);
  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  const otherUserId = conversation.participants.find(p => p !== userId) || conversation.participants[0];
  const otherUser = await db.getUserById(otherUserId);
  const offer = await db.getOfferById(conversation.offerId);

  res.json({
    success: true,
    data: {
      ...conversation,
      storeName: offer?.storeName || 'Unknown',
      otherUserId,
      otherUserName: otherUser?.name || 'Unknown',
    }
  });
});

// POST /api/chat/conversations - Create or get existing conversation
router.post('/conversations', async (req: Request, res: Response) => {
  const { offerId, senderId, receiverId } = req.body;

  if (!offerId || !senderId || !receiverId) {
    return res.status(400).json({ success: false, message: 'offerId, senderId, and receiverId are required' });
  }

  // Check if conversation already exists between these users for this offer
  const existing = await db.getConversationByOfferAndParticipants(offerId, senderId, receiverId);
  if (existing) {
    return res.json({ success: true, data: existing, existing: true });
  }

  const conversation = {
    id: `conv-${crypto.randomBytes(8).toString('hex')}`,
    offerId,
    participants: [senderId, receiverId],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.createConversation(conversation);
  res.status(201).json({ success: true, data: conversation, existing: false });
});

// POST /api/chat/conversations/:id/messages - Send a message
router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { senderId, text, imageUrl } = req.body;

  if (!senderId) {
    return res.status(400).json({ success: false, message: 'senderId is required' });
  }

  if (!text && !imageUrl) {
    return res.status(400).json({ success: false, message: 'text or imageUrl is required' });
  }

  const conversation = await db.getConversationById(id);
  if (!conversation) {
    return res.status(404).json({ success: false, message: 'Conversation not found' });
  }

  if (!conversation.participants.includes(senderId)) {
    return res.status(403).json({ success: false, message: 'Not a participant of this conversation' });
  }

  const message = {
    id: `msg-${crypto.randomBytes(8).toString('hex')}`,
    conversationId: id,
    senderId,
    text: text || undefined,
    imageUrl: imageUrl || undefined,
    createdAt: new Date(),
  };

  await db.createMessage(message);
  res.status(201).json({ success: true, data: message });
});

export default router;
