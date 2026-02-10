'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Clock,
  DollarSign,
  Eye,
  Pencil,
  Trash2,
  Globe,
  Building2,
} from 'lucide-react';

type JobStatus = 'all' | 'draft' | 'published' | 'closed';

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  remote: boolean;
  employmentType: string;
  experienceLevel: string;
  status: 'draft' | 'published' | 'closed';
  applicantCount: number;
  salaryMin: number | null;
  salaryMax: number | null;
  publishedAt: string | null;
  createdAt: string;
}

const MOCK_JOBS: Job[] = [
  {
    id: '1', title: 'Senior Frontend Engineer', department: 'Engineering', location: 'San Francisco, CA',
    remote: true, employmentType: 'full_time', experienceLevel: 'senior', status: 'published',
    applicantCount: 24, salaryMin: 180000, salaryMax: 240000, publishedAt: '2026-01-15T00:00:00Z', createdAt: '2026-01-10T00:00:00Z',
  },
  {
    id: '2', title: 'Product Designer', department: 'Design', location: 'New York, NY',
    remote: false, employmentType: 'full_time', experienceLevel: 'mid', status: 'published',
    applicantCount: 18, salaryMin: 140000, salaryMax: 180000, publishedAt: '2026-01-20T00:00:00Z', createdAt: '2026-01-18T00:00:00Z',
  },
  {
    id: '3', title: 'Backend Engineer', department: 'Engineering', location: 'Austin, TX',
    remote: true, employmentType: 'full_time', experienceLevel: 'senior', status: 'draft',
    applicantCount: 0, salaryMin: 170000, salaryMax: 220000, publishedAt: null, createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: '4', title: 'DevOps Engineer', department: 'Infrastructure', location: 'Remote',
    remote: true, employmentType: 'contract', experienceLevel: 'senior', status: 'published',
    applicantCount: 12, salaryMin: 160000, salaryMax: 200000, publishedAt: '2026-01-25T00:00:00Z', createdAt: '2026-01-22T00:00:00Z',
  },
  {
    id: '5', title: 'Marketing Manager', department: 'Marketing', location: 'Chicago, IL',
    remote: false, employmentType: 'full_time', experienceLevel: 'mid', status: 'closed',
    applicantCount: 45, salaryMin: 110000, salaryMax: 150000, publishedAt: '2025-12-01T00:00:00Z', createdAt: '2025-11-28T00:00:00Z',
  },
];

export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JobStatus>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = MOCK_JOBS.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (search && !job.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: MOCK_JOBS.length,
    draft: MOCK_JOBS.filter((j) => j.status === 'draft').length,
    published: MOCK_JOBS.filter((j) => j.status === 'published').length,
    closed: MOCK_JOBS.filter((j) => j.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">Manage your job postings</p>
        </div>
        <Link
          href="/dashboard/jobs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Job
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
          {(['all', 'published', 'draft', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="ml-1 text-muted-foreground">({counts[status]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
            <Filter className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No jobs found</p>
            <p className="text-xs text-muted-foreground/70">Try adjusting your search or filters</p>
          </div>
        ) : (
          filtered.map((job) => (
            <div
              key={job.id}
              className="group relative rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/jobs/${job.id}`}
                      className="text-base font-semibold hover:text-primary"
                    >
                      {job.title}
                    </Link>
                    <StatusBadge status={job.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {job.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                    {job.remote && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Globe className="h-3.5 w-3.5" />
                        Remote
                      </span>
                    )}
                    {job.salaryMin && job.salaryMax && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatSalary(job.salaryMin)} - {formatSalary(job.salaryMax)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatEmploymentType(job.employmentType)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-semibold">{job.applicantCount}</p>
                    <p className="text-xs text-muted-foreground">applicants</p>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === job.id ? null : job.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenu === job.id && (
                      <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border bg-popover p-1 shadow-lg">
                        <MenuButton icon={<Eye className="h-3.5 w-3.5" />} label="View" />
                        <MenuButton icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" />
                        <MenuButton icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" destructive />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    draft: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    closed: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[status] ?? styles['draft']}`}>
      {status}
    </span>
  );
}

function MenuButton({ icon, label, destructive }: { icon: React.ReactNode; label: string; destructive?: boolean }) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
        destructive
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground hover:bg-accent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatSalary(n: number) {
  return `$${Math.round(n / 1000)}k`;
}

function formatEmploymentType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
