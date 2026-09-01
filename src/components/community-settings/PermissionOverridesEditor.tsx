import { useEffect, useMemo, useState } from "react";
import {
  clearPermissionOverride,
  listPermissionOverrides,
  PERMISSION_LABELS,
  upsertPermissionOverride,
  type CommunityPermissionOverride,
  type PermissionOverrideTarget,
  type ResolvedChannelPermissions,
} from "@/lib/community-permissions";
import type { CommunityServerRole } from "@/lib/community-types";

type TriState = "inherit" | "allow" | "deny";

const PERM_KEYS: (keyof ResolvedChannelPermissions)[] = [
  "view",
  "sendMessages",
  "manageMessages",
  "manageChannel",
  "connect",
  "mentionEveryone",
];

const PATCH_KEY: Record<
  keyof ResolvedChannelPermissions,
  keyof Pick<
    CommunityPermissionOverride,
    | "allowView"
    | "allowSendMessages"
    | "allowManageMessages"
    | "allowManageChannel"
    | "allowConnect"
    | "allowMentionEveryone"
  >
> = {
  view: "allowView",
  sendMessages: "allowSendMessages",
  manageMessages: "allowManageMessages",
  manageChannel: "allowManageChannel",
  connect: "allowConnect",
  mentionEveryone: "allowMentionEveryone",
};

function triFromValue(v: boolean | null | undefined): TriState {
  if (v === true) return "allow";
  if (v === false) return "deny";
  return "inherit";
}

function valueFromTri(t: TriState): boolean | null {
  if (t === "allow") return true;
  if (t === "deny") return false;
  return null;
}

export function PermissionOverridesEditor({
  serverId,
  targetType,
  targetId,
  roles,
  onError,
}: {
  serverId: string;
  targetType: PermissionOverrideTarget;
  targetId: string;
  roles: CommunityServerRole[];
  onError?: (msg: string) => void;
}) {
  const [overrides, setOverrides] = useState<CommunityPermissionOverride[]>([]);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => b.position - a.position || a.name.localeCompare(b.name)),
    [roles],
  );

  useEffect(() => {
    void listPermissionOverrides(targetType, targetId)
      .then(setOverrides)
      .catch((err) => onError?.(err instanceof Error ? err.message : "Could not load permissions"));
  }, [targetType, targetId, onError]);

  useEffect(() => {
    if (!roleId && sortedRoles[0]) setRoleId(sortedRoles[0].id);
  }, [roleId, sortedRoles]);

  const selectedOverride = overrides.find((o) => o.roleId === roleId);

  const getTri = (key: keyof ResolvedChannelPermissions): TriState => {
    const patchKey = PATCH_KEY[key];
    return triFromValue(selectedOverride?.[patchKey] ?? null);
  };

  const setTri = async (key: keyof ResolvedChannelPermissions, next: TriState) => {
    if (!roleId) return;
    setBusy(true);
    onError?.("");
    try {
      const allInherit = PERM_KEYS.every((k) => {
        const pk = PATCH_KEY[k];
        const val = k === key ? valueFromTri(next) : (selectedOverride?.[pk] ?? null);
        return val === null;
      });

      if (allInherit) {
        await clearPermissionOverride(targetType, targetId, roleId);
      } else {
        const existing: Record<string, boolean | null> = {};
        for (const k of PERM_KEYS) {
          const pk = PATCH_KEY[k];
          existing[pk] = k === key ? valueFromTri(next) : (selectedOverride?.[pk] ?? null);
        }
        await upsertPermissionOverride({
          serverId,
          targetType,
          targetId,
          roleId,
          patch: existing,
        });
      }

      const fresh = await listPermissionOverrides(targetType, targetId);
      setOverrides(fresh);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Could not save permission");
    } finally {
      setBusy(false);
    }
  };

  if (sortedRoles.length === 0) {
    return <p className="text-[0.875rem] text-muted">Create server roles first to set permissions.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-[0.8125rem] text-muted">
        Override permissions for each role on this {targetType === "category" ? "category" : "channel"}.
        Channel overrides take priority over category overrides.
      </p>

      <label className="block text-[0.8125rem] font-medium text-muted">
        Role
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="mt-1 w-full rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[0.9375rem]"
          disabled={busy}
        >
          {sortedRoles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
              {r.isEveryone ? " (@everyone)" : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-1 rounded-[var(--radius-group)] bg-surface ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
        {PERM_KEYS.map((key) => (
          <label
            key={key}
            className="flex items-center justify-between gap-3 px-4 py-2.5 hairline-b last:hairline-b-0"
          >
            <span className="text-[0.875rem]">{PERMISSION_LABELS[key]}</span>
            <select
              value={getTri(key)}
              onChange={(e) => void setTri(key, e.target.value as TriState)}
              disabled={busy}
              className="rounded-[var(--radius-control)] bg-fill px-2 py-1 text-[0.8125rem]"
            >
              <option value="inherit">Default</option>
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
          </label>
        ))}
      </div>

      {targetType === "category" && (
        <p className="text-[0.75rem] text-muted">
          These defaults apply to every channel in this category unless a channel sets its own
          override.
        </p>
      )}
    </div>
  );
}
