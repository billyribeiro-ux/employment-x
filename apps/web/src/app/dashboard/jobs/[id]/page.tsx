'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Clock,
  DollarSign,
  Building2,
  Users,
  Calendar,
  Pencil,
  Share2,
  BarChart3,
} from 'lucide-react';

interface JobDetail {
  id: string;
  title: string;
  department: string;
  description: string;
  requirements: string;
  benefits: string;
  location: string;
  remote: boolean;
  employmentType: string;
  experienceLevel: string;
  status: string;
  applicantCount: number;
  salaryMin: number;
  salaryMax: number;
  skills: string[];
  publishedAt: string | null;
  createdAt: string;
}

const MOCK_JOB: JobDetail = {
  id: '1',
  title: 'Senior Frontend Engineer',
  department: 'Engineering',
  description: 'We are looking for a Senior Frontend Engineer to join our growing team. You will be responsible for building and maintaining our web application, working closely with designers and backend engineers to deliver exceptional user experiences.\n\nYou will have the opportunity to shape our frontend architecture, mentor junior engineers, and contribute to our design system.',
  requirements: '- 5+ years of experience with React and TypeScript\n- Strong understanding of web performance optimization\n- Experience with Next.js and server-side rendering\n- Familiarity with design systems and component libraries\n- Excellent communication and collaboration skills',
  benefits: '- Competitive salary and equity\n- Health, dental, and vision insurance\n- Unlimited PTO\n- Remote-first culture\n- $5,000 annual learning budget',
  location: 'San Francisco, CA',
  remote: true,
  employmentType: 'full_time',
  experienceLevel: 'senior',
  status: 'published',
  applicantCount: 24,
  salaryMin: 180000,
  salaryMax: 240000,
  skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
  publishedAt: '2026-01-15T00:00:00Z',
  createdAt: '2026-01-10T00:00:00Z',
};

const PIPELINE = [
  { stage: 'Applied', count: 24, color: 'bg-blue-500' },
  { stage: 'Screening', count: 12, color: 'bg-amber-500' },
  { stage: 'Interview', count: 6, color: 'bg-purple-500' },
  { stage: 'Offer', count: 2, color: 'bg-emerald-500' },
  { stage: 'Hired', count: 1, color: 'bg-green-600' },
];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const job = { ...MOCK_JOB, id };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/jobs"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
              job.status === 'published'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700'
                : 'border-amber-500/20 bg-amber-500/10 text-amber-700'
            }`}>
              {job.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{job.department}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
            {job.remote && <span className="flex items-center gap-1 text-emerald-600"><Globe className="h-3.5 w-3.5" />Remote</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Pipeline Overview" icon={<BarChart3 className="h-5 w-5" />}>
            <div className="flex gap-2">
              {PIPELINE.map((s) => (
                <div key={s.stage} className="flex-1">
                  <div className="mb-2 flex items-end gap-1">
                    <span className="text-2xl font-bold">{s.count}</span>
                  </div>
                  <div className={`h-2 rounded-full ${s.color}`} style={{ opacity: 0.8 }} />
                  <p className="mt-1.5 text-xs text-muted-foreground">{s.stage}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Description">
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </div>
          </Card>

          <Card title="Requirements">
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.requirements}
            </div>
          </Card>

          <Card title="Benefits">
            <div className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {job.benefits}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <DetailRow icon={<Clock className="h-4 w-4" />} label="Type" value={job.employmentType.replace(/_/g, ' ')} />
              <DetailRow icon={<Users className="h-4 w-4" />} label="Level" value={job.experienceLevel} />
              <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Salary" value={`$${Math.round(job.salaryMin / 1000)}k - $${Math.round(job.salaryMax / 1000)}k`} />
              <DetailRow icon={<Calendar className="h-4 w-4" />} label="Posted" value={job.publishedAt ? new Date(job.publishedAt).toLocaleDateString() : 'Not published'} />
              <DetailRow icon={<Users className="h-4 w-4" />} label="Applicants" value={String(job.applicantCount)} />
            </dl>
          </Card>

          <Card title="Skills">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill} className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon} {label}
      </dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}
