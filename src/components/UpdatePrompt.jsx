import { useRegisterSW } from "virtual:pwa-register/react";

// Workbox only checks for a new service worker on its own schedule (by
// default, roughly once an hour, or whenever the browser feels like it) —
// a tab left open, or even reopened, can sit on a stale build far longer
// than that without ever finding out one exists. Checking again on a
// steady interval and whenever the tab regains focus (someone switching
// back to it, or actually reopening it) makes a real update show up in
// well under a minute instead of "sometime, maybe."
const UPDATE_CHECK_MS = 60_000;

/**
 * A new service worker build waits until this prompt is answered rather
 * than activating underneath a session already in progress — mid-scenario
 * is the worst time for the app to swap itself out. "Refresh" activates
 * the new build and reloads; dismissing just keeps using the current one
 * until the next natural reload picks it up.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error("Service worker registration failed", error);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => registration.update().catch(() => {});
      setInterval(check, UPDATE_CHECK_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      window.addEventListener("focus", check);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-prompt" role="status">
      <span>An update is ready.</span>
      <button
        type="button"
        className="btn btn--go update-prompt__btn"
        onClick={() => updateServiceWorker(true)}
      >
        Refresh
      </button>
    </div>
  );
}
