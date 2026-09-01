import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  createServerRole,
  deleteServer,
  deleteServerRole,
  getServer,
  listServerRoles,
  updateServer,
  updateServerRole,
  uploadCommunityImage,
} from "@/lib/community";
import type { CommunityServer, CommunityServerRole } from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { EmptyState, PageHeader, SegmentedControl, ToggleRow } from "@/components/layout";
import { AuthedImage } from "@/components/AuthedImage";
import { IconPlus } from "@/components/Icons";

type SettingsTab = "overview" | "roles" | "danger";

export function CommunityServerSettingsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const { libraries } = useLibrary();

  const [server, setServer] = useState<CommunityServer | null>(null);
  const [roles, setRoles] = useState<CommunityServerRole[]>([]);
  const [tab, setTab] = useState<SettingsTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);

  const library = libraries.find((l) => l.id === server?.libraryId);
  const canManage = Boolean(isOwner || library?.role === "owner");

  const refresh = useCallback(async () => {
    if (!serverId) return;
    setError("");
    try {
      const [s, r] = await Promise.all([getServer(serverId), listServerRoles(serverId)]);
      if (!s) throw new Error("Server not found");
      setServer(s);
      setRoles(r);
      setName(s.name);
      setDescription(s.description ?? "");
      setIconUrl(s.iconUrl);
      setIsPublic(s.isPublic);
      setIsOfficial(s.isOfficial);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!serverId) {
    return <EmptyState title="Server not found" />;
  }

  if (loading) {
    return <p className="text-muted">Loading settings…</p>;
  }

  if (!server) {
    return <EmptyState title="Server not found" description="It may have been deleted." />;
  }

  if (!canManage) {
    return (
      <EmptyState
        title="Settings locked"
        description="Only the library owner (or Pine Owner) can configure this server."
        action={
          <Button variant="secondary" onClick={() => navigate(`/community/s/${serverId}`)}>
            Back to server
          </Button>
        }
      />
    );
  }

  const saveOverview = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await updateServer(serverId, {
        name,
        description,
        iconUrl,
        isPublic,
        isOfficial: isOwner ? isOfficial : undefined,
      });
      setSaved(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const uploadIcon = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const url = await uploadCommunityImage(file);
      setIconUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Server settings"
        subtitle={server.name}
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate(`/community/s/${serverId}`)}>
            Back to server
          </Button>
        }
      />

      <div className="mb-5">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "roles", label: "Roles" },
            { value: "danger", label: "Visibility" },
          ]}
        />
      </div>

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}
      {saved && tab === "overview" && (
        <p className="mb-4 text-[0.875rem] text-accent">Saved.</p>
      )}

      {tab === "overview" && (
        <form onSubmit={saveOverview} className="max-w-lg space-y-4">
          <div className="flex items-center gap-4">
            {iconUrl ? (
              <AuthedImage src={iconUrl} className="h-16 w-16 rounded-2xl object-cover bg-fill" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15 text-lg font-bold text-accent">
                {name.slice(0, 2).toUpperCase() || "?"}
              </div>
            )}
            <div>
              <p className="mb-2 text-[0.8125rem] text-muted">Server icon</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={uploading}
                  onClick={() => iconInput.current?.click()}
                >
                  {uploading ? "Uploading…" : iconUrl ? "Change" : "Upload"}
                </Button>
                {iconUrl && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIconUrl(null)}>
                    Remove
                  </Button>
                )}
              </div>
              <input
                ref={iconInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadIcon(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <TextField label="Server name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            hint="Shown in Discover and Official lists"
          />

          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}

      {tab === "roles" && (
        <RolesPanel
          serverId={serverId}
          roles={roles}
          onChanged={refresh}
          onError={setError}
        />
      )}

      {tab === "danger" && (
        <div className="max-w-lg space-y-4">
          <ToggleRow
            label="Public server"
            hint="Anyone signed in can find this server in Discover (ranked by popularity)."
            checked={isPublic}
            onChange={setIsPublic}
          />
          {isOwner && (
            <ToggleRow
              label="Official server"
              hint="Pins this server in the Official servers list. You can reorder Official servers from Community."
              checked={isOfficial}
              onChange={setIsOfficial}
            />
          )}
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await updateServer(serverId, {
                  isPublic,
                  isOfficial: isOwner ? isOfficial : undefined,
                });
                setSaved(true);
                await refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save visibility"}
          </Button>
          <div className="rounded-[var(--radius-group)] border border-destructive/30 bg-destructive-bg/40 p-4">
            <p className="font-medium text-destructive">Delete server</p>
            <p className="mt-1 text-[0.8125rem] text-muted">
              Permanently removes this server, its channels, roles, and messages. The library itself
              is not deleted.
            </p>
            <Button
              className="mt-3"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  !confirm(
                    `Delete server “${server.name}”? This cannot be undone.`,
                  )
                ) {
                  return;
                }
                setBusy(true);
                try {
                  await deleteServer(serverId);
                  navigate("/community");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not delete");
                  setBusy(false);
                }
              }}
            >
              Delete server
            </Button>
          </div>
          <p className="text-[0.8125rem] text-muted">
            Library: <Link to="/settings" className="text-link">{library?.name || server.libraryId}</Link>
          </p>
        </div>
      )}
    </div>
  );
}

