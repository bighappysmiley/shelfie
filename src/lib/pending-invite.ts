const STORAGE_KEY = "pine-pending-invite";

export function storePendingInvite(inviteId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, inviteId);
  } catch {
    /* ignore */
  }
}

export function getPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function captureInviteFromUrl() {
  if (typeof window === "undefined") return;
  const invite = new URLSearchParams(window.location.search).get("invite");
  if (invite) storePendingInvite(invite);
}
