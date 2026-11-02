import { createClient } from "@neon/neon-js/supabase";

export { createClient };

export const NEON_URL =
  process.env.NEON_URL ||
  process.env.VITE_NEON_URL ||
  "https://ep-shy-night-bd768856.c-8.us-east-2.aws.neon.tech/neondb";

export const NEON_AUTH_URL =
  process.env.NEON_AUTH_URL ||
  process.env.VITE_NEON_AUTH_URL ||
  "https://ep-shy-night-bd768856.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth";

export const NEON_DATA_API_URL =
  process.env.NEON_DATA_API_URL ||
  process.env.VITE_NEON_DATA_API_URL ||
  "https://ep-shy-night-bd768856.apirest.c-8.us-east-2.aws.neon.tech/neondb/rest/v1";

/** @deprecated Use NEON_URL — kept for gradual rename in callers. */
export const SUPABASE_URL = NEON_URL;
/** @deprecated Neon Auth does not use an anon JWT key. */
export const SUPABASE_ANON_KEY = "";

export type NeonClient = ReturnType<typeof createClient>;
/** @deprecated Alias for NeonClient. */
export type SupabaseClient = NeonClient;

function clientWithBearer(accessToken: string | null): NeonClient {
  if (!accessToken) {
    return createClient(NEON_URL, { auth: { allowAnonymous: true } });
  }
  return createClient({
    auth: { url: NEON_AUTH_URL, allowAnonymous: true },
    dataApi: {
      url: NEON_DATA_API_URL,
      options: {
        global: {
          fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
            const headers = new Headers(init?.headers);
            headers.set("Authorization", `Bearer ${accessToken}`);
            return fetch(input, { ...init, headers });
          },
        },
      },
    },
  });
}

/** Neon client authenticated as the requesting user (RLS applies). */
export function supabaseForToken(accessToken: string): NeonClient {
  return clientWithBearer(accessToken);
}

/** Anonymous client (for public RPCs such as Synk link checks). */
export function supabaseAnon(): NeonClient {
  return createClient(NEON_URL, { auth: { allowAnonymous: true } });
}
