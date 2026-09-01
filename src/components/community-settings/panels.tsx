import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  archiveCommunityGroup,
  createCommunityCategory,
  createCommunityGroup,
  createServerRole,
  deleteCommunityCategory,
  deleteServerRole,
  renameCommunityCategory,
  reviewJoinRequest,
  reorderServerRoles,
  updateCommunityGroup,
  updateServerRole,
  uploadCommunityImage,
} from "@/lib/community";
import {
  KIND_LABELS,
  type CommunityCategory,
  type CommunityGroup,
  type CommunityGroupKind,
  type CommunityJoinRequest,
  type CommunityServerRole,
} from "@/lib/community-types";
import {
  encodeRoleColor,
  parseRoleColor,
  ROLE_COLOR_PRESETS,
  roleColorStyle,
  roleColorTextStyle,
  type RoleColorMode,
} from "@/lib/role-color";
import { Button } from "@/components/Button";
import { TextField, TextArea, SelectField } from "@/components/form";
import { EmptyState, ToggleRow } from "@/components/layout";
import { AuthedImage } from "@/components/AuthedImage";
import { IconPlus, IconSettings, IconX } from "@/components/Icons";
export function JoinRequestsPanel({
  requests,
  onChanged,
  onError,
}: {
  requests: CommunityJoinRequest[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No pending requests"
        description="When join mode is “Join requests”, new applicants show up here for approval."
      />
    );
  }

  return (
    <div className="max-w-lg space-y-2">
      <p className="mb-2 text-[0.875rem] text-muted">{requests.length} waiting for approval</p>
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center gap-3 rounded-[var(--radius-group)] bg-surface px-3 py-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{req.displayName || "Member"}</p>
            {req.message && <p className="truncate text-[0.8125rem] text-muted">{req.message}</p>}
            <p className="text-[0.6875rem] text-muted">{new Date(req.createdAt).toLocaleString()}</p>
          </div>
          <Button
            size="sm"
            disabled={busyId === req.id}
            onClick={async () => {
              setBusyId(req.id);
              onError("");
              try {
                await reviewJoinRequest(req.id, true);
                await onChanged();
              } catch (err) {
                onError(err instanceof Error ? err.message : "Could not approve");
              } finally {
                setBusyId(null);
              }
            }}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busyId === req.id}
            onClick={async () => {
              setBusyId(req.id);
              onError("");
              try {
                await reviewJoinRequest(req.id, false);
                await onChanged();
              } catch (err) {
                onError(err instanceof Error ? err.message : "Could not reject");
              } finally {
                setBusyId(null);
              }
            }}
          >
            Reject
          </Button>
        </div>
      ))}
    </div>
  );
}

