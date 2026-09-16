// Text size preference, same pattern as theme.js: applied as a
// `data-text-size` attribute on <html>, which index.css uses to scale
// the root font-size (and, through it, everything measured in rem).
// "medium" is the default and needs no attribute at all, same as
// theme's "system" and accent's "forest".

const KEY = "momapp:textSize";

export const TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

/** Reads the stored text-size preference, defaulting to "medium". */
export function getTextSizePreference() {
  try {
    return localStorage.getItem(KEY) || "medium";
  } catch {
    return "medium";
  }
}

/** Applies a text-size preference to the document without persisting it. */
export function applyTextSize(pref) {
  const root = document.documentElement;
  if (pref && pref !== "medium") {
    root.setAttribute("data-text-size", pref);
  } else {
    root.removeAttribute("data-text-size");
  }
}

/** Persists a text-size preference and applies it immediately. */
export function setTextSizePreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Preference just won't survive a reload.
  }
  applyTextSize(pref);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initTextSize() {
  applyTextSize(getTextSizePreference());
}
