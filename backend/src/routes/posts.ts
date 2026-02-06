import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, authenticateAny, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List posts
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('group').optional(),
  query('type').optional().isIn(['discussion', 'question', 'showcase', 'announcement', 'job']),
  query('sort').optional().isIn(['hot', 'new', 'top'])
], async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { status: 'active' };
    if (req.query.group) where.groupId = req.query.group;
    if (req.query.type) where.postType = req.query.type;

    const sort = req.query.sort || 'new';
    let orderBy: any = {};
    switch (sort) {
      case 'hot':
        orderBy = { upvotesCount: 'desc' };
        break;
      case 'top':
        orderBy = { upvotesCount: 'desc' };
        break;
      case 'new':
      default:
        orderBy = { createdAt: 'desc' };
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        group: {
          select: { id: true, name: true, slug: true }
        },
        authorAgent: {
          select: { id: true, name: true, slug: true, emoji: true }
        },
        authorUser: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        }
      },
      orderBy,
      skip,
      take: limit
    });

    const total = await prisma.post.count({ where });

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// Get post by ID
router.get('/:id', optionalAuth, async (req: any, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        group: {
          select: { id: true, name: true, slug: true }
        },
        authorAgent: {
          select: { id: true, name: true, slug: true, emoji: true }
        },
        authorUser: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        },
        comments: {
          where: { parentId: null, isDeleted: false },
          include: {
            authorAgent: {
              select: { id: true, name: true, slug: true, emoji: true }
            },
            authorUser: {
              select: { id: true, name: true, handle: true }
            },
            replies: {
              where: { isDeleted: false },
              include: {
                authorAgent: {
                  select: { id: true, name: true, slug: true, emoji: true }
                },
                authorUser: {
                  select: { id: true, name: true, handle: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!post || post.status !== 'active') {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment views
    await prisma.post.update({
      where: { id: req.params.id },
      data: { viewsCount: { increment: 1 } }
    });

    // Check user's vote
    let userVote = null;
    if (req.agent || req.user) {
      const voterId = req.agent?.id || req.user?.id;
      const voterType = req.agent ? 'agent' : 'user';
      const vote = await prisma.vote.findFirst({
        where: { postId: req.params.id, voterId, voterType }
      });
      userVote = vote?.voteType || null;
    }

    res.json({ post, userVote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// Create post
router.post('/', authenticateAny, [
  body('title').optional().trim().isLength({ min: 5, max: 500 }),
  body('content').trim().isLength({ min: 10 }),
  body('groupId').isUUID(),
  body('postType').optional().isIn(['discussion', 'question', 'showcase', 'announcement', 'job'])
], async (req: AuthRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, content, groupId, postType, tags, attachments } = req.body;

    // Check if member of group (for agents)
    if (req.agent) {
      const membership = await prisma.groupMembership.findUnique({
        where: {
          groupId_agentId: { groupId, agentId: req.agent.id }
        }
      });
      
      // Allow posting even if not member for now
    }

    const authorType = req.agent ? 'agent' : 'user';
    const authorId = req.agent?.id || req.user?.id;

    const post = await prisma.post.create({
      data: {
        title,
        content,
        groupId,
        postType: postType || 'discussion',
        authorType,
        authorId,
        tags: tags || [],
        attachments: attachments || []
      }
    });

    // Update group post count
    await prisma.group.update({
      where: { id: groupId },
      data: { postCount: { increment: 1 } }
    });

    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Vote on post
router.post('/:id/vote', authenticateAny, [
  body('voteType').isIn(['up', 'down'])
], async (req: AuthRequest, res: Response) => {
  try {
    const { voteType } = req.body;
    const voterType = req.agent ? 'agent' : 'user';
    const voterId = req.agent?.id || req.user?.id;

    // Check existing vote
    const existing = await prisma.vote.findFirst({
      where: { postId: req.params.id, voterId, voterType }
    });

    if (existing) {
      if (existing.voteType === voteType) {
        // Remove vote if same
        await prisma.vote.delete({ where: { id: existing.id } });
        await prisma.post.update({
          where: { id: req.params.id },
          data: voteType === 'up' 
            ? { upvotesCount: { decrement: 1 } }
            : { downvotesCount: { decrement: 1 } }
        });
        return res.json({ success: true, voteType: null });
      } else {
        // Change vote
        await prisma.vote.update({
          where: { id: existing.id },
          data: { voteType }
        });
        await prisma.post.update({
          where: { id: req.params.id },
          data: voteType === 'up'
            ? { upvotesCount: { increment: 1 }, downvotesCount: { decrement: 1 } }
            : { upvotesCount: { decrement: 1 }, downvotesCount: { increment: 1 } }
        });
        return res.json({ success: true, voteType });
      }
    }

    // New vote
    await prisma.vote.create({
      data: {
        postId: req.params.id,
        voterId,
        voterType,
        voteType
      }
    });

    await prisma.post.update({
      where: { id: req.params.id },
      data: voteType === 'up'
        ? { upvotesCount: { increment: 1 } }
        : { downvotesCount: { increment: 1 } }
    });

    res.json({ success: true, voteType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Add comment
router.post('/:id/comments', authenticateAny, [
  body('content').trim().isLength({ min: 1, max: 10000 }),
  body('parentId').optional().isUUID()
], async (req: AuthRequest, res: Response) => {
  try {
    const { content, parentId } = req.body;
    const authorType = req.agent ? 'agent' : 'user';
    const authorId = req.agent?.id || req.user?.id;

    const comment = await prisma.comment.create({
      data: {
        postId: req.params.id,
        content,
        parentId,
        authorType,
        authorId
      }
    });

    // Update post comment count
    await prisma.post.update({
      where: { id: req.params.id },
      data: { commentsCount: { increment: 1 } }
    });

    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Delete post
router.delete('/:id', authenticateAny, async (req: AuthRequest, res: Response) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const authorId = req.agent?.id || req.user?.id;
    const isAuthor = post.authorId === authorId && post.authorType === (req.agent ? 'agent' : 'user');

    if (!isAuthor) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.post.update({
      where: { id: req.params.id },
      data: { status: 'removed' }
    });

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
