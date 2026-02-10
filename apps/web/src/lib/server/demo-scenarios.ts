import { prisma } from './db';
import { isEnabled } from './flags';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  role: 'candidate' | 'employer';
  steps: DemoStep[];
}

export interface DemoStep {
  order: number;
  title: string;
  description: string;
  route: string;
  action?: string | undefined;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'candidate-job-search',
    name: 'Job Search & Apply',
    description: 'Experience the candidate journey: browse jobs, apply, and track your application.',
    role: 'candidate',
    steps: [
      { order: 1, title: 'Browse Jobs', description: 'Search and filter available positions', route: '/dashboard/jobs' },
      { order: 2, title: 'View Job Details', description: 'Read the full job description and requirements', route: '/dashboard/jobs/demo-job-1' },
      { order: 3, title: 'Apply', description: 'Submit your application with a cover letter', route: '/dashboard/jobs/demo-job-1/apply' },
      { order: 4, title: 'Track Application', description: 'Monitor your application status in real-time', route: '/dashboard/applications' },
    ],
  },
  {
    id: 'candidate-interview',
    name: 'Interview Experience',
    description: 'See how video interviews work from the candidate perspective.',
    role: 'candidate',
    steps: [
      { order: 1, title: 'View Upcoming Meetings', description: 'Check your scheduled interviews', route: '/dashboard/meetings' },
      { order: 2, title: 'Join Interview Room', description: 'Enter the video interview lobby', route: '/dashboard/interviews/demo-interview-1' },
      { order: 3, title: 'Chat with Recruiter', description: 'Use the messaging system', route: '/dashboard/conversations' },
    ],
  },
  {
    id: 'employer-hiring',
    name: 'Post & Manage Jobs',
    description: 'Experience the employer workflow: post jobs, review applications, and manage your pipeline.',
    role: 'employer',
    steps: [
      { order: 1, title: 'Create Job Posting', description: 'Draft a new job listing', route: '/dashboard/jobs/new' },
      { order: 2, title: 'Review Applications', description: 'Browse and filter incoming applications', route: '/dashboard/applications' },
      { order: 3, title: 'Move Through Pipeline', description: 'Advance candidates through hiring stages', route: '/dashboard/pipeline' },
      { order: 4, title: 'View Analytics', description: 'Check your hiring pipeline metrics', route: '/dashboard/analytics' },
    ],
  },
  {
    id: 'employer-evaluation',
    name: 'Interview & Evaluate',
    description: 'Conduct interviews and submit structured evaluations.',
    role: 'employer',
    steps: [
      { order: 1, title: 'Schedule Interview', description: 'Set up a meeting with a candidate', route: '/dashboard/meetings/new' },
      { order: 2, title: 'Conduct Interview', description: 'Join the video interview room', route: '/dashboard/interviews/demo-interview-1' },
      { order: 3, title: 'Submit Scorecard', description: 'Rate the candidate using evaluation rubrics', route: '/dashboard/scorecards/new' },
      { order: 4, title: 'Team Review', description: 'Compare scores with your hiring team', route: '/dashboard/applications/demo-app-1/scorecards' },
    ],
  },
];

export function getDemoScenarios(role?: string): DemoScenario[] {
  if (!isEnabled('demo.enabled')) return [];
  if (role) return DEMO_SCENARIOS.filter((s) => s.role === role);
  return DEMO_SCENARIOS;
}

export function getDemoScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

export async function getDemoSessionCount(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.session.count({
    where: {
      createdAt: { gte: cutoff },
      user: { email: { startsWith: 'demo-' } },
    },
  });
}

export async function cleanupExpiredDemoSessions(): Promise<number> {
  const ttlMinutes = 60;
  const cutoff = new Date(Date.now() - ttlMinutes * 60 * 1000);

  const expired = await prisma.session.findMany({
    where: {
      createdAt: { lt: cutoff },
      user: { email: { startsWith: 'demo-' } },
    },
    select: { id: true, userId: true },
  });

  if (expired.length === 0) return 0;

  const sessionIds = expired.map((s) => s.id);
  const userIds = [...new Set(expired.map((s) => s.userId))];

  await prisma.session.deleteMany({ where: { id: { in: sessionIds } } });

  for (const userId of userIds) {
    const remaining = await prisma.session.count({ where: { userId } });
    if (remaining === 0) {
      await prisma.user.deleteMany({
        where: { id: userId, email: { startsWith: 'demo-' } },
      });
    }
  }

  return expired.length;
}
