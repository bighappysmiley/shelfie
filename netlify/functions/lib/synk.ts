export type SynkProfile = {
  id: string;
  synkCode: string;
  name: string;
  photoUrl: string;
  policy?: string;
};

export type SynkPassExchangeResult = {
  ok: true;
  product: string;
  app: { id: string; slug: string; name: string };
  profile: SynkProfile;
  pass: { id: string; appSlug: string; purpose: string; expiresAt: string };
};

const DEFAULT_API_BASE = "https://visitor-signin-kiosk.netlify.app";
const DEFAULT_VERIFY_ORIGIN = "https://synkid.netlify.app";

export function synkApiBase(): string {
  return (process.env.SYNK_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function synkVerifyOrigin(): string {
  return (process.env.SYNK_VERIFY_ORIGIN || DEFAULT_VERIFY_ORIGIN).replace(/\/$/, "");
}

export function synkAppSlug(): string {
  return (process.env.SYNK_APP_SLUG || "synk").trim() || "synk";
}

export function synkApiKey(): string {
  return (process.env.SYNK_API_KEY || "").trim();
}

/** Build the hosted Synk ID verify URL that returns a pass to our callback. */
export function buildSynkVerifyUrl(returnUrl: string, mode: "login" | "link" = "login"): string {
  const url = new URL("/verify", synkVerifyOrigin());
  url.searchParams.set("app", synkAppSlug());
  url.searchParams.set("intent", "identity");
  url.searchParams.set("return", returnUrl);
  if (mode === "link") url.searchParams.set("link", "1");
  return url.toString();
}

export async function exchangeSynkPass(
  pass: string,
  assertion?: string,
): Promise<SynkPassExchangeResult> {
  const apiKey = synkApiKey();
  if (!apiKey) {
    throw new SynkError("Synk is not configured on this server (missing SYNK_API_KEY)", 503);
  }

  const body: Record<string, unknown> = { singleUse: true };
  if (pass) body.pass = pass;
  if (assertion) body.assertion = assertion;

  const res = await fetch(`${synkApiBase()}/api/synk-pass`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Synk-Key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    product?: string;
    app?: SynkPassExchangeResult["app"];
    profile?: SynkProfile;
    pass?: SynkPassExchangeResult["pass"];
  };

  if (!res.ok || !data.ok || !data.profile) {
    throw new SynkError(data.error || "Invalid Synk pass", res.status === 401 ? 401 : 400);
  }

  return {
    ok: true,
    product: data.product || "synk",
    app: data.app || { id: "", slug: synkAppSlug(), name: "Synk" },
    profile: {
      id: String(data.profile.id),
      synkCode: String(data.profile.synkCode || ""),
      name: String(data.profile.name || "Synk member"),
      photoUrl: String(data.profile.photoUrl || ""),
      policy: data.profile.policy,
    },
    pass: data.pass || {
      id: "",
      appSlug: synkAppSlug(),
      purpose: "identity",
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    },
  };
}

export function synkSyntheticEmail(profileId: string): string {
  const id = profileId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 32);
  return `synk.${id}@users.synkid.local`;
}

export class SynkError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
