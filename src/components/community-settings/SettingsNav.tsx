import type { SettingsNavGroup, SettingsTab } from "./types";

export function SettingsNav({
  groups,
  tab,
  onChange,
}: {
  groups: SettingsNavGroup[];
  tab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}) {
  return (
    <nav className="flex shrink-0 flex-col gap-4 lg:w-52">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-1 px-2 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[0.875rem] transition ${
                  tab === item.id
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-muted hover:bg-fill hover:text-foreground"
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="ml-auto rounded-full bg-accent/20 px-1.5 py-0.5 text-[0.625rem] font-semibold text-accent">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
