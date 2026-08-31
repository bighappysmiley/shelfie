import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Container, Group, GroupFooter } from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { useAuth } from "@/lib/auth";
import { APP_TAGLINE } from "@/lib/brand";

const SETUP_KEY_PREFIX = "pine-bookkeeping-setup-complete";

export function isSetupComplete(userId?: string | null): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(`${SETUP_KEY_PREFIX}:${userId}`) === "true";
  } catch {
    return false;
  }
}

export function markSetupComplete(userId: string) {
  try {
    localStorage.setItem(`${SETUP_KEY_PREFIX}:${userId}`, "true");
  } catch {
    /* ignore */
  }
}

export function SetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { libraries, activeLibrary, loading, createLibrary, renameLibrary, pendingInvites } =
    useLibrary();
  const [name, setName] = useState("My Library");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeLibrary?.name && activeLibrary.name !== "My Library") {
      setName(activeLibrary.name);
    }
  }, [activeLibrary?.name]);

  if (!loading && user && libraries.length > 0 && isSetupComplete(user.id)) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const trimmed = name.trim() || "My Library";

      if (libraries.length === 0) {
        await createLibrary(trimmed);
      } else if (activeLibrary) {
        await renameLibrary(activeLibrary.id, trimmed);
      } else {
        await createLibrary(trimmed);
      }

      markSetupComplete(user!.id);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create library. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const skipDefault = async () => {
    setError("");
    setBusy(true);
    try {
      if (libraries.length === 0) {
        await createLibrary("My Library");
      }
      markSetupComplete(user!.id);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create library. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-fill border-t-accent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background safe-top safe-bottom">
      <Container size="form">
        <div className="flex flex-col py-10 sm:py-16">
          <Link to="/" className="inline-block rounded-[var(--radius-control)] bg-logo-bg px-4 py-3">
            <Logo size="md" variant="brand" />
          </Link>

          <h1 className="mt-10 text-[2.125rem] font-bold tracking-tight">Set up your library</h1>
          <p className="mt-2 max-w-sm text-[1.0625rem] leading-relaxed text-muted">
            {APP_TAGLINE}
          </p>

          {pendingInvites.length > 0 && (
            <p className="mt-4 text-[0.9375rem] text-muted">
              You have {pendingInvites.length} library invitation
              {pendingInvites.length === 1 ? "" : "s"} — you can accept them from the menu after
              setup.
            </p>
          )}

          <div className="mt-8">
            <Group>
              <form onSubmit={onSubmit}>
                <TextField
                  label="Library Name"
                  grouped
                  required
                  autoFocus
                  placeholder="e.g. Home Books, Office Shelf"
                  hint="You can rename this later or create more libraries in Settings"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <div className="px-4 py-4">
                  {error && <FormError message={error} />}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Creating…" : "Continue"}
                  </Button>
                </div>
              </form>
            </Group>
            <GroupFooter>
              <button
                type="button"
                onClick={skipDefault}
                disabled={busy}
                className="text-link disabled:opacity-50"
              >
                Skip for now
              </button>
            </GroupFooter>
          </div>
        </div>
      </Container>
    </div>
  );
}
