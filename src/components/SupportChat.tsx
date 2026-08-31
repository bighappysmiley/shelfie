import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Ticket, TicketMessage } from "@/lib/support-types";
import { ChatBubble } from "@/components/ChatBubble";
import { Button } from "@/components/Button";
import { FormError } from "@/components/form";

type SupportChatProps = {
  ticketId?: string;
  showHeader?: boolean;
  onTicketChange?: (ticket: Ticket | null) => void;
};

export function SupportChat({ ticketId, showHeader = true, onTicketChange }: SupportChatProps) {
  const { user, isStaff, staffProfile } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const loadTicket = useCallback(
    async (id: string) => {
      const [{ data: ticketRow }, { data: messageRows }] = await Promise.all([
        supabase.from("tickets").select("*").eq("id", id).single(),
        supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", id)
          .order("created_at"),
      ]);
      const next = (ticketRow as Ticket | null) ?? null;
      setTicket(next);
      setMessages((messageRows ?? []) as TicketMessage[]);
      onTicketChange?.(next);
      return next;
    },
    [onTicketChange],
  );

  const loadOpenTicket = useCallback(async () => {
    if (!user || ticketId) return null;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("owner_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      await loadTicket(data.id);
      return data as Ticket;
    }
    setTicket(null);
    setMessages([]);
    onTicketChange?.(null);
    return null;
  }, [user, ticketId, loadTicket, onTicketChange]);

  useEffect(() => {
    const init = async () => {
      if (ticketId) {
        await loadTicket(ticketId);
      } else {
        await loadOpenTicket();
      }
      setReady(true);
    };
    init();
  }, [ticketId, loadTicket, loadOpenTicket]);

  useEffect(() => {
    const id = ticket?.id ?? ticketId;
    if (!id) return;
    const channel = supabase
      .channel(`ticket-live:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${id}`,
        },
        () => {
          loadTicket(id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticket?.id, ticketId, loadTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ready]);

  const ensureTicket = async (firstMessage: string): Promise<Ticket | null> => {
    if (ticket) return ticket;
    if (!user?.email) return null;

    const { data: created, error: createError } = await supabase
      .from("tickets")
      .insert({
        owner_id: user.id,
        contact_email: user.email,
        subject: firstMessage.slice(0, 80) || "Live chat",
      })
      .select("*")
      .single();

    if (createError || !created) {
      setError(createError?.message ?? "Could not start conversation.");
      return null;
    }

    const next = created as Ticket;
    setTicket(next);
    onTicketChange?.(next);
    return next;
  };

  const send = async () => {
    const body = draft.trim();
    if (!user || !body || sending) return;
    setError("");
    setSending(true);

    const activeTicket = ticket ?? (await ensureTicket(body));
    if (!activeTicket) {
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase.from("ticket_messages").insert({
      ticket_id: activeTicket.id,
      author_id: user.id,
      body,
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

    setDraft("");
    await loadTicket(activeTicket.id);
    inputRef.current?.focus();
  };

  const setStatus = async (status: Ticket["status"]) => {
    if (!isStaff || !ticket) return;
    await supabase.from("tickets").update({ status }).eq("id", ticket.id);
    await loadTicket(ticket.id);
  };

  const canReply = !ticket || ticket.status === "open" || isStaff;
  const visitorLabel = isStaff && ticket ? ticket.contact_email : "You";

  return (
    <div className="flex min-h-[min(70dvh,640px)] flex-col overflow-hidden rounded-[var(--radius-group)] bg-surface shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      {showHeader && (
        <div className="hairline-b px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[1.0625rem] font-semibold">Live chat</p>
              <p className="text-[0.8125rem] text-muted">
                {ticket
                  ? ticket.status === "open"
                    ? "Connected · replies appear in real time"
                    : "This conversation is closed"
                  : "Send a message to start chatting with support"}
              </p>
            </div>
            {ticket && (
              <span
                className={`shrink-0 rounded-[var(--radius-pill)] px-2 py-0.5 text-[0.75rem] font-medium ${
                  ticket.status === "open" ? "bg-success-bg text-success" : "bg-fill text-muted"
                }`}
              >
                {ticket.status === "open" ? "Open" : "Closed"}
              </span>
            )}
          </div>
          {isStaff && ticket && (
            <div className="mt-2 flex flex-wrap gap-2">
              {ticket.status === "open" ? (
                <Button type="button" variant="tinted" size="sm" onClick={() => setStatus("closed")}>
                  Close conversation
                </Button>
              ) : (
                <Button type="button" variant="tinted" size="sm" onClick={() => setStatus("open")}>
                  Reopen
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!ready ? (
          <p className="text-center text-[0.9375rem] text-muted">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-[1.0625rem] font-medium">How can we help?</p>
            <p className="mt-2 max-w-xs text-[0.9375rem] text-muted">
              Ask a question, report a bug, or request a feature. We reply here in live chat.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                viewerId={user?.id}
                viewerIsStaff={isStaff}
                visitorLabel={visitorLabel}
              />
            ))}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 pb-2">
          <FormError message={error} />
        </div>
      )}

      {canReply ? (
        <div className="hairline-t bg-surface px-3 py-3 safe-bottom">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message support…"
              rows={1}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-[1.25rem] bg-fill px-4 py-2.5 text-[1.0625rem] leading-snug placeholder:text-muted/80 focus:outline-none focus:ring-2 focus:ring-accent/30"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-full px-4"
              disabled={sending || !draft.trim()}
              onClick={send}
            >
              Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="hairline-t px-4 py-3 text-center text-[0.9375rem] text-muted">
          This conversation is closed.
        </div>
      )}
    </div>
  );
}
