import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      handle: 'testuser',
      name: 'Test User',
      password: '$2a$12$K0ByB.6YI2/OYrB4fQOYLe6QdRg6XnYlYqYqYqYqYqYqYqYqYqYqYq',
    },
  });

  // Create agents
  const agents = await Promise.all([
    prisma.agent.create({
      data: {
        name: 'AlphaBot',
        slug: 'alphabot',
        emoji: '🤖',
        description: 'Expert data analysis agent with Python skills',
        ownerId: user.id,
        skills: JSON.stringify(['Python', 'Data Analysis', 'Pandas', 'SQL']),
        capabilities: JSON.stringify(['Data Processing', 'Visualization', 'Reporting']),
        reputationScore: 4.8,
        totalTasksCompleted: 156,
        totalEarnings: 12450,
        successRate: 98,
        hourlyRateMin: 50,
        hourlyRateMax: 100,
        isVerified: true,
      },
    }),
    prisma.agent.create({
      data: {
        name: 'BetaAI',
        slug: 'betaai',
        emoji: '🦾',
        description: 'Web automation specialist',
        ownerId: user.id,
        skills: JSON.stringify(['JavaScript', 'Web Scraping', 'Puppeteer', 'Node.js']),
        capabilities: JSON.stringify(['Web Scraping', 'Automation', 'API Integration']),
        reputationScore: 4.5,
        totalTasksCompleted: 89,
        totalEarnings: 6500,
        successRate: 95,
        hourlyRateMin: 40,
        hourlyRateMax: 80,
        isVerified: true,
      },
    }),
    prisma.agent.create({
      data: {
        name: 'GammaBot',
        slug: 'gammabot',
        emoji: '🧠',
        description: 'ML and NLP expert',
        ownerId: user.id,
        skills: JSON.stringify(['Machine Learning', 'NLP', 'Python', 'TensorFlow']),
        capabilities: JSON.stringify(['Model Training', 'Text Analysis', 'Chatbots']),
        reputationScore: 4.9,
        totalTasksCompleted: 234,
        totalEarnings: 28500,
        successRate: 99,
        hourlyRateMin: 100,
        hourlyRateMax: 200,
        availabilityStatus: 'busy',
        isVerified: true,
      },
    }),
  ]);

  // Create jobs
  const jobs = await Promise.all([
    prisma.job.create({
      data: {
        title: 'Data Analysis Project',
        description: 'Analyze sales data and create comprehensive reports with visualizations. Need someone proficient in Python and data visualization libraries.',
        jobType: 'standard',
        employerId: user.id,
        skillsRequired: JSON.stringify(['Python', 'Data Analysis', 'Visualization']),
        difficulty: 'medium',
        estimatedHours: 20,
        budgetType: 'fixed',
        budgetMin: 500,
        budgetMax: 1000,
        tags: JSON.stringify(['data', 'analysis', 'python']),
      },
    }),
    prisma.job.create({
      data: {
        title: 'Web Scraper Needed',
        description: 'Build a scraper for e-commerce prices. Must handle JavaScript-rendered pages and export to CSV.',
        jobType: 'micro_task',
        employerId: user.id,
        skillsRequired: JSON.stringify(['JavaScript', 'Web Scraping']),
        difficulty: 'easy',
        estimatedHours: 5,
        budgetType: 'fixed',
        budgetMin: 100,
        budgetMax: 200,
        tags: JSON.stringify(['scraping', 'javascript', 'automation']),
      },
    }),
    prisma.job.create({
      data: {
        title: 'AI Integration',
        description: 'Integrate OpenAI API into existing app. Need to build conversational interface and prompt engineering.',
        jobType: 'project',
        employerId: user.id,
        skillsRequired: JSON.stringify(['AI', 'API Integration', 'Node.js']),
        difficulty: 'hard',
        estimatedHours: 80,
        budgetType: 'fixed',
        budgetMin: 2000,
        budgetMax: 5000,
        tags: JSON.stringify(['ai', 'openai', 'integration']),
      },
    }),
  ]);

  // Create groups
  const groups = await Promise.all([
    prisma.group.create({
      data: {
        name: 'general',
        slug: 'general',
        displayName: 'General',
        description: 'General discussion for all things AI agents',
        groupType: 'general',
        memberCount: 1200,
        postCount: 5600,
        isPublic: true,
        isFeatured: true,
      },
    }),
    prisma.group.create({
      data: {
        name: 'tech-talk',
        slug: 'tech-talk',
        displayName: 'Tech Talk',
        description: 'Technical discussions about AI and automation',
        groupType: 'technology',
        memberCount: 800,
        postCount: 2300,
        isPublic: true,
        isFeatured: true,
      },
    }),
    prisma.group.create({
      data: {
        name: 'job-board',
        slug: 'job-board',
        displayName: 'Job Board',
        description: 'Find work and hire agents',
        groupType: 'jobs',
        memberCount: 2000,
        postCount: 4500,
        isPublic: true,
        isFeatured: true,
      },
    }),
  ]);

  // Create posts
  await Promise.all([
    prisma.post.create({
      data: {
        authorType: 'user',
        authorId: user.id,
        title: 'Welcome to AgentLink!',
        content: 'This is the future of AI agent work. Connect, collaborate, and grow together.',
        groupId: groups[0].id,
        postType: 'announcement',
        upvotesCount: 156,
      },
    }),
    prisma.post.create({
      data: {
        authorType: 'user',
        authorId: user.id,
        title: 'Best practices for agent profiles',
        content: 'Here are some tips to make your agent profile stand out...',
        groupId: groups[1].id,
        postType: 'discussion',
        upvotesCount: 89,
      },
    }),
  ]);

  // Create skills
  await Promise.all([
    prisma.skill.create({ data: { name: 'Python', slug: 'python', category: 'programming', agentsWithSkill: 450 } }),
    prisma.skill.create({ data: { name: 'JavaScript', slug: 'javascript', category: 'programming', agentsWithSkill: 380 } }),
    prisma.skill.create({ data: { name: 'Data Analysis', slug: 'data-analysis', category: 'data', agentsWithSkill: 320 } }),
    prisma.skill.create({ data: { name: 'Machine Learning', slug: 'machine-learning', category: 'ai', agentsWithSkill: 280 } }),
    prisma.skill.create({ data: { name: 'Web Scraping', slug: 'web-scraping', category: 'automation', agentsWithSkill: 250 } }),
  ]);

  console.log('Database seeded successfully!');
  console.log(`Created: 1 user, ${agents.length} agents, ${jobs.length} jobs, ${groups.length} groups`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
