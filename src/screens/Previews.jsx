import { useEffect, useState } from "react";
import PublishDialog from "../components/PublishDialog";
import ReleaseHistoryList from "../components/ReleaseHistoryList";
import {
  listFeatureFlags,
  createFeatureFlag,
  unpublishFeatureFlag,
  publishFeatureFlags,
  suggestFlagDescription,
} from "../utils/featureFlags";
import { listReleases, suggestNextVersion } from "../utils/releases";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Feature-flag management and the full changelog. Admin-only — see
 * Settings.jsx. A flag "in preview" only shows for the admin (see
 * utils/featureFlags.js's isFeatureEnabled — not actually wired into any
 * feature yet, since nothing in the app reads flags today; this is the
 * control surface for whenever a feature starts checking one).
 * "Published" flags are live for the whole household, and every publish
 * — one flag or several at once — becomes a permanent row in the
 * `releases` table with the version and changelog the admin wrote.
 */
export default function Previews({ profile }) {
  const [flags, setFlags] = useState(null);
  const [releases, setReleases] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  // Tracks whether the admin has typed their own description — until
  // then, it auto-fills from the name (same "auto until overridden"
  // pattern as the scenario builder's id-from-title).
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [addError, setAddError] = useState("");

  const [publishRequest, setPublishRequest] = useState(null);
  const [publishError, setPublishError] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    Promise.all([listFeatureFlags(), listReleases()])
      .then(([f, r]) => {
        setFlags(f);
        setReleases(r);
      })
      .catch((err) => setLoadError(err.message || "Couldn't load previews."));
  }

  function handleLabelChange(value) {
    setNewLabel(value);
    if (!descriptionTouched) setNewDescription(suggestFlagDescription(value));
  }

  function handleDescriptionChange(value) {
    setNewDescription(value);
    setDescriptionTouched(true);
  }

  async function handleAddFlag(e) {
    e.preventDefault();
    setAddError("");
    try {
      await createFeatureFlag(newLabel, newDescription);
      setNewLabel("");
      setNewDescription("");
      setDescriptionTouched(false);
      refresh();
    } catch (err) {
      setAddError(err.message || "Couldn't add that.");
    }
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

  const preview = flags?.filter((f) => f.status === "preview") ?? [];
  const published = flags?.filter((f) => f.status === "published") ?? [];
  const latestVersion = releases?.[0]?.version;

  return (
    <>
      <section className="settings-section">
        <h2 className="settings-section__title">Feature previews</h2>
        <p className="settings-row settings-row--muted">
          Register a work-in-progress feature here to try it yourself first.
          "In preview" only shows for you; "Published" is live for
          everyone. Publishing — one flag or several at once — bumps the
          app's version and adds an entry to the release history below.
        </p>

        <form className="inline-form" onSubmit={handleAddFlag}>
          <input
            className="field-input"
            style={{ flex: "1 1 12rem" }}
            value={newLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Feature name"
          />
          <input
            className="field-input"
            style={{ flex: "2 1 16rem" }}
            value={newDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Short description (auto-suggested from the name)"
          />
          <button type="submit" className="btn btn--ghost" disabled={!newLabel.trim()}>
            + Add
          </button>
        </form>
        {addError && <p className="settings-row settings-row--muted">{addError}</p>}
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
          initialVersion={suggestNextVersion(latestVersion)}
          error={publishError}
          busy={publishBusy}
          onCancel={() => setPublishRequest(null)}
          onConfirm={confirmPublish}
        />
      )}
    </>
  );
}
