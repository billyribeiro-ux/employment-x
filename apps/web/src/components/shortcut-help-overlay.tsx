'use client';

import { useEffect, useCallback, useState } from 'react';
import { X, Keyboard } from 'lucide-react';

import { useAppSelector } from '@/lib/hooks';

interface ShortcutEntry {
  keys: string;
  label: string;
  scope: string;
}

const SCOPE_ORDER = ['global', 'page', 'modal'] as const;
const SCOPE_LABELS: Record<string, string> = {
  global: 'Global',
  page: 'Page',
  modal: 'Modal',
};

function formatKeys(keys: string): string[] {
  return keys
    .split(' ')
    .map((combo) =>
      combo
        .replace('mod', navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl')
        .replace('shift', '⇧')
        .replace('alt', '⌥')
        .replace('ctrl', 'Ctrl')
        .toUpperCase(),
    );
}

export function ShortcutHelpOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const bindings = useAppSelector((state) => state.shortcuts.bindings);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    },
    [isOpen],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const enabledBindings: ShortcutEntry[] = bindings
    .filter((b) => b.enabled)
    .map((b) => ({ keys: b.keys, label: b.label, scope: b.scope }));

  const grouped = SCOPE_ORDER.reduce<Record<string, ShortcutEntry[]>>((acc, scope) => {
    const items = enabledBindings.filter((b) => b.scope === scope);
    if (items.length > 0) acc[scope] = items;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} aria-hidden="true" />
      <div className="relative z-50 w-full max-w-lg rounded-xl border bg-popover p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-foreground-secondary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-popover-foreground">Keyboard Shortcuts</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close shortcuts overlay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto">
          {Object.entries(grouped).map(([scope, entries]) => (
            <div key={scope}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                {SCOPE_LABELS[scope] ?? scope}
              </h3>
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div
                    key={entry.keys}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="text-popover-foreground">{entry.label}</span>
                    <div className="flex items-center gap-1">
                      {formatKeys(entry.keys).map((part, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-0.5 text-foreground-muted">then</span>}
                          <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                            {part}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(grouped).length === 0 && (
            <p className="py-8 text-center text-sm text-foreground-muted">
              No shortcuts configured. Shortcuts will appear here once loaded.
            </p>
          )}
        </div>

        <div className="mt-4 border-t pt-3 text-center text-xs text-foreground-muted">
          Press <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">?</kbd> to toggle this overlay
        </div>
      </div>
    </div>
  );
}
