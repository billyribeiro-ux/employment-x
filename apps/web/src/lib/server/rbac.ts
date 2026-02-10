import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import { AppError } from './errors';

type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage';
type Subjects =
  | 'User'
  | 'Organization'
  | 'Job'
  | 'Application'
  | 'Conversation'
  | 'Message'
  | 'Meeting'
  | 'Interview'
  | 'Scorecard'
  | 'Billing'
  | 'AuditEvent'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export interface RbacContext {
  userId: string;
  role: string;
  orgRole?: string | undefined;
  organizationId?: string | undefined;
}

export function defineAbilitiesFor(ctx: RbacContext): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (ctx.role) {
    case 'admin':
      can('manage', 'all');
      break;

    case 'employer':
      can('read', 'User');
      can('update', 'User');
      can('read', 'Organization');
      can('update', 'Organization');
      can('manage', 'Job');
      can('read', 'Application');
      can('update', 'Application');
      can('manage', 'Conversation');
      can('manage', 'Message');
      can('manage', 'Meeting');
      can('manage', 'Interview');
      can('manage', 'Scorecard');
      can('read', 'Billing');
      can('read', 'AuditEvent');

      if (ctx.orgRole) {
        switch (ctx.orgRole) {
          case 'owner':
          case 'admin':
            can('manage', 'Billing');
            can('manage', 'Organization');
            can('manage', 'AuditEvent');
            break;
          case 'recruiter':
            can('manage', 'Application');
            break;
          case 'interviewer':
            can('read', 'Application');
            can('create', 'Scorecard');
            cannot('delete', 'Job');
            cannot('update', 'Billing');
            break;
          case 'viewer':
            cannot('create', 'Job');
            cannot('update', 'Application');
            cannot('delete', 'Application');
            cannot('manage', 'Billing');
            break;
        }
      }
      break;

    case 'candidate':
      can('read', 'User');
      can('update', 'User');
      can('read', 'Job');
      can('create', 'Application');
      can('read', 'Application');
      can('read', 'Conversation');
      can('create', 'Message');
      can('read', 'Message');
      can('read', 'Meeting');
      can('read', 'Interview');
      cannot('manage', 'Organization');
      cannot('manage', 'Billing');
      cannot('manage', 'AuditEvent');
      break;

    case 'agency':
      can('read', 'User');
      can('update', 'User');
      can('read', 'Organization');
      can('read', 'Job');
      can('manage', 'Application');
      can('manage', 'Conversation');
      can('manage', 'Message');
      can('manage', 'Meeting');
      can('manage', 'Interview');
      can('manage', 'Scorecard');
      can('read', 'Billing');
      break;

    default:
      break;
  }

  return build();
}

export function assertCan(ability: AppAbility, action: Actions, subject: Subjects): void {
  if (!ability.can(action, subject)) {
    throw new AppError('FORBIDDEN', `Not authorized to ${action} ${subject}`);
  }
}
