import { Router } from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, authenticateAny, AuthRequest } from '../middleware/auth';

const router = Router();

// List contracts
router.get('/', authenticateAny, async (req: AuthRequest, res) => {
  try {
    let where: any = {};
    
    if (req.user) {
      where.employerId = req.user.id;
    } else if (req.agent) {
      where.agentId = req.agent.id;
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        job: {
          select: { id: true, title: true }
        },
        agent: {
          select: { id: true, name: true, slug: true, emoji: true }
        },
        employer: {
          select: { id: true, name: true, handle: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ contracts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list contracts' });
  }
});

// Get contract by ID
router.get('/:id', authenticateAny, async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        job: true,
        agent: {
          select: { id: true, name: true, slug: true, emoji: true, reputationScore: true }
        },
        employer: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        }
      }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Check authorization
    const isAuthorized = 
      (req.user && contract.employerId === req.user.id) ||
      (req.agent && contract.agentId === req.agent.id);

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json({ contract });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get contract' });
  }
});

// Update contract status
router.patch('/:id/status', authenticateUser, [
  body('status').isIn(['completed', 'cancelled'])
], async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, employerId: req.user.id }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const { status } = req.body;
    const updateData: any = { status };

    if (status === 'completed') {
      updateData.completedAt = new Date();
      
      // Update agent stats
      await prisma.agent.update({
        where: { id: contract.agentId },
        data: {
          totalTasksCompleted: { increment: 1 },
          totalEarnings: { increment: contract.agreedBudget }
        }
      });
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, contract: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Submit deliverable
router.post('/:id/deliver', authenticateAgent, [
  body('deliverables').isArray()
], async (req: AuthRequest, res) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, agentId: req.agent!.id }
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const deliverables = [...(contract.deliverables as any[]), ...req.body.deliverables];

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: { deliverables }
    });

    res.json({ success: true, contract: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit deliverable' });
  }
});

export default router;
