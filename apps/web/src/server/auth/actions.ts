'use server';

import { hash, compare } from 'bcryptjs';
import { z } from 'zod';
import crypto from 'crypto';

import { prisma } from '@/lib/server/db';
import { writeAuditEvent } from '@/lib/server/audit';
import { logger } from '@/server/observability/logger';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRY_HOURS = 1;

// --- Registration ---

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['candidate', 'employer']),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export async function registerUser(input: RegisterInput) {
  const log = logger.child({ action: 'register', email: input.email });
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten().fieldErrors };
  }

  const { email, password, firstName, lastName, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    log.warn('Registration attempt with existing email');
    return { success: false as const, error: { email: ['Email already registered'] } };
  }

  const passwordHash = await hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
    },
  });

  await writeAuditEvent(
    { tenantId: user.id, userId: user.id, role: user.role },
    { action: 'auth.register', resourceType: 'user', resourceId: user.id },
  );

  log.info({ userId: user.id }, 'User registered');

  return {
    success: true as const,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
  };
}

// --- Password Reset Request ---

const RequestResetSchema = z.object({
  email: z.string().email(),
});

export async function requestPasswordReset(input: z.infer<typeof RequestResetSchema>) {
  const log = logger.child({ action: 'request_password_reset' });
  const parsed = RequestResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Invalid email' };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  // Always return success to prevent email enumeration
  if (!user) {
    log.info('Password reset requested for non-existent email');
    return { success: true as const };
  }

  // Invalidate existing tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  // In production: enqueue email job with reset link containing `token`
  // For now, log the token (NEVER do this in production)
  log.info({ userId: user.id, tokenPreview: token.slice(0, 8) + '...' }, 'Password reset token created');

  await writeAuditEvent(
    { tenantId: user.organizationId ?? user.id, userId: user.id, role: user.role },
    { action: 'auth.password_reset', resourceType: 'user', resourceId: user.id },
  );

  return { success: true as const };
}

// --- Password Reset Confirm ---

const ConfirmResetSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(12, 'Password must be at least 12 characters'),
});

export async function confirmPasswordReset(input: z.infer<typeof ConfirmResetSchema>) {
  const log = logger.child({ action: 'confirm_password_reset' });
  const parsed = ConfirmResetSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: 'Invalid input' };
  }

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');

  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token: tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!resetToken) {
    log.warn('Invalid or expired password reset token');
    return { success: false as const, error: 'Invalid or expired reset token' };
  }

  const passwordHash = await hash(parsed.data.newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all sessions for security
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);

  log.info({ userId: resetToken.userId }, 'Password reset confirmed');

  return { success: true as const };
}

// --- Validate credentials (used by Auth.js internally, exported for testing) ---

export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
  };
}
