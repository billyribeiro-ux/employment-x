# EmploymentX — Keyboard System Specification

Version: 1.0.0
Date: 2026-02-09

---

## 1. Architecture

The keyboard system is implemented as a `KeyboardEngine` class (`apps/web/src/lib/keyboard-engine.ts`) that manages:
- Binding registration and lookup
- Sequence shortcut state machine
- Combo shortcut matching
- Scope-aware filtering (global/page/modal)
- Conflict detection
- Telemetry event emission

## 2. Binding Types

### Combo Shortcuts
Single key combination pressed simultaneously:
- `mod+k` → Command palette
- `shift+a` → Accept meeting
- `/` → Focus search

### Sequence Shortcuts
Multiple keys pressed in order within 800ms timeout:
- `g c` → Navigate to candidates
- `g j` → Navigate to jobs
- `g m` → Navigate to messages

## 3. Default Bindings

| Keys | Action | Scope | Type |
|------|--------|-------|------|
| `mod+k` | Command palette toggle | global | combo |
| `g c` | Navigate to candidates | global | sequence |
| `g j` | Navigate to jobs | global | sequence |
| `g m` | Navigate to messages | global | sequence |
| `g s` | Navigate to scheduling | global | sequence |
| `g d` | Navigate to dashboard | global | sequence |
| `g i` | Navigate to interviews | global | sequence |
| `g b` | Navigate to billing | global | sequence |
| `g ,` | Navigate to settings | global | sequence |
| `shift+a` | Accept meeting | page | combo |
| `shift+d` | Deny meeting | page | combo |
| `shift+r` | Reschedule meeting | page | combo |
| `shift+/` (?) | Shortcut help overlay | global | combo |
| `/` | Focus search | global | combo |
| `escape` | Close modal / cancel | global | combo |

## 4. Scope System

| Scope | Active When | Priority |
|-------|------------|----------|
| `global` | Always | Lowest |
| `page` | On specific pages | Medium |
| `modal` | Modal is open | Highest (overrides page/global) |

When a modal is open, only `modal` and `global` bindings fire. Page bindings are suppressed.

## 5. Conflict Detection

The engine detects two types of conflicts:
1. **Exact duplicate**: Same keys + same scope
2. **Prefix collision**: One sequence is a prefix of another (e.g., `g` vs `g c`)

Conflicts are surfaced in the shortcut settings UI and prevent saving invalid configurations.

## 6. Input Suppression

Shortcuts are suppressed when focus is in:
- `<input>` elements
- `<textarea>` elements
- `<select>` elements
- `contentEditable` elements

## 7. Telemetry

Every shortcut execution emits a telemetry event:
```typescript
{ action: 'navigate.candidates', keys: 'g c', timestamp: Date.now() }
```

Events are:
- Tracked client-side via the telemetry callback
- Sent to `/v1/shortcuts/usage-events` for server-side analytics
- Used to surface "most used shortcuts" in the help overlay

## 8. User Customization

Users can customize bindings via:
1. Settings UI (`/dashboard/settings/shortcuts`)
2. API: `PATCH /v1/shortcuts` with updated bindings array
3. Stored server-side in `shortcut_profiles` + `shortcut_bindings` tables
4. Loaded on app init and merged with defaults

## 9. Help Overlay

Triggered by pressing `?` (when not in an input field):
- Groups shortcuts by scope (Global, Page, Modal)
- Shows key combination with platform-specific symbols (⌘ on Mac, Ctrl on others)
- Indicates sequence shortcuts with "then" separator
- Dismissible via Escape or clicking outside

## 10. Reduced Motion

Keyboard shortcuts themselves are not affected by reduced-motion preferences. However, any visual feedback animations (e.g., command palette open animation) respect the reduced-motion media query.
