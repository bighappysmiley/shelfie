import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader } from "@/components/layout";

export function AdminPage() {
  const { isStaff, loading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    supabase
      .from("tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTickets((data ?? []) as Ticket[]);
        setReady(true);
      });
  }, [isStaff]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (!isStaff) return <Navigate to="/library" replace />;

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div>
      <PageHeader
        title="Inbox"
        subtitle={`${openCount} open · ${tickets.length} total`}
      />

      {ready && tickets.length === 0 ? (
        <p className="text-muted">No support requests yet.</p>
      ) : (
        <ul className="divide-y divide-black/8 rounded-xl border border-black/8 bg-surface dark:divide-white/10 dark:border-white/10">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to={`/support/${ticket.id}`}
                className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-4 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="truncate text-sm text-muted">{ticket.contact_email}</p>
                </div>
                <span
                  className={`shrink-0 text-sm ${
                    ticket.status === "open" ? "font-medium text-brand" : "text-muted"
                  }`}
                >
                  {ticket.status === "open" ? "Open" : "Closed"} · {formatWhen(ticket.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
