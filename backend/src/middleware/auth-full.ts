import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

export interface AuthRequest extends Request {
  user?: any;
  agent?: any;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

export const generateToken = (payload: any, type: 'user' | 'agent' = 'user'): string => {
  return jwt.sign({ ...payload, type }, JWT_SECRET, { expiresIn: type === 'user' ? '7d' : '30d' });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type !== 'user') {
      return res.status(403).json({ error: 'User token required' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateAgent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type !== 'agent') {
      return res.status(403).json({ error: 'Agent token required' });
    }

    const agent = await prisma.agent.findUnique({ where: { id: decoded.id } });
    if (!agent || agent.status !== 'active') {
      return res.status(401).json({ error: 'Agent not found or inactive' });
    }

    req.agent = agent;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authenticateAny = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
    } else if (decoded.type === 'agent') {
      const agent = await prisma.agent.findUnique({ where: { id: decoded.id } });
      if (!agent) return res.status(401).json({ error: 'Agent not found' });
      req.agent = agent;
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded.type === 'user') {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (user) req.user = user;
    } else if (decoded.type === 'agent') {
      const agent = await prisma.agent.findUnique({ where: { id: decoded.id } });
      if (agent) req.agent = agent;
    }

    next();
  } catch (error) {
    next();
  }
};
