import { describe, it, expect } from 'vitest';

import { defineAbilitiesFor, assertCan, type RbacContext } from '../../src/lib/server/rbac';
import { AppError } from '../../src/lib/server/errors';

// ── Role contexts ──────────────────────────────────────────────────────
const ADMIN: RbacContext = { userId: 'u-admin', role: 'admin' };
const EMPLOYER: RbacContext = { userId: 'u-emp', role: 'employer' };
const EMPLOYER_OWNER: RbacContext = { userId: 'u-emp-owner', role: 'employer', orgRole: 'owner' };
const EMPLOYER_INTERVIEWER: RbacContext = { userId: 'u-emp-int', role: 'employer', orgRole: 'interviewer' };
const EMPLOYER_VIEWER: RbacContext = { userId: 'u-emp-view', role: 'employer', orgRole: 'viewer' };
const CANDIDATE: RbacContext = { userId: 'u-cand', role: 'candidate' };
const AGENCY: RbacContext = { userId: 'u-agency', role: 'agency' };
const UNKNOWN: RbacContext = { userId: 'u-unknown', role: 'guest' };

// ── Helpers ────────────────────────────────────────────────────────────
function canDo(ctx: RbacContext, action: string, subject: string): boolean {
  const ability = defineAbilitiesFor(ctx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ability.can(action as any, subject as any);
}

function assertThrowsForbidden(ctx: RbacContext, action: string, subject: string) {
  const ability = defineAbilitiesFor(ctx);
  expect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    assertCan(ability, action as any, subject as any);
  }).toThrow(AppError);
}

