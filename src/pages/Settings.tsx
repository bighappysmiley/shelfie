import { useEffect, useState, type FormEvent } from "react";
import {
  PageHeader,
  Group,
  GroupHeader,
  GroupFooter,
  ListRow,
  SegmentedControl,
} from "@/components/layout";
import { Button } from "@/components/Button";
import { TextField } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import type { LibraryInvite, LibraryMember } from "@/lib/library-types";

export function SettingsPage() {
  const { user } = useAuth();
  const {
    activeLibrary,
    libraries,
    createLibrary,
    renameLibrary,
  } = useLibrary();

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState("");

  const [libraryName, setLibraryName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [creatingLibrary, setCreatingLibrary] = useState(false);

  const [inviteMode, setInviteMode] = useState<"email" | "phone">("email");
  const [inviteContact, setInviteContact] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");

  const [members, setMembers] = useState<LibraryMember[]>([]);
  const [sentInvites, setSentInvites] = useState<LibraryInvite[]>([]);

  useEffect(() => {
    if (activeLibrary) setLibraryName(activeLibrary.name);
  }, [activeLibrary]);

  useEffect(() => {
    if (!activeLibrary) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ members: m }, { invites }] = await Promise.all([
          api.libraries.members(activeLibrary.id),
          activeLibrary.role === "owner"
            ? api.libraries.sentInvites(activeLibrary.id)
            : Promise.resolve({ invites: [] as LibraryInvite[] }),
        ]);
        if (!cancelled) {
          setMembers(m);
          setSentInvites(invites);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLibrary]);

  const handleExport = async () => {
    const csv = await api.data.export();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pine-bookkeeping-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.match(/("([^"]|"")*"|[^,]*)/g) ?? [];
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
      });
      return row;
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let books: Record<string, string>[];

      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text);
        books = Array.isArray(data) ? data : data.books ?? [];
      } else {
        books = parseCsv(text);
      }

      const res = await api.data.import(books);
      setResult(`Imported ${res.imported} volumes`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const saveLibraryName = async () => {
    if (!activeLibrary || activeLibrary.role !== "owner") return;
    setSavingName(true);
    try {
      await renameLibrary(activeLibrary.id, libraryName.trim() || "My Library");
      setResult("Library renamed");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Rename failed");
    } finally {
      setSavingName(false);
    }
  };

  const handleCreateLibrary = async () => {
    setCreatingLibrary(true);
    try {
      await createLibrary(newLibraryName.trim() || "New Library");
      setNewLibraryName("");
      setResult("Library created");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreatingLibrary(false);
    }
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeLibrary) return;
    setInviting(true);
    setInviteMsg("");
    try {
      const contact =
        inviteMode === "email"
          ? { email: inviteContact.trim() }
          : { phone: inviteContact.trim() };
      await api.libraries.invite(activeLibrary.id, contact);
      setInviteContact("");
      setInviteMsg("Invitation sent");
      const { invites } = await api.libraries.sentInvites(activeLibrary.id);
      setSentInvites(invites);
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!activeLibrary) return;
    try {
      await api.libraries.revokeInvite(inviteId);
      const { invites } = await api.libraries.sentInvites(activeLibrary.id);
      setSentInvites(invites);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Revoke failed");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeLibrary) return;
    try {
      await api.libraries.removeMember(activeLibrary.id, userId);
      const { members: m } = await api.libraries.members(activeLibrary.id);
      setMembers(m);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Remove failed");
    }
  };

  const memberLabel = (m: LibraryMember) => {
    if (m.userId === user?.id) return "You";
    return `${m.userId.slice(0, 8)}…`;
  };

  return (
    <div>
      <PageHeader title="Library Settings" subtitle={activeLibrary?.name} />

      <div className="space-y-6">
        <section>
          <GroupHeader>Library</GroupHeader>
          <Group>
            {activeLibrary?.role === "owner" ? (
              <label className="block px-4 py-3 hairline-b">
                <span className="block text-[0.8125rem] text-muted">Library Name</span>
                <div className="mt-1 flex gap-2">
                  <input
                    className="min-w-0 flex-1 bg-transparent text-[1.0625rem] focus:outline-none"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="tinted"
                    onClick={saveLibraryName}
                    disabled={savingName}
                  >
                    {savingName ? "Saving…" : "Save"}
                  </Button>
                </div>
              </label>
            ) : (
              <ListRow title="Library" trailing={activeLibrary?.name} />
            )}
            <ListRow
              title="Your Libraries"
              trailing={`${libraries.length} ${libraries.length === 1 ? "library" : "libraries"}`}
            />
          </Group>
          <GroupFooter>
            Team members share full access to catalog, loans, and borrowers in this library.
          </GroupFooter>

          <div className="mt-3">
            <Group>
              <label className="block px-4 py-3">
                <span className="block text-[0.8125rem] text-muted">Create Another Library</span>
                <div className="mt-1 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-[var(--radius-control)] bg-fill px-3 py-2 text-[1.0625rem] focus:outline-none"
                    placeholder="e.g. Office Books"
                    value={newLibraryName}
                    onChange={(e) => setNewLibraryName(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateLibrary}
                    disabled={creatingLibrary}
                  >
                    {creatingLibrary ? "Creating…" : "Create"}
                  </Button>
                </div>
              </label>
            </Group>
          </div>
        </section>

        {activeLibrary?.role === "owner" && (
          <section>
            <GroupHeader>Team Members</GroupHeader>
            <Group>
              {members.map((m) => (
                <ListRow
                  key={m.userId}
                  title={memberLabel(m)}
                  subtitle={m.role === "owner" ? "Owner" : "Member"}
                  trailing={
                    m.role !== "owner" && m.userId !== user?.id ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.userId)}
                        className="text-destructive text-[0.9375rem]"
                      >
                        Remove
                      </button>
                    ) : undefined
                  }
                />
              ))}
            </Group>

            <div className="mt-3">
              <GroupHeader>Invite Member</GroupHeader>
              <Group>
                <div className="px-4 py-3 hairline-b">
                  <SegmentedControl
                    value={inviteMode}
                    onChange={setInviteMode}
                    options={[
                      { value: "email", label: "Email" },
                      { value: "phone", label: "Phone" },
                    ]}
                  />
                </div>
                <form onSubmit={handleInvite}>
                  <TextField
                    label={inviteMode === "email" ? "Email Address" : "Phone Number"}
                    type={inviteMode === "email" ? "email" : "tel"}
                    grouped
                    required
                    placeholder={inviteMode === "email" ? "friend@example.com" : "+1 555 0100"}
                    value={inviteContact}
                    onChange={(e) => setInviteContact(e.target.value)}
                  />
                  <div className="px-4 py-3">
                    {inviteMsg && (
                      <p
                        className={`mb-2 text-[0.9375rem] ${
                          inviteMsg.includes("sent") ? "text-success" : "text-destructive"
                        }`}
                      >
                        {inviteMsg}
                      </p>
                    )}
                    <Button type="submit" className="w-full" disabled={inviting}>
                      {inviting ? "Sending…" : "Send Invitation"}
                    </Button>
                  </div>
                </form>
              </Group>
              {sentInvites.length > 0 && (
                <>
                  <GroupHeader className="mt-3">Pending Invitations</GroupHeader>
                  <Group>
                    {sentInvites.map((inv) => (
                      <ListRow
                        key={inv.id}
                        title={inv.email ?? inv.phone ?? "Invite"}
                        trailing={
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-muted text-[0.9375rem]"
                          >
                            Revoke
                          </button>
                        }
                      />
                    ))}
                  </Group>
                </>
              )}
              <GroupFooter>
                Invited people can join once they sign in with the matching email or phone number.
              </GroupFooter>
            </div>
          </section>
        )}

        <section>
          <GroupHeader>Data</GroupHeader>
          <Group>
            <ListRow title="Export CSV" onClick={handleExport} chevron />
            <label className="block cursor-pointer">
              <ListRow
                title="Import File"
                trailing={importing ? "Importing…" : "CSV or JSON"}
                chevron
              />
              <input
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </Group>
          {result && <GroupFooter>{result}</GroupFooter>}
        </section>
      </div>
    </div>
  );
}