export function ChannelsPanel({
  serverId,
  userId,
  categories,
  channels,
  onChanged,
  onError,
}: {
  serverId: string;
  userId: string;
  categories: CommunityCategory[];
  channels: CommunityGroup[];
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<
    | null
    | { type: "channel"; channel?: CommunityGroup; categoryId: string | null }
    | { type: "rename-category"; category: CommunityCategory }
  >(null);

  const orderedCategories = useMemo(
    () =>
      [...categories].sort((a, b) => {
        if (a.isOfficial !== b.isOfficial) return a.isOfficial ? -1 : 1;
        return a.position - b.position || a.name.localeCompare(b.name);
      }),
    [categories],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string | null, CommunityGroup[]>();
    for (const ch of channels) {
      const key = ch.categoryId;
      const list = map.get(key) ?? [];
      list.push(ch);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    }
    return map;
  }, [channels]);

  const uncategorized = byCategory.get(null) ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-[0.875rem] text-muted">
        Organize this server like Discord — categories hold channels. Official category channels are
        pinned for all members.
      </p>

      <div className="flex gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="New category name"
          className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2.5 text-[0.9375rem]"
        />
        <Button
          size="sm"
          disabled={!newCategory.trim() || busy}
          onClick={async () => {
            setBusy(true);
            onError("");
            try {
              await createCommunityCategory({
                serverId,
                name: newCategory.trim(),
                userId,
              });
              setNewCategory("");
              await onChanged();
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not create category");
            } finally {
              setBusy(false);
            }
          }}
        >
          <IconPlus size={16} />
          Category
        </Button>
      </div>

      <div className="space-y-3">
        {orderedCategories.map((cat) => {
          const list = byCategory.get(cat.id) ?? [];
          return (
            <div
              key={cat.id}
              className="rounded-[var(--radius-group)] bg-surface p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                    {cat.isOfficial ? "📌 " : ""}
                    {cat.name}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditor({ type: "channel", categoryId: cat.id })}
                >
                  <IconPlus size={14} />
                  Channel
                </Button>
                {!cat.isOfficial && (
                  <>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted hover:bg-fill hover:text-foreground"
                      title="Rename category"
                      onClick={() => setEditor({ type: "rename-category", category: cat })}
                    >
                      <IconSettings size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[0.75rem] text-destructive hover:bg-destructive-bg"
                      onClick={async () => {
                        if (
                          !confirm(
                            `Delete category “${cat.name}”? Channels inside should be moved or archived first if needed.`,
                          )
                        ) {
                          return;
                        }
                        try {
                          await deleteCommunityCategory(cat.id);
                          await onChanged();
                        } catch (err) {
                          onError(err instanceof Error ? err.message : "Could not delete");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>

              {list.length === 0 ? (
                <p className="px-1 py-2 text-[0.8125rem] text-muted">No channels yet</p>
              ) : (
                <ul className="space-y-1">
                  {list.map((ch) => (
                    <li
                      key={ch.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-fill/60"
                    >
                      <span className="text-muted">#</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{ch.name}</p>
                        <p className="truncate text-[0.75rem] text-muted">
                          {KIND_LABELS[ch.kind]}
                          {ch.topic ? ` · ${ch.topic}` : ""}
                          {ch.isOfficial ? " · Official" : ""}
                        </p>
                      </div>
                      <Link
                        to={`/community/s/${serverId}/${ch.id}`}
                        className="text-[0.75rem] text-link"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        className="rounded p-1.5 text-muted hover:bg-fill hover:text-foreground"
                        onClick={() =>
                          setEditor({ type: "channel", channel: ch, categoryId: ch.categoryId })
                        }
                      >
                        <IconSettings size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {uncategorized.length > 0 && (
          <div className="rounded-[var(--radius-group)] bg-surface p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <p className="mb-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
              Uncategorized
            </p>
            <ul className="space-y-1">
              {uncategorized.map((ch) => (
                <li key={ch.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-fill/60">
                  <span className="text-muted">#</span>
                  <p className="min-w-0 flex-1 truncate font-medium">{ch.name}</p>
                  <button
                    type="button"
                    className="rounded p-1.5 text-muted hover:bg-fill"
                    onClick={() =>
                      setEditor({ type: "channel", channel: ch, categoryId: ch.categoryId })
                    }
                  >
                    <IconSettings size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {orderedCategories.length === 0 && (
        <EmptyState
          title="No categories"
          description="Create a category, then add channels under it."
        />
      )}

      {editor?.type === "channel" && (
        <ChannelEditorModal
          serverId={serverId}
          userId={userId}
          categories={orderedCategories}
          channel={editor.channel}
          defaultCategoryId={editor.categoryId}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await onChanged();
          }}
          onError={onError}
        />
      )}

      {editor?.type === "rename-category" && (
        <RenameCategoryModal
          category={editor.category}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await onChanged();
          }}
          onError={onError}
        />
      )}
    </div>
  );
}

function ChannelEditorModal({
  serverId,
  userId,
  categories,
  channel,
  defaultCategoryId,
  onClose,
  onSaved,
  onError,
}: {
  serverId: string;
  userId: string;
  categories: CommunityCategory[];
  channel?: CommunityGroup;
  defaultCategoryId: string | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const editing = Boolean(channel);
  const [name, setName] = useState(channel?.name ?? "");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [kind, setKind] = useState<CommunityGroupKind>(channel?.kind ?? "chat");
  const [categoryId, setCategoryId] = useState(channel?.categoryId ?? defaultCategoryId ?? "");
  const [isOfficial, setIsOfficial] = useState(Boolean(channel?.isOfficial));
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    onError("");
    try {
      if (editing && channel) {
        await updateCommunityGroup(channel.id, {
          name: name.trim(),
          topic: topic.trim() || null,
          description: description.trim() || null,
          kind,
          categoryId: categoryId || null,
          isOfficial,
          serverId,
        });
      } else {
        await createCommunityGroup({
          serverId,
          userId,
          name: name.trim(),
          topic: topic.trim() || undefined,
          description: description.trim() || undefined,
          kind,
          categoryId: categoryId || null,
          isOfficial,
        });
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save channel");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md space-y-3 rounded-t-2xl bg-surface p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[1.125rem] font-semibold">{editing ? "Edit channel" : "Create channel"}</h2>
          <button type="button" onClick={onClose} className="text-muted">
            <IconX size={18} />
          </button>
        </div>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <TextField label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} hint="Shown under the channel name" />
        <TextArea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <SelectField label="Type" value={kind} onChange={(e) => setKind(e.target.value as CommunityGroupKind)}>
          <option value="chat">Chat</option>
          <option value="suggestions">Suggestions</option>
          <option value="both">Chat & suggestions</option>
        </SelectField>
        <SelectField
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required={!isOfficial}
        >
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isOfficial ? " (Official)" : ""}
            </option>
          ))}
        </SelectField>
        <ToggleRow
          label="Official channel"
          hint="Lives under the Official category and is visible to everyone"
          checked={isOfficial}
          onChange={(v) => {
            setIsOfficial(v);
            if (v) {
              const official = categories.find((c) => c.isOfficial);
              if (official) setCategoryId(official.id);
            }
          }}
        />
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          {editing && channel && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Archive #${channel.name}?`)) return;
                setBusy(true);
                try {
                  await archiveCommunityGroup(channel.id);
                  await onSaved();
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not archive");
                  setBusy(false);
                }
              }}
            >
              Archive
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              {busy ? "Saving…" : editing ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function RenameCategoryModal({
  category,
  onClose,
  onSaved,
  onError,
}: {
  category: CommunityCategory;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(category.name);
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-3 rounded-2xl bg-surface p-5 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            await renameCommunityCategory(category.id, name.trim());
            await onSaved();
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not rename");
            setBusy(false);
          }
        }}
      >
        <h2 className="text-[1.125rem] font-semibold">Rename category</h2>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function RolesPanel({
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
  const [canKickMembers, setCanKickMembers] = useState(false);
  const [canBanMembers, setCanBanMembers] = useState(false);
  const [canManageMessages, setCanManageMessages] = useState(false);
  const [canInviteUsers, setCanInviteUsers] = useState(false);
  const [hoist, setHoist] = useState(false);
  const [mentionable, setMentionable] = useState(true);

  useEffect(() => {
    if (!selected) return;
    setEditName(selected.name);
    setEditColor(selected.color);
    setEditIcon(selected.iconUrl);
    setCanManageServer(selected.canManageServer);
    setCanManageChannels(selected.canManageChannels);
    setCanModerate(selected.canModerate);
    setCanKickMembers(selected.canKickMembers);
    setCanBanMembers(selected.canBanMembers);
    setCanManageMessages(selected.canManageMessages);
    setCanInviteUsers(selected.canInviteUsers);
    setHoist(selected.hoist);
    setMentionable(selected.mentionable);
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
            <span className="truncate" style={roleColorTextStyle(r.color)}>
              {r.name}
            </span>
            {typeof r.memberCount === "number" && (
              <span className="ml-auto text-[0.6875rem] text-muted">{r.memberCount}</span>
            )}
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
                canKickMembers,
                canBanMembers,
                canManageMessages,
                canInviteUsers,
                hoist,
                mentionable,
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
                  style={roleColorStyle(editColor)}
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
              <p className="font-semibold" style={roleColorTextStyle(editColor)}>
                @{editName || "role"}
              </p>
              <p className="text-[0.75rem] text-muted">Role icon (optional upload)</p>
              {editIcon && (
                <button type="button" className="text-[0.75rem] text-link" onClick={() => setEditIcon(null)}>
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

          <RoleColorPicker value={editColor} onChange={setEditColor} />

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-muted">Display</p>
            <ToggleRow
              label="Display role members separately"
              hint="Members with this role appear in their own section (hoisted)"
              checked={hoist}
              onChange={setHoist}
            />
            <ToggleRow
              label="Allow anyone to @mention this role"
              checked={mentionable}
              onChange={setMentionable}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-muted">General permissions</p>
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
              label="Create invite"
              hint="Generate and share invite links"
              checked={canInviteUsers}
              onChange={setCanInviteUsers}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-muted">Membership permissions</p>
            <ToggleRow
              label="Kick members"
              checked={canKickMembers}
              onChange={setCanKickMembers}
            />
            <ToggleRow
              label="Ban members"
              checked={canBanMembers}
              onChange={setCanBanMembers}
            />
          </div>

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-muted">Text channel permissions</p>
            <ToggleRow
              label="Moderate messages"
              hint="Delete messages and review suggestions"
              checked={canModerate}
              onChange={setCanModerate}
            />
            <ToggleRow
              label="Manage messages"
              hint="Pin and manage others' messages"
              checked={canManageMessages}
              onChange={setCanManageMessages}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || roles.findIndex((r) => r.id === selected.id) <= 0}
              onClick={async () => {
                const idx = roles.findIndex((r) => r.id === selected.id);
                if (idx <= 0) return;
                const ordered = [...roles];
                [ordered[idx - 1], ordered[idx]] = [ordered[idx], ordered[idx - 1]];
                try {
                  await reorderServerRoles(serverId, ordered.map((r) => r.id));
                  await onChanged();
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not reorder");
                }
              }}
            >
              Move up
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || roles.findIndex((r) => r.id === selected.id) >= roles.length - 1}
              onClick={async () => {
                const idx = roles.findIndex((r) => r.id === selected.id);
                if (idx < 0 || idx >= roles.length - 1) return;
                const ordered = [...roles];
                [ordered[idx], ordered[idx + 1]] = [ordered[idx + 1], ordered[idx]];
                try {
                  await reorderServerRoles(serverId, ordered.map((r) => r.id));
                  await onChanged();
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not reorder");
                }
              }}
            >
              Move down
            </Button>
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

export function RoleColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = parseRoleColor(value);
  const [mode, setMode] = useState<RoleColorMode>(parsed.mode);
  const [solid, setSolid] = useState(parsed.mode === "solid" ? parsed.hex : "#8B5CF6");
  const [stops, setStops] = useState<string[]>(
    parsed.mode === "gradient" ? parsed.stops : ["#f97316", "#ec4899", "#8b5cf6"],
  );

  useEffect(() => {
    const next = parseRoleColor(value);
    setMode(next.mode);
    if (next.mode === "solid") setSolid(next.hex);
    else if (next.mode === "gradient") setStops(next.stops);
  }, [value]);

  const pushEncoded = (nextMode: RoleColorMode, nextSolid: string, nextStops: string[]) => {
    if (nextMode === "solid") onChange(encodeRoleColor({ mode: "solid", hex: nextSolid }));
    else if (nextMode === "gradient")
      onChange(encodeRoleColor({ mode: "gradient", stops: nextStops }));
    else onChange("holo");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.8125rem] font-medium text-muted">Color</p>
        <div
          className="h-8 w-24 rounded-full ring-1 ring-black/10 dark:ring-white/15"
          style={roleColorStyle(value, { animate: true })}
          title="Preview"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["solid", "Solid"],
            ["gradient", "Gradient"],
            ["holo", "Holo"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              pushEncoded(id, solid, stops);
            }}
            className={`rounded-full px-3 py-1 text-[0.8125rem] font-medium transition ${
              mode === id ? "bg-accent text-accent-contrast" : "bg-fill text-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_COLOR_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            title={preset.label}
            onClick={() => onChange(preset.value)}
            className="h-8 w-8 rounded-full ring-2 ring-offset-2 ring-offset-surface transition hover:scale-105"
            style={{
              ...roleColorStyle(preset.value),
              boxShadow: value === preset.value ? "0 0 0 2px var(--accent)" : undefined,
            }}
          />
        ))}
      </div>

      {mode === "solid" ? (
        <label className="block text-[0.8125rem] text-muted">
          Custom hex
          <div className="mt-1 flex gap-2">
            <input
              type="color"
              value={solid}
              onChange={(e) => {
                setSolid(e.target.value);
                pushEncoded("solid", e.target.value, stops);
              }}
              className="h-10 w-14 cursor-pointer rounded-[var(--radius-control)] bg-fill"
            />
            <input
              value={solid}
              onChange={(e) => {
                const v = e.target.value;
                setSolid(v);
                if (/^#[0-9a-fA-F]{6}$/.test(v)) pushEncoded("solid", v, stops);
              }}
              className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2 font-mono text-[0.9375rem]"
            />
          </div>
        </label>
      ) : mode === "gradient" ? (
        <div className="space-y-2">
          <p className="text-[0.75rem] text-muted">Pick at least two colors for the gradient.</p>
          {stops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(stop) ? stop : "#888888"}
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = e.target.value;
                  setStops(next);
                  pushEncoded("gradient", solid, next);
                }}
                className="h-9 w-12 cursor-pointer rounded bg-fill"
              />
              <input
                value={stop}
                onChange={(e) => {
                  const next = [...stops];
                  next[i] = e.target.value;
                  setStops(next);
                  if (next.every((s) => /^#[0-9a-fA-F]{6}$/.test(s))) {
                    pushEncoded("gradient", solid, next);
                  }
                }}
                className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-2 py-1.5 font-mono text-[0.8125rem]"
              />
              {stops.length > 2 && (
                <button
                  type="button"
                  className="text-[0.75rem] text-destructive"
                  onClick={() => {
                    const next = stops.filter((_, j) => j !== i);
                    setStops(next);
                    pushEncoded("gradient", solid, next);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {stops.length < 6 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const next = [...stops, "#ffffff"];
                setStops(next);
                pushEncoded("gradient", solid, next);
              }}
            >
              <IconPlus size={14} />
              Add stop
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[0.75rem] text-muted">
          Holographic uses a shifting iridescent palette — like Discord&apos;s holographic role color. No custom
          colors needed.
        </p>
      )}
    </div>
  );
}

export function RoleBadge({ role }: { role: CommunityServerRole }) {
  if (role.iconUrl) {
    return <AuthedImage src={role.iconUrl} className="h-6 w-6 rounded-full object-cover" />;
  }
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full text-[0.625rem] font-bold text-white"
      style={roleColorStyle(role.color)}
    >
      {role.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
