import Link from 'next/link';
import {
  Briefcase,
  MessageSquare,
  Calendar,
  Video,
  Shield,
  Zap,
} from 'lucide-react';

const FEATURES = [
  { icon: Briefcase, title: 'Smart Hiring Pipeline', description: 'Track candidates through every stage with configurable workflows' },
  { icon: MessageSquare, title: 'Private Messaging', description: 'Secure, org-scoped chat with read receipts and attachments' },
  { icon: Calendar, title: 'Intelligent Scheduling', description: 'Propose, accept, deny, reschedule — with automated reminders' },
  { icon: Video, title: 'Video Interviews', description: 'Built-in PiP-ready interview rooms with scorecards' },
  { icon: Shield, title: 'Enterprise Security', description: 'Multi-tenant isolation, RBAC, audit trail, MFA' },
  { icon: Zap, title: 'Keyboard-First UX', description: 'Command palette, sequence shortcuts, fully accessible' },
] as const;

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="text-lg font-bold tracking-tight text-foreground">EmploymentX</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm font-medium text-foreground-secondary transition-colors hover:text-foreground"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-8 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
          <div className="inline-flex items-center rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Production-grade employment platform
          </div>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            Hire with
            <span className="bg-gradient-to-r from-primary via-secondary to-violet bg-clip-text text-transparent"> confidence</span>
          </h1>
          <p className="max-w-xl text-lg text-foreground-secondary">
            End-to-end hiring lifecycle — from discovery to offer. Built for teams that demand reliability, security, and speed.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/demo"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Try Demo — No Signup
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-semibold shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Create Account
            </Link>
          </div>
        </section>

        <section className="border-t bg-background-subtle px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-12 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything you need to hire
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1 font-semibold text-card-foreground">{feature.title}</h3>
                    <p className="text-sm text-foreground-secondary">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-foreground-muted">
        &copy; {new Date().getFullYear()} EmploymentX. All rights reserved.
      </footer>
    </div>
  );
}
