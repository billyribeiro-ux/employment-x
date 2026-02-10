import type { AppDispatch } from '@/store';

export interface ShortcutBinding {
  id: string;
  action: string;
  label: string;
  description: string;
  keys: string;
  scope: 'global' | 'page' | 'modal';
  sequence: boolean;
  enabled: boolean;
}

export interface ShortcutConflict {
  bindingA: ShortcutBinding;
  bindingB: ShortcutBinding;
  conflictType: 'exact_duplicate' | 'prefix_collision';
}

interface SequenceState {
  keys: string[];
  timer: ReturnType<typeof setTimeout> | null;
}

type ShortcutHandler = (binding: ShortcutBinding) => void;

const SEQUENCE_TIMEOUT_MS = 800;

export class KeyboardEngine {
  private bindings: ShortcutBinding[] = [];
  private handlers: Map<string, ShortcutHandler> = new Map();
  private sequenceState: SequenceState = { keys: [], timer: null };
  private activeScope: 'global' | 'page' | 'modal' = 'global';
  private _dispatch: AppDispatch | null = null;
  private telemetryCallback: ((action: string, keys: string) => void) | null = null;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

  setDispatch(dispatch: AppDispatch): void {
    this._dispatch = dispatch;
  }

  setTelemetryCallback(cb: (action: string, keys: string) => void): void {
    this.telemetryCallback = cb;
  }

  setScope(scope: 'global' | 'page' | 'modal'): void {
    this.activeScope = scope;
    this.resetSequence();
  }

  loadBindings(bindings: ShortcutBinding[]): void {
    this.bindings = bindings.filter((b) => b.enabled);
  }

  registerHandler(action: string, handler: ShortcutHandler): void {
    this.handlers.set(action, handler);
  }

  unregisterHandler(action: string): void {
    this.handlers.delete(action);
  }

  detectConflicts(): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const enabled = this.bindings.filter((b) => b.enabled);

    for (let i = 0; i < enabled.length; i++) {
      for (let j = i + 1; j < enabled.length; j++) {
        const a = enabled[i]!;
        const b = enabled[j]!;

        if (a.scope !== b.scope) continue;

        if (a.keys === b.keys) {
          conflicts.push({ bindingA: a, bindingB: b, conflictType: 'exact_duplicate' });
          continue;
        }

        if (a.sequence && b.sequence) {
          const aParts = a.keys.split(' ');
          const bParts = b.keys.split(' ');
          const minLen = Math.min(aParts.length, bParts.length);
          let prefixMatch = true;
          for (let k = 0; k < minLen; k++) {
            if (aParts[k] !== bParts[k]) {
              prefixMatch = false;
              break;
            }
          }
          if (prefixMatch && aParts.length !== bParts.length) {
            conflicts.push({ bindingA: a, bindingB: b, conflictType: 'prefix_collision' });
          }
        }
      }
    }

    return conflicts;
  }

  attach(): void {
    if (this.boundKeyDown) return;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.boundKeyDown, true);
  }

  detach(): void {
    if (this.boundKeyDown) {
      document.removeEventListener('keydown', this.boundKeyDown, true);
      this.boundKeyDown = null;
    }
    this.resetSequence();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    const keyCombo = this.normalizeKeyCombo(e);
    if (!keyCombo) return;

    const sequenceBindings = this.bindings.filter(
      (b) => b.sequence && (b.scope === this.activeScope || b.scope === 'global'),
    );

    if (sequenceBindings.length > 0) {
      this.sequenceState.keys.push(keyCombo);
      if (this.sequenceState.timer) {
        clearTimeout(this.sequenceState.timer);
      }

      const currentSequence = this.sequenceState.keys.join(' ');

      const exactMatch = sequenceBindings.find((b) => b.keys === currentSequence);
      if (exactMatch) {
        e.preventDefault();
        e.stopPropagation();
        this.executeBinding(exactMatch);
        this.resetSequence();
        return;
      }

      const hasPrefix = sequenceBindings.some((b) => b.keys.startsWith(currentSequence + ' '));
      if (hasPrefix) {
        e.preventDefault();
        this.sequenceState.timer = setTimeout(() => {
          this.resetSequence();
        }, SEQUENCE_TIMEOUT_MS);
        return;
      }

      this.resetSequence();
    }

    const comboBindings = this.bindings.filter(
      (b) => !b.sequence && (b.scope === this.activeScope || b.scope === 'global'),
    );

    const match = comboBindings.find((b) => b.keys === keyCombo);
    if (match) {
      e.preventDefault();
      e.stopPropagation();
      this.executeBinding(match);
    }
  }

  private executeBinding(binding: ShortcutBinding): void {
    const handler = this.handlers.get(binding.action);
    if (handler) {
      handler(binding);
    }

    if (this.telemetryCallback) {
      this.telemetryCallback(binding.action, binding.keys);
    }

    void this._dispatch;
  }

  private resetSequence(): void {
    if (this.sequenceState.timer) {
      clearTimeout(this.sequenceState.timer);
    }
    this.sequenceState = { keys: [], timer: null };
  }

  private normalizeKeyCombo(e: KeyboardEvent): string | null {
    const key = e.key.toLowerCase();

    if (['shift', 'control', 'alt', 'meta', 'capslock', 'tab'].includes(key)) {
      return null;
    }

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push('mod');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    parts.push(key);

    return parts.join('+');
  }
}

