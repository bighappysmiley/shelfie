import { useEffect, useState } from "react";

/**
 * Voice WebRTC previously used Supabase Realtime broadcast for signalling.
 * Neon Auth/Data API has no Realtime channel API yet — degrade gracefully.
 */
export function useVoiceRtc({
  channelId,
  userId,
  enabled,
  muted,
}: {
  channelId: string;
  userId: string;
  enabled: boolean;
  muted: boolean;
}) {
  void channelId;
  void userId;
  void muted;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams] = useState<Map<string, MediaStream>>(() => new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLocalStream(null);
      setError(null);
      return;
    }
    setError("Voice chat signalling is unavailable after the Neon migration. Text chat still works.");
    setLocalStream(null);
  }, [enabled]);

  return { localStream, remoteStreams, error };
}
