import { useEffect, useState } from "react";
import { listHistory } from "../utils/storage";
import { CARE_SETTINGS } from "../utils/careSettings";

/**
 * The scenario picker. Each card shows the scenario's basics plus, once
 * the signed-in user has attempted it, their most recent score for it.
 */
export default function Home({
  scenarios,
  profile,
  onSelect,
  categoriesEnabled = false,
  careSettingsEnabled = false,
}) {
  const [lastByScenario, setLastByScenario] = useState({});
  const [setting, setSetting] = useState("");
  const [category, setCategory] = useState("");

  // Setting narrows first ("" = All, which also includes scenarios with no
  // setting yet), then category narrows within it.
  const inSetting =
    careSettingsEnabled && setting ? scenarios.filter((s) => s.setting === setting) : scenarios;

  // Only categories that have a scenario in the current setting, in the
  // order they first appear — an empty filter button would just lead to an
  // empty list. Filtering is pointless with a single category, so it stays
  // hidden until there are two. A category picked under a previous setting
  // that no longer exists here falls back to "All".
  const categories = [...new Set(inSetting.map((s) => s.category).filter(Boolean))];
  const showFilter = categoriesEnabled && categories.length > 1;
  const activeCategory = showFilter && categories.includes(category) ? category : "";
  const visible = activeCategory ? inSetting.filter((s) => s.category === activeCategory) : inSetting;

  useEffect(() => {
    let cancelled = false;
    listHistory(profile.id)
      .then((all) => {
        if (cancelled) return;
        const map = {};
        // Sorted newest-first, so the first entry seen per scenario is the most recent.
        for (const h of all) {
          if (!map[h.scenarioId]) map[h.scenarioId] = h;
        }
        setLastByScenario(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  return (
    <div className="home">
      <header className="home__head">
        <h1>Charting Practice</h1>
        <p>
          Work a patient scenario from start to finish, then write the note.
          Every patient here is fictional.
        </p>
      </header>

      {careSettingsEnabled && (
        <div className="cat-filter cat-filter--settings" role="group" aria-label="Filter by care setting">
          {["", ...CARE_SETTINGS].map((c) => (
            <button
              key={c || "all"}
              type="button"
              className={`btn btn--ghost btn--sm cat-filter__btn${setting === c ? " cat-filter__btn--on" : ""}`}
              aria-pressed={setting === c}
              onClick={() => setSetting(c)}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      {showFilter && (
        <div className="cat-filter" role="group" aria-label="Filter by category">
          {["", ...categories].map((c) => (
            <button
              key={c || "all"}
              type="button"
              className={`btn btn--ghost btn--sm cat-filter__btn${activeCategory === c ? " cat-filter__btn--on" : ""}`}
              aria-pressed={activeCategory === c}
              onClick={() => setCategory(c)}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 && (
        <p className="home__empty">
          No {setting || "matching"} scenarios yet. New ones show up here as soon as they're added
          with that care setting.
        </p>
      )}

      <ul className="cases">
        {visible.map((s) => {
          const history = lastByScenario[s.id];
          return (
            <li key={s.id}>
              <button className="case" onClick={() => onSelect(s)}>
                <span className="case__cat">
                  {[careSettingsEnabled && s.setting, s.category].filter(Boolean).join(" · ")}
                </span>
                <span className="case__title">{s.title}</span>
                <span className="case__meta">
                  {s.unit} · {s.difficulty} · about {s.estimatedMinutes} min
                </span>
                <span className="case__objectives">{s.objectives[0]}</span>
                {history && (
                  <span className="case__history">
                    Last run: {history.score}/{history.total} ·{" "}
                    {new Date(history.completedAt).toLocaleDateString()}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
