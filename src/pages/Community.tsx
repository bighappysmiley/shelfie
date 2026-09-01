import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  addGroupMember,
  archiveCommunityGroup,
  createCommunityGroup,
  deleteGroupMessage,
  listCommunityGroups,
  listGroupMembers,
  listGroupMessages,
  listTeammateCandidates,
  removeGroupMember,
  sendGroupMessage,
  updateMemberRole,
  updateSuggestionStatus,
} from "@/lib/community";
import {
  MEMBER_ROLE_LABELS,
  SUGGESTION_STATUS_LABELS,
  canManageMembers,
  canModerate,
  formatCommunityTime,
  type CommunityGroup,
  type CommunityGroupKind,
  type CommunityMember,
  type CommunityMemberRole,
  type CommunityMessage,
  type CommunityMessageKind,
  type SuggestionStatus,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import {
  EmptyState,
  Group,
  GroupHeader,
  ListRow,
  PageHeader,
  SegmentedControl,
} from "@/components/layout";
import { IconPlus } from "@/components/Icons";

export function CommunityPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, isOwner } = useAuth();
  const canCreate = Boolean(isOwner);

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      setGroups(await listCommunityGroups(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load community");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = groups.find((g) => g.id === groupId) ?? null;

  useEffect(() => {
    if (!loading && groups.length > 0 && !groupId) {
      navigate(`/community/${groups[0].id}`, { replace: true });
    }
  }, [loading, groups, groupId, navigate]);

  return (
    <div>
      <PageHeader
        title="Community"
        subtitle="Groups for chatting and sharing suggestions"
        action={
          canCreate ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <IconPlus size={16} />
              New group
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      {showCreate && canCreate && user && (
        <CreateGroupPanel
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(g) => {
            setGroups((prev) => [...prev, g]);
            setShowCreate(false);
            navigate(`/community/${g.id}`);
          }}
        />
      )}

      {loading ? (
        <p className="text-muted">Loading community…</p>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          description={
            canCreate
              ? "Create a group for team chat or feature suggestions. Only the app Owner can create groups."
              : "When the Owner creates a group and adds you, it will show up here."
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-6">
          <div>
            <GroupHeader>Groups</GroupHeader>
            <Group>
              {groups.map((g) => (
                <ListRow
                  key={g.id}
                  title={g.name}
                  subtitle={
                    g.kind === "chat"
                      ? "Chat"
                      : g.kind === "suggestions"
                        ? "Suggestions"
                        : "Chat & suggestions"
                  }
                  trailing={g.memberCount ? String(g.memberCount) : undefined}
                  to={`/community/${g.id}`}
                  chevron
                  className={g.id === groupId ? "bg-fill-secondary" : ""}
                />
              ))}
            </Group>
          </div>

          <div className="min-w-0">
            {active && user ? (
              <GroupRoom
                group={active}
                userId={user.id}
                displayName={userProfile?.displayName?.trim() || user.email || "Member"}
                isAppOwner={canCreate}
                onChanged={refresh}
              />
            ) : (
              <EmptyState
                title="Select a group"
                description="Choose a group from the list to open the conversation."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateGroupPanel({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (g: CommunityGroup) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<CommunityGroupKind>("both");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the group a name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onCreated(
        await createCommunityGroup({
          name,
          description,
          kind,
          userId,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create group");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5">
      <GroupHeader>New community group</GroupHeader>
      <Group>
        <form onSubmit={onSubmit} className="space-y-3 p-4">
          <TextField
            label="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Feature ideas, Family chat"
            required
            autoFocus
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group for?"
            rows={2}
          />
          <div>
            <p className="mb-2 text-[0.8125rem] font-medium text-muted">Type</p>
            <SegmentedControl
              value={kind}
              onChange={setKind}
              options={[
                { value: "both", label: "Chat & suggestions" },
                { value: "chat", label: "Chat only" },
                { value: "suggestions", label: "Suggestions" },
              ]}
            />
          </div>
          {error && <FormError message={error} />}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create group"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Group>
    </div>
  );
}

function GroupRoom({
  group,
  userId,
  displayName,
  isAppOwner,
  onChanged,
}: {
  group: CommunityGroup;
  userId: string;
  displayName: string;
  isAppOwner: boolean;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"room" | "members">("room");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [draft, setDraft] = useState("");
  const [composeKind, setComposeKind] = useState<CommunityMessageKind>("chat");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const myRole = group.myRole ?? (isAppOwner ? "admin" : null);
  const manage = canManageMembers(myRole, isAppOwner);
  const moderate = canModerate(myRole, isAppOwner);
  const allowsChat = group.kind === "chat" || group.kind === "both";
  const allowsSuggestions = group.kind === "suggestions" || group.kind === "both";

  const load = useCallback(async () => {
    const [msgs, mems] = await Promise.all([
      listGroupMessages(group.id),
      listGroupMembers(group.id),
    ]);
    setMessages(msgs);
    setMembers(mems);
  }, [group.id]);

  useEffect(() => {
    void load().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load group"),
    );
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`community:${group.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `group_id=eq.${group.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [group.id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    setComposeKind(group.kind === "suggestions" ? "suggestion" : "chat");
  }, [group.kind]);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setError("");
    try {
      const kind: CommunityMessageKind =
        composeKind === "suggestion" && allowsSuggestions ? "suggestion" : "chat";
      if (kind === "chat" && !allowsChat) {
        setError("This group is suggestions-only.");
        return;
      }
      await sendGroupMessage({
        groupId: group.id,
        userId,
        body: draft,
        kind,
        authorName: displayName,
      });
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-[var(--radius-group)] bg-surface shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="flex flex-wrap items-start justify-between gap-3 hairline-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-[1.125rem] font-semibold">{group.name}</h2>
          {group.description && (
            <p className="mt-0.5 text-[0.875rem] text-muted">{group.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "room", label: "Room" },
              { value: "members", label: `Members (${members.length})` },
            ]}
          />
          {isAppOwner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                if (!confirm("Archive this group? Members will lose access.")) return;
                await archiveCommunityGroup(group.id);
                onChanged();
              }}
            >
              Archive
            </Button>
          )}
        </div>
      </div>

      {tab === "members" ? (
        <MembersPanel
          groupId={group.id}
          members={members}
          userId={userId}
          canManage={manage}
          onChanged={async () => {
            await load();
            onChanged();
          }}
        />
      ) : (
        <>
          <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <li className="py-8 text-center text-[0.9375rem] text-muted">
                No messages yet. Start the conversation.
              </li>
            )}
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                isMine={m.authorId === userId}
                canModerate={moderate}
                onStatus={async (status) => {
                  await updateSuggestionStatus(m.id, status);
                  await load();
                }}
                onDelete={async () => {
                  await deleteGroupMessage(m.id);
                  await load();
                }}
              />
            ))}
            <div ref={bottomRef} />
          </ul>

          <form onSubmit={onSend} className="hairline-t p-3">
            {allowsChat && allowsSuggestions && (
              <div className="mb-2">
                <SegmentedControl
                  value={composeKind === "suggestion" ? "suggestion" : "chat"}
                  onChange={(v) => setComposeKind(v)}
                  options={[
                    { value: "chat", label: "Chat" },
                    { value: "suggestion", label: "Suggestion" },
                  ]}
                />
              </div>
            )}
            {error && <FormError message={error} />}
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={
                  composeKind === "suggestion" ? "Share a suggestion…" : "Write a message…"
                }
                className="min-h-[2.75rem] flex-1 resize-none rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[1.0625rem] outline-none ring-accent focus:ring-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend(e);
                  }
                }}
              />
              <Button type="submit" disabled={sending || !draft.trim()}>
                {sending ? "…" : "Send"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function MessageRow({
  message,
  isMine,
  canModerate: canMod,
  onStatus,
  onDelete,
}: {
  message: CommunityMessage;
  isMine: boolean;
  canModerate: boolean;
  onStatus: (s: SuggestionStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  if (message.kind === "system") {
    return <li className="text-center text-[0.75rem] text-muted">{message.body}</li>;
  }

  const isSuggestion = message.kind === "suggestion";

  return (
    <li className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <p className="mb-1 px-1 text-[0.75rem] text-muted">
        {isMine ? "You" : message.authorName || "Member"} · {formatCommunityTime(message.createdAt)}
        {isSuggestion && message.suggestionStatus && (
          <> · {SUGGESTION_STATUS_LABELS[message.suggestionStatus]}</>
        )}
      </p>
      <div
        className={`max-w-[85%] rounded-[1.125rem] px-3.5 py-2 text-[1.0625rem] leading-snug ${
          isMine
            ? "rounded-br-[0.375rem] bg-chat-mine text-accent-contrast"
            : "rounded-bl-[0.375rem] bg-chat-theirs text-foreground"
        }`}
      >
        {isSuggestion && (
          <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide opacity-80">
            Suggestion
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
      </div>
      {(canMod || isMine) && (
        <div className="mt-1 flex flex-wrap gap-2 px-1">
          {isSuggestion && canMod && message.suggestionStatus === "open" && (
            <>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("accepted")}
              >
                Accept
              </button>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("declined")}
              >
                Decline
              </button>
              <button
                type="button"
                className="text-[0.75rem] text-link"
                onClick={() => void onStatus("implemented")}
              >
                Mark implemented
              </button>
            </>
          )}
          <button type="button" className="text-[0.75rem] text-muted" onClick={() => void onDelete()}>
            Delete
          </button>
        </div>
      )}
    </li>
  );
}

function MembersPanel({
  groupId,
  members,
  userId,
  canManage,
  onChanged,
}: {
  groupId: string;
  members: CommunityMember[];
  userId: string;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const [candidates, setCandidates] = useState<{ userId: string; displayName: string | null }[]>(
    [],
  );
  const [addId, setAddId] = useState("");
  const [addRole, setAddRole] = useState<CommunityMemberRole>("member");
  const [error, setError] = useState("");

  useEffect(() => {
    void listTeammateCandidates(userId)
      .then((list) => {
        const existing = new Set(members.map((m) => m.userId));
        setCandidates(list.filter((c) => !existing.has(c.userId)));
      })
      .catch(() => setCandidates([]));
  }, [userId, members]);

  return (
    <div className="space-y-4 p-4">
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-fill px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {m.displayName || "Member"}
                {m.userId === userId ? " (you)" : ""}
              </p>
              <p className="text-[0.8125rem] text-muted">{MEMBER_ROLE_LABELS[m.role]}</p>
            </div>
            {canManage && m.userId !== userId && (
              <div className="flex items-center gap-2">
                <select
                  className="rounded-[var(--radius-control)] bg-surface px-2 py-1 text-[0.8125rem]"
                  value={m.role}
                  onChange={async (e) => {
                    await updateMemberRole(
                      groupId,
                      m.userId,
                      e.target.value as CommunityMemberRole,
                    );
                    await onChanged();
                  }}
                >
                  {(Object.keys(MEMBER_ROLE_LABELS) as CommunityMemberRole[]).map((r) => (
                    <option key={r} value={r}>
                      {MEMBER_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="text-[0.8125rem] text-muted hover:text-destructive"
                  onClick={async () => {
                    await removeGroupMember(groupId, m.userId);
                    await onChanged();
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="rounded-[var(--radius-control)] bg-fill p-3">
          <p className="mb-2 text-[0.875rem] font-medium">Add teammate</p>
          {candidates.length === 0 ? (
            <p className="text-[0.8125rem] text-muted">
              No other library teammates to add. Invite someone to your library first.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="flex-1 rounded-[var(--radius-control)] bg-surface px-3 py-2 text-[0.9375rem]"
                value={addId}
                onChange={(e) => setAddId(e.target.value)}
              >
                <option value="">Choose person…</option>
                {candidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.displayName || c.userId.slice(0, 8)}
                  </option>
                ))}
              </select>
              <select
                className="rounded-[var(--radius-control)] bg-surface px-3 py-2 text-[0.9375rem]"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as CommunityMemberRole)}
              >
                {(Object.keys(MEMBER_ROLE_LABELS) as CommunityMemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {MEMBER_ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={!addId}
                onClick={async () => {
                  setError("");
                  try {
                    await addGroupMember(groupId, addId, addRole);
                    setAddId("");
                    await onChanged();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Could not add");
                  }
                }}
              >
                Add
              </Button>
            </div>
          )}
          {error && <FormError message={error} />}
        </div>
      )}

      <p className="text-[0.8125rem] text-muted">
        <strong>Admin</strong> manages members · <strong>Moderator</strong> reviews suggestions ·{" "}
        <strong>Member</strong> can chat and post ideas. Only the app Owner can create new groups.
      </p>
    </div>
  );
}
