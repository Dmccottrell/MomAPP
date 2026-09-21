// Two related but distinct settings share one derived state here:
//   - "Animations" (Interface, default on) — a general polish preference;
//     turning it off is "I'd rather this app not move."
//   - "Reduce motion" (Accessibility, default off) — the in-app equivalent
//     of the OS's prefers-reduced-motion, for anyone whose OS setting they
//     don't control or don't know about.
// Either one being in the "no motion" state sets the same `data-motion`
// attribute on <html>, which index.css uses to zero out transition and
// animation durations app-wide — the same technique as the standard
// prefers-reduced-motion override, just user-triggered instead of OS-only.

const ANIMATIONS_KEY = "momapp:animations";
const REDUCE_MOTION_KEY = "momapp:reduceMotion";

/** Reads the stored "animations enabled" preference, defaulting to true. */
export function getAnimationsPreference() {
  try {
    const v = localStorage.getItem(ANIMATIONS_KEY);
    return v === null ? true : v === "on";
  } catch {
    return true;
  }
}

/** Reads the stored "reduce motion" preference, defaulting to false. */
export function getReduceMotionPreference() {
  try {
    return localStorage.getItem(REDUCE_MOTION_KEY) === "on";
  } catch {
    return false;
  }
}

/** Applies the combined motion state to the document without persisting it. */
export function applyMotion(animationsEnabled, reduceMotion) {
  const root = document.documentElement;
  if (!animationsEnabled || reduceMotion) {
    root.setAttribute("data-motion", "reduce");
  } else {
    root.removeAttribute("data-motion");
  }
}

/** Persists the "animations enabled" preference and applies the combined state. */
export function setAnimationsPreference(enabled) {
  try {
    localStorage.setItem(ANIMATIONS_KEY, enabled ? "on" : "off");
  } catch {
    // Preference just won't survive a reload.
  }
  applyMotion(enabled, getReduceMotionPreference());
}

/** Persists the "reduce motion" preference and applies the combined state. */
export function setReduceMotionPreference(enabled) {
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, enabled ? "on" : "off");
  } catch {
    // Preference just won't survive a reload.
  }
  applyMotion(getAnimationsPreference(), enabled);
}

/** Applies whatever preferences are already stored. Call once at startup, before the first paint. */
export function initMotion() {
  applyMotion(getAnimationsPreference(), getReduceMotionPreference());
}
