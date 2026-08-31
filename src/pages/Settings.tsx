import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Card } from "@/components/layout";
import { Button } from "@/components/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function SettingsPage() {
  const { user, signOut, isStaff } = useAuth();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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
      setResult(`Imported ${res.imported} books`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem(
      "shelfie-theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
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

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div>
      <PageHeader title="Settings" subtitle="Account, appearance, and data management" />

      <div className="space-y-4">
        <Card>
          <h2 className="text-sm font-semibold">Support</h2>
          <p className="mt-1 text-sm text-muted">
            Submit questions, report issues, or request features through the support portal.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/support")}>
              Contact support
            </Button>
            {isStaff && (
              <Button variant="secondary" onClick={() => navigate("/admin")}>
                Support inbox
              </Button>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted">{user?.email}</p>
          <p className="mt-2 text-sm text-muted">
            Library data is private to this account.
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted">Toggle between light and dark interface</p>
          <Button variant="secondary" className="mt-4" onClick={toggleDark}>
            {isDark ? "Switch to light mode" : "Switch to dark mode"}
          </Button>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Export data</h2>
          <p className="mt-1 text-sm text-muted">
            Download library and loan records as CSV
          </p>
          <Button variant="secondary" className="mt-4" onClick={handleExport}>
            Export CSV
          </Button>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Import data</h2>
          <p className="mt-1 text-sm text-muted">
            Import from Goodreads CSV or JSON format
          </p>
          <label className="mt-4 inline-block cursor-pointer">
            <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-surface px-4 py-2.5 text-[0.95rem] font-medium transition-colors hover:bg-black/[0.04] dark:border-white/10">
              {importing ? "Importing…" : "Choose file"}
            </span>
            <input
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={handleImport}
            />
          </label>
          {result && <p className="mt-3 text-sm text-muted">{result}</p>}
        </Card>
      </div>
    </div>
  );
}
