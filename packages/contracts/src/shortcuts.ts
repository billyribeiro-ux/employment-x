import { z } from 'zod';

import { TimestampsSchema } from './common';

export const ShortcutScopeSchema = z.enum(['global', 'page', 'modal']);
export type ShortcutScope = z.infer<typeof ShortcutScopeSchema>;

export const ShortcutBindingSchema = z.object({
  id: z.string(),
  action: z.string(),
  label: z.string(),
  description: z.string(),
  keys: z.string(),
  scope: ShortcutScopeSchema,
  sequence: z.boolean(),
  enabled: z.boolean(),
});
export type ShortcutBinding = z.infer<typeof ShortcutBindingSchema>;

export const ShortcutProfileSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    organization_id: z.string().uuid().nullable(),
    name: z.string().max(100),
    is_default: z.boolean(),
    bindings: z.array(ShortcutBindingSchema),
  })
  .merge(TimestampsSchema);
export type ShortcutProfile = z.infer<typeof ShortcutProfileSchema>;

export const UpdateShortcutsRequestSchema = z.object({
  bindings: z.array(
    z.object({
      id: z.string(),
      keys: z.string().optional(),
      enabled: z.boolean().optional(),
    }),
  ),
});
export type UpdateShortcutsRequest = z.infer<typeof UpdateShortcutsRequestSchema>;

export const ShortcutUsageEventSchema = z.object({
  shortcut_id: z.string(),
  action: z.string(),
  scope: ShortcutScopeSchema,
  page: z.string().max(255),
  timestamp: z.string().datetime(),
});
export type ShortcutUsageEvent = z.infer<typeof ShortcutUsageEventSchema>;

export const ShortcutConflictSchema = z.object({
  binding_a: ShortcutBindingSchema,
  binding_b: ShortcutBindingSchema,
  conflict_type: z.enum(['exact', 'prefix']),
});
export type ShortcutConflict = z.infer<typeof ShortcutConflictSchema>;

export const CommandPaletteItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  shortcut: z.string().optional(),
  category: z.enum(['navigation', 'action', 'search', 'settings']),
  keywords: z.array(z.string()),
  action: z.string(),
});
export type CommandPaletteItem = z.infer<typeof CommandPaletteItemSchema>;

export const FeatureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  variant: z.string().nullable(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const FeatureFlagKeysSchema = z.enum([
  'demo_mode_enabled',
  'advanced_shortcuts_enabled',
  'pip_interview_enabled',
  'ai_assist_enabled',
  'billing_metering_enabled',
]);
export type FeatureFlagKey = z.infer<typeof FeatureFlagKeysSchema>;
