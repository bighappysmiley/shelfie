const THEME_KEY = "pine-bookkeeping-theme";

export type ThemePreference = "system" | "light" | "dark";

const LEGACY_KEYS = [
  "pine-books-theme",
  "bracken-theme",
  "understory-theme",
  "shelfie-theme",
] as const;

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredPreference(): ThemePreference | null {
  const raw =
    localStorage.getItem(THEME_KEY) ??
    LEGACY_KEYS.map((k) => localStorage.getItem(k)).find(Boolean) ??
    null;
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return null;
}

export function getThemePreference(): ThemePreference {
  return readStoredPreference() ?? "system";
}

export function resolveDarkMode(preference: ThemePreference = getThemePreference()): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return systemPrefersDark();
}

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function applyTheme(preference: ThemePreference = getThemePreference()) {
  document.documentElement.classList.toggle("dark", resolveDarkMode(preference));
}

/** Force light or dark (legacy). Prefer setThemePreference. */
export function setDarkMode(on: boolean) {
  setThemePreference(on ? "dark" : "light");
}

export function setThemePreference(preference: ThemePreference) {
  localStorage.setItem(THEME_KEY, preference);
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent("pine-theme-change", { detail: preference }));
}

export function initTheme() {
  applyTheme(getThemePreference());
}

let mediaListenerAttached = false;

/** Keep Auto mode in sync with OS changes. Call once at app boot. */
export function watchSystemTheme() {
  if (mediaListenerAttached) return;
  mediaListenerAttached = true;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (getThemePreference() === "system") applyTheme("system");
  };
  mq.addEventListener("change", onChange);
}

export function useThemeState() {
  return isDarkMode();
}
