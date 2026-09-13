// Smooth cross-fades between screens using the browser's native View
// Transitions API — no animation library, no keeping old and new content
// mounted at once by hand. Where the browser doesn't support it yet, this
// just calls the update directly: the same instant swap the app already
// had, never worse than before this existed.

/**
 * Runs a state update inside a View Transition so the resulting DOM
 * change (a different screen, a signed-in vs signed-out app) cross-fades
 * instead of snapping. Falls back to a plain call where unsupported.
 */
export function withViewTransition(update) {
  if (typeof document !== "undefined" && document.startViewTransition) {
    document.startViewTransition(update);
  } else {
    update();
  }
}
