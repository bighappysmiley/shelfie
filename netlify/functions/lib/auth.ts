import { createClient, type User } from "@supabase/supabase-js";
import { error, handleOptions } from "../utils";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://xdsnoqckoolwatgwtyfy.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkc25vcWNrb29sd2F0Z3d0eWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMzMzODksImV4cCI6MjEwMzcwOTM4OX0.3Nx7Aq40Tj10-Woc_5gcPUNU23qJWWI8X7kdwKvHXgg";

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization") || request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

export async function requireUser(request: Request): Promise<User> {
  const token = getBearerToken(request);
  if (!token) {
    throw new AuthError("Sign in to continue", 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: authError } = await supabase.auth.getUser(token);
  if (authError || !data.user) {
    throw new AuthError("Session expired. Please sign in again.", 401);
  }
  return data.user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof AuthError) return error(err.message, err.status);
  return null;
}

/** Wrap a handler: OPTIONS passthrough, require auth, map AuthError. */
export function withAuth(
  handler: (request: Request, user: User) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method === "OPTIONS") return handleOptions();
    try {
      const user = await requireUser(request);
      return await handler(request, user);
    } catch (err) {
      const authRes = authErrorResponse(err);
      if (authRes) return authRes;
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      return error(message, 500);
    }
  };
}
