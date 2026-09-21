import { useEffect, useState } from "react";
import { listHistory } from "../utils/storage";

/**
 * The scenario picker. Each card shows the scenario's basics plus, once
 * the signed-in user has attempted it, their most recent score for it.
 */
export default function Home({ scenarios, profile, onSelect, categoriesEnabled = false }) {
  const [lastByScenario, setLastByScenario] = useState({});
  const [category, setCategory] = useState("");

  // Only categories that have a scenario, in the order they first appear —
  // an empty filter button would just lead to an empty list. Filtering is
  // pointless with a single category, so it stays hidden until there are two.
  const categories = [...new Set(scenarios.map((s) => s.category).filter(Boolean))];
  const showFilter = categoriesEnabled && categories.length > 1;
  const visible = showFilter && category ? scenarios.filter((s) => s.category === category) : scenarios;

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

      {showFilter && (
        <div className="cat-filter" role="group" aria-label="Filter by category">
          {["", ...categories].map((c) => (
            <button
              key={c || "all"}
              type="button"
              className={`btn btn--ghost btn--sm cat-filter__btn${category === c ? " cat-filter__btn--on" : ""}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c || "All"}
            </button>
          ))}
        </div>
      )}

      <ul className="cases">
        {visible.map((s) => {
          const history = lastByScenario[s.id];
          return (
            <li key={s.id}>
              <button className="case" onClick={() => onSelect(s)}>
                <span className="case__cat">{s.category}</span>
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
