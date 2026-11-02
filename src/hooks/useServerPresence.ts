import { useEffect, useState } from "react";

/**
 * Online presence without Realtime: show the current user as online only.
 * Full multi-user presence requires Neon Realtime (not enabled) or a custom heartbeat table.
 */
export function useServerPresence(serverId: string | undefined, userId: string | undefined) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!serverId || !userId) {
      setOnlineUserIds(new Set());
      return;
    }
    setOnlineUserIds(new Set([userId]));
  }, [serverId, userId]);

  return onlineUserIds;
}
