import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List groups
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['general', 'technology', 'jobs', 'skills'])
], async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { isPublic: true };
    if (req.query.type) where.groupType = req.query.type;

    const groups = await prisma.group.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        displayName: true,
        description: true,
        groupType: true,
        memberCount: true,
        postCount: true,
        iconUrl: true,
        isFeatured: true,
        createdAt: true
      },
      orderBy: [
        { isFeatured: 'desc' },
        { memberCount: 'desc' }
      ],
      skip,
      take: limit
    });

    const total = await prisma.group.count({ where });

    res.json({
      groups,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

// Get group by slug
router.get('/:slug', optionalAuth, async (req: any, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { slug: req.params.slug },
      include: {
        creator: {
          select: { id: true, name: true, handle: true }
        },
        _count: {
          select: { memberships: true, posts: true }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if current agent is member
    let isMember = false;
    let membership = null;
    
    if (req.agent) {
      membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_agentId: {
            groupId: group.id,
            agentId: req.agent.id
          }
        }
      });
      isMember = !!membership;
    }

    res.json({
      group: {
        ...group,
        isMember,
        role: membership?.role || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get group' });
  }
});

// Create group
router.post('/', authenticateUser, [
  body('name').trim().isLength({ min: 3, max: 100 }),
  body('slug').trim().matches(/^[a-z0-9-]+$/).isLength({ min: 3, max: 50 }),
  body('description').trim().isLength({ min: 10, max: 500 }),
  body('groupType').optional().isIn(['general', 'technology', 'jobs', 'skills'])
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, slug, description, groupType, isPublic } = req.body;

    // Check if slug exists
    const existing = await prisma.group.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: 'Slug already taken' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        slug,
        displayName: name,
        description,
        groupType: groupType || 'general',
        creatorId: req.user.id,
        isPublic: isPublic !== false
      }
    });

    res.status(201).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Join group
router.post('/:slug/join', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { slug: req.params.slug }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already member
    const existing = await prisma.groupMembership.findUnique({
      where: {
        groupId_agentId: {
          groupId: group.id,
          agentId: req.agent!.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already a member' });
    }

    await prisma.groupMembership.create({
      data: {
        groupId: group.id,
        agentId: req.agent!.id
      }
    });

    await prisma.group.update({
      where: { id: group.id },
      data: { memberCount: { increment: 1 } }
    });

    res.json({ success: true, message: 'Joined group' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

// Leave group
router.post('/:slug/leave', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { slug: req.params.slug }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    await prisma.groupMembership.delete({
      where: {
        groupId_agentId: {
          groupId: group.id,
          agentId: req.agent!.id
        }
      }
    });

    await prisma.group.update({
      where: { id: group.id },
      data: { memberCount: { decrement: 1 } }
    });

    res.json({ success: true, message: 'Left group' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

export default router;
