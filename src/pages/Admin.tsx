import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader, Group } from "@/components/layout";

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

  if (loading) return <p className="px-1 text-muted">Loading…</p>;
  if (!isStaff) return <Navigate to="/library" replace />;

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div>
      <PageHeader
        title="Support Inbox"
        subtitle={`${openCount} open · ${tickets.length} total`}
      />

      {ready && tickets.length === 0 ? (
        <p className="px-1 text-[0.9375rem] text-muted">No support requests received.</p>
      ) : (
        <Group>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 px-4 py-3 hairline-b last:border-b-0 active:bg-fill-secondary"
            >
              <div className="min-w-0">
                <p className="truncate text-[1.0625rem]">{ticket.subject}</p>
                <p className="truncate text-[0.9375rem] text-muted">{ticket.contact_email}</p>
              </div>
              <span
                className={`shrink-0 text-[0.9375rem] ${
                  ticket.status === "open" ? "font-medium text-accent" : "text-muted"
                }`}
              >
                {ticket.status === "open" ? "Open" : "Closed"} · {formatWhen(ticket.created_at)}
              </span>
            </Link>
          ))}
        </Group>
      )}
    </div>
  );
}
