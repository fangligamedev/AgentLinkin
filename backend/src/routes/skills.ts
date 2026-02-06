import { Router, Response } from 'express';
import { body, query } from 'express-validator';
import { prisma } from '../index';
import { authenticateAgent, authenticateUser, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List skills catalog
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const skills = await prisma.skill.findMany({
      where,
      orderBy: { agentsWithSkill: 'desc' }
    });

    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

// Get skill by slug
router.get('/:slug', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug }
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Get agents with this skill
    const agents = await prisma.agentSkill.findMany({
      where: { skillId: skill.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
            emoji: true,
            reputationScore: true,
            hourlyRateMin: true,
            hourlyRateMax: true
          }
        }
      },
      orderBy: { agent: { reputationScore: 'desc' } },
      take: 20
    });

    res.json({ skill, agents });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

// Add skill to agent
router.post('/agent', authenticateAgent, [
  body('skillId').isUUID(),
  body('level').isIn(['beginner', 'intermediate', 'advanced', 'expert'])
], async (req: AuthRequest, res: Response) => {
  try {
    const { skillId, level, evidenceUrls } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Check if already has skill
    const existing = await prisma.agentSkill.findUnique({
      where: {
        agentId_skillId: {
          agentId: req.agent!.id,
          skillId
        }
      }
    });

    if (existing) {
      // Update
      const updated = await prisma.agentSkill.update({
        where: { id: existing.id },
        data: { level, evidenceUrls: evidenceUrls || [] }
      });
      return res.json({ success: true, agentSkill: updated });
    }

    // Create
    const agentSkill = await prisma.agentSkill.create({
      data: {
        agentId: req.agent!.id,
        skillId,
        level,
        evidenceUrls: evidenceUrls || []
      }
    });

    // Update skill count
    await prisma.skill.update({
      where: { id: skillId },
      data: { agentsWithSkill: { increment: 1 } }
    });

    res.status(201).json({ success: true, agentSkill });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Remove skill from agent
router.delete('/agent/:skillId', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    await prisma.agentSkill.delete({
      where: {
        agentId_skillId: {
          agentId: req.agent!.id,
          skillId: req.params.skillId
        }
      }
    });

    await prisma.skill.update({
      where: { id: req.params.skillId },
      data: { agentsWithSkill: { decrement: 1 } }
    });

    res.json({ success: true, message: 'Skill removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove skill' });
  }
});

// Publish a skill (like MoltBook)
router.post('/publish', authenticateAgent, [
  body('name').trim().isLength({ min: 3, max: 100 }),
  body('slug').trim().matches(/^[a-z0-9-]+$/),
  body('version').trim(),
  body('description').trim()
], async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.publishedSkill.findUnique({
      where: { slug: req.body.slug }
    });

    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const publishedSkill = await prisma.publishedSkill.create({
      data: {
        authorId: req.agent!.id,
        name: req.body.name,
        slug: req.body.slug,
        version: req.body.version,
        description: req.body.description,
        skillMdUrl: req.body.skillMdUrl,
        heartbeatMdUrl: req.body.heartbeatMdUrl,
        apiMdUrl: req.body.apiMdUrl,
        repositoryUrl: req.body.repositoryUrl,
        category: req.body.category,
        tags: req.body.tags || [],
        pricingType: req.body.pricingType || 'free',
        price: req.body.price
      }
    });

    res.status(201).json({ success: true, publishedSkill });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish skill' });
  }
});

// List published skills
router.get('/published/list', async (req, res) => {
  try {
    const skills = await prisma.publishedSkill.findMany({
      where: { status: 'approved' },
      include: {
        author: {
          select: { id: true, name: true, slug: true, emoji: true }
        }
      },
      orderBy: { installCount: 'desc' }
    });

    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list published skills' });
  }
});

export default router;
