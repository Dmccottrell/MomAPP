import { useEffect, useState } from "react";
import { suggestChangelog } from "../utils/featureFlags";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * The form shown when publishing one or more feature flags: pick a
 * version number (prefilled with a suggested next patch bump) and write
 * a changelog blurb (prefilled with a suggestion built from the flags'
 * names/descriptions — template text, not AI-written; this app has no
 * LLM integration), which together become a new row in `releases` — see
 * utils/featureFlags.js's publishFeatureFlags(). Shares the same
 * backdrop/overlay behavior as ConfirmDialog, just with real form fields
 * instead of a yes/no message.
 *
 * Unlike ConfirmDialog, this only renders while there's something to
 * publish — the parent conditionally mounts it (see Previews.jsx), keyed
 * so a new publish request always starts from a clean version/changelog
 * instead of carrying over what was typed for a previous one.
 */
export default function PublishDialog({ flags, initialVersion, error, busy, onCancel, onConfirm }) {
  const [version, setVersion] = useState(initialVersion || "");
  const [changelog, setChangelog] = useState(() => suggestChangelog(flags));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const versionValid = VERSION_PATTERN.test(version.trim());
  const canConfirm = versionValid && changelog.trim().length > 0;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({ version: version.trim(), changelog: changelog.trim() });
  }

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className="publish-dialog"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="publish-dialog__title">Publish to everyone</h3>

        <p className="field__label">
          {flags.length === 1 ? "Publishing" : `Publishing ${flags.length} features`}
        </p>
        <ul className="publish-dialog__flags">
          {flags.map((f) => (
            <li key={f.id}>{f.label}</li>
          ))}
        </ul>

        <label className="field">
          <span className="field__label">Version</span>
          <input
            className="field-input"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="1.0.0"
          />
          {!versionValid && version.trim().length > 0 && (
            <span className="publish-dialog__hint">Use the form x.y.z, e.g. 1.2.0</span>
          )}
        </label>

        <label className="field">
          <span className="field__label">What changed</span>
          <textarea
            className="field-input field-textarea"
            rows={3}
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder="A sentence or two for the changelog — this is what everyone will see."
          />
        </label>

        {error && <p className="builder__error">{error}</p>}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--go" onClick={handleConfirm} disabled={!canConfirm || busy}>
            {busy ? "Publishing…" : `Publish ${versionValid ? `v${version.trim()}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
