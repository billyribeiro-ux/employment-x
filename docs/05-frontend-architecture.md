# EmploymentX — Frontend Route/State/Data Architecture

Version: 1.0.0
Date: 2026-02-09

---

## 1. Route Map

```
/                                 Landing (public, SSR)
/demo                             Demo role selection (public, CSR)
/auth/login                       Login (public, CSR)
/auth/register                    Registration (public, CSR)
/dashboard                        Dashboard home (protected)
/dashboard/jobs                   Job management
/dashboard/jobs/[id]              Job detail
/dashboard/jobs/new               Create job
/dashboard/candidates             Candidate pipeline
/dashboard/candidates/[id]        Candidate detail
/dashboard/messages               Chat conversations
/dashboard/messages/[id]          Conversation thread
/dashboard/scheduling             Meeting management
/dashboard/scheduling/[id]        Meeting detail
/dashboard/interviews             Interview rooms
/dashboard/interviews/[id]        Interview room (PiP-ready)
/dashboard/billing                Subscription management
/dashboard/settings               User/org settings
/dashboard/settings/shortcuts     Shortcut customization
```

## 2. State Architecture

| Layer | Technology | Scope | Persistence |
|-------|-----------|-------|-------------|
| **Server state** | TanStack React Query | API data | Query cache (memory) |
| **Client state** | Redux Toolkit | Auth, shortcuts, UI | Redux store (memory) |
| **Form state** | react-hook-form + Zod | Form fields | Component-local |
| **URL state** | Next.js App Router | Route params, search | URL |
| **Session state** | sessionStorage | Demo session ID | Tab-scoped |

### Redux Slices

```
store/
├── slices/
│   ├── auth.ts          accessToken, refreshToken, user, isAuthenticated
│   └── shortcuts.ts     profileId, bindings[], commandPaletteOpen
└── index.ts             configureStore, RootState, AppDispatch
```

### React Query Keys

```typescript
['candidates', { orgId, cursor, filters }]
['candidates', candidateId]
['jobs', { orgId, status, cursor }]
['jobs', jobId]
['conversations', { orgId, cursor }]
['conversations', conversationId, 'messages', { cursor }]
['meetings', { orgId, status, cursor }]
['meetings', meetingId]
['billing', 'plans']
['billing', 'subscription', orgId]
['billing', 'usage', orgId]
['shortcuts', userId]
['flags']
```

## 3. Data Flow

```
User Action → React Hook Form (validate) → useMutation (React Query)
  → SDK Client (fetch) → API Response → Query Cache Invalidation
  → UI Re-render
```

Optimistic updates for:
- Message sending (append to list immediately)
- Meeting accept/deny (update status immediately)
- Shortcut binding changes (apply immediately)

## 4. Component Architecture

### Shared Components (packages/ui)
Button, Dialog, DropdownMenu, Tooltip, Input, Label, Badge, Card, Spinner, VisuallyHidden

### App Components (apps/web/src/components)
- `dashboard-nav.tsx` — Sidebar navigation with active state
- `command-palette-wrapper.tsx` — ⌘K command palette (cmdk)
- `shortcut-help-overlay.tsx` — ? keyboard shortcuts reference
- `demo-banner.tsx` — Demo environment banner + watermark guard

### Page Components (apps/web/src/app)
Each route has a `page.tsx` (server or client component) with co-located data fetching.

## 5. Accessibility Requirements

- All interactive elements have visible `:focus-visible` ring
- Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- All images have `alt` text or `aria-hidden="true"`
- Form inputs have associated `<label>` elements
- Modals trap focus and support Escape to close
- Screen reader announcements for dynamic content (`aria-live`)
- Reduced motion support via `prefers-reduced-motion` media query
- Keyboard navigation for all features (no mouse-only interactions)
