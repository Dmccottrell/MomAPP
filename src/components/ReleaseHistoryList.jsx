function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Read-only changelog list, newest first. Shared between the About tab
 * (everyone) and the admin Previews tab, since `releases` rows are
 * readable by anyone — see utils/releases.js and supabase/schema.sql.
 */
export default function ReleaseHistoryList({ releases }) {
  if (releases === null) return null;
  if (releases.length === 0) {
    return <p className="empty">No versions published yet.</p>;
  }

  return (
    <ul className="release-list">
      {releases.map((r) => (
        <li className="release-item" key={r.version}>
          <div className="release-item__head">
            <span className="badge">v{r.version}</span>
            <span className="release-item__date">{formatDate(r.published_at)}</span>
          </div>
          <p className="release-item__changelog">{r.changelog}</p>
          {r.published_flags?.length > 0 && (
            <ul className="release-item__flags">
              {r.published_flags.map((f) => (
                <li key={f.id}>
                  <strong>{f.label}</strong>
                  {f.description ? ` — ${f.description}` : ""}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}
