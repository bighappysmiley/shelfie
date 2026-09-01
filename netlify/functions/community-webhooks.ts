import type { Config } from "@netlify/functions";
import { json, parseBody } from "./utils";
import { withAuth } from "./lib/auth";
import { getBearerToken } from "./lib/auth";
import { supabaseForToken } from "./lib/supabase";

export const config: Config = {
  path: "/api/community/webhooks",
};

type DispatchBody = {
  serverId?: string;
  webhookId?: string;
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

  if (!body.event) {
    return json({ error: "event is required" }, 400);
  }

  let hooks: { id: string; url: string; secret: string | null; events: string[] | null }[] = [];

  if (body.webhookId) {
    const { data, error } = await supabase
      .from("community_server_webhooks")
      .select("id, url, secret, events")
      .eq("id", body.webhookId)
      .maybeSingle();
    if (error || !data) return json({ error: error?.message ?? "Webhook not found" }, 400);
    hooks = [data as typeof hooks[0]];
  } else if (body.serverId) {
    const { data, error: listErr } = await supabase
      .from("community_server_webhooks")
      .select("id, url, secret, events")
      .eq("server_id", body.serverId);
    if (listErr) return json({ error: listErr.message }, 400);
    hooks = (data ?? []) as typeof hooks;
  } else {
    return json({ error: "serverId or webhookId is required" }, 400);
  }

  const deliveries = hooks.filter((hook) => {
    const events = hook.events ?? ["message.created"];
    return events.includes(body.event);
  });

  const results = await Promise.allSettled(
    deliveries.map(async (hook) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hook.secret) headers["X-Pine-Signature"] = String(hook.secret);
      const res = await fetch(String(hook.url), {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: body.event,
          serverId: body.serverId,
          ...body.payload,
        }),
      });

      try {
        await supabase.from("community_webhook_deliveries").insert({
          webhook_id: hook.id,
          event: body.event,
          status_code: res.status,
          success: res.ok,
          error_message: res.ok ? null : `HTTP ${res.status}`,
        });
      } catch {
        /* delivery log table may not exist yet */
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0 && failed === deliveries.length) {
    return json({ error: "All webhook deliveries failed" }, 502);
  }

  return json({ delivered: deliveries.length - failed, failed });
});
