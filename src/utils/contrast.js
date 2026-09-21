// High contrast preference, same pattern as theme.js: applied as a
// `data-contrast="high"` attribute on <html>, with index.css strengthening
// --ink/--ink-soft/--rule (and their dark-mode equivalents) so text and
// borders read more clearly. Off by default.

const KEY = "momapp:highContrast";

/** Reads the stored high-contrast preference, defaulting to false. */
export function getHighContrastPreference() {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

/** Applies a high-contrast preference to the document without persisting it. */
export function applyHighContrast(enabled) {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute("data-contrast", "high");
  } else {
    root.removeAttribute("data-contrast");
  }
}

/** Persists a high-contrast preference and applies it immediately. */
export function setHighContrastPreference(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // Preference just won't survive a reload.
  }
  applyHighContrast(enabled);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initHighContrast() {
  applyHighContrast(getHighContrastPreference());
}
