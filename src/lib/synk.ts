/** Client helpers for Synk ID (face / Synk code) sign-in. */

const VERIFY_ORIGIN = (
  import.meta.env.VITE_SYNK_VERIFY_ORIGIN || "https://synkid.netlify.app"
).replace(/\/$/, "");

const APP_SLUG = (import.meta.env.VITE_SYNK_APP_SLUG || "synk").trim() || "synk";

export type SynkIdentityStatus = {
  linked: boolean;
  identity: {
    synkProfileId: string;
    synkCode: string | null;
    displayName: string | null;
    photoUrl: string | null;
    linkedAt?: string;
  } | null;
};

export function buildSynkVerifyUrl(returnUrl: string): string {
  const url = new URL("/verify", VERIFY_ORIGIN);
  url.searchParams.set("app", APP_SLUG);
  url.searchParams.set("intent", "identity");
  url.searchParams.set("return", returnUrl);
  return url.toString();
}

/** Redirect browser to Synk ID verify, then back to /auth/synk. */
export function startSynkSignIn(): void {
  const returnUrl = `${window.location.origin}/auth/synk`;
  window.location.assign(buildSynkVerifyUrl(returnUrl));
}

/** Redirect to Synk ID verify for linking an existing signed-in account. */
export function startSynkLink(): void {
  const returnUrl = `${window.location.origin}/auth/synk?mode=link`;
  window.location.assign(buildSynkVerifyUrl(returnUrl));
}

export function readSynkPassFromUrl(href = window.location.href): {
  pass: string | null;
  assertion: string | null;
  mode: "signin" | "link";
} {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const pass =
    url.searchParams.get("synk_pass") ||
    url.searchParams.get("pass") ||
    hash.get("synk_pass") ||
    hash.get("pass");
  const assertion =
    url.searchParams.get("synk_assertion") ||
    url.searchParams.get("assertion") ||
    hash.get("synk_assertion") ||
    hash.get("assertion");
  const mode = url.searchParams.get("mode") === "link" ? "link" : "signin";
  return { pass, assertion, mode };
}
