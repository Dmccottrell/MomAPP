import { useEffect, useState } from "react";
import { ShareIcon, CloseIcon } from "./icons";

const SESSION_KEY = "momapp:installHintShown";
const VISIBLE_MS = 5000;

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/**
 * A brief, self-dismissing nudge to add the app to the home screen —
 * mobile only, once per browser session, gone on its own after a few
 * seconds so it never sits in the way. Android/Chrome gets a real
 * "Install" button (the browser's own beforeinstallprompt, captured
 * below); iOS Safari has no such API, so it gets short instructions
 * instead — Apple only allows that flow from the Share sheet.
 */
export default function InstallHint() {
  const [installEvent, setInstallEvent] = useState(null);
  const [platform, setPlatform] = useState(null); // "ios" | "android" | null
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      // No sessionStorage — fall through and just show it once this load.
    }

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    if (!isIOS && !isAndroid) return;

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallEvent(e);
      setPlatform("android");
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // Android fires beforeinstallprompt asynchronously (or not at all, if
    // already installed some other way); iOS never fires it, so show its
    // static instructions right away instead of waiting on an event that
    // will never come.
    let iosTimer;
    if (isIOS) {
      iosTimer = setTimeout(() => {
        setPlatform("ios");
        setVisible(true);
      }, 400);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      clearTimeout(iosTimer);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Nothing to persist to — it'll just show again next load.
    }
  }

  async function handleInstall() {
    if (!installEvent) return;
    dismiss();
    await installEvent.prompt();
  }

  if (!visible || !platform) return null;

  return (
    <div className="install-hint" role="status">
      {platform === "ios" ? (
        <span className="install-hint__text">
          Add to Home Screen: tap <ShareIcon className="install-hint__icon" /> then
          "Add to Home Screen".
        </span>
      ) : (
        <span className="install-hint__text">Install Charting Practice for quick, offline access.</span>
      )}
      {platform === "android" && (
        <button type="button" className="btn btn--go install-hint__btn" onClick={handleInstall}>
          Install
        </button>
      )}
      <button
        type="button"
        className="install-hint__close"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
