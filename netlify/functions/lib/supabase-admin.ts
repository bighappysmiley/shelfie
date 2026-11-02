import { createClient, type NeonClient, NEON_URL, NEON_AUTH_URL, NEON_DATA_API_URL } from "./supabase";

/**
 * Privileged client for Synk session minting and identity links.
 * Neon Data API has no service-role key; prefer SECURITY DEFINER RPCs.
 * When DATABASE_URL is set, callers that need true bypass should use SQL.
 * Falls back to anonymous Data API access (RLS still applies).
 */
export function supabaseAdmin(): NeonClient {
  const token = process.env.NEON_DATA_API_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (token) {
    return createClient({
      auth: { url: NEON_AUTH_URL, allowAnonymous: true },
      dataApi: {
        url: NEON_DATA_API_URL,
        options: {
          global: {
            fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
              const headers = new Headers(init?.headers);
              headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
        },
      },
    });
  }
  return createClient(NEON_URL, { auth: { allowAnonymous: true } });
}

export function hasServiceRole(): boolean {
  return Boolean(process.env.NEON_DATA_API_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DATABASE_URL);
}
