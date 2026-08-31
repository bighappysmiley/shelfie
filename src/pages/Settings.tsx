import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader,
  Group,
  GroupHeader,
  GroupFooter,
  ListRow,
  ToggleRow,
  PlainButton,
} from "@/components/layout";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function SettingsPage() {
  const { user, signOut, isStaff } = useAuth();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const handleExport = async () => {
    const csv = await api.data.export();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shelfie-export-${new Date().toISOString().slice(0, 10)}.csv`;
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

  const toggleDark = (on: boolean) => {
    document.documentElement.classList.toggle("dark", on);
    localStorage.setItem("shelfie-theme", on ? "dark" : "light");
    setIsDark(on);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="space-y-6">
        <section>
          <GroupHeader>Support</GroupHeader>
          <Group>
            <ListRow title="Live Chat" to="/support" chevron />
            {isStaff && <ListRow title="Support Inbox" to="/admin" chevron />}
          </Group>
        </section>

        <section>
          <GroupHeader>Account</GroupHeader>
          <Group>
            <ListRow title="Email" trailing={user?.email} />
          </Group>
          <GroupFooter>Your library data is private to this account.</GroupFooter>
        </section>

        <section>
          <GroupHeader>Appearance</GroupHeader>
          <Group>
            <ToggleRow label="Dark Mode" checked={isDark} onChange={toggleDark} />
          </Group>
        </section>

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

        <Group>
          <PlainButton onClick={handleSignOut} disabled={signingOut} destructive>
            {signingOut ? "Signing Out…" : "Sign Out"}
          </PlainButton>
        </Group>
      </div>
    </div>
  );
}
