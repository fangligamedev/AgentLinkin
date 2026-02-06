import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, generateToken, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List agents
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('skill').optional(),
  query('availability').optional().isIn(['available', 'busy', 'offline']),
  query('sort').optional().isIn(['reputation', 'created', 'tasks'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const skill = req.query.skill as string;
    const availability = req.query.availability as string;
    const sort = (req.query.sort as string) || 'reputation';

    // Build where clause
    const where: any = { status: 'active' };
    
    if (availability) {
      where.availabilityStatus = availability;
    }

    // Sort options
    const orderBy: any = {};
    switch (sort) {
      case 'reputation':
        orderBy.reputationScore = 'desc';
        break;
      case 'tasks':
        orderBy.totalTasksCompleted = 'desc';
        break;
      case 'created':
      default:
        orderBy.createdAt = 'desc';
    }

    const agents = await prisma.agent.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        emoji: true,
        skills: true,
        capabilities: true,
        availabilityStatus: true,
        reputationScore: true,
        totalTasksCompleted: true,
        totalEarnings: true,
        hourlyRateMin: true,
        hourlyRateMax: true,
        isVerified: true,
        createdAt: true
      },
      orderBy,
      skip,
      take: limit
    });

    const total = await prisma.agent.count({ where });

    res.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get agent by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: req.params.slug },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            handle: true,
            avatarUrl: true
          }
        },
        agentSkills: {
          include: {
            skill: true
          }
        }
      }
    });

    if (!agent || agent.status !== 'active') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Don't expose sensitive fields
    const { apiKeyHash, ...safeAgent } = agent as any;

    res.json({ agent: safeAgent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Register new agent
router.post('/', authenticateUser, [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('slug').trim().matches(/^[a-z0-9-]+$/).isLength({ min: 3, max: 50 }),
  body('description').optional().trim(),
  body('emoji').optional().isLength({ max: 10 })
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, slug, description, emoji, skills, capabilities } = req.body;

    // Check if slug exists
    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    // Generate API key
    const apiKey = `al_${Buffer.from(crypto.randomUUID()).toString('base64url').slice(0, 32)}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        slug,
        description,
        emoji: emoji || '🤖',
        ownerId: req.user.id,
        apiKeyHash,
        skills: skills || [],
        capabilities: capabilities || [],
        version: '1.0.0'
      }
    });

    // Update owner's agent count
    await prisma.user.update({
      where: { id: req.user.id },
      data: { agentsCount: { increment: 1 } }
    });

    res.status(201).json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        emoji: agent.emoji,
        createdAt: agent.createdAt
      },
      apiKey // Only shown once!
    });
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
router.patch('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, ownerId: req.user.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updateData: any = {};
    const allowedFields = ['name', 'description', 'emoji', 'skills', 'capabilities', 
                          'availabilityStatus', 'hourlyRateMin', 'hourlyRateMax', 
                          'preferredTaskTypes', 'timezone'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      agent: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        emoji: updated.emoji,
        availabilityStatus: updated.availabilityStatus,
        updatedAt: updated.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Agent login (get token)
router.post('/:id/login', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, ownerId: req.user.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const token = generateToken({ id: agent.id, slug: agent.slug }, 'agent');

    res.json({
      success: true,
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to login agent' });
  }
});

// Regenerate API key
router.post('/:id/regenerate-key', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, ownerId: req.user.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const newApiKey = `al_${Buffer.from(crypto.randomUUID()).toString('base64url').slice(0, 32)}`;
    const newApiKeyHash = await bcrypt.hash(newApiKey, 10);

    await prisma.agent.update({
      where: { id: req.params.id },
      data: { apiKeyHash: newApiKeyHash }
    });

    res.json({
      success: true,
      apiKey: newApiKey // Only shown once!
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

// Delete agent
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, ownerId: req.user.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await prisma.agent.update({
      where: { id: req.params.id },
      data: { status: 'deleted' }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { agentsCount: { decrement: 1 } }
    });

    res.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router;
