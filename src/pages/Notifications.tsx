import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PageHeader,
  Group,
  GroupHeader,
  GroupFooter,
  EmptyState,
  Badge,
} from "@/components/layout";
import { Button } from "@/components/Button";
import { PageLoading } from "@/components/LoadingTree";
import { api } from "@/lib/api";
import { useLibrary } from "@/lib/library";
import type { LoanWithDetails } from "@/lib/types";
import {
  listMyNotifications,
  markNotificationRead,
  type AppNotification,
} from "@/lib/admin";

export function NotificationsPage() {
  const { pendingInvites, refreshLibraries } = useLibrary();
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [appNotes, setAppNotes] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.loans.list(true).catch(() => [] as LoanWithDetails[]),
      listMyNotifications().catch(() => [] as AppNotification[]),
    ])
      .then(([loanList, notes]) => {
        setLoans(loanList);
        setAppNotes(notes);
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);
  const soonStr = soon.toISOString().slice(0, 10);

  const overdue = loans.filter((l) => l.loan.dueDate && l.loan.dueDate < today);
  const dueSoon = loans.filter(
    (l) =>
      l.loan.dueDate &&
      l.loan.dueDate >= today &&
      l.loan.dueDate <= soonStr,
  );

  const acceptInvite = async (inviteId: string) => {
    await api.libraries.acceptInvite(inviteId);
    await refreshLibraries();
  };

  const hasAny =
    pendingInvites.length > 0 ||
    overdue.length > 0 ||
    dueSoon.length > 0 ||
    appNotes.length > 0;

  if (loading) {
    return <PageLoading />;
  }

  if (!hasAny) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <EmptyState
          title="All caught up"
          description="Library invitations, support messages, and loan reminders will appear here."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" />

      <div className="space-y-6">
        {appNotes.length > 0 && (
          <section>
            <GroupHeader>Messages</GroupHeader>
            <Group>
              {appNotes.map((note) => (
                <div
                  key={note.id}
                  className={`px-4 py-3 hairline-b last:border-b-0 ${
                    note.readAt ? "" : "bg-fill/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{note.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] text-muted">
                        {note.body}
                      </p>
                      {note.kind === "library_access_code" && note.payload?.code ? (
                        <p className="mt-2 font-mono text-[1.0625rem] font-semibold tracking-wide">
                          {String(note.payload.code)}
                        </p>
                      ) : null}
                    </div>
                    {!note.readAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await markNotificationRead(note.id);
                          setAppNotes((prev) =>
                            prev.map((n) =>
                              n.id === note.id
                                ? { ...n, readAt: new Date().toISOString() }
                                : n,
                            ),
                          );
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </Group>
          </section>
        )}

        {pendingInvites.length > 0 && (
          <section>
            <GroupHeader>Library Invitations</GroupHeader>
            <Group>
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-start justify-between gap-3 px-4 py-3 hairline-b last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-[1.0625rem] font-medium">
                      {inv.libraryName ?? "Library"}
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] text-muted">
                      {inv.email ?? inv.phone ?? "Team invitation"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => void acceptInvite(inv.id)}>
                    Accept
                  </Button>
                </div>
              ))}
            </Group>
            <GroupFooter>Accept to get shared access to a library catalog.</GroupFooter>
          </section>
        )}

        {overdue.length > 0 && (
          <section>
            <GroupHeader>Overdue Loans</GroupHeader>
            <Group>
              {overdue.map(({ loan, book, borrower }) => (
                <Link
                  key={loan.id}
                  to={`/book/${book.id}`}
                  className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0 transition-colors hover:bg-fill-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.0625rem]">{book.title}</p>
                    <p className="truncate text-[0.9375rem] text-muted">
                      {borrower.name} · due {loan.dueDate}
                    </p>
                  </div>
                  <Badge variant="warning">Overdue</Badge>
                </Link>
              ))}
            </Group>
          </section>
        )}

        {dueSoon.length > 0 && (
          <section>
            <GroupHeader>Due Soon</GroupHeader>
            <Group>
              {dueSoon.map(({ loan, book, borrower }) => (
                <Link
                  key={loan.id}
                  to={`/book/${book.id}`}
                  className="flex items-center gap-3 px-4 py-3 hairline-b last:border-b-0 transition-colors hover:bg-fill-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.0625rem]">{book.title}</p>
                    <p className="truncate text-[0.9375rem] text-muted">
                      {borrower.name} · due {loan.dueDate}
                    </p>
                  </div>
                  <Badge variant="default">Due soon</Badge>
                </Link>
              ))}
            </Group>
          </section>
        )}
      </div>
    </div>
  );
}
