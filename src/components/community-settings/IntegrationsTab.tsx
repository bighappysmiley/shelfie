import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";
import {
  createServerWebhook,
  deleteServerWebhook,
  listServerWebhooks,
  listWebhookDeliveries,
  pingServerWebhook,
  updateServerWebhook,
  type WebhookDelivery,
} from "@/lib/community";
import type { CommunityServerWebhook } from "@/lib/community-types";

const WEBHOOK_EVENTS = [
  "message.created",
  "member.join",
  "member.leave",
  "member.ban",
  "reaction.added",
  "test.ping",
] as const;

export function IntegrationsTab({
  serverId,
  userId,
  onError,
}: {
  serverId: string;
  userId: string;
  onError: (msg: string) => void;
}) {
  const [webhooks, setWebhooks] = useState<CommunityServerWebhook[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["message.created"]);
  const [busy, setBusy] = useState(false);
  const [deliveries, setDeliveries] = useState<Record<string, WebhookDelivery[]>>({});

  const refresh = async () => {
    try {
      setWebhooks(await listServerWebhooks(serverId));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not load webhooks");
    }
  };

  useEffect(() => {
    void refresh();
  }, [serverId]);

  const loadDeliveries = async (webhookId: string) => {
    try {
      const list = await listWebhookDeliveries(webhookId);
      setDeliveries((prev) => ({ ...prev, [webhookId]: list }));
    } catch {
      /* table may not exist yet */
    }
  };

  const toggleEvent = (event: string) => {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const onCreate = async () => {
    setBusy(true);
    onError("");
    try {
      await createServerWebhook({ serverId, name, url, userId, events });
      setName("");
      setUrl("");
      setEvents(["message.created"]);
      await refresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create webhook");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Webhooks send JSON payloads when events happen in this server. Use them with Zapier,
        Discord bridges, or your own apps.
      </p>

      <div className="space-y-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/30 p-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Message logger" />
        <TextField
          label="Webhook URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.example.com/..."
        />
        <div>
          <p className="mb-2 text-[0.8125rem] font-medium">Events</p>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((event) => (
              <button
                key={event}
                type="button"
                onClick={() => toggleEvent(event)}
                className={`rounded-full px-2.5 py-1 text-[0.75rem] ${
                  events.includes(event)
                    ? "bg-accent text-accent-contrast"
                    : "bg-fill text-muted"
                }`}
              >
                {event}
              </button>
            ))}
          </div>
        </div>
        <Button disabled={busy || !name.trim() || !url.trim() || events.length === 0} onClick={() => void onCreate()}>
          {busy ? "Adding…" : "Add webhook"}
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <p className="text-[0.875rem] text-muted">No webhooks configured.</p>
      ) : (
        <ul className="space-y-2">
          {webhooks.map((hook) => (
            <li
              key={hook.id}
              className="rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{hook.name}</p>
                  <p className="mt-0.5 break-all font-mono text-[0.75rem] text-muted">{hook.url}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-[0.75rem] text-destructive"
                  onClick={async () => {
                    if (!confirm(`Delete webhook “${hook.name}”?`)) return;
                    try {
                      await deleteServerWebhook(hook.id);
                      await refresh();
                    } catch (err) {
                      onError(err instanceof Error ? err.message : "Could not delete");
                    }
                  }}
                >
                  Delete
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={async () => {
                      const next = hook.events.includes(event)
                        ? hook.events.filter((e) => e !== event)
                        : [...hook.events, event];
                      try {
                        await updateServerWebhook(hook.id, { events: next });
                        await refresh();
                      } catch (err) {
                        onError(err instanceof Error ? err.message : "Could not update events");
                      }
                    }}
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${
                      hook.events.includes(event)
                        ? "bg-accent/20 text-accent"
                        : "bg-fill text-muted"
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await pingServerWebhook(hook.id);
                      await loadDeliveries(hook.id);
                    } catch (err) {
                      onError(err instanceof Error ? err.message : "Ping failed");
                    }
                  }}
                >
                  Test ping
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void loadDeliveries(hook.id)}>
                  Delivery log
                </Button>
              </div>
              {(deliveries[hook.id] ?? []).length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-[var(--community-border)] pt-2 text-[0.75rem]">
                  {deliveries[hook.id]!.map((d) => (
                    <li key={d.id} className={d.success ? "text-muted" : "text-destructive"}>
                      {new Date(d.createdAt).toLocaleString()} · {d.event} ·{" "}
                      {d.success ? `OK ${d.statusCode ?? ""}` : d.errorMessage ?? "Failed"}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
