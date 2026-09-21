// Accent color preference, same pattern as theme.js: applied as a
// `data-accent` attribute on <html>, with the actual colors living in
// index.css as overrides of the --chart/--chart-strong/--chart-wash
// custom properties. "forest" (the original color) is the default and
// needs no attribute at all, same as theme's "system".
//
// "custom" is a fourth kind of value alongside the 5 presets: instead of
// a data-attribute selecting a rule already written in index.css, the
// three --chart-* properties are set directly as inline styles on <html>,
// derived from a stored hex with color-mix() — the same derivation the
// presets use for their dark-mode shades, just computed at runtime
// instead of hand-picked ahead of time.

const KEY = "momapp:accent";
const CUSTOM_KEY = "momapp:accentCustom";

export const ACCENT_OPTIONS = [
  { value: "forest", label: "Forest", swatch: "#1f6f6b" },
  { value: "indigo", label: "Indigo", swatch: "#3a5a99" },
  { value: "plum", label: "Plum", swatch: "#7d3f72" },
  { value: "rust", label: "Rust", swatch: "#9c4a24" },
  { value: "rose", label: "Rose", swatch: "#a13860" },
];

const DEFAULT_CUSTOM_HEX = "#1f6f6b";

/** Reads the stored accent preference, defaulting to "forest". */
export function getAccentPreference() {
  try {
    return localStorage.getItem(KEY) || "forest";
  } catch {
    return "forest";
  }
}

/** Reads the stored custom accent hex, defaulting to the Forest color. */
export function getCustomAccentColor() {
  try {
    return localStorage.getItem(CUSTOM_KEY) || DEFAULT_CUSTOM_HEX;
  } catch {
    return DEFAULT_CUSTOM_HEX;
  }
}

/** Applies an accent preference to the document without persisting it. */
export function applyAccent(pref, customHex = getCustomAccentColor()) {
  const root = document.documentElement;
  if (pref === "custom") {
    root.removeAttribute("data-accent");
    root.style.setProperty("--chart", customHex);
    root.style.setProperty("--chart-strong", `color-mix(in srgb, ${customHex} 80%, black)`);
    root.style.setProperty("--chart-wash", `color-mix(in srgb, ${customHex} 12%, var(--card))`);
  } else {
    root.style.removeProperty("--chart");
    root.style.removeProperty("--chart-strong");
    root.style.removeProperty("--chart-wash");
    if (pref && pref !== "forest") {
      root.setAttribute("data-accent", pref);
    } else {
      root.removeAttribute("data-accent");
    }
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

/** Persists a custom accent hex and, if "custom" is the active preference, re-applies it. */
export function setCustomAccentColor(hex) {
  try {
    localStorage.setItem(CUSTOM_KEY, hex);
  } catch {
    // Preference just won't survive a reload.
  }
  if (getAccentPreference() === "custom") applyAccent("custom", hex);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initAccent() {
  applyAccent(getAccentPreference());
}
