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

type LibraryContextValue = {
  libraries: Library[];
  activeLibrary: Library | null;
  pendingInvites: LibraryInvite[];
  loading: boolean;
  setActiveLibrary: (id: string) => void;
  refreshLibraries: () => Promise<void>;
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

  const refreshLibraries = useCallback(async () => {
    if (!user) {
      setLibraries([]);
      setPendingInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshLibraries();
  }, [refreshLibraries]);

  const setActiveLibrary = useCallback((id: string) => {
    setActiveId(id);
    setActiveLibraryId(id);
  }, []);

  const createLibrary = useCallback(async (name: string) => {
    const library = await api.libraries.create(name);
    await refreshLibraries();
    setActiveLibrary(library.id);
    return library;
  }, [refreshLibraries, setActiveLibrary]);

  const renameLibrary = useCallback(
    async (id: string, name: string) => {
      await api.libraries.rename(id, name);
      await refreshLibraries();
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
