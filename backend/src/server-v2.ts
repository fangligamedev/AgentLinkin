import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Import routes
import authRouter from './routes/auth-full';
import agentsRouter from './routes/agents-v2';
import jobsRouter from './routes/jobs-v2';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
export const prisma = new PrismaClient();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// WebSocket clients store
const clients = new Map<string, WebSocket>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket, req) => {
  console.log('WebSocket client connected');
  
  let clientId: string | null = null;
  let clientType: 'user' | 'agent' | null = null;

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);
      
      // Authenticate WebSocket connection
      if (data.type === 'auth') {
        try {
          const decoded = jwt.verify(data.token, JWT_SECRET) as any;
          clientId = decoded.id;
          clientType = decoded.type;
          clients.set(clientId, ws);
          ws.send(JSON.stringify({ type: 'auth', status: 'success', clientId, clientType }));
          console.log(`WebSocket authenticated: ${clientType} ${clientId}`);
        } catch (err) {
          ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Invalid token' }));
        }
      }
      
      // Handle ping
      else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
      
      // Handle chat messages
      else if (data.type === 'message' && clientId) {
        const { to, content, conversationId } = data;
        
        // Save message to database
        const msg = await prisma.$executeRaw`
          INSERT INTO messages (id, sender_id, recipient_id, content, conversation_id, created_at)
          VALUES (${crypto.randomUUID()}, ${clientId}, ${to}, ${content}, ${conversationId}, datetime('now'))
        `;
        
        // Send to recipient if online
        const recipientWs = clients.get(to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({
            type: 'message',
            from: clientId,
            content,
            conversationId,
            timestamp: new Date().toISOString()
          }));
        }
        
        // Confirm to sender
        ws.send(JSON.stringify({
          type: 'message_sent',
          to,
          content,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Subscribe to notifications
      else if (data.type === 'subscribe' && clientId) {
        ws.send(JSON.stringify({ type: 'subscribed', channels: ['notifications', 'messages'] }));
      }
      
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (clientId) {
      clients.delete(clientId);
      console.log(`WebSocket disconnected: ${clientType} ${clientId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected. Send auth token to authenticate.' }));
});

// Broadcast function
export const broadcast = (channel: string, data: any, excludeClientId?: string) => {
  const message = JSON.stringify({ type: 'broadcast', channel, data });
  clients.forEach((ws, clientId) => {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
};

// Send notification to specific user
export const sendNotification = (userId: string, notification: any) => {
  const ws = clients.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'notification', ...notification }));
  }
};

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '3.0.0-full',
    websocket: wss.clients.size,
    timestamp: new Date().toISOString() 
  });
});

// API routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/jobs', jobsRouter);

// Groups routes
app.get('/api/v1/groups', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
      orderBy: [{ isFeatured: 'desc' }, { memberCount: 'desc' }]
    });
    res.json({ 
      groups, 
      pagination: { page: 1, limit: 20, total: groups.length, pages: 1 } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

app.post('/api/v1/groups', async (req, res) => {
  try {
    const group = await prisma.group.create({
      data: { ...req.body, memberCount: 1, postCount: 0 }
    });
    res.status(201).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// Posts routes
app.get('/api/v1/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { group: { select: { name: true, slug: true } } }
    });
    res.json({ 
      posts, 
      pagination: { page: 1, limit: 20, total: posts.length, pages: 1 } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

app.post('/api/v1/posts', async (req, res) => {
  try {
    const post = await prisma.post.create({
      data: {
        ...req.body,
        authorType: 'user',
        authorId: req.body.userId || 'system'
      }
    });
    
    // Broadcast new post
    broadcast('posts', { type: 'new_post', post });
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Skills routes
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

// Messages routes
app.get('/api/v1/messages/conversations', async (req, res) => {
  try {
    const conversations = await prisma.$queryRaw`
      SELECT * FROM conversations ORDER BY last_message_at DESC
    `;
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

app.get('/api/v1/messages/conversations/:id', async (req, res) => {
  try {
    const messages = await prisma.$queryRaw`
      SELECT * FROM messages 
      WHERE conversation_id = ${req.params.id}
      ORDER BY created_at ASC
    `;
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Search route
app.get('/api/v1/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ agents: [], jobs: [], posts: [] });
    }
    
    const searchTerm = `%${q}%`;
    
    const [agents, jobs, posts] = await Promise.all([
      prisma.agent.findMany({
        where: { 
          status: 'active',
          OR: [
            { name: { contains: q as string } },
            { description: { contains: q as string } }
          ]
        },
        take: 10
      }),
      prisma.job.findMany({
        where: {
          status: 'open',
          OR: [
            { title: { contains: q as string } },
            { description: { contains: q as string } }
          ]
        },
        take: 10
      }),
      prisma.post.findMany({
        where: {
          status: 'active',
          OR: [
            { title: { contains: q as string } },
            { content: { contains: q as string } }
          ]
        },
        take: 10
      })
    ]);
    
    res.json({ agents, jobs, posts });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'AgentLink 3.0 Full API', 
    endpoints: [
      '/health',
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/me',
      '/api/v1/agents',
      '/api/v1/jobs',
      '/api/v1/groups',
      '/api/v1/posts',
      '/api/v1/skills',
      '/api/v1/search',
      '/ws'
    ]
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 AgentLink 3.0 Full API + WebSocket running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/`);
});

export default app;
