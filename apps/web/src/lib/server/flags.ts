type FlagValue = boolean | string | number;

interface FlagDefinition {
  defaultValue: FlagValue;
  description: string;
  plans?: string[];
  roles?: string[];
}

const FLAG_DEFINITIONS: Record<string, FlagDefinition> = {
  'billing.stripe_enabled': { defaultValue: false, description: 'Enable Stripe billing integration' },
  'chat.realtime_enabled': { defaultValue: false, description: 'Enable WebSocket real-time chat' },
  'demo.enabled': { defaultValue: true, description: 'Enable demo mode entry' },
  'demo.ttl_minutes': { defaultValue: 60, description: 'Demo session TTL in minutes' },
  'demo.max_sessions': { defaultValue: 100, description: 'Max concurrent demo sessions' },
  'interview.video_enabled': { defaultValue: false, description: 'Enable video interview rooms' },
  'interview.ai_scoring': { defaultValue: false, description: 'Enable AI-assisted interview scoring' },
  'jobs.ai_description': { defaultValue: false, description: 'Enable AI job description generation' },
  'pipeline.kanban_view': { defaultValue: true, description: 'Enable Kanban pipeline view' },
  'pipeline.analytics': { defaultValue: false, description: 'Enable pipeline analytics dashboard', plans: ['professional', 'enterprise'] },
  'scheduling.calendar_sync': { defaultValue: false, description: 'Enable calendar sync (Google/Outlook)' },
  'security.mfa_enabled': { defaultValue: false, description: 'Enable multi-factor authentication' },
  'ui.animations': { defaultValue: true, description: 'Enable UI animations' },
  'ui.dark_mode': { defaultValue: true, description: 'Enable dark mode toggle' },
  'ui.high_contrast': { defaultValue: true, description: 'Enable high contrast mode' },
};

const overrides = new Map<string, FlagValue>();

export function getFlag(key: string, context?: { plan?: string; role?: string }): FlagValue {
  const override = overrides.get(key);
  if (override !== undefined) return override;

  const def = FLAG_DEFINITIONS[key];
  if (!def) return false;

  if (def.plans && context?.plan && !def.plans.includes(context.plan)) {
    return false;
  }

  if (def.roles && context?.role && !def.roles.includes(context.role)) {
    return false;
  }

  return def.defaultValue;
}

export function isEnabled(key: string, context?: { plan?: string; role?: string }): boolean {
  return getFlag(key, context) === true;
}

export function setFlagOverride(key: string, value: FlagValue): void {
  overrides.set(key, value);
}

export function clearFlagOverride(key: string): void {
  overrides.delete(key);
}

export function clearAllOverrides(): void {
  overrides.clear();
}

export function getAllFlags(context?: { plan?: string; role?: string }): Record<string, FlagValue> {
  const result: Record<string, FlagValue> = {};
  for (const key of Object.keys(FLAG_DEFINITIONS)) {
    result[key] = getFlag(key, context);
  }
  return result;
}

export function getFlagDefinitions(): Record<string, { description: string; defaultValue: FlagValue }> {
  const result: Record<string, { description: string; defaultValue: FlagValue }> = {};
  for (const [key, def] of Object.entries(FLAG_DEFINITIONS)) {
    result[key] = { description: def.description, defaultValue: def.defaultValue };
  }
  return result;
}
