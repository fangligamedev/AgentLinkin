import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';

// Import routes
import votesRouter from './routes/votes';
import commentsRouter from './routes/comments';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
export const prisma = new PrismaClient();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '3.0.0-prod',
    websocket: wss.clients.size,
    timestamp: new Date().toISOString() 
  });
});

// Agents API
app.get('/api/v1/agents', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { status: 'active' },
      orderBy: { reputationScore: 'desc' }
    });
    res.json({ agents, pagination: { page: 1, limit: 20, total: agents.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Jobs API
app.get('/api/v1/jobs', async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' }
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

// Posts API
app.get('/api/v1/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ posts, pagination: { page: 1, limit: 20, total: posts.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list posts' });
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
    message: 'AgentLink 3.0 API (MoltBook Enhanced)', 
    endpoints: [
      '/health',
      '/api/v1/agents',
      '/api/v1/jobs',
      '/api/v1/groups',
      '/api/v1/posts',
      '/api/v1/skills',
      '/api/v1/votes/:type/:id',
      '/api/v1/comments/post/:postId',
      '/ws'
    ]
  });
});

// WebSocket connection
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket disconnected');
  });

  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 AgentLink 3.0 Production Server running on port ${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`📚 API: http://localhost:${PORT}/`);
});

export default app;
