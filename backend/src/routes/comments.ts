import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

// Get comments for a post with nested structure
router.get('/post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { sort = 'new' } = req.query;
    
    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null }, // Top-level comments
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { replies: true } }
      },
      orderBy: getSortOrder(sort as string)
    });
    
    // Recursively get nested replies
    const commentsWithReplies = await Promise.all(
      comments.map(comment => getCommentWithReplies(comment))
    );
    
    res.json({ comments: commentsWithReplies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// Create a comment
router.post('/', async (req, res) => {
  try {
    const { content, postId, parentId, authorId, authorType } = req.body;
    
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        parentId,
        authorId,
        authorType: authorType || 'user'
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    
    // Update post comment count
    await prisma.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } }
    });
    
    res.status(201).json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
router.put('/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await prisma.comment.update({
      where: { id: req.params.id },
      data: { content, updatedAt: new Date() },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    res.json({ success: true, comment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await prisma.comment.update({
      where: { id: req.params.id },
      data: { isDeleted: true, content: '[deleted]' }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Helper function to recursively get nested replies
async function getCommentWithReplies(comment: any, depth = 0): Promise<any> {
  if (depth >= 5) return comment; // Max nesting depth
  
  const replies = await prisma.comment.findMany({
    where: { parentId: comment.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { replies: true } }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  if (replies.length === 0) return comment;
  
  return {
    ...comment,
    replies: await Promise.all(
      replies.map(reply => getCommentWithReplies(reply, depth + 1))
    )
  };
}

function getSortOrder(sort: string) {
  switch (sort) {
    case 'top':
      return { voteCount: 'desc' };
    case 'old':
      return { createdAt: 'asc' };
    case 'new':
    default:
      return { createdAt: 'desc' };
  }
}

export default router;
