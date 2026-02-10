import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';

import type { TenantContext } from './tenant-middleware';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
type Subjects =
  | 'User'
  | 'Organization'
  | 'Job'
  | 'Application'
  | 'Scorecard'
  | 'Conversation'
  | 'Message'
  | 'Meeting'
  | 'Billing'
  | 'Notification'
  | 'FeedbackTemplate'
  | 'EvaluationRubric'
  | 'JobTemplate'
  | 'Integration'
  | 'DemoSession'
  | 'FeatureFlag'
  | 'AuditEvent'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(ctx: TenantContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  // Deny-by-default: no explicit `can` = denied
  // All users can read their own profile
  can('read', 'User');
  can('update', 'User');
  can('read', 'Notification');
  can('update', 'Notification');

  switch (ctx.role) {
    case 'admin':
      can('manage', 'all');
      break;

    case 'employer':
      can('create', 'Job');
      can('read', 'Job');
      can('update', 'Job');
      can('delete', 'Job');
      can('read', 'Application');
      can('update', 'Application');
      can('create', 'Scorecard');
      can('read', 'Scorecard');
      can('create', 'Meeting');
      can('read', 'Meeting');
      can('update', 'Meeting');
      can('create', 'Conversation');
      can('read', 'Conversation');
      can('create', 'Message');
      can('read', 'Message');
      can('read', 'Billing');
      can('create', 'FeedbackTemplate');
      can('read', 'FeedbackTemplate');
      can('update', 'FeedbackTemplate');
      can('create', 'EvaluationRubric');
      can('read', 'EvaluationRubric');
      can('update', 'EvaluationRubric');
      can('create', 'JobTemplate');
      can('read', 'JobTemplate');
      can('update', 'JobTemplate');
      can('read', 'Integration');
      can('create', 'Integration');

      // Org-level permissions
      if (ctx.orgRole === 'owner' || ctx.orgRole === 'admin') {
        can('manage', 'Billing');
        can('manage', 'Organization');
        can('delete', 'FeedbackTemplate');
        can('delete', 'EvaluationRubric');
        can('delete', 'JobTemplate');
      }
      break;

    case 'candidate':
      can('read', 'Job');
      can('create', 'Application');
      can('read', 'Application');
      can('update', 'Application'); // withdraw
      can('create', 'Conversation');
      can('read', 'Conversation');
      can('create', 'Message');
      can('read', 'Message');
      can('read', 'Meeting');
      can('update', 'Meeting'); // respond
      cannot('delete', 'Job');
      cannot('create', 'Job');
      cannot('manage', 'Billing');
      break;

    case 'agency':
      can('read', 'Job');
      can('create', 'Application');
      can('read', 'Application');
      can('create', 'Conversation');
      can('read', 'Conversation');
      can('create', 'Message');
      can('read', 'Message');
      can('read', 'Meeting');
      can('create', 'Meeting');
      break;

    default:
      // Unknown role: deny everything beyond base
      break;
  }

  return build();
}

export function assertCan(ability: AppAbility, action: Actions, subject: Subjects): void {
  if (!ability.can(action, subject)) {
    throw new ForbiddenError(`Not authorized to ${action} ${subject}`);
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
