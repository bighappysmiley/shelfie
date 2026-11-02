import type { Config } from "@netlify/functions";
import { supabaseAnon } from "./lib/supabase";
import { hasServiceRole, supabaseAdmin } from "./lib/supabase-admin";

/**
 * Hourly cleanup of closed support tickets older than 24 hours.
 * Prefer a privileged token when available; otherwise call the SECURITY DEFINER RPC anonymously.
 */
export default async () => {
  const client = hasServiceRole() ? supabaseAdmin() : supabaseAnon();

  const { data, error } = await client.rpc("purge_expired_closed_tickets");
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, deleted: data ?? 0 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  schedule: "0 * * * *",
};
