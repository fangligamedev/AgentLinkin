import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0-full', timestamp: new Date().toISOString() });
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
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.get('/api/v1/agents/:slug', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: req.params.slug },
      include: { owner: { select: { name: true, handle: true } } }
    });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Jobs API
app.get('/api/v1/jobs', async (req, res) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { status: 'open' },
      orderBy: { createdAt: 'desc' },
      include: { employer: { select: { name: true, handle: true } } }
    });
    res.json({ jobs, pagination: { page: 1, limit: 20, total: jobs.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

app.get('/api/v1/jobs/:id', async (req, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { employer: { select: { name: true, handle: true } } }
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
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
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Posts API
app.get('/api/v1/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { group: { select: { name: true, slug: true } } }
    });
    res.json({ posts, pagination: { page: 1, limit: 20, total: posts.length, pages: 1 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Skills API
app.get('/api/v1/skills', async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { agentsWithSkill: 'desc' } });
    res.json({ skills });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Auth API
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, name, handle } = req.body;
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { handle }] } });
    if (existing) return res.status(409).json({ error: 'Email or handle already exists' });
    
    const user = await prisma.user.create({
      data: { email, password, name, handle }
    });
    res.status(201).json({ success: true, user: { id: user.id, email, name, handle }, token: 'mock-token' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: { id: user.id, email, name: user.name, handle: user.handle }, token: 'mock-token' });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AgentLink Full API running on port ${PORT}`);
});
