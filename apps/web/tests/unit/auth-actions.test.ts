import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/server/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      deleteMany: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

// Mock audit
vi.mock('@/lib/server/audit', () => ({
  writeAuditEvent: vi.fn(),
}));

// Mock logger
vi.mock('@/server/observability/logger', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { prisma } from '@/lib/server/db';

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('F-001: Registration', () => {
    it('rejects invalid email', async () => {
      const { registerUser } = await import('@/server/auth/actions');
      const result = await registerUser({
        email: 'not-an-email',
        password: 'securepassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'candidate',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', async () => {
      const { registerUser } = await import('@/server/auth/actions');
      const result = await registerUser({
        email: 'test@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
        role: 'candidate',
      });
      expect(result.success).toBe(false);
    });

    it('rejects duplicate email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'existing-id',
        email: 'test@example.com',
      } as never);

      const { registerUser } = await import('@/server/auth/actions');
      const result = await registerUser({
        email: 'test@example.com',
        password: 'securepassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'candidate',
      });
      expect(result.success).toBe(false);
    });

    it('creates user with valid input', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.user.create).mockResolvedValueOnce({
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'candidate',
        organizationId: null,
      } as never);

      const { registerUser } = await import('@/server/auth/actions');
      const result = await registerUser({
        email: 'new@example.com',
        password: 'securepassword123',
        firstName: 'New',
        lastName: 'User',
        role: 'candidate',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.email).toBe('new@example.com');
      }
    });

    it('rejects invalid role', async () => {
      const { registerUser } = await import('@/server/auth/actions');
      const result = await registerUser({
        email: 'test@example.com',
        password: 'securepassword123',
        firstName: 'Test',
        lastName: 'User',
        role: 'hacker' as never,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('F-151: Password Reset', () => {
    it('returns success even for non-existent email (anti-enumeration)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const { requestPasswordReset } = await import('@/server/auth/actions');
      const result = await requestPasswordReset({ email: 'nobody@example.com' });
      expect(result.success).toBe(true);
    });

    it('creates reset token for existing user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-id',
        email: 'user@example.com',
        role: 'candidate',
        organizationId: null,
      } as never);
      vi.mocked(prisma.passwordResetToken.updateMany).mockResolvedValueOnce({ count: 0 } as never);
      vi.mocked(prisma.passwordResetToken.create).mockResolvedValueOnce({
        id: 'token-id',
      } as never);

      const { requestPasswordReset } = await import('@/server/auth/actions');
      const result = await requestPasswordReset({ email: 'user@example.com' });
      expect(result.success).toBe(true);
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('rejects invalid token on confirm', async () => {
      vi.mocked(prisma.passwordResetToken.findFirst).mockResolvedValueOnce(null);

      const { confirmPasswordReset } = await import('@/server/auth/actions');
      const result = await confirmPasswordReset({
        token: 'invalid-token',
        newPassword: 'newsecurepassword123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short new password on confirm', async () => {
      const { confirmPasswordReset } = await import('@/server/auth/actions');
      const result = await confirmPasswordReset({
        token: 'some-token',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('F-002: Login validation', () => {
    it('returns null for non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const { validateCredentials } = await import('@/server/auth/actions');
      const result = await validateCredentials('nobody@example.com', 'password123456');
      expect(result).toBeNull();
    });
  });
});
