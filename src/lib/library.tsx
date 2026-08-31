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
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

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
        } catch {
          clearPendingInvite();
        }
      }

      const [{ libraries: list }, { invites }] = await Promise.all([
        api.libraries.list(),
        api.libraries.receivedInvites(),
      ]);
      setLibraries(list);
      setPendingInvites(invites);

      const stored = getActiveLibraryId();
      const nextId =
        stored && list.some((l) => l.id === stored)
          ? stored
          : list[0]?.id ?? null;

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
    ],
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
