/** Lightweight polling replacement for Supabase Realtime channels. */

export type PollHandle = { stop: () => void };

/**
 * Call `tick` immediately, then on an interval until stopped.
 * Returns an unsubscribe function.
 */
export function startPolling(
  tick: () => void | Promise<void>,
  intervalMs = 4000,
): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const run = () => {
    if (stopped) return;
    void Promise.resolve(tick()).catch((err) => {
      console.warn("poll tick failed", err);
    });
  };

  run();
  timer = setInterval(run, intervalMs);

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
    timer = null;
  };
}
