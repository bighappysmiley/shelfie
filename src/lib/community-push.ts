const PUSH_PROMPT_KEY = "shelfie:community-push-prompted";

export async function registerCommunityPush(userId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return true;

    // VAPID keys would be configured server-side for production push.
    // Store intent locally so prefs can reference push being enabled.
    localStorage.setItem(`${PUSH_PROMPT_KEY}:${userId}`, "1");
    return true;
  } catch {
    return false;
  }
}

export function showCommunityMentionNotification(title: string, body: string, onClick?: () => void) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;

  const n = new Notification(title, { body, icon: "/icons/icon-192.png" });
  if (onClick) {
    n.onclick = () => {
      window.focus();
      onClick();
      n.close();
    };
  }
}

export function isCommunityPushEnabled(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`${PUSH_PROMPT_KEY}:${userId}`) === "1";
}
