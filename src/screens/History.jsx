import { useEffect, useState } from "react";
import { listHistory, listAllHistory } from "../utils/storage";
import { listProfiles, isAdminProfile } from "../utils/profiles";

/**
 * Completed runs, newest first. An admin sees every learner's history
 * (the database enforces this — a non-admin's listAllHistory call would
 * just come back as their own rows, since RLS filters it); everyone else
 * sees only their own.
 */
export default function History({ scenarios, profile, onSelectScenario }) {
  const [entries, setEntries] = useState(null);
  const [names, setNames] = useState({});
  const admin = isAdminProfile(profile);

  useEffect(() => {
    let cancelled = false;
    const loadEntries = admin ? listAllHistory() : listHistory(profile.id);
    loadEntries.then((rows) => {
      if (!cancelled) setEntries(rows);
    }).catch(() => {
      if (!cancelled) setEntries([]);
    });
    if (admin) {
      listProfiles()
        .then((all) => {
          if (cancelled) return;
          const map = {};
          all.forEach((p) => {
            map[p.id] = p.name;
          });
          setNames(map);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [profile.id, admin]);

  return (
    <div className="page">
      <header className="page__head">
        <h1>History</h1>
        <p>
          {admin
            ? "Every note submitted by anyone, most recent first."
            : "Every note you've submitted, most recent first."}
        </p>
      </header>

      {entries === null ? null : entries.length === 0 ? (
        <p className="empty">
          Nothing here yet — finish a scenario and it'll show up on this page.
        </p>
      ) : (
        <ul className="history">
          {entries.map((e) => {
            const scenario = scenarios.find((s) => s.id === e.scenarioId);
            const when = new Date(e.completedAt);
            return (
              <li key={e.id} className="history__row">
                <div className="history__score">
                  {e.score}
                  <span className="history__of">/{e.total}</span>
                </div>
                <div className="history__body">
                  <p className="history__title">
                    {e.scenarioTitle}
                    {admin && names[e.userId] && ` — ${names[e.userId]}`}
                  </p>
                  <p className="history__meta">
                    {when.toLocaleDateString()} · {when.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {e.missteps > 0 &&
                      ` · ${e.missteps} misstep${e.missteps === 1 ? "" : "s"}`}
                  </p>
                </div>
                {scenario && !admin && (
                  <button
                    className="btn btn--ghost history__redo"
                    onClick={() => onSelectScenario(scenario)}
                  >
                    Practice again
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
