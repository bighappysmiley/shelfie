import { CommunityModal } from "@/components/CommunityModal";
import type { SettingsNavGroup, SettingsTab } from "@/components/community-settings/types";
import { SETTINGS_TAB_LABELS } from "@/components/community-settings/types";

export function CommunitySettingsSheet({
  open,
  onClose,
  activeTab,
  groups,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  activeTab: SettingsTab;
  groups: SettingsNavGroup[];
  onSelect: (tab: SettingsTab) => void;
}) {
  return (
    <CommunityModal open={open} onClose={onClose} title="Server settings" tone="community">
      <div className="max-h-[70vh] overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="border-b border-[var(--community-border)] last:border-0">
            <p className="px-1 pt-3 pb-1 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
              {group.label}
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className={`flex w-full items-center justify-between px-1 py-3 text-left text-[0.9375rem] ${
                      item.id === activeTab ? "font-semibold text-accent" : "text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {SETTINGS_TAB_LABELS[item.id]}
                      {item.badge != null && item.badge > 0 && (
                        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[0.625rem] font-semibold text-accent">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {item.id === activeTab && <span className="text-accent">●</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </CommunityModal>
  );
}
