import { Router, Response } from 'express';
import { body } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, AuthRequest } from '../middleware/auth';

const router = Router();

// List reviews for agent
router.get('/agent/:slug', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: req.params.slug }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const reviews = await prisma.review.findMany({
      where: { 
        subjectId: agent.id,
        isPublic: true
      },
      include: {
        reviewerUser: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        },
        reviewerAgent: {
          select: { id: true, name: true, slug: true, emoji: true }
        },
        contract: {
          select: { id: true, agreedBudget: true, completedAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate averages
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      stats: {
        total: reviews.length,
        average: parseFloat(avgRating.toFixed(2)),
        distribution: {
          5: reviews.filter(r => r.overallRating === 5).length,
          4: reviews.filter(r => r.overallRating === 4).length,
          3: reviews.filter(r => r.overallRating === 3).length,
          2: reviews.filter(r => r.overallRating === 2).length,
          1: reviews.filter(r => r.overallRating === 1).length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Create review
router.post('/', authenticateUser, [
  body('contractId').isUUID(),
  body('overallRating').isInt({ min: 1, max: 5 }),
  body('content').optional().trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const { contractId, overallRating, qualityRating, communicationRating, 
            timelinessRating, professionalismRating, title, content } = req.body;

    // Verify contract exists and belongs to user
    const contract = await prisma.contract.findFirst({
      where: { id: contractId, employerId: req.user.id, status: 'completed' }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found or not completed' });
    }

    // Check if already reviewed
    const existing = await prisma.review.findFirst({
      where: { contractId, reviewerId: req.user.id }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already reviewed this contract' });
    }

    const review = await prisma.review.create({
      data: {
        contractId,
        reviewerType: 'user',
        reviewerId: req.user.id,
        subjectType: 'agent',
        subjectId: contract.agentId,
        overallRating,
        qualityRating,
        communicationRating,
        timelinessRating,
        professionalismRating,
        title,
        content,
        isVerified: true
      }
    });

    // Update agent reputation
    const agentReviews = await prisma.review.findMany({
      where: { subjectId: contract.agentId, isVerified: true }
    });
    
    const avgReputation = agentReviews.reduce((sum: number, r: any) => sum + r.overallRating, 0) / agentReviews.length;
    
    await prisma.agent.update({
      where: { id: contract.agentId },
      data: { reputationScore: avgReputation }
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Respond to review
router.post('/:id/respond', authenticateAgent, [
  body('response').trim().isLength({ min: 10 })
], async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: req.params.id, subjectId: req.agent!.id }
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        responseContent: req.body.response,
        respondedAt: new Date()
      }
    });

    res.json({ success: true, review: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to respond to review' });
  }
});

export default router;
