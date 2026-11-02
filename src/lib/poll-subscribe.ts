import { startPolling } from "./poll";

/** Polling stand-in for postgres_changes INSERT/UPDATE subscriptions. */
export function subscribeWithPolling(
  onChange: () => void,
  intervalMs = 4000,
): () => void {
  return startPolling(onChange, intervalMs);
}