export const DEFAULT_BINDINGS: ShortcutBinding[] = [
  { id: 'cmd-palette', action: 'command_palette.toggle', label: 'Command Palette', description: 'Open the command palette', keys: 'mod+k', scope: 'global', sequence: false, enabled: true },
  { id: 'nav-candidates', action: 'navigate.candidates', label: 'Go to Candidates', description: 'Navigate to candidates page', keys: 'g c', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-jobs', action: 'navigate.jobs', label: 'Go to Jobs', description: 'Navigate to jobs page', keys: 'g j', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-messages', action: 'navigate.messages', label: 'Go to Messages', description: 'Navigate to messages page', keys: 'g m', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-scheduling', action: 'navigate.scheduling', label: 'Go to Scheduling', description: 'Navigate to scheduling page', keys: 'g s', scope: 'global', sequence: true, enabled: true },
  { id: 'meeting-accept', action: 'meeting.accept', label: 'Accept Meeting', description: 'Accept the focused meeting request', keys: 'shift+a', scope: 'page', sequence: false, enabled: true },
  { id: 'meeting-deny', action: 'meeting.deny', label: 'Deny Meeting', description: 'Deny the focused meeting request', keys: 'shift+d', scope: 'page', sequence: false, enabled: true },
  { id: 'meeting-reschedule', action: 'meeting.reschedule', label: 'Reschedule Meeting', description: 'Reschedule the focused meeting', keys: 'shift+r', scope: 'page', sequence: false, enabled: true },
  { id: 'shortcut-help', action: 'shortcuts.help', label: 'Shortcut Help', description: 'Show keyboard shortcuts overlay', keys: 'shift+/', scope: 'global', sequence: false, enabled: true },
  { id: 'nav-dashboard', action: 'navigate.dashboard', label: 'Go to Dashboard', description: 'Navigate to dashboard', keys: 'g d', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-interviews', action: 'navigate.interviews', label: 'Go to Interviews', description: 'Navigate to interviews page', keys: 'g i', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-billing', action: 'navigate.billing', label: 'Go to Billing', description: 'Navigate to billing page', keys: 'g b', scope: 'global', sequence: true, enabled: true },
  { id: 'nav-settings', action: 'navigate.settings', label: 'Go to Settings', description: 'Navigate to settings page', keys: 'g ,', scope: 'global', sequence: true, enabled: true },
  { id: 'search-focus', action: 'search.focus', label: 'Focus Search', description: 'Focus the global search input', keys: '/', scope: 'global', sequence: false, enabled: true },
  { id: 'escape', action: 'modal.close', label: 'Close / Cancel', description: 'Close modal or cancel current action', keys: 'escape', scope: 'global', sequence: false, enabled: true },
];

export function createKeyboardEngine(): KeyboardEngine {
  const engine = new KeyboardEngine();
  engine.loadBindings(DEFAULT_BINDINGS);
  return engine;
}
