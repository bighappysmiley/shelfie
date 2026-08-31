const THEME_KEY = "pine-bookkeeping-theme";

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function setDarkMode(on: boolean) {
  document.documentElement.classList.toggle("dark", on);
  localStorage.setItem(THEME_KEY, on ? "dark" : "light");
}

export function initTheme() {
  const theme =
    localStorage.getItem(THEME_KEY) ??
    localStorage.getItem("pine-books-theme") ??
    localStorage.getItem("bracken-theme") ??
    localStorage.getItem("understory-theme") ??
    localStorage.getItem("shelfie-theme");
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  }
}

export function useThemeState() {
  return isDarkMode();
}
