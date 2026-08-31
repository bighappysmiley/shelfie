import type { User } from "@supabase/supabase-js";
import { AuthError, authErrorResponse, getBearerToken } from "./auth";
import { handleOptions } from "../utils";
import { supabaseForToken } from "./supabase";

export type LibraryRole = "owner" | "member";

export interface LibraryContext {
  user: User;
  libraryId: string;
  role: LibraryRole;
  accessToken: string;
}

export function getLibraryId(request: Request): string | null {
  return (
    request.headers.get("X-Library-Id") ||
    request.headers.get("x-library-id") ||
    new URL(request.url).searchParams.get("libraryId")
  );
}

export async function requireLibraryAccess(
  request: Request,
  user: User,
): Promise<LibraryContext> {
  const libraryId = getLibraryId(request);
  if (!libraryId) {
    throw new AuthError("Select a library to continue", 400);
  }

  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new AuthError("Sign in to continue", 401);
  }

  const supabase = supabaseForToken(accessToken);
  const { data, error } = await supabase
    .from("library_members")
    .select("role")
    .eq("library_id", libraryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    throw new AuthError("You do not have access to this library", 403);
  }

  return {
    user,
    libraryId,
    role: data.role as LibraryRole,
    accessToken,
  };
}

export function withLibraryAuth(
  handler: (request: Request, ctx: LibraryContext) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    if (request.method === "OPTIONS") return handleOptions();
    try {
      const { requireUser } = await import("./auth");
      const user = await requireUser(request);
      const ctx = await requireLibraryAccess(request, user);
      return await handler(request, ctx);
    } catch (err) {
      const authRes = authErrorResponse(err);
      if (authRes) return authRes;
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again.";
      const { error } = await import("../utils");
      return error(message, 500);
    }
  };
}
