'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Calendar,
  Home,
  MessageSquare,
  Settings,
  Users,
  Video,
  CreditCard,
  Command,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/dashboard/applications', label: 'Applications', icon: Users },
  { href: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard/scheduling', label: 'Scheduling', icon: Calendar },
  { href: '/dashboard/interviews', label: 'Interviews', icon: Video },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
  { href: '/dashboard/profile', label: 'Profile', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Command className="h-5 w-5 text-primary" />
          <span>EmploymentX</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="absolute bottom-4 left-0 w-64 px-3">
        <div className="rounded-md border bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded border bg-background px-1 py-0.5 text-[10px] font-mono">⌘K</kbd> to open command palette
          </p>
        </div>
      </div>
    </aside>
  );
}
