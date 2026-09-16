/**
 * A one-time "here's what changed" popup shown after signing in when the
 * account's `last_seen_version` doesn't match the latest published
 * release — see App.jsx. Dismissing it marks that version seen, synced
 * to the account so it won't reappear on another device either. Never
 * shown to a brand-new sign-up (App.jsx marks the current version seen
 * silently for them instead — there's nothing "new" to someone seeing
 * the app for the first time).
 */
export default function WhatsNewModal({ release, onDismiss }) {
  if (!release) return null;

  return (
    <div className="confirm-backdrop" onClick={onDismiss}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="field__label">What's new</p>
        <h3 className="publish-dialog__title">
          <span className="badge">v{release.version}</span>
        </h3>
        <p className="confirm-dialog__message">{release.changelog}</p>
        {release.published_flags?.length > 0 && (
          <p className="release-item__flags">
            {release.published_flags.map((f) => f.label).join(" · ")}
          </p>
        )}
        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--go" onClick={onDismiss}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
