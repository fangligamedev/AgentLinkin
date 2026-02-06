import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

import { authenticateUser, authenticateAgent, AuthRequest } from './middleware/auth-full';
import agentsRouter from './routes/agents-full';
import jobsRouter from './routes/jobs-full';

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
        const decoded = jwt.verify(data.token, JWT_SECRET) as any;
        clientId = decoded.id;
        clientType = decoded.type;
        clients.set(clientId, ws);
        ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
        console.log(`WebSocket authenticated: ${clientType} ${clientId}`);
      }
      
      // Handle ping
      else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
      
      // Handle chat messages
      else if (data.type === 'chat' && clientId) {
        const { to, content } = data;
        const recipientWs = clients.get(to);
        
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({
            type: 'chat',
            from: clientId,
            content,
            timestamp: new Date().toISOString()
          }));
        }
        
        // Save message to database
        await prisma.$executeRaw`
          INSERT INTO messages (id, sender_id, recipient_id, content, created_at)
          VALUES (${crypto.randomUUID()}, ${clientId}, ${to}, ${content}, datetime('now'))
        `;
      }
      
      // Subscribe to notifications
      else if (data.type === 'subscribe' && clientId) {
        ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
      }
      
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
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
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected. Send auth token.' }));
});

// Broadcast function
export const broadcast = (channel: string, data: any) => {
  const message = JSON.stringify({ type: 'broadcast', channel, data });
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
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

// Auth routes
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, handle } = req.body;
    
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { handle }] }
    });
    
    if (existing) {
      return res.status(409).json({ error: 'Email or handle already exists' });
    }

    const hashedPassword = await require('bcryptjs').hash(password, 12);
    
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, handle }
    });

    const token = require('./middleware/auth-full').generateToken({ id: user.id, email }, 'user');
    
    res.status(201).json({
      success: true,
      user: { id: user.id, email, name, handle },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValid = await require('bcryptjs').compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = require('./middleware/auth-full').generateToken({ id: user.id, email }, 'user');
    
    res.json({
      success: true,
      user: { id: user.id, email, name: user.name, handle: user.handle },
      token
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/v1/auth/me', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { agents: { select: { id: true, name: true, slug: true, emoji: true, reputationScore: true, totalTasksCompleted: true, availabilityStatus: true } } }
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Main routes
app.use('/api/v1/agents', agentsRouter);
app.use('/api/v1/jobs', jobsRouter);

// Groups routes
app.get('/api/v1/groups', async (req, res) => {
  try {
    const groups = await prisma.group.findMany({ orderBy: [{ isFeatured: 'desc' }, { memberCount: 'desc' }] });
    res.json({ groups, pagination: { page: 1, limit: 20, total: groups.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list groups' });
  }
});

app.post('/api/v1/groups', authenticateUser, async (req: AuthRequest, res) => {
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
    res.json({ posts, pagination: { page: 1, limit: 20, total: posts.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

app.post('/api/v1/posts', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const post = await prisma.post.create({
      data: {
        ...req.body,
        authorType: 'user',
        authorId: req.user!.id
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
    const skills = await prisma.skill.findMany({ orderBy: { agentsWithSkill: 'desc' } });
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'AgentLink 3.0 Full API', endpoints: ['/health', '/api/v1/agents', '/api/v1/jobs', '/api/v1/groups', '/api/v1/posts', '/api/v1/skills', '/ws'] });
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
});

export default app;
