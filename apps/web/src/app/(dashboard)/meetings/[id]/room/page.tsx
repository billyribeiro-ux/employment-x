import { InterviewRoom } from '@/components/interview/InterviewRoom';
import { getEnv } from '@/lib/env';

export default async function InterviewRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: meetingId } = await params;
  const env = getEnv();

  return (
    <main className="h-screen">
      <InterviewRoom
        meetingId={meetingId}
        livekitUrl={env.LIVEKIT_URL}
        displayName="Current User"
      />
    </main>
  );
}
