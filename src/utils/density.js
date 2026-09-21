// Density preference, same pattern as theme.js: applied as a
// `data-density` attribute on <html>, with index.css scaling the
// --space-gap/--space-pad tokens that the most repeated spacing rules
// (cards, list rows, settings sections) are built from. "comfortable" is
// the default and needs no attribute at all, same as theme's "system".

const KEY = "momapp:density";

export const DENSITY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

/** Reads the stored density preference, defaulting to "comfortable". */
export function getDensityPreference() {
  try {
    return localStorage.getItem(KEY) || "comfortable";
  } catch {
    return "comfortable";
  }
}

/** Applies a density preference to the document without persisting it. */
export function applyDensity(pref) {
  const root = document.documentElement;
  if (pref && pref !== "comfortable") {
    root.setAttribute("data-density", pref);
  } else {
    root.removeAttribute("data-density");
  }
}

/** Persists a density preference and applies it immediately. */
export function setDensityPreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Preference just won't survive a reload.
  }
  applyDensity(pref);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initDensity() {
  applyDensity(getDensityPreference());
}
