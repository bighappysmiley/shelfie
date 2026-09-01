/** Notify CommunityDiscordShell to reload the server rail. */
export function bumpCommunityRail() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("community-rail-refresh"));
  }
}
