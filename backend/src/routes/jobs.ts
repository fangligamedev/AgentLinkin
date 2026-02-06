import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List jobs
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['open', 'in_progress', 'completed']),
  query('jobType').optional().isIn(['micro_task', 'standard', 'project', 'ongoing']),
  query('skills').optional(),
  query('budgetMin').optional().isInt(),
  query('budgetMax').optional().isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = { status: req.query.status || 'open' };
    
    if (req.query.jobType) {
      where.jobType = req.query.jobType;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        employer: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.job.count({ where });

    res.json({
      jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// Get job by ID
router.get('/:id', optionalAuth, async (req: any, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: {
        employer: {
          select: { id: true, name: true, handle: true, avatarUrl: true }
        },
        applications: {
          where: req.agent ? { agentId: req.agent.id } : undefined,
          select: { id: true, status: true, createdAt: true }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Increment views
    await prisma.job.update({
      where: { id: req.params.id },
      data: { viewsCount: { increment: 1 } }
    });

    res.json({ job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job' });
  }
});

// Create job
router.post('/', authenticateUser, [
  body('title').trim().isLength({ min: 5, max: 500 }),
  body('description').trim().isLength({ min: 20 }),
  body('jobType').isIn(['micro_task', 'standard', 'project', 'ongoing']),
  body('budgetType').isIn(['fixed', 'hourly', 'range'])
], async (req: AuthRequest, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title, description, jobType, budgetType, budgetMin, budgetMax,
      skillsRequired, difficulty, estimatedHours, deadline, tags
    } = req.body;

    const job = await prisma.job.create({
      data: {
        title,
        description,
        jobType,
        budgetType,
        budgetMin,
        budgetMax,
        employerId: req.user.id,
        skillsRequired: skillsRequired || [],
        difficulty: difficulty || 'medium',
        estimatedHours,
        deadline: deadline ? new Date(deadline) : undefined,
        tags: tags || [],
        status: 'open',
        publishedAt: new Date()
      }
    });

    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Apply for job
router.post('/:id/apply', authenticateAgent, [
  body('coverLetter').optional().trim()
], async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id }
    });

    if (!job || job.status !== 'open') {
      return res.status(404).json({ error: 'Job not found or not open' });
    }

    // Check if already applied
    const existing = await prisma.jobApplication.findUnique({
      where: {
        jobId_agentId: {
          jobId: req.params.id,
          agentId: req.agent!.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Already applied for this job' });
    }

    const application = await prisma.jobApplication.create({
      data: {
        jobId: req.params.id,
        agentId: req.agent!.id,
        coverLetter: req.body.coverLetter,
        proposedBudget: req.body.proposedBudget,
        estimatedCompletionDays: req.body.estimatedCompletionDays
      }
    });

    // Update job application count
    await prisma.job.update({
      where: { id: req.params.id },
      data: { applicationsCount: { increment: 1 } }
    });

    res.status(201).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply for job' });
  }
});

// Get job applications (employer only)
router.get('/:id/applications', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, employerId: req.user.id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const applications = await prisma.jobApplication.findMany({
      where: { jobId: req.params.id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            slug: true,
            emoji: true,
            reputationScore: true,
            totalTasksCompleted: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ applications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Update application status
router.patch('/:jobId/applications/:appId', authenticateUser, [
  body('status').isIn(['accepted', 'rejected'])
], async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.jobId, employerId: req.user.id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const application = await prisma.jobApplication.update({
      where: { id: req.params.appId },
      data: {
        status: req.body.status,
        respondedAt: new Date(),
        employerNotes: req.body.notes
      },
      include: {
        agent: { select: { id: true, name: true } }
      }
    });

    // If accepted, create contract
    if (req.body.status === 'accepted') {
      await prisma.contract.create({
        data: {
          jobId: req.params.jobId,
          agentId: application.agentId,
          employerId: req.user.id,
          agreedBudget: application.proposedBudget || job.budgetMax || job.budgetMin || 0,
          status: 'active'
        }
      });

      await prisma.job.update({
        where: { id: req.params.jobId },
        data: { status: 'in_progress' }
      });
    }

    res.json({ success: true, application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// Update job
router.patch('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, employerId: req.user.id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const updateData: any = {};
    ['title', 'description', 'status', 'deadline'].forEach(field => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ success: true, job: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, employerId: req.user.id }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.job.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' }
    });

    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export default router;
