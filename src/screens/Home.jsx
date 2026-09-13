import { useEffect, useState } from "react";
import { listHistory } from "../utils/storage";

/**
 * The scenario picker. Each card shows the scenario's basics plus, once
 * the signed-in user has attempted it, their most recent score for it.
 */
export default function Home({ scenarios, profile, onSelect }) {
  const [lastByScenario, setLastByScenario] = useState({});

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

      <ul className="cases">
        {scenarios.map((s) => {
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
