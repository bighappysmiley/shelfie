import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import type { Library, LibraryInvite } from "./library-types";
import { getActiveLibraryId, setActiveLibraryId } from "./library-storage";
import { captureInviteFromUrl, clearPendingInvite, getPendingInvite } from "./pending-invite";

type LibraryContextValue = {
  libraries: Library[];
  activeLibrary: Library | null;
  pendingInvites: LibraryInvite[];
  loading: boolean;
  setActiveLibrary: (id: string) => void;
  refreshLibraries: (opts?: { silent?: boolean }) => Promise<void>;
  createLibrary: (name: string) => Promise<Library>;
  renameLibrary: (id: string, name: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<string>;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function pickPreferredLibraryId(
  list: Library[],
  preferredLibraryId: string | null,
  stored: string | null,
): string | null {
  if (list.length === 0) return null;

  const fromApi =
    preferredLibraryId && list.some((l) => l.id === preferredLibraryId)
      ? preferredLibraryId
      : null;

  // Prefer libraries the user was invited into (member role) over personal defaults.
  const asMember = list.find((l) => l.role === "member");
  const notDefault = list.find((l) => l.name !== "My Library");
  const preferred =
    fromApi ??
    asMember?.id ??
    notDefault?.id ??
    list.find((l) => l.role === "owner")?.id ??
    list[0]?.id ??
    null;

  if (stored && list.some((l) => l.id === stored)) {
    const storedLib = list.find((l) => l.id === stored);
    // If stored points at a setup-loop "My Library" and a better option exists, switch.
    if (
      storedLib?.name === "My Library" &&
      preferred &&
      preferred !== stored &&
      list.some((l) => l.id === preferred && (l.name !== "My Library" || l.role === "member"))
    ) {
      return preferred;
    }
    return stored;
  }

  return preferred;
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LibraryInvite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => getActiveLibraryId());
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshLibraries = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) {
      setLibraries([]);
      setPendingInvites([]);
      setActiveId(null);
      setActiveLibraryId(null);
      setLoading(false);
      setHasLoaded(false);
      return;
    }

    const silent = opts?.silent ?? hasLoaded;
    if (!silent) setLoading(true);

    try {
      captureInviteFromUrl();

      const pendingInviteId = getPendingInvite();
      if (pendingInviteId) {
        try {
          const { libraryId } = await api.libraries.acceptInvite(pendingInviteId);
          clearPendingInvite();
          setActiveLibraryId(libraryId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          // Only drop the invite token when it's truly gone or not for this account.
          if (/not found|no longer pending|does not match|already/i.test(msg)) {
            clearPendingInvite();
          }
        }
      }

      const result = await api.libraries.list();
      const list = result.libraries;
      const preferredLibraryId = result.preferredLibraryId ?? null;
      const { invites } = await api.libraries.receivedInvites();
      setLibraries(list);
      setPendingInvites(invites);

      const stored = getActiveLibraryId();
      const nextId = pickPreferredLibraryId(list, preferredLibraryId, stored);

      setActiveId(nextId);
      setActiveLibraryId(nextId);
      setHasLoaded(true);
    } catch (err) {
      // Keep existing libraries on refresh failure so setup/home don't bounce.
      console.error("Failed to refresh libraries:", err);
      if (!hasLoaded) {
        setLibraries([]);
        setPendingInvites([]);
        setActiveId(null);
        setActiveLibraryId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [user, hasLoaded]);

  useEffect(() => {
    refreshLibraries({ silent: false });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reload when user changes

  const setActiveLibrary = useCallback((id: string) => {
    setActiveId(id);
    setActiveLibraryId(id);
  }, []);

  const createLibrary = useCallback(async (name: string) => {
    const library = await api.libraries.create(name);
    setLibraries((prev) => {
      if (prev.some((l) => l.id === library.id)) return prev;
      return [...prev, library];
    });
    setActiveLibrary(library.id);
    setHasLoaded(true);
    void refreshLibraries({ silent: true });
    return library;
  }, [refreshLibraries, setActiveLibrary]);

  const renameLibrary = useCallback(
    async (id: string, name: string) => {
      const updated = await api.libraries.rename(id, name);
      setLibraries((prev) =>
        prev.map((l) => (l.id === id ? { ...l, name: updated.name ?? name } : l)),
      );
      void refreshLibraries({ silent: true });
    },
    [refreshLibraries],
  );

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      const { libraryId } = await api.libraries.acceptInvite(inviteId);
      setActiveLibrary(libraryId);
      setActiveLibraryId(libraryId);
      if (getPendingInvite() === inviteId) clearPendingInvite();
      await refreshLibraries({ silent: true });
      return libraryId;
    },
    [refreshLibraries, setActiveLibrary],
  );

  const activeLibrary = useMemo(
    () => libraries.find((l) => l.id === activeId) ?? null,
    [libraries, activeId],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      libraries,
      activeLibrary,
      pendingInvites,
      loading,
      setActiveLibrary,
      refreshLibraries,
      createLibrary,
      renameLibrary,
      acceptInvite,
    }),
    [
      libraries,
      activeLibrary,
      pendingInvites,
      loading,
      setActiveLibrary,
      refreshLibraries,
      createLibrary,
      renameLibrary,
      acceptInvite,
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
