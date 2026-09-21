import { useEffect, useState } from "react";
import { suggestChangelog } from "../utils/featureFlags";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * The form shown when publishing one or more feature flags: pick a
 * version number (prefilled with a suggested next patch bump), then
 * confirm. There's no separate "what changed" field to write — each
 * flag's own label and description, listed right above the version
 * field, *is* the changelog; the version's `changelog` column is filled
 * in automatically from them (suggestChangelog) when confirming, the
 * same text that would otherwise have been the editable field's default
 * value. One thing to review, not two saying the same thing. Shares the
 * same backdrop/overlay behavior as ConfirmDialog, just with a real form
 * field instead of a yes/no message.
 *
 * Unlike ConfirmDialog, this only renders while there's something to
 * publish — the parent conditionally mounts it (see Previews.jsx), keyed
 * so a new publish request always starts from a clean version instead of
 * carrying over what was typed for a previous one.
 */
export default function PublishDialog({ flags, initialVersion, error, busy, onCancel, onConfirm }) {
  const [version, setVersion] = useState(initialVersion || "");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const versionValid = VERSION_PATTERN.test(version.trim());

  function handleConfirm() {
    if (!versionValid) return;
    onConfirm({ version: version.trim(), changelog: suggestChangelog(flags) });
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
        <div className="publish-dialog__flags">
          {flags.map((f) => (
            <div className="publish-dialog__flag" key={f.id}>
              <p className="publish-dialog__flag-label">{f.label}</p>
              {f.description && <p className="publish-dialog__flag-desc">{f.description}</p>}
            </div>
          ))}
        </div>

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

        {error && <p className="builder__error">{error}</p>}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--go" onClick={handleConfirm} disabled={!versionValid || busy}>
            {busy ? "Publishing…" : `Publish ${versionValid ? `v${version.trim()}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
