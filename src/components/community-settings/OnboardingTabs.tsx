import type {
  CommunityGroup,
  CommunityServer,
  DefaultNotifications,
  ExplicitContentFilter,
  VerificationLevel,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextArea, SelectField } from "@/components/form";

export function OnboardingTab({
  server,
  channels,
  rules,
  welcomeMessage,
  rulesChannelId,
  systemChannelId,
  busy,
  onRulesChange,
  onWelcomeChange,
  onRulesChannelChange,
  onSystemChannelChange,
  onSave,
}: {
  server: CommunityServer;
  channels: CommunityGroup[];
  rules: string;
  welcomeMessage: string;
  rulesChannelId: string;
  systemChannelId: string;
  busy: boolean;
  onRulesChange: (v: string) => void;
  onWelcomeChange: (v: string) => void;
  onRulesChannelChange: (v: string) => void;
  onSystemChannelChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Onboarding for {server.name} — rules, welcome messages, and where members see them.
      </p>

      <TextArea
        label="Server rules"
        value={rules}
        onChange={(e) => onRulesChange(e.target.value)}
        rows={5}
        hint="Shown in the rules channel and during onboarding"
      />

      <TextArea
        label="Welcome message"
        value={welcomeMessage}
        onChange={(e) => onWelcomeChange(e.target.value)}
        rows={3}
        hint="Posted to the system channel when someone joins"
      />

      <SelectField
        label="Rules channel"
        value={rulesChannelId}
        onChange={(e) => onRulesChannelChange(e.target.value)}
        hint="Where server rules are pinned for members"
      >
        <option value="">None</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            #{ch.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="System messages channel"
        value={systemChannelId}
        onChange={(e) => onSystemChannelChange(e.target.value)}
        hint="Join, leave, and other system events"
      >
        <option value="">None</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            #{ch.name}
          </option>
        ))}
      </SelectField>

      <Button disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : "Save onboarding"}
      </Button>
    </div>
  );
}

export function VerificationTab({
  verificationLevel,
  explicitContentFilter,
  busy,
  onVerificationChange,
  onContentFilterChange,
  onSave,
}: {
  verificationLevel: VerificationLevel;
  explicitContentFilter: ExplicitContentFilter;
  busy: boolean;
  onVerificationChange: (v: VerificationLevel) => void;
  onContentFilterChange: (v: ExplicitContentFilter) => void;
  onSave: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Safety setup — control who can join and how strictly new members are verified.
      </p>

      <SelectField
        label="Verification level"
        value={verificationLevel}
        onChange={(e) => onVerificationChange(e.target.value as VerificationLevel)}
        hint="How strictly new members are verified before they can participate"
      >
        <option value="none">None — open access</option>
        <option value="low">Low — must have verified email</option>
        <option value="medium">Medium — account age required</option>
        <option value="high">High — invite or manual approval only</option>
      </SelectField>

      <SelectField
        label="Explicit media content filter"
        value={explicitContentFilter}
        onChange={(e) => onContentFilterChange(e.target.value as ExplicitContentFilter)}
        hint="Scan messages from members without a role, or from everyone"
      >
        <option value="disabled">Don't scan</option>
        <option value="no_role">Scan members without a role</option>
        <option value="all">Scan all members</option>
      </SelectField>

      <Button disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : "Save verification"}
      </Button>
    </div>
  );
}

export function NotificationsTab({
  defaultNotifications,
  busy,
  onNotificationsChange,
  onSave,
}: {
  defaultNotifications: DefaultNotifications;
  busy: boolean;
  onNotificationsChange: (v: DefaultNotifications) => void;
  onSave: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Default notification settings applied when someone joins this server.
      </p>

      <SelectField
        label="Default notifications"
        value={defaultNotifications}
        onChange={(e) => onNotificationsChange(e.target.value as DefaultNotifications)}
      >
        <option value="all">All messages</option>
        <option value="mentions">Only @mentions</option>
      </SelectField>

      <Button disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : "Save notifications"}
      </Button>
    </div>
  );
}

export function WidgetTab({ serverId, serverName }: { serverId: string; serverName: string }) {
  const embedSnippet = `<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/community/s/${serverId}" title="${serverName}" width="350" height="500" frameborder="0"></iframe>`;

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Embed this server on your website. Full widget hosting is coming soon — use the server ID
        and invite link in the meantime.
      </p>

      <div className="rounded-[var(--radius-group)] bg-fill px-4 py-3">
        <p className="text-[0.8125rem] font-medium">Server ID</p>
        <p className="mt-1 break-all font-mono text-[0.875rem]">{serverId}</p>
      </div>

      <div className="rounded-[var(--radius-group)] bg-fill px-4 py-3">
        <p className="text-[0.8125rem] font-medium">Preview embed code</p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-[0.75rem] text-muted">
          {embedSnippet}
        </pre>
      </div>
    </div>
  );
}
