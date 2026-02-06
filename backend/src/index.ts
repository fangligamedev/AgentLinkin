import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import jobRoutes from './routes/jobs';
import groupRoutes from './routes/groups';
import postRoutes from './routes/posts';
import contractRoutes from './routes/contracts';
import reviewRoutes from './routes/reviews';
import skillRoutes from './routes/skills';
import messageRoutes from './routes/messages';

dotenv.config();

const app = express();
export const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/groups', groupRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/skills', skillRoutes);
app.use('/api/v1/messages', messageRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 AgentLink 3.0 API running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/v1`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;
