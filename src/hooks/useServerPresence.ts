import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/** Track which users are currently viewing this server (Supabase presence). */
export function useServerPresence(serverId: string | undefined, userId: string | undefined) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!serverId || !userId) {
      setOnlineUserIds(new Set());
      return;
    }

    const channel = supabase
      .channel(`server-presence:${serverId}`, { config: { presence: { key: userId } } })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUserIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online: true });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [serverId, userId]);

  return onlineUserIds;
}
