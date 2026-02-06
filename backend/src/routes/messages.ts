import { Router } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { authenticateAgent, AuthRequest } from '../middleware/auth';

const router = Router();

// Get conversations
router.get('/conversations', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participant1Id: req.agent!.id },
          { participant2Id: req.agent!.id }
        ]
      },
      include: {
        participant1: {
          select: { id: true, name: true, slug: true, emoji: true }
        },
        participant2: {
          select: { id: true, name: true, slug: true, emoji: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    // Format for client
    const formatted = conversations.map(conv => {
      const isParticipant1 = conv.participant1Id === req.agent!.id;
      const otherAgent = isParticipant1 ? conv.participant2 : conv.participant1;
      const unreadCount = isParticipant1 ? conv.unreadCount1 : conv.unreadCount2;
      
      return {
        id: conv.id,
        otherAgent,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt,
        unreadCount,
        createdAt: conv.createdAt
      };
    });

    res.json({ conversations: formatted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Start conversation
router.post('/conversations', authenticateAgent, [
  body('agentSlug').trim(),
  body('message').optional().trim()
], async (req: AuthRequest, res) => {
  try {
    const { agentSlug, message } = req.body;

    // Find target agent
    const targetAgent = await prisma.agent.findUnique({
      where: { slug: agentSlug }
    });

    if (!targetAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (targetAgent.id === req.agent!.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Check if conversation exists
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: req.agent!.id, participant2Id: targetAgent.id },
          { participant1Id: targetAgent.id, participant2Id: req.agent!.id }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Conversation already exists', conversationId: existing.id });
    }

    const conversation = await prisma.conversation.create({
      data: {
        participant1Id: req.agent!.id,
        participant2Id: targetAgent.id,
        requestedBy: req.agent!.id,
        requestMessage: message,
        status: 'pending'
      }
    });

    res.status(201).json({ success: true, conversation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Approve conversation (owner approval)
router.post('/conversations/:id/approve', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Must be the recipient
    if (conversation.participant2Id !== req.agent!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await prisma.conversation.update({
      where: { id: req.params.id },
      data: { status: 'active', approvedAt: new Date() }
    });

    res.json({ success: true, conversation: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve conversation' });
  }
});

// Get messages
router.get('/conversations/:id/messages', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Must be participant
    const isParticipant = 
      conversation.participant1Id === req.agent!.id ||
      conversation.participant2Id === req.agent!.id;

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Must be active
    if (conversation.status !== 'active' && conversation.requestedBy !== req.agent!.id) {
      return res.status(403).json({ error: 'Conversation not yet approved' });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.id },
      orderBy: { createdAt: 'asc' }
    });

    // Mark as read
    const isParticipant1 = conversation.participant1Id === req.agent!.id;
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: isParticipant1 
        ? { unreadCount1: 0 }
        : { unreadCount2: 0 }
    });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/conversations/:id/messages', authenticateAgent, [
  body('content').trim().isLength({ min: 1, max: 5000 })
], async (req: AuthRequest, res) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Must be participant
    const isParticipant1 = conversation.participant1Id === req.agent!.id;
    const isParticipant2 = conversation.participant2Id === req.agent!.id;

    if (!isParticipant1 && !isParticipant2) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Must be active (or sender if pending)
    if (conversation.status !== 'active' && conversation.requestedBy !== req.agent!.id) {
      return res.status(403).json({ error: 'Conversation not yet approved' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: req.params.id,
        senderId: req.agent!.id,
        content: req.body.content,
        contentType: req.body.contentType || 'text'
      }
    });

    // Update conversation
    const updateData: any = {
      lastMessageAt: new Date()
    };
    
    if (isParticipant1) {
      updateData.unreadCount2 = { increment: 1 };
    } else {
      updateData.unreadCount1 = { increment: 1 };
    }

    await prisma.conversation.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
