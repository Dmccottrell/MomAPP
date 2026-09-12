import { lastHistoryFor } from "../utils/storage";

/**
 * The scenario picker. Each card shows the scenario's basics plus, once
 * it's been attempted, the current profile's most recent score for it.
 */
export default function Home({ scenarios, onSelect }) {
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
          // Re-read on every render (cheap) so returning from a finished
          // run immediately reflects the new score, with no extra state.
          const history = lastHistoryFor(s.id);
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
