import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader, Group, EmptyState } from "@/components/layout";
import { Button } from "@/components/Button";
import { FormError, TextField, TextArea } from "@/components/form";
import {
  banUser,
  listAdminLibraries,
  listEnterpriseLeads,
  notifyUser,
  redeemLibraryAccessCode,
  requestLibraryAccessCode,
  searchAdminUsers,
  setUserTier,
  unbanUser,
  updateEnterpriseLeadStatus,
  type AdminLibraryRow,
  type AdminUserRow,
  type EnterpriseLead,
} from "@/lib/admin";
import { TIER_LIMITS, TIER_ORDER, type SubscriptionTier, getTierLimits } from "@/lib/tiers";

type AdminTab = "support" | "users" | "libraries" | "enterprise" | "pricing";

function parseTab(raw: string | null): AdminTab {
  if (
    raw === "users" ||
    raw === "libraries" ||
    raw === "enterprise" ||
    raw === "pricing" ||
    raw === "support"
  ) {
    return raw;
  }
  return "support";
}

export function AdminPage() {
  const { isStaff, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const setTab = (next: AdminTab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  if (loading) return <p className="px-1 text-muted">Loading…</p>;
  if (!isStaff) return <Navigate to="/library" replace />;

  return (
    <div>
      <PageHeader title="Admin" subtitle="Support, users, libraries, and billing" />

      <div className="mb-4 flex flex-wrap gap-2 px-1">
        {(
          [
            ["support", "Support Inbox"],
            ["users", "Users"],
            ["libraries", "Libraries"],
            ["enterprise", "Enterprise"],
            ["pricing", "Plans"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ${
              tab === id ? "bg-accent text-accent-contrast" : "bg-fill text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "support" && <SupportInboxTab />}
      {tab === "users" && <UsersTab />}
      {tab === "libraries" && <LibrariesTab />}
      {tab === "enterprise" && <EnterpriseTab />}
      {tab === "pricing" && <PricingAdminTab />}
    </div>
  );
}

function SupportInboxTab() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTickets((data ?? []) as Ticket[]);
        setReady(true);
      });
  }, []);

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div>
      <p className="mb-3 px-1 text-[0.875rem] text-muted">
        {openCount} open · {tickets.length} total
      </p>
      {ready && tickets.length === 0 ? (
        <p className="px-1 text-[0.9375rem] text-muted">No support requests received.</p>
      ) : (
        <Group>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-4 py-3 hairline-b last:border-b-0 active:bg-fill-secondary"
            >
              <div className="min-w-0">
                <p className="truncate text-[1.0625rem]">{ticket.subject}</p>
                <p className="truncate text-[0.9375rem] text-muted">{ticket.contact_email}</p>
              </div>
              <span
                className={`shrink-0 text-[0.9375rem] ${
                  ticket.status === "open" ? "font-medium text-link" : "text-muted"
                }`}
              >
                {ticket.status === "open" ? "Open" : "Closed"} · {formatWhen(ticket.created_at)}
              </span>
            </Link>
          ))}
        </Group>
      )}
    </div>
  );
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setError("");
    setBusy(true);
    try {
      setUsers(await searchAdminUsers(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void search();
          }}
          placeholder="Search display name, @username, or email"
          className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
        />
        <Button disabled={busy || !query.trim()} onClick={() => void search()}>
          {busy ? "…" : "Search"}
        </Button>
      </div>
      {error && <FormError message={error} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Group>
          {users.length === 0 ? (
            <p className="px-4 py-6 text-[0.875rem] text-muted">Search to find users.</p>
          ) : (
            users.map((u) => (
              <button
                key={u.userId}
                type="button"
                onClick={() => setSelected(u)}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hairline-b last:border-b-0 ${
                  selected?.userId === u.userId ? "bg-fill-secondary" : "active:bg-fill-secondary"
                }`}
              >
                <span className="font-medium">
                  {u.displayName || u.communityUsername || "User"}
                  {u.bannedAt ? " · Banned" : ""}
                </span>
                <span className="text-[0.8125rem] text-muted">
                  {u.communityUsername ? `@${u.communityUsername}` : u.userId.slice(0, 8)}
                  {u.email ? ` · ${u.email}` : ""} · {u.subscriptionTier}
                </span>
              </button>
            ))
          )}
        </Group>

        {selected && (
          <UserModPanel
            user={selected}
            onUpdated={(next) => {
              setSelected(next);
              setUsers((prev) => prev.map((u) => (u.userId === next.userId ? next : u)));
            }}
            onError={setError}
          />
        )}
      </div>
    </div>
  );
}

function UserModPanel({
  user,
  onUpdated,
  onError,
}: {
  user: AdminUserRow;
  onUpdated: (u: AdminUserRow) => void;
  onError: (msg: string) => void;
}) {
  const [tier, setTier] = useState<SubscriptionTier>(user.subscriptionTier);
  const [bookOverride, setBookOverride] = useState(
    user.bookLimitOverride != null ? String(user.bookLimitOverride) : "",
  );
  const [scanOverride, setScanOverride] = useState(
    user.shelfScanLimitOverride != null ? String(user.shelfScanLimitOverride) : "",
  );
  const [banReason, setBanReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const limits = useMemo(
    () =>
      getTierLimits(tier, {
        bookLimitOverride: bookOverride ? Number(bookOverride) : null,
        shelfScanLimitOverride: scanOverride ? Number(scanOverride) : null,
      }),
    [tier, bookOverride, scanOverride],
  );

  useEffect(() => {
    setTier(user.subscriptionTier);
    setBookOverride(user.bookLimitOverride != null ? String(user.bookLimitOverride) : "");
    setScanOverride(user.shelfScanLimitOverride != null ? String(user.shelfScanLimitOverride) : "");
  }, [user]);

  return (
    <div className="space-y-4 rounded-[var(--radius-group)] border border-[var(--border)] bg-surface p-4">
      <div>
        <h2 className="text-lg font-semibold">{user.displayName || "User"}</h2>
        <p className="text-[0.8125rem] text-muted font-mono">{user.userId}</p>
        {user.bannedAt && (
          <p className="mt-1 text-[0.875rem] text-destructive">
            Banned{user.banReason ? `: ${user.banReason}` : ""}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-[0.8125rem] font-medium">Subscription tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as SubscriptionTier)}
          className="w-full rounded-[var(--radius-control)] bg-fill px-3 py-2"
        >
          {TIER_ORDER.map((t) => (
            <option key={t} value={t}>
              {TIER_LIMITS[t].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[0.75rem] text-muted">
          Effective limits: {limits.maxBooks} books · {limits.maxShelfScansPerMonth} shelf scans/mo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TextField
          label="Book limit override"
          value={bookOverride}
          onChange={(e) => setBookOverride(e.target.value)}
          placeholder="Default"
        />
        <TextField
          label="Scan limit override"
          value={scanOverride}
          onChange={(e) => setScanOverride(e.target.value)}
          placeholder="Default"
        />
      </div>

      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          onError("");
          try {
            await setUserTier(
              user.userId,
              tier,
              bookOverride ? Number(bookOverride) : null,
              scanOverride ? Number(scanOverride) : null,
            );
            onUpdated({
              ...user,
              subscriptionTier: tier,
              proEnabled: tier !== "free",
              bookLimitOverride: bookOverride ? Number(bookOverride) : null,
              shelfScanLimitOverride: scanOverride ? Number(scanOverride) : null,
            });
          } catch (err) {
            onError(err instanceof Error ? err.message : "Could not update tier");
          } finally {
            setBusy(false);
          }
        }}
      >
        Save tier / limits
      </Button>

      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        <TextField
          label="Ban reason"
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Optional"
        />
        <div className="flex flex-wrap gap-2">
          {!user.bannedAt ? (
            <Button
              variant="danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Ban ${user.displayName || "this user"}?`)) return;
                setBusy(true);
                try {
                  await banUser(user.userId, banReason);
                  onUpdated({
                    ...user,
                    bannedAt: new Date().toISOString(),
                    banReason: banReason || null,
                  });
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not ban");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Ban user
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await unbanUser(user.userId);
                  onUpdated({ ...user, bannedAt: null, banReason: null });
                } catch (err) {
                  onError(err instanceof Error ? err.message : "Could not unban");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Unban user
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-[var(--border)] pt-4">
        <TextArea
          label="Send in-app notification"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Message to show in their Notifications"
        />
        <Button
          variant="secondary"
          disabled={busy || !message.trim()}
          onClick={async () => {
            setBusy(true);
            try {
              await notifyUser({
                userId: user.userId,
                title: "Message from Shelfie Support",
                body: message.trim(),
              });
              setMessage("");
            } catch (err) {
              onError(err instanceof Error ? err.message : "Could not notify");
            } finally {
              setBusy(false);
            }
          }}
        >
          Send notification
        </Button>
      </div>
    </div>
  );
}

function LibrariesTab() {
  const [query, setQuery] = useState("");
  const [libraries, setLibraries] = useState<AdminLibraryRow[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      setLibraries(await listAdminLibraries(query));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load libraries");
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <p className="text-[0.875rem] text-muted">
        You can always view libraries. To edit, request a one-time access code — the library owner
        gets it in Notifications and shares it via support. Redeem the code here to unlock 4 hours of
        edit access.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search libraries"
          className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2"
        />
        <Button variant="secondary" onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-[var(--radius-group)] border border-[var(--border)] bg-fill/40 p-3 sm:flex-row sm:items-end">
        <TextField
          label="Redeem access code"
          value={redeemCode}
          onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
          placeholder="ABCD1234"
        />
        <Button
          disabled={!redeemCode.trim()}
          onClick={async () => {
            setError("");
            setNotice("");
            try {
              const result = await redeemLibraryAccessCode(redeemCode);
              setNotice(
                `Edit access unlocked for library ${result.libraryId} until ${new Date(result.expiresAt).toLocaleString()}`,
              );
              setRedeemCode("");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Invalid code");
            }
          }}
        >
          Redeem
        </Button>
      </div>

      {error && <FormError message={error} />}
      {notice && <p className="text-[0.875rem] text-link">{notice}</p>}

      <Group>
        {libraries.length === 0 ? (
          <EmptyState title="No libraries" description="Try a different search." />
        ) : (
          libraries.map((lib) => (
            <div
              key={lib.id}
              className="flex flex-col gap-2 px-4 py-3 hairline-b last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium">{lib.name}</p>
                <p className="text-[0.8125rem] text-muted">
                  Owner: {lib.ownerName || lib.ownerUserId || "—"} · {lib.memberCount} members
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === lib.id}
                  onClick={async () => {
                    setBusyId(lib.id);
                    setError("");
                    setNotice("");
                    try {
                      const result = await requestLibraryAccessCode(lib.id);
                      setNotice(
                        `Access code sent to the library owner’s Notifications. Code (for your records if they share it): ${result.code}`,
                      );
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not request code");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Request access code
                </Button>
              </div>
            </div>
          ))
        )}
      </Group>
    </div>
  );
}

function EnterpriseTab() {
  const [leads, setLeads] = useState<EnterpriseLead[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setLeads(await listEnterpriseLeads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load leads");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      <p className="text-[0.875rem] text-muted">
        Enterprise contact form submissions. Notify them in-app or email them directly.
      </p>
      {error && <FormError message={error} />}
      <Group>
        {leads.length === 0 ? (
          <p className="px-4 py-6 text-muted">No enterprise inquiries yet.</p>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="space-y-2 px-4 py-3 hairline-b last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {lead.name}
                    {lead.company ? ` · ${lead.company}` : ""}
                  </p>
                  <p className="text-[0.8125rem] text-muted">
                    {lead.email}
                    {lead.teamSize ? ` · Team ${lead.teamSize}` : ""} · {lead.status}
                  </p>
                </div>
                <select
                  value={lead.status}
                  onChange={async (e) => {
                    const status = e.target.value as EnterpriseLead["status"];
                    try {
                      await updateEnterpriseLeadStatus(lead.id, status);
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Update failed");
                    }
                  }}
                  className="rounded bg-fill px-2 py-1 text-[0.8125rem]"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <p className="whitespace-pre-wrap text-[0.875rem]">{lead.message}</p>
              <a className="text-[0.8125rem] text-link" href={`mailto:${lead.email}`}>
                Email {lead.email}
              </a>
            </div>
          ))
        )}
      </Group>
    </div>
  );
}

function PricingAdminTab() {
  return (
    <div className="space-y-3">
      <p className="text-[0.875rem] text-muted">
        Public pricing lives at <Link to="/pricing" className="text-link">/pricing</Link>. Stripe
        checkout uses <code className="text-[0.8125rem]">STRIPE_SECRET_KEY</code> when configured;
        otherwise grant tiers manually from Users.
      </p>
      <Group>
        {TIER_ORDER.map((tier) => {
          const limits = TIER_LIMITS[tier];
          return (
            <div key={tier} className="px-4 py-3 hairline-b last:border-b-0">
              <p className="font-semibold">
                {limits.label}
                {limits.priceMonthlyUsd != null
                  ? ` — $${limits.priceMonthlyUsd}/mo`
                  : " — Contact sales"}
              </p>
              <p className="text-[0.8125rem] text-muted">
                {limits.maxBooks} books · {limits.maxShelfScansPerMonth} shelf scans/mo ·{" "}
                {limits.maxLibraries} libraries · {limits.maxMembersPerLibrary} members/library
              </p>
              <p className="mt-1 text-[0.8125rem]">{limits.description}</p>
            </div>
          );
        })}
      </Group>
    </div>
  );
}
