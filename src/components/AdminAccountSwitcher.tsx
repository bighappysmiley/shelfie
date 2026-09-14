import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  altLabel,
  applyAltSession,
  createAltAccount,
  isAltUser,
  listStaffLinkedAccounts,
  removeStaffLinkedAccount,
  returnToMainAccount,
  switchToAltAccount,
  type StaffLinkedAccount,
} from "@/lib/community-account-switcher";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Group, GroupFooter, GroupHeader } from "@/components/layout";
import { TextField } from "@/components/form";

/**
 * Admin alt accounts: label-only personas linked to your main profile.
 * No email. Switching loads a fresh empty app session for that alt.
 */
export function AdminAccountSwitcher() {
  const { user, isAdmin, isOwner } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<StaffLinkedAccount[]>([]);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onAlt = isAltUser(user);
  const allowed = isAdmin || isOwner || onAlt;

  const refresh = async () => {
    if (onAlt) {
      setAccounts([]);
      return;
    }
    try {
      setAccounts(await listStaffLinkedAccounts());
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, user?.id, onAlt]);

  if (!allowed) return null;

  const runSwitch = async (fn: () => Promise<{ tokenHash: string }>, nextPath: string) => {
    setBusy(true);
    setMsg("");
    try {
      const { tokenHash } = await fn();
      await applyAltSession(tokenHash);
      navigate(nextPath, { replace: true });
      window.location.assign(nextPath);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not switch accounts");
      setBusy(false);
    }
  };

  if (onAlt) {
    const name = altLabel(user) || "Alt";
    return (
      <section>
        <GroupHeader>Alt account</GroupHeader>
        <Group>
          <p className="px-4 py-3 text-[0.875rem] text-muted">
            You’re on <span className="font-medium text-foreground">{name}</span> — a fresh Pine
            identity linked to your main profile. This account has no email.
          </p>
          <div className="px-4 py-3">
            <Button
              disabled={busy}
              onClick={() => void runSwitch(() => returnToMainAccount(), "/account")}
            >
              {busy ? "Switching…" : "Back to main account"}
            </Button>
            {msg && <p className="mt-2 text-[0.875rem] text-destructive">{msg}</p>}
          </div>
        </Group>
        <GroupFooter>
          Returning restores your main libraries, community profile, and settings.
        </GroupFooter>
      </section>
    );
  }

  return (
    <section>
      <GroupHeader>Alt accounts</GroupHeader>
      <Group>
        <p className="px-4 py-3 text-[0.875rem] text-muted">
          Create alt personas linked to your profile (no email). Switching opens Pine as a brand-new
          account while staying connected to you.
        </p>

        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex flex-col gap-2 px-4 py-3 hairline-b last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">{acc.label}</p>
              <p className="text-[0.8125rem] text-muted">
                {acc.isAltPersona
                  ? acc.linkedUserId === user?.id
                    ? "Current alt"
                    : "No email · linked to you"
                  : "Legacy linked login"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || acc.linkedUserId === user?.id || !acc.linkedUserId}
                onClick={() => void runSwitch(() => switchToAltAccount(acc.id), "/setup")}
              >
                {acc.linkedUserId === user?.id ? "Current" : "Switch"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setMsg("");
                  try {
                    await removeStaffLinkedAccount(acc.id);
                    await refresh();
                  } catch (err) {
                    setMsg(err instanceof Error ? err.message : "Could not remove alt");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}

        <form
          className="space-y-2 px-4 py-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              await createAltAccount(label.trim());
              setLabel("");
              await refresh();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Could not create alt");
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextField
            label="Alt name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Security, Testing, Public"
            required
          />
          <Button type="submit" disabled={busy || !label.trim()}>
            {busy ? "Creating…" : "Create alt"}
          </Button>
          {msg && <p className="text-[0.875rem] text-destructive">{msg}</p>}
        </form>
      </Group>
      <GroupFooter>
        Alts don’t use email or passwords — only you can switch into them from this account.
      </GroupFooter>
    </section>
  );
}
