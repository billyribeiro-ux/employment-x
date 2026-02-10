'use client';

import { useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';

import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { closeCommandPalette, toggleCommandPalette } from '@/store/slices/shortcuts';

const commands = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigation', action: '/dashboard' },
  { id: 'nav-jobs', label: 'Go to Jobs', group: 'Navigation', action: '/dashboard/jobs' },
  { id: 'nav-candidates', label: 'Go to Candidates', group: 'Navigation', action: '/dashboard/candidates' },
  { id: 'nav-messages', label: 'Go to Messages', group: 'Navigation', action: '/dashboard/messages' },
  { id: 'nav-scheduling', label: 'Go to Scheduling', group: 'Navigation', action: '/dashboard/scheduling' },
  { id: 'nav-interviews', label: 'Go to Interviews', group: 'Navigation', action: '/dashboard/interviews' },
  { id: 'nav-billing', label: 'Go to Billing', group: 'Navigation', action: '/dashboard/billing' },
  { id: 'nav-settings', label: 'Go to Settings', group: 'Navigation', action: '/dashboard/settings' },
];

export function CommandPaletteWrapper() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.shortcuts.commandPaletteOpen);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dispatch(toggleCommandPalette());
      }
      if (e.key === 'Escape' && isOpen) {
        dispatch(closeCommandPalette());
      }
    },
    [dispatch, isOpen],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const groups = [...new Set(commands.map((c) => c.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => dispatch(closeCommandPalette())} />
      <div className="relative z-50 w-full max-w-lg rounded-xl border bg-popover shadow-2xl">
        <Command className="flex flex-col" label="Command palette">
          <Command.Input
            placeholder="Type a command or search..."
            className="flex h-12 w-full border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            {groups.map((group) => (
              <Command.Group key={group} heading={group} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
                {commands
                  .filter((c) => c.group === group)
                  .map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => {
                        router.push(cmd.action);
                        dispatch(closeCommandPalette());
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      {cmd.label}
                    </Command.Item>
                  ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
