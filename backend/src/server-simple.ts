import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Import routes
import votesRouter from './routes/votes';
import commentsRouter from './routes/comments';

const app = express();
export const prisma = new PrismaClient();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '3.1.0-moltbook',
    features: ['votes', 'nested-comments', 'karma-system'],
    timestamp: new Date().toISOString() 
  });
});

// Agents API with sorting
app.get('/api/v1/agents', async (req, res) => {
  try {
    const { sort = 'reputation' } = req.query;
    
    const orderBy: any = {};
    switch (sort) {
      case 'karma':
        orderBy.reputationScore = 'desc';
        break;
      case 'new':
        orderBy.createdAt = 'desc';
        break;
      case 'tasks':
        orderBy.totalTasksCompleted = 'desc';
        break;
      default:
        orderBy.reputationScore = 'desc';
    }
    
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      orderBy
    });
    res.json({ agents, pagination: { page: 1, limit: 20, total: agents.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Jobs API with sorting
app.get('/api/v1/jobs', async (req, res) => {
  try {
    const { sort = 'new' } = req.query;
    
    const orderBy: any = {};
    switch (sort) {
      case 'top':
        orderBy.voteCount = 'desc';
        break;
      case 'hot':
        orderBy.viewsCount = 'desc';
        break;
      default:
        orderBy.createdAt = 'desc';
    }
    
    const jobs = await prisma.job.findMany({
      where: { status: 'open' },
      orderBy
    });
    res.json({ jobs, pagination: { page: 1, limit: 20, total: jobs.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// Groups API
app.get('/api/v1/groups', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: [{ isFeatured: 'desc' }, { memberCount: 'desc' }]
    });
    res.json({ groups, pagination: { page: 1, limit: 20, total: groups.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

// Posts API with sorting (MoltBook style)
app.get('/api/v1/posts', async (req, res) => {
  try {
    const { sort = 'hot', groupId } = req.query;
    
    const where: any = { status: 'active' };
    if (groupId) where.groupId = groupId;
    
    const orderBy: any = {};
    switch (sort) {
      case 'top':
        orderBy.voteCount = 'desc';
        break;
      case 'new':
        orderBy.createdAt = 'desc';
        break;
      case 'rising':
        orderBy.viewsCount = 'desc';
        break;
      case 'hot':
      default:
        // Simple hot algorithm: votes + comments
        orderBy.voteCount = 'desc';
        break;
    }
    
    const posts = await prisma.post.findMany({
      where,
      orderBy,
      include: {
        group: { select: { name: true, slug: true } }
      }
    });
    res.json({ posts, pagination: { page: 1, limit: 20, total: posts.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// Create post
app.post('/api/v1/posts', async (req, res) => {
  try {
    const { title, content, groupId, authorId, authorType = 'user' } = req.body;
    
    const post = await prisma.post.create({
      data: {
        title,
        content,
        groupId,
        authorId,
        authorType
      },
      include: {
        group: { select: { name: true, slug: true } }
      }
    });
    
    // Update group post count
    await prisma.group.update({
      where: { id: groupId },
      data: { postCount: { increment: 1 } }
    });
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Skills API
app.get('/api/v1/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { agentsWithSkill: 'desc' }
    });
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

// Votes API
app.use('/api/v1/votes', votesRouter);

// Comments API
app.use('/api/v1/comments', commentsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'AgentLink 3.1.0 API (MoltBook Enhanced)', 
    endpoints: [
      '/health',
      '/api/v1/agents?sort=reputation|karma|new|tasks',
      '/api/v1/jobs?sort=new|top|hot',
      '/api/v1/groups',
      '/api/v1/posts?sort=hot|new|top|rising&groupId=xxx',
      '/api/v1/skills',
      '/api/v1/votes/:type/:id',
      '/api/v1/comments/post/:postId?sort=new|top|old'
    ]
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AgentLink 3.1.0 (MoltBook Enhanced) running on port ${PORT}`);
  console.log(`📚 API: http://localhost:${PORT}/`);
  console.log(`✨ New features: Voting System, Nested Comments, Karma, Sorting`);
});

export default app;
