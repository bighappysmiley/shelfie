import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addStaffLinkedAccount,
  listStaffLinkedAccounts,
  removeStaffLinkedAccount,
} from "@/lib/community-account-switcher";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/Button";
import { Group, GroupFooter, GroupHeader } from "@/components/layout";
import { TextField } from "@/components/form";

/**
 * Admin-only account switcher for security / alt accounts.
 * Stores linked emails, then switches with email + password (no stored passwords).
 */
export function AdminAccountSwitcher() {
  const { user, isAdmin, isOwner, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<
    { id: string; email: string; label: string; linkedUserId: string | null }[]
  >([]);
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [password, setPassword] = useState("");
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const allowed = isAdmin || isOwner;

  const refresh = async () => {
    try {
      setAccounts(await listStaffLinkedAccounts());
    } catch {
      setAccounts([]);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void refresh();
  }, [allowed, user?.id]);

  if (!allowed) return null;

  return (
    <section>
      <GroupHeader>Account switcher</GroupHeader>
      <Group>
        <p className="px-4 py-3 text-[0.875rem] text-muted">
          Link security / alt accounts, then switch into them with their password. Only admins see
          this.
        </p>

        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex flex-col gap-2 px-4 py-3 hairline-b last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium">{acc.label}</p>
              <p className="truncate text-[0.8125rem] text-muted">{acc.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {switchingTo === acc.email ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setMsg("");
                    try {
                      await signOut();
                      await signIn(acc.email, password);
                      setPassword("");
                      setSwitchingTo(null);
                      navigate("/home", { replace: true });
                    } catch (err) {
                      setMsg(err instanceof Error ? err.message : "Could not switch accounts");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    autoFocus
                    className="rounded-[var(--radius-control)] bg-fill px-3 py-1.5 text-[0.875rem]"
                  />
                  <Button type="submit" size="sm" disabled={busy || !password}>
                    {busy ? "…" : "Switch"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSwitchingTo(null);
                      setPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={acc.email === user?.email}
                    onClick={() => setSwitchingTo(acc.email)}
                  >
                    {acc.email === user?.email ? "Current" : "Switch"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await removeStaffLinkedAccount(acc.id);
                      await refresh();
                    }}
                  >
                    Remove
                  </Button>
                </>
              )}
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
              await addStaffLinkedAccount(email, label || email);
              setEmail("");
              setLabel("");
              await refresh();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Could not add account");
            } finally {
              setBusy(false);
            }
          }}
        >
          <TextField
            label="Alt account email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="security@example.com"
            required
          />
          <TextField
            label="Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Security account"
          />
          <Button type="submit" disabled={busy || !email.trim()}>
            Add linked account
          </Button>
          {msg && <p className="text-[0.875rem] text-destructive">{msg}</p>}
        </form>
      </Group>
      <GroupFooter>
        Switching signs you out of the current session and into the linked account. Keep passwords
        only in a password manager — Pine never stores them.
      </GroupFooter>
    </section>
  );
}
