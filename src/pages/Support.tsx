import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket } from "@/lib/support-types";
import { formatWhen } from "@/lib/support-types";
import { PageHeader, Card } from "@/components/layout";
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
      setError(ticketError?.message ?? "Couldn't send that.");
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
      <PageHeader
        title="Support"
        subtitle="Send a message and we'll reply here on this page."
      />

      {sent && (
        <Card className="mb-4 border-success/20 bg-success-bg">
          <p className="text-sm text-success">Submitted. We'll reply in your ticket list below.</p>
        </Card>
      )}
      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <TextField
            label="Subject"
            required
            maxLength={120}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <TextArea
            label="Message"
            required
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Submit"}
          </Button>
        </form>
      </Card>

      <div className="mt-8">
        <h2 className="text-base font-semibold">Your tickets</h2>
        {tickets.length === 0 ? (
          <p className="mt-2 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 border border-black/10 bg-surface dark:divide-white/10 dark:border-white/10">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/support/${ticket.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-3 text-sm transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <span className="font-medium">{ticket.subject}</span>
                  <span className="text-muted">
                    {ticket.status === "open" ? "Open" : "Closed"} · {formatWhen(ticket.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
