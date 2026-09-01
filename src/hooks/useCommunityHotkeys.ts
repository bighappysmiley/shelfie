import { useEffect } from "react";

export function useCommunityHotkeys({
  enabled = true,
  onToggleSearch,
  onCloseSearch,
  onShowShortcuts,
  searchOpen,
}: {
  enabled?: boolean;
  onToggleSearch?: () => void;
  onCloseSearch?: () => void;
  onShowShortcuts?: () => void;
  searchOpen?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "Escape") {
        if (searchOpen) {
          e.preventDefault();
          onCloseSearch?.();
        }
        return;
      }

      if (typing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        onToggleSearch?.();
        return;
      }

      if (e.key === "?" && e.shiftKey) {
        e.preventDefault();
        onShowShortcuts?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onToggleSearch, onCloseSearch, onShowShortcuts, searchOpen]);
}
