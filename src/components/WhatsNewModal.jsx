import { useEffect } from "react";
import { CloseIcon } from "./icons";

/**
 * A one-time "here's what changed" popup shown after signing in when the
 * account's `last_seen_version` doesn't match the latest published
 * release — see App.jsx. Dismissing it (the header's close button, "Got
 * it", Escape, or tapping the backdrop) marks that version seen, synced
 * to the account so it won't reappear on another device either. Never
 * shown to a brand-new sign-up (App.jsx marks the current version seen
 * silently for them instead — there's nothing "new" to someone seeing
 * the app for the first time).
 *
 * Deliberately just a headline and the changelog paragraph — no
 * per-flag bullet list. The admin's changelog already says what
 * changed; repeating each flag's own label/description underneath it
 * (Previews' Release History does that, for the admin) was the same
 * information twice and made this feel cluttered for a popup that's
 * supposed to be a quick, skimmable "here's what's new."
 */
export default function WhatsNewModal({ release, onDismiss }) {
  useEffect(() => {
    if (!release) return;
    const onKey = (e) => e.key === "Escape" && onDismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [release, onDismiss]);

  if (!release) return null;

  return (
    <div className="confirm-backdrop" onClick={onDismiss}>
      <div
        className="confirm-dialog whats-new"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="whats-new__head">
          <h3 className="publish-dialog__title whats-new__title">
            What's new <span className="badge">v{release.version}</span>
          </h3>
          <button
            type="button"
            className="whats-new__close"
            onClick={onDismiss}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="confirm-dialog__message">{release.changelog}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--go" onClick={onDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
