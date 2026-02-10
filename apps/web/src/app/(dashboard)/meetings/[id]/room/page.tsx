'use client';

import React, { use } from 'react';
import { InterviewRoom } from '@/components/interview/InterviewRoom';

export default function InterviewRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: meetingId } = use(params);

  // In production, these would come from session/auth context
  const currentUserId = 'current-user';
  const displayName = 'Current User';

  return (
    <InterviewRoom
      meetingId={meetingId}
      currentUserId={currentUserId}
      displayName={displayName}
    />
  );
}
