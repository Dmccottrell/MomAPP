import { useRegisterSW } from "virtual:pwa-register/react";

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
