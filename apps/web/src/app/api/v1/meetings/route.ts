import { type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { handleRouteError, successResponse, AppError } from '@/lib/server/errors';
import { getCorrelationId } from '@/lib/server/correlation';
import { writeAuditEvent } from '@/lib/server/audit';
import { checkUserRateLimit, RATE_LIMITS } from '@/lib/server/rate-limit';
import { defineAbilitiesFor, assertCan } from '@/lib/server/rbac';
import { withSpan, spanAttributes } from '@/lib/server/tracing';
import { prisma } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  return withSpan('POST /v1/meetings', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'create', 'Meeting');
    checkUserRateLimit(ctx.userId, 'scheduling:create', RATE_LIMITS.scheduling);

    const body = await req.json();
    const {
      title, description, scheduled_start_at, scheduled_end_at,
      timezone, application_id, participants,
    } = body;

    if (!title || !scheduled_start_at || !scheduled_end_at || !participants?.length) {
      throw new AppError('VALIDATION_ERROR', 'Missing required fields: title, scheduled_start_at, scheduled_end_at, participants');
    }

    const startAt = new Date(scheduled_start_at);
    const endAt = new Date(scheduled_end_at);
    if (startAt <= new Date()) {
      throw new AppError('VALIDATION_ERROR', 'Start time must be in the future');
    }
    if (endAt <= startAt) {
      throw new AppError('VALIDATION_ERROR', 'End time must be after start time');
    }

    const joinOpen = new Date(startAt.getTime() - 10 * 60 * 1000);
    const joinClose = new Date(endAt.getTime() + 5 * 60 * 1000);

    const meeting = await prisma.meeting.create({
      data: {
        tenantId: ctx.tenantId,
        organizationId: ctx.tenantId,
        applicationId: application_id ?? null,
        title,
        description: description ?? null,
        timezone: timezone ?? 'UTC',
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
        joinWindowOpenAt: joinOpen,
        joinWindowCloseAt: joinClose,
        status: 'REQUESTED',
        createdByUserId: ctx.userId,
        providerRoomName: null,
        participants: {
          create: (participants as Array<{ user_id: string; role: string }>).map((p) => ({
            tenantId: ctx.tenantId,
            userId: p.user_id,
            role: p.role as 'HOST' | 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER' | 'RECRUITER',
          })),
        },
        events: {
          create: { tenantId: ctx.tenantId, actorUserId: ctx.userId, type: 'REQUEST_CREATED' },
        },
      },
      include: { participants: true },
    });

    // Set deterministic room name
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { providerRoomName: `t_${ctx.tenantId}_m_${meeting.id}` },
    });

    await writeAuditEvent(
      { tenantId: ctx.tenantId, userId: ctx.userId, role: ctx.role },
      { action: 'meeting.create', resourceType: 'meeting', resourceId: meeting.id, correlationId: getCorrelationId(req) },
    );

    return successResponse(req, mapMeetingResponse(meeting), 201);
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

export async function GET(req: NextRequest) {
  return withSpan('GET /v1/meetings', spanAttributes(req), async () => {
  try {
    const ctx = await authenticateRequest(req.headers.get('authorization'));
    const ability = defineAbilitiesFor({ userId: ctx.userId, role: ctx.role, orgRole: ctx.org_role ?? undefined });
    assertCan(ability, 'read', 'Meeting');
    const url = new URL(req.url);
    const status = url.searchParams.get('status');

    const meetings = await prisma.meeting.findMany({
      where: {
        tenantId: ctx.tenantId,
        participants: { some: { userId: ctx.userId } },
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { scheduledStartAt: 'asc' },
      take: 50,
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return successResponse(req, { data: meetings.map(mapMeetingResponse) });
  } catch (err) {
    return handleRouteError(req, err);
  }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMeetingResponse(m: any) {
  return {
    id: m.id,
    tenant_id: m.tenantId,
    organization_id: m.organizationId,
    application_id: m.applicationId,
    title: m.title,
    description: m.description,
    timezone: m.timezone,
    scheduled_start_at: m.scheduledStartAt?.toISOString() ?? null,
    scheduled_end_at: m.scheduledEndAt?.toISOString() ?? null,
    join_window_open_at: m.joinWindowOpenAt?.toISOString() ?? null,
    join_window_close_at: m.joinWindowCloseAt?.toISOString() ?? null,
    status: m.status,
    provider_room_name: m.providerRoomName,
    created_by_user_id: m.createdByUserId,
    ended_at: m.endedAt?.toISOString() ?? null,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
    participants: m.participants?.map((p: any) => ({
      user_id: p.userId,
      role: p.role,
      attendance_status: p.attendanceStatus,
      user: p.user ? { id: p.user.id, first_name: p.user.firstName, last_name: p.user.lastName } : undefined,
    })),
  };
}
