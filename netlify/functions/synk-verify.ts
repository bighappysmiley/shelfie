import type { Config } from "@netlify/functions";
import { json, error, handleOptions, parseBody } from "./utils";
import { synkApiBase, synkAppSlug, SynkError } from "./lib/synk";

type VerifyBody = {
  descriptors?: number[][];
  descriptor?: number[];
  synkCode?: string;
  synkId?: string;
  name?: string;
  dateOfBirth?: string;
  secret?: string;
};

/**
 * Proxies in-app Synk face/code verification to Synk's public /api/synk-auth.
 * Avoids browser CORS and keeps the user inside Shelfie (no redirect to synkid.netlify.app).
 */
export default async (req: Request) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  try {
    const body = await parseBody<VerifyBody>(req);
    const payload: Record<string, unknown> = {
      appSlug: synkAppSlug(),
      intent: "identity",
      staySignedIn: false,
    };

    if (Array.isArray(body.descriptors) && body.descriptors.length) {
      payload.descriptors = body.descriptors;
    } else if (Array.isArray(body.descriptor) && body.descriptor.length) {
      payload.descriptor = body.descriptor;
    } else {
      const synkCode = String(body.synkCode || body.synkId || body.name || "").trim();
      const dateOfBirth = String(body.dateOfBirth || "").trim();
      const secret = String(body.secret || "").trim();
      if (!synkCode || !dateOfBirth || !secret) {
        return error("Provide face scan or Synk code, date of birth, and recovery passphrase", 400);
      }
      payload.synkCode = synkCode;
      payload.dateOfBirth = dateOfBirth;
      payload.secret = secret;
    }

    const res = await fetch(`${synkApiBase()}/api/synk-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      ok?: boolean;
      method?: string;
      profile?: {
        id?: string;
        synkCode?: string;
        name?: string;
        photoUrl?: string;
      };
      pass?: {
        token?: string;
        assertion?: string;
        expiresAt?: string;
      };
    };

    if (!res.ok || !data.ok || !data.pass?.token) {
      return error(data.error || "Verification failed", res.status === 401 ? 401 : 400);
    }

    return json({
      ok: true,
      method: data.method || null,
      synk_pass: data.pass.token,
      synk_assertion: data.pass.assertion || null,
      profile: {
        id: data.profile?.id || null,
        synkCode: data.profile?.synkCode || null,
        name: data.profile?.name || null,
        photoUrl: data.profile?.photoUrl || null,
      },
    });
  } catch (err) {
    if (err instanceof SynkError) return error(err.message, err.status);
    const message = err instanceof Error ? err.message : "Synk verify failed";
    console.error("synk-verify error:", message);
    return error(message, 500);
  }
};

export const config: Config = {
  path: "/api/synk-verify",
};
