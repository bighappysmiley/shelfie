import { createClient } from "@neon/neon-js/supabase";

/** Neon base URL — SDK derives Auth + Data API endpoints from this. */
export const NEON_URL =
  import.meta.env.VITE_NEON_URL ||
  "https://ep-shy-night-bd768856.c-8.us-east-2.aws.neon.tech/neondb";

export const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  "https://ep-shy-night-bd768856.neonauth.c-8.us-east-2.aws.neon.tech/neondb/auth";

export const NEON_DATA_API_URL =
  import.meta.env.VITE_NEON_DATA_API_URL ||
  "https://ep-shy-night-bd768856.apirest.c-8.us-east-2.aws.neon.tech/neondb/rest/v1";

/** App data + auth client (Supabase-compatible API via Neon Auth adapter). */
export const supabase = createClient(NEON_URL);

export type NeonClient = typeof supabase;
