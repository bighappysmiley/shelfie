import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader, Group, GroupHeader } from "@/components/layout";
import { SupportChat } from "@/components/SupportChat";

export function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Live chat with the Shelfie team"
      />

      <SupportChat
        onTicketChange={(ticket) => {
          setActiveTicket(ticket);
          if (ticket) loadHistory();
        }}
      />

      {closedTickets.length > 0 && (
        <section className="mt-6">
          <GroupHeader>Past conversations</GroupHeader>
          <Group>
            {closedTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/support/${ticket.id}`}
                className={`flex min-h-[44px] items-center justify-between gap-3 px-4 py-3 hairline-b last:border-b-0 active:bg-fill-secondary ${
                  activeTicket?.id === ticket.id ? "bg-fill-secondary" : ""
                }`}
              >
                <span className="truncate text-[1.0625rem]">{ticket.subject}</span>
                <span className="shrink-0 text-[0.9375rem] text-muted">
                  Closed · {formatWhen(ticket.created_at)}
                </span>
              </Link>
            ))}
          </Group>
        </section>
      )}
    </div>
  );
}
