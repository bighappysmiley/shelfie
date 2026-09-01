import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type SignalPayload = {
  from: string;
  type: "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

/**
 * Basic WebRTC voice mesh using Supabase broadcast for signalling.
 * Suitable for small voice lounges; production would add TURN and quality controls.
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
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const broadcast = useCallback((payload: SignalPayload) => {
    void channelRef.current?.send({
      type: "broadcast",
      event: "voice-signal",
      payload,
    });
  }, []);

  const createPeer = useCallback(
    async (remoteId: string, initiator: boolean) => {
      if (remoteId === userId || peersRef.current.has(remoteId)) return;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peersRef.current.set(remoteId, pc);

      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          pc.addTrack(track, stream);
        }
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          broadcast({ from: userId, type: "ice", candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        const [remote] = e.streams;
        if (!remote) return;
        setRemoteStreams((prev) => new Map(prev).set(remoteId, remote));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          peersRef.current.delete(remoteId);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(remoteId);
            return next;
          });
        }
      };

      if (initiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        broadcast({ from: userId, type: "offer", sdp: offer });
      }
    },
    [broadcast, userId],
  );

  const handleSignal = useCallback(
    async (payload: SignalPayload) => {
      if (payload.from === userId) return;
      let pc = peersRef.current.get(payload.from);
      if (!pc && payload.type === "offer") {
        await createPeer(payload.from, false);
        pc = peersRef.current.get(payload.from);
      }
      if (!pc) return;

      if (payload.type === "offer" && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcast({ from: userId, type: "answer", sdp: answer });
      } else if (payload.type === "answer" && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
      } else if (payload.type === "ice" && payload.candidate) {
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* ignore stale ICE */
        }
      }
    },
    [broadcast, createPeer, userId],
  );

  useEffect(() => {
    if (!enabled) {
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStreams(new Map());
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setError(null);
      } catch {
        setError("Microphone access is required for voice chat.");
        return;
      }

      const ch = supabase.channel(`voice-rtc:${channelId}`, {
        config: { broadcast: { self: false } },
      });

      ch.on("broadcast", { event: "voice-signal" }, ({ payload }) => {
        void handleSignal(payload as SignalPayload);
      })
        .on("presence", { event: "join" }, ({ key }) => {
          if (key && key !== userId) void createPeer(key, true);
        })
        .on("presence", { event: "leave" }, ({ key }) => {
          if (!key) return;
          const pc = peersRef.current.get(key);
          pc?.close();
          peersRef.current.delete(key);
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(key);
            return next;
          });
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await ch.track({ userId, online_at: new Date().toISOString() });
          }
        });

      channelRef.current = ch;
    })();

    return () => {
      cancelled = true;
      for (const pc of peersRef.current.values()) pc.close();
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, createPeer, enabled, handleSignal, userId]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    for (const track of stream.getAudioTracks()) {
      track.enabled = !muted;
    }
  }, [muted, localStream]);

  return { localStream, remoteStreams, error };
}
