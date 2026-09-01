import type {
  CommunityGroup,
  CommunityServer,
  DefaultNotifications,
  ExplicitContentFilter,
  VerificationLevel,
} from "@/lib/community-types";
import { Button } from "@/components/Button";
import { TextArea, SelectField } from "@/components/form";

export function SafetyTab({
  server,
  channels,
  rules,
  welcomeMessage,
  verificationLevel,
  explicitContentFilter,
  defaultNotifications,
  systemChannelId,
  rulesChannelId,
  busy,
  onRulesChange,
  onWelcomeChange,
  onVerificationChange,
  onContentFilterChange,
  onNotificationsChange,
  onSystemChannelChange,
  onRulesChannelChange,
  onSave,
}: {
  server: CommunityServer;
  channels: CommunityGroup[];
  rules: string;
  welcomeMessage: string;
  verificationLevel: VerificationLevel;
  explicitContentFilter: ExplicitContentFilter;
  defaultNotifications: DefaultNotifications;
  systemChannelId: string;
  rulesChannelId: string;
  busy: boolean;
  onRulesChange: (v: string) => void;
  onWelcomeChange: (v: string) => void;
  onVerificationChange: (v: VerificationLevel) => void;
  onContentFilterChange: (v: ExplicitContentFilter) => void;
  onNotificationsChange: (v: DefaultNotifications) => void;
  onSystemChannelChange: (v: string) => void;
  onRulesChannelChange: (v: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[0.875rem] text-muted">
        Community rules, welcome messages, and safety defaults for {server.name}.
      </p>

      <TextArea
        label="Server rules"
        value={rules}
        onChange={(e) => onRulesChange(e.target.value)}
        rows={4}
        hint="Shown to new members (rules channel or onboarding)"
      />

      <TextArea
        label="Welcome message"
        value={welcomeMessage}
        onChange={(e) => onWelcomeChange(e.target.value)}
        rows={3}
        hint="Posted when someone joins (system channel)"
      />

      <SelectField
        label="Verification level"
        value={verificationLevel}
        onChange={(e) => onVerificationChange(e.target.value as VerificationLevel)}
        hint="How strictly new members are verified"
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
      >
        <option value="disabled">Don't scan</option>
        <option value="no_role">Scan members without a role</option>
        <option value="all">Scan all members</option>
      </SelectField>

      <SelectField
        label="Default notifications"
        value={defaultNotifications}
        onChange={(e) => onNotificationsChange(e.target.value as DefaultNotifications)}
        hint="Default for new members"
      >
        <option value="all">All messages</option>
        <option value="mentions">Only @mentions</option>
      </SelectField>

      <SelectField
        label="System messages channel"
        value={systemChannelId}
        onChange={(e) => onSystemChannelChange(e.target.value)}
        hint="Join/leave and system events"
      >
        <option value="">None</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            #{ch.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Rules channel"
        value={rulesChannelId}
        onChange={(e) => onRulesChannelChange(e.target.value)}
        hint="Where server rules are displayed"
      >
        <option value="">None</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            #{ch.name}
          </option>
        ))}
      </SelectField>

      <Button disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : "Save safety settings"}
      </Button>
    </div>
  );
}