// ── Tests ──────────────────────────────────────────────────────────────
describe('[F-157] RBAC Deny-Path Tests', () => {
  describe('Admin role', () => {
    it('can manage all subjects', () => {
      const subjects = ['User', 'Organization', 'Job', 'Application', 'Conversation', 'Message', 'Meeting', 'Interview', 'Scorecard', 'Billing', 'AuditEvent'];
      for (const subject of subjects) {
        expect(canDo(ADMIN, 'manage', subject)).toBe(true);
        expect(canDo(ADMIN, 'create', subject)).toBe(true);
        expect(canDo(ADMIN, 'read', subject)).toBe(true);
        expect(canDo(ADMIN, 'update', subject)).toBe(true);
        expect(canDo(ADMIN, 'delete', subject)).toBe(true);
      }
    });
  });

  describe('Candidate deny paths', () => {
    it('cannot manage Organization', () => {
      assertThrowsForbidden(CANDIDATE, 'manage', 'Organization');
      assertThrowsForbidden(CANDIDATE, 'create', 'Organization');
      assertThrowsForbidden(CANDIDATE, 'update', 'Organization');
      assertThrowsForbidden(CANDIDATE, 'delete', 'Organization');
    });

    it('cannot manage Billing', () => {
      assertThrowsForbidden(CANDIDATE, 'manage', 'Billing');
      assertThrowsForbidden(CANDIDATE, 'create', 'Billing');
      assertThrowsForbidden(CANDIDATE, 'update', 'Billing');
      assertThrowsForbidden(CANDIDATE, 'delete', 'Billing');
    });

    it('cannot manage AuditEvent', () => {
      assertThrowsForbidden(CANDIDATE, 'manage', 'AuditEvent');
      assertThrowsForbidden(CANDIDATE, 'create', 'AuditEvent');
      assertThrowsForbidden(CANDIDATE, 'update', 'AuditEvent');
      assertThrowsForbidden(CANDIDATE, 'delete', 'AuditEvent');
    });

    it('cannot create or manage Jobs', () => {
      expect(canDo(CANDIDATE, 'create', 'Job')).toBe(false);
      expect(canDo(CANDIDATE, 'update', 'Job')).toBe(false);
      expect(canDo(CANDIDATE, 'delete', 'Job')).toBe(false);
    });

    it('can read Jobs', () => {
      expect(canDo(CANDIDATE, 'read', 'Job')).toBe(true);
    });

    it('can create Applications', () => {
      expect(canDo(CANDIDATE, 'create', 'Application')).toBe(true);
    });

    it('cannot update or delete Applications', () => {
      expect(canDo(CANDIDATE, 'update', 'Application')).toBe(false);
      expect(canDo(CANDIDATE, 'delete', 'Application')).toBe(false);
    });

    it('can read Conversations and Messages but cannot create Conversations', () => {
      expect(canDo(CANDIDATE, 'read', 'Conversation')).toBe(true);
      expect(canDo(CANDIDATE, 'read', 'Message')).toBe(true);
      expect(canDo(CANDIDATE, 'create', 'Message')).toBe(true);
      expect(canDo(CANDIDATE, 'create', 'Conversation')).toBe(false);
    });

    it('can read Meetings but cannot create or manage them', () => {
      expect(canDo(CANDIDATE, 'read', 'Meeting')).toBe(true);
      expect(canDo(CANDIDATE, 'create', 'Meeting')).toBe(false);
      expect(canDo(CANDIDATE, 'update', 'Meeting')).toBe(false);
    });

    it('cannot create or manage Scorecards', () => {
      expect(canDo(CANDIDATE, 'create', 'Scorecard')).toBe(false);
      expect(canDo(CANDIDATE, 'manage', 'Scorecard')).toBe(false);
    });
  });

  describe('Employer (base) deny paths', () => {
    it('can manage Jobs', () => {
      expect(canDo(EMPLOYER, 'create', 'Job')).toBe(true);
      expect(canDo(EMPLOYER, 'read', 'Job')).toBe(true);
      expect(canDo(EMPLOYER, 'update', 'Job')).toBe(true);
      expect(canDo(EMPLOYER, 'delete', 'Job')).toBe(true);
    });

    it('can read and update Applications but not delete', () => {
      expect(canDo(EMPLOYER, 'read', 'Application')).toBe(true);
      expect(canDo(EMPLOYER, 'update', 'Application')).toBe(true);
      expect(canDo(EMPLOYER, 'delete', 'Application')).toBe(false);
    });

    it('can read Billing but not manage', () => {
      expect(canDo(EMPLOYER, 'read', 'Billing')).toBe(true);
      expect(canDo(EMPLOYER, 'manage', 'Billing')).toBe(false);
    });

    it('can read AuditEvent but not manage', () => {
      expect(canDo(EMPLOYER, 'read', 'AuditEvent')).toBe(true);
      expect(canDo(EMPLOYER, 'manage', 'AuditEvent')).toBe(false);
    });
  });

  describe('Employer with orgRole=interviewer deny paths', () => {
    it('cannot delete Jobs', () => {
      expect(canDo(EMPLOYER_INTERVIEWER, 'delete', 'Job')).toBe(false);
    });

    it('cannot update Billing', () => {
      expect(canDo(EMPLOYER_INTERVIEWER, 'update', 'Billing')).toBe(false);
    });

    it('can create Scorecards', () => {
      expect(canDo(EMPLOYER_INTERVIEWER, 'create', 'Scorecard')).toBe(true);
    });

    it('can read Applications', () => {
      expect(canDo(EMPLOYER_INTERVIEWER, 'read', 'Application')).toBe(true);
    });
  });

  describe('Employer with orgRole=viewer deny paths', () => {
    it('cannot create Jobs', () => {
      expect(canDo(EMPLOYER_VIEWER, 'create', 'Job')).toBe(false);
    });

    it('cannot update Applications', () => {
      expect(canDo(EMPLOYER_VIEWER, 'update', 'Application')).toBe(false);
    });

    it('cannot delete Applications', () => {
      expect(canDo(EMPLOYER_VIEWER, 'delete', 'Application')).toBe(false);
    });

    it('cannot manage Billing', () => {
      expect(canDo(EMPLOYER_VIEWER, 'manage', 'Billing')).toBe(false);
    });
  });

  describe('Employer with orgRole=owner grants', () => {
    it('can manage Billing', () => {
      expect(canDo(EMPLOYER_OWNER, 'manage', 'Billing')).toBe(true);
    });

    it('can manage Organization', () => {
      expect(canDo(EMPLOYER_OWNER, 'manage', 'Organization')).toBe(true);
    });

    it('can manage AuditEvent', () => {
      expect(canDo(EMPLOYER_OWNER, 'manage', 'AuditEvent')).toBe(true);
    });
  });

  describe('Agency role', () => {
    it('can manage Applications', () => {
      expect(canDo(AGENCY, 'manage', 'Application')).toBe(true);
    });

    it('can manage Conversations and Messages', () => {
      expect(canDo(AGENCY, 'manage', 'Conversation')).toBe(true);
      expect(canDo(AGENCY, 'manage', 'Message')).toBe(true);
    });

    it('can read Billing but not manage', () => {
      expect(canDo(AGENCY, 'read', 'Billing')).toBe(true);
      expect(canDo(AGENCY, 'manage', 'Billing')).toBe(false);
    });

    it('cannot manage Organization', () => {
      expect(canDo(AGENCY, 'create', 'Organization')).toBe(false);
      expect(canDo(AGENCY, 'update', 'Organization')).toBe(false);
    });

    it('can read Jobs but not create', () => {
      expect(canDo(AGENCY, 'read', 'Job')).toBe(true);
      expect(canDo(AGENCY, 'create', 'Job')).toBe(false);
    });
  });

  describe('Unknown/guest role', () => {
    it('has no permissions at all', () => {
      const subjects = ['User', 'Organization', 'Job', 'Application', 'Conversation', 'Message', 'Meeting', 'Interview', 'Scorecard', 'Billing', 'AuditEvent'];
      const actions = ['create', 'read', 'update', 'delete', 'manage'];
      for (const subject of subjects) {
        for (const action of actions) {
          expect(canDo(UNKNOWN, action, subject)).toBe(false);
        }
      }
    });

    it('assertCan throws FORBIDDEN for any action', () => {
      assertThrowsForbidden(UNKNOWN, 'read', 'User');
      assertThrowsForbidden(UNKNOWN, 'create', 'Job');
      assertThrowsForbidden(UNKNOWN, 'manage', 'Billing');
    });
  });

  describe('assertCan error shape', () => {
    it('throws AppError with code FORBIDDEN', () => {
      const ability = defineAbilitiesFor(CANDIDATE);
      try {
        assertCan(ability, 'manage', 'Billing');
        expect.unreachable('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('FORBIDDEN');
        expect((e as AppError).message).toContain('manage');
        expect((e as AppError).message).toContain('Billing');
      }
    });
  });
});
