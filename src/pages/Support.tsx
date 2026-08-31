import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader, Group, GroupHeader, Banner } from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField, TextArea, FormError } from "@/components/form";

export function SupportPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setError("");
    setSending(true);

    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({
        owner_id: user.id,
        contact_email: user.email,
        subject: subject.trim(),
      })
      .select("id")
      .single();

    if (ticketError || !ticket) {
      setSending(false);
      setError(ticketError?.message ?? "Unable to submit request.");
      return;
    }

    const { error: messageError } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: user.id,
      body: body.trim(),
      kind: "user",
    });

    setSending(false);
    if (messageError) {
      setError(messageError.message);
      return;
    }

    setSubject("");
    setBody("");
    setSent(true);
    await load();
  };

  return (
    <div>
      <PageHeader title="Support" subtitle="Submit and track support requests" />

      {sent && (
        <Banner variant="success" className="mb-4">
          Request submitted. Check your ticket history for updates.
        </Banner>
      )}
      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      <Group className="mb-6">
        <form onSubmit={submit}>
          <TextField
            label="Subject"
            required
            grouped
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextArea
            label="Description"
            required
            grouped
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="px-4 py-4">
            <Button type="submit" className="w-full" disabled={sending}>
              {sending ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        </form>
      </Group>

      <GroupHeader>Ticket history</GroupHeader>
      {tickets.length === 0 ? (
        <p className="px-1 text-[0.9375rem] text-muted">No support requests on file.</p>
      ) : (
        <Group>
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/support/${ticket.id}`}
              className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3 hairline-b last:border-b-0 active:bg-fill-secondary"
            >
              <span className="truncate text-[1.0625rem]">{ticket.subject}</span>
              <span className="shrink-0 text-[0.9375rem] text-muted">
                {ticket.status === "open" ? "Open" : "Closed"} · {formatWhen(ticket.created_at)}
              </span>
            </Link>
          ))}
        </Group>
      )}
    </div>
  );
}
