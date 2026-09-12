// Light/dark/system theme preference. Applied as a `data-theme` attribute
// on <html>; the actual colors live in index.css as CSS custom properties,
// keyed off that attribute (and off prefers-color-scheme when the
// preference is "system").

const KEY = "momapp:theme";

/** Reads the stored theme preference, defaulting to "system". */
export function getThemePreference() {
  try {
    return localStorage.getItem(KEY) || "system";
  } catch {
    return "system";
  }
}

/** Applies a theme preference to the document without persisting it. */
export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === "light" || pref === "dark") {
    root.setAttribute("data-theme", pref);
  } else {
    root.removeAttribute("data-theme");
  }
}

/** Persists a theme preference ("light" | "dark" | "system") and applies it immediately. */
export function setThemePreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Preference just won't survive a reload.
  }
  applyTheme(pref);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initTheme() {
  applyTheme(getThemePreference());
}
