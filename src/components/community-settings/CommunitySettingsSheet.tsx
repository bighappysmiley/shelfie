import { CommunityModal } from "@/components/CommunityModal";
import type { SettingsTab } from "@/components/community-settings/types";

const TAB_LABELS: Record<SettingsTab, string> = {
  overview: "Overview",
  members: "Members",
  roles: "Roles",
  channels: "Channels",
  invites: "Invites",
  requests: "Join requests",
  safety: "Safety",
  moderation: "Moderation",
  danger: "Danger zone",
};

export function CommunitySettingsSheet({
  open,
  onClose,
  activeTab,
  tabs,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  activeTab: SettingsTab;
  tabs: SettingsTab[];
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <CommunityModal open={open} onClose={onClose} title="Server settings" tone="community">
      <ul className="divide-y divide-[var(--community-border)]">
        {tabs.map((tab) => (
          <li key={tab}>
            <button
              type="button"
              onClick={() => {
                onSelect(tab);
                onClose();
              }}
              className={`flex w-full items-center justify-between px-1 py-3.5 text-left text-[0.9375rem] ${
                tab === activeTab ? "font-semibold text-accent" : "text-foreground"
              }`}
            >
              {TAB_LABELS[tab]}
              {tab === activeTab && <span className="text-accent">●</span>}
            </button>
          </li>
        ))}
      </ul>
    </CommunityModal>
  );
}
