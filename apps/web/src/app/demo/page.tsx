'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Briefcase, User, Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { setApiToken, API_BASE_URL } from '@/lib/api';
import { useAppDispatch } from '@/lib/hooks';
import { setTokens, setUser } from '@/store/slices/auth';

const DEMO_ROLES = [
  {
    id: 'candidate',
    label: 'Job Seeker',
    description: 'Browse jobs, apply, chat with recruiters, attend interviews',
    icon: User,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'employer',
    label: 'Employer',
    description: 'Post jobs, review candidates, schedule interviews, manage pipeline',
    icon: Briefcase,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  {
    id: 'agency',
    label: 'Agency',
    description: 'Manage multiple clients, source candidates, coordinate placements',
    icon: Building2,
    color: 'text-violet',
    bgColor: 'bg-violet/10',
  },
] as const;

export default function DemoPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startDemo(role: string) {
    setError(null);
    setLoading(role);

    try {
      const response = await fetch(`${API_BASE_URL}/v1/demo/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({ message: 'Failed to start demo' }));
        throw new Error(errBody.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      dispatch(
        setTokens({
          accessToken: data.access_token,
          refreshToken: data.session_token,
        }),
      );
      dispatch(
        setUser({
          id: data.user_id,
          email: `demo-${role}@employmentx.local`,
          firstName: 'Demo',
          lastName: role.charAt(0).toUpperCase() + role.slice(1),
          role,
          organizationId: data.tenant_id,
        }),
      );
      setApiToken(data.access_token);

      sessionStorage.setItem('demo_session_id', data.session_id);
      sessionStorage.setItem('demo_role', role);

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start demo');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background p-6">
      <div className="text-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-secondary transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Try EmploymentX
        </h1>
        <p className="mt-3 max-w-md text-foreground-secondary">
          Experience the full platform without creating an account. Choose a role to explore.
        </p>
      </div>

      {error && (
        <div className="w-full max-w-lg rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {DEMO_ROLES.map((role) => {
          const Icon = role.icon;
          const isLoading = loading === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => startDemo(role.id)}
              disabled={loading !== null}
              className="group relative flex flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              aria-label={`Start demo as ${role.label}`}
            >
              <div className={`rounded-xl p-3 ${role.bgColor} transition-transform group-hover:scale-110`}>
                <Icon className={`h-8 w-8 ${role.color}`} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-card-foreground">{role.label}</h2>
                <p className="mt-1 text-sm text-foreground-secondary">{role.description}</p>
              </div>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/80">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="max-w-md text-center text-xs text-foreground-muted">
        <p>
          Demo sessions expire after 2 hours. No real emails, payments, or external actions are performed.
          All data is sandboxed and can be reset at any time.
        </p>
      </div>
    </div>
  );
}
