import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { createLibraryServer, joinServerByInviteCode } from "@/lib/community";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { ToggleRow } from "@/components/layout";
import { IconCompass, IconPlus, IconX } from "@/components/Icons";

export function AddServerModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const navigate = useNavigate();
  const { user, isOwner } = useAuth();
  const { activeLibrary } = useLibrary();
  const [mode, setMode] = useState<"menu" | "create" | "invite">("menu");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("menu");
    setError("");
    setInfo("");
    setInvite("");
    setDescription("");
    setIsPublic(false);
    setName(activeLibrary?.name ?? "");
    setBusy(false);
  }, [open, activeLibrary]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !user) return null;

  const canCreate = Boolean(activeLibrary) && (activeLibrary?.role === "owner" || isOwner);
  const libraryName = activeLibrary?.name ?? "library";

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeLibrary) return;
    setBusy(true);
    setError("");
    try {
      const server = await createLibraryServer({
        libraryId: activeLibrary.id,
        name: name.trim(),
        description: description.trim(),
        isPublic,
        userId: user.id,
        isLibraryOwner: activeLibrary.role === "owner",
        isAppOwner: isOwner,
      });
      onClose();
      onDone?.();
      navigate(`/community/s/${server.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
      setBusy(false);
    }
  };

  const submitInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!invite.trim()) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const result = await joinServerByInviteCode(user.id, invite.trim());
      onDone?.();
      if (result.status === "requested") {
        setInfo(`Join request sent to “${result.server.name}”. You’ll get in once a manager approves.`);
        setBusy(false);
        return;
      }
      onClose();
      navigate(`/community/s/${result.server.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-server-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="community-discord-shell flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-bottom,0px)))] w-full max-w-md flex-col rounded-t-2xl bg-[var(--community-panel)] text-foreground shadow-xl sm:max-h-[min(85dvh,40rem)] sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--community-border)] px-5 py-4">
          <h2 id="add-server-modal-title" className="text-[1.125rem] font-semibold text-foreground">
            {mode === "menu" ? "Add a Server" : mode === "create" ? "Create Your Server" : "Join a Server"}
          </h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            <IconX size={18} />
          </button>
        </div>

        <div className="community-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          {mode === "menu" && (
            <div className="space-y-2">
              <p className="mb-3 text-[0.875rem] text-muted">
                Create another server for your library, or enter an invite code.
              </p>
              {canCreate ? (
                <button
                  type="button"
                  onClick={() => {
                    setName(libraryName);
                    setMode("create");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-fill px-4 py-3 text-left transition hover:bg-[var(--community-hover)]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                    <IconPlus size={20} />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">Create My Own</span>
                    <span className="text-[0.75rem] text-muted">
                      Under {libraryName} — you can create as many as you want
                    </span>
                  </span>
                </button>
              ) : (
                <p className="rounded-xl bg-fill px-4 py-3 text-[0.8125rem] text-muted">
                  Only the library owner can create a server for {libraryName}. You can still join with an
                  invite.
                </p>
              )}
              <button
                type="button"
                onClick={() => setMode("invite")}
                className="flex w-full items-center gap-3 rounded-xl bg-fill px-4 py-3 text-left transition hover:bg-[var(--community-hover)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/25 text-accent">
                  <IconCompass size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-foreground">Join a Server</span>
                  <span className="text-[0.75rem] text-muted">Enter an invite code</span>
                </span>
              </button>
            </div>
          )}

          {mode === "create" && (
            <form onSubmit={submitCreate} className="space-y-3">
              <button
                type="button"
                className="text-[0.8125rem] text-muted hover:text-foreground"
                onClick={() => {
                  setMode("menu");
                  setError("");
                }}
              >
                ← Back
              </button>
              <TextField
                label="Server name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
              <TextArea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <ToggleRow
                label="Make public"
                hint="Show in Discover (join mode defaults to Open)"
                checked={isPublic}
                onChange={setIsPublic}
              />
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create"}
              </Button>
            </form>
          )}

          {mode === "invite" && (
            <form onSubmit={submitInvite} className="space-y-3">
              <button
                type="button"
                className="text-[0.8125rem] text-muted hover:text-foreground"
                onClick={() => {
                  setMode("menu");
                  setError("");
                  setInfo("");
                }}
              >
                ← Back
              </button>
              <TextField
                label="Invite code"
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                placeholder="e.g. aB3dE7xY"
                required
                autoFocus
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {info && <p className="text-[0.875rem] text-emerald-400">{info}</p>}
              {error && <FormError message={error} />}
              <Button type="submit" className="w-full" disabled={busy || !invite.trim()}>
                {busy ? "Joining…" : "Join Server"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
