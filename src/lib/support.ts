import { supabase } from "./supabase";

const CLOSED_TICKET_TTL_MS = 24 * 60 * 60 * 1000;

/** Remove closed support tickets older than 24 hours (DB RPC). */
export async function purgeExpiredClosedTickets(): Promise<number> {
  const { data, error } = await supabase.rpc("purge_expired_closed_tickets");
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01") {
      return 0;
    }
    throw error;
  }
  return typeof data === "number" ? data : Number(data) || 0;
}

export function isClosedTicketExpired(ticket: {
  status: string;
  closed_at?: string | null;
  created_at: string;
}): boolean {
  if (ticket.status !== "closed") return false;
  const closedAt = ticket.closed_at || ticket.created_at;
  return Date.now() - new Date(closedAt).getTime() >= CLOSED_TICKET_TTL_MS;
}
