import { useEffect, useState } from "react";
import PublishDialog from "../components/PublishDialog";
import ReleaseHistoryList from "../components/ReleaseHistoryList";
import {
  listFeatureFlags,
  unpublishFeatureFlag,
  publishFeatureFlags,
  listPendingSchedules,
  schedulePublish,
  cancelSchedule,
} from "../utils/featureFlags";
import { listReleases, suggestNextVersion, maxVersion } from "../utils/releases";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Feature-flag publishing and the full changelog. Admin-only — see
 * Settings.jsx. There's no "add a flag" form here on purpose: every flag
 * is registered directly in the database as part of building the feature
 * it gates (see utils/featureFlags.js's id constants), not typed in by
 * hand from this screen. A flag "in preview" only shows for the admin
 * (see utils/featureFlags.js's isFeatureEnabled); "published" is live for
 * the whole household, and every publish — one flag or several at once —
 * becomes a permanent row in the `releases` table with the version and
 * changelog built from the flags themselves (PublishDialog's own
 * comment). A publish can also be scheduled for later instead of run
 * immediately — see the "Scheduled" list and PublishDialog's "Later"
 * option — which is handled entirely by a database-level cron job
 * (supabase/schema.sql's run_due_scheduled_publishes()), so it still
 * fires even if nobody has the app open when the time comes.
 */
export default function Previews({ profile }) {
  const [flags, setFlags] = useState(null);
  const [releases, setReleases] = useState(null);
  const [schedules, setSchedules] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [publishRequest, setPublishRequest] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    Promise.all([listFeatureFlags(), listReleases(), listPendingSchedules()])
      .then(([f, r, s]) => {
        setFlags(f);
        setReleases(r);
        setSchedules(s);
      })
      .catch((err) => setLoadError(err.message || "Couldn't load previews."));
  }

  async function handleUnpublish(flag) {
    try {
      await unpublishFeatureFlag(flag.id);
      refresh();
    } catch (err) {
      setLoadError(err.message || "Couldn't unpublish that.");
    }
  }

  function openPublish(flagsToPublish) {
    setPublishError("");
    setPublishRequest(flagsToPublish);
  }

  async function confirmPublish({ version, changelog }) {
    setPublishBusy(true);
    setPublishError("");
    try {
      await publishFeatureFlags(publishRequest, {
        version,
        changelog,
        publishedBy: profile.id,
      });
      setPublishRequest(null);
      refresh();
    } catch (err) {
      setPublishError(err.message || "Couldn't publish that.");
    } finally {
      setPublishBusy(false);
    }
  }

  async function confirmSchedule({ version, changelog, scheduledFor }) {
    setPublishBusy(true);
    setPublishError("");
    try {
      await schedulePublish(publishRequest, {
        version,
        changelog,
        scheduledFor,
        createdBy: profile.id,
      });
      setPublishRequest(null);
      refresh();
    } catch (err) {
      setPublishError(err.message || "Couldn't schedule that.");
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleCancelSchedule(id) {
    try {
      await cancelSchedule(id);
      refresh();
    } catch (err) {
      setLoadError(err.message || "Couldn't cancel that.");
    }
  }

  // A schedule stores just flag ids — resolve each back to its current
  // label for display (a flag could in principle be renamed later; the
  // id it was scheduled under still resolves correctly either way).
  function flagLabelsFor(flagIds) {
    if (!flags) return flagIds.join(", ");
    return flagIds
      .map((id) => flags.find((f) => f.id === id)?.label || id)
      .join(", ");
  }

  const preview = flags?.filter((f) => f.status === "preview") ?? [];
  const published = flags?.filter((f) => f.status === "published") ?? [];
  const latestVersion = releases?.[0]?.version;

  return (
    <>
      <section className="settings-section">
        <h2 className="settings-section__title">Feature previews</h2>
        <p className="settings-row settings-row--muted">
          Work-in-progress features land here already registered. "In
          preview" only shows for you; "Published" is live for everyone.
          Publishing — one flag or several at once — bumps the app's
          version and adds an entry to the release history below.
        </p>
        {loadError && <p className="settings-row settings-row--muted">{loadError}</p>}

        <div className="preview-group">
          <div className="preview-group__head">
            <h3 className="field__label field__label--spaced">In preview</h3>
            {preview.length > 1 && (
              <button className="btn btn--go btn--sm" onClick={() => openPublish(preview)}>
                Publish all ({preview.length})
              </button>
            )}
          </div>
          {flags === null ? null : preview.length === 0 ? (
            <p className="settings-row--muted">Nothing in preview right now.</p>
          ) : (
            preview.map((f) => (
              <div className="account-row" key={f.id}>
                <div className="account-row__info">
                  <p className="account-row__name">{f.label}</p>
                  {f.description && <p className="account-row__email">{f.description}</p>}
                  <p className="account-row__meta">Added {formatDate(f.created_at)}</p>
                </div>
                <div className="account-row__actions">
                  <button className="btn btn--go btn--sm" onClick={() => openPublish([f])}>
                    Publish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {schedules && schedules.length > 0 && (
          <div className="preview-group">
            <h3 className="field__label field__label--spaced">Scheduled</h3>
            {schedules.map((s) => (
              <div className="account-row" key={s.id}>
                <div className="account-row__info">
                  <p className="account-row__name">{flagLabelsFor(s.flag_ids)}</p>
                  <p className="account-row__email">Will publish as v{s.version}</p>
                  <p className="account-row__meta">Scheduled for {formatDateTime(s.scheduled_for)}</p>
                </div>
                <div className="account-row__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => handleCancelSchedule(s.id)}>
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="preview-group">
          <h3 className="field__label field__label--spaced">Published</h3>
          {flags === null ? null : published.length === 0 ? (
            <p className="settings-row--muted">Nothing published from here yet.</p>
          ) : (
            published.map((f) => (
              <div className="account-row" key={f.id}>
                <div className="account-row__info">
                  <p className="account-row__name">{f.label}</p>
                  {f.description && <p className="account-row__email">{f.description}</p>}
                  <p className="account-row__meta">
                    Published in v{f.published_in_version} on {formatDate(f.published_at)}
                  </p>
                </div>
                <div className="account-row__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => handleUnpublish(f)}>
                    Unpublish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="settings-section">
        <h2 className="settings-section__title">Release history</h2>
        {latestVersion && (
          <p className="settings-row settings-row--muted">Current version: v{latestVersion}</p>
        )}
        <ReleaseHistoryList releases={releases} />
      </section>

      {publishRequest && (
        <PublishDialog
          key={publishRequest.map((f) => f.id).join(",")}
          flags={publishRequest}
          // Bumping from the higher of the latest release and the admin's
          // own last_seen_version (not just the latest release) keeps an
          // unpublish-then-republish cycle from reissuing a version number
          // the admin already dismissed "what's new" for — unpublishing
          // deletes that release row, so latestVersion alone would suggest
          // the same number again, and the popup would never re-fire.
          initialVersion={suggestNextVersion(maxVersion(latestVersion, profile.last_seen_version))}
          error={publishError}
          busy={publishBusy}
          onCancel={() => setPublishRequest(null)}
          onConfirm={confirmPublish}
          onSchedule={confirmSchedule}
        />
      )}
    </>
  );
}