function RolesPanel({
  serverId,
  roles,
  onChanged,
  onError,
}: {
  serverId: string;
  roles: CommunityServerRole[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(roles[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6B7280");
  const [editIcon, setEditIcon] = useState<string | null>(null);
  const [canManageServer, setCanManageServer] = useState(false);
  const [canManageChannels, setCanManageChannels] = useState(false);
  const [canModerate, setCanModerate] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditColor(selected.color);
    setEditIcon(selected.iconUrl);
    setCanManageServer(selected.canManageServer);
    setCanManageChannels(selected.canManageChannels);
    setCanModerate(selected.canModerate);
  }, [selected]);

  useEffect(() => {
    if (!selectedId && roles[0]) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="space-y-1 rounded-[var(--radius-group)] bg-surface p-2 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelectedId(r.id)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[0.9375rem] ${
              r.id === selectedId ? "bg-fill-secondary font-medium" : "hover:bg-fill"
            }`}
          >
            <RoleBadge role={r} />
            <span className="truncate">{r.name}</span>
          </button>
        ))}
        <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.08]">
          <div className="flex gap-1">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New role"
              className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-2 py-1.5 text-[0.8125rem]"
            />
            <button
              type="button"
              className="rounded-lg p-1.5 text-accent hover:bg-fill"
              title="Add role"
              disabled={!newName.trim() || busy}
              onClick={async () => {
                setBusy(true);
                onError("");
                try {
                  const role = await createServerRole(serverId, { name: newName.trim() });
                  setNewName("");
                  await onChanged();
                  setSelectedId(role.id);
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not create role");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>
      </div>

      {selected ? (
        <form
          className="space-y-4 rounded-[var(--radius-group)] bg-surface p-4 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            onError("");
            try {
              await updateServerRole(selected.id, {
                name: editName,
                color: editColor,
                iconUrl: editIcon,
                canManageServer,
                canManageChannels,
                canModerate,
              });
              await onChanged();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not save role");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => iconInput.current?.click()}
              className="relative"
              title="Upload role icon"
            >
              {editIcon ? (
                <AuthedImage src={editIcon} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: editColor }}
                >
                  {editName.slice(0, 1).toUpperCase() || "?"}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 rounded-full bg-surface p-0.5 text-[0.625rem] text-muted ring-1 ring-black/10">
                ✎
              </span>
            </button>
            <input
              ref={iconInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  setEditIcon(await uploadCommunityImage(f));
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Upload failed");
                }
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[0.75rem] text-muted">Role icon (upload an image)</p>
              {editIcon && (
                <button
                  type="button"
                  className="text-[0.75rem] text-link"
                  onClick={() => setEditIcon(null)}
                >
                  Remove icon
                </button>
              )}
            </div>
          </div>

          <TextField
            label="Role name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={selected.isEveryone}
            required
          />
          <label className="block text-[0.8125rem] font-medium text-muted">
            Color
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-[var(--radius-control)] bg-fill"
            />
          </label>

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-muted">Permissions</p>
            <ToggleRow
              label="Manage server"
              hint="Change settings, visibility, and roles"
              checked={canManageServer}
              onChange={setCanManageServer}
            />
            <ToggleRow
              label="Manage channels"
              hint="Create and edit categories & channels"
              checked={canManageChannels}
              onChange={setCanManageChannels}
            />
            <ToggleRow
              label="Moderate"
              hint="Delete messages and review suggestions"
              checked={canModerate}
              onChange={setCanModerate}
            />
          </div>

          <div className="flex items-center gap-2">
            {!selected.isEveryone && selected.name !== "Owner" && (
              <button
                type="button"
                className="text-[0.875rem] text-destructive"
                onClick={async () => {
                  if (!confirm(`Delete role “${selected.name}”?`)) return;
                  try {
                    await deleteServerRole(selected.id);
                    setSelectedId(null);
                    await onChanged();
                  } catch (err) {
                    onError(err instanceof Error ? err.message : "Could not delete");
                  }
                }}
              >
                Delete role
              </button>
            )}
            <div className="flex-1" />
            <Button type="submit" disabled={busy || !editName.trim()}>
              {busy ? "Saving…" : "Save role"}
            </Button>
          </div>
        </form>
      ) : (
        <EmptyState title="Select a role" description="Or create a new one from the list." />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: CommunityServerRole }) {
  if (role.iconUrl) {
    return <AuthedImage src={role.iconUrl} className="h-6 w-6 rounded-full object-cover" />;
  }
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
      style={{ backgroundColor: role.color }}
    >
      {role.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
