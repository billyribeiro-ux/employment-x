'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  Clock,
  Star,
  MoreHorizontal,
  ArrowRight,
  Mail,
  Calendar,
} from 'lucide-react';

type Stage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  stage: Stage;
  rating: number | null;
  appliedAt: string;
  lastActivity: string;
}

const STAGES: { key: Stage; label: string; color: string; bgColor: string }[] = [
  { key: 'applied', label: 'Applied', color: 'border-blue-500', bgColor: 'bg-blue-500' },
  { key: 'screening', label: 'Screening', color: 'border-amber-500', bgColor: 'bg-amber-500' },
  { key: 'interview', label: 'Interview', color: 'border-purple-500', bgColor: 'bg-purple-500' },
  { key: 'offer', label: 'Offer', color: 'border-emerald-500', bgColor: 'bg-emerald-500' },
  { key: 'hired', label: 'Hired', color: 'border-green-600', bgColor: 'bg-green-600' },
];

const MOCK_APPLICATIONS: Application[] = [
  { id: 'a1', candidateName: 'Alice Chen', candidateEmail: 'alice@example.com', jobTitle: 'Senior Frontend Engineer', stage: 'interview', rating: 4, appliedAt: '2026-01-20', lastActivity: '2 hours ago' },
  { id: 'a2', candidateName: 'Bob Martinez', candidateEmail: 'bob@example.com', jobTitle: 'Senior Frontend Engineer', stage: 'screening', rating: 3, appliedAt: '2026-01-22', lastActivity: '1 day ago' },
  { id: 'a3', candidateName: 'Carol Williams', candidateEmail: 'carol@example.com', jobTitle: 'Product Designer', stage: 'applied', rating: null, appliedAt: '2026-02-01', lastActivity: '3 hours ago' },
  { id: 'a4', candidateName: 'David Kim', candidateEmail: 'david@example.com', jobTitle: 'Senior Frontend Engineer', stage: 'offer', rating: 5, appliedAt: '2026-01-15', lastActivity: '30 min ago' },
  { id: 'a5', candidateName: 'Eva Johnson', candidateEmail: 'eva@example.com', jobTitle: 'Backend Engineer', stage: 'applied', rating: null, appliedAt: '2026-02-03', lastActivity: '5 hours ago' },
  { id: 'a6', candidateName: 'Frank Lee', candidateEmail: 'frank@example.com', jobTitle: 'Product Designer', stage: 'interview', rating: 4, appliedAt: '2026-01-18', lastActivity: '1 day ago' },
  { id: 'a7', candidateName: 'Grace Park', candidateEmail: 'grace@example.com', jobTitle: 'Senior Frontend Engineer', stage: 'screening', rating: 3, appliedAt: '2026-01-25', lastActivity: '4 hours ago' },
  { id: 'a8', candidateName: 'Henry Zhao', candidateEmail: 'henry@example.com', jobTitle: 'DevOps Engineer', stage: 'hired', rating: 5, appliedAt: '2025-12-10', lastActivity: '1 week ago' },
  { id: 'a9', candidateName: 'Iris Nakamura', candidateEmail: 'iris@example.com', jobTitle: 'Senior Frontend Engineer', stage: 'applied', rating: null, appliedAt: '2026-02-05', lastActivity: '1 hour ago' },
  { id: 'a10', candidateName: 'James Brown', candidateEmail: 'james@example.com', jobTitle: 'Backend Engineer', stage: 'screening', rating: 4, appliedAt: '2026-01-28', lastActivity: '6 hours ago' },
];

type ViewMode = 'board' | 'list';

export default function ApplicationsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('board');

  const filtered = MOCK_APPLICATIONS.filter((app) => {
    if (search && !app.candidateName.toLowerCase().includes(search.toLowerCase()) && !app.jobTitle.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Applications</h1>
        <p className="text-muted-foreground">Track candidates through your hiring pipeline</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidates or jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent">
            <Filter className="h-4 w-4" /> Filter <ChevronDown className="h-3 w-3" />
          </button>
          <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
            {(['board', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'board' ? (
        <BoardView applications={filtered} />
      ) : (
        <ListView applications={filtered} />
      )}
    </div>
  );
}

function BoardView({ applications }: { applications: Application[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageApps = applications.filter((a) => a.stage === stage.key);
        return (
          <div key={stage.key} className="w-72 shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${stage.bgColor}`} />
              <h3 className="text-sm font-semibold">{stage.label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {stageApps.length}
              </span>
            </div>
            <div className="space-y-2">
              {stageApps.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
              {stageApps.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-xs text-muted-foreground">No candidates</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicationCard({ application }: { application: Application }) {
  return (
    <div className="group rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {application.candidateName.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-medium leading-tight">{application.candidateName}</p>
            <p className="text-xs text-muted-foreground">{application.jobTitle}</p>
          </div>
        </div>
        <button className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {application.lastActivity}
        </span>
        {application.rating && (
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {application.rating}/5
          </span>
        )}
      </div>
    </div>
  );
}

function ListView({ applications }: { applications: Application[] }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 border-b px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span>Candidate</span>
        <span>Job</span>
        <span>Stage</span>
        <span>Rating</span>
        <span>Applied</span>
        <span>Actions</span>
      </div>
      {applications.map((app) => (
        <div key={app.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] items-center gap-4 border-b px-5 py-3 last:border-b-0 hover:bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {app.candidateName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="text-sm font-medium">{app.candidateName}</p>
              <p className="text-xs text-muted-foreground">{app.candidateEmail}</p>
            </div>
          </div>
          <span className="text-sm">{app.jobTitle}</span>
          <StageBadge stage={app.stage} />
          <span className="flex items-center gap-0.5 text-sm">
            {app.rating ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {app.rating}
              </>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </span>
          <span className="text-sm text-muted-foreground">{new Date(app.appliedAt).toLocaleDateString()}</span>
          <div className="flex gap-1">
            <button className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Email">
              <Mail className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Schedule">
              <Calendar className="h-3.5 w-3.5" />
            </button>
            <button className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Move">
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  const styles: Record<Stage, string> = {
    applied: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    screening: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    interview: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    offer: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    hired: 'bg-green-600/10 text-green-700 border-green-600/20',
    rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${styles[stage]}`}>
      {stage}
    </span>
  );
}
