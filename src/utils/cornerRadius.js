// Corner radius preference, same pattern as theme.js: applied as a
// `data-corner-radius` attribute on <html>, with index.css overriding
// --radius-sm/--radius-md/--radius-lg — the same three tokens every
// rounded element in the app (buttons, cards, inputs, badges) already
// uses, so this is a real, global change, not a cosmetic one confined to
// Settings. "rounded" is the default (today's values) and needs no
// attribute at all, same as theme's "system".

const KEY = "momapp:cornerRadius";

export const CORNER_RADIUS_OPTIONS = [
  { value: "square", label: "Square" },
  { value: "subtle", label: "Subtle" },
  { value: "rounded", label: "Rounded" },
  { value: "extra-rounded", label: "Extra rounded" },
];

/** Reads the stored corner-radius preference, defaulting to "rounded". */
export function getCornerRadiusPreference() {
  try {
    return localStorage.getItem(KEY) || "rounded";
  } catch {
    return "rounded";
  }
}

/** Applies a corner-radius preference to the document without persisting it. */
export function applyCornerRadius(pref) {
  const root = document.documentElement;
  if (pref && pref !== "rounded") {
    root.setAttribute("data-corner-radius", pref);
  } else {
    root.removeAttribute("data-corner-radius");
  }
}

/** Persists a corner-radius preference and applies it immediately. */
export function setCornerRadiusPreference(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // Preference just won't survive a reload.
  }
  applyCornerRadius(pref);
}

/** Applies whatever preference is already stored. Call once at startup, before the first paint. */
export function initCornerRadius() {
  applyCornerRadius(getCornerRadiusPreference());
}
