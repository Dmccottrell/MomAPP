import { useEffect, useState } from "react";
import { suggestChangelog } from "../utils/featureFlags";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A starting point for the "Later" datetime-local input: 30 minutes from now, rounded to the next 5. */
function defaultScheduleValue() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return toLocalInputValue(d);
}

/**
 * The form shown when publishing one or more feature flags: pick a
 * version number (prefilled with a suggested next patch bump), choose
 * "Now" or "Later", then confirm. There's no separate "what changed"
 * field to write — each flag's own label and description, listed right
 * above the version field, *is* the changelog; it's filled in
 * automatically from them (suggestChangelog) either way. "Later" queues
 * a row in `scheduled_publishes` instead of publishing immediately — a
 * database-level cron job runs it once the time comes (see
 * supabase/schema.sql's run_due_scheduled_publishes()), so it fires even
 * if nobody has the app open at that moment. Shares the same
 * backdrop/overlay behavior as ConfirmDialog, just with real form fields
 * instead of a yes/no message.
 *
 * Unlike ConfirmDialog, this only renders while there's something to
 * publish — the parent conditionally mounts it (see Previews.jsx), keyed
 * so a new publish request always starts from a clean version instead of
 * carrying over what was typed for a previous one.
 */
export default function PublishDialog({
  flags,
  initialVersion,
  error,
  busy,
  onCancel,
  onConfirm,
  onSchedule,
}) {
  const [version, setVersion] = useState(initialVersion || "");
  const [when, setWhen] = useState("now"); // "now" | "later"
  const [scheduleValue, setScheduleValue] = useState(defaultScheduleValue);
  // Frozen at mount, not read live during render (calling Date.now() on
  // every render is an impure render — see the lint rule this tripped).
  // datetime-local values are "YYYY-MM-DDTHH:MM", which sorts lexically
  // the same as chronologically, so a plain string compare against this
  // snapshot is all "later than now" needs.
  const [minScheduleValue] = useState(() => toLocalInputValue(new Date()));

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const versionValid = VERSION_PATTERN.test(version.trim());
  const scheduledDate = when === "later" ? new Date(scheduleValue) : null;
  const scheduleValid =
    when === "now" || (scheduledDate && !isNaN(scheduledDate) && scheduleValue > minScheduleValue);
  const canConfirm = versionValid && scheduleValid;

  function handleConfirm() {
    if (!canConfirm) return;
    const changelog = suggestChangelog(flags);
    if (when === "later") {
      onSchedule({ version: version.trim(), changelog, scheduledFor: scheduledDate.toISOString() });
    } else {
      onConfirm({ version: version.trim(), changelog });
    }
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

        <div className="field">
          <span className="field__label">When</span>
          <div className="segmented" role="radiogroup" aria-label="When to publish">
            <button
              type="button"
              role="radio"
              aria-checked={when === "now"}
              className={`segmented__option ${when === "now" ? "segmented__option--active" : ""}`}
              onClick={() => setWhen("now")}
            >
              Now
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={when === "later"}
              className={`segmented__option ${when === "later" ? "segmented__option--active" : ""}`}
              onClick={() => setWhen("later")}
            >
              Later
            </button>
          </div>
          {when === "later" && (
            <>
              <input
                type="datetime-local"
                className="field-input publish-dialog__schedule-input"
                value={scheduleValue}
                min={minScheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
              />
              {!scheduleValid && <span className="publish-dialog__hint">Pick a time in the future.</span>}
            </>
          )}
        </div>

        {error && <p className="builder__error">{error}</p>}

        <div className="confirm-dialog__actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn--go" onClick={handleConfirm} disabled={!canConfirm || busy}>
            {busy
              ? when === "later"
                ? "Scheduling…"
                : "Publishing…"
              : when === "later"
                ? "Schedule publish"
                : `Publish ${versionValid ? `v${version.trim()}` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
