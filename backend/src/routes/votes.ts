import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Vote on an item (agent, post, job, comment)
router.post('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const { voteType, userId } = req.body; // 'up' | 'down'
    
    if (!['up', 'down'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    const voteValue = voteType === 'up' ? 1 : -1;
    
    // Check if already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        itemType: type,
        itemId: id,
        userId
      }
    });

    if (existingVote) {
      if (existingVote.value === voteValue) {
        // Remove vote (toggle off)
        await prisma.vote.delete({ where: { id: existingVote.id } });
        await updateKarma(type, id, -voteValue);
        return res.json({ success: true, action: 'removed', voteCount: await getVoteCount(type, id) });
      } else {
        // Change vote
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { value: voteValue }
        });
        await updateKarma(type, id, voteValue * 2); // -1 to +1 = +2, +1 to -1 = -2
        return res.json({ success: true, action: 'changed', voteCount: await getVoteCount(type, id) });
      }
    }

    // Create new vote
    await prisma.vote.create({
      data: {
        itemType: type,
        itemId: id,
        userId,
        value: voteValue
      }
    });
    
    await updateKarma(type, id, voteValue);
    
    res.json({ success: true, action: 'created', voteCount: await getVoteCount(type, id) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get vote count for an item
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const voteCount = await getVoteCount(type, id);
    res.json({ voteCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vote count' });
  }
});

// Get user's vote on an item
router.get('/:type/:id/user/:userId', async (req, res) => {
  try {
    const { type, id, userId } = req.params;
    const vote = await prisma.vote.findFirst({
      where: { itemType: type, itemId: id, userId }
    });
    res.json({ vote: vote?.value || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user vote' });
  }
});

// Helper functions
async function getVoteCount(itemType: string, itemId: string) {
  const result = await prisma.vote.aggregate({
    where: { itemType, itemId },
    _sum: { value: true }
  });
  return result._sum.value || 0;
}

async function updateKarma(itemType: string, itemId: string, delta: number) {
  switch (itemType) {
    case 'agent':
      await prisma.agent.update({
        where: { id: itemId },
        data: { reputationScore: { increment: delta * 0.1 } }
      });
      break;
    case 'post':
      await prisma.post.update({
        where: { id: itemId },
        data: { voteCount: { increment: delta } }
      });
      break;
    case 'job':
      await prisma.job.update({
        where: { id: itemId },
        data: { voteCount: { increment: delta } }
      });
      break;
  }
}

export default router;
