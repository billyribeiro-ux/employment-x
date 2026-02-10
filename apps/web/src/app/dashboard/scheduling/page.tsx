'use client';

import { useState } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  Video,
  MapPin,
  User,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';

type MeetingStatus = 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED';

interface Meeting {
  id: string;
  title: string;
  candidateName: string;
  jobTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  type: 'video' | 'in-person' | 'phone';
  interviewers: string[];
}

const MOCK_MEETINGS: Meeting[] = [
  { id: 'm1', title: 'Technical Interview', candidateName: 'Alice Chen', jobTitle: 'Senior Frontend Engineer', date: '2026-02-10', startTime: '10:00 AM', endTime: '11:00 AM', status: 'CONFIRMED', type: 'video', interviewers: ['Sarah Wilson', 'Mike Thompson'] },
  { id: 'm2', title: 'Culture Fit Interview', candidateName: 'Bob Martinez', jobTitle: 'Senior Frontend Engineer', date: '2026-02-10', startTime: '2:00 PM', endTime: '2:45 PM', status: 'REQUESTED', type: 'video', interviewers: ['Sarah Wilson'] },
  { id: 'm3', title: 'Design Review', candidateName: 'Frank Lee', jobTitle: 'Product Designer', date: '2026-02-11', startTime: '11:00 AM', endTime: '12:00 PM', status: 'CONFIRMED', type: 'video', interviewers: ['Lisa Park', 'Tom Chen'] },
  { id: 'm4', title: 'Final Round', candidateName: 'David Kim', jobTitle: 'Senior Frontend Engineer', date: '2026-02-11', startTime: '3:00 PM', endTime: '4:00 PM', status: 'CONFIRMED', type: 'in-person', interviewers: ['CTO', 'VP Engineering'] },
  { id: 'm5', title: 'Phone Screen', candidateName: 'Eva Johnson', jobTitle: 'Backend Engineer', date: '2026-02-12', startTime: '9:00 AM', endTime: '9:30 AM', status: 'REQUESTED', type: 'phone', interviewers: ['Sarah Wilson'] },
  { id: 'm6', title: 'System Design', candidateName: 'James Brown', jobTitle: 'Backend Engineer', date: '2026-02-12', startTime: '1:00 PM', endTime: '2:00 PM', status: 'CONFIRMED', type: 'video', interviewers: ['Mike Thompson', 'Alex Rivera'] },
  { id: 'm7', title: 'Debrief', candidateName: 'Henry Zhao', jobTitle: 'DevOps Engineer', date: '2026-02-09', startTime: '4:00 PM', endTime: '4:30 PM', status: 'COMPLETED', type: 'video', interviewers: ['Sarah Wilson', 'Mike Thompson'] },
];

type ViewMode = 'week' | 'list';

export default function SchedulingPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [showCreate, setShowCreate] = useState(false);

  const upcoming = MOCK_MEETINGS.filter((m) => m.status !== 'COMPLETED' && m.status !== 'CANCELED').sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const past = MOCK_MEETINGS.filter((m) => m.status === 'COMPLETED' || m.status === 'CANCELED');

  const todayCount = upcoming.filter((m) => m.date === '2026-02-10').length;
  const weekCount = upcoming.length;
  const pendingCount = upcoming.filter((m) => m.status === 'REQUESTED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduling</h1>
          <p className="text-muted-foreground">Manage interviews and meetings</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Schedule Interview
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Calendar className="h-5 w-5" />} label="Today" value={String(todayCount)} sub="interviews" />
        <StatCard icon={<Clock className="h-5 w-5" />} label="This Week" value={String(weekCount)} sub="scheduled" />
        <StatCard icon={<User className="h-5 w-5" />} label="Pending" value={String(pendingCount)} sub="awaiting response" accent />
      </div>

      {showCreate && <CreateMeetingForm onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
          {(['list', 'week'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'week' ? 'Calendar' : 'List'}
            </button>
          ))}
        </div>
        {view === 'week' && (
          <div className="flex items-center gap-2">
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-medium">Feb 10 - 14, 2026</span>
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      {view === 'list' ? (
        <div className="space-y-6">
          <MeetingSection title="Upcoming" meetings={upcoming} />
          {past.length > 0 && <MeetingSection title="Past" meetings={past} />}
        </div>
      ) : (
        <WeekView meetings={upcoming} />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${accent ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">{sub}</span></p>
        </div>
      </div>
    </div>
  );
}

function CreateMeetingForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Schedule New Interview</h2>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Title</label>
          <input type="text" placeholder="Technical Interview" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Candidate</label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
            <option>Select candidate...</option>
            <option>Alice Chen</option>
            <option>Bob Martinez</option>
            <option>Eva Johnson</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Date</label>
          <input type="date" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Start</label>
            <input type="time" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">End</label>
            <input type="time" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm">
            <option value="video">Video Call</option>
            <option value="in-person">In Person</option>
            <option value="phone">Phone</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Interviewers</label>
          <input type="text" placeholder="Add interviewers..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent">Cancel</button>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Schedule</button>
      </div>
    </div>
  );
}

function MeetingSection({ title, meetings }: { title: string; meetings: Meeting[] }) {
  const grouped = meetings.reduce<Record<string, Meeting[]>>((acc, m) => {
    (acc[m.date] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dayMeetings]) => (
          <div key={date}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="space-y-2">
              {dayMeetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  const typeIcon = meeting.type === 'video' ? <Video className="h-3.5 w-3.5" /> : meeting.type === 'phone' ? <Clock className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />;

  return (
    <div className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {typeIcon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{meeting.title}</p>
          <MeetingStatusBadge status={meeting.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          {meeting.candidateName} &middot; {meeting.jobTitle}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {meeting.startTime} - {meeting.endTime} &middot; {meeting.interviewers.join(', ')}
        </p>
      </div>
      <div className="flex gap-1">
        {meeting.status === 'REQUESTED' && (
          <>
            <button className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-500/10" title="Accept">
              <Check className="h-4 w-4" />
            </button>
            <button className="rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10" title="Decline">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {meeting.status === 'CONFIRMED' && meeting.type === 'video' && (
          <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Join
          </button>
        )}
        <button className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const styles: Record<MeetingStatus, string> = {
    REQUESTED: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    CONFIRMED: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    COMPLETED: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
    CANCELED: 'bg-red-500/10 text-red-700 border-red-500/20',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}

function WeekView({ meetings }: { meetings: Meeting[] }) {
  const days = ['Mon 10', 'Tue 11', 'Wed 12', 'Thu 13', 'Fri 14'];
  const dateMap: Record<string, string> = {
    'Mon 10': '2026-02-10',
    'Tue 11': '2026-02-11',
    'Wed 12': '2026-02-12',
    'Thu 13': '2026-02-13',
    'Fri 14': '2026-02-14',
  };

  return (
    <div className="grid grid-cols-5 gap-3">
      {days.map((day) => {
        const dayMeetings = meetings.filter((m) => m.date === dateMap[day]);
        return (
          <div key={day} className="min-h-[200px]">
            <p className="mb-2 text-center text-xs font-semibold text-muted-foreground">{day}</p>
            <div className="space-y-2">
              {dayMeetings.map((m) => (
                <div key={m.id} className="rounded-lg border bg-card p-3 shadow-sm">
                  <p className="text-xs font-semibold">{m.title}</p>
                  <p className="text-[10px] text-muted-foreground">{m.startTime} - {m.endTime}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{m.candidateName}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
