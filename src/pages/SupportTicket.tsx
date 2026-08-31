import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SupportChat } from "@/components/SupportChat";

export function SupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff } = useAuth();

  if (!id) {
    return (
      <div>
        <p className="text-[0.9375rem] text-muted">Conversation not found.</p>
        <Link to="/support" className="mt-4 inline-block text-link">
          Back to live chat
        </Link>
      </div>
    );
  }

  const backHref = isStaff ? "/admin" : "/support";

  return (
    <div>
      <Link to={backHref} className="text-[0.9375rem] text-link">
        {isStaff ? "Support Inbox" : "Live chat"}
      </Link>
      <div className="mt-4">
        <SupportChat ticketId={id} />
      </div>
    </div>
  );
}
