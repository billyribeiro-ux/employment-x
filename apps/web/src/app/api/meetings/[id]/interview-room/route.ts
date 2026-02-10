import { NextResponse, type NextRequest } from 'next/server';

import { authenticateRequest } from '@/lib/server/auth';
import { getMeetingForRoom } from '@/server/services/meeting-access.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: meetingId } = await params;
    const ctx = await authenticateRequest(req.headers.get('authorization'));

    const roomData = await getMeetingForRoom(ctx.userId, ctx.tenantId, meetingId);
    if (!roomData) {
      return NextResponse.json({ error: 'Meeting not found or not a participant' }, { status: 404 });
    }

    return NextResponse.json(roomData);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
