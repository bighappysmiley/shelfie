import type { User } from "@supabase/auth-js";
import { error, handleOptions } from "../utils";
import { supabaseAnon } from "./supabase";

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

  const neon = supabaseAnon();
  const { data, error: authError } = await neon.auth.getUser(token);
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
