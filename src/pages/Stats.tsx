import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Group, GroupHeader, ListRow } from "@/components/layout";
import { STATUS_LABELS } from "@/lib/types";

interface Stats {
  totalBooks: number;
  byStatus: Record<string, number>;
  byLocation: Record<string, number>;
  byFormat: Record<string, number>;
  totalValue: number;
  activeLoans: number;
  overdueCount: number;
  series: { name: string; owned: string[] }[];
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.data.stats().then((s) => setStats(s as unknown as Stats));
  }, []);

  if (!stats) return <p className="px-1 text-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Collection statistics" />

      <Group className="mb-6">
        <ListRow title="Total volumes" trailing={stats.totalBooks} />
        <ListRow title="Collection value" trailing={`$${stats.totalValue}`} />
        <ListRow title="Active loans" trailing={stats.activeLoans} />
        <ListRow
          title="Overdue"
          trailing={<span className="text-warning">{stats.overdueCount}</span>}
        />
      </Group>

      <GroupHeader>By status</GroupHeader>
      <Group className="mb-6">
        {Object.entries(stats.byStatus).map(([k, v]) => (
          <ListRow
            key={k}
            title={
              k === "on_loan"
                ? "On loan"
                : STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k
            }
            trailing={v}
          />
        ))}
      </Group>

      <GroupHeader>By format</GroupHeader>
      <Group className="mb-6">
        {Object.entries(stats.byFormat).map(([k, v]) => (
          <ListRow key={k} title={k.charAt(0).toUpperCase() + k.slice(1)} trailing={v} />
        ))}
      </Group>

      <GroupHeader>By location</GroupHeader>
      <Group className="mb-6">
        {Object.entries(stats.byLocation).map(([k, v]) => (
          <ListRow key={k} title={k} trailing={v} />
        ))}
      </Group>

      {stats.series.length > 0 && (
        <>
          <GroupHeader>Series</GroupHeader>
          <Group>
            {stats.series.map((s) => (
              <ListRow
                key={s.name}
                title={s.name}
                subtitle={`Volumes: ${s.owned.join(", ") || "—"}`}
              />
            ))}
          </Group>
        </>
      )}
    </div>
  );
}
