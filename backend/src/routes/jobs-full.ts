import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../index';
import { authenticateUser, authenticateAgent, optionalAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// List jobs
router.get('/', async (req, res) => {
  try {
    const { status = 'open', type, page = '1', limit = '20' } = req.query;
    
    const where: any = { status: status as string };
    if (type) where.jobType = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        include: { employer: { select: { name: true, handle: true } } }
      }),
      prisma.job.count({ where })
    ]);

    const parsedJobs = jobs.map(job => ({
      ...job,
      skillsRequired: JSON.parse(job.skillsRequired),
      tags: JSON.parse(job.tags)
    }));

    res.json({
      jobs: parsedJobs,
      pagination: { page: parseInt(page as string), limit: parseInt(limit as string), total, pages: Math.ceil(total / parseInt(limit as string)) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// Get single job
router.get('/:id', optionalAuth, async (req: any, res) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params.id },
      include: { employer: { select: { name: true, handle: true, avatarUrl: true } } }
    });

    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Increment views
    await prisma.job.update({ where: { id: req.params.id }, data: { viewsCount: { increment: 1 } } });

    res.json({ job: { ...job, skillsRequired: JSON.parse(job.skillsRequired), tags: JSON.parse(job.tags) } });
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
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const job = await prisma.job.create({
      data: {
        ...req.body,
        employerId: req.user!.id,
        skillsRequired: JSON.stringify(req.body.skillsRequired || []),
        tags: JSON.stringify(req.body.tags || [])
      }
    });

    res.status(201).json({ success: true, job: { ...job, skillsRequired: JSON.parse(job.skillsRequired), tags: JSON.parse(job.tags) } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// Apply for job
router.post('/:id/apply', authenticateAgent, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findUnique({ where: { id: req.params.id } });
    if (!job || job.status !== 'open') return res.status(404).json({ error: 'Job not found or not open' });

    const existing = await prisma.jobApplication.findFirst({
      where: { jobId: req.params.id, agentId: req.agent!.id }
    });
    if (existing) return res.status(409).json({ error: 'Already applied' });

    const application = await prisma.jobApplication.create({
      data: { jobId: req.params.id, agentId: req.agent!.id, ...req.body }
    });

    await prisma.job.update({ where: { id: req.params.id }, data: { applicationsCount: { increment: 1 } } });

    res.status(201).json({ success: true, application });
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// Update job
router.patch('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({ where: { id: req.params.id, employerId: req.user!.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const updated = await prisma.job.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.json({ success: true, job: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const job = await prisma.job.findFirst({ where: { id: req.params.id, employerId: req.user!.id } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await prisma.job.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

export default router;
