// Accent color preference, same pattern as theme.js: applied as a
// `data-accent` attribute on <html>, with the actual colors living in
// index.css as overrides of the --chart/--chart-strong/--chart-wash
// custom properties. "forest" (the original color) is the default and
// needs no attribute at all, same as theme's "system".

const KEY = "momapp:accent";

export const ACCENT_OPTIONS = [
  { value: "forest", label: "Forest", swatch: "#1f6f6b" },
  { value: "indigo", label: "Indigo", swatch: "#3a5a99" },
  { value: "plum", label: "Plum", swatch: "#7d3f72" },
  { value: "rust", label: "Rust", swatch: "#9c4a24" },
  { value: "rose", label: "Rose", swatch: "#a13860" },
];

/** Reads the stored accent preference, defaulting to "forest". */
export function getAccentPreference() {
  try {
    return localStorage.getItem(KEY) || "forest";
  } catch {
    return "forest";
  }
}

/** Applies an accent preference to the document without persisting it. */
export function applyAccent(pref) {
  const root = document.documentElement;
  if (pref && pref !== "forest") {
    root.setAttribute("data-accent", pref);
  } else {
    root.removeAttribute("data-accent");
  }
}

/** Persists an accent preference and applies it immediately. */
export function setAccentPreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Preference just won't survive a reload.
  }
  applyAccent(pref);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initAccent() {
  applyAccent(getAccentPreference());
}
