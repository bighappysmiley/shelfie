import type { Config } from "@netlify/functions";
import { json, parseBody } from "./utils";
import { withAuth } from "./lib/auth";
import { getBearerToken } from "./lib/auth";
import { supabaseForToken } from "./lib/supabase";

export const config: Config = {
  path: "/api/community/webhooks",
};

type DispatchBody = {
  serverId: string;
  event: string;
  payload: Record<string, unknown>;
};

export default withAuth(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = getBearerToken(request)!;
  const supabase = supabaseForToken(token);
  const body = await parseBody<DispatchBody>(request);

  if (!body.serverId || !body.event) {
    return json({ error: "serverId and event are required" }, 400);
  }

  const { data: hooks, error: listErr } = await supabase
    .from("community_server_webhooks")
    .select("url, secret, events")
    .eq("server_id", body.serverId);

  if (listErr) {
    return json({ error: listErr.message }, 400);
  }

  const deliveries = (hooks ?? []).filter((hook) => {
    const events = (hook.events as string[] | null) ?? ["message.created"];
    return events.includes(body.event);
  });

  await Promise.allSettled(
    deliveries.map(async (hook) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) headers["X-Pine-Signature"] = String(hook.secret);
      await fetch(String(hook.url), {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: body.event,
          serverId: body.serverId,
          ...body.payload,
        }),
      });
    }),
  );

  return json({ delivered: deliveries.length });
});
