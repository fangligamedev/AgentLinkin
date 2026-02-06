import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, generateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// List agents with search/filter
router.get('/', async (req, res) => {
  try {
    const { search, skill, availability, sort = 'reputation', page = '1', limit = '20' } = req.query;
    
    const where: any = { status: 'active' };
    if (availability) where.availabilityStatus = availability;
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const orderBy: any = {};
    switch (sort) {
      case 'reputation': orderBy.reputationScore = 'desc'; break;
      case 'tasks': orderBy.totalTasksCompleted = 'desc'; break;
      case 'earnings': orderBy.totalEarnings = 'desc'; break;
      default: orderBy.createdAt = 'desc';
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit as string),
        include: { owner: { select: { name: true, handle: true } } }
      }),
      prisma.agent.count({ where })
    ]);

    // Parse JSON fields
    const parsedAgents = agents.map(agent => ({
      ...agent,
      skills: JSON.parse(agent.skills),
      capabilities: JSON.parse(agent.capabilities)
    }));

    res.json({
      agents: parsedAgents,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get single agent
router.get('/:slug', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: req.params.slug },
      include: { owner: { select: { name: true, handle: true, avatarUrl: true } } }
    });

    if (!agent || agent.status !== 'active') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({
      agent: {
        ...agent,
        skills: JSON.parse(agent.skills),
        capabilities: JSON.parse(agent.capabilities)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Create agent
router.post('/', authenticateUser, [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('slug').trim().matches(/^[a-z0-9-]+$/).isLength({ min: 3, max: 50 }),
  body('description').optional().trim(),
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, slug, description, emoji, skills, capabilities } = req.body;

    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const apiKey = `al_${Buffer.from(crypto.randomUUID()).toString('base64url').slice(0, 32)}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const agent = await prisma.agent.create({
      data: {
        name,
        slug,
        description,
        emoji: emoji || '🤖',
        ownerId: req.user!.id,
        apiKeyHash,
        skills: JSON.stringify(skills || []),
        capabilities: JSON.stringify(capabilities || [])
      }
    });

    res.status(201).json({
      success: true,
      agent: { ...agent, skills: JSON.parse(agent.skills), capabilities: JSON.parse(agent.capabilities) },
      apiKey
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
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updateData: any = {};
    const allowedFields = ['name', 'description', 'emoji', 'availabilityStatus', 'hourlyRateMin', 'hourlyRateMax'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    if (req.body.skills) updateData.skills = JSON.stringify(req.body.skills);
    if (req.body.capabilities) updateData.capabilities = JSON.stringify(req.body.capabilities);

    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      success: true,
      agent: { ...updated, skills: JSON.parse(updated.skills), capabilities: JSON.parse(updated.capabilities) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: { id: req.params.id, ownerId: req.user!.id }
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    await prisma.agent.update({
      where: { id: req.params.id },
      data: { status: 'deleted' }
    });

    res.json({ success: true, message: 'Agent deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

export default router;
