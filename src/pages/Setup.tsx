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
import { getPendingInvite } from "@/lib/pending-invite";
import { pickSynkDisplayName } from "@/lib/synk-name";

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
  const {
    libraries,
    activeLibrary,
    loading,
    createLibrary,
    renameLibrary,
    pendingInvites,
    acceptInvite,
    refreshLibraries,
  } = useLibrary();
  const metaName = pickSynkDisplayName(
    typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null,
    typeof user?.user_metadata?.name === "string" ? user.user_metadata.name : null,
  );
  const [yourName, setYourName] = useState("");
  const [libraryName, setLibraryName] = useState("My Library");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nameReady, setNameReady] = useState(false);

  const sessionInviteId = getPendingInvite();
  const joiningTeam = pendingInvites.length > 0 || Boolean(sessionInviteId);
  const mustCreateLibrary = libraries.length === 0 && !joiningTeam;
  const canRenameOwned =
    !joiningTeam && libraries.length > 0 && activeLibrary?.role === "owner";

  useEffect(() => {
    const seed = pickSynkDisplayName(userProfile?.displayName, metaName);
    if (seed) setYourName(seed);
  }, [userProfile?.displayName, metaName]);

  // Persist Synk metadata into user_profiles so setup doesn't keep asking for a name.
  useEffect(() => {
    if (!user || loading) return;
    if (userProfile?.displayName?.trim()) {
      setNameReady(true);
      return;
    }
    if (!metaName) {
      setNameReady(true);
      return;
    }
    let cancelled = false;
    void updateProfile({ displayName: metaName })
      .catch((err) => console.warn("Could not apply Synk name during setup:", err))
      .finally(() => {
        if (!cancelled) setNameReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, userProfile?.displayName, metaName, updateProfile]);

  useEffect(() => {
    if (activeLibrary?.name && !joiningTeam) {
      setLibraryName(activeLibrary.name);
    }
  }, [activeLibrary?.name, joiningTeam]);

  const resolvedDisplayName = pickSynkDisplayName(userProfile?.displayName, yourName, metaName);
  const nameFromSynk = Boolean(resolvedDisplayName);
  const setupNeeded = needsSetup({
    displayName: resolvedDisplayName,
    libraryCount: libraries.length,
  });

  if (!loading && nameReady && user && !setupNeeded) {
    return <Navigate to="/home" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const name = (yourName.trim() || resolvedDisplayName || "").trim();
    if (!name) {
      setError("Please enter your name so teammates can recognize you.");
      return;
    }

    setBusy(true);
    try {
      if (userProfile?.displayName?.trim() !== name) {
        await updateProfile({ displayName: name });
      }

      if (joiningTeam) {
        const inviteIds = [
          ...pendingInvites.map((inv) => inv.id),
          ...(sessionInviteId && !pendingInvites.some((i) => i.id === sessionInviteId)
            ? [sessionInviteId]
            : []),
        ];

        let joinedId: string | null = null;
        let lastErr: Error | null = null;
        for (const inviteId of inviteIds) {
          try {
            joinedId = await acceptInvite(inviteId);
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error("Could not accept invite");
          }
        }

        await refreshLibraries({ silent: true });

        if (!joinedId) {
          throw (
            lastErr ??
            new Error("Could not join the shared library. Check the invite and try again.")
          );
        }

        navigate("/home", { replace: true });
        return;
      }

      const libTrimmed = libraryName.trim() || "My Library";
      if (mustCreateLibrary || libraries.length === 0) {
        await createLibrary(libTrimmed);
      } else if (canRenameOwned && activeLibrary) {
        if (activeLibrary.name !== libTrimmed) {
          await renameLibrary(activeLibrary.id, libTrimmed);
        }
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !nameReady) {
    return <FullPageLoading />;
  }

  const inviteLabel =
    pendingInvites.length === 1
      ? pendingInvites[0].libraryName ?? "a shared library"
      : pendingInvites.length > 1
        ? `${pendingInvites.length} shared libraries`
        : "a shared library";

  return (
    <div className="min-h-dvh bg-background safe-top safe-bottom">
      <Container size="form">
        <div className="flex flex-col py-10 sm:py-16">
          <Link to="/" className="inline-block rounded-[var(--radius-control)] bg-logo-bg px-4 py-3">
            <Logo size="md" variant="brand" />
          </Link>

          <h1 className="mt-10 text-[2.125rem] font-bold tracking-tight">Welcome</h1>
          <p className="mt-2 max-w-sm text-[1.0625rem] leading-relaxed text-muted">
            {joiningTeam
              ? nameFromSynk
                ? `You've been invited to ${inviteLabel}. Confirm below to join.`
                : `You've been invited to ${inviteLabel}. Add your name to join — no personal library required.`
              : nameFromSynk
                ? "Your Synk name is ready. Name your library to finish setup."
                : APP_TAGLINE}
          </p>

          <div className="mt-8">
            <Group>
              <form onSubmit={onSubmit}>
                {nameFromSynk ? (
                  <div className="border-b border-black/[0.06] px-4 py-3 dark:border-white/[0.08]">
                    <p className="text-[0.75rem] font-medium text-muted">Your name</p>
                    <p className="mt-0.5 text-[1.0625rem] font-medium">{resolvedDisplayName}</p>
                    <p className="mt-1 text-[0.8125rem] text-muted">From your Synk ID</p>
                  </div>
                ) : (
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
                )}
                {(mustCreateLibrary || canRenameOwned) && (
                  <TextField
                    label="Library Name"
                    grouped
                    required
                    autoFocus={nameFromSynk}
                    placeholder="e.g. Home Books, Office Shelf"
                    hint="You can rename this later or create more libraries in Settings"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                  />
                )}
                <div className="px-4 py-4">
                  {error && <FormError message={error} />}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy
                      ? joiningTeam
                        ? "Joining…"
                        : "Setting Up…"
                      : joiningTeam
                        ? "Join Library"
                        : "Continue"}
                  </Button>
                </div>
              </form>
            </Group>
            <GroupFooter>
              {joiningTeam
                ? "You can create your own library later from Settings if you want one."
                : nameFromSynk
                  ? "You can change your display name later in Account settings."
                  : "Your name helps library owners and members know who has access."}
            </GroupFooter>
          </div>
        </div>
      </Container>
    </div>
  );
}
