import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSpan('POST /v1/applications/[id]/notes', spanAttributes(req), async () => {
  try {
    const { id: applicationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'update', 'Application');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { organizationId: true } } },
    });

    if (!application) {
      throw new AppError('NOT_FOUND', 'Application not found');
    }

    if (ctx.role !== 'admin' && ctx.org_id !== application.job.organizationId) {
      throw new AppError('FORBIDDEN', 'Not authorized');
    }

    const body = await req.json();
    if (!body.body || typeof body.body !== 'string') {
      throw new AppError('VALIDATION_ERROR', 'body is required');
    }

    const mentionedUserIds: string[] = [];
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = mentionRegex.exec(body.body)) !== null) {
      if (match[2]) mentionedUserIds.push(match[2]);
    }

    const note = await prisma.applicationNote.create({
      data: {
        applicationId,
        authorId: ctx.userId,
        body: body.body,
        mentionedUserIds,
      },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
    });

    return successResponse(req, {
      id: note.id,
      application_id: note.applicationId,
      author: { id: note.author.id, first_name: note.author.firstName, last_name: note.author.lastName },
      body: note.body,
      mentioned_user_ids: note.mentionedUserIds,
      created_at: note.createdAt.toISOString(),
    }, 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSpan('GET /v1/applications/[id]/notes', spanAttributes(req), async () => {
  try {
    const { id: applicationId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Application');

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: { select: { organizationId: true } } },
    });

    if (!application) {
      throw new AppError('NOT_FOUND', 'Application not found');
    }

    if (ctx.role !== 'admin' && ctx.org_id !== application.job.organizationId) {
      throw new AppError('FORBIDDEN', 'Not authorized');
    }

    const notes = await prisma.applicationNote.findMany({
      where: { applicationId },
      include: { author: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(req, {
      data: notes.map((n) => ({
        id: n.id,
        author: { id: n.author.id, first_name: n.author.firstName, last_name: n.author.lastName },
        body: n.body,
        mentioned_user_ids: n.mentionedUserIds,
        created_at: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}
