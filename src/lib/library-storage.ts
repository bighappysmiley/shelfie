/** Legacy global key — must not stick across accounts. */
const LEGACY_KEY = "pine-bookkeeping-library-id";
const USER_KEY_PREFIX = "pine-bookkeeping-library-id:";

let boundUserId: string | null = null;
/** Only set after membership validation — used for API headers. */
let activeLibraryId: string | null = null;

function userKey(userId: string) {
  return `${USER_KEY_PREFIX}${userId}`;
}

/**
 * Bind storage to the signed-in user. Call whenever auth user id changes.
 * Clears the legacy global key without copying it into this account.
 * Does not restore a sticky library id into memory — that happens only after
 * the server membership list confirms the id still belongs to this user.
 */
export function bindLibraryStorageUser(userId: string | null) {
  if (boundUserId === userId) return;
  boundUserId = userId;
  activeLibraryId = null;

  // Drop the legacy global key without copying it into this user — that
  // one-shot migration could stick another account's library id onto a
  // newly signed-in ready user.
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Library id for API/offline scoping. Memory only — never read unvalidated
 * sticky ids from localStorage (those can belong to a prior account on this
 * browser until the membership list runs).
 */
export function getActiveLibraryId(): string | null {
  return activeLibraryId;
}

/** Peek at this user's last-chosen library id (may be stale / foreign). */
export function peekStickyLibraryId(userId: string | null | undefined): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(userKey(userId));
  } catch {
    return null;
  }
}

export function setActiveLibraryId(id: string | null) {
  activeLibraryId = id;
  try {
    if (boundUserId) {
      if (id) localStorage.setItem(userKey(boundUserId), id);
      else localStorage.removeItem(userKey(boundUserId));
    }
    // Keep legacy cleared so it cannot resurrect on the next login.
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear in-memory + legacy sticky id on sign-out (keeps per-user prefs). */
export function clearLibraryContext() {
  activeLibraryId = null;
  boundUserId = null;
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return trimmed;
}
