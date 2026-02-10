import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

import { prisma } from './db';
import { AppError } from './errors';
import { type TenantContext } from './tenancy';

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me';
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000;

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  org_id: string | null;
  org_role: string | null;
}

function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token');
  }
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'candidate' | 'employer';
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}): Promise<TokenPair & { user_id: string }> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('CONFLICT', 'Email already registered');
  }

  if (data.password.length < 12) {
    throw new AppError('VALIDATION_ERROR', 'Password must be at least 12 characters');
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    },
  });

  const membership = await getOrgMembership(user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    org_id: user.organizationId,
    org_role: membership?.role ?? null,
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: randomUUID(),
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  return {
    access_token: accessToken,
    refresh_token: session.token,
    user_id: user.id,
  };
}

export async function loginUser(data: {
  email: string;
  password: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}): Promise<TokenPair & { user_id: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password');
  }

  const membership = await getOrgMembership(user.id);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    org_id: user.organizationId,
    org_role: membership?.role ?? null,
  });

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: randomUUID(),
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
    },
  });

  return {
    access_token: accessToken,
    refresh_token: session.token,
    user_id: user.id,
  };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token: refreshToken } });
}

export interface AuthenticatedContext extends TenantContext {
  sub: string;
  email: string;
  org_id: string | null;
  org_role: string | null;
}

export async function authenticateRequest(authHeader: string | null): Promise<AuthenticatedContext> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization header');
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);

  return {
    tenantId: payload.org_id ?? payload.sub,
    userId: payload.sub,
    role: payload.role,
    sub: payload.sub,
    email: payload.email,
    org_id: payload.org_id,
    org_role: payload.org_role,
  };
}

export async function requestPasswordReset(email: string): Promise<{ token: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { token: '' };
  }

  const token = randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRES_MS),
    },
  });

  return { token };
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (newPassword.length < 12) {
    throw new AppError('VALIDATION_ERROR', 'Password must be at least 12 characters');
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken) {
    throw new AppError('NOT_FOUND', 'Invalid or expired reset token');
  }

  if (resetToken.usedAt) {
    throw new AppError('CONFLICT', 'Reset token already used');
  }

  if (resetToken.expiresAt < new Date()) {
    throw new AppError('UNAUTHORIZED', 'Reset token expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({
      where: { userId: resetToken.userId },
    }),
  ]);
}

async function getOrgMembership(userId: string) {
  return prisma.orgMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export { verifyAccessToken };
