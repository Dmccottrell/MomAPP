// Smooth cross-fades between screens using the browser's native View
// Transitions API — no animation library, no keeping old and new content
// mounted at once by hand. Where the browser doesn't support it yet, this
// just calls the update directly: the same instant swap the app already
// had, never worse than before this existed.

/**
 * Runs a state update inside a View Transition so the resulting DOM
 * change (a different screen, a signed-in vs signed-out app) cross-fades
 * instead of snapping. Falls back to a plain call where unsupported, or
 * where motion is turned off — either the OS's prefers-reduced-motion or
 * the in-app Animations/Reduce motion settings (utils/motion.js), which
 * both set data-motion="reduce" on <html>. Checked here rather than left
 * to the CSS override alone, since a started transition's own animation
 * isn't reliably reachable by a plain selector.
 */
export function withViewTransition(update) {
  const reduceMotion =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.getAttribute("data-motion") === "reduce");
  if (!reduceMotion && typeof document !== "undefined" && document.startViewTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}
