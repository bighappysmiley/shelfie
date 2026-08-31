import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { FullPageLoading } from "@/components/LoadingTree";
import { Button } from "@/components/Button";
import { TextField, FormError } from "@/components/form";
import { Container, Group, GroupFooter } from "@/components/layout";
import { useLibrary } from "@/lib/library";
import { useAuth } from "@/lib/auth";
import { APP_TAGLINE } from "@/lib/brand";

/** Setup is complete when the account has a display name and at least one library. */
export function needsSetup(opts: {
  displayName?: string | null;
  libraryCount: number;
}): boolean {
  return !opts.displayName?.trim() || opts.libraryCount === 0;
}

export function SetupPage() {
  const navigate = useNavigate();
  const { user, userProfile, updateProfile } = useAuth();
  const { libraries, activeLibrary, loading, createLibrary, renameLibrary, pendingInvites } =
    useLibrary();
  const [yourName, setYourName] = useState("");
  const [libraryName, setLibraryName] = useState("My Library");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userProfile?.displayName) {
      setYourName(userProfile.displayName);
    }
  }, [userProfile?.displayName]);

  useEffect(() => {
    if (activeLibrary?.name) {
      setLibraryName(activeLibrary.name);
    }
  }, [activeLibrary?.name]);

  const setupNeeded = needsSetup({
    displayName: userProfile?.displayName,
    libraryCount: libraries.length,
  });

  if (!loading && user && !setupNeeded) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const name = yourName.trim();
    if (!name) {
      setError("Please enter your name so teammates can recognize you.");
      return;
    }

    setBusy(true);
    try {
      await updateProfile({ displayName: name });

      const libTrimmed = libraryName.trim() || "My Library";
      if (libraries.length === 0) {
        await createLibrary(libTrimmed);
      } else if (activeLibrary) {
        if (activeLibrary.name !== libTrimmed) {
          await renameLibrary(activeLibrary.id, libTrimmed);
        }
      } else {
        await createLibrary(libTrimmed);
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <FullPageLoading />;
  }

  return (
    <div className="min-h-dvh bg-background safe-top safe-bottom">
      <Container size="form">
        <div className="flex flex-col py-10 sm:py-16">
          <Link to="/" className="inline-block rounded-[var(--radius-control)] bg-logo-bg px-4 py-3">
            <Logo size="md" variant="brand" />
          </Link>

          <h1 className="mt-10 text-[2.125rem] font-bold tracking-tight">Welcome</h1>
          <p className="mt-2 max-w-sm text-[1.0625rem] leading-relaxed text-muted">
            {APP_TAGLINE}
          </p>

          {pendingInvites.length > 0 && (
            <p className="mt-4 text-[0.9375rem] text-muted">
              You have {pendingInvites.length} library invitation
              {pendingInvites.length === 1 ? "" : "s"} — accept them from the menu after setup.
            </p>
          )}

          <div className="mt-8">
            <Group>
              <form onSubmit={onSubmit}>
                <TextField
                  label="Your Name"
                  grouped
                  required
                  autoFocus
                  placeholder="e.g. Alex Morgan"
                  hint="Shown to teammates when you share a library"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                />
                <TextField
                  label="Library Name"
                  grouped
                  required
                  placeholder="e.g. Home Books, Office Shelf"
                  hint="You can rename this later or create more libraries in Settings"
                  value={libraryName}
                  onChange={(e) => setLibraryName(e.target.value)}
                />
                <div className="px-4 py-4">
                  {error && <FormError message={error} />}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? "Setting Up…" : "Continue"}
                  </Button>
                </div>
              </form>
            </Group>
            <GroupFooter>
              Your name helps library owners and members know who has access.
            </GroupFooter>
          </div>
        </div>
      </Container>
    </div>
  );
}
