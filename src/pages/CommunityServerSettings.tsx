import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import {
  deleteServer,
  getMyServerRoleId,
  getServer,
  leaveServer,
  listCommunityCategories,
  listCommunityGroups,
  listPendingJoinRequests,
  listServerAuditLog,
  listServerBans,
  listServerMembers,
  listServerRolesWithCounts,
  pinOfficialServerToTop,
  regenerateServerInviteCode,
  updateServer,
  uploadCommunityImage,
} from "@/lib/community";
import type {
  CommunityCategory,
  CommunityGroup,
  CommunityJoinMode,
  CommunityJoinRequest,
  CommunityServer,
  CommunityServerAuditEntry,
  CommunityServerBan,
  CommunityServerMember,
  CommunityServerRole,
  DefaultNotifications,
  ExplicitContentFilter,
  VerificationLevel,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";
import { EmptyState, ToggleRow } from "@/components/layout";
import { AuthedImage } from "@/components/AuthedImage";
import { CommunityDiscordShell, CommunityPanelHeader, CommunityScrollBody } from "@/components/CommunityRail";
import { CommunitySettingsSheet } from "@/components/community-settings/CommunitySettingsSheet";
import { AutomodTab } from "@/components/community-settings/AutomodTab";
import { BoostTab } from "@/components/community-settings/BoostTab";
import { EmojiTab } from "@/components/community-settings/EmojiTab";
import { IntegrationsTab } from "@/components/community-settings/IntegrationsTab";
import { StickersTab } from "@/components/community-settings/StickersTab";
import { InvitesTab } from "@/components/community-settings/InvitesTab";
import { MembersTab } from "@/components/community-settings/MembersTab";
import { ModerationTab } from "@/components/community-settings/ModerationTab";
import {
  NotificationsTab,
  OnboardingTab,
  VerificationTab,
  WidgetTab,
} from "@/components/community-settings/OnboardingTabs";
import {
  ChannelsPanel,
  JoinRequestsPanel,
  RolesPanel,
} from "@/components/community-settings/panels";
import { SettingsNav } from "@/components/community-settings/SettingsNav";
import type { SettingsNavGroup, SettingsTab } from "@/components/community-settings/types";
import { parseSettingsTab } from "@/components/community-settings/types";
import { getCommunityProfile } from "@/lib/community-profile";
import { canUseHoloRoles } from "@/lib/pro";

export function CommunityServerSettingsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isOwner } = useAuth();
  const { libraries } = useLibrary();

  const [server, setServer] = useState<CommunityServer | null>(null);
  const [roles, setRoles] = useState<CommunityServerRole[]>([]);
  const [members, setMembers] = useState<CommunityServerMember[]>([]);
  const [bans, setBans] = useState<CommunityServerBan[]>([]);
  const [auditLog, setAuditLog] = useState<CommunityServerAuditEntry[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [channels, setChannels] = useState<CommunityGroup[]>([]);
  const [joinRequests, setJoinRequests] = useState<CommunityJoinRequest[]>([]);
  const [myRoleId, setMyRoleId] = useState<string | null>(null);

  const [tab, setTab] = useState<SettingsTab>(() => parseSettingsTab(searchParams.get("tab")));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const iconInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);
  const [joinMode, setJoinMode] = useState<CommunityJoinMode>("open");
  const [inviteCode, setInviteCode] = useState("");
  const [rules, setRules] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>("none");
  const [explicitContentFilter, setExplicitContentFilter] = useState<ExplicitContentFilter>("disabled");
  const [defaultNotifications, setDefaultNotifications] = useState<DefaultNotifications>("all");
  const [systemChannelId, setSystemChannelId] = useState("");
  const [rulesChannelId, setRulesChannelId] = useState("");
  const [automodEnabled, setAutomodEnabled] = useState(false);
  const [automodKeywords, setAutomodKeywords] = useState<string[]>([]);
  const [userPro, setUserPro] = useState(false);

  const library = libraries.find((l) => l.id === server?.libraryId);
  const myRole = roles.find((r) => r.id === myRoleId);
  const canManage = Boolean(
    isOwner || library?.role === "owner" || myRole?.canManageServer || myRole?.name === "Owner",
  );

  const navGroups: SettingsNavGroup[] = useMemo(
    () => [
      {
        label: "Server profile",
        items: [{ id: "overview", label: "Overview" }],
      },
      {
        label: "People",
        items: [
          { id: "members", label: "Members", badge: members.length },
          { id: "roles", label: "Roles" },
          { id: "invites", label: "Invites" },
          { id: "requests", label: "Join requests", badge: joinRequests.length },
        ],
      },
      {
        label: "Customization",
        items: [
          { id: "channels", label: "Channels" },
          { id: "emoji", label: "Emoji" },
          { id: "stickers", label: "Stickers" },
        ],
      },
      {
        label: "Engagement",
        items: [
          { id: "onboarding", label: "Onboarding" },
          { id: "widget", label: "Widget" },
          { id: "boost", label: "Server Boost", badge: server?.boostCount },
        ],
      },
      {
        label: "Moderation",
        items: [
          { id: "verification", label: "Verification" },
          { id: "notifications", label: "Notifications" },
          { id: "moderation", label: "Bans & audit" },
          { id: "automod", label: "AutoMod" },
        ],
      },
      {
        label: "Apps",
        items: [{ id: "integrations", label: "Integrations" }],
      },
      {
        label: "Account",
        items: [{ id: "leave", label: "Leave server" }],
      },
      {
        label: "Danger zone",
        items: [{ id: "danger", label: "Delete server" }],
      },
    ],
    [members.length, joinRequests.length, server?.boostCount],
  );

  const selectTab = useCallback(
    (next: SettingsTab) => {
      setTab(next);
      const params = new URLSearchParams(searchParams);
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    setTab(parseSettingsTab(searchParams.get("tab")));
  }, [searchParams]);

  const applyServer = useCallback((s: CommunityServer) => {
    setServer(s);
    setName(s.name);
    setDescription(s.description ?? "");
    setIconUrl(s.iconUrl);
    setIsPublic(s.isPublic);
    setIsOfficial(s.isOfficial);
    setJoinMode(s.joinMode);
    setInviteCode(s.inviteCode || "");
    setRules(s.rules ?? "");
    setWelcomeMessage(s.welcomeMessage ?? "");
    setVerificationLevel(s.verificationLevel ?? "none");
    setExplicitContentFilter(s.explicitContentFilter ?? "disabled");
    setDefaultNotifications(s.defaultNotifications ?? "all");
    setSystemChannelId(s.systemChannelId ?? "");
    setRulesChannelId(s.rulesChannelId ?? "");
    setAutomodEnabled(Boolean(s.automodEnabled));
    setAutomodKeywords(s.automodKeywords ?? []);
  }, []);

  const canUseHolo = canUseHoloRoles({
    proEnabled: userPro,
    boostLevel: server?.boostLevel ?? 0,
  });

  const refresh = useCallback(async () => {
    if (!serverId || !user) return;
    setError("");
    try {
      const [s, r, mems, banList, audit, cats, groups, requests, roleId] = await Promise.all([
        getServer(serverId),
        listServerRolesWithCounts(serverId),
        listServerMembers(serverId),
        listServerBans(serverId).catch(() => [] as CommunityServerBan[]),
        listServerAuditLog(serverId).catch(() => [] as CommunityServerAuditEntry[]),
        listCommunityCategories(serverId),
        listCommunityGroups(user.id, serverId),
        listPendingJoinRequests(serverId).catch(() => [] as CommunityJoinRequest[]),
        getMyServerRoleId(serverId, user.id),
      ]);
      if (!s) throw new Error("Server not found");
      applyServer(s);
      setRoles(r);
      setMembers(mems);
      setBans(banList);
      setAuditLog(audit);
      setCategories(cats);
      setChannels(groups);
      setJoinRequests(requests);
      setMyRoleId(roleId);
      if (user) {
        const profile = await getCommunityProfile(user.id);
        setUserPro(Boolean(profile?.proEnabled ?? profile?.nitroEnabled));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [serverId, user, applyServer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!serverId) return <EmptyState title="Server not found" />;
  if (loading) return <p className="text-muted">Loading settings…</p>;
  if (!server) {
    return <EmptyState title="Server not found" description="It may have been deleted." />;
  }
  if (!canManage || !user) {
    return (
      <EmptyState
        title="Settings locked"
        description="You need Manage Server permission or library ownership to configure this server."
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

  const pinToOfficialTop = async () => {
    if (!isOwner || !isOfficial) return;
    setPinBusy(true);
    setError("");
    try {
      await pinOfficialServerToTop(serverId);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pin server");
    } finally {
      setPinBusy(false);
    }
  };

  const isPinnedOfficial = (server.officialPosition ?? 0) === 0;

  const uploadIcon = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      setIconUrl(await uploadCommunityImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <CommunityDiscordShell pane="server" activeServerId={serverId} onAdd={() => navigate("/community")}>
      <CommunityPanelHeader
        title="Server settings"
        subtitle={server.name}
        trailing={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/home")}>
              Home
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/community/s/${serverId}`)}>
              Back
            </Button>
          </div>
        }
      />
      <CommunityScrollBody className="px-4 py-4">
      <div className="mb-4 lg:hidden">
        <Button variant="secondary" size="sm" className="w-full" onClick={() => setSettingsSheetOpen(true)}>
          Browse settings sections
        </Button>
      </div>

      <CommunitySettingsSheet
        open={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        activeTab={tab}
        groups={navGroups}
        onSelect={selectTab}
      />

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}
      {saved && tab === "overview" && (
        <p className="mb-4 text-[0.875rem] text-accent">Saved.</p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="hidden lg:block">
          <SettingsNav groups={navGroups} tab={tab} onChange={selectTab} />
        </div>

        <div className="min-w-0 flex-1">
          {tab === "overview" && (
            <form onSubmit={saveOverview} className="max-w-lg space-y-4">
              <div className="grid gap-3 rounded-[var(--radius-group)] bg-fill p-4 sm:grid-cols-3">
                <div>
                  <p className="text-[0.75rem] text-muted">Members</p>
                  <p className="text-[1.25rem] font-semibold">{server.memberCount}</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-muted">Messages</p>
                  <p className="text-[1.25rem] font-semibold">{server.messageCount}</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-muted">Activity</p>
                  <p className="text-[1.25rem] font-semibold">{Math.round(server.activityScore)}</p>
                </div>
              </div>

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
                rows={4}
                hint="Line breaks are preserved. Shown in Discover and Official lists."
              />

              {isOwner && (
                <div className="space-y-2">
                  <ToggleRow
                    label="Official server"
                    hint="Featured in the Official servers list on Discover"
                    checked={isOfficial}
                    onChange={setIsOfficial}
                  />
                  {isOfficial && !isPinnedOfficial && (
                    <Button type="button" size="sm" variant="secondary" disabled={pinBusy} onClick={() => void pinToOfficialTop()}>
                      {pinBusy ? "Pinning…" : "Pin to top of Official list"}
                    </Button>
                  )}
                  {isOfficial && isPinnedOfficial && (
                    <p className="text-[0.8125rem] text-muted">Pinned at the top of the Official list.</p>
                  )}
                </div>
              )}

              <p className="text-[0.8125rem] text-muted">
                Created {new Date(server.createdAt).toLocaleDateString()} · Library:{" "}
                <Link to="/settings" className="text-link">
                  {library?.name || server.libraryId}
                </Link>
              </p>

              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          )}

          {tab === "members" && (
            <MembersTab
              serverId={serverId}
              members={members}
              roles={roles}
              currentUserId={user.id}
              onChanged={refresh}
              onError={setError}
            />
          )}

          {tab === "roles" && (
            <RolesPanel
              serverId={serverId}
              roles={roles}
              canUseHolo={canUseHolo}
              onChanged={refresh}
              onError={setError}
            />
          )}

          {tab === "channels" && (
            <ChannelsPanel
              serverId={serverId}
              userId={user.id}
              categories={categories}
              channels={channels}
              roles={roles}
              onChanged={refresh}
              onError={setError}
            />
          )}

          {tab === "invites" && (
            <InvitesTab
              inviteCode={inviteCode}
              joinMode={joinMode}
              isPublic={isPublic}
              regenBusy={regenBusy}
              busy={busy}
              onJoinModeChange={setJoinMode}
              onPublicChange={setIsPublic}
              onRegenerate={async () => {
                setRegenBusy(true);
                setError("");
                try {
                  const next = await regenerateServerInviteCode(serverId);
                  setInviteCode(next);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not regenerate");
                } finally {
                  setRegenBusy(false);
                }
              }}
              onSave={async () => {
                setBusy(true);
                setError("");
                try {
                  await updateServer(serverId, { isPublic, joinMode });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {tab === "requests" && (
            <JoinRequestsPanel requests={joinRequests} onChanged={refresh} onError={setError} />
          )}

          {tab === "emoji" && user && (
            <EmojiTab serverId={serverId} userId={user.id} boostCount={server?.boostCount ?? 0} onError={setError} />
          )}

          {tab === "stickers" && user && (
            <StickersTab serverId={serverId} userId={user.id} onError={setError} />
          )}

          {tab === "widget" && <WidgetTab serverId={serverId} serverName={server.name} />}

          {tab === "boost" && user && (
            <BoostTab server={server} userId={user.id} onChanged={refresh} onError={setError} />
          )}

          {tab === "onboarding" && (
            <OnboardingTab
              server={server}
              channels={channels}
              rules={rules}
              welcomeMessage={welcomeMessage}
              rulesChannelId={rulesChannelId}
              systemChannelId={systemChannelId}
              busy={busy}
              onRulesChange={setRules}
              onWelcomeChange={setWelcomeMessage}
              onRulesChannelChange={setRulesChannelId}
              onSystemChannelChange={setSystemChannelId}
              onSave={async () => {
                setBusy(true);
                setError("");
                try {
                  await updateServer(serverId, {
                    rules,
                    welcomeMessage,
                    systemChannelId: systemChannelId || null,
                    rulesChannelId: rulesChannelId || null,
                  });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {tab === "verification" && (
            <VerificationTab
              verificationLevel={verificationLevel}
              explicitContentFilter={explicitContentFilter}
              busy={busy}
              onVerificationChange={setVerificationLevel}
              onContentFilterChange={setExplicitContentFilter}
              onSave={async () => {
                setBusy(true);
                setError("");
                try {
                  await updateServer(serverId, {
                    verificationLevel,
                    explicitContentFilter,
                  });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {tab === "notifications" && (
            <NotificationsTab
              defaultNotifications={defaultNotifications}
              busy={busy}
              onNotificationsChange={setDefaultNotifications}
              onSave={async () => {
                setBusy(true);
                setError("");
                try {
                  await updateServer(serverId, { defaultNotifications });
                  await refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {tab === "integrations" && user && (
            <IntegrationsTab serverId={serverId} userId={user.id} onError={setError} />
          )}

          {tab === "automod" && (
            <AutomodTab
              serverId={serverId}
              automodEnabled={automodEnabled}
              automodKeywords={automodKeywords}
              busy={busy}
              onChanged={refresh}
              onError={setError}
            />
          )}

          {tab === "leave" && (
            <div className="max-w-lg">
              <div className="rounded-[var(--radius-group)] border border-[var(--community-border)] bg-fill/40 p-4">
                <p className="font-medium">Leave server</p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  You will lose access to channels and messages until you join again.
                </p>
                <Button
                  className="mt-3"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!user) return;
                    if (!confirm(`Leave “${server.name}”?`)) return;
                    setBusy(true);
                    try {
                      await leaveServer(serverId, user.id);
                      navigate("/community");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not leave");
                      setBusy(false);
                    }
                  }}
                >
                  Leave server
                </Button>
              </div>
            </div>
          )}


          {tab === "moderation" && (
            <ModerationTab
              serverId={serverId}
              bans={bans}
              auditLog={auditLog}
              onChanged={refresh}
              onError={setError}
            />
          )}

          {tab === "danger" && (
            <div className="max-w-lg">
              <div className="rounded-[var(--radius-group)] border border-destructive/30 bg-destructive-bg/40 p-4">
                <p className="font-medium text-destructive">Delete server</p>
                <p className="mt-1 text-[0.8125rem] text-muted">
                  Permanently removes this server, its channels, roles, members, and messages. The
                  library itself is not deleted.
                </p>
                <Button
                  className="mt-3"
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirm(`Delete server “${server.name}”? This cannot be undone.`)) return;
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
            </div>
          )}
        </div>
      </div>
      </CommunityScrollBody>
    </CommunityDiscordShell>
  );
}
