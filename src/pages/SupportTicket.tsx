import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket, TicketMessage } from "@/lib/support-types";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/Button";
import { TextArea, FormError } from "@/components/form";
import { Card } from "@/components/layout";

export function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isStaff, staffProfile } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: ticketRow }, { data: messageRows }] = await Promise.all([
      supabase.from("tickets").select("*").eq("id", id).single(),
      supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at"),
    ]);
    setTicket((ticketRow as Ticket | null) ?? null);
    setMessages((messageRows ?? []) as TicketMessage[]);
  }, [id]);

  useEffect(() => {
    load().finally(() => setReady(true));
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`ticket:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${id}`,
        },
        () => {
          load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  if (!ready) return <p className="text-muted">Loading…</p>;
  if (!ticket) {
    return (
      <div>
        <p className="text-muted">We couldn&apos;t find that request.</p>
        <Link to="/support" className="mt-4 inline-block font-medium text-foreground hover:underline">
          Back to support
        </Link>
      </div>
    );
  }

  const backHref = isStaff ? "/admin" : "/support";
  const canReply = ticket.status === "open" || isStaff;

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reply.trim()) return;
    setError("");
    setSending(true);

    const { error: insertError } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: user.id,
      body: reply.trim(),
      kind: isStaff ? "staff" : "user",
      author_name: isStaff
        ? [staffProfile?.display_name, staffProfile?.title].filter(Boolean).join(" · ") ||
          "Support"
        : null,
    });

    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setReply("");
    await load();
  };

  const setStatus = async (status: Ticket["status"]) => {
    if (!isStaff) return;
    await supabase.from("tickets").update({ status }).eq("id", ticket.id);
    await load();
  };

  return (
    <div>
      <Link to={backHref} className="text-sm text-muted hover:text-foreground">
        {isStaff ? "Inbox" : "Support"}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.65rem]">{ticket.subject}</h1>
      <p className="mt-1.5 text-sm text-muted">
        {isStaff && <span>{ticket.contact_email} · </span>}
        {ticket.status === "open" ? "Open" : "Closed"}
      </p>

      <ol className="mt-6 space-y-4 border-t border-black/8 pt-6 dark:border-white/10">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            viewerId={user?.id}
            viewerIsStaff={isStaff}
            visitorLabel={isStaff ? ticket.contact_email : "You"}
          />
        ))}
      </ol>

      {error && (
        <div className="mt-6">
          <FormError message={error} />
        </div>
      )}

      {canReply ? (
        <Card className="mt-6">
          <form onSubmit={sendReply} className="space-y-4">
            <TextArea
              label={isStaff ? "Reply" : "Add a message"}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              hint="Enter to send. Shift+Enter for a new line."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={sending || !reply.trim()}>
                {sending ? "Sending…" : "Send"}
              </Button>
              {isStaff && ticket.status === "open" && (
                <Button type="button" variant="secondary" onClick={() => setStatus("closed")}>
                  Close
                </Button>
              )}
              {isStaff && ticket.status === "closed" && (
                <Button type="button" variant="secondary" onClick={() => setStatus("open")}>
                  Reopen
                </Button>
              )}
            </div>
          </form>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-muted">
          This ticket is closed.{" "}
          <button
            type="button"
            className="font-medium text-foreground hover:underline"
            onClick={() => navigate("/support")}
          >
            Open a new request
          </button>
        </p>
      )}
    </div>
  );
}
