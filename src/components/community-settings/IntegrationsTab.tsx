import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";
import {
  createServerWebhook,
  deleteServerWebhook,
  listServerWebhooks,
} from "@/lib/community";
import type { CommunityServerWebhook } from "@/lib/community-types";

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
  const [busy, setBusy] = useState(false);

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

  const onCreate = async () => {
    setBusy(true);
    onError("");
    try {
      await createServerWebhook({ serverId, name, url, userId });
      setName("");
      setUrl("");
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
        Webhooks send JSON payloads when events happen in this server (e.g. new messages). Use them
        with Zapier, Discord bridges, or your own apps.
      </p>

      <div className="space-y-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/30 p-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Message logger" />
        <TextField
          label="Webhook URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.example.com/..."
        />
        <Button disabled={busy || !name.trim() || !url.trim()} onClick={() => void onCreate()}>
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
              className="flex items-start justify-between gap-3 rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{hook.name}</p>
                <p className="mt-0.5 break-all font-mono text-[0.75rem] text-muted">{hook.url}</p>
                <p className="mt-1 text-[0.6875rem] text-muted">Events: {hook.events.join(", ")}</p>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
