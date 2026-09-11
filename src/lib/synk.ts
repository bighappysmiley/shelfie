/** Client helpers for in-app Synk ID (face / Synk code) sign-in. */

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

/** Kept for deep-link callbacks that still land on /auth/synk with a pass. */
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
