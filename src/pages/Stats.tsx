import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Card } from "@/components/layout";
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

  if (!stats) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      <PageHeader title="Reports" subtitle="Collection statistics and breakdowns" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Total books</p>
          <p className="mt-1 text-3xl font-semibold">{stats.totalBooks}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Collection value</p>
          <p className="mt-1 text-3xl font-semibold">${stats.totalValue}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Active loans</p>
          <p className="mt-1 text-3xl font-semibold">{stats.activeLoans}</p>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">By status</h2>
          <dl className="mt-4 space-y-2">
            {Object.entries(stats.byStatus).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-muted">
                  {k === "on_loan"
                    ? "On loan"
                    : STATUS_LABELS[k as keyof typeof STATUS_LABELS] ?? k}
                </dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">By format</h2>
          <dl className="mt-4 space-y-2">
            {Object.entries(stats.byFormat).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-muted capitalize">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">By location</h2>
          <dl className="mt-4 space-y-2">
            {Object.entries(stats.byLocation).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {stats.series.length > 0 && (
          <Card>
            <h2 className="font-semibold">Series</h2>
            <ul className="mt-4 space-y-3">
              {stats.series.map((s) => (
                <li key={s.name}>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted">
                    Volumes owned: {s.owned.join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
