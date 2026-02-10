import { describe, it, expect } from 'vitest';
import {
  isJoinWindowOpen,
  canTransitionStatus,
  canEndMeeting,
  canJoinMeeting,
} from '@/lib/validation/video';

describe('Join Window Validator', () => {
  it('returns true when now is within the join window', () => {
    const open = new Date('2026-01-01T09:50:00Z');
    const close = new Date('2026-01-01T11:05:00Z');
    const now = new Date('2026-01-01T10:00:00Z');
    expect(isJoinWindowOpen(open, close, now)).toBe(true);
  });

  it('returns false when now is before the join window', () => {
    const open = new Date('2026-01-01T09:50:00Z');
    const close = new Date('2026-01-01T11:05:00Z');
    const now = new Date('2026-01-01T09:00:00Z');
    expect(isJoinWindowOpen(open, close, now)).toBe(false);
  });

  it('returns false when now is after the join window', () => {
    const open = new Date('2026-01-01T09:50:00Z');
    const close = new Date('2026-01-01T11:05:00Z');
    const now = new Date('2026-01-01T12:00:00Z');
    expect(isJoinWindowOpen(open, close, now)).toBe(false);
  });

  it('returns true at exact open boundary', () => {
    const open = new Date('2026-01-01T09:50:00Z');
    const close = new Date('2026-01-01T11:05:00Z');
    expect(isJoinWindowOpen(open, close, open)).toBe(true);
  });

  it('returns true at exact close boundary', () => {
    const open = new Date('2026-01-01T09:50:00Z');
    const close = new Date('2026-01-01T11:05:00Z');
    expect(isJoinWindowOpen(open, close, close)).toBe(true);
  });
});

describe('Status Transition Rules', () => {
  it('allows DRAFT -> REQUESTED', () => {
    expect(canTransitionStatus('DRAFT', 'REQUESTED')).toBe(true);
  });

  it('allows REQUESTED -> CONFIRMED', () => {
    expect(canTransitionStatus('REQUESTED', 'CONFIRMED')).toBe(true);
  });

  it('allows REQUESTED -> DENIED', () => {
    expect(canTransitionStatus('REQUESTED', 'DENIED')).toBe(true);
  });

  it('allows CONFIRMED -> IN_PROGRESS', () => {
    expect(canTransitionStatus('CONFIRMED', 'IN_PROGRESS')).toBe(true);
  });

  it('allows IN_PROGRESS -> COMPLETED', () => {
    expect(canTransitionStatus('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('denies COMPLETED -> anything', () => {
    expect(canTransitionStatus('COMPLETED', 'IN_PROGRESS')).toBe(false);
    expect(canTransitionStatus('COMPLETED', 'CANCELED')).toBe(false);
  });

  it('denies CANCELED -> anything', () => {
    expect(canTransitionStatus('CANCELED', 'REQUESTED')).toBe(false);
  });

  it('denies DRAFT -> COMPLETED (skip states)', () => {
    expect(canTransitionStatus('DRAFT', 'COMPLETED')).toBe(false);
  });

  it('allows CONFIRMED -> RESCHEDULE_REQUESTED', () => {
    expect(canTransitionStatus('CONFIRMED', 'RESCHEDULE_REQUESTED')).toBe(true);
  });

  it('allows RESCHEDULE_REQUESTED -> CONFIRMED', () => {
    expect(canTransitionStatus('RESCHEDULE_REQUESTED', 'CONFIRMED')).toBe(true);
  });
});

describe('Role Permission Checks', () => {
  it('HOST can end meeting', () => {
    expect(canEndMeeting('HOST')).toBe(true);
  });

  it('INTERVIEWER can end meeting', () => {
    expect(canEndMeeting('INTERVIEWER')).toBe(true);
  });

  it('RECRUITER can end meeting', () => {
    expect(canEndMeeting('RECRUITER')).toBe(true);
  });

  it('CANDIDATE cannot end meeting', () => {
    expect(canEndMeeting('CANDIDATE')).toBe(false);
  });

  it('OBSERVER cannot end meeting', () => {
    expect(canEndMeeting('OBSERVER')).toBe(false);
  });
});

describe('canJoinMeeting', () => {
  const open = new Date('2026-01-01T09:50:00Z');
  const close = new Date('2026-01-01T11:05:00Z');
  const inWindow = new Date('2026-01-01T10:00:00Z');
  const outWindow = new Date('2026-01-01T08:00:00Z');

  it('allows join for CONFIRMED meeting in window', () => {
    expect(canJoinMeeting('CONFIRMED', open, close, inWindow)).toBe(true);
  });

  it('allows join for IN_PROGRESS meeting in window', () => {
    expect(canJoinMeeting('IN_PROGRESS', open, close, inWindow)).toBe(true);
  });

  it('denies join for CONFIRMED meeting outside window', () => {
    expect(canJoinMeeting('CONFIRMED', open, close, outWindow)).toBe(false);
  });

  it('denies join for DRAFT meeting', () => {
    expect(canJoinMeeting('DRAFT', open, close, inWindow)).toBe(false);
  });

  it('denies join for COMPLETED meeting', () => {
    expect(canJoinMeeting('COMPLETED', open, close, inWindow)).toBe(false);
  });

  it('denies join for CANCELED meeting', () => {
    expect(canJoinMeeting('CANCELED', open, close, inWindow)).toBe(false);
  });
});
